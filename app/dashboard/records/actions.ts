'use server'

import { revalidatePath } from 'next/cache'
import { getOrgContext } from '@/lib/db/context'
import { updateBatchPopulation, updateRecord } from '@/lib/db'
import { type FcaSource, calculateCalculatedFca, resolveEffectiveFca } from '@/lib/fca'
import { getOrganization } from '@/lib/db/repositories/organization-repository'
import { createClient } from '@/lib/supabase/server'

interface UpdateProductionRecordInput {
  id: string
  record_date: string
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

function calculateDerivedValues(data: UpdateProductionRecordInput) {
  return calculateCalculatedFca(data)
}

export async function updateProductionRecord(data: UpdateProductionRecordInput) {
  const ctx = await getOrgContext()
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
  const { calculated_fca, calculated_biomass_kg } = calculateDerivedValues({
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

  // Update record via repository
  await updateRecord(data.id, {
    record_date: data.record_date,
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
  }, orgId)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/records')
  revalidatePath('/dashboard/analytics')
}
