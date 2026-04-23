import { differenceInDays } from 'date-fns'
import type { ProductionRecord } from '@/db/types'

/**
 * Calculate daily weight gain (ADG) in grams/day by comparing the current
 * average weight with the previous record of the same batch.
 */
export function calculateDailyGainG(
  currentAvgWeightG: number | null,
  currentRecordDate: string,
  previousRecord: Pick<ProductionRecord, 'avg_weight_kg' | 'record_date'> | null
): number | null {
  if (currentAvgWeightG == null) return null
  if (previousRecord == null || previousRecord.avg_weight_kg == null) return null

  const daysDiff = differenceInDays(
    new Date(currentRecordDate),
    new Date(previousRecord.record_date)
  )

  if (daysDiff <= 0) return null

  const previousWeightG = previousRecord.avg_weight_kg * 1000
  const weightDiffG = currentAvgWeightG - previousWeightG

  return weightDiffG / daysDiff
}
