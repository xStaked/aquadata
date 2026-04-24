'use server'

import { revalidatePath } from 'next/cache'
import { requireOrgWriteContext } from '@/lib/db/context'
import { createClient } from '@/lib/supabase/server'

async function getContext() {
  const ctx = await requireOrgWriteContext()
  return { ...ctx, supabase: await createClient() }
}

// ── Registros de cosecha ───────────────────────────────────────

export async function createHarvestRecord(data: {
  batch_id: string
  harvest_date: string
  total_animals: number
  avg_weight_whole_g: number
  avg_weight_eviscerated_g?: number
  labor_cost: number
  notes?: string
}) {
  const { supabase } = await getContext()
  const { error } = await supabase.from('harvest_records').insert({
    batch_id: data.batch_id,
    harvest_date: data.harvest_date,
    total_animals: data.total_animals,
    avg_weight_whole_g: data.avg_weight_whole_g,
    avg_weight_eviscerated_g: data.avg_weight_eviscerated_g ?? null,
    labor_cost: data.labor_cost,
    notes: data.notes || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/harvest')
}

export async function deleteHarvestRecord(id: string) {
  const { supabase } = await getContext()
  const { error } = await supabase.from('harvest_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/harvest')
}
