import { createClient } from '@/lib/supabase/server'
import type { Alert, AlertSeverity, AlertType } from '@/db/types'

/**
 * Fetch all alerts for an organization.
 */
export async function getAlertsByOrg(orgId: string): Promise<Alert[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Error fetching alerts: ${error.message}`)
  return (data ?? []).map(normalizeAlert)
}

/**
 * Create multiple alerts in a single call.
 */
export async function createAlerts(
  alerts: Array<{
    organization_id: string
    pond_id?: string | null
    batch_id?: string | null
    record_id?: string | null
    alert_type: AlertType
    severity: AlertSeverity
    message: string
  }>
): Promise<void> {
  if (alerts.length === 0) return

  const supabase = await createClient()

  const { error } = await supabase.from('alerts').insert(
    alerts.map((a) => ({
      organization_id: a.organization_id,
      pond_id: a.pond_id ?? null,
      batch_id: a.batch_id ?? null,
      record_id: a.record_id ?? null,
      alert_type: a.alert_type,
      severity: a.severity,
      message: a.message,
      is_read: false,
    }))
  )

  if (error) throw new Error(`Error creating alerts: ${error.message}`)
}

/**
 * Mark a single alert as resolved (read).
 * Verifies org ownership.
 */
export async function markAlertResolved(alertId: string, orgId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', alertId)
    .eq('organization_id', orgId)

  if (error) throw new Error(`Error marking alert as resolved: ${error.message}`)
}

/**
 * Mark all unread alerts for an organization as read.
 */
export async function markAllAlertsRead(orgId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('organization_id', orgId)
    .eq('is_read', false)

  if (error) throw new Error(`Error marking all alerts as read: ${error.message}`)
}

/**
 * Fetch all unresolved (unread) alerts for an organization.
 */
export async function getUnresolvedAlertsByOrg(orgId: string): Promise<Alert[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Error fetching unresolved alerts: ${error.message}`)
  return (data ?? []).map(normalizeAlert)
}

export async function deleteAlertsByRecordId(recordId: string, orgId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('record_id', recordId)
    .eq('organization_id', orgId)

  if (error) throw new Error(`Error deleting alerts by record: ${error.message}`)
}

function normalizeAlert(raw: Record<string, unknown>): Alert {
  return {
    id: raw.id as string,
    organization_id: raw.organization_id as string,
    pond_id: (raw.pond_id as string) ?? null,
    batch_id: (raw.batch_id as string) ?? null,
    record_id: (raw.record_id as string) ?? null,
    alert_type: raw.alert_type as AlertType,
    severity: raw.severity as AlertSeverity,
    message: raw.message as string,
    is_read: Boolean(raw.is_read),
    created_at: raw.created_at as string,
  }
}
