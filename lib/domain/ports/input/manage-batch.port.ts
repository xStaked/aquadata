/**
 * Input port: Manage Batch use case (create, close, update financial).
 */

import type { Result } from '@/domain/types/result'
import type { Batch, BatchFinancialUpdate } from '@/db/types'

export interface CreateBatchInput {
  pond_id: string
  start_date: string
  initial_population: number
  orgId: string
}

export interface CloseBatchInput {
  batchId: string
  orgId: string
}

export interface UpdateBatchFinancialInput {
  batchId: string
  data: BatchFinancialUpdate
  orgId: string
}

export interface ManageBatch {
  /**
   * Create a new batch in a pond belonging to the org
   */
  create(input: CreateBatchInput): Promise<Result<Batch>>

  /**
   * Close a batch (end the production cycle)
   */
  close(input: CloseBatchInput): Promise<Result<void>>

  /**
   * Update batch financial parameters
   */
  updateFinancial(input: UpdateBatchFinancialInput): Promise<Result<void>>
}
