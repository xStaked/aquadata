import { createClient } from '@/lib/supabase/server'
import type { Batch, BatchWithPond, Pond } from '@/db/types'

/**
 * Fetch a single batch by ID.
 */
export async function getBatch(batchId: string): Promise<Batch | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('batches')
    .select('*')
    .eq('id', batchId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Error fetching batch: ${error.message}`)
  }
  return normalizeBatch(data)
}

/**
 * Fetch a batch with its associated pond info.
 */
export async function getBatchWithPond(batchId: string): Promise<BatchWithPond | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('batches')
    .select('*, ponds(*)')
    .eq('id', batchId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Error fetching batch with pond: ${error.message}`)
  }
  if (!data?.ponds) return null

  return {
    ...normalizeBatch(data),
    pond: normalizePond(data.ponds),
  }
}

/**
 * Fetch all batches for a given pond.
 */
export async function getBatchesByPond(pondId: string): Promise<Batch[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('batches')
    .select('*')
    .eq('pond_id', pondId)
    .order('start_date', { ascending: false })

  if (error) throw new Error(`Error fetching batches by pond: ${error.message}`)
  return (data ?? []).map(normalizeBatch)
}

/**
 * Fetch all active batches for an organization.
 * Uses a join through ponds to filter by org.
 */
export async function getActiveBatchesByOrg(orgId: string): Promise<Batch[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('batches')
    .select('*, ponds!inner(*)')
    .eq('ponds.organization_id', orgId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })

  if (error) throw new Error(`Error fetching active batches: ${error.message}`)
  return (data ?? []).map(normalizeBatch)
}

/**
 * Create a new batch.
 */
export async function createBatch(data: {
  pond_id: string
  start_date: string
  initial_population: number
  current_population?: number
  status?: string
}): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('batches').insert({
    pond_id: data.pond_id,
    start_date: data.start_date,
    initial_population: data.initial_population,
    current_population: data.current_population ?? data.initial_population,
    status: data.status ?? 'active',
  })

  if (error) throw new Error(`Error creating batch: ${error.message}`)
}

/**
 * Update a batch's current_population.
 */
export async function updateBatchPopulation(
  batchId: string,
  newPopulation: number
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('batches')
    .update({ current_population: Math.max(0, newPopulation) })
    .eq('id', batchId)

  if (error) throw new Error(`Error updating batch population: ${error.message}`)
}

/**
 * Close a batch (set status to 'closed' and end_date to today).
 */
export async function closeBatch(batchId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('batches')
    .update({
      status: 'closed',
      end_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', batchId)

  if (error) throw new Error(`Error closing batch: ${error.message}`)
}

/**
 * Update financial configuration fields on a batch.
 */
export async function updateBatchFinancial(
  batchId: string,
  data: {
    sale_price_per_kg?: number | null
    target_profitability_pct?: number
    fingerling_cost_per_unit?: number
    avg_weight_at_seeding_g?: number | null
    labor_cost_per_month?: number
  }
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('batches')
    .update({
      sale_price_per_kg: data.sale_price_per_kg ?? null,
      target_profitability_pct: data.target_profitability_pct,
      fingerling_cost_per_unit: data.fingerling_cost_per_unit,
      avg_weight_at_seeding_g: data.avg_weight_at_seeding_g ?? null,
      labor_cost_per_month: data.labor_cost_per_month,
    })
    .eq('id', batchId)

  if (error) throw new Error(`Error updating batch financial config: ${error.message}`)
}

function normalizeBatch(raw: Record<string, unknown>): Batch {
  return {
    id: raw.id as string,
    pond_id: raw.pond_id as string,
    start_date: raw.start_date as string,
    end_date: (raw.end_date as string) ?? null,
    initial_population: Number(raw.initial_population ?? 0),
    current_population: raw.current_population != null ? Number(raw.current_population) : null,
    status: (raw.status as Batch['status']) ?? 'active',
    sale_price_per_kg: raw.sale_price_per_kg != null ? Number(raw.sale_price_per_kg) : null,
    target_profitability_pct:
      raw.target_profitability_pct != null ? Number(raw.target_profitability_pct) : null,
    fingerling_cost_per_unit:
      raw.fingerling_cost_per_unit != null ? Number(raw.fingerling_cost_per_unit) : null,
    avg_weight_at_seeding_g:
      raw.avg_weight_at_seeding_g != null ? Number(raw.avg_weight_at_seeding_g) : null,
    labor_cost_per_month:
      raw.labor_cost_per_month != null ? Number(raw.labor_cost_per_month) : null,
    created_at: raw.created_at as string,
  }
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
