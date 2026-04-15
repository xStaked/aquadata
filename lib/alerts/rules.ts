import type { WaterQualityReading, AlertPayload } from './types'

function alert(
  reading: WaterQualityReading,
  orgId: string,
  type: AlertPayload['alert_type'],
  severity: AlertPayload['severity'],
  message: string,
): AlertPayload {
  return {
    organization_id: orgId,
    pond_id: reading.pond_id,
    batch_id: reading.batch_id,
    alert_type: type,
    severity,
    message,
  }
}

export function checkLowOxygen(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.oxygen_mg_l === null || reading.oxygen_mg_l >= 4) return null
  const isCritical = reading.oxygen_mg_l <= 2
  return alert(
    reading, orgId, 'low_oxygen',
    isCritical ? 'critical' : 'warning',
    isCritical
      ? `Oxigeno critico: ${reading.oxygen_mg_l} mg/L — riesgo de mortalidad inmediata`
      : `Oxigeno bajo: ${reading.oxygen_mg_l} mg/L (ideal: 4-6 mg/L)`,
  )
}

export function checkHighAmmonia(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.ammonia_mg_l === null || reading.ammonia_mg_l <= 0.5) return null
  const isCritical = reading.ammonia_mg_l > 1
  return alert(
    reading, orgId, 'high_ammonia',
    isCritical ? 'critical' : 'warning',
    isCritical
      ? `Amonio critico: ${reading.ammonia_mg_l} mg/L — nivel toxico (ideal: 0-0.5 mg/L)`
      : `Amonio elevado: ${reading.ammonia_mg_l} mg/L (ideal: 0-0.5 mg/L)`,
  )
}

export function checkHighPh(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.ph === null || reading.ph <= 7.5) return null
  const isCritical = reading.ph > 8.5
  return alert(
    reading, orgId, 'high_ph',
    isCritical ? 'critical' : 'warning',
    isCritical
      ? `pH critico: ${reading.ph} — nivel letal para los peces`
      : `pH elevado: ${reading.ph} (ideal: 6.5-7.5)`,
  )
}

export function checkLowPh(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.ph === null || reading.ph >= 6.5) return null
  const isCritical = reading.ph < 6
  return alert(
    reading, orgId, 'low_ph',
    isCritical ? 'critical' : 'warning',
    isCritical
      ? `pH critico: ${reading.ph} — nivel letal para los peces`
      : `pH bajo: ${reading.ph} (ideal: 6.5-7.5)`,
  )
}

export function checkHighTemperature(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.temperature_c === null || reading.temperature_c <= 31) return null
  const isCritical = reading.temperature_c >= 32
  return alert(
    reading, orgId, 'high_temperature',
    isCritical ? 'critical' : 'warning',
    isCritical
      ? `Temperatura critica: ${reading.temperature_c} °C — riesgo de mortalidad`
      : `Temperatura elevada: ${reading.temperature_c} °C (maximo recomendado: 31 °C)`,
  )
}

export function checkLowTemperature(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.temperature_c === null || reading.temperature_c >= 25) return null
  return alert(
    reading, orgId, 'low_temperature', 'warning',
    `Temperatura baja: ${reading.temperature_c} °C (minimo recomendado: 25 °C)`,
  )
}

export function checkHighNitrite(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.nitrite_mg_l === null || reading.nitrite_mg_l <= 0.5) return null
  const isCritical = reading.nitrite_mg_l > 1
  return alert(
    reading, orgId, 'high_nitrite',
    isCritical ? 'critical' : 'warning',
    isCritical
      ? `Nitrito critico: ${reading.nitrite_mg_l} mg/L — nivel toxico (ideal: 0-0.5 mg/L)`
      : `Nitrito elevado: ${reading.nitrite_mg_l} mg/L (ideal: 0-0.5 mg/L)`,
  )
}

