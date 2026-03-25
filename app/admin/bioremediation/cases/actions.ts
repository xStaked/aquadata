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
