/**
 * Supabase adapter implementing the AlertServicePort.
 */

import type { Result } from '@/domain/types/result'
import { success, failure } from '@/domain/types/result'
import type { AlertServicePort } from '@/domain/ports/output/alert.service.port'
import type { Alert } from '@/db/types'
import { getAlertsByOrg, createAlerts, markAlertResolved, markAllAlertsRead, getUnresolvedAlertsByOrg } from '@/lib/db'

export class SupabaseAlertService implements AlertServicePort {
  async findByOrg(orgId: string): Promise<Result<Alert[]>> {
    try {
      const alerts = await getAlertsByOrg(orgId)
      return success(alerts as unknown as Alert[])
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar alertas',
        'FIND_BY_ORG_FAILED',
      )
    }
  }

  async findUnresolvedByOrg(orgId: string): Promise<Result<Alert[]>> {
    try {
      const alerts = await getUnresolvedAlertsByOrg(orgId)
      return success(alerts as unknown as Alert[])
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al buscar alertas sin resolver',
        'FIND_UNRESOLVED_FAILED',
      )
    }
  }

  async createBatch(alerts: Omit<Alert, 'id' | 'created_at' | 'is_read' | 'is_resolved'>[]): Promise<Result<void>> {
    try {
      await createAlerts(alerts)
      return success(undefined)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al crear alertas',
        'CREATE_BATCH_FAILED',
      )
    }
  }

  async markResolved(alertId: string, orgId: string): Promise<Result<void>> {
    try {
      await markAlertResolved(alertId, orgId)
      return success(undefined)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al marcar alerta como resuelta',
        'MARK_RESOLVED_FAILED',
      )
    }
  }

  async markAllRead(orgId: string): Promise<Result<void>> {
    try {
      await markAllAlertsRead(orgId)
      return success(undefined)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al marcar alertas como leídas',
        'MARK_ALL_READ_FAILED',
      )
    }
  }
}
