/**
 * Supabase adapter implementing the ProductionRecordRepositoryPort.
 * This is the infrastructure layer that bridges ports to Supabase.
 */

import type { Result } from '@/domain/types/result'
import { success, failure } from '@/domain/types/result'
import type { ProductionRecordRepositoryPort } from '@/domain/ports/output/production-record.repository.port'
import type { ProductionRecordInput, ProductionRecordUpdateInput } from '@/domain/types/record.types'
import type { ProductionRecord } from '@/db/types'
import { createRecord as dbCreateRecord, updateRecord as dbUpdateRecord, getRecordsByBatch, getRecordsByOrg, getLatestRecordByBatch } from '@/lib/db'

export class SupabaseProductionRecordRepository implements ProductionRecordRepositoryPort {
  async create(input: ProductionRecordInput): Promise<Result<ProductionRecord>> {
    try {
      const recordId = await dbCreateRecord({
        ...input,
        mortality_count: input.mortality_count ?? undefined,
      })
      return success({ id: recordId } as ProductionRecord)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al crear el registro de producción',
        'CREATE_RECORD_FAILED',
      )
    }
  }

  async update(id: string, input: ProductionRecordUpdateInput, orgId: string): Promise<Result<ProductionRecord>> {
    try {
      const { id: _, ...updateData } = input
      await dbUpdateRecord(id, updateData as Parameters<typeof dbUpdateRecord>[1], orgId)
      return success({} as ProductionRecord)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al actualizar el registro de producción',
        'UPDATE_RECORD_FAILED',
      )
    }
  }

  async findByBatch(batchId: string): Promise<Result<ProductionRecord[]>> {
    try {
      const records = await getRecordsByBatch(batchId)
      return success(records as unknown as ProductionRecord[])
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar registros del lote',
        'FIND_BY_BATCH_FAILED',
      )
    }
  }

  async findByOrg(orgId: string): Promise<Result<ProductionRecord[]>> {
    try {
      const records = await getRecordsByOrg(orgId)
      return success(records as unknown as ProductionRecord[])
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar registros de la organización',
        'FIND_BY_ORG_FAILED',
      )
    }
  }

  async latestByBatch(batchId: string): Promise<Result<ProductionRecord | null>> {
    try {
      const record = await getLatestRecordByBatch(batchId)
      return success((record ?? null) as unknown as ProductionRecord | null)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar el último registro',
        'LATEST_BY_BATCH_FAILED',
      )
    }
  }
}
