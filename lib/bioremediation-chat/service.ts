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

function buildClarifyResponse(
  sessionId: string,
  exclusionReasons: string[],
): Omit<BioremediationChatResponse, 'answerId'> {
  return buildFallbackResponse({
    sessionId,
    kind: 'clarify',
    recommendation:
      'Necesito un poco mas de contexto puntual para buscar casos aprobados realmente comparables.',
    rationale:
      exclusionReasons.join(' ') ||
      'La evidencia recuperada es insuficiente para una respuesta confiable con grounding.',
    confidence: 0.35,
    lowConfidence: true,
    requiresEscalation: false,
    followUpQuestion:
      'Confirma la zona del problema y el sintoma principal observado antes de continuar.',
  })
}

function buildSystemPrompt() {
  return [
    'Eres un asistente tecnico de bioremediacion para AquaVet.',
    'Responde solo en espanol.',
    'Usa unicamente los casos aprobados entregados como evidencia.',
    'La calculadora deterministica es la fuente de verdad para la dosis final; no la reemplaces ni inventes nuevas dosis.',
    'Si falta evidencia suficiente, responde con kind "clarify" o "escalate", nunca improvises.',
    'Solo cites case IDs que aparezcan en la evidencia proporcionada.',
    'Devuelve exclusivamente JSON valido con las claves solicitadas.',
  ].join(' ')
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
    'Casos aprobados disponibles:',
    JSON.stringify(evidence, null, 2),
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
}): Omit<BioremediationChatResponse, 'answerId'> {
  const candidateMap = new Map(params.candidates.map((candidate) => [candidate.id, candidate]))
  const citations = params.modelResponse.citedCaseIds
    .map((caseId) => candidateMap.get(caseId))
    .filter((candidate): candidate is BioremediationRetrievalCandidate => Boolean(candidate))
    .map(buildCitation)

  const lowConfidence =
    params.modelResponse.confidence < LOW_CONFIDENCE_THRESHOLD || citations.length === 0

  if (params.modelResponse.kind === 'answer' && citations.length === 0) {
    return buildFallbackResponse({
      sessionId: params.sessionId,
      kind: 'escalate',
      recommendation:
        'No puedo sostener una respuesta tecnica con casos aprobados suficientes para esta consulta.',
      rationale:
        'El modelo no pudo respaldar la respuesta con casos aprobados citables, por lo que es mas seguro escalar.',
      confidence: Math.min(params.modelResponse.confidence, 0.25),
      lowConfidence: true,
      requiresEscalation: true,
      followUpQuestion:
        'Consulta con Aquavet antes de cambiar la dosis o el protocolo aplicado en el estanque.',
    })
  }

  return {
    sessionId: params.sessionId,
    kind: citations.length === 0 && params.modelResponse.kind === 'answer'
      ? 'escalate'
      : params.modelResponse.kind,
    recommendation: params.modelResponse.recommendation,
    rationale: params.modelResponse.rationale,
    followUpQuestion: params.modelResponse.followUpQuestion,
    confidence: params.modelResponse.confidence,
    citations,
    citedCaseIds: citations.map((citation) => citation.caseId),
    lowConfidence,
    requiresEscalation:
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

  if (retrievalResult.insufficient || retrievalResult.candidates.length === 0) {
    response = buildUnsupportedResponse(
      sessionId,
      input.calculatorContext,
      retrievalResult.exclusionReasons,
    )
  } else if (retrievalResult.lowEvidence) {
    response = buildClarifyResponse(sessionId, retrievalResult.exclusionReasons)
  } else {
    const { object } = await generateDeepSeekObject({
      schema: modelResponseSchema,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(),
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
    })
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
