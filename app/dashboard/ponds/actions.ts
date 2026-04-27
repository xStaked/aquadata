'use server'

import { revalidatePath } from 'next/cache'
import { getOrgContext, requireOrgWriteContext } from '@/lib/db/context'
import {
  createPond as dbCreatePond,
  deletePond as dbDeletePond,
  updatePondOrder as dbUpdatePondOrder,
  getNextSortOrder,
  createBatch as dbCreateBatch,
  closeBatch as dbCloseBatch,
  updateBatchDetails as dbUpdateBatchDetails,
  updateBatchFinancial as dbUpdateBatchFinancial,
} from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

export async function getOrCreateOrganization(orgName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase.rpc('create_organization_for_user', {
    org_name: orgName,
  })

  if (error) throw new Error(error.message)
  return data as string
}

export async function createPond(formData: FormData) {
  const ctx = await requireOrgWriteContext()

  let orgId = ctx.orgId

  // Auto-create org if needed (edge case: profile exists but org_id is null)
  if (!orgId) {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', ctx.userId)
      .single()

    if (!profile?.organization_id) {
      const orgName = formData.get('org_name') as string || 'Mi Granja'
      orgId = await getOrCreateOrganization(orgName)
    }
  }

  const sortOrder = await getNextSortOrder(orgId)

  await dbCreatePond({
    organization_id: orgId,
    name: formData.get('name') as string,
    area_m2: Number(formData.get('area_m2')) || null,
    depth_m: Number(formData.get('depth_m')) || null,
    species: formData.get('species') as string || null,
    sort_order: sortOrder,
  })

  revalidatePath('/dashboard/ponds')
}

export async function deletePond(pondId: string) {
  const { orgId } = await requireOrgWriteContext()
  await dbDeletePond(pondId, orgId)
  revalidatePath('/dashboard/ponds')
}

export async function createBatch(formData: FormData) {
  await requireOrgWriteContext()

  const startDate = formData.get('start_date') as string
  await dbCreateBatch({
    pond_id: formData.get('pond_id') as string,
    start_date: startDate,
    initial_population: Number(formData.get('initial_population')),
    current_population: Number(formData.get('initial_population')),
    status: 'active',
    seed_source: (formData.get('seed_source') as string) || null,
    pond_entry_date: startDate,
  })

  revalidatePath('/dashboard/ponds')
}

export async function closeBatch(batchId: string) {
  await requireOrgWriteContext()
  await dbCloseBatch(batchId)
  revalidatePath('/dashboard/ponds')
}

export async function updateBatchDetails(formData: FormData) {
  await requireOrgWriteContext()

  const batchId = formData.get('batch_id') as string
  const startDate = formData.get('start_date') as string
  const seedSource = (formData.get('seed_source') as string) || null

  if (!batchId) throw new Error('Lote no encontrado')
  if (!startDate) throw new Error('La fecha de inicio es requerida')

  await dbUpdateBatchDetails(batchId, {
    start_date: startDate,
    pond_entry_date: startDate,
    seed_source: seedSource,
  })

  revalidatePath('/dashboard/ponds')
  revalidatePath('/dashboard/upload')
  revalidatePath('/dashboard/records')
}

export async function updateBatchPrice(batchId: string, price: number) {
  await requireOrgWriteContext()
  await dbUpdateBatchFinancial(batchId, { sale_price_per_kg: price })
  revalidatePath('/dashboard/costs')
  revalidatePath('/dashboard/ponds')
}

export async function updateBatchFinancialConfig(batchId: string, data: {
  sale_price_per_kg: number | null
  target_profitability_pct: number
  fingerling_cost_per_unit: number
  avg_weight_at_seeding_g: number | null
  labor_cost_per_month: number
  bioaqua_quantity: number
  bioterra_quantity: number
}) {
  await requireOrgWriteContext()
  await dbUpdateBatchFinancial(batchId, data)
  revalidatePath('/dashboard/costs')
  revalidatePath('/dashboard/ponds')
}

export async function updatePondOrder(pondIds: string[]) {
  const { orgId } = await requireOrgWriteContext()
  if (!Array.isArray(pondIds) || pondIds.length === 0) return

  await dbUpdatePondOrder(pondIds, orgId)

  revalidatePath('/dashboard/ponds')
  revalidatePath('/dashboard/costs')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard/upload')
  revalidatePath('/dashboard/records')
  revalidatePath('/dashboard/alerts')
}

// ── Vaccine Types ─────────────────────────────────────────────

export async function createVaccineType(data: { name: string; description?: string }) {
  const ctx = await requireOrgWriteContext()
  const supabase = await createClient()

  const { error } = await supabase
    .from('vaccine_types')
    .insert({
      organization_id: ctx.orgId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/ponds')
}

export async function updateVaccineType(id: string, data: { name: string; description?: string }) {
  await requireOrgWriteContext()
  const supabase = await createClient()

  const { error } = await supabase
    .from('vaccine_types')
    .update({
      name: data.name.trim(),
      description: data.description?.trim() || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/ponds')
}

export async function deleteVaccineType(id: string) {
  await requireOrgWriteContext()
  const supabase = await createClient()

  const { error } = await supabase
    .from('vaccine_types')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/ponds')
}

// ── Batch Vaccines ────────────────────────────────────────────

export async function createBatchVaccine(data: {
  batch_id: string
  vaccine_type_id: string | null
  vaccine_type_name: string
  is_vaccinated: boolean
  application_date: string | null
  notes?: string | null
}) {
  await requireOrgWriteContext()
  const supabase = await createClient()

  const { error } = await supabase
    .from('batch_vaccines')
    .insert({
      batch_id: data.batch_id,
      vaccine_type_id: data.vaccine_type_id,
      vaccine_type_name: data.vaccine_type_name.trim(),
      is_vaccinated: data.is_vaccinated,
      application_date: data.application_date || null,
      notes: data.notes?.trim() || null,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/ponds')
}

export async function updateBatchVaccine(
  id: string,
  data: {
    vaccine_type_id: string | null
    vaccine_type_name: string
    is_vaccinated: boolean
    application_date: string | null
    notes?: string | null
  }
) {
  await requireOrgWriteContext()
  const supabase = await createClient()

  const { error } = await supabase
    .from('batch_vaccines')
    .update({
      vaccine_type_id: data.vaccine_type_id,
      vaccine_type_name: data.vaccine_type_name.trim(),
      is_vaccinated: data.is_vaccinated,
      application_date: data.application_date || null,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/ponds')
}

export async function deleteBatchVaccine(id: string) {
  await requireOrgWriteContext()
  const supabase = await createClient()

  const { error } = await supabase
    .from('batch_vaccines')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/ponds')
}
