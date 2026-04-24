import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Fish, Package, Scale, TrendingDown, TrendingUp, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCOP } from '@/lib/format'
import { ConcentrateConsumptionChart } from '@/components/concentrate-consumption-chart'
import { ConcentrateConsumptionFilter } from '@/components/concentrate-consumption-filter'

export default async function ConcentrateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  const orgId = profile.organization_id

  // ── Concentrado ─────────────────────────────────────────────
  const { data: rawConcentrate } = await supabase
    .from('feed_concentrates')
    .select('id, name, brand, price_per_kg, protein_pct, is_active')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!rawConcentrate) {
    redirect('/dashboard/inventory')
  }

  const concentrate = {
    id: rawConcentrate.id,
    name: rawConcentrate.name,
    brand: rawConcentrate.brand,
    price_per_kg: Number(rawConcentrate.price_per_kg),
    protein_pct: rawConcentrate.protein_pct != null ? Number(rawConcentrate.protein_pct) : null,
    is_active: rawConcentrate.is_active,
  }

  // ── Compras de este concentrado ─────────────────────────────
  const { data: rawEntries } = await supabase
    .from('feed_inventory_entries')
    .select('id, bags_received, kg_per_bag, price_per_bag, supplier, lot_number, entry_date, notes')
    .eq('concentrate_id', id)
    .eq('organization_id', orgId)
    .order('entry_date', { ascending: false })

  const entries = (rawEntries ?? []).map(e => ({
    id: e.id,
    bags_received: Number(e.bags_received),
    kg_per_bag: Number(e.kg_per_bag),
    price_per_bag: Number(e.price_per_bag),
    supplier: e.supplier,
    lot_number: e.lot_number,
    entry_date: e.entry_date,
    notes: e.notes,
    total_kg: Number(e.bags_received) * Number(e.kg_per_bag),
    cost_per_kg: Number(e.price_per_bag) / Number(e.kg_per_bag),
  }))

  // ── Consumo de este concentrado ─────────────────────────────
  const { data: rawConsumption } = await supabase
    .from('monthly_feed_records')
    .select('id, batch_id, concentrate_name, production_stage, year, month, kg_used, cost_per_kg')
    .eq('concentrate_id', id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  // Traer nombres de estanques para los batch_ids del consumo
  const batchIds = [...new Set((rawConsumption ?? []).map(r => r.batch_id))]
  let pondMap: Record<string, string> = {}
  let batchPondSpeciesMap: Record<string, { pond_name: string; species: string }> = {}

  if (batchIds.length > 0) {
    const { data: rawBatches } = await supabase
      .from('batches')
      .select('id, pond_id')
      .in('id', batchIds)

    const pondIds = [...new Set((rawBatches ?? []).map(b => b.pond_id))]
    let pondData: Record<string, { name: string; species: string }> = {}

    if (pondIds.length > 0) {
      const { data: rawPonds } = await supabase
        .from('ponds')
        .select('id, name, species')
        .in('id', pondIds)
        .eq('organization_id', orgId)

      for (const p of (rawPonds ?? [])) {
        pondData[p.id] = { name: p.name, species: p.species || 'Pescado' }
      }
    }

    for (const b of (rawBatches ?? [])) {
      const pd = pondData[b.pond_id]
      batchPondSpeciesMap[b.id] = { pond_name: pd?.name ?? 'S/E', species: pd?.species ?? 'Pescado' }
      pondMap[b.id] = pd?.name ?? 'S/E'
    }
  }

  const consumption = (rawConsumption ?? []).map(r => ({
    id: r.id,
    batch_id: r.batch_id,
    pond_name: pondMap[r.batch_id] ?? 'S/E',
    species: batchPondSpeciesMap[r.batch_id]?.species ?? 'Pescado',
    production_stage: (r.production_stage === 'levante' ? 'levante' : 'engorde') as 'levante' | 'engorde',
    year: r.year,
    month: r.month,
    kg_used: Number(r.kg_used),
    cost_per_kg: Number(r.cost_per_kg),
    total_cost: Number(r.kg_used) * Number(r.cost_per_kg),
  }))

  // ── Stock de este concentrado ───────────────────────────────
  const { data: rawStock } = await supabase
    .from('feed_stock_summary')
    .select('total_bags, total_kg_in, total_kg_out, available_kg')
    .eq('concentrate_id', id)
    .eq('organization_id', orgId)
    .single()

  const stock = rawStock ? {
    total_bags: Number(rawStock.total_bags),
    total_kg_in: Number(rawStock.total_kg_in),
    total_kg_out: Number(rawStock.total_kg_out),
    available_kg: Number(rawStock.available_kg),
  } : { total_bags: 0, total_kg_in: 0, total_kg_out: 0, available_kg: 0 }

  // ── Agregados ───────────────────────────────────────────────
  const totalCompradoKg = entries.reduce((sum, e) => sum + e.total_kg, 0)
  const totalCompradoBultos = entries.reduce((sum, e) => sum + e.bags_received, 0)
  const totalConsumidoKg = consumption.reduce((sum, c) => sum + c.kg_used, 0)
  const totalGastado = consumption.reduce((sum, c) => sum + c.total_cost, 0)

  // Consumo por estanque
  const byPond = consumption.reduce<Record<string, { kg: number; cost: number; lastMonth: string }>>((acc, c) => {
    if (!acc[c.pond_name]) acc[c.pond_name] = { kg: 0, cost: 0, lastMonth: '' }
    acc[c.pond_name].kg += c.kg_used
    acc[c.pond_name].cost += c.total_cost
    const monthKey = `${c.year}-${String(c.month).padStart(2, '0')}`
    if (monthKey > acc[c.pond_name].lastMonth) acc[c.pond_name].lastMonth = monthKey
    return acc
  }, {})

  // Consumo por mes
  const byMonth = consumption.reduce<Record<string, { kg: number; cost: number }>>((acc, c) => {
    const key = `${c.year}-${String(c.month).padStart(2, '0')}`
    if (!acc[key]) acc[key] = { kg: 0, cost: 0 }
    acc[key].kg += c.kg_used
    acc[key].cost += c.total_cost
    return acc
  }, {})

  const MONTHS = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ]

  // Datos para el gráfico (orden cronológico)
  const chartData = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, val]) => {
      const [yr, mo] = key.split('-')
      return {
        month: `${MONTHS[Number(mo) - 1]} ${yr}`,
        kg: val.kg,
        cost: val.cost,
      }
    })

  // Timeline: combinar compras y consumo ordenados por fecha
  const timelineEvents = [
    ...entries.map(e => ({
      type: 'entrada' as const,
      date: e.entry_date,
      label: `Compra: ${e.bags_received} bultos (${e.total_kg.toLocaleString()} kg)`,
      detail: `${formatCOP(e.price_per_bag)}/bulto · Lote: ${e.lot_number ?? '—'}`,
    })),
    ...consumption.map(c => ({
      type: 'salida' as const,
      date: `${c.year}-${String(c.month).padStart(2, '0')}-01`,
      label: `Consumo: ${c.kg_used.toLocaleString()} kg en ${c.pond_name}`,
      detail: `${c.production_stage === 'levante' ? 'Levante' : 'Engorde'} · ${formatCOP(c.cost_per_kg)}/kg`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/inventory">
            <Button variant="outline" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {concentrate.name}
            </h1>
            <p className="mt-0.5 text-muted-foreground text-sm">
              {concentrate.brand ? `${concentrate.brand} · ` : ''}
              {concentrate.protein_pct ? `${concentrate.protein_pct}% proteína · ` : ''}
              Precio ref: {formatCOP(concentrate.price_per_kg)}/kg
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium border ${
            concentrate.is_active
              ? 'border-green-500/30 text-green-600 bg-green-50'
              : 'border-muted text-muted-foreground'
          }`}>
            {concentrate.is_active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Gráfico de consumo */}
      {chartData.length > 0 && (
        <Card className="transition-shadow hover:shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Evolución de consumo mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConcentrateConsumptionChart data={chartData} />
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary transition-shadow hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Stock disponible</p>
              <p className="text-xl font-bold leading-tight">{stock.available_kg.toLocaleString()} kg</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500 transition-shadow hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
              <TrendingUp className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total comprado</p>
              <p className="text-xl font-bold leading-tight">{totalCompradoKg.toLocaleString()} kg</p>
              <p className="text-[11px] text-muted-foreground">{totalCompradoBultos} bultos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 transition-shadow hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <TrendingDown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total consumido</p>
              <p className="text-xl font-bold leading-tight">{totalConsumidoKg.toLocaleString()} kg</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 transition-shadow hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Scale className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Gasto acumulado</p>
              <p className="text-xl font-bold leading-tight">{formatCOP(totalGastado)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline visual */}
      {timelineEvents.length > 0 && (
        <Card className="transition-shadow hover:shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Línea de tiempo: compras vs consumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-0">
              {timelineEvents.map((evt, i) => (
                <div key={i} className="flex gap-3 group">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                      evt.type === 'entrada'
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-amber-500 bg-amber-50'
                    }`}>
                      {evt.type === 'entrada' ? (
                        <ArrowDownCircle className="h-3.5 w-3.5 text-sky-600" />
                      ) : (
                        <ArrowUpCircle className="h-3.5 w-3.5 text-amber-600" />
                      )}
                    </div>
                    {i < timelineEvents.length - 1 && (
                      <div className="w-px flex-1 bg-border group-last:hidden min-h-[24px]" />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className="text-xs text-muted-foreground font-medium">{evt.date}</p>
                    <p className={`text-sm font-medium ${
                      evt.type === 'entrada' ? 'text-sky-700' : 'text-amber-700'
                    }`}>
                      {evt.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{evt.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Historial de compras */}
        <Card className="transition-shadow hover:shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Historial de compras
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Bultos</TableHead>
                  <TableHead>Kg total</TableHead>
                  <TableHead>Precio/bulto</TableHead>
                  <TableHead>Lote</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      No hay compras registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(e => (
                    <TableRow key={e.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="font-medium">{e.entry_date}</TableCell>
                      <TableCell>{e.bags_received}</TableCell>
                      <TableCell>{e.total_kg.toLocaleString()} kg</TableCell>
                      <TableCell>{formatCOP(e.price_per_bag)}</TableCell>
                      <TableCell className="text-muted-foreground">{e.lot_number ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Consumo por estanque */}
        <Card className="transition-shadow hover:shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Fish className="h-4 w-4 text-primary" />
              Consumo por estanque
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estanque</TableHead>
                  <TableHead>Kg consumidos</TableHead>
                  <TableHead>Costo acumulado</TableHead>
                  <TableHead>Último mes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(byPond).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      No hay consumo registrado con este concentrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(byPond).map(([pondName, data]) => (
                    <TableRow key={pondName} className="transition-colors hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Fish className="h-4 w-4 text-primary" />
                          {pondName}
                        </div>
                      </TableCell>
                      <TableCell>{data.kg.toLocaleString()} kg</TableCell>
                      <TableCell className="font-semibold text-primary">{formatCOP(data.cost)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {data.lastMonth ? (() => {
                          const [yr, mo] = data.lastMonth.split('-')
                          return `${MONTHS[Number(mo) - 1]} ${yr}`
                        })() : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trazabilidad filtrable */}
      <Card className="transition-shadow hover:shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Trazabilidad: consumo mensual detallado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConcentrateConsumptionFilter consumption={consumption} />
        </CardContent>
      </Card>

      {/* Resumen por mes */}
      {Object.keys(byMonth).length > 0 && (
        <Card className="bg-muted/30 transition-shadow hover:shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen de consumo por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(byMonth)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([key, val]) => {
                  const [yr, mo] = key.split('-')
                  return (
                    <div key={key} className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm transition-colors hover:bg-muted/50">
                      <span className="font-medium text-muted-foreground">{MONTHS[Number(mo) - 1]} {yr}</span>
                      <div className="text-right">
                        <div className="font-bold text-primary">{formatCOP(val.cost)}</div>
                        <div className="text-xs text-muted-foreground">{val.kg.toFixed(0)} kg</div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
