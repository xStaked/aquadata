export type AlertType =
  | 'low_oxygen'
  | 'high_ammonia'
  | 'high_ph'
  | 'low_ph'
  | 'high_temperature'
  | 'low_temperature'
  | 'high_nitrite'
  | 'high_nitrate'
  | 'low_hardness'
  | 'high_hardness'
  | 'low_alkalinity'
  | 'high_alkalinity'
  | 'high_phosphate'
  | 'ph_ammonia_mortality'
  | 'nitrite_ph_mortality'
  | 'high_mortality'
  | 'high_fca'

export type AlertSeverity = 'warning' | 'critical'

export interface WaterQualityReading {
  batch_id: string
  pond_id: string | null
  record_id?: string
  oxygen_mg_l: number | null
  ammonia_mg_l: number | null
  ph: number | null
  temperature_c: number | null
  nitrite_mg_l: number | null
  nitrate_mg_l: number | null
  hardness_mg_l: number | null
  alkalinity_mg_l: number | null
  phosphate_mg_l: number | null
  mortality_count: number | null
  effective_fca: number | null
}

export interface AlertPayload {
  organization_id: string
  pond_id: string | null
  batch_id: string
  record_id?: string
  alert_type: AlertType
  severity: AlertSeverity
  message: string
}
