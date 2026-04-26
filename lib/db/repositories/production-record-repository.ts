import { createClient } from '@/lib/supabase/server'
import type { FcaSource, ProductionRecord, ProductionRecordWithBatch } from '@/db/types'

const PRODUCTION_RECORD_SELECT = `
  id,
  batch_id,
  upload_id,
  record_date,
  report_type,
  week_end_date,
  fish_count,
  feed_kg,
  avg_weight_kg,
  mortality_count,
  temperature_c,
  oxygen_mg_l,
  ammonia_mg_l,
  nitrite_mg_l,
  nitrate_mg_l,
  ph,
  phosphate_mg_l,
  hardness_mg_l,
  alkalinity_mg_l,
  turbidity_ntu,
  daily_gain_g,
  calculated_fca,
  effective_fca,
  fca_source,
  biomass_kg,
  sampling_weight_g,
  record_time,
  notes,
  confirmed_by,
  created_at
`.replace(/\s+/g, ' ').trim()

/**
 * Fetch all production records for a batch.
 */
export async function getRecordsByBatch(batchId: string): Promise<ProductionRecord[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('production_records')
    .select(PRODUCTION_RECORD_SELECT)
    .eq('batch_id', batchId)
    .order('record_date', { ascending: true })

  if (error) throw new Error(`Error fetching records by batch: ${error.message}`)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(normalizeRecord)
}

/**
 * Fetch all production records for an organization.
 * Joins through batches and ponds to filter by org.
 */
export async function getRecordsByOrg(orgId: string): Promise<ProductionRecordWithBatch[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('production_records')
    .select(
      `${PRODUCTION_RECORD_SELECT}, batches(*, ponds(*))`
    )
    .filter('batches.ponds.organization_id', 'eq', orgId)
    .order('record_date', { ascending: false })

  if (error) throw new Error(`Error fetching records by org: ${error.message}`)

  return ((data ?? []) as unknown as Array<Record<string, unknown> & {
    batches?: Record<string, unknown> & { ponds?: Record<string, unknown> }
  }>)
    .filter((r): r is Record<string, unknown> & {
      batches: Record<string, unknown> & { ponds: Record<string, unknown> }
    } => Boolean(r.batches?.ponds))
    .map((r) => ({
      ...normalizeRecord(r),
      batch: {
        ...normalizeBatchFromRaw(r.batches),
        pond: normalizePondFromRaw(r.batches.ponds),
      },
    }))
}

/**
 * Create a new production record.
 */
export async function createRecord(data: {
  batch_id: string
  record_date: string
  report_type?: 'daily' | 'weekly'
  week_end_date?: string | null
  fish_count?: number | null
  feed_kg?: number | null
  avg_weight_g?: number | null
  avg_weight_kg?: number | null
  mortality_count?: number
  temperature_c?: number | null
  oxygen_mg_l?: number | null
  ammonia_mg_l?: number | null
  nitrite_mg_l?: number | null
  nitrate_mg_l?: number | null
  ph?: number | null
  phosphate_mg_l?: number | null
  hardness_mg_l?: number | null
  alkalinity_mg_l?: number | null
  turbidity_ntu?: number | null
  daily_gain_g?: number | null
  notes?: string | null
  calculated_fca?: number | null
  effective_fca?: number | null
  fca_source?: FcaSource | null
  biomass_kg?: number | null
  sampling_weight_g?: number | null
  record_time?: string | null
  confirmed_by?: string | null
  upload_id?: string | null
}): Promise<string> {
  const supabase = await createClient()
  const avgWeightKg =
    data.avg_weight_kg ?? (data.avg_weight_g != null ? data.avg_weight_g / 1000 : null)

  const { data: inserted, error } = await supabase.from('production_records').insert({
    batch_id: data.batch_id,
    record_date: data.record_date,
    report_type: data.report_type ?? null,
    week_end_date: data.week_end_date ?? null,
    fish_count: data.fish_count ?? null,
    feed_kg: data.feed_kg ?? null,
    avg_weight_kg: avgWeightKg,
    mortality_count: data.mortality_count ?? 0,
    temperature_c: data.temperature_c ?? null,
    oxygen_mg_l: data.oxygen_mg_l ?? null,
    ammonia_mg_l: data.ammonia_mg_l ?? null,
    nitrite_mg_l: data.nitrite_mg_l ?? null,
    nitrate_mg_l: data.nitrate_mg_l ?? null,
    ph: data.ph ?? null,
    phosphate_mg_l: data.phosphate_mg_l ?? null,
    hardness_mg_l: data.hardness_mg_l ?? null,
    alkalinity_mg_l: data.alkalinity_mg_l ?? null,
    turbidity_ntu: data.turbidity_ntu ?? null,
    daily_gain_g: data.daily_gain_g ?? null,
    notes: data.notes ?? null,
    calculated_fca: data.calculated_fca ?? null,
    effective_fca: data.effective_fca ?? null,
    fca_source: data.fca_source ?? null,
    biomass_kg: data.biomass_kg ?? null,
    sampling_weight_g: data.sampling_weight_g ?? null,
    record_time: data.record_time ?? null,
    confirmed_by: data.confirmed_by ?? null,
    upload_id: data.upload_id ?? null,
  }).select('id').single()

  if (error) throw new Error(`Error creating production record: ${error.message}`)
  return inserted.id as string
}

