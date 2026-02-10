/**
 * AI Provider Factory
 *
 * Centralizes model selection so switching providers is a one-line change.
 * All models are referenced via the Vercel AI Gateway (zero-config).
 *
 * Supported zero-config providers:
 *   - anthropic  (Claude)
 *   - openai     (GPT)
 *   - google     (Gemini via Vertex)
 *   - fireworks  (Fireworks AI)
 *   - bedrock    (AWS Bedrock)
 */

export type AIProvider = 'anthropic' | 'openai'

interface AIModelConfig {
  /** Model used for image analysis / OCR */
  vision: string
  /** Model used for general text tasks */
  text: string
}

const MODEL_CATALOG: Record<AIProvider, AIModelConfig> = {
  anthropic: {
    vision: 'anthropic/claude-sonnet-4-20250514',
    text: 'anthropic/claude-sonnet-4-20250514',
  },
  openai: {
    vision: 'openai/gpt-4o',
    text: 'openai/gpt-4o',
  },
}

// ──────────────────────────────────────────────
//  Change this single line to switch providers
// ──────────────────────────────────────────────
const ACTIVE_PROVIDER: AIProvider = 'anthropic'

export function getActiveProvider(): AIProvider {
  return ACTIVE_PROVIDER
}

export function getVisionModel(): string {
  return MODEL_CATALOG[ACTIVE_PROVIDER].vision
}

export function getTextModel(): string {
  return MODEL_CATALOG[ACTIVE_PROVIDER].text
}
