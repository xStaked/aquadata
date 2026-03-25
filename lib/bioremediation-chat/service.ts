import 'server-only'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateDeepSeekObject } from '@/lib/bioremediation-chat/deepseek'
import { responseKindValues } from '@/lib/bioremediation-chat/schema'
import { retrieveApprovedCaseEvidence } from '@/lib/bioremediation-chat/retrieval'
import type {
  BioremediationChatCalculatorContext,
  BioremediationChatCitation,
  BioremediationChatRequest,
  BioremediationChatResponse,
  BioremediationChatResponseKind,
  BioremediationChatSession,
  BioremediationRetrievalCandidate,
} from '@/lib/bioremediation-chat/types'

type ServiceActor = {
  userId: string
  organizationId: string
}

type SessionRow = Pick<BioremediationChatSession, 'id'>

const modelResponseSchema = z.object({
  kind: z.enum(responseKindValues),
  recommendation: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
  followUpQuestion: z.string().trim().min(1).optional(),
  citedCaseIds: z.array(z.string().uuid()).default([]),
  confidence: z.number().min(0).max(1),
  requiresEscalation: z.boolean().default(false),
})

const CALCULATOR_GUARDRAIL_NOTE =
  'La calculadora deterministica sigue siendo la fuente de verdad para la dosis final. Esta respuesta solo contextualiza el resultado y no reemplaza el calculo.'

const LOW_CONFIDENCE_THRESHOLD = 0.65

