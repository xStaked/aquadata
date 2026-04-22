import Link from 'next/link'
import { notFound } from 'next/navigation'
import { differenceInDays, format } from 'date-fns'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Droplets,
  Eye,
  Fish,
  FlaskConical,
  Package,
  Waves,
  Wheat,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCOP } from '@/lib/format'

function formatNumber(value: number | null, decimals = 1) {
  if (value == null) return '-'
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function ValueCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

export default async function PondDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  if (!profile?.organization_id) {
    notFound()
  }

  const { data: pond, error: pondError } = await supabase
    .from('ponds')
    .select('id, name, area_m2, depth_m, species, status, created_at')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (pondError || !pond) {
    notFound()
  }

  const { data: batches } = await supabase
    .from('batches')
    .select(`
      id, pond_id, start_date, end_date, initial_population, current_population,
      seed_source, pond_entry_date, status, created_at
    `)
    .eq('pond_id', pond.id)
    .order('start_date', { ascending: false })

  const batchIds = (batches ?? []).map((batch) => batch.id)

  const [
    { data: records },
    { data: feedRecords },
    { data: alerts },
    { data: treatments },
  ] = batchIds.length > 0
    ? await Promise.all([
        supabase
          .from('production_records')
          .select(`
            id, batch_id, record_date, report_type, week_end_date, fish_count, feed_kg, avg_weight_kg,
            mortality_count, oxygen_mg_l, ammonia_mg_l, temperature_c, ph, effective_fca, biomass_kg, created_at
          `)
          .in('batch_id', batchIds)
          .order('record_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('monthly_feed_records')
          .select('id, batch_id, concentrate_name, production_stage, year, month, kg_used, cost_per_kg')
          .in('batch_id', batchIds)
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
        supabase
          .from('alerts')
          .select('id, alert_type, severity, message, is_read, created_at, batch_id')
          .eq('pond_id', pond.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('bioremediation_treatments')
          .select('id, treatment_date, product_name, dose_liters, ammonia_before, ammonia_after, notes')
          .eq('pond_id', pond.id)
          .order('treatment_date', { ascending: false })
          .limit(10),
      ])
    : await Promise.all([
        Promise.resolve({ data: [] as any[] }),
        Promise.resolve({ data: [] as any[] }),
        supabase
          .from('alerts')
          .select('id, alert_type, severity, message, is_read, created_at, batch_id')
          .eq('pond_id', pond.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('bioremediation_treatments')
          .select('id, treatment_date, product_name, dose_liters, ammonia_before, ammonia_after, notes')
          .eq('pond_id', pond.id)
          .order('treatment_date', { ascending: false })
          .limit(10),
      ])

  const recordsByBatch = new Map<string, typeof records>()
  for (const record of records ?? []) {
    const existing = recordsByBatch.get(record.batch_id) ?? []
    existing.push(record)
    recordsByBatch.set(record.batch_id, existing)
  }

  const batchSummaries = (batches ?? []).map((batch) => {
    const batchRecords = [...(recordsByBatch.get(batch.id) ?? [])].sort((a, b) => {
      const dateDiff = new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
      if (dateDiff !== 0) return dateDiff
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    const latestRecord = batchRecords.length > 0 ? batchRecords[batchRecords.length - 1] : null
    const accumulatedMortality = batchRecords.reduce((sum, item) => sum + Number(item.mortality_count ?? 0), 0)
    const accumulatedFeed = batchRecords.reduce((sum, item) => sum + Number(item.feed_kg ?? 0), 0)
    const recentCutoff = new Date()
    recentCutoff.setDate(recentCutoff.getDate() - 15)
    const fortnightlyFeed = batchRecords.reduce((sum, item) => {
      if (new Date(item.record_date) >= recentCutoff) return sum + Number(item.feed_kg ?? 0)
      return sum
    }, 0)
    const animalActual = Math.max(0, Number(batch.initial_population) - accumulatedMortality)
    const survivalPct =
      Number(batch.initial_population) > 0
        ? (animalActual / Number(batch.initial_population)) * 100
        : null

    return {
      ...batch,
      total_records: batchRecords.length,
      latest_record_date: latestRecord?.record_date ?? null,
      latest_biomass_kg: latestRecord?.biomass_kg != null ? Number(latestRecord.biomass_kg) : null,
      latest_avg_weight_g: latestRecord?.avg_weight_kg != null ? Number(latestRecord.avg_weight_kg) * 1000 : null,
      latest_fca: latestRecord?.effective_fca != null ? Number(latestRecord.effective_fca) : null,
      accumulated_mortality: accumulatedMortality,
      accumulated_feed_kg: accumulatedFeed,
      fortnightly_feed_kg: fortnightlyFeed,
      animal_actual: animalActual,
      survival_pct: survivalPct,
      days_culture: differenceInDays(new Date(), new Date(batch.start_date)),
      days_pond: differenceInDays(new Date(), new Date(batch.pond_entry_date ?? batch.start_date)),
    }
  })

  const totalReports = records?.length ?? 0
  const activeBatches = batchSummaries.filter((batch) => batch.status === 'active')
  const totalFeedKg = (feedRecords ?? []).reduce((sum, item) => sum + Number(item.kg_used ?? 0), 0)
  const totalFeedCost = (feedRecords ?? []).reduce(
    (sum, item) => sum + Number(item.kg_used ?? 0) * Number(item.cost_per_kg ?? 0),
    0
  )
  const unreadAlerts = (alerts ?? []).filter((alert) => !alert.is_read).length
  const latestRecord = records && records.length > 0 ? records[0] : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/ponds"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a estanques
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{pond.name}</h1>
            <Badge variant="secondary">{pond.species ?? 'Sin especie'}</Badge>
            <Badge variant="outline">{pond.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista consolidada del estanque con lotes, reportes, alimentación y alertas.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/upload">Subir reporte</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ValueCard label="Lotes activos" value={String(activeBatches.length)} helper={`${batchSummaries.length} lotes registrados`} />
        <ValueCard label="Reportes asociados" value={String(totalReports)} helper="Producción histórica del estanque" />
        <ValueCard label="Alimentación" value={`${formatNumber(totalFeedKg)} kg`} helper={feedRecords && feedRecords.length > 0 ? formatCOP(totalFeedCost) : 'Sin registros mensuales'} />
        <ValueCard label="Oxígeno más reciente" value={latestRecord?.oxygen_mg_l != null ? `${formatNumber(Number(latestRecord.oxygen_mg_l))} mg/L` : '-'} helper={latestRecord ? format(new Date(latestRecord.record_date), 'dd/MM/yyyy') : 'Sin lecturas'} />
        <ValueCard label="Alertas abiertas" value={String(unreadAlerts)} helper={`${alerts?.length ?? 0} alertas recientes`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Package className="h-4 w-4" />
                Resumen Del Estanque
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ValueCard label="Área" value={pond.area_m2 != null ? `${formatNumber(Number(pond.area_m2), 0)} m²` : '-'} />
              <ValueCard label="Profundidad" value={pond.depth_m != null ? `${formatNumber(Number(pond.depth_m), 1)} m` : '-'} />
              <ValueCard label="Fecha creación" value={format(new Date(pond.created_at), 'dd/MM/yyyy')} />
              <ValueCard label="Biomasa más reciente" value={latestRecord?.biomass_kg != null ? `${formatNumber(Number(latestRecord.biomass_kg))} kg` : '-'} />
              <ValueCard label="Amonio más reciente" value={latestRecord?.ammonia_mg_l != null ? `${formatNumber(Number(latestRecord.ammonia_mg_l), 2)} mg/L` : '-'} />
              <ValueCard label="pH más reciente" value={latestRecord?.ph != null ? formatNumber(Number(latestRecord.ph), 1) : '-'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Fish className="h-4 w-4" />
                Lotes Del Estanque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {batchSummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay lotes registrados en este estanque.</p>
              ) : (
                batchSummaries.map((batch) => (
                  <div key={batch.id} className="rounded-xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{batch.status === 'active' ? 'Lote activo' : 'Lote cerrado'}</p>
                          <Badge variant={batch.status === 'active' ? 'default' : 'secondary'}>{batch.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Inicio: {format(new Date(batch.start_date), 'dd/MM/yyyy')}
                          {batch.end_date ? ` · Fin: ${format(new Date(batch.end_date), 'dd/MM/yyyy')}` : ''}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {batch.total_records} reporte{batch.total_records !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <ValueCard label="Días cultivo" value={`${batch.days_culture} días`} />
                      <ValueCard label="Días lago" value={`${batch.days_pond} días`} />
                      <ValueCard label="Animal actual" value={batch.animal_actual.toLocaleString('es-CO')} />
                      <ValueCard label="% sobrevivencia" value={batch.survival_pct != null ? `${formatNumber(batch.survival_pct, 1)}%` : '-'} />
                      <ValueCard label="Consumo acumulado" value={`${formatNumber(batch.accumulated_feed_kg)} kg`} />
                      <ValueCard label="Consumo quincenal" value={`${formatNumber(batch.fortnightly_feed_kg)} kg`} />
                      <ValueCard label="Última biomasa" value={batch.latest_biomass_kg != null ? `${formatNumber(batch.latest_biomass_kg)} kg` : '-'} />
                      <ValueCard label="Origen de semilla" value={batch.seed_source ?? '-'} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ClipboardList className="h-4 w-4" />
                Reportes Asociados
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {records && records.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Detalle</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Peces</TableHead>
                      <TableHead className="text-right">Alimento</TableHead>
                      <TableHead className="text-right">Biomasa</TableHead>
                      <TableHead className="text-right">FCA</TableHead>
                      <TableHead className="text-right">Oxígeno</TableHead>
                      <TableHead className="text-right">Amonio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-center">
                          <Link
                            href={`/dashboard/records/${record.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            title="Ver detalle del reporte"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </TableCell>
                        <TableCell>
                          {record.report_type === 'weekly' && record.week_end_date
                            ? `${format(new Date(record.record_date), 'dd/MM')} - ${format(new Date(record.week_end_date), 'dd/MM/yyyy')}`
                            : format(new Date(record.record_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{record.report_type === 'weekly' ? 'Semanal' : 'Diario'}</TableCell>
                        <TableCell className="text-right">{record.fish_count?.toLocaleString('es-CO') ?? '-'}</TableCell>
                        <TableCell className="text-right">{record.feed_kg != null ? `${formatNumber(Number(record.feed_kg))} kg` : '-'}</TableCell>
                        <TableCell className="text-right">{record.biomass_kg != null ? `${formatNumber(Number(record.biomass_kg))} kg` : '-'}</TableCell>
                        <TableCell className="text-right">{record.effective_fca != null ? formatNumber(Number(record.effective_fca), 2) : '-'}</TableCell>
                        <TableCell className="text-right">{record.oxygen_mg_l != null ? formatNumber(Number(record.oxygen_mg_l), 1) : '-'}</TableCell>
                        <TableCell className="text-right">{record.ammonia_mg_l != null ? formatNumber(Number(record.ammonia_mg_l), 2) : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No hay reportes productivos asociados a este estanque.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Wheat className="h-4 w-4" />
                Alimentación Mensual
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {feedRecords && feedRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Concentrado</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead className="text-right">Kg</TableHead>
                      <TableHead className="text-right">Costo/Kg</TableHead>
                      <TableHead className="text-right">Costo total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedRecords.map((feed) => (
                      <TableRow key={feed.id}>
                        <TableCell>{String(feed.month).padStart(2, '0')}/{feed.year}</TableCell>
                        <TableCell>{feed.concentrate_name}</TableCell>
                        <TableCell className="capitalize">{feed.production_stage}</TableCell>
                        <TableCell className="text-right">{formatNumber(Number(feed.kg_used))} kg</TableCell>
                        <TableCell className="text-right">{formatCOP(Number(feed.cost_per_kg))}</TableCell>
                        <TableCell className="text-right">{formatCOP(Number(feed.kg_used) * Number(feed.cost_per_kg))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No hay registros mensuales de alimentación para este estanque.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Droplets className="h-4 w-4" />
                Última Lectura De Agua
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <ValueCard label="Fecha" value={latestRecord ? format(new Date(latestRecord.record_date), 'dd/MM/yyyy') : '-'} />
              <ValueCard label="Oxígeno" value={latestRecord?.oxygen_mg_l != null ? `${formatNumber(Number(latestRecord.oxygen_mg_l), 1)} mg/L` : '-'} />
              <ValueCard label="Amonio" value={latestRecord?.ammonia_mg_l != null ? `${formatNumber(Number(latestRecord.ammonia_mg_l), 2)} mg/L` : '-'} />
              <ValueCard label="Temperatura" value={latestRecord?.temperature_c != null ? `${formatNumber(Number(latestRecord.temperature_c), 1)} °C` : '-'} />
              <ValueCard label="pH" value={latestRecord?.ph != null ? formatNumber(Number(latestRecord.ph), 1) : '-'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="h-4 w-4" />
                Alertas Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts && alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'}>
                        {alert.severity}
                      </Badge>
                      {!alert.is_read ? <Badge variant="secondary">Sin leer</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm text-foreground">{alert.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay alertas recientes para este estanque.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FlaskConical className="h-4 w-4" />
                Tratamientos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {treatments && treatments.length > 0 ? (
                treatments.map((treatment) => (
                  <div key={treatment.id} className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{treatment.product_name}</p>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(treatment.treatment_date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Dosis: {formatNumber(Number(treatment.dose_liters), 1)} L
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      NH3 antes: {treatment.ammonia_before != null ? formatNumber(Number(treatment.ammonia_before), 2) : '-'} ·
                      después: {treatment.ammonia_after != null ? formatNumber(Number(treatment.ammonia_after), 2) : '-'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay tratamientos recientes en este estanque.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