/**
 * Update a production record, with org ownership verification.
 */
export async function updateRecord(
  recordId: string,
  data: Partial<{
    record_date: string
    fish_count: number | null
    feed_kg: number | null
    avg_weight_g: number | null
    avg_weight_kg: number | null
    mortality_count: number | null
    temperature_c: number | null
    oxygen_mg_l: number | null
    ammonia_mg_l: number | null
    nitrite_mg_l: number | null
    nitrate_mg_l: number | null
    ph: number | null
    phosphate_mg_l: number | null
    hardness_mg_l: number | null
    alkalinity_mg_l: number | null
    turbidity_ntu: number | null
    daily_gain_g: number | null
    notes: string | null
    calculated_fca: number | null
    effective_fca: number | null
    fca_source: FcaSource | null
    biomass_kg: number | null
    sampling_weight_g: number | null
    record_time: string | null
    confirmed_by: string | null
  }>,
  orgId: string
): Promise<void> {
  const supabase = await createClient()

  // Verify ownership: record -> batch -> pond -> organization_id
  const { data: ownershipCheck, error: ownershipError } = await supabase
    .from('production_records')
    .select('batch_id')
    .eq('id', recordId)
    .single()

  if (ownershipError || !ownershipCheck) {
    throw new Error('No se encontro el registro')
  }

  const { data: batchCheck, error: batchCheckError } = await supabase
    .from('batches')
    .select('pond_id')
    .eq('id', ownershipCheck.batch_id)
    .single()

  if (batchCheckError || !batchCheck) {
    throw new Error('No se encontro el lote del registro')
  }

  const { data: pondCheck, error: pondCheckError } = await supabase
    .from('ponds')
    .select('organization_id')
    .eq('id', batchCheck.pond_id)
    .single()

  if (pondCheckError || pondCheck?.organization_id !== orgId) {
    throw new Error('No tiene permiso para modificar este registro')
  }

  const updatePayload: Record<string, unknown> = { ...data }
  if ('avg_weight_kg' in data) {
    updatePayload.avg_weight_kg = data.avg_weight_kg ?? null
  } else if ('avg_weight_g' in data && data.avg_weight_g != null) {
    updatePayload.avg_weight_kg = data.avg_weight_g / 1000
  }
  delete updatePayload.avg_weight_g

  const { error } = await supabase
    .from('production_records')
    .update(updatePayload)
    .eq('id', recordId)

  if (error) throw new Error(`Error updating production record: ${error.message}`)
}

/**
 * Fetch the record immediately before a given date for a batch.
 */
export async function getPreviousRecordByBatch(
  batchId: string,
  beforeDate: string
): Promise<ProductionRecord | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('production_records')
    .select(PRODUCTION_RECORD_SELECT)
    .eq('batch_id', batchId)
    .lt('record_date', beforeDate)
    .order('record_date', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Error fetching previous record: ${error.message}`)
  if (!data || data.length === 0) return null
  return normalizeRecord(data[0] as unknown as Record<string, unknown>)
}

/**
 * Fetch the latest (most recent) production record for a batch.
 */
export async function getLatestRecordByBatch(batchId: string): Promise<ProductionRecord | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('production_records')
    .select(PRODUCTION_RECORD_SELECT)
    .eq('batch_id', batchId)
    .order('record_date', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Error fetching latest record: ${error.message}`)
  if (!data || data.length === 0) return null
  return normalizeRecord(data[0] as unknown as Record<string, unknown>)
}

