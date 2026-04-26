'use server'

import { revalidatePath } from 'next/cache'
import { requireOrgWriteContext } from '@/lib/db/context'
import { createClient } from '@/lib/supabase/server'
import { getBatch, createTransfer, deleteTransfer } from '@/lib/db'

export async function createTransferRecord(data: {
  source_batch_id: string
  destination_pond_id: string
  transfer_date: string
  animal_count: number
  avg_weight_g?: number
  is_partial_harvest: boolean
  notes?: string
}) {
  const ctx = await requireOrgWriteContext()
  const { userId, orgId } = ctx
  const supabase = await createClient()

  // 1. Validar origen
  const sourceBatch = await getBatch(data.source_batch_id)
  if (!sourceBatch) throw new Error('Lote origen no encontrado')
  if (sourceBatch.status !== 'active') throw new Error('El lote origen no está activo')

  const currentPop = sourceBatch.current_population ?? sourceBatch.initial_population
  if (currentPop < data.animal_count) {
    throw new Error('La cantidad de animales a trasladar excede la población disponible del lote origen')
  }

  // Verificar que el estanque origen pertenece a la org
  const { data: sourcePond } = await supabase
    .from('ponds')
    .select('organization_id')
    .eq('id', sourceBatch.pond_id)
    .single()
  if (sourcePond?.organization_id !== orgId) {
    throw new Error('Lote origen no pertenece a tu organización')
  }

  // 2. Validar destino
  const { data: destPond } = await supabase
    .from('ponds')
    .select('organization_id')
    .eq('id', data.destination_pond_id)
    .single()
  if (destPond?.organization_id !== orgId) {
    throw new Error('Estanque destino no pertenece a tu organización')
  }

  if (sourceBatch.pond_id === data.destination_pond_id) {
    throw new Error('El estanque destino debe ser diferente al origen')
  }

  // 3. Actualizar población origen
  const newPop = currentPop - data.animal_count
  const { error: updatePopError } = await supabase
    .from('batches')
    .update({ current_population: Math.max(0, newPop) })
    .eq('id', data.source_batch_id)
  if (updatePopError) throw new Error(updatePopError.message)

  // 4. Cerrar lote origen si se vació
  if (newPop <= 0) {
    const { error: closeError } = await supabase
      .from('batches')
      .update({ status: 'closed', end_date: data.transfer_date })
      .eq('id', data.source_batch_id)
    if (closeError) throw new Error(closeError.message)
  }

  // 5. Crear lote destino
  const { data: destBatch, error: destBatchError } = await supabase
    .from('batches')
    .insert({
      pond_id: data.destination_pond_id,
      start_date: data.transfer_date,
      initial_population: data.animal_count,
      current_population: data.animal_count,
      status: 'active',
      pond_entry_date: data.transfer_date,
      seed_source: sourceBatch.seed_source ? `${sourceBatch.seed_source} (traslado)` : 'Traslado',
    })
    .select('id')
    .single()

  if (destBatchError || !destBatch) {
    throw new Error(destBatchError?.message ?? 'Error creando lote destino')
  }

  // 6. Registrar transferencia
  await createTransfer({
    organization_id: orgId,
    source_batch_id: data.source_batch_id,
    source_pond_id: sourceBatch.pond_id,
    destination_batch_id: destBatch.id,
    destination_pond_id: data.destination_pond_id,
    transfer_date: data.transfer_date,
    animal_count: data.animal_count,
    avg_weight_g: data.avg_weight_g ?? null,
    is_partial_harvest: data.is_partial_harvest,
    notes: data.notes ?? null,
    created_by: userId,
  })

  revalidatePath('/dashboard/transfers')
  revalidatePath('/dashboard/ponds')
}

export async function deleteTransferRecord(id: string) {
  await requireOrgWriteContext()
  await deleteTransfer(id)
  revalidatePath('/dashboard/transfers')
  revalidatePath('/dashboard/ponds')
}
