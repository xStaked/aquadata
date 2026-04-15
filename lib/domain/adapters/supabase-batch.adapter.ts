/**
 * Supabase adapter implementing the BatchRepositoryPort.
 */

import type { Result } from '@/domain/types/result'
import { success, failure } from '@/domain/types/result'
import type { BatchRepositoryPort } from '@/domain/ports/output/batch.repository.port'
import type { Batch, BatchWithPond, BatchInput, BatchFinancialUpdate } from '@/db/types'
import {
  getBatch,
  getBatchWithPond,
  getBatchesByPond,
  getActiveBatchesByOrg,
  createBatch,
  updateBatchPopulation,
  closeBatch,
  updateBatchFinancial,
} from '@/lib/db'

export class SupabaseBatchRepository implements BatchRepositoryPort {
  async findById(batchId: string): Promise<Result<Batch | null>> {
    try {
      const batch = await getBatch(batchId)
      return success((batch ?? null) as unknown as Batch | null)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar lote',
        'FIND_BY_ID_FAILED',
      )
    }
  }

  async findByIdWithPond(batchId: string): Promise<Result<BatchWithPond | null>> {
    try {
      const batch = await getBatchWithPond(batchId)
      return success((batch ?? null) as unknown as BatchWithPond | null)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar lote',
        'FIND_WITH_POND_FAILED',
      )
    }
  }

  async findByPond(pondId: string): Promise<Result<Batch[]>> {
    try {
      const batches = await getBatchesByPond(pondId)
      return success(batches as unknown as Batch[])
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar lotes del estanque',
        'FIND_BY_POND_FAILED',
      )
    }
  }

  async findActiveByOrg(orgId: string): Promise<Result<Batch[]>> {
    try {
      const batches = await getActiveBatchesByOrg(orgId)
      return success(batches as unknown as Batch[])
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar lotes activos',
        'FIND_ACTIVE_FAILED',
      )
    }
  }

  async create(input: BatchInput): Promise<Result<Batch>> {
    try {
      await createBatch(input)
      return success({} as Batch)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al crear lote',
        'CREATE_FAILED',
      )
    }
  }

  async updatePopulation(batchId: string, newPopulation: number): Promise<Result<void>> {
    try {
      await updateBatchPopulation(batchId, newPopulation)
      return success(undefined)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al actualizar población',
        'UPDATE_POPULATION_FAILED',
      )
    }
  }

  async close(batchId: string): Promise<Result<void>> {
    try {
      await closeBatch(batchId)
      return success(undefined)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al cerrar lote',
        'CLOSE_FAILED',
      )
    }
  }

  async updateFinancial(batchId: string, data: BatchFinancialUpdate): Promise<Result<void>> {
    try {
      await updateBatchFinancial(batchId, data)
      return success(undefined)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al actualizar parámetros financieros',
        'UPDATE_FINANCIAL_FAILED',
      )
    }
  }
}