function normalizeRecord(raw: Record<string, unknown>): ProductionRecord {
  return {
    id: raw.id as string,
    batch_id: raw.batch_id as string,
    upload_id: (raw.upload_id as string) ?? null,
    record_date: raw.record_date as string,
    report_type: (raw.report_type as ProductionRecord['report_type']) ?? null,
    week_end_date: (raw.week_end_date as string) ?? null,
    feed_kg: raw.feed_kg != null ? Number(raw.feed_kg) : null,
    avg_weight_kg: raw.avg_weight_kg != null ? Number(raw.avg_weight_kg) : null,
    avg_weight_g:
      raw.avg_weight_g != null
        ? Number(raw.avg_weight_g)
        : raw.avg_weight_kg != null
          ? Number(raw.avg_weight_kg) * 1000
          : null,
    fish_count: raw.fish_count != null ? Number(raw.fish_count) : null,
    mortality_count: raw.mortality_count != null ? Number(raw.mortality_count) : 0,
    temperature_c: raw.temperature_c != null ? Number(raw.temperature_c) : null,
    oxygen_mg_l: raw.oxygen_mg_l != null ? Number(raw.oxygen_mg_l) : null,
    ammonia_mg_l: raw.ammonia_mg_l != null ? Number(raw.ammonia_mg_l) : null,
    nitrite_mg_l: raw.nitrite_mg_l != null ? Number(raw.nitrite_mg_l) : null,
    nitrate_mg_l: raw.nitrate_mg_l != null ? Number(raw.nitrate_mg_l) : null,
    ph: raw.ph != null ? Number(raw.ph) : null,
    phosphate_mg_l: raw.phosphate_mg_l != null ? Number(raw.phosphate_mg_l) : null,
    hardness_mg_l: raw.hardness_mg_l != null ? Number(raw.hardness_mg_l) : null,
    alkalinity_mg_l: raw.alkalinity_mg_l != null ? Number(raw.alkalinity_mg_l) : null,
    turbidity_ntu: raw.turbidity_ntu != null ? Number(raw.turbidity_ntu) : null,
    daily_gain_g: raw.daily_gain_g != null ? Number(raw.daily_gain_g) : null,
    calculated_fca: raw.calculated_fca != null ? Number(raw.calculated_fca) : null,
    effective_fca: raw.effective_fca != null ? Number(raw.effective_fca) : null,
    fca_source: (raw.fca_source as FcaSource) ?? null,
    biomass_kg:
      raw.biomass_kg != null ? Number(raw.biomass_kg) : null,
    sampling_weight_g:
      raw.sampling_weight_g != null ? Number(raw.sampling_weight_g) : null,
    record_time: (raw.record_time as string) ?? null,
    notes: (raw.notes as string) ?? null,
    confirmed_by: (raw.confirmed_by as string) ?? null,
    created_at: raw.created_at as string,
  }
}

function normalizeBatchFromRaw(raw: Record<string, unknown>): ProductionRecordWithBatch['batch'] {
  return {
    id: raw.id as string,
    pond_id: raw.pond_id as string,
    start_date: raw.start_date as string,
    end_date: (raw.end_date as string) ?? null,
    initial_population: Number(raw.initial_population ?? 0),
    current_population: raw.current_population != null ? Number(raw.current_population) : null,
    status: (raw.status as string) ?? 'active',
    sale_price_per_kg: raw.sale_price_per_kg != null ? Number(raw.sale_price_per_kg) : null,
    target_profitability_pct:
      raw.target_profitability_pct != null ? Number(raw.target_profitability_pct) : null,
    fingerling_cost_per_unit:
      raw.fingerling_cost_per_unit != null ? Number(raw.fingerling_cost_per_unit) : null,
    avg_weight_at_seeding_g:
      raw.avg_weight_at_seeding_g != null ? Number(raw.avg_weight_at_seeding_g) : null,
    labor_cost_per_month:
      raw.labor_cost_per_month != null ? Number(raw.labor_cost_per_month) : null,
    operating_fixed_costs:
      raw.operating_fixed_costs != null ? Number(raw.operating_fixed_costs) : null,
    target_profit_amount:
      raw.target_profit_amount != null ? Number(raw.target_profit_amount) : null,
    bioaqua_quantity:
      raw.bioaqua_quantity != null ? Number(raw.bioaqua_quantity) : null,
    bioterra_quantity:
      raw.bioterra_quantity != null ? Number(raw.bioterra_quantity) : null,
    created_at: raw.created_at as string,
  } as ProductionRecordWithBatch['batch']
}

function normalizePondFromRaw(raw: Record<string, unknown>): ProductionRecordWithBatch['batch']['pond'] {
  return {
    id: raw.id as string,
    organization_id: raw.organization_id as string,
    name: raw.name as string,
    area_m2: raw.area_m2 != null ? Number(raw.area_m2) : null,
    depth_m: raw.depth_m != null ? Number(raw.depth_m) : null,
    species: (raw.species as string) ?? null,
    status: (raw.status as ProductionRecordWithBatch['batch']['pond']['status']) ?? 'active',
    sort_order: Number(raw.sort_order ?? 0),
    created_at: raw.created_at as string,
  }
}
