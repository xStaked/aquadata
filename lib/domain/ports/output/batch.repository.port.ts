/**
 * Output port: what the application NEEDS from a batch data store.
 */

import type { Result } from '@/domain/types/result'
import type { Batch, BatchWithPond, BatchInput, BatchFinancialUpdate } from '@/db/types'

export interface BatchRepositoryPort {
  /**
   * Get a single batch by ID
   */
  findById(batchId: string): Promise<Result<Batch | null>>

  /**
   * Get batch with pond info joined
   */
  findByIdWithPond(batchId: string): Promise<Result<BatchWithPond | null>>

  /**
   * Get all batches for a pond
   */
  findByPond(pondId: string): Promise<Result<Batch[]>>

  /**
   * Get all active batches for an organization
   */
  findActiveByOrg(orgId: string): Promise<Result<Batch[]>>

  /**
   * Create a new batch
   */
  create(input: BatchInput): Promise<Result<Batch>>

  /**
   * Update batch population (e.g., after mortality)
   */
  updatePopulation(batchId: string, newPopulation: number): Promise<Result<void>>

  /**
   * Close a batch (set status to closed, end_date to now)
   */
  close(batchId: string): Promise<Result<void>>

  /**
   * Update batch financial parameters
   */
  updateFinancial(batchId: string, data: BatchFinancialUpdate): Promise<Result<void>>
}
