import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Scale } from 'lucide-react'
import { HarvestTab } from './harvest-tab'
import { isWriterRole } from '@/lib/auth/roles'
import { ReadOnlyBanner } from '@/components/read-only-banner'

export default async function HarvestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const canEdit = isWriterRole(profile?.role)

  let harvests: Awaited<ReturnType<typeof getHarvests>> = []
  let batchesForForms: Awaited<ReturnType<typeof getBatchesForForms>> = []

  if (profile?.organization_id) {
    const [
      { data: ponds },
      { data: rawBatches },
      { data: rawHarvests },
    ] = await Promise.all([
      supabase
        .from('ponds')
        .select('id, name, species')
        .eq('organization_id', profile.organization_id)
        .order('sort_order', { ascending: true })
        .order('name'),
      supabase
        .from('batches')
        .select('id, pond_id, status, start_date, current_population')
        .eq('status', 'active'),
      supabase
        .from('harvest_records')
        .select('id, batch_id, harvest_date, total_animals, avg_weight_whole_g, avg_weight_eviscerated_g, labor_cost, notes')
        .order('harvest_date', { ascending: false }),
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

    // ── harvests with pond name ─────────────────────────────────
    const batchPondMap: Record<string, string> = {}
    for (const b of orgRawBatches) batchPondMap[b.id] = pondMap[b.pond_id]?.name ?? 'S/E'

    harvests = (rawHarvests ?? [])
      .filter(h => orgBatchIds.has(h.batch_id))
      .map(h => ({
        id: h.id,
        batch_id: h.batch_id,
        pond_name: batchPondMap[h.batch_id] ?? 'S/E',
        harvest_date: h.harvest_date,
        total_animals: h.total_animals,
        avg_weight_whole_g: Number(h.avg_weight_whole_g),
        avg_weight_eviscerated_g: h.avg_weight_eviscerated_g != null ? Number(h.avg_weight_eviscerated_g) : null,
        labor_cost: Number(h.labor_cost),
        notes: h.notes,
      }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            Cosechas
          </h1>
          <p className="mt-1 text-muted-foreground">
            Registro de cosechas y control de merma por lote
          </p>
        </div>
      </div>

      {!canEdit ? <ReadOnlyBanner description="Puedes consultar las cosechas históricas, pero no registrar ni editar cosechas." /> : null}

      <HarvestTab
        harvests={harvests}
        batchesForForms={batchesForForms}
        canEdit={canEdit}
      />
    </div>
  )
}

type HarvestRecord = {
  id: string
  batch_id: string
  pond_name: string
  harvest_date: string
  total_animals: number
  avg_weight_whole_g: number
  avg_weight_eviscerated_g: number | null
  labor_cost: number
  notes: string | null
}

type BatchForForms = {
  id: string
  pond_name: string
  species: string
  initial_population: number
}

function getHarvests(): Promise<HarvestRecord[]> {
  return Promise.resolve([])
}

function getBatchesForForms(): Promise<BatchForForms[]> {
  return Promise.resolve([])
}
