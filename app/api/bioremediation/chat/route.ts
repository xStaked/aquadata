import { NextResponse } from 'next/server'
import {
  bioremediationChatRequestSchema,
  bioremediationChatResponseSchema,
} from '@/lib/bioremediation-chat/schema'
import { createBioremediationChatResponse } from '@/lib/bioremediation-chat/service'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const parsedRequest = bioremediationChatRequestSchema.safeParse(payload)

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: 'Payload invalido para el chat de bioremediacion',
          details: parsedRequest.error.flatten(),
        },
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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single<{ organization_id: string | null }>()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'El usuario no tiene una organizacion asignada' }, { status: 403 })
    }

    const { question, calculatorContext, sessionId, metadata } = parsedRequest.data

    const response = await createBioremediationChatResponse(
      {
        userId: user.id,
        organizationId: profile.organization_id,
      },
      {
        question,
        calculatorContext,
        sessionId,
        metadata,
      },
    )

    return NextResponse.json(bioremediationChatResponseSchema.parse(response))
  } catch (error) {
    console.error('Bioremediation chat route error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error al procesar la consulta de bioremediacion',
      },
      { status: 500 },
    )
  }
}
