import { createClient } from '@/lib/supabase/server'
import type { Pond } from '@/db/types'

/**
 * Fetch all ponds for an organization, ordered by sort_order.
 */
export async function getPondsByOrg(orgId: string): Promise<Pond[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ponds')
    .select('*')
    .eq('organization_id', orgId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Error fetching ponds: ${error.message}`)
  return (data ?? []).map(normalizePond)
}

/**
 * Fetch a single pond by ID, verifying ownership.
 */
export async function getPond(pondId: string, orgId?: string): Promise<Pond | null> {
  const supabase = await createClient()

  let query = supabase.from('ponds').select('*').eq('id', pondId)

  if (orgId) {
    query = query.eq('organization_id', orgId)
  }

  const { data, error } = await query.single()

  if (error) {
    // maybeSingle returns null on no-match; single throws. Handle gracefully.
    if (error.code === 'PGRST116') return null
    throw new Error(`Error fetching pond: ${error.message}`)
  }
  return normalizePond(data)
}

/**
 * Create a new pond. Caller must determine sort_order (typically max+1 for the org).
 */
export async function createPond(data: {
  organization_id: string
  name: string
  area_m2?: number | null
  depth_m?: number | null
  species?: string | null
  sort_order: number
}): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('ponds').insert({
    organization_id: data.organization_id,
    name: data.name,
    area_m2: data.area_m2 ?? null,
    depth_m: data.depth_m ?? null,
    species: data.species ?? null,
    status: 'active',
    sort_order: data.sort_order,
  })

  if (error) throw new Error(`Error creating pond: ${error.message}`)
}

/**
 * Delete a pond, verifying it belongs to the given organization.
 */
export async function deletePond(pondId: string, orgId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ponds')
    .delete()
    .eq('id', pondId)
    .eq('organization_id', orgId)

  if (error) throw new Error(`Error deleting pond: ${error.message}`)
}

/**
 * Bulk-update the sort_order of ponds. Validates that all IDs belong to the org.
 */
export async function updatePondOrder(pondIds: string[], orgId: string): Promise<void> {
  if (!Array.isArray(pondIds) || pondIds.length === 0) return

  const supabase = await createClient()

  // Verify all ponds belong to the org
  const { data: pondsInOrg, error: readError } = await supabase
    .from('ponds')
    .select('id')
    .eq('organization_id', orgId)
    .in('id', pondIds)

  if (readError) throw new Error(`Error verifying ponds: ${readError.message}`)
  if ((pondsInOrg?.length ?? 0) !== pondIds.length) {
    throw new Error('Lista de estanques invalida')
  }

  const updates = pondIds.map((id, index) =>
    supabase
      .from('ponds')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('organization_id', orgId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(`Error updating pond order: ${failed.error.message}`)
}

/**
 * Get the highest sort_order for an org's ponds.
 */
export async function getNextSortOrder(orgId: string): Promise<number> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('ponds')
    .select('sort_order')
    .eq('organization_id', orgId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.sort_order != null ? Number(data.sort_order) + 1 : 0
}

function normalizePond(raw: Record<string, unknown>): Pond {
  return {
    id: raw.id as string,
    organization_id: raw.organization_id as string,
    name: raw.name as string,
    area_m2: raw.area_m2 != null ? Number(raw.area_m2) : null,
    depth_m: raw.depth_m != null ? Number(raw.depth_m) : null,
    species: (raw.species as string) ?? null,
    status: (raw.status as Pond['status']) ?? 'active',
    sort_order: Number(raw.sort_order ?? 0),
    created_at: raw.created_at as string,
  }
}
