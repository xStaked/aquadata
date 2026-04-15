/**
 * Supabase adapter implementing the OrganizationRepositoryPort.
 */

import type { Result } from '@/domain/types/result'
import { success, failure } from '@/domain/types/result'
import type { OrganizationRepositoryPort } from '@/domain/ports/output/organization.repository.port'
import type { Organization } from '@/db/types'
import { getOrganization, updateOrganization, getOrganizationWithProfile } from '@/lib/db'

export class SupabaseOrganizationRepository implements OrganizationRepositoryPort {
  async findById(orgId: string): Promise<Result<Organization | null>> {
    try {
      const org = await getOrganization(orgId)
      return success((org ?? null) as unknown as Organization | null)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar organización',
        'FIND_BY_ID_FAILED',
      )
    }
  }

  async update(orgId: string, data: Partial<Organization>): Promise<Result<Organization | null>> {
    try {
      const updated = await updateOrganization(orgId, data)
      return success((updated ?? null) as unknown as Organization | null)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al actualizar organización',
        'UPDATE_FAILED',
      )
    }
  }

  async findByUserId(userId: string): Promise<Result<{ organization: Organization; role: string | null } | null>> {
    try {
      const result = await getOrganizationWithProfile(userId)
      if (!result) {
        return success(null)
      }
      return success(result as unknown as { organization: Organization; role: string | null })
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar organización del usuario',
        'FIND_BY_USER_FAILED',
      )
    }
  }
}
