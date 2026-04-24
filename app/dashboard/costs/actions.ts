'use server'

import { revalidatePath } from 'next/cache'
import { requireOrgWriteContext } from '@/lib/db/context'
import { createClient } from '@/lib/supabase/server'

async function getContext() {
  const ctx = await requireOrgWriteContext()
  return { ...ctx, supabase: await createClient() }
}

// ── Configuración de lote (precio venta, rentabilidad objetivo) ─

export async function updateBatchSalesConfig(batchId: string, data: {
  sale_price_per_kg?: number
  target_profitability_pct?: number
  fingerling_cost_per_unit?: number
  avg_weight_at_seeding_g?: number
  labor_cost_per_month?: number
  operating_fixed_costs?: number
  target_profit_amount?: number
  bioaqua_quantity?: number
  bioterra_quantity?: number
}) {
  const { supabase } = await getContext()
  const update: Record<string, number | undefined> = {}
  if (data.sale_price_per_kg !== undefined) update.sale_price_per_kg = data.sale_price_per_kg
  if (data.target_profitability_pct !== undefined) update.target_profitability_pct = data.target_profitability_pct
  if (data.fingerling_cost_per_unit !== undefined) update.fingerling_cost_per_unit = data.fingerling_cost_per_unit
  if (data.avg_weight_at_seeding_g !== undefined) update.avg_weight_at_seeding_g = data.avg_weight_at_seeding_g
  if (data.labor_cost_per_month !== undefined) update.labor_cost_per_month = data.labor_cost_per_month
  if (data.operating_fixed_costs !== undefined) update.operating_fixed_costs = data.operating_fixed_costs
  if (data.target_profit_amount !== undefined) update.target_profit_amount = data.target_profit_amount
  if (data.bioaqua_quantity !== undefined) update.bioaqua_quantity = data.bioaqua_quantity
  if (data.bioterra_quantity !== undefined) update.bioterra_quantity = data.bioterra_quantity
  const { error } = await supabase.from('batches').update(update).eq('id', batchId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/costs')
}
