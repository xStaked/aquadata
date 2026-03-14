/**
 * AI Provider Factory
 *
 * Centralizes model selection so switching providers is a one-line change.
 *
 * Supported providers:
 *   - google     (Gemini — direct via @ai-sdk/google, requires GOOGLE_GENERATIVE_AI_API_KEY)
 *   - anthropic  (Claude — via Vercel AI Gateway)
 *   - openai     (GPT   — via Vercel AI Gateway)
 */

import { google } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'

export type AIProvider = 'google' | 'anthropic' | 'openai'

interface AIModelConfig {
  /** Model used for image analysis / OCR */
  vision: LanguageModel
  /** Model used for general text tasks */
  text: LanguageModel
}

const MODEL_CATALOG: Record<AIProvider, AIModelConfig> = {
  google: {
    vision: google('gemini-2.5-flash'),
    text: google('gemini-2.5-flash'),
  },
  anthropic: {
    vision: 'anthropic/claude-sonnet-4-20250514' as LanguageModel,
    text: 'anthropic/claude-sonnet-4-20250514' as LanguageModel,
  },
  openai: {
    vision: 'openai/gpt-4o' as LanguageModel,
    text: 'openai/gpt-4o' as LanguageModel,
  },
}

// ──────────────────────────────────────────────
//  Change this single line to switch providers
// ──────────────────────────────────────────────
const ACTIVE_PROVIDER: AIProvider = 'google'

export function getActiveProvider(): AIProvider {
  return ACTIVE_PROVIDER
}

export function getVisionModel(): LanguageModel {
  return MODEL_CATALOG[ACTIVE_PROVIDER].vision
}

export function getTextModel(): LanguageModel {
  return MODEL_CATALOG[ACTIVE_PROVIDER].text
}
