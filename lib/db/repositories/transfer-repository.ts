import { createClient } from '@/lib/supabase/server'
import type { BatchTransfer, BatchTransferWithPonds } from '@/db/types'

/**
 * Fetch all batch transfers for an organization.
 * Includes joined pond names for display.
 */
export async function getTransfersByOrg(orgId: string): Promise<BatchTransferWithPonds[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('batch_transfers')
    .select(`
      *,
      source_pond:ponds!source_pond_id(name),
      destination_pond:ponds!destination_pond_id(name),
      source_batch:batches!source_batch_id(start_date),
      destination_batch:batches!destination_batch_id(start_date)
    `)
    .eq('organization_id', orgId)
    .order('transfer_date', { ascending: false })

  if (error) throw new Error(`Error fetching transfers: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    ...normalizeTransfer(row),
    source_pond: row.source_pond ?? { name: 'S/E' },
    destination_pond: row.destination_pond ?? { name: 'S/E' },
    source_batch: row.source_batch ?? { start_date: '' },
    destination_batch: row.destination_batch ?? null,
  }))
}

/**
 * Create a new batch transfer record.
 */
export async function createTransfer(
  data: Omit<BatchTransfer, 'id' | 'created_at'>
): Promise<string> {
  const supabase = await createClient()

  const { data: inserted, error } = await supabase
    .from('batch_transfers')
    .insert({
      organization_id: data.organization_id,
      source_batch_id: data.source_batch_id,
      source_pond_id: data.source_pond_id,
      destination_batch_id: data.destination_batch_id,
      destination_pond_id: data.destination_pond_id,
      transfer_date: data.transfer_date,
      animal_count: data.animal_count,
      avg_weight_g: data.avg_weight_g ?? null,
      is_partial_harvest: data.is_partial_harvest,
      notes: data.notes ?? null,
      created_by: data.created_by,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Error creating transfer: ${error.message}`)
  return inserted.id
}

/**
 * Delete a batch transfer record.
 * Note: this does NOT revert batch populations or statuses.
 */
export async function deleteTransfer(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('batch_transfers')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Error deleting transfer: ${error.message}`)
}

function normalizeTransfer(raw: Record<string, unknown>): BatchTransfer {
  return {
    id: raw.id as string,
    organization_id: raw.organization_id as string,
    source_batch_id: raw.source_batch_id as string,
    source_pond_id: raw.source_pond_id as string,
    destination_batch_id: (raw.destination_batch_id as string) ?? null,
    destination_pond_id: raw.destination_pond_id as string,
    transfer_date: raw.transfer_date as string,
    animal_count: Number(raw.animal_count ?? 0),
    avg_weight_g: raw.avg_weight_g != null ? Number(raw.avg_weight_g) : null,
    is_partial_harvest: Boolean(raw.is_partial_harvest),
    notes: (raw.notes as string) ?? null,
    created_by: (raw.created_by as string) ?? null,
    created_at: raw.created_at as string,
  }
}
