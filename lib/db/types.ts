/**
 * Shared TypeScript types for domain entities.
 * Mirrors the database schema defined in scripts/*.sql
 */

// ── Organizations ─────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  default_fca: number | null
  custom_fish_prices: Record<string, number>
  authorized_whatsapp_phones: string[]
  created_at: string
}

// ── Profiles ──────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  whatsapp_phone?: string | null
  phone?: string | null
  role: string
  organization_id: string | null
  created_at: string
}

// ── Ponds ─────────────────────────────────────────────────────

export type PondStatus = 'active' | 'inactive' | 'maintenance'

export interface Pond {
  id: string
  organization_id: string
  name: string
  area_m2: number | null
  depth_m: number | null
  species: string | null
  status: PondStatus
  sort_order: number
  created_at: string
}

// ── Batches ───────────────────────────────────────────────────

export type BatchStatus = 'active' | 'closed'

export interface Batch {
  id: string
  pond_id: string
  start_date: string
  end_date: string | null
  initial_population: number
  current_population: number | null
  status: BatchStatus
  sale_price_per_kg: number | null
  target_profitability_pct: number | null
  fingerling_cost_per_unit: number | null
  avg_weight_at_seeding_g: number | null
  labor_cost_per_month: number | null
  created_at: string
}

export interface BatchWithPond extends Batch {
  pond: Pond
}

// ── Production Records ────────────────────────────────────────

export type FcaSource = 'calculated' | 'default'
export type ReportType = 'daily' | 'weekly'

export interface ProductionRecord {
  id: string
  batch_id: string
  upload_id: string | null
  record_date: string
  report_type: ReportType | null
  week_end_date: string | null
  feed_kg: number | null
  avg_weight_g: number | null
  avg_weight_kg: number | null
  fish_count: number | null
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
  calculated_fca: number | null
  effective_fca: number | null
  fca_source: FcaSource | null
  calculated_biomass_kg: number | null
  notes: string | null
  confirmed_by: string | null
  created_at: string
}

export interface ProductionRecordWithBatch extends ProductionRecord {
  batch: Batch & {
    pond: Pond
  }
}

// ── Alerts ────────────────────────────────────────────────────

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
  | string

export type AlertSeverity = 'warning' | 'critical'

export interface Alert {
  id: string
  organization_id: string
  pond_id: string | null
  batch_id: string | null
  alert_type: AlertType
  severity: AlertSeverity
  message: string
  is_read: boolean
  created_at: string
}

// ── Uploads ───────────────────────────────────────────────────

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Upload {
  id: string
  batch_id: string | null
  user_id: string
  image_url: string
  raw_ocr_text: string | null
  processed_data: Record<string, unknown> | null
  status: UploadStatus
  created_at: string
}

// ── Bioremediation Calcs ──────────────────────────────────────

export interface BioremediationCalc {
  id: string
  user_id: string
  pond_length: number
  pond_width: number
  pond_depth: number
  volume_m3: number
  bioremediation_dose: number | null
  notes: string | null
  created_at: string
}

// ── Org context ───────────────────────────────────────────────

export interface OrgContext {
  userId: string
  orgId: string
  user: { id: string; email?: string }
}
