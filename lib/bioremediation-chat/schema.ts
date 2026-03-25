import { z } from 'zod'

const optionalTrimmedString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .transform((value) => value ?? undefined)

export const responseKindValues = ['answer', 'clarify', 'escalate'] as const

export const messageRoleValues = ['user', 'assistant', 'system'] as const

export const calculatorContextSchema = z.object({
  product: z.string().trim().min(1),
  species: z.string().trim().min(1),
  areaM2: z.number().positive(),
  depth: z.number().positive(),
  ageMonths: z.number().nonnegative(),
  stockingDensity: z.number().nonnegative(),
  aeration: z.string().trim().min(1),
  finalDoseG: z.number().nonnegative().optional(),
})

export const citationSchema = z.object({
  caseId: z.string().uuid(),
  issue: z.string().trim().min(1),
  zone: z.string().trim().min(1),
  species: z.string().trim().min(1),
  productName: z.string().trim().min(1),
  treatmentApproach: z.string().trim().min(1),
  dose: z.number().positive(),
  doseUnit: z.string().trim().min(1),
  outcome: z.string().trim().min(1),
  score: z.number().nonnegative(),
  rationale: optionalTrimmedString,
})

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: z.enum(messageRoleValues),
  content: z.string().trim().min(1),
  responseKind: z.enum(responseKindValues).optional(),
  confidence: z.number().min(0).max(1).optional(),
  citations: z.array(citationSchema).default([]),
  citedCaseIds: z.array(z.string().uuid()).default([]),
  calculatorContext: calculatorContextSchema.optional(),
  lowConfidence: z.boolean().default(false),
  requiresEscalation: z.boolean().default(false),
  createdAt: z.string().datetime(),
})

export const chatSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  calculatorContext: calculatorContextSchema,
  lastDeterministicDoseG: z.number().nonnegative().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
