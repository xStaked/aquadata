'use server'

import { revalidatePath } from 'next/cache'
import { requireOrgWriteContext } from '@/lib/db/context'
import { updateBatchPopulation } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

export interface DailyFeedRecordInput {
  batch_id: string
  record_date: string
  concentrate_id: string | null
  concentrate_name: string
  bags_am: number
  bags_pm: number
  kg_per_bag: number
  mortality_count: number
  reference?: string
  notes?: string
}

async function getOwnedBatch(
  batchId: string,
  orgId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await supabase
    .from('batches')
    .select('id, current_population, initial_population, ponds!inner(organization_id, production_stage)')
    .eq('id', batchId)
    .eq('ponds.organization_id', orgId)
    .single()

  if (error || !data) {
    throw new Error('No se pudo cargar el lote')
  }

  return {
    id: data.id,
    current_population: data.current_population != null ? Number(data.current_population) : null,
    initial_population: Number(data.initial_population ?? 0),
    production_stage: data.ponds?.production_stage === 'levante' ? 'levante' : 'engorde',
  }
}

async function syncBatchPopulationForMortality(
  batchId: string,
  orgId: string,
  mortalityDelta: number,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  if (mortalityDelta === 0) {
    return
  }

  const batch = await getOwnedBatch(batchId, orgId, supabase)
  const currentPopulation = batch.current_population ?? batch.initial_population
  const nextPopulation = Math.max(0, currentPopulation - mortalityDelta)
  await updateBatchPopulation(batchId, nextPopulation)
}

export async function createDailyFeedRecord(data: DailyFeedRecordInput) {
  const { userId, orgId } = await requireOrgWriteContext()
  const supabase = await createClient()

  const batch = await getOwnedBatch(data.batch_id, orgId, supabase)

  const { data: existingRecord } = await supabase
    .from('daily_feed_records')
    .select('id, batch_id, mortality_count')
    .eq('batch_id', data.batch_id)
    .eq('record_date', data.record_date)
    .eq('concentrate_id', data.concentrate_id)
    .maybeSingle()

  const mortalityDelta = data.mortality_count - Number(existingRecord?.mortality_count ?? 0)

  const { error } = await supabase.from('daily_feed_records').upsert(
    {
      batch_id: data.batch_id,
      record_date: data.record_date,
      concentrate_id: data.concentrate_id,
      concentrate_name: data.concentrate_name,
      bags_am: data.bags_am,
      bags_pm: data.bags_pm,
      kg_per_bag: data.kg_per_bag,
      mortality_count: data.mortality_count,
      reference: data.reference || null,
      production_stage: batch.production_stage,
      notes: data.notes || null,
      created_by: userId,
    },
    { onConflict: 'batch_id,record_date,concentrate_id' }
  )

  if (error) throw new Error(error.message)
  await syncBatchPopulationForMortality(data.batch_id, orgId, mortalityDelta, supabase)
  revalidatePath('/dashboard/feed')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/ponds')
}

export async function getDailyFeedRecords(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('daily_feed_records')
    .select(`
      id,
      batch_id,
      record_date,
      concentrate_id,
      concentrate_name,
      bags_am,
      bags_pm,
      bags_total,
      kg_per_bag,
      kg_total,
      mortality_count,
      reference,
      notes,
      created_at,
      batches!inner(ponds!inner(name))
    `)
    .eq('batches.ponds.organization_id', organizationId)
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((r: any) => ({
    id: r.id,
    batch_id: r.batch_id,
    record_date: r.record_date,
    concentrate_id: r.concentrate_id,
    concentrate_name: r.concentrate_name,
    bags_am: Number(r.bags_am),
    bags_pm: Number(r.bags_pm),
    bags_total: Number(r.bags_total),
    kg_per_bag: Number(r.kg_per_bag),
    kg_total: Number(r.kg_total),
    mortality_count: Number(r.mortality_count),
    reference: r.reference,
    notes: r.notes,
    pond_name: r.batches?.ponds?.name ?? 'S/E',
    created_at: r.created_at,
  }))
}

