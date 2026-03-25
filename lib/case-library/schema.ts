import { z } from 'zod'

export const caseStatusValues = ['draft', 'approved', 'retired'] as const

const requiredCaseTextField = z.string().trim().min(1)

export const caseInputSchema = z.object({
  id: z.string().uuid().optional(),
  issue: requiredCaseTextField,
  zone: requiredCaseTextField,
  species: requiredCaseTextField,
  product_name: requiredCaseTextField,
  treatment_approach: requiredCaseTextField,
  dose: z.coerce.number().positive(),
  dose_unit: requiredCaseTextField.default('L'),
  outcome: requiredCaseTextField,
  status: z.enum(caseStatusValues),
  notes: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((value) => (value ? value : undefined)),
})

export const caseStatusTransitionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(caseStatusValues),
})
