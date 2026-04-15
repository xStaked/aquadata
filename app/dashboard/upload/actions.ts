'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/db/context'
import { getBatch, updateBatchPopulation, createRecord, createAlerts } from '@/lib/db'
import { getOrganization } from '@/lib/db/repositories/organization-repository'
import { type FcaSource, calculateCalculatedFca, resolveEffectiveFca } from '@/lib/fca'
import { generateAlerts, type WaterQualityReading } from '@/lib/alerts'
import { revalidatePath } from 'next/cache'

interface ProductionData {
  batch_id: string
  record_date: string
  report_type: 'daily' | 'weekly'
  week_end_date: string | null
  fish_count: number | null
  feed_kg: number | null
  avg_weight_g: number | null
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
  notes: string | null
  fca_source: FcaSource
}

export async function confirmProductionRecord(data: ProductionData) {
  const ctx = await getOrgContext()
  const { userId, orgId } = ctx

  // Get batch info
  const batch = await getBatch(data.batch_id)
  if (!batch) throw new Error('Lote no encontrado')

  const resolvedFishCount =
    data.fish_count ?? batch.current_population ?? batch.initial_population ?? null

  // Calculate FCA
  const { calculated_fca, calculated_biomass_kg } = calculateCalculatedFca({
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

  // Create production record
  await createRecord({
    batch_id: data.batch_id,
    record_date: data.record_date,
    report_type: data.report_type,
    week_end_date: data.week_end_date,
    fish_count: resolvedFishCount,
    feed_kg: data.feed_kg,
    avg_weight_kg: data.avg_weight_g != null ? data.avg_weight_g / 1000 : null,
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
    notes: data.notes,
    calculated_fca,
    effective_fca,
    fca_source,
    calculated_biomass_kg,
    confirmed_by: userId,
  })

  // Generate and store alerts using extracted service
  const reading: WaterQualityReading = {
    batch_id: data.batch_id,
    pond_id: batch.pond_id,
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

  const alertPayloads = generateAlerts(reading, orgId)
  if (alertPayloads.length > 0) {
    await createAlerts(alertPayloads)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/records')
  revalidatePath('/dashboard/analytics')
}
