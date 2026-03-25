'use client'

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight,
  Phone,
  BookOpen,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ChatMessage, ChatResponseKind, ChatCitation } from '@/hooks/use-bioremediation-chat'

// ─── Kind badge ───────────────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: ChatResponseKind }) {
  if (kind === 'answer') {
    return (
      <Badge className="gap-1 bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
        <CheckCircle2 className="h-3 w-3" />
        Respuesta
      </Badge>
    )
  }
  if (kind === 'clarify') {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        <HelpCircle className="h-3 w-3" />
        Pregunta de aclaración
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
      <ArrowUpRight className="h-3 w-3" />
      Escalar a Aquavet
    </Badge>
  )
}

// ─── Citation card ─────────────────────────────────────────────────────────────

function CitationCard({ citation }: { citation: ChatCitation }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{citation.issue}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {Math.round(citation.score * 100)}% coincidencia
        </span>
      </div>
      <div className="mt-1 text-muted-foreground">
        {citation.species} · {citation.zone} · {citation.productName}
      </div>
      <div className="mt-1 text-foreground">
        Dosis aplicada: {citation.dose} {citation.doseUnit}
      </div>
      <div className="mt-1 text-muted-foreground">{citation.outcome}</div>
    </div>
  )
}

// ─── Structured answer block ───────────────────────────────────────────────────

function AnswerBody({ message }: { message: ChatMessage }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Recomendación */}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recomendación
        </p>
        <p className="text-sm leading-relaxed text-foreground">{message.recommendation}</p>
      </div>

      {/* Por qué — rationale */}
      {message.rationale && (
        <>
          <Separator />
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Por qué
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{message.rationale}</p>
          </div>
        </>
      )}

      {/* Casos Aquavet citados */}
      {message.citations && message.citations.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Casos Aquavet citados
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {message.citations.map((citation) => (
                <CitationCard key={citation.caseId} citation={citation} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Confianza */}
      {typeof message.confidence === 'number' && (
        <p className="text-right text-xs text-muted-foreground">
          Confianza: {Math.round(message.confidence * 100)}%
        </p>
      )}

      {/* Guardrail — la calculadora es la fuente de verdad para la dosis numérica */}
      {message.calculatorGuardrailNote && (
        <div className="flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            {message.calculatorGuardrailNote}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Clarify block ─────────────────────────────────────────────────────────────

function ClarifyBody({ message }: { message: ChatMessage }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Main clarification text */}
      <p className="text-sm leading-relaxed text-foreground">{message.recommendation}</p>

      {/* Follow-up question */}
      {message.followUpQuestion && (
        <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
          <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-700 dark:text-amber-300">{message.followUpQuestion}</p>
        </div>
      )}

      {/* Soporte note when no cases available */}
      <p className="text-xs text-muted-foreground">
        Con más contexto el asistente puede buscar en los{' '}
        <span className="font-medium text-foreground">casos aprobados de Aquavet</span> y darte una
        recomendación más precisa.
      </p>
    </div>
  )
}

// ─── Escalate block ────────────────────────────────────────────────────────────

function EscalateBody({ message }: { message: ChatMessage }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Explanation */}
      <p className="text-sm leading-relaxed text-foreground">{message.recommendation}</p>

      {/* Rationale for escalation */}
      {message.rationale && (
        <p className="text-xs leading-relaxed text-muted-foreground">{message.rationale}</p>
      )}

      {/* Soporte Aquavet CTA */}
      <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-900/40 dark:bg-rose-950/30">
        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
        <div>
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
            Contacta al soporte técnico de Aquavet
          </p>
          <p className="mt-0.5 text-xs text-rose-600/80 dark:text-rose-400/80">
            Este caso requiere evaluación directa. Un especialista puede revisar tu situación
            específica y darte una guía segura de dosificación.
          </p>
        </div>
      </div>

      {/* Guardrail — la calculadora sigue siendo la dosis de referencia */}
      {message.calculatorGuardrailNote && (
        <div className="flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            {message.calculatorGuardrailNote}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main exported component ──────────────────────────────────────────────────

interface BioremediationChatMessageProps {
  message: ChatMessage
  children?: React.ReactNode
}

export function BioremediationChatMessage({ message, children }: BioremediationChatMessageProps) {
  const kind: ChatResponseKind = message.kind ?? 'answer'

  return (
    <div className="flex flex-col gap-2">
      {/* Header: bot icon + kind badge */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
        <KindBadge kind={kind} />
      </div>

      {/* Message body */}
      <div className="rounded-xl rounded-tl-sm bg-muted/40 px-4 py-3 text-sm">
        {kind === 'answer' && <AnswerBody message={message} />}
        {kind === 'clarify' && <ClarifyBody message={message} />}
        {kind === 'escalate' && <EscalateBody message={message} />}
      </div>

      {/* Feedback slot — rendered by caller (e.g. BioremediationChatFeedback) */}
      {children}
    </div>
  )
}
