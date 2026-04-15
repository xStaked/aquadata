/**
 * Output port: what the application NEEDS from a production record store.
 * Technology-agnostic - no Supabase types, no Next.js types.
 */

import type { Result } from '@/domain/types/result'
import type { ProductionRecordInput, ProductionRecordUpdateInput } from '@/domain/types/record.types'
import type { ProductionRecord } from '@/db/types'

export interface ProductionRecordRepositoryPort {
  /**
   * Create a new production record
   */
  create(input: ProductionRecordInput): Promise<Result<ProductionRecord>>

  /**
   * Update an existing record with ownership verification
   */
  update(id: string, input: ProductionRecordUpdateInput, orgId: string): Promise<Result<ProductionRecord>>

  /**
   * Get all records for a batch
   */
  findByBatch(batchId: string): Promise<Result<ProductionRecord[]>>

  /**
   * Get all records for an organization (with batch + pond join)
   */
  findByOrg(orgId: string): Promise<Result<ProductionRecord[]>>

  /**
   * Get the latest record for a batch
   */
  latestByBatch(batchId: string): Promise<Result<ProductionRecord | null>>
}
