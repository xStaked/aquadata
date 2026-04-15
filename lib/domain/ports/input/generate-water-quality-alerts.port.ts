/**
 * Input port: Generate Water Quality Alerts use case.
 * Pure domain service - takes a reading, returns alerts.
 */

import type { Result } from '@/domain/types/result'
import type { WaterQualityReading, AlertPayload } from '@/alerts/types'

export interface GenerateWaterQualityAlertsInput {
  reading: WaterQualityReading
  orgId: string
}

export interface GenerateWaterQualityAlerts {
  /**
   * Execute the alert generation use case:
   * 1. Run all water quality rule checkers
   * 2. Filter triggered alerts
   * 3. Return alert payloads ready for persistence
   */
  execute(input: GenerateWaterQualityAlertsInput): Promise<Result<AlertPayload[]>>
}
