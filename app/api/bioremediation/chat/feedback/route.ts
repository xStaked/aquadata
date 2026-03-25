import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const feedbackBodySchema = z.object({
  messageId: z.string().uuid(),
  feedback: z.enum(['useful', 'not_useful']),
})

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const parsed = feedbackBodySchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido para el feedback de mensaje' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { messageId, feedback } = parsed.data

    // Update the assistant message row. The RLS UPDATE policy on
    // bioremediation_chat_messages ensures producers can only update
    // their own organization-scoped messages, preventing cross-tenant
    // feedback writes.
    const { error } = await supabase
      .from('bioremediation_chat_messages')
      .update({ feedback })
      .eq('id', messageId)
      .eq('user_id', user.id)
      .eq('role', 'assistant')

    if (error) {
      console.error('Chat feedback update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Chat feedback route error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error al guardar el feedback del mensaje',
      },
      { status: 500 },
    )
  }
}
