export interface PondInput {
  organization_id: string
  name: string
  area_m2?: number | null
  depth_m?: number | null
  species?: string | null
  status: 'active' | 'inactive' | 'maintenance'
  sort_order: number
}

export interface PondSortUpdate {
  pondIds: string[]
  orgId: string
}

export type PondStatus = 'active' | 'inactive' | 'maintenance'
