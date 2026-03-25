'use client'

import { useEffect, useRef } from 'react'
import { Bot, Send, AlertTriangle, Loader2, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { BioremediationChatMessage } from '@/components/bioremediation-chat-message'
import { BioremediationChatFeedback } from '@/components/bioremediation-chat-feedback'
import type { ChatMessage, CalculatorContext } from '@/hooks/use-bioremediation-chat'

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
                <BioremediationChatMessage key={message.id} message={message}>
                  <BioremediationChatFeedback messageId={message.id} />
                </BioremediationChatMessage>
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
