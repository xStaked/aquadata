'use server'

import { revalidatePath } from 'next/cache'
import { requireOrgWriteContext } from '@/lib/db/context'
import { createClient } from '@/lib/supabase/server'

async function getContext() {
  const ctx = await requireOrgWriteContext()
  return { ...ctx, supabase: await createClient() }
}

// ── Concentrados ──────────────────────────────────────────────

export async function createConcentrate(data: {
  name: string
  brand?: string
  price_per_kg: number
  protein_pct?: number
}) {
  const { supabase, orgId } = await getContext()
  const { error } = await supabase.from('feed_concentrates').insert({
    organization_id: orgId,
    name: data.name,
    brand: data.brand || null,
    price_per_kg: data.price_per_kg,
    protein_pct: data.protein_pct ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/feed')
}

export async function updateConcentrate(id: string, data: {
  name: string
  brand?: string
  price_per_kg: number
  protein_pct?: number
  is_active: boolean
}) {
  const { supabase, orgId } = await getContext()
  const { error } = await supabase
    .from('feed_concentrates')
    .update({
      name: data.name,
      brand: data.brand || null,
      price_per_kg: data.price_per_kg,
      protein_pct: data.protein_pct ?? null,
      is_active: data.is_active,
    })
    .eq('id', id)
    .eq('organization_id', orgId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/feed')
}

export async function deleteConcentrate(id: string) {
  const { supabase, orgId } = await getContext()
  const { error } = await supabase
    .from('feed_concentrates')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/feed')
}

// ── Registros mensuales de alimento ───────────────────────────

export async function createMonthlyFeedRecord(data: {
  batch_id: string
  concentrate_id: string | null
  concentrate_name: string
  production_stage: 'levante' | 'engorde'
  year: number
  month: number
  kg_used: number
  cost_per_kg: number
  notes?: string
}) {
  const { supabase } = await getContext()
  const { error } = await supabase.from('monthly_feed_records').upsert(
    {
      batch_id: data.batch_id,
      concentrate_id: data.concentrate_id || null,
      concentrate_name: data.concentrate_name,
      production_stage: data.production_stage,
      year: data.year,
      month: data.month,
      kg_used: data.kg_used,
      cost_per_kg: data.cost_per_kg,
      notes: data.notes || null,
    },
    { onConflict: 'batch_id,concentrate_id,year,month,production_stage' }
  )
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/feed')
}

export async function updateMonthlyFeedRecord(id: string, data: {
  batch_id: string
  concentrate_id: string
  concentrate_name: string
  production_stage: 'levante' | 'engorde'
  year: number
  month: number
  kg_used: number
  cost_per_kg: number
}) {
  const { supabase } = await getContext()
  const { error } = await supabase
    .from('monthly_feed_records')
    .update({
      batch_id: data.batch_id,
      concentrate_id: data.concentrate_id,
      concentrate_name: data.concentrate_name,
      production_stage: data.production_stage,
      year: data.year,
      month: data.month,
      kg_used: data.kg_used,
      cost_per_kg: data.cost_per_kg,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/feed')
}

export async function deleteMonthlyFeedRecord(id: string) {
  const { supabase } = await getContext()
  const { error } = await supabase.from('monthly_feed_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/feed')
}

// ── Inventario de concentrado ─────────────────────────────────

export async function createFeedInventoryEntry(data: {
  concentrate_id: string
  bags_received: number
  kg_per_bag: number
  price_per_bag: number
  supplier?: string
  lot_number?: string
  entry_date: string
  notes?: string
}) {
  const { supabase, orgId } = await getContext()
  const { error } = await supabase.from('feed_inventory_entries').insert({
    organization_id: orgId,
    concentrate_id: data.concentrate_id,
    bags_received: data.bags_received,
    kg_per_bag: data.kg_per_bag,
    price_per_bag: data.price_per_bag,
    supplier: data.supplier || null,
    lot_number: data.lot_number || null,
    entry_date: data.entry_date,
    notes: data.notes || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/feed')
}

export async function updateFeedInventoryEntry(id: string, data: {
  concentrate_id: string
  bags_received: number
  kg_per_bag: number
  price_per_bag: number
  supplier?: string
  lot_number?: string
  entry_date: string
  notes?: string
}) {
  const { supabase, orgId } = await getContext()
  const { error } = await supabase
    .from('feed_inventory_entries')
    .update({
      concentrate_id: data.concentrate_id,
      bags_received: data.bags_received,
      kg_per_bag: data.kg_per_bag,
      price_per_bag: data.price_per_bag,
      supplier: data.supplier || null,
      lot_number: data.lot_number || null,
      entry_date: data.entry_date,
      notes: data.notes || null,
    })
    .eq('id', id)
    .eq('organization_id', orgId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/feed')
}

export async function deleteFeedInventoryEntry(id: string) {
  const { supabase, orgId } = await getContext()
  const { error } = await supabase
    .from('feed_inventory_entries')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/feed')
}
