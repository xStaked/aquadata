'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/auth/roles'
import { caseInputSchema, caseStatusTransitionSchema, caseStatusValues } from '@/lib/case-library/schema'

type CaseStatus = (typeof caseStatusValues)[number]

function buildGovernanceUpdate(status: CaseStatus, reviewerId: string, reviewedAt: string) {
  if (status === 'draft') {
    return {
      last_reviewed_by: null,
      last_reviewed_at: null,
      status_usable_for_grounding: false,
    }
  }

  return {
    last_reviewed_by: reviewerId,
    last_reviewed_at: reviewedAt,
    status_usable_for_grounding: status === 'approved',
  }
}

function revalidateCaseLibraryPaths() {
  revalidatePath('/admin/bioremediation')
  revalidatePath('/admin/bioremediation/cases')
}

export async function upsertBioremediationCase(input: unknown): Promise<void> {
  const { supabase, user } = await requireAdminUser()
  const payload = caseInputSchema.parse(input)
  const reviewedAt = new Date().toISOString()

  const caseRecord = {
    issue: payload.issue,
    zone: payload.zone,
    species: payload.species,
    product_name: payload.product_name,
    treatment_approach: payload.treatment_approach,
    dose: payload.dose,
    dose_unit: payload.dose_unit,
    outcome: payload.outcome,
    status: payload.status,
    notes: payload.notes ?? null,
    ...buildGovernanceUpdate(payload.status, user.id, reviewedAt),
  }

  const mutation = payload.id
    ? supabase.from('bioremediation_cases').update(caseRecord).eq('id', payload.id)
    : supabase.from('bioremediation_cases').insert({
        ...caseRecord,
        author_id: user.id,
      })

  const { error } = await mutation

  if (error) {
    throw new Error(error.message)
  }

  revalidateCaseLibraryPaths()
}

export async function bulkUpsertBioremediationCases(
  cases: unknown[]
): Promise<{ inserted: number; errors: string[] }> {
  const { supabase, user } = await requireAdminUser()
  const errors: string[] = []
  const validRecords: object[] = []

  for (let i = 0; i < cases.length; i++) {
    const result = caseInputSchema.safeParse(cases[i])
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const firstError = Object.values(fieldErrors).find((e) => e && e.length > 0)?.[0]
      errors.push(`Fila ${i + 1}: ${firstError ?? 'Datos invalidos'}`)
      continue
    }
    const payload = result.data
    validRecords.push({
      issue: payload.issue,
      zone: payload.zone,
      species: payload.species,
      product_name: payload.product_name,
      treatment_approach: payload.treatment_approach,
      dose: payload.dose,
      dose_unit: payload.dose_unit,
      outcome: payload.outcome,
      status: 'draft' as const,
      notes: payload.notes ?? null,
      status_usable_for_grounding: false,
      last_reviewed_by: null,
      last_reviewed_at: null,
      author_id: user.id,
    })
  }

  if (validRecords.length > 0) {
    const { error } = await supabase.from('bioremediation_cases').insert(validRecords)
    if (error) {
      throw new Error(error.message)
    }
  }

  revalidateCaseLibraryPaths()
  return { inserted: validRecords.length, errors }
}

export async function transitionBioremediationCaseStatus(input: {
  id: string
  status: CaseStatus
}): Promise<void> {
  const { supabase, user } = await requireAdminUser()
  const payload = caseStatusTransitionSchema.parse(input)

  const { error } = await supabase
    .from('bioremediation_cases')
    .update({
      status: payload.status,
      ...buildGovernanceUpdate(payload.status, user.id, new Date().toISOString()),
    })
    .eq('id', payload.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidateCaseLibraryPaths()
}