export function checkHighNitrate(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.nitrate_mg_l === null || reading.nitrate_mg_l <= 40) return null
  const isCritical = reading.nitrate_mg_l > 80
  return alert(
    reading, orgId, 'high_nitrate',
    isCritical ? 'critical' : 'warning',
    isCritical
      ? `Nitrato critico: ${reading.nitrate_mg_l} mg/L — nivel peligroso (maximo: 40 mg/L)`
      : `Nitrato elevado: ${reading.nitrate_mg_l} mg/L (maximo: 40 mg/L)`,
  )
}

export function checkLowHardness(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.hardness_mg_l === null || reading.hardness_mg_l >= 100) return null
  return alert(
    reading, orgId, 'low_hardness', 'warning',
    `Dureza baja: ${reading.hardness_mg_l} mg/L (ideal: ~150 mg/L)`,
  )
}

export function checkHighHardness(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.hardness_mg_l === null || reading.hardness_mg_l <= 200) return null
  return alert(
    reading, orgId, 'high_hardness', 'warning',
    `Dureza elevada: ${reading.hardness_mg_l} mg/L (ideal: ~150 mg/L)`,
  )
}

export function checkLowAlkalinity(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.alkalinity_mg_l === null || reading.alkalinity_mg_l >= 100) return null
  return alert(
    reading, orgId, 'low_alkalinity', 'warning',
    `Alcalinidad baja: ${reading.alkalinity_mg_l} mg/L (ideal: 100-150 mg/L)`,
  )
}

export function checkHighAlkalinity(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.alkalinity_mg_l === null || reading.alkalinity_mg_l <= 150) return null
  return alert(
    reading, orgId, 'high_alkalinity', 'warning',
    `Alcalinidad elevada: ${reading.alkalinity_mg_l} mg/L (ideal: 100-150 mg/L)`,
  )
}

export function checkHighPhosphate(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.phosphate_mg_l === null || reading.phosphate_mg_l <= 0.5) return null
  const isCritical = reading.phosphate_mg_l > 1
  return alert(
    reading, orgId, 'high_phosphate',
    isCritical ? 'critical' : 'warning',
    isCritical
      ? `Fosfato critico: ${reading.phosphate_mg_l} mg/L (ideal: 0-0.5 mg/L)`
      : `Fosfato elevado: ${reading.phosphate_mg_l} mg/L (ideal: 0-0.5 mg/L)`,
  )
}

export function checkHighMortality(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.mortality_count === null || reading.mortality_count <= 10) return null
  const isCritical = reading.mortality_count > 50
  return alert(
    reading, orgId, 'high_mortality',
    isCritical ? 'critical' : 'warning',
    `Mortalidad elevada: ${reading.mortality_count} individuos en un dia`,
  )
}

export function checkHighFca(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.effective_fca === null || reading.effective_fca <= 2.5) return null
  return alert(
    reading, orgId, 'high_fca', 'warning',
    `FCA elevado: ${reading.effective_fca.toFixed(2)} (objetivo: < 1.8)`,
  )
}

// Combination rules
export function checkPhAmmoniaCombination(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.ph === null || reading.ph <= 7.5) return null
  if (reading.ammonia_mg_l === null || reading.ammonia_mg_l <= 0.5) return null
  return alert(
    reading, orgId, 'ph_ammonia_mortality', 'critical',
    `Combinacion letal: pH ${reading.ph} + Amonio ${reading.ammonia_mg_l} mg/L — riesgo de mortalidad inmediata`,
  )
}

export function checkNitritePhCombination(reading: WaterQualityReading, orgId: string): AlertPayload | null {
  if (reading.nitrite_mg_l === null || reading.nitrite_mg_l <= 1) return null
  if (reading.ph === null || reading.ph <= 7.5) return null
  return alert(
    reading, orgId, 'nitrite_ph_mortality', 'critical',
    `Combinacion critica: Nitrito ${reading.nitrite_mg_l} mg/L + pH ${reading.ph} — riesgo de mortalidad`,
  )
}
