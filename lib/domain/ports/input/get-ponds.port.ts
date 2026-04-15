/**
 * Input port: Get Ponds for Organization query.
 */

import type { Result } from '@/domain/types/result'
import type { Pond } from '@/db/types'

export interface GetPondsInput {
  orgId: string
}

export interface GetPonds {
  /**
   * Execute the get ponds query:
   * 1. Verify org exists
   * 2. Fetch ponds ordered by sort_order
   * 3. Return result
   */
  execute(input: GetPondsInput): Promise<Result<Pond[]>>
}
