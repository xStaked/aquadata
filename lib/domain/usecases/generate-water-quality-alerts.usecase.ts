/**
 * Use case: Generate Water Quality Alerts.
 * Pure domain service that runs all rule checkers against a reading.
 */

import type { Result } from '@/domain/types/result'
import { success, failure } from '@/domain/types/result'
import type { GenerateWaterQualityAlerts, GenerateWaterQualityAlertsInput } from '@/domain/ports/input/generate-water-quality-alerts.port'
import type { AlertPayload } from '@/alerts/types'
import { generateAlerts } from '@/lib/alerts'

export class GenerateWaterQualityAlertsUseCase implements GenerateWaterQualityAlerts {
  async execute(input: GenerateWaterQualityAlertsInput): Promise<Result<AlertPayload[]>> {
    try {
      const alerts = generateAlerts(input.reading, input.orgId)
      return success(alerts)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al generar alertas de calidad de agua',
        'GENERATE_ALERTS_FAILED',
      )
    }
  }
}
