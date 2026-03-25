'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

type FeedbackValue = 'useful' | 'not_useful'

interface BioremediationChatFeedbackProps {
  /** UUID of the assistant message to record feedback against */
  messageId: string
}

export function BioremediationChatFeedback({ messageId }: BioremediationChatFeedbackProps) {
  const [submitted, setSubmitted] = useState<FeedbackValue | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleFeedback(feedback: FeedbackValue) {
    if (submitted || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/bioremediation/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, feedback }),
      })

      if (response.ok) {
        setSubmitted(feedback)
      }
      // Silently ignore errors — feedback is optional and should never block the UX
    } catch {
      // Network failures are non-blocking
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <p className="text-xs text-muted-foreground">
        {submitted === 'useful' ? 'Marcado como útil' : 'Gracias por tu comentario'}
      </p>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">¿Fue útil esta respuesta?</span>
      <Button
        variant="ghost"
        size="sm"
        disabled={isSubmitting}
        onClick={() => handleFeedback('useful')}
        className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-teal-600"
        aria-label="Marcar como útil"
      >
        <ThumbsUp className="h-3 w-3" />
        <span>Útil</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={isSubmitting}
        onClick={() => handleFeedback('not_useful')}
        className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-rose-600"
        aria-label="Marcar como no útil"
      >
        <ThumbsDown className="h-3 w-3" />
        <span>No útil</span>
      </Button>
    </div>
  )
}
