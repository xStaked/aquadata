import { z } from 'zod'

export const productCategoryValues = ['agua', 'suelo'] as const

const trimmedOptionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : undefined))

export const bioremediationProductInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(productCategoryValues),
  description: z.string().trim().min(10).max(2000),
  presentation: trimmedOptionalText,
  dose_unit: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .transform((value) => value || 'L/ha'),
  application_method: trimmedOptionalText,
  species_scope: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(100),
  image_url: z.string().url().optional(),
})

export const bioremediationProductStatusSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
})

export const bioremediationProductUpdateSchema = bioremediationProductInputSchema.merge(
  z.object({ id: z.string().uuid() }),
)

export type BioremediationProductFormValues = z.infer<typeof bioremediationProductInputSchema>
export type BioremediationProductUpdateValues = z.infer<typeof bioremediationProductUpdateSchema>
