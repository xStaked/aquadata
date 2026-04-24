import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Wheat } from 'lucide-react'
import { FeedTab } from './feed-tab'
import { type Concentrate, type FeedRecord, type BatchForForms, type FeedStock } from '../costs/types'
import { isWriterRole } from '@/lib/auth/roles'
import { ReadOnlyBanner } from '@/components/read-only-banner'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const canEdit = isWriterRole(profile?.role)

  let concentrates: Concentrate[] = []
  let feedRecords: FeedRecord[] = []
  let batchesForForms: BatchForForms[] = []
  let stock: FeedStock[] = []

  if (profile?.organization_id) {
    const [
      { data: ponds },
      { data: rawBatches },
      { data: rawConcentrates },
      { data: rawFeedRecords },
      { data: rawStock },
      { data: rawLatestCosts },
    ] = await Promise.all([
      supabase
        .from('ponds')
        .select('id, name, species')
        .eq('organization_id', profile.organization_id)
        .order('sort_order', { ascending: true })
        .order('name'),
      supabase
        .from('batches')
        .select(`
          id, pond_id, status, start_date,
          initial_population, current_population,
          avg_weight_at_seeding_g, fingerling_cost_per_unit
        `)
        .eq('status', 'active'),
      supabase
        .from('feed_concentrates')
        .select('id, name, brand, price_per_kg, protein_pct, is_active')
        .eq('organization_id', profile.organization_id)
        .order('name'),
      supabase
        .from('monthly_feed_records')
        .select('id, batch_id, concentrate_id, concentrate_name, production_stage, year, month, kg_used, cost_per_kg')
        .order('year', { ascending: false })
        .order('month', { ascending: false }),
      supabase
        .from('feed_stock_summary')
        .select('concentrate_id, total_bags, total_kg_in, total_kg_out, available_kg')
        .eq('organization_id', profile.organization_id),
      supabase
        .from('feed_latest_entry_cost')
        .select('concentrate_id, latest_cost_per_kg')
        .eq('organization_id', profile.organization_id),
    ])

    const pondMap: Record<string, { name: string; species: string }> = {}
    const pondOrderMap: Record<string, number> = {}
    for (const [index, p] of (ponds ?? []).entries()) {
      pondMap[p.id] = { name: p.name, species: p.species || 'Pescado' }
      pondOrderMap[p.id] = index
    }

    const sortedRawBatches = [...(rawBatches ?? [])].sort((a: any, b: any) => {
      const aExists = pondOrderMap[a.pond_id] != null
      const bExists = pondOrderMap[b.pond_id] != null
      if (!aExists && !bExists) return 0
      if (!aExists) return 1
      if (!bExists) return -1
      const aOrder = pondOrderMap[a.pond_id] ?? Number.MAX_SAFE_INTEGER
      const bOrder = pondOrderMap[b.pond_id] ?? Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    })
    const orgRawBatches = sortedRawBatches.filter((b: any) => pondOrderMap[b.pond_id] != null)
    const orgBatchIds = new Set(orgRawBatches.map((b: any) => b.id))

    // ── batches for forms ───────────────────────────────────────
    batchesForForms = orgRawBatches.map((b: any) => ({
      id: b.id,
      pond_name: pondMap[b.pond_id]?.name ?? 'S/E',
      species: pondMap[b.pond_id]?.species ?? 'Pescado',
      initial_population: b.current_population || 0,
    }))

    // ── concentrates ────────────────────────────────────────────
    concentrates = (rawConcentrates ?? []).map(c => ({
      id: c.id,
      name: c.name,
      brand: c.brand,
      price_per_kg: Number(c.price_per_kg),
      protein_pct: c.protein_pct != null ? Number(c.protein_pct) : null,
      is_active: c.is_active,
    }))

    // ── feed records with pond name ─────────────────────────────
    const batchPondMap: Record<string, string> = {}
    for (const b of orgRawBatches) batchPondMap[b.id] = pondMap[b.pond_id]?.name ?? 'S/E'

    feedRecords = (rawFeedRecords ?? [])
      .filter(r => orgBatchIds.has(r.batch_id))
      .map(r => ({
        id: r.id,
        batch_id: r.batch_id,
        concentrate_id: r.concentrate_id,
        pond_name: batchPondMap[r.batch_id] ?? 'S/E',
        concentrate_name: r.concentrate_name,
        production_stage: r.production_stage === 'levante' ? 'levante' : 'engorde',
        year: r.year,
        month: r.month,
        kg_used: Number(r.kg_used),
        cost_per_kg: Number(r.cost_per_kg),
      }))

    // ── stock with latest cost ──────────────────────────────────
    const concentrateMap: Record<string, string> = {}
    for (const c of (rawConcentrates ?? [])) concentrateMap[c.id] = c.name
    const latestCostMap: Record<string, number | null> = {}
    for (const lc of (rawLatestCosts ?? [])) {
      latestCostMap[lc.concentrate_id] = lc.latest_cost_per_kg != null ? Number(lc.latest_cost_per_kg) : null
    }

    stock = (rawStock ?? []).map(s => ({
      concentrate_id: s.concentrate_id,
      concentrate_name: concentrateMap[s.concentrate_id] ?? 'Desconocido',
      total_bags: Number(s.total_bags),
      total_kg_in: Number(s.total_kg_in),
      total_kg_out: Number(s.total_kg_out),
      available_kg: Number(s.available_kg),
      latest_cost_per_kg: latestCostMap[s.concentrate_id] ?? null,
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wheat className="h-6 w-6 text-primary" />
            Alimentación
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gestión de concentrados y registro de consumo mensual por lote
          </p>
        </div>
      </div>

      {!canEdit ? <ReadOnlyBanner description="Puedes consultar concentrados y consumo histórico, pero no registrar ni editar alimentación." /> : null}

      <FeedTab
        concentrates={concentrates}
        batchesForForms={batchesForForms}
        feedRecords={feedRecords}
        stock={stock}
        canEdit={canEdit}
      />
    </div>
  )
}
