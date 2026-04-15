/**
 * Output port: what the application NEEDS for alert management.
 */

import type { Result } from '@/domain/types/result'
import type { Alert } from '@/db/types'

export interface AlertServicePort {
  /**
   * Get all alerts for an organization
   */
  findByOrg(orgId: string): Promise<Result<Alert[]>>

  /**
   * Get unresolved alerts for an organization
   */
  findUnresolvedByOrg(orgId: string): Promise<Result<Alert[]>>

  /**
   * Create multiple alerts at once
   */
  createBatch(alerts: Omit<Alert, 'id' | 'created_at' | 'is_read' | 'is_resolved'>[]): Promise<Result<void>>

  /**
   * Mark an alert as resolved (with ownership check)
   */
  markResolved(alertId: string, orgId: string): Promise<Result<void>>

  /**
   * Mark all alerts as read for an organization
   */
  markAllRead(orgId: string): Promise<Result<void>>
}
