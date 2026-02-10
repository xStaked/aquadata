'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ProductionData {
  batch_id: string
  record_date: string
  feed_kg: number | null
  avg_weight_g: number | null
  mortality_count: number | null
  temperature_c: number | null
  oxygen_mg_l: number | null
  ammonia_mg_l: number | null
  nitrite_mg_l: number | null
  nitrate_mg_l: number | null
  ph: number | null
  notes: string | null
}

export async function confirmProductionRecord(data: ProductionData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Calculate FCA and biomass if possible
  let calculated_fca: number | null = null
  let calculated_biomass_kg: number | null = null

  // Get batch info for calculations
  const { data: batch } = await supabase
    .from('batches')
    .select('current_population, initial_population')
    .eq('id', data.batch_id)
    .single()

  if (batch && data.avg_weight_g) {
    const population = batch.current_population ?? batch.initial_population
    calculated_biomass_kg = (population * data.avg_weight_g) / 1000
  }

  // Get previous record for FCA calculation
  if (data.feed_kg && data.avg_weight_g) {
    const { data: prevRecord } = await supabase
      .from('production_records')
      .select('avg_weight_g')
      .eq('batch_id', data.batch_id)
      .order('record_date', { ascending: false })
      .limit(1)
      .single()

    if (prevRecord?.avg_weight_g) {
      const weightGain = data.avg_weight_g - prevRecord.avg_weight_g
      if (weightGain > 0 && batch) {
        const population = batch.current_population ?? batch.initial_population
        const gainKg = (weightGain * population) / 1000
        calculated_fca = data.feed_kg / gainKg
      }
    }
  }

  // Update mortality in batch
  if (data.mortality_count && data.mortality_count > 0 && batch) {
    const newPop = (batch.current_population ?? batch.initial_population) - data.mortality_count
    await supabase
      .from('batches')
      .update({ current_population: Math.max(0, newPop) })
      .eq('id', data.batch_id)
  }

  const { error } = await supabase.from('production_records').insert({
    batch_id: data.batch_id,
    record_date: data.record_date,
    feed_kg: data.feed_kg,
    avg_weight_g: data.avg_weight_g,
    mortality_count: data.mortality_count ?? 0,
    temperature_c: data.temperature_c,
    oxygen_mg_l: data.oxygen_mg_l,
    ammonia_mg_l: data.ammonia_mg_l,
    nitrite_mg_l: data.nitrite_mg_l,
    nitrate_mg_l: data.nitrate_mg_l,
    ph: data.ph,
    notes: data.notes,
    calculated_fca,
    calculated_biomass_kg,
    confirmed_by: user.id,
  })

  if (error) throw new Error(error.message)

  // Generate alerts for critical values
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.organization_id) {
    const { data: batchInfo } = await supabase
      .from('batches')
      .select('pond_id')
      .eq('id', data.batch_id)
      .single()

    const alerts: Array<{
      organization_id: string
      pond_id: string | null
      batch_id: string
      alert_type: string
      severity: string
      message: string
    }> = []

    if (data.oxygen_mg_l !== null && data.oxygen_mg_l < 4) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'low_oxygen',
        severity: data.oxygen_mg_l < 2 ? 'critical' : 'warning',
        message: `Oxigeno bajo detectado: ${data.oxygen_mg_l} mg/L (minimo recomendado: 4 mg/L)`,
      })
    }

    if (data.ammonia_mg_l !== null && data.ammonia_mg_l > 0.5) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_ammonia',
        severity: data.ammonia_mg_l > 1.5 ? 'critical' : 'warning',
        message: `Amonio elevado: ${data.ammonia_mg_l} mg/L (maximo recomendado: 0.5 mg/L)`,
      })
    }

    if (data.mortality_count !== null && data.mortality_count > 10) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_mortality',
        severity: data.mortality_count > 50 ? 'critical' : 'warning',
        message: `Mortalidad elevada: ${data.mortality_count} individuos en un dia`,
      })
    }

    if (calculated_fca !== null && calculated_fca > 2.5) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_fca',
        severity: 'warning',
        message: `FCA elevado: ${calculated_fca.toFixed(2)} (objetivo: < 1.8)`,
      })
    }

    if (alerts.length > 0) {
      await supabase.from('alerts').insert(alerts)
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/records')
  revalidatePath('/dashboard/analytics')
}
