'use client'

import { useState, useCallback, useRef } from 'react'
import type { CalcResult, ProductKey } from '@/hooks/use-bioremediation'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatResponseKind = 'answer' | 'clarify' | 'escalate'

export interface ChatCitation {
  caseId: string
  issue: string
  zone: string
  species: string
  productName: string
  treatmentApproach: string
  dose: number
  doseUnit: string
  outcome: string
  score: number
  rationale?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  kind?: ChatResponseKind
  confidence?: number
  citations?: ChatCitation[]
  citedCaseIds?: string[]
  lowConfidence?: boolean
  requiresEscalation?: boolean
  recommendation?: string
  rationale?: string
  followUpQuestion?: string
  calculatorGuardrailNote?: string
  createdAt: string
}

export interface CalculatorContext {
  product: string
  species: string
  areaM2: number
  depth: number
  ageMonths: number
  stockingDensity: number
  aeration: string
  finalDoseG?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCalculatorContext(
  selectedProduct: ProductKey | null,
  species: string,
  areaM2: string,
  depth: string,
  ageMonths: string,
  stockingDensity: string,
  aeration: string,
  result: CalcResult | null,
): CalculatorContext | null {
  if (!selectedProduct || !species || !areaM2 || !depth || !ageMonths || !stockingDensity || !aeration) {
    return null
  }

  const parsedAreaM2 = parseFloat(areaM2)
  const parsedDepth = parseFloat(depth)
  const parsedAgeMonths = parseInt(ageMonths, 10)
  const parsedStockingDensity = parseFloat(stockingDensity)

  if (
    isNaN(parsedAreaM2) || parsedAreaM2 <= 0 ||
    isNaN(parsedDepth) || parsedDepth <= 0 ||
    isNaN(parsedAgeMonths) || parsedAgeMonths < 0 ||
    isNaN(parsedStockingDensity) || parsedStockingDensity < 0
  ) {
    return null
  }

  return {
    product: selectedProduct,
    species,
    areaM2: parsedAreaM2,
    depth: parsedDepth,
    ageMonths: parsedAgeMonths,
    stockingDensity: parsedStockingDensity,
    aeration,
    finalDoseG: result?.finalDoseG,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseBioremediationChatParams {
  selectedProduct: ProductKey | null
  species: string
  areaM2: string
  depth: string
  ageMonths: string
  stockingDensity: string
  aeration: string
  result: CalcResult | null
}

export function useBioremediationChat(params: UseBioremediationChatParams) {
  const {
    selectedProduct,
    species,
    areaM2,
    depth,
    ageMonths,
    stockingDensity,
    aeration,
    result,
  } = params

  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const calculatorContext = buildCalculatorContext(
    selectedProduct,
    species,
    areaM2,
    depth,
    ageMonths,
    stockingDensity,
    aeration,
    result,
  )

  const sendMessage = useCallback(
    async (question?: string) => {
      const text = (question ?? draft).trim()
      if (!text || isSending) return

      if (!calculatorContext) {
        setError('Completa los parámetros de la calculadora antes de hacer una consulta.')
        return
      }

      setError(null)

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage])
      setDraft('')
      setIsSending(true)

      try {
        abortRef.current = new AbortController()

        const requestBody = {
          question: text,
          calculatorContext,
          ...(sessionId ? { sessionId } : {}),
        }

        const response = await fetch('/api/bioremediation/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortRef.current.signal,
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(
            (errData as { error?: string }).error ?? `Error ${response.status} al consultar el asistente`,
          )
        }

        const data = await response.json()

        // Persist session across turns
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId)
        }

        const kind: ChatResponseKind = (['answer', 'clarify', 'escalate'] as const).includes(data.kind)
          ? data.kind
          : 'escalate'

        const assistantMessage: ChatMessage = {
          id: data.answerId ?? crypto.randomUUID(),
          role: 'assistant',
          content: data.recommendation ?? '',
          kind,
          confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
          citations: Array.isArray(data.citations) ? data.citations : [],
          citedCaseIds: Array.isArray(data.citedCaseIds) ? data.citedCaseIds : [],
          lowConfidence: Boolean(data.lowConfidence),
          requiresEscalation: Boolean(data.requiresEscalation),
          recommendation: data.recommendation,
          rationale: data.rationale,
          followUpQuestion: data.followUpQuestion,
          calculatorGuardrailNote: data.calculatorGuardrailNote,
          createdAt: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const message =
          err instanceof Error ? err.message : 'Error desconocido al contactar el asistente'
        setError(message)
        // Remove the optimistic user message on failure
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
      } finally {
        setIsSending(false)
        abortRef.current = null
      }
    },
    [draft, isSending, calculatorContext, sessionId],
  )

  function clearMessages() {
    setMessages([])
    setSessionId(undefined)
    setError(null)
  }

  return {
    // State
    sessionId,
    messages,
    draft,
    setDraft,
    isSending,
    error,
    // Derived
    calculatorContext,
    // Actions
    sendMessage,
    clearMessages,
  }
}