export async function bulkImportDailyFeedRecords(records: DailyFeedRecordInput[]) {
  const { userId, orgId } = await requireOrgWriteContext()
  const supabase = await createClient()

  if (records.length === 0) {
    throw new Error('No hay registros para importar')
  }

  const mortalityAdjustments: Array<{ batchId: string; delta: number }> = []

  for (const record of records) {
    const batch = await getOwnedBatch(record.batch_id, orgId, supabase)

    const { data: existingRecord } = await supabase
      .from('daily_feed_records')
      .select('mortality_count')
      .eq('batch_id', record.batch_id)
      .eq('record_date', record.record_date)
      .eq('concentrate_id', record.concentrate_id)
      .maybeSingle()

    const mortalityDelta = record.mortality_count - Number(existingRecord?.mortality_count ?? 0)
    mortalityAdjustments.push({ batchId: record.batch_id, delta: mortalityDelta })
  }

  const rows = records.map((r) => ({
    batch_id: r.batch_id,
    record_date: r.record_date,
    concentrate_id: r.concentrate_id,
    concentrate_name: r.concentrate_name,
    bags_am: r.bags_am,
    bags_pm: r.bags_pm,
    kg_per_bag: r.kg_per_bag,
    mortality_count: r.mortality_count,
    reference: r.reference || null,
    production_stage: batch.production_stage,
    notes: r.notes || null,
    created_by: userId,
  }))

  const { error } = await supabase.from('daily_feed_records').upsert(rows, {
    onConflict: 'batch_id,record_date,concentrate_id',
    ignoreDuplicates: false,
  })

  if (error) throw new Error(error.message)

  for (const adjustment of mortalityAdjustments) {
    await syncBatchPopulationForMortality(adjustment.batchId, orgId, adjustment.delta, supabase)
  }

  revalidatePath('/dashboard/feed')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/ponds')
  return { imported: rows.length }
}

export async function updateDailyFeedRecord(id: string, data: DailyFeedRecordInput) {
  const { userId, orgId } = await requireOrgWriteContext()
  const supabase = await createClient()

  const { data: existingRecord, error: existingRecordError } = await supabase
    .from('daily_feed_records')
    .select('id, batch_id, mortality_count')
    .eq('id', id)
    .single()

  if (existingRecordError || !existingRecord) {
    throw new Error('No se pudo cargar el registro')
  }

  const batch = await getOwnedBatch(data.batch_id, orgId, supabase)

  let adjustments: Array<{ batchId: string; delta: number }> = []

  if (existingRecord.batch_id === data.batch_id) {
    const mortalityDelta = data.mortality_count - Number(existingRecord.mortality_count ?? 0)
    adjustments = [{ batchId: data.batch_id, delta: mortalityDelta }]
  } else {
    adjustments = [
      { batchId: existingRecord.batch_id, delta: -Number(existingRecord.mortality_count ?? 0) },
      { batchId: data.batch_id, delta: data.mortality_count },
    ]
  }

  const { error } = await supabase
    .from('daily_feed_records')
    .update({
      batch_id: data.batch_id,
      record_date: data.record_date,
      concentrate_id: data.concentrate_id,
      concentrate_name: data.concentrate_name,
      bags_am: data.bags_am,
      bags_pm: data.bags_pm,
      kg_per_bag: data.kg_per_bag,
      mortality_count: data.mortality_count,
      reference: data.reference || null,
      production_stage: batch.production_stage,
      notes: data.notes || null,
      created_by: userId,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  for (const adjustment of adjustments) {
    await syncBatchPopulationForMortality(adjustment.batchId, orgId, adjustment.delta, supabase)
  }
  revalidatePath('/dashboard/feed')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/ponds')
}

export async function deleteDailyFeedRecord(id: string) {
  const supabase = await createClient()
  const { orgId } = await requireOrgWriteContext()

  const { data: existingRecord, error: existingRecordError } = await supabase
    .from('daily_feed_records')
    .select('id, batch_id, mortality_count')
    .eq('id', id)
    .single()

  if (existingRecordError || !existingRecord) {
    throw new Error('No se pudo cargar el registro')
  }

  await getOwnedBatch(existingRecord.batch_id, orgId, supabase)
  const { error } = await supabase.from('daily_feed_records').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await syncBatchPopulationForMortality(
    existingRecord.batch_id,
    orgId,
    -Number(existingRecord.mortality_count ?? 0),
    supabase
  )

  revalidatePath('/dashboard/feed')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/ponds')
}
