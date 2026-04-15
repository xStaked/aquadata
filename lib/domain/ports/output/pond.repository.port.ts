/**
 * Output port: what the application NEEDS from a pond data store.
 */

import type { Result } from '@/domain/types/result'
import type { Pond, PondInput } from '@/db/types'

export interface PondRepositoryPort {
  /**
   * Get all ponds for an organization (ordered by sort_order)
   */
  findByOrg(orgId: string): Promise<Result<Pond[]>>

  /**
   * Get a single pond (optionally with ownership verification)
   */
  findById(pondId: string, orgId?: string): Promise<Result<Pond | null>>

  /**
   * Create a new pond
   */
  create(input: PondInput): Promise<Result<Pond>>

  /**
   * Delete a pond with ownership check
   */
  delete(pondId: string, orgId: string): Promise<Result<void>>

  /**
   * Bulk update pond ordering with ownership validation
   */
  updateOrder(pondIds: string[], orgId: string): Promise<Result<void>>

  /**
   * Get the next sort order for an organization
   */
  nextSortOrder(orgId: string): Promise<Result<number>>
}
