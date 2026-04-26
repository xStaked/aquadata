'use server'

import { revalidatePath } from 'next/cache'
import { differenceInDays, subDays } from 'date-fns'
import { getOrgContext, requireOrgWriteContext } from '@/lib/db/context'
import { updateBatchPopulation, updateRecord, createAlerts, deleteAlertsByRecordId } from '@/lib/db'
import { getPreviousRecordByBatch } from '@/lib/db/repositories/production-record-repository'
import { calculateDailyGainG } from '@/lib/growth'
import { type FcaSource, calculateCalculatedFca, resolveEffectiveFca } from '@/lib/fca'
import { generateAlerts, type WaterQualityReading } from '@/lib/alerts'
import { getOrganization } from '@/lib/db/repositories/organization-repository'
import { createClient } from '@/lib/supabase/server'

interface UpdateProductionRecordInput {
  id: string
  record_date: string
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
  record_time: string | null
  notes: string | null
  fca_source: FcaSource
}

function calculateDerivedValues(data: UpdateProductionRecordInput) {
  return calculateCalculatedFca(data)
}

export interface ProductionRecordDetail {
  record: {
    id: string
    batch_id: string
    record_date: string
    report_type: 'daily' | 'weekly' | null
    week_end_date: string | null
    fish_count: number | null
    feed_kg: number | null
    avg_weight_kg: number | null
    mortality_count: number
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
    calculated_fca: number | null
    effective_fca: number | null
    fca_source: 'calculated' | 'default' | null
    biomass_kg: number | null
    sampling_weight_g: number | null
    notes: string | null
    created_at: string
    upload_id: string | null
  }
  batch: {
    id: string
    start_date: string
    pond_entry_date: string | null
    seed_source: string | null
    initial_population: number
    current_population: number | null
  }
  pond: {
    id: string
    name: string
  }
  upload: {
    sender_name: string | null
    sender_phone: string | null
    source: 'web' | 'whatsapp'
  } | null
  historical: {
    days_culture: number
    days_pond: number
    accumulated_mortality: number
    animal_actual: number
    survival_pct: number | null
    accumulated_feed_kg: number
    fortnightly_feed_kg: number
  }
}

