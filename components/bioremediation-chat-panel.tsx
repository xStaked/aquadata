'use client'

import { useEffect, useRef } from 'react'
import { Bot, Send, AlertTriangle, CheckCircle2, HelpCircle, ArrowUpRight, Loader2, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ChatMessage, ChatResponseKind, ChatCitation, CalculatorContext } from '@/hooks/use-bioremediation-chat'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function kindBadge(kind: ChatResponseKind) {
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

function AssistantMessage({ message }: { message: ChatMessage }) {
  const kind = message.kind ?? 'answer'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
        {kindBadge(kind)}
      </div>

      <div className="rounded-xl rounded-tl-sm bg-muted/40 px-4 py-3 text-sm">
        <p className="leading-relaxed text-foreground">{message.recommendation}</p>

        {message.rationale && (
          <p className="mt-2 text-xs text-muted-foreground">{message.rationale}</p>
        )}

        {message.followUpQuestion && (
          <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-700 dark:text-amber-300">{message.followUpQuestion}</p>
          </div>
        )}

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Casos Aquavet citados
            </p>
            {message.citations.map((citation) => (
              <CitationCard key={citation.caseId} citation={citation} />
            ))}
          </div>
        )}

        {message.calculatorGuardrailNote && (
          <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">{message.calculatorGuardrailNote}</p>
          </div>
        )}

        {typeof message.confidence === 'number' && (
          <p className="mt-2 text-right text-xs text-muted-foreground">
            Confianza: {Math.round(message.confidence * 100)}%
          </p>
        )}
      </div>
    </div>
  )
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {message.content}
      </div>
    </div>
  )
}

// ─── Context summary ──────────────────────────────────────────────────────────

function ContextSummary({ calculatorContext }: { calculatorContext: CalculatorContext }) {
  const hasDosis = typeof calculatorContext.finalDoseG === 'number'

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <span>
        <span className="font-medium text-foreground">Producto:</span>{' '}
        <span className="uppercase">{calculatorContext.product}</span>
      </span>
      <span>
        <span className="font-medium text-foreground">Especie:</span>{' '}
        {calculatorContext.species}
      </span>
      <span>
        <span className="font-medium text-foreground">Aireación:</span>{' '}
        {calculatorContext.aeration === '0' ? 'Ninguna' : `${calculatorContext.aeration}h`}
      </span>
      {hasDosis && (
        <span>
          <span className="font-medium text-foreground">Dosis calculada:</span>{' '}
          {calculatorContext.finalDoseG! < 1000
            ? `${calculatorContext.finalDoseG!.toFixed(1)} g`
            : `${(calculatorContext.finalDoseG! / 1000).toFixed(3)} kg`}
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BioremediationChatPanelProps {
  messages: ChatMessage[]
  draft: string
  setDraft: (v: string) => void
  isSending: boolean
  error: string | null
  calculatorContext: CalculatorContext | null
  onSend: () => void
}

export function BioremediationChatPanel({
  messages,
  draft,
  setDraft,
  isSending,
  error,
  calculatorContext,
  onSend,
}: BioremediationChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const noContext = !calculatorContext

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Asistente de bioremediación
            </CardTitle>
            <CardDescription className="text-xs">
              Consulta basada en casos reales de Aquavet. La calculadora sigue siendo la referencia numérica.
            </CardDescription>
          </div>
        </div>

        {calculatorContext && (
          <div className="pt-1">
            <ContextSummary calculatorContext={calculatorContext} />
          </div>
        )}

        {noContext && (
          <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Completa los parámetros de la calculadora para que el asistente tenga contexto sobre el estanque, especie y producto.
            </p>
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex flex-col gap-4 p-4">
        {/* Message area */}
        <div className="flex min-h-[200px] flex-col gap-4 overflow-y-auto">
          {messages.length === 0 && !isSending ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Sin consultas aún
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Haz una pregunta sobre la dosis, el producto o el protocolo de aplicación y el asistente buscará en los casos aprobados de Aquavet.
              </p>
            </div>
          ) : (
            messages.map((message) =>
              message.role === 'user' ? (
                <UserMessage key={message.id} message={message} />
              ) : (
                <AssistantMessage key={message.id} message={message} />
              ),
            )
          )}

          {isSending && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Consultando casos Aquavet...</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-950/30">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        )}

        {/* Composer */}
        <div className="flex items-end gap-2 rounded-xl border bg-background px-3 py-2">
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder={
              noContext
                ? 'Completa la calculadora para activar el asistente...'
                : '¿Tienes alguna duda sobre la dosis, aireación o protocolo?'
            }
            disabled={isSending || noContext}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Button
            size="sm"
            disabled={!draft.trim() || isSending || noContext}
            onClick={onSend}
            className="shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Enviar</span>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Las respuestas son orientativas y se apoyan en casos de campo de Aquavet. La dosis calculada en la{' '}
          <strong>calculadora</strong> es la referencia numérica final.
        </p>
      </CardContent>
    </Card>
  )
}
