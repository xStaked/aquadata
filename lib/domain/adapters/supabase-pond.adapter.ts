/**
 * Supabase adapter implementing the PondRepositoryPort.
 */

import type { Result } from '@/domain/types/result'
import { success, failure } from '@/domain/types/result'
import type { PondRepositoryPort } from '@/domain/ports/output/pond.repository.port'
import type { Pond, PondInput } from '@/db/types'
import {
  getPondsByOrg,
  getPond,
  createPond,
  deletePond,
  updatePondOrder,
  getNextSortOrder,
} from '@/lib/db'

export class SupabasePondRepository implements PondRepositoryPort {
  async findByOrg(orgId: string): Promise<Result<Pond[]>> {
    try {
      const ponds = await getPondsByOrg(orgId)
      return success(ponds as unknown as Pond[])
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar estanques',
        'FIND_BY_ORG_FAILED',
      )
    }
  }

  async findById(pondId: string, orgId?: string): Promise<Result<Pond | null>> {
    try {
      const pond = await getPond(pondId, orgId)
      return success((pond ?? null) as unknown as Pond | null)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar estanque',
        'FIND_BY_ID_FAILED',
      )
    }
  }

  async create(input: PondInput): Promise<Result<Pond>> {
    try {
      await createPond(input)
      return success({} as Pond)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al crear estanque',
        'CREATE_FAILED',
      )
    }
  }

  async delete(pondId: string, orgId: string): Promise<Result<void>> {
    try {
      await deletePond(pondId, orgId)
      return success(undefined)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al eliminar estanque',
        'DELETE_FAILED',
      )
    }
  }

  async updateOrder(pondIds: string[], orgId: string): Promise<Result<void>> {
    try {
      await updatePondOrder(pondIds, orgId)
      return success(undefined)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al reordenar estanques',
        'UPDATE_ORDER_FAILED',
      )
    }
  }

  async nextSortOrder(orgId: string): Promise<Result<number>> {
    try {
      const order = await getNextSortOrder(orgId)
      return success(order)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al obtener orden',
        'NEXT_SORT_ORDER_FAILED',
      )
    }
  }
}
