import { api } from '@/lib/api/client'

export interface ClientPayload {
  fullName: string
  phone?: string
  email?: string
  companyName?: string
  address?: string
  assignedAdvisorId?: string
  notes?: string
}

export interface ClientListItem {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  companyName: string | null
  address: string | null
  assignedAdvisorId: string | null
  status: 'active' | 'inactive' | string
  notes: string | null
  createdAt: string
  updatedAt: string
  farms?: Array<{
    id: string
    name: string
    speciesType: 'poultry' | 'swine' | string
    capacity?: number | null
  }>
  _count?: {
    farms: number
    cases: number
    visits: number
  }
}

export interface ClientDetail extends ClientListItem {
  farms: Array<{
    id: string
    name: string
    speciesType: 'poultry' | 'swine' | string
    location?: string | null
    capacity?: number | null
    assignedAdvisorId?: string | null
    createdAt: string
  }>
  cases: Array<{
    id: string
    caseNumber: number
    title: string
    status: string
    severity: string
    createdAt: string
  }>
  visits?: Array<{
    id: string
    visitDate: string
    advisorId: string
    observations?: string | null
  }>
}

export interface ClientListResponse {
  items: ClientListItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ClientSummary {
  client: {
    id: string
    fullName: string
    companyName: string | null
    status: string
  }
  metrics: {
    farms: number
    openCases: number
    totalCases: number
    totalVisits: number
  }
  speciesBreakdown: Array<{
    speciesType: string
    count: number
  }>
  lastVisit: {
    visitDate: string
    advisorId: string
    farmId: string
  } | null
}

export interface ListClientsParams {
  page?: number
  limit?: number
  status?: string
  advisorId?: string
  speciesType?: string
  search?: string
}

function buildQuery(params: ListClientsParams = {}) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    search.set(key, String(value))
  })

  const query = search.toString()
  return query ? `?${query}` : ''
}

export function getClientStatusLabel(status: string) {
  return status === 'inactive' ? 'Inactivo' : 'Activo'
}

export function getSpeciesLabel(speciesType: string) {
  if (speciesType === 'swine') return 'Porcino'
  if (speciesType === 'poultry') return 'Avícola'
  return speciesType
}

export async function listClients(params: ListClientsParams = {}) {
  return api.get<ClientListResponse>(`/clients${buildQuery(params)}`)
}

export async function getClient(id: string) {
  return api.get<ClientDetail>(`/clients/${id}`)
}

export async function getClientSummary(id: string) {
  return api.get<ClientSummary>(`/clients/${id}/summary`)
}

export async function createClientRecord(payload: ClientPayload) {
  return api.post<ClientDetail>('/clients', payload)
}

export async function updateClientRecord(id: string, payload: ClientPayload) {
  return api.put<ClientDetail>(`/clients/${id}`, payload)
}

export async function archiveClientRecord(id: string) {
  return api.delete<{ id: string; status: string }>(`/clients/${id}`)
}
