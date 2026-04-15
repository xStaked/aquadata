export interface BatchInput {
  pond_id: string
  start_date: string
  initial_population: number
  current_population: number
  status: 'active' | 'closed'
  end_date?: string
  sale_price_per_kg?: number | null
  target_profitability_pct?: number
  fingerling_cost_per_unit?: number
  avg_weight_at_seeding_g?: number | null
  labor_cost_per_month?: number
}

export interface BatchFinancialUpdate {
  sale_price_per_kg?: number | null
  target_profitability_pct?: number
  fingerling_cost_per_unit?: number
  avg_weight_at_seeding_g?: number | null
  labor_cost_per_month?: number
}

export interface BatchWithPondInfo {
  id: string
  pond_id: string
  pond_name: string
  start_date: string
  end_date: string | null
  initial_population: number
  current_population: number
  status: 'active' | 'closed'
  sale_price_per_kg: number | null
  species: string | null
}
