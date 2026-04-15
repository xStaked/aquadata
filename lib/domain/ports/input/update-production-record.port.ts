/**
 * Input port: Update Production Record use case.
 */

import type { Result } from '@/domain/types/result'
import type { ProductionRecordUpdateInput } from '@/domain/types/record.types'

export interface UpdateProductionRecordInput extends ProductionRecordUpdateInput {
  orgId: string
  userId: string
}

export interface UpdateProductionRecord {
  /**
   * Execute the update production record use case:
   * 1. Validate record ownership
   * 2. Calculate derived FCA/biomass
   * 3. Resolve effective FCA
   * 4. Update batch population if mortality changed
   * 5. Update the record
   * 6. Return result
   */
  execute(input: UpdateProductionRecordInput): Promise<Result<void>>
}
