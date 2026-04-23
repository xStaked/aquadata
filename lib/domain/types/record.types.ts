import type { FcaSource } from '@/db/types'

export interface ProductionRecordInput {
  batch_id: string
  record_date: string
  report_type: 'daily' | 'weekly'
  week_end_date: string | null
  fish_count: number | null
  feed_kg: number | null
  avg_weight_g: number | null
  biomass_kg: number | null
  sampling_weight_g: number | null
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
  turbidity_ntu: number | null
  notes: string | null
  fca_source: FcaSource
  confirmed_by?: string
}

export interface ProductionRecordUpdateInput extends Partial<ProductionRecordInput> {
  id: string
}

export interface WaterQualityThresholds {
  oxygen: { min: number; critical: number }
  ammonia: { max: number; critical: number }
  ph: { min: number; max: number; critical_low: number; critical_high: number }
  temperature: { min: number; max: number; critical_high: number }
  nitrite: { max: number; critical: number }
  nitrate: { max: number; critical: number }
  hardness: { min: number; max: number }
  alkalinity: { min: number; max: number }
  phosphate: { max: number; critical: number }
  mortality: { warning: number; critical: number }
  fca: { max: number }
}

export const DEFAULT_THRESHOLDS: WaterQualityThresholds = {
  oxygen: { min: 4, critical: 2 },
  ammonia: { max: 0.5, critical: 1 },
  ph: { min: 6.5, max: 7.5, critical_low: 6, critical_high: 8.5 },
  temperature: { min: 25, max: 31, critical_high: 32 },
  nitrite: { max: 0.5, critical: 1 },
  nitrate: { max: 40, critical: 80 },
  hardness: { min: 100, max: 200 },
  alkalinity: { min: 100, max: 150 },
  phosphate: { max: 0.5, critical: 1 },
  mortality: { warning: 10, critical: 50 },
  fca: { max: 2.5 },
}