function buildAssistantContent(response: {
  recommendation: string
  rationale: string
  followUpQuestion?: string
}) {
  return [
    response.recommendation,
    response.rationale,
    response.followUpQuestion ? `Pregunta de seguimiento: ${response.followUpQuestion}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildCitation(candidate: BioremediationRetrievalCandidate): BioremediationChatCitation {
  return {
    caseId: candidate.id,
    issue: candidate.issue,
    zone: candidate.zone,
    species: candidate.species,
    productName: candidate.product_name,
    treatmentApproach: candidate.treatment_approach,
    dose: candidate.dose,
    doseUnit: candidate.dose_unit,
    outcome: candidate.outcome,
    score: candidate.score,
    rationale: candidate.matchReasons.join(', ') || undefined,
  }
}

function buildFallbackResponse(params: {
  sessionId: string
  kind: BioremediationChatResponseKind
  recommendation: string
  rationale: string
  followUpQuestion?: string
  confidence: number
  lowConfidence: boolean
  requiresEscalation: boolean
}): Omit<BioremediationChatResponse, 'answerId'> {
  return {
    sessionId: params.sessionId,
    kind: params.kind,
    recommendation: params.recommendation,
    rationale: params.rationale,
    followUpQuestion: params.followUpQuestion,
    confidence: params.confidence,
    citations: [],
    citedCaseIds: [],
    lowConfidence: params.lowConfidence,
    requiresEscalation: params.requiresEscalation,
    calculatorGuardrailNote: CALCULATOR_GUARDRAIL_NOTE,
  }
}

function buildUnsupportedResponse(
  sessionId: string,
  calculatorContext: BioremediationChatCalculatorContext,
  exclusionReasons: string[],
): Omit<BioremediationChatResponse, 'answerId'> {
  const hasDeterministicDose = typeof calculatorContext.finalDoseG === 'number'

  return buildFallbackResponse({
    sessionId,
    kind: 'escalate',
    recommendation: hasDeterministicDose
      ? 'No tengo suficiente evidencia aprobada para recomendar un ajuste adicional sobre la dosis calculada.'
      : 'No tengo suficiente evidencia aprobada para responder con seguridad esta consulta.',
    rationale:
      exclusionReasons.join(' ') ||
      'No se encontraron casos aprobados y utilizables como grounding para esta situacion.',
    confidence: 0.15,
    lowConfidence: true,
    requiresEscalation: true,
    followUpQuestion:
      'Comparte esta situacion con el equipo de Aquavet para una revision tecnica antes de cambiar la dosis.',
  })
}


function buildSystemPrompt(hasCases: boolean) {
  const base = [
    'Eres un asistente tecnico de bioremediacion para AquaVet.',
    'Responde solo en espanol.',
    'La calculadora deterministica es la fuente de verdad para la dosis final; no la reemplaces ni inventes nuevas dosis.',
    'Solo cites case IDs que aparezcan en la evidencia proporcionada.',
    'Devuelve exclusivamente JSON valido con las claves solicitadas.',
  ]

  if (hasCases) {
    base.push('Usa los casos aprobados entregados como evidencia principal para tu respuesta.')
  } else {
    base.push(
      'No hay casos aprobados disponibles para esta consulta.',
      'Infiere una respuesta tecnica razonable basandote en tu conocimiento de bioremediacion acuicola.',
      'Deja claro en tu respuesta que es una inferencia sin respaldo de casos aprobados de Aquavet.',
      'Usa kind "answer" con confidence bajo (maximo 0.55) y requiresEscalation true para que el productor valide con Aquavet.',
      'citedCaseIds debe ser un array vacio.',
    )
  }

  return base.join(' ')
}

function buildUserPrompt(
  input: Pick<BioremediationChatRequest, 'question' | 'calculatorContext' | 'metadata'>,
  candidates: BioremediationRetrievalCandidate[],
) {
  const evidence = candidates.map((candidate) => ({
    caseId: candidate.id,
    issue: candidate.issue,
    zone: candidate.zone,
    species: candidate.species,
    productName: candidate.product_name,
    treatmentApproach: candidate.treatment_approach,
    dose: candidate.dose,
    doseUnit: candidate.dose_unit,
    outcome: candidate.outcome,
    score: candidate.score,
    matchReasons: candidate.matchReasons,
  }))

  const evidenceSection =
    evidence.length > 0
      ? ['Casos aprobados disponibles:', JSON.stringify(evidence, null, 2)]
      : [
          'Casos aprobados disponibles: ninguno.',
          'Responde basandote en conocimiento tecnico general de bioremediacion acuicola.',
          'Indica en la respuesta que no hay casos aprobados de Aquavet que respalden esta recomendacion.',
        ]

  return [
    'Pregunta del productor:',
    input.question,
    '',
    'Contexto calculadora:',
    JSON.stringify(input.calculatorContext, null, 2),
    '',
    'Filtros adicionales:',
    JSON.stringify(input.metadata ?? {}, null, 2),
    '',
    ...evidenceSection,
    '',
    'Responde con JSON usando este formato exacto:',
    JSON.stringify(
      {
        kind: 'answer',
        recommendation: 'string',
        rationale: 'string',
        followUpQuestion: 'string opcional',
        citedCaseIds: ['uuid'],
        confidence: 0.78,
        requiresEscalation: false,
      },
      null,
      2,
    ),
  ].join('\n')
}

async function getOrCreateSession(
  actor: ServiceActor,
  calculatorContext: BioremediationChatCalculatorContext,
  sessionId?: string,
) {
  const supabase = await createClient()
  const sessionPayload = {
    calculator_context: calculatorContext,
    last_deterministic_dose_g: calculatorContext.finalDoseG ?? null,
  }

  if (sessionId) {
    const { data: existingSession, error: existingSessionError } = await supabase
      .from('bioremediation_chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', actor.userId)
      .eq('organization_id', actor.organizationId)
      .single()

    if (existingSessionError || !existingSession) {
      throw new Error('Bioremediation chat session not found for this user')
    }

    const { error: updateSessionError } = await supabase
      .from('bioremediation_chat_sessions')
      .update(sessionPayload)
      .eq('id', sessionId)
      .eq('user_id', actor.userId)
      .eq('organization_id', actor.organizationId)

    if (updateSessionError) {
      throw new Error(`Failed to update chat session: ${updateSessionError.message}`)
    }

    return {
      supabase,
      sessionId: existingSession.id,
    }
  }

  const { data: newSession, error: newSessionError } = await supabase
    .from('bioremediation_chat_sessions')
    .insert({
      user_id: actor.userId,
      organization_id: actor.organizationId,
      ...sessionPayload,
    })
    .select('id')
    .single<SessionRow>()

  if (newSessionError || !newSession) {
    throw new Error(`Failed to create bioremediation chat session: ${newSessionError?.message ?? 'unknown error'}`)
  }

  return {
    supabase,
    sessionId: newSession.id,
  }
}

async function insertUserMessage(params: {
  sessionId: string
  actor: ServiceActor
  question: string
  calculatorContext: BioremediationChatCalculatorContext
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('bioremediation_chat_messages').insert({
    session_id: params.sessionId,
    user_id: params.actor.userId,
    organization_id: params.actor.organizationId,
    role: 'user',
    content: params.question,
    calculator_context: params.calculatorContext,
  })

  if (error) {
    throw new Error(`Failed to store user chat message: ${error.message}`)
  }
}

async function insertAssistantMessage(params: {
  sessionId: string
  actor: ServiceActor
  calculatorContext: BioremediationChatCalculatorContext
  response: Omit<BioremediationChatResponse, 'answerId' | 'sessionId'> & { sessionId?: string }
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bioremediation_chat_messages')
    .insert({
      session_id: params.sessionId,
      user_id: params.actor.userId,
      organization_id: params.actor.organizationId,
      role: 'assistant',
      content: buildAssistantContent(params.response),
      response_kind: params.response.kind,
      confidence: params.response.confidence,
      cited_case_ids: params.response.citedCaseIds,
      calculator_context: params.calculatorContext,
      low_confidence: params.response.lowConfidence,
      requires_escalation: params.response.requiresEscalation,
    })
    .select('id')
    .single<{ id: string }>()

  if (error || !data) {
    throw new Error(`Failed to store assistant chat message: ${error?.message ?? 'unknown error'}`)
  }

  return data.id
}

function normalizeModelResponse(params: {
  sessionId: string
  candidates: BioremediationRetrievalCandidate[]
  modelResponse: z.infer<typeof modelResponseSchema>
  inferredWithoutCases?: boolean
}): Omit<BioremediationChatResponse, 'answerId'> {
  const candidateMap = new Map(params.candidates.map((candidate) => [candidate.id, candidate]))
  const citations = params.modelResponse.citedCaseIds
    .map((caseId) => candidateMap.get(caseId))
    .filter((candidate): candidate is BioremediationRetrievalCandidate => Boolean(candidate))
    .map(buildCitation)

  // When inferring without cases, cap confidence and force escalation flag so the user
  // knows the answer is not grounded in Aquavet-approved cases.
  const effectiveConfidence = params.inferredWithoutCases
    ? Math.min(params.modelResponse.confidence, 0.5)
    : params.modelResponse.confidence

  const lowConfidence =
    effectiveConfidence < LOW_CONFIDENCE_THRESHOLD || (citations.length === 0 && !params.inferredWithoutCases)

  return {
    sessionId: params.sessionId,
    kind: params.modelResponse.kind,
    recommendation: params.modelResponse.recommendation,
    rationale: params.modelResponse.rationale,
    followUpQuestion: params.modelResponse.followUpQuestion,
    confidence: effectiveConfidence,
    citations,
    citedCaseIds: citations.map((citation) => citation.caseId),
    lowConfidence,
    requiresEscalation:
      params.inferredWithoutCases ||
      params.modelResponse.requiresEscalation ||
      params.modelResponse.kind === 'escalate' ||
      (lowConfidence && params.modelResponse.kind !== 'clarify'),
    calculatorGuardrailNote: CALCULATOR_GUARDRAIL_NOTE,
  }
}

export async function createBioremediationChatResponse(
  actor: ServiceActor,
  input: BioremediationChatRequest,
): Promise<BioremediationChatResponse> {
  const { sessionId } = await getOrCreateSession(actor, input.calculatorContext, input.sessionId)

  await insertUserMessage({
    sessionId,
    actor,
    question: input.question,
    calculatorContext: input.calculatorContext,
  })

  const retrievalResult = await retrieveApprovedCaseEvidence({
    calculatorContext: input.calculatorContext,
    question: input.question,
    metadata: input.metadata,
  })

  let response: Omit<BioremediationChatResponse, 'answerId'>

  {
    const hasCases = retrievalResult.candidates.length > 0
    try {
      const { object } = await generateDeepSeekObject({
        schema: modelResponseSchema,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(hasCases),
          },
          {
            role: 'user',
            content: buildUserPrompt(input, retrievalResult.candidates),
          },
        ],
      })

      response = normalizeModelResponse({
        sessionId,
        candidates: retrievalResult.candidates,
        modelResponse: object,
        inferredWithoutCases: !hasCases,
      })
    } catch {
      response = buildUnsupportedResponse(
        sessionId,
        input.calculatorContext,
        ['El modelo no pudo generar una respuesta valida. Intenta reformular tu pregunta.'],
      )
    }
  }

  const answerId = await insertAssistantMessage({
    sessionId,
    actor,
    calculatorContext: input.calculatorContext,
    response,
  })

  return {
    ...response,
    answerId,
  }
}
