/**
 * Input port: Create Production Record use case.
 * This is what the APPLICATION DOES - a use case, not a CRUD operation.
 */

import type { Result } from '@/domain/types/result'
import type { ProductionRecordInput } from '@/domain/types/record.types'

export interface CreateProductionRecordInput extends ProductionRecordInput {
  orgId: string
  userId: string
}

export interface CreateProductionRecord {
  /**
   * Execute the create production record use case:
   * 1. Validate input
   * 2. Calculate FCA and biomass
   * 3. Resolve effective FCA (calculated or default)
   * 4. Update batch population if mortality
   * 5. Create the record
   * 6. Generate water quality alerts
   * 7. Return result
   */
  execute(input: CreateProductionRecordInput): Promise<Result<void>>
}
