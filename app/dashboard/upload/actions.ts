'use server'

import { createClient } from '@/lib/supabase/server'
import { type FcaSource, calculateCalculatedFca, resolveEffectiveFca } from '@/lib/fca'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Get batch info for mortality update
  const { data: batch } = await supabase
    .from('batches')
    .select('current_population, initial_population')
    .eq('id', data.batch_id)
    .single()

  const resolvedFishCount =
    data.fish_count ?? batch?.current_population ?? batch?.initial_population ?? null

  const { calculated_fca, calculated_biomass_kg } = calculateCalculatedFca({
    ...data,
    fish_count: resolvedFishCount,
  })

  // Update mortality in batch
  if (data.mortality_count && data.mortality_count > 0 && batch) {
    const newPop = (batch.current_population ?? batch.initial_population) - data.mortality_count
    await supabase
      .from('batches')
      .update({ current_population: Math.max(0, newPop) })
      .eq('id', data.batch_id)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

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

  const { error } = await supabase.from('production_records').insert({
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
    confirmed_by: user.id,
  })

  if (error) throw new Error(error.message)

  // Generate alerts for critical values
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

    // Oxígeno bajo (ideal: 4-6 mg/L)
    if (data.oxygen_mg_l !== null && data.oxygen_mg_l < 4) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'low_oxygen',
        severity: data.oxygen_mg_l <= 2 ? 'critical' : 'warning',
        message: data.oxygen_mg_l <= 2
          ? `Oxigeno critico: ${data.oxygen_mg_l} mg/L — riesgo de mortalidad inmediata`
          : `Oxigeno bajo: ${data.oxygen_mg_l} mg/L (ideal: 4-6 mg/L)`,
      })
    }

    // Amonio alto (ideal: 0-0.5 mg/L)
    if (data.ammonia_mg_l !== null && data.ammonia_mg_l > 0.5) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_ammonia',
        severity: data.ammonia_mg_l > 1 ? 'critical' : 'warning',
        message: data.ammonia_mg_l > 1
          ? `Amonio critico: ${data.ammonia_mg_l} mg/L — nivel toxico (ideal: 0-0.5 mg/L)`
          : `Amonio elevado: ${data.ammonia_mg_l} mg/L (ideal: 0-0.5 mg/L)`,
      })
    }

    // pH alto (ideal: 6.5-7.5)
    if (data.ph !== null && data.ph > 7.5) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_ph',
        severity: data.ph > 8.5 ? 'critical' : 'warning',
        message: data.ph > 8.5
          ? `pH critico: ${data.ph} — nivel letal para los peces`
          : `pH elevado: ${data.ph} (ideal: 6.5-7.5)`,
      })
    }

    // pH bajo (ideal: 6.5-7.5)
    if (data.ph !== null && data.ph < 6.5) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'low_ph',
        severity: data.ph < 6 ? 'critical' : 'warning',
        message: data.ph < 6
          ? `pH critico: ${data.ph} — nivel letal para los peces`
          : `pH bajo: ${data.ph} (ideal: 6.5-7.5)`,
      })
    }

    // Temperatura alta
    if (data.temperature_c !== null && data.temperature_c > 31) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_temperature',
        severity: data.temperature_c >= 32 ? 'critical' : 'warning',
        message: data.temperature_c >= 32
          ? `Temperatura critica: ${data.temperature_c} °C — riesgo de mortalidad`
          : `Temperatura elevada: ${data.temperature_c} °C (maximo recomendado: 31 °C)`,
      })
    }

    // Temperatura baja
    if (data.temperature_c !== null && data.temperature_c < 25) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'low_temperature',
        severity: 'warning',
        message: `Temperatura baja: ${data.temperature_c} °C (minimo recomendado: 25 °C)`,
      })
    }

    // Nitritos altos (ideal: 0-0.5 mg/L)
    if (data.nitrite_mg_l !== null && data.nitrite_mg_l > 0.5) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_nitrite',
        severity: data.nitrite_mg_l > 1 ? 'critical' : 'warning',
        message: data.nitrite_mg_l > 1
          ? `Nitrito critico: ${data.nitrite_mg_l} mg/L — nivel toxico (ideal: 0-0.5 mg/L)`
          : `Nitrito elevado: ${data.nitrite_mg_l} mg/L (ideal: 0-0.5 mg/L)`,
      })
    }

    // Nitratos altos (maximo: 40 mg/L)
    if (data.nitrate_mg_l !== null && data.nitrate_mg_l > 40) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_nitrate',
        severity: data.nitrate_mg_l > 80 ? 'critical' : 'warning',
        message: data.nitrate_mg_l > 80
          ? `Nitrato critico: ${data.nitrate_mg_l} mg/L — nivel peligroso (maximo: 40 mg/L)`
          : `Nitrato elevado: ${data.nitrate_mg_l} mg/L (maximo: 40 mg/L)`,
      })
    }

    // Dureza baja/alta (ideal: ~150 mg/L)
    if (data.hardness_mg_l !== null && data.hardness_mg_l < 100) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'low_hardness',
        severity: 'warning',
        message: `Dureza baja: ${data.hardness_mg_l} mg/L (ideal: ~150 mg/L)`,
      })
    }

    // Dureza alta
    if (data.hardness_mg_l !== null && data.hardness_mg_l > 200) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_hardness',
        severity: 'warning',
        message: `Dureza elevada: ${data.hardness_mg_l} mg/L (ideal: ~150 mg/L)`,
      })
    }

    // Alcalinidad baja (ideal: 100-150 mg/L)
    if (data.alkalinity_mg_l !== null && data.alkalinity_mg_l < 100) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'low_alkalinity',
        severity: 'warning',
        message: `Alcalinidad baja: ${data.alkalinity_mg_l} mg/L (ideal: 100-150 mg/L)`,
      })
    }

    // Alcalinidad alta
    if (data.alkalinity_mg_l !== null && data.alkalinity_mg_l > 150) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_alkalinity',
        severity: 'warning',
        message: `Alcalinidad elevada: ${data.alkalinity_mg_l} mg/L (ideal: 100-150 mg/L)`,
      })
    }

    // Fosfatos altos (ideal: 0-0.5 mg/L)
    if (data.phosphate_mg_l !== null && data.phosphate_mg_l > 0.5) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_phosphate',
        severity: data.phosphate_mg_l > 1 ? 'critical' : 'warning',
        message: data.phosphate_mg_l > 1
          ? `Fosfato critico: ${data.phosphate_mg_l} mg/L (ideal: 0-0.5 mg/L)`
          : `Fosfato elevado: ${data.phosphate_mg_l} mg/L (ideal: 0-0.5 mg/L)`,
      })
    }

    // Combinación pH > 7.5 + Amonio > 0.5 → mortalidad inmediata
    if (data.ph !== null && data.ph > 7.5 && data.ammonia_mg_l !== null && data.ammonia_mg_l > 0.5) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'ph_ammonia_mortality',
        severity: 'critical',
        message: `Combinacion letal: pH ${data.ph} + Amonio ${data.ammonia_mg_l} mg/L — riesgo de mortalidad inmediata`,
      })
    }

    // Combinación Nitrito > 1 + pH > 7.5 → mortalidad
    if (data.nitrite_mg_l !== null && data.nitrite_mg_l > 1 && data.ph !== null && data.ph > 7.5) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'nitrite_ph_mortality',
        severity: 'critical',
        message: `Combinacion critica: Nitrito ${data.nitrite_mg_l} mg/L + pH ${data.ph} — riesgo de mortalidad`,
      })
    }

    // Mortalidad alta
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

    // FCA elevado
    if (effective_fca !== null && effective_fca > 2.5) {
      alerts.push({
        organization_id: profile.organization_id,
        pond_id: batchInfo?.pond_id ?? null,
        batch_id: data.batch_id,
        alert_type: 'high_fca',
        severity: 'warning',
        message: `FCA elevado: ${effective_fca.toFixed(2)} (objetivo: < 1.8)`,
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
