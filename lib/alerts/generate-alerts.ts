import type { WaterQualityReading, AlertPayload } from './types'
import {
  checkLowOxygen,
  checkHighAmmonia,
  checkHighPh,
  checkLowPh,
  checkHighTemperature,
  checkLowTemperature,
  checkHighNitrite,
  checkHighNitrate,
  checkLowHardness,
  checkHighHardness,
  checkLowAlkalinity,
  checkHighAlkalinity,
  checkHighPhosphate,
  checkHighMortality,
  checkHighFca,
  checkPhAmmoniaCombination,
  checkNitritePhCombination,
} from './rules'

export function generateAlerts(
  reading: WaterQualityReading,
  orgId: string,
): AlertPayload[] {
  const rules = [
    checkLowOxygen,
    checkHighAmmonia,
    checkHighPh,
    checkLowPh,
    checkHighTemperature,
    checkLowTemperature,
    checkHighNitrite,
    checkHighNitrate,
    checkLowHardness,
    checkHighHardness,
    checkLowAlkalinity,
    checkHighAlkalinity,
    checkHighPhosphate,
    checkHighMortality,
    checkHighFca,
    checkPhAmmoniaCombination,
    checkNitritePhCombination,
  ]

  return rules
    .map((rule) => rule(reading, orgId))
    .filter((alert): alert is AlertPayload => alert !== null)
}
