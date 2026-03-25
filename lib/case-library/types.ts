import type { z } from 'zod'
import { caseInputSchema, caseStatusValues } from '@/lib/case-library/schema'

export type BioremediationCaseStatus = (typeof caseStatusValues)[number]

export type BioremediationCaseFormValues = z.infer<typeof caseInputSchema>

export type BioremediationCaseRow = {
  id: string
  issue: string
  zone: string
  species: string
  product_name: string
  treatment_approach: string
  dose: number
  dose_unit: string
  outcome: string
  status: BioremediationCaseStatus
  status_usable_for_grounding: boolean
  author_id: string
  last_reviewed_by: string | null
  last_reviewed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
