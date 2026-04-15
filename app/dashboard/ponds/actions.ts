'use server'

import { revalidatePath } from 'next/cache'
import { getOrgContext } from '@/lib/db/context'
import {
  createPond as dbCreatePond,
  deletePond as dbDeletePond,
  updatePondOrder as dbUpdatePondOrder,
  getNextSortOrder,
  createBatch as dbCreateBatch,
  closeBatch as dbCloseBatch,
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
  const ctx = await getOrgContext()

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
    status: 'active',
    sort_order: sortOrder,
  })

  revalidatePath('/dashboard/ponds')
}

export async function deletePond(pondId: string) {
  const { orgId } = await getOrgContext()
  await dbDeletePond(pondId, orgId)
  revalidatePath('/dashboard/ponds')
}

export async function createBatch(formData: FormData) {
  await dbCreateBatch({
    pond_id: formData.get('pond_id') as string,
    start_date: formData.get('start_date') as string,
    initial_population: Number(formData.get('initial_population')),
    current_population: Number(formData.get('initial_population')),
    status: 'active',
  })

  revalidatePath('/dashboard/ponds')
}

export async function closeBatch(batchId: string) {
  await dbCloseBatch(batchId)
  revalidatePath('/dashboard/ponds')
}

export async function updateBatchPrice(batchId: string, price: number) {
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
}) {
  await dbUpdateBatchFinancial(batchId, data)
  revalidatePath('/dashboard/costs')
  revalidatePath('/dashboard/ponds')
}

export async function updatePondOrder(pondIds: string[]) {
  const { orgId } = await getOrgContext()
  if (!Array.isArray(pondIds) || pondIds.length === 0) return

  await dbUpdatePondOrder(pondIds, orgId)

  revalidatePath('/dashboard/ponds')
  revalidatePath('/dashboard/costs')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard/upload')
  revalidatePath('/dashboard/records')
  revalidatePath('/dashboard/alerts')
}
