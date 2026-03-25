import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  BioremediationChatCalculatorContext,
  BioremediationRetrievalCandidate,
  BioremediationRetrievalResult,
} from '@/lib/bioremediation-chat/types'
import type { BioremediationCaseRow } from '@/lib/case-library/types'

type RetrievalMetadata = {
  product?: string
  species?: string
  zone?: string
  issue?: string
}

type RetrieveApprovedCasesInput = {
  calculatorContext: BioremediationChatCalculatorContext
  question: string
  metadata?: RetrievalMetadata
  limit?: number
}

const DEFAULT_LIMIT = 3
const LOW_EVIDENCE_SCORE = 70

const retrievalSelect = [
  'id',
  'issue',
  'zone',
  'species',
  'product_name',
  'treatment_approach',
  'dose',
  'dose_unit',
  'outcome',
  'status',
  'status_usable_for_grounding',
].join(', ')

function normalizeValue(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isExactMatch(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizeValue(left)
  const normalizedRight = normalizeValue(right)

  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight)
}

function isLooseMatch(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizeValue(left)
  const normalizedRight = normalizeValue(right)

  return Boolean(
    normalizedLeft &&
      normalizedRight &&
      (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)),
  )
}

function tokenizeQuestion(question: string) {
  return Array.from(
    new Set(
      normalizeValue(question)
        .split(' ')
        .filter((token) => token.length >= 4),
    ),
  )
}

function buildRequiredFilters(
  calculatorContext: BioremediationChatCalculatorContext,
  metadata?: RetrievalMetadata,
) {
  return {
    product: metadata?.product ?? calculatorContext.product,
    species: metadata?.species ?? calculatorContext.species,
    zone: metadata?.zone,
    issue: metadata?.issue,
  }
}

function filterApprovedCases(
  rows: BioremediationCaseRow[],
  requiredFilters: ReturnType<typeof buildRequiredFilters>,
) {
  return rows.filter((row) => {
    if (requiredFilters.product && !isLooseMatch(row.product_name, requiredFilters.product)) {
      return false
    }

    if (requiredFilters.species && !isLooseMatch(row.species, requiredFilters.species)) {
      return false
    }

    if (requiredFilters.zone && !isLooseMatch(row.zone, requiredFilters.zone)) {
      return false
    }

    return true
  })
}

function scoreCandidate(
  row: BioremediationCaseRow,
  questionTokens: string[],
  requiredFilters: ReturnType<typeof buildRequiredFilters>,
): Omit<BioremediationRetrievalCandidate, 'rank'> {
  let score = 0
  const matchReasons: string[] = []

  if (isExactMatch(row.product_name, requiredFilters.product)) {
    score += 45
    matchReasons.push('product exact match')
  } else if (isLooseMatch(row.product_name, requiredFilters.product)) {
    score += 30
    matchReasons.push('product partial match')
  }

  if (isExactMatch(row.species, requiredFilters.species)) {
    score += 35
    matchReasons.push('species exact match')
  } else if (isLooseMatch(row.species, requiredFilters.species)) {
    score += 20
    matchReasons.push('species partial match')
  }

  if (requiredFilters.zone) {
    if (isExactMatch(row.zone, requiredFilters.zone)) {
      score += 15
      matchReasons.push('zone exact match')
    } else if (isLooseMatch(row.zone, requiredFilters.zone)) {
      score += 8
      matchReasons.push('zone partial match')
    }
  }

  if (requiredFilters.issue) {
    if (isExactMatch(row.issue, requiredFilters.issue)) {
      score += 12
      matchReasons.push('issue exact match')
    } else if (isLooseMatch(row.issue, requiredFilters.issue)) {
      score += 6
      matchReasons.push('issue partial match')
    }
  }

  const searchableText = [
    row.issue,
    row.zone,
    row.species,
    row.product_name,
    row.treatment_approach,
    row.outcome,
  ]
    .map((value) => normalizeValue(value))
    .join(' ')

  const keywordHits = questionTokens.filter((token) => searchableText.includes(token)).length

  if (keywordHits > 0) {
    score += Math.min(keywordHits * 3, 12)
    matchReasons.push(`question keyword hits: ${keywordHits}`)
  }

  return {
    id: row.id,
    issue: row.issue,
    zone: row.zone,
    species: row.species,
    product_name: row.product_name,
    treatment_approach: row.treatment_approach,
    dose: row.dose,
    dose_unit: row.dose_unit,
    outcome: row.outcome,
    status: row.status,
    status_usable_for_grounding: row.status_usable_for_grounding,
    score,
    matchReasons,
  }
}

function buildExclusionReasons(
  rows: BioremediationCaseRow[],
  requiredFilters: ReturnType<typeof buildRequiredFilters>,
) {
  const reasons: string[] = []

  if (rows.length === 0) {
    reasons.push('No approved grounding cases are available.')
    return reasons
  }

  if (requiredFilters.product) {
    const hasProductMatch = rows.some((row) => isLooseMatch(row.product_name, requiredFilters.product))
    if (!hasProductMatch) {
      reasons.push(`No approved case matched product "${requiredFilters.product}".`)
    }
  }

  if (requiredFilters.species) {
    const hasSpeciesMatch = rows.some((row) => isLooseMatch(row.species, requiredFilters.species))
    if (!hasSpeciesMatch) {
      reasons.push(`No approved case matched species "${requiredFilters.species}".`)
    }
  }

  if (requiredFilters.zone) {
    const hasZoneMatch = rows.some((row) => isLooseMatch(row.zone, requiredFilters.zone))
    if (!hasZoneMatch) {
      reasons.push(`No approved case matched zone "${requiredFilters.zone}".`)
    }
  }

  return reasons
}

export async function retrieveApprovedCaseEvidence({
  calculatorContext,
  question,
  metadata,
  limit = DEFAULT_LIMIT,
}: RetrieveApprovedCasesInput): Promise<BioremediationRetrievalResult> {
  const supabase = await createClient()
  const requiredFilters = buildRequiredFilters(calculatorContext, metadata)
  const questionTokens = tokenizeQuestion(question)

  const { data, error } = await supabase
    .from('bioremediation_cases')
    .select(retrievalSelect)
    .eq('status', 'approved')
    .eq('status_usable_for_grounding', true)

  if (error) {
    throw new Error(`Failed to retrieve approved bioremediation cases: ${error.message}`)
  }

  const approvedRows = (data ?? []) as BioremediationCaseRow[]
  const filteredRows = filterApprovedCases(approvedRows, requiredFilters)

  if (filteredRows.length === 0) {
    return {
      candidates: [],
      lowEvidence: true,
      insufficient: true,
      exclusionReasons: buildExclusionReasons(approvedRows, requiredFilters),
    }
  }

  const rankedCandidates = filteredRows
    .map((row) => scoreCandidate(row, questionTokens, requiredFilters))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.id.localeCompare(right.id)
    })
    .slice(0, limit)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }))

  const topScore = rankedCandidates[0]?.score ?? 0
  const lowEvidence = rankedCandidates.length === 0 || topScore < LOW_EVIDENCE_SCORE

  return {
    candidates: rankedCandidates,
    lowEvidence,
    insufficient: rankedCandidates.length === 0,
    exclusionReasons: lowEvidence ? ['Evidence is insufficient for a confident grounded answer.'] : [],
  }
}
