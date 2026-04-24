'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContext, requireOrgWriteContext } from '@/lib/db/context'
import { getBatch, updateBatchPopulation, createRecord, createAlerts } from '@/lib/db'
import { getPreviousRecordByBatch } from '@/lib/db/repositories/production-record-repository'
import { calculateDailyGainG } from '@/lib/growth'
import { getOrganization } from '@/lib/db/repositories/organization-repository'
import { type FcaSource, calculateCalculatedFca, resolveEffectiveFca } from '@/lib/fca'
import { generateAlerts, type WaterQualityReading } from '@/lib/alerts'
import { revalidatePath } from 'next/cache'
import { differenceInDays } from 'date-fns'

interface ProductionData {
  batch_id: string
  upload_id?: string | null
  record_date: string
  report_type: 'daily' | 'weekly'
  week_end_date: string | null
  fish_count: number | null
  feed_kg: number | null
  avg_weight_g: number | null
  biomass_kg: number | null
  sampling_weight_g: number | null
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
  notes: string | null
  fca_source: FcaSource
}

export async function confirmProductionRecord(data: ProductionData) {
  const ctx = await requireOrgWriteContext()
  const { userId, orgId } = ctx

  // Get batch info
  const batch = await getBatch(data.batch_id)
  if (!batch) throw new Error('Lote no encontrado')

  const resolvedFishCount =
    data.fish_count ?? batch.current_population ?? batch.initial_population ?? null

  // Calculate FCA (uses manual biomass if provided, otherwise calculates it)
  const { calculated_fca, biomass_kg } = calculateCalculatedFca({
    ...data,
    fish_count: resolvedFishCount,
  })

  // Update mortality in batch
  if (data.mortality_count && data.mortality_count > 0) {
    const newPop = (batch.current_population ?? batch.initial_population) - data.mortality_count
    await updateBatchPopulation(data.batch_id, Math.max(0, newPop))
  }

  // Resolve effective FCA
  const org = await getOrganization(orgId)
  const defaultFca = org?.default_fca != null ? Number(org.default_fca) : null

  const { effective_fca, fca_source } = resolveEffectiveFca({
    calculatedFca: calculated_fca,
    defaultFca,
    source: data.fca_source,
  })

  // Calculate daily weight gain (ADG) by comparing with previous record
  const previousRecord = await getPreviousRecordByBatch(data.batch_id, data.record_date)
  const daily_gain_g = calculateDailyGainG(
    data.avg_weight_g,
    data.record_date,
    previousRecord
  )

  // Create production record
  const recordId = await createRecord({
    batch_id: data.batch_id,
    record_date: data.record_date,
    report_type: data.report_type,
    week_end_date: data.week_end_date,
    fish_count: resolvedFishCount,
    feed_kg: data.feed_kg,
    avg_weight_kg: data.avg_weight_g != null ? data.avg_weight_g / 1000 : null,
    biomass_kg,
    sampling_weight_g: data.sampling_weight_g,
    mortality_count: data.mortality_count ?? 0,
    temperature_c: data.temperature_c,
    oxygen_mg_l: data.oxygen_mg_l,
    ammonia_mg_l: data.ammonia_mg_l,
    nitrite_mg_l: data.nitrite_mg_l,
    nitrate_mg_l: data.nitrate_mg_l,
    ph: data.ph,
    phosphate_mg_l: data.phosphate_mg_l,
    hardness_mg_l: data.hardness_mg_l,
    alkalinity_mg_l: data.alkalinity_mg_l,
    turbidity_ntu: data.turbidity_ntu,
    daily_gain_g,
    notes: data.notes,
    calculated_fca,
    effective_fca,
    fca_source,
    confirmed_by: userId,
    upload_id: data.upload_id ?? null,
  })

  // Generate and store alerts using extracted service
  const reading: WaterQualityReading = {
    batch_id: data.batch_id,
    pond_id: batch.pond_id,
    record_id: recordId,
    oxygen_mg_l: data.oxygen_mg_l,
    ammonia_mg_l: data.ammonia_mg_l,
    ph: data.ph,
    temperature_c: data.temperature_c,
    nitrite_mg_l: data.nitrite_mg_l,
    nitrate_mg_l: data.nitrate_mg_l,
    hardness_mg_l: data.hardness_mg_l,
    alkalinity_mg_l: data.alkalinity_mg_l,
    phosphate_mg_l: data.phosphate_mg_l,
    mortality_count: data.mortality_count,
    effective_fca,
  }

  const alertPayloads = generateAlerts(reading, orgId).map((a) => ({ ...a, record_id: recordId }))
  if (alertPayloads.length > 0) {
    await createAlerts(alertPayloads)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/records')
  revalidatePath('/dashboard/analytics')
}

export interface BatchSummary {
  batch_id: string
  start_date: string
  pond_entry_date: string | null
  seed_source: string | null
  initial_population: number
  current_population: number | null
  days_culture: number
  days_pond: number
  animal_actual: number | null
  survival_pct: number | null
  accumulated_feed_kg: number | null
  fortnightly_feed_kg: number | null
  accumulated_mortality: number | null
  latest_avg_weight_g: number | null
  latest_biomass_kg: number | null
}

export async function getBatchSummary(batchId: string): Promise<BatchSummary | null> {
  const supabase = await createClient()

  // Verify ownership via org context
  const { orgId } = await getOrgContext()

  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('id, start_date, pond_entry_date, seed_source, initial_population, current_population, pond_id')
    .eq('id', batchId)
    .single()

  if (batchError || !batch) return null

  // Verify batch belongs to user's org
  const { data: pond } = await supabase
    .from('ponds')
    .select('organization_id')
    .eq('id', batch.pond_id)
    .single()

  if (pond?.organization_id !== orgId) return null

  // Get all records for this batch
  const { data: records } = await supabase
    .from('production_records')
    .select('record_date, feed_kg, mortality_count, avg_weight_kg, biomass_kg')
    .eq('batch_id', batchId)
    .order('record_date', { ascending: true })

  const today = new Date().toISOString().split('T')[0]
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const accumulated_feed_kg = records?.reduce((sum, r) => sum + (r.feed_kg ?? 0), 0) ?? 0
  const fortnightly_feed_kg = records?.reduce((sum, r) => {
    if (r.record_date >= fifteenDaysAgo) return sum + (r.feed_kg ?? 0)
    return sum
  }, 0) ?? 0
  const accumulated_mortality = records?.reduce((sum, r) => sum + (r.mortality_count ?? 0), 0) ?? 0

  const latestRecord = records && records.length > 0
    ? records.reduce((latest, r) => r.record_date > latest.record_date ? r : latest, records[0])
    : null

  const animal_actual = batch.current_population ?? Math.max(0, batch.initial_population - accumulated_mortality)
  const survival_pct = batch.initial_population > 0
    ? (animal_actual / batch.initial_population) * 100
    : null

  return {
    batch_id: batch.id,
    start_date: batch.start_date,
    pond_entry_date: batch.pond_entry_date,
    seed_source: batch.seed_source,
    initial_population: batch.initial_population,
    current_population: batch.current_population,
    days_culture: differenceInDays(new Date(today), new Date(batch.start_date)),
    days_pond: differenceInDays(new Date(today), new Date(batch.pond_entry_date ?? batch.start_date)),
    animal_actual,
    survival_pct,
    accumulated_feed_kg: accumulated_feed_kg > 0 ? accumulated_feed_kg : null,
    fortnightly_feed_kg: fortnightly_feed_kg > 0 ? fortnightly_feed_kg : null,
    accumulated_mortality: accumulated_mortality > 0 ? accumulated_mortality : null,
    latest_avg_weight_g: latestRecord?.avg_weight_kg != null ? latestRecord.avg_weight_kg * 1000 : null,
    latest_biomass_kg: latestRecord?.biomass_kg ?? null,
  }
}
