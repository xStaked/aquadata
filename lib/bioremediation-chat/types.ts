import type { z } from 'zod'
import {
  calculatorContextSchema,
  chatMessageSchema,
  chatSessionSchema,
  citationSchema,
  messageRoleValues,
  responseKindValues,
} from '@/lib/bioremediation-chat/schema'
import type { BioremediationCaseRow } from '@/lib/case-library/types'

export type BioremediationChatResponseKind = (typeof responseKindValues)[number]

export type BioremediationChatMessageRole = (typeof messageRoleValues)[number]

export type BioremediationChatCalculatorContext = z.infer<typeof calculatorContextSchema>

export type BioremediationChatCitation = z.infer<typeof citationSchema>

export type BioremediationChatMessage = z.infer<typeof chatMessageSchema>

export type BioremediationChatSession = z.infer<typeof chatSessionSchema>

export type BioremediationRetrievalCandidate = Pick<
  BioremediationCaseRow,
  | 'id'
  | 'issue'
  | 'zone'
  | 'species'
  | 'product_name'
  | 'treatment_approach'
  | 'dose'
  | 'dose_unit'
  | 'outcome'
  | 'status'
  | 'status_usable_for_grounding'
> & {
  score: number
  rank: number
  matchReasons: string[]
}

export type BioremediationRetrievalResult = {
  candidates: BioremediationRetrievalCandidate[]
  lowEvidence: boolean
  insufficient: boolean
  exclusionReasons: string[]
}