export async function updateProductionRecord(data: UpdateProductionRecordInput) {
  const ctx = await requireOrgWriteContext()
  const { userId, orgId } = ctx

  // Verify record belongs to user's org via batch -> pond -> organization chain
  const supabase = await createClient()
  const { data: existingRecord, error: existingRecordError } = await supabase
    .from('production_records')
    .select('id, batch_id, fish_count, mortality_count')
    .eq('id', data.id)
    .single()

  if (existingRecordError || !existingRecord) {
    throw new Error('No se pudo cargar el registro')
  }

  // Verify batch ownership
  const { data: batchPond } = await supabase
    .from('batches')
    .select('id, current_population, initial_population, pond_id')
    .eq('id', existingRecord.batch_id)
    .single()

  if (!batchPond) {
    throw new Error('No se pudo cargar el lote del registro')
  }

  const { data: pond } = await supabase
    .from('ponds')
    .select('organization_id')
    .eq('id', batchPond.pond_id)
    .single()

  if (pond?.organization_id !== orgId) {
    throw new Error('No autorizado')
  }

  // Update population if mortality changed
  const mortalityDelta = (data.mortality_count ?? 0) - (existingRecord.mortality_count ?? 0)
  const currentPopulation = batchPond.current_population ?? batchPond.initial_population

  if (mortalityDelta !== 0) {
    const nextPopulation = Math.max(0, currentPopulation - mortalityDelta)
    await updateBatchPopulation(existingRecord.batch_id, nextPopulation)
  }

  // Calculate FCA
  const resolvedFishCount = data.fish_count ?? existingRecord.fish_count ?? currentPopulation ?? null
  const { calculated_fca, biomass_kg } = calculateDerivedValues({
    ...data,
    fish_count: resolvedFishCount,
  })

  // Resolve effective FCA
  const org = await getOrganization(orgId)
  const defaultFca = org?.default_fca != null ? Number(org.default_fca) : null

  const { effective_fca, fca_source } = resolveEffectiveFca({
    calculatedFca: calculated_fca,
    defaultFca,
    source: data.fca_source,
  })

  // Recalculate daily weight gain if avg_weight changed
  const previousRecord = await getPreviousRecordByBatch(existingRecord.batch_id, data.record_date)
  const daily_gain_g = calculateDailyGainG(
    data.avg_weight_g,
    data.record_date,
    previousRecord
  )

  // Update record via repository
  await updateRecord(data.id, {
    record_date: data.record_date,
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
    record_time: data.record_time,
    notes: data.notes,
    calculated_fca,
    effective_fca,
    fca_source,
    confirmed_by: userId,
  }, orgId)

  // Regenerate alerts for this record
  await deleteAlertsByRecordId(data.id, orgId)

  const reading: WaterQualityReading = {
    batch_id: existingRecord.batch_id,
    pond_id: batchPond.pond_id,
    record_id: data.id,
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

  const alertPayloads = generateAlerts(reading, orgId).map((a) => ({ ...a, record_id: data.id }))
  if (alertPayloads.length > 0) {
    await createAlerts(alertPayloads)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/records')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard/alerts')
}

export async function getProductionRecordDetail(recordId: string): Promise<ProductionRecordDetail | null> {
  const { orgId } = await getOrgContext()
  const supabase = await createClient()

  const { data: record, error: recordError } = await supabase
    .from('production_records')
    .select(`
      id,
      batch_id,
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
      notes,
      created_at,
      upload_id
    `)
    .eq('id', recordId)
    .single()

  if (recordError || !record) return null

  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('id, pond_id, start_date, pond_entry_date, seed_source, initial_population, current_population')
    .eq('id', record.batch_id)
    .single()

  if (batchError || !batch) return null

  const { data: pond, error: pondError } = await supabase
    .from('ponds')
    .select('id, name, organization_id')
    .eq('id', batch.pond_id)
    .single()

  if (pondError || !pond || pond.organization_id !== orgId) return null

  const { data: upload } = record.upload_id
    ? await supabase
        .from('uploads')
        .select('sender_name, sender_phone, source')
        .eq('id', record.upload_id)
        .maybeSingle()
    : { data: null }

  const { data: batchRecords, error: batchRecordsError } = await supabase
    .from('production_records')
    .select('id, record_date, created_at, feed_kg, mortality_count')
    .eq('batch_id', batch.id)
    .order('record_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (batchRecordsError || !batchRecords) return null

  const currentRecordIndex = batchRecords.findIndex((item) => item.id === record.id)
  const recordsThroughCurrent =
    currentRecordIndex >= 0 ? batchRecords.slice(0, currentRecordIndex + 1) : batchRecords

  const accumulatedMortality = recordsThroughCurrent.reduce(
    (sum, item) => sum + Number(item.mortality_count ?? 0),
    0
  )
  const accumulatedFeed = recordsThroughCurrent.reduce(
    (sum, item) => sum + Number(item.feed_kg ?? 0),
    0
  )

  const fortnightStart = subDays(new Date(record.record_date), 15)
  const fortnightlyFeed = recordsThroughCurrent.reduce((sum, item) => {
    const itemDate = new Date(item.record_date)
    if (itemDate >= fortnightStart && itemDate <= new Date(record.record_date)) {
      return sum + Number(item.feed_kg ?? 0)
    }
    return sum
  }, 0)

  const animalActual = Math.max(0, Number(batch.initial_population) - accumulatedMortality)
  const survivalPct =
    Number(batch.initial_population) > 0
      ? (animalActual / Number(batch.initial_population)) * 100
      : null

  return {
    record: {
      id: record.id,
      batch_id: record.batch_id,
      record_date: record.record_date,
      report_type: record.report_type,
      week_end_date: record.week_end_date,
      fish_count: record.fish_count != null ? Number(record.fish_count) : null,
      feed_kg: record.feed_kg != null ? Number(record.feed_kg) : null,
      avg_weight_kg: record.avg_weight_kg != null ? Number(record.avg_weight_kg) : null,
      mortality_count: Number(record.mortality_count ?? 0),
      temperature_c: record.temperature_c != null ? Number(record.temperature_c) : null,
      oxygen_mg_l: record.oxygen_mg_l != null ? Number(record.oxygen_mg_l) : null,
      ammonia_mg_l: record.ammonia_mg_l != null ? Number(record.ammonia_mg_l) : null,
      nitrite_mg_l: record.nitrite_mg_l != null ? Number(record.nitrite_mg_l) : null,
      nitrate_mg_l: record.nitrate_mg_l != null ? Number(record.nitrate_mg_l) : null,
      ph: record.ph != null ? Number(record.ph) : null,
      phosphate_mg_l: record.phosphate_mg_l != null ? Number(record.phosphate_mg_l) : null,
      hardness_mg_l: record.hardness_mg_l != null ? Number(record.hardness_mg_l) : null,
      alkalinity_mg_l: record.alkalinity_mg_l != null ? Number(record.alkalinity_mg_l) : null,
      turbidity_ntu: record.turbidity_ntu != null ? Number(record.turbidity_ntu) : null,
      daily_gain_g: record.daily_gain_g != null ? Number(record.daily_gain_g) : null,
      calculated_fca: record.calculated_fca != null ? Number(record.calculated_fca) : null,
      effective_fca: record.effective_fca != null ? Number(record.effective_fca) : null,
      fca_source: record.fca_source,
      biomass_kg: record.biomass_kg != null ? Number(record.biomass_kg) : null,
      sampling_weight_g: record.sampling_weight_g != null ? Number(record.sampling_weight_g) : null,
      notes: record.notes,
      created_at: record.created_at,
      upload_id: record.upload_id,
    },
    batch: {
      id: batch.id,
      start_date: batch.start_date,
      pond_entry_date: batch.pond_entry_date,
      seed_source: batch.seed_source,
      initial_population: Number(batch.initial_population),
      current_population: batch.current_population != null ? Number(batch.current_population) : null,
    },
    pond: {
      id: pond.id,
      name: pond.name,
    },
    upload: upload
      ? {
          sender_name: upload.sender_name,
          sender_phone: upload.sender_phone,
          source: upload.source,
        }
      : null,
    historical: {
      days_culture: differenceInDays(new Date(record.record_date), new Date(batch.start_date)),
      days_pond: differenceInDays(
        new Date(record.record_date),
        new Date(batch.pond_entry_date ?? batch.start_date)
      ),
      accumulated_mortality: accumulatedMortality,
      animal_actual: animalActual,
      survival_pct: survivalPct,
      accumulated_feed_kg: accumulatedFeed,
      fortnightly_feed_kg: fortnightlyFeed,
    },
  }
}
