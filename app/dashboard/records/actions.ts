'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { type FcaSource, calculateCalculatedFca, resolveEffectiveFca } from '@/lib/fca'

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No autenticado')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: existingRecord, error: existingRecordError } = await supabase
    .from('production_records')
    .select('id, batch_id, mortality_count')
    .eq('id', data.id)
    .single()

  if (existingRecordError || !existingRecord) {
    throw new Error('No se pudo cargar el registro')
  }

  const mortalityDelta = (data.mortality_count ?? 0) - (existingRecord.mortality_count ?? 0)

  if (mortalityDelta !== 0) {
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id, current_population, initial_population')
      .eq('id', existingRecord.batch_id)
      .single()

    if (batchError || !batch) {
      throw new Error('No se pudo actualizar la población del lote')
    }

    const currentPopulation = batch.current_population ?? batch.initial_population
    const nextPopulation = Math.max(0, currentPopulation - mortalityDelta)

    const { error: batchUpdateError } = await supabase
      .from('batches')
      .update({ current_population: nextPopulation })
      .eq('id', existingRecord.batch_id)

    if (batchUpdateError) {
      throw new Error(batchUpdateError.message)
    }
  }

  const { calculated_fca, calculated_biomass_kg } = calculateDerivedValues(data)

  let defaultFca: number | null = null
  if (profile?.organization_id) {
    const { data: organization } = await supabase
      .from('organizations')
      .select('default_fca')
      .eq('id', profile.organization_id)
      .single()

    defaultFca = organization?.default_fca != null ? Number(organization.default_fca) : null
  }

  const { effective_fca, fca_source } = resolveEffectiveFca({
    calculatedFca: calculated_fca,
    defaultFca,
    source: data.fca_source,
  })

  const { error: updateError } = await supabase
    .from('production_records')
    .update({
      record_date: data.record_date,
      fish_count: data.fish_count,
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
      confirmed_by: user.id,
    })
    .eq('id', data.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/records')
  revalidatePath('/dashboard/analytics')
}
