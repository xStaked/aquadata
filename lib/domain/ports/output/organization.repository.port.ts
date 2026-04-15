/**
 * Output port: what the application NEEDS from an organization data store.
 */

import type { Result } from '@/domain/types/result'
import type { Organization } from '@/db/types'

export interface OrganizationRepositoryPort {
  /**
   * Get an organization by ID
   */
  findById(orgId: string): Promise<Result<Organization | null>>

  /**
   * Update an organization (partial update)
   */
  update(orgId: string, data: Partial<Organization>): Promise<Result<Organization | null>>

  /**
   * Get organization with user profile joined
   */
  findByUserId(userId: string): Promise<Result<{ organization: Organization; role: string | null } | null>>
}
