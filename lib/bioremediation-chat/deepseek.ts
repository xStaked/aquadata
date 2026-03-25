import 'server-only'

import { z } from 'zod'
import { getDeepSeekTextConfig } from '@/lib/ai/provider'

type DeepSeekMessage = {
  role: 'system' | 'user'
  content: string
}

type DeepSeekObjectInput<TSchema extends z.ZodTypeAny> = {
  schema: TSchema
  messages: DeepSeekMessage[]
  temperature?: number
}

type DeepSeekObjectResult<TSchema extends z.ZodTypeAny> = {
  object: z.infer<TSchema>
  model: string
  rawText: string
}

type DeepSeekChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}

function extractTextContent(content?: string | Array<{ type?: string; text?: string }>) {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === 'text' ? part.text ?? '' : ''))
      .join('')
      .trim()
  }

  return ''
}

function extractJsonPayload(rawText: string) {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1)
  }

  return rawText
}

export async function generateDeepSeekObject<TSchema extends z.ZodTypeAny>({
  schema,
  messages,
  temperature = 0.2,
}: DeepSeekObjectInput<TSchema>): Promise<DeepSeekObjectResult<TSchema>> {
  const { apiKey, baseUrl, model } = getDeepSeekTextConfig()

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages,
    }),
    signal: AbortSignal.timeout(45000),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek request failed (${response.status}): ${errorText}`)
  }

  const payload = (await response.json()) as DeepSeekChatCompletionResponse
  const rawText = extractTextContent(payload.choices?.[0]?.message?.content)

  if (!rawText) {
    throw new Error('DeepSeek returned an empty response')
  }

  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(extractJsonPayload(rawText))
  } catch (error) {
    throw new Error(
      `DeepSeek returned invalid JSON: ${error instanceof Error ? error.message : 'unknown parse error'}`,
    )
  }

  return {
    object: schema.parse(parsedValue),
    model,
    rawText,
  }
}
