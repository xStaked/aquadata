import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CalendarRange } from 'lucide-react'
import Link from 'next/link'

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const pastDays = (d.getTime() - startOfYear.getTime()) / 86400000
  const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7)
  return `${d.getFullYear()}-S${String(weekNum).padStart(2, '0')}`
}

function getFortnightKey(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const fortnight = day <= 15 ? 'Q1' : 'Q2'
  return `${d.getFullYear()}-${String(month).padStart(2, '0')}-${fortnight}`
}

function formatWeekLabel(weekKey: string) {
  const [year, week] = weekKey.split('-')
  return `${week} ${year}`
}

function formatFortnightLabel(fortnightKey: string) {
  const [year, month, q] = fortnightKey.split('-')
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const monthIdx = Number(month) - 1
  return `${monthNames[monthIdx]} ${q === 'Q1' ? '1-15' : '16-30'} ${year}`
}

interface PeriodRecord {
  period_key: string
  period_label: string
  start_date: string
  end_date: string
  total_feed_kg: number
  total_mortality: number
  avg_weight_g: number | null
  latest_biomass_kg: number | null
  latest_fish_count: number | null
  record_count: number
  batch_id: string
  pond_name: string
}

export default async function RecordsPeriodsPage({
  searchParams,
}: {
  searchParams: Promise<{ pond?: string; from?: string; to?: string; group?: string }>
}) {
  const { pond: pondFilter, from: fromDateFilter, to: toDateFilter, group: groupParam } = await searchParams
  const groupBy = groupParam === 'fortnight' ? 'fortnight' : 'week'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  let ponds: Array<{ id: string; name: string }> = []
  let periods: PeriodRecord[] = []
  let batchPondMap: Record<string, string> = {}

  if (profile?.organization_id) {
    const { data: organizationPonds } = await supabase
      .from('ponds')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .order('sort_order', { ascending: true })
      .order('name')

    ponds = organizationPonds ?? []

    if (ponds && ponds.length > 0) {
      const selectedPondId = pondFilter && ponds.some((p) => p.id === pondFilter) ? pondFilter : null
      const pondIds = selectedPondId ? [selectedPondId] : ponds.map((p) => p.id)
      const { data: allBatches } = await supabase
        .from('batches')
        .select('id, pond_id')
        .in('pond_id', pondIds)

      if (allBatches) {
        for (const b of allBatches) {
          batchPondMap[b.id] = ponds.find(p => p.id === b.pond_id)?.name ?? ''
        }

        const batchIds = allBatches.map(b => b.id)
        if (batchIds.length > 0) {
          let recordsQuery = supabase
            .from('production_records')
            .select('batch_id, record_date, feed_kg, mortality_count, avg_weight_kg, biomass_kg, fish_count')
            .in('batch_id', batchIds)
            .order('record_date', { ascending: true })

          if (fromDateFilter) {
            recordsQuery = recordsQuery.gte('record_date', fromDateFilter)
          }
          if (toDateFilter) {
            recordsQuery = recordsQuery.lte('record_date', toDateFilter)
          }

          const { data: recs } = await recordsQuery

          if (recs && recs.length > 0) {
            const grouped = new Map<string, {
              records: typeof recs
              batch_id: string
            }>()

            for (const r of recs) {
              const key = groupBy === 'week' ? getWeekKey(r.record_date) : getFortnightKey(r.record_date)
              const existing = grouped.get(key)
              if (existing) {
                existing.records.push(r)
              } else {
                grouped.set(key, { records: [r], batch_id: r.batch_id })
              }
            }

            periods = Array.from(grouped.entries()).map(([key, group]) => {
              const sorted = [...group.records].sort((a, b) => a.record_date.localeCompare(b.record_date))
              const first = sorted[0]
              const last = sorted[sorted.length - 1]
              const totalFeed = sorted.reduce((s, r) => s + (r.feed_kg ?? 0), 0)
              const totalMortality = sorted.reduce((s, r) => s + (r.mortality_count ?? 0), 0)
              const avgWeight = sorted.filter(r => r.avg_weight_kg != null)
              const avgWeightG = avgWeight.length > 0
                ? avgWeight.reduce((s, r) => s + (r.avg_weight_kg! * 1000), 0) / avgWeight.length
                : null

              return {
                period_key: key,
                period_label: groupBy === 'week' ? formatWeekLabel(key) : formatFortnightLabel(key),
                start_date: first.record_date,
                end_date: last.record_date,
                total_feed_kg: totalFeed,
                total_mortality: totalMortality,
                avg_weight_g: avgWeightG,
                latest_biomass_kg: last.biomass_kg,
                latest_fish_count: last.fish_count,
                record_count: sorted.length,
                batch_id: group.batch_id,
                pond_name: batchPondMap[group.batch_id] || '-',
              }
            }).sort((a, b) => a.start_date.localeCompare(b.start_date))
          }
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/records"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Registros
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Valores por Periodo</h1>
          <p className="mt-1 text-muted-foreground">Agrupación semanal o quincenal de datos productivos</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[220px] flex-col gap-1">
              <label htmlFor="pond" className="text-sm font-medium text-foreground">Estanque</label>
              <select
                id="pond"
                name="pond"
                defaultValue={pondFilter && ponds.some((p) => p.id === pondFilter) ? pondFilter : 'all'}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                {ponds.map((pond) => (
                  <option key={pond.id} value={pond.id}>{pond.name}</option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[180px] flex-col gap-1">
              <label htmlFor="from" className="text-sm font-medium text-foreground">Desde</label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={fromDateFilter ?? ''}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex min-w-[180px] flex-col gap-1">
              <label htmlFor="to" className="text-sm font-medium text-foreground">Hasta</label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={toDateFilter ?? ''}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex min-w-[160px] flex-col gap-1">
              <label htmlFor="group" className="text-sm font-medium text-foreground">Agrupar por</label>
              <select
                id="group"
                name="group"
                defaultValue={groupBy}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="week">Semana</option>
                <option value="fortnight">Quincena</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Filtrar
            </button>
            <a
              href="/dashboard/records/periods"
              className="rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground"
            >
              Limpiar
            </a>
          </form>
        </CardContent>
      </Card>

      {periods.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <CalendarRange className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Sin datos suficientes</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                No hay registros para agrupar en el periodo seleccionado.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">{periods.length} periodos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estanque</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                  <TableHead className="text-right">Alimento total (kg)</TableHead>
                  <TableHead className="text-right">Mortalidad total</TableHead>
                  <TableHead className="text-right">Peso prom. (g)</TableHead>
                  <TableHead className="text-right">Biomasa final (kg)</TableHead>
                  <TableHead className="text-right">Nº peces final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={`${p.batch_id}-${p.period_key}`} className="hover:bg-muted/50">
                    <TableCell className="font-medium whitespace-nowrap">{p.period_label}</TableCell>
                    <TableCell><Badge variant="secondary">{p.pond_name}</Badge></TableCell>
                    <TableCell className="text-right">{p.record_count}</TableCell>
                    <TableCell className="text-right">{p.total_feed_kg.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      {p.total_mortality > 0 ? (
                        <span className="text-destructive">{p.total_mortality}</span>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell className="text-right">{p.avg_weight_g?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{p.latest_biomass_kg?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{p.latest_fish_count ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
