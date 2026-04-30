'use server'

import { revalidatePath } from 'next/cache'
import { requireOrgWriteContext } from '@/lib/db/context'
import { createClient } from '@/lib/supabase/server'
import { getBatch } from '@/lib/db'

async function getContext() {
  const ctx = await requireOrgWriteContext()
  return { ...ctx, supabase: await createClient() }
}

// ── Registros de cosecha ───────────────────────────────────────

export async function createHarvestRecord(data: {
  batch_id: string
  harvest_date: string
  total_animals: number
  hidden_mortality?: number
  avg_weight_whole_g: number
  avg_weight_eviscerated_g?: number
  labor_cost: number
  notes?: string
}) {
  const { orgId, supabase } = await getContext()

  const batch = await getBatch(data.batch_id)
  if (!batch) throw new Error('Lote no encontrado')
  if (batch.status !== 'active') throw new Error('El lote no está activo')

  const { data: pond } = await supabase
    .from('ponds')
    .select('organization_id')
    .eq('id', batch.pond_id)
    .single()

  if (pond?.organization_id !== orgId) {
    throw new Error('Lote no pertenece a tu organización')
  }

  const currentPopulation = batch.current_population ?? batch.initial_population
  const hiddenMortality = Math.max(0, data.hidden_mortality ?? 0)
  const totalOutput = data.total_animals + hiddenMortality

  if (currentPopulation < totalOutput) {
    throw new Error(`La salida total del lote excede la población disponible (${currentPopulation.toLocaleString()} animales)`)
  }

  const newPopulation = currentPopulation - totalOutput

  const { error } = await supabase.from('harvest_records').insert({
    batch_id: data.batch_id,
    harvest_date: data.harvest_date,
    total_animals: data.total_animals,
    hidden_mortality: hiddenMortality,
    avg_weight_whole_g: data.avg_weight_whole_g,
    avg_weight_eviscerated_g: data.avg_weight_eviscerated_g ?? null,
    labor_cost: data.labor_cost,
    notes: data.notes || null,
  })
  if (error) throw new Error(error.message)

  const batchUpdate: {
    current_population: number
    status?: 'closed'
    end_date?: string
  } = {
    current_population: Math.max(0, newPopulation),
  }

  if (newPopulation <= 0) {
    batchUpdate.status = 'closed'
    batchUpdate.end_date = data.harvest_date
  }

  const { error: batchError } = await supabase
    .from('batches')
    .update(batchUpdate)
    .eq('id', data.batch_id)

  if (batchError) throw new Error(batchError.message)

  revalidatePath('/dashboard/harvest')
  revalidatePath('/dashboard/ponds')
}

export async function deleteHarvestRecord(id: string) {
  const { supabase } = await getContext()
  const { error } = await supabase.from('harvest_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/harvest')
}
