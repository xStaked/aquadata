import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClipboardList, CalendarDays, CalendarRange, CalendarRangeIcon, Eye, Gauge } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { RecordsExport, SingleRecordExport } from '@/components/records-export'
import { DatePicker } from '@/components/ui/date-picker'
import { RecordEditModal } from '@/components/record-edit-modal'
import { formatColombianPhoneNumber } from '@/lib/phone'
import { isWriterRole } from '@/lib/auth/roles'
import { ReadOnlyBanner } from '@/components/read-only-banner'

const PRODUCTION_RECORD_FIELDS = `
  id,
  record_date,
  fish_count,
  feed_kg,
  avg_weight_kg,
  mortality_count,
  temperature_c,
  oxygen_mg_l,
  ammonia_mg_l,
  nitrite_mg_l,
  nitrate_mg_l,
  ph,
  phosphate_mg_l,
  hardness_mg_l,
  alkalinity_mg_l,
  turbidity_ntu,
  daily_gain_g,
  calculated_fca,
  effective_fca,
  fca_source,
  biomass_kg,
  sampling_weight_g,
  record_time,
  notes,
  report_type,
  week_end_date,
  created_at,
  batch_id,
  upload_id,
  upload:uploads(sender_name, sender_phone, source)
`.replace(/\s+/g, ' ').trim()

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ pond?: string; from?: string; to?: string; page?: string; type?: string; view?: string }>
}) {
  const { pond: pondFilter, from: fromDateFilter, to: toDateFilter, page: pageParam, type: typeFilter, view: viewParam } = await searchParams
  const currentView = viewParam === 'readings' ? 'readings' : 'records'
  const currentPage = Number(pageParam) > 0 ? Math.floor(Number(pageParam)) : 1
  const pageSize = 20
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const canEdit = isWriterRole(profile?.role)

  let records: Array<{
    id: string
    record_date: string
    fish_count: number | null
    feed_kg: number | null
    avg_weight_kg: number | null
    mortality_count: number
    temperature_c: number | null
    oxygen_mg_l: number | null
    ammonia_mg_l: number | null
    nitrite_mg_l: number | null
    nitrate_mg_l: number | null
    ph: number | null
    phosphate_mg_l: number | null
    hardness_mg_l: number | null
    alkalinity_mg_l: number | null
    turbidity_ntu: number | null
    daily_gain_g: number | null
    calculated_fca: number | null
    effective_fca: number | null
    fca_source: 'calculated' | 'default' | null
    biomass_kg: number | null
    sampling_weight_g: number | null
    record_time: string | null
    notes: string | null
    report_type: 'daily' | 'weekly' | null
    week_end_date: string | null
    created_at: string
    batch_id: string
    upload_id: string | null
    upload: {
      sender_name: string | null
      sender_phone: string | null
      source: 'web' | 'whatsapp'
    } | null
  }> = []

  let batchPondMap: Record<string, string> = {}
  let batchDataMap: Record<string, {
    start_date: string
    initial_population: number
    current_population: number | null
    pond_entry_date: string | null
    seed_source: string | null
  }> = {}
  let ponds: Array<{ id: string; name: string }> = []
  let totalRecords = 0
  let organizationDefaultFca: number | null = null

  let readings: Array<{
    id: string
    pond_id: string
    batch_id: string | null
    reading_date: string
    reading_time: string | null
    temperature_c: number | null
    oxygen_mg_l: number | null
    notes: string | null
    created_at: string
  }> = []

  let totalReadings = 0

  if (profile?.organization_id) {
    const { data: organization } = await supabase
      .from('organizations')
      .select('default_fca')
      .eq('id', profile.organization_id)
      .single()

    organizationDefaultFca = organization?.default_fca != null ? Number(organization.default_fca) : null

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

      if (currentView === 'records') {
        const { data: allBatches } = await supabase
          .from('batches')
          .select('id, pond_id, start_date, initial_population, current_population, pond_entry_date, seed_source')
          .in('pond_id', pondIds)

        if (allBatches) {
          for (const b of allBatches) {
            const pondName = ponds.find(p => p.id === b.pond_id)?.name ?? ''
            batchPondMap[b.id] = pondName
            batchDataMap[b.id] = {
              start_date: b.start_date,
              initial_population: b.initial_population,
              current_population: b.current_population,
              pond_entry_date: b.pond_entry_date,
              seed_source: b.seed_source,
            }
          }

          const batchIds = allBatches.map(b => b.id)
          if (batchIds.length > 0) {
            let recordsQuery = supabase
              .from('production_records')
              .select(PRODUCTION_RECORD_FIELDS, { count: 'exact' })
              .in('batch_id', batchIds)
              .order('record_date', { ascending: false })
              .order('created_at', { ascending: false })

            if (fromDateFilter) {
              recordsQuery = recordsQuery.gte('record_date', fromDateFilter)
            }

            if (toDateFilter) {
              recordsQuery = recordsQuery.lte('record_date', toDateFilter)
            }

            if (typeFilter === 'daily' || typeFilter === 'weekly') {
              recordsQuery = recordsQuery.eq('report_type', typeFilter)
            }

            const from = (currentPage - 1) * pageSize
            const to = from + pageSize - 1
            const { data: recs, count } = await recordsQuery.range(from, to)

            records = (recs as unknown as typeof records) ?? []
            totalRecords = count ?? 0
          }
        }
      } else {
        // readings view
        let readingsQuery = supabase
          .from('water_quality_readings')
          .select('id, pond_id, batch_id, reading_date, reading_time, temperature_c, oxygen_mg_l, notes, created_at', { count: 'exact' })
          .in('pond_id', pondIds)
          .order('reading_date', { ascending: false })
          .order('reading_time', { ascending: false })

        if (fromDateFilter) {
          readingsQuery = readingsQuery.gte('reading_date', fromDateFilter)
        }

        if (toDateFilter) {
          readingsQuery = readingsQuery.lte('reading_date', toDateFilter)
        }

        const from = (currentPage - 1) * pageSize
        const to = from + pageSize - 1
        const { data: rds, count } = await readingsQuery.range(from, to)

        readings = (rds as unknown as typeof readings) ?? []
        totalReadings = count ?? 0
      }
    }
  }

  const totalItems = currentView === 'records' ? totalRecords : totalReadings
  const currentItems = currentView === 'records' ? records.length : readings.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const hasPrevPage = safeCurrentPage > 1
  const hasNextPage = safeCurrentPage < totalPages
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const endItem = totalItems === 0 ? 0 : startItem + currentItems - 1
  const activePondFilter =
    pondFilter && ponds.some((pond) => pond.id === pondFilter) ? pondFilter : undefined

  const activeTypeFilter = typeFilter === 'daily' || typeFilter === 'weekly' ? typeFilter : undefined

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams()
    if (activePondFilter) params.set('pond', activePondFilter)
    if (fromDateFilter) params.set('from', fromDateFilter)
    if (toDateFilter) params.set('to', toDateFilter)
    if (activeTypeFilter) params.set('type', activeTypeFilter)
    if (currentView === 'readings') params.set('view', 'readings')
    if (page > 1) params.set('page', String(page))
    const query = params.toString()
    return query ? `/dashboard/records?${query}` : '/dashboard/records'
  }

  const buildViewHref = (view: string) => {
    const params = new URLSearchParams()
    if (activePondFilter) params.set('pond', activePondFilter)
    if (fromDateFilter) params.set('from', fromDateFilter)
    if (toDateFilter) params.set('to', toDateFilter)
    if (activeTypeFilter) params.set('type', activeTypeFilter)
    if (view === 'readings') params.set('view', 'readings')
    const query = params.toString()
    return query ? `/dashboard/records?${query}` : '/dashboard/records'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Registros Productivos</h1>
          <p className="mt-1 text-muted-foreground">Historial completo de datos capturados</p>
          <Link
            href="/dashboard/records/periods"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <CalendarRangeIcon className="h-3.5 w-3.5" />
            Ver valores por periodo
          </Link>
        </div>
        {currentView === 'records' ? (
          <RecordsExport
            records={records.map((rec) => ({
              id: rec.id,
              record_date: rec.record_date,
              pond_name: batchPondMap[rec.batch_id] || '-',
              fish_count: rec.fish_count,
              feed_kg: rec.feed_kg,
              avg_weight_g: rec.avg_weight_kg != null ? rec.avg_weight_kg * 1000 : null,
              mortality_count: rec.mortality_count,
              temperature_c: rec.temperature_c,
              oxygen_mg_l: rec.oxygen_mg_l,
              ammonia_mg_l: rec.ammonia_mg_l,
              nitrite_mg_l: rec.nitrite_mg_l,
              ph: rec.ph,
              phosphate_mg_l: rec.phosphate_mg_l,
              hardness_mg_l: rec.hardness_mg_l,
              alkalinity_mg_l: rec.alkalinity_mg_l,
              turbidity_ntu: rec.turbidity_ntu,
              daily_gain_g: rec.daily_gain_g,
              effective_fca: rec.effective_fca,
              fca_source: rec.fca_source,
              biomass_kg: rec.biomass_kg,
              sampling_weight_g: rec.sampling_weight_g,
            }))}
          />
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Link
          href={buildViewHref('records')}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-colors ${
            currentView === 'records'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Reportes de Producción
        </Link>
        <Link
          href={buildViewHref('readings')}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-colors ${
            currentView === 'readings'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
          }`}
        >
          <Gauge className="h-3.5 w-3.5" />
          Lecturas Rápidas
        </Link>
      </div>

      {!canEdit ? <ReadOnlyBanner description="Puedes consultar y exportar registros, pero no editar reportes existentes." /> : null}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            {currentView === 'readings' ? <input type="hidden" name="view" value="readings" /> : null}
            <div className="flex min-w-[220px] flex-col gap-1">
              <label htmlFor="pond" className="text-sm font-medium text-foreground">
                Estanque
              </label>
              <select
                id="pond"
                name="pond"
                defaultValue={pondFilter && ponds.some((pond) => pond.id === pondFilter) ? pondFilter : 'all'}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                {ponds.map((pond) => (
                  <option key={pond.id} value={pond.id}>
                    {pond.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[180px] flex-col gap-1">
              <label htmlFor="from" className="text-sm font-medium text-foreground">
                Desde
              </label>
              <DatePicker
                id="from"
                name="from"
                defaultValue={fromDateFilter ?? ''}
                placeholder="Fecha inicial"
                buttonClassName="justify-between text-sm"
              />
            </div>
            <div className="flex min-w-[180px] flex-col gap-1">
              <label htmlFor="to" className="text-sm font-medium text-foreground">
                Hasta
              </label>
              <DatePicker
                id="to"
                name="to"
                defaultValue={toDateFilter ?? ''}
                placeholder="Fecha final"
                buttonClassName="justify-between text-sm"
              />
            </div>
            <div className="flex min-w-[160px] flex-col gap-1">
              <label htmlFor="type" className="text-sm font-medium text-foreground">
                Tipo
              </label>
              <select
                id="type"
                name="type"
                defaultValue={activeTypeFilter ?? 'all'}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Filtrar
            </button>
            <Link
              href="/dashboard/records"
              className="rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground"
            >
              Limpiar
            </Link>
          </form>
        </CardContent>
      </Card>

      {currentView === 'records' ? (
        <>
          {records.length === 0 ? (
            <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Sin registros</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Sube tu primer reporte fotografico en la seccion de Captura OCR para comenzar.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">
              {totalRecords} registros
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canEdit ? <TableHead className="text-center">Editar</TableHead> : null}
                  <TableHead className="text-center">Detalle</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estanque</TableHead>
                  <TableHead>Subido por</TableHead>
                  <TableHead className="text-right">Días cultivo</TableHead>
                  <TableHead className="text-right">Días lago</TableHead>
                  <TableHead className="text-right">Nº Peces</TableHead>
                  <TableHead className="text-right">Animal actual</TableHead>
                  <TableHead className="text-right">% Sob.</TableHead>
                  <TableHead className="text-right">Alimento (kg)</TableHead>
                  <TableHead className="text-right">Peso prom. (g)</TableHead>
                  <TableHead className="text-right">Peso muestreo (g)</TableHead>
                  <TableHead className="text-right">Mortalidad</TableHead>
                  <TableHead className="text-right">Temp. (C)</TableHead>
                  <TableHead className="text-right">O2 (mg/L)</TableHead>
                  <TableHead className="text-right">NH3</TableHead>
                  <TableHead className="text-right">NO2</TableHead>
                  <TableHead className="text-right">pH</TableHead>
                  <TableHead className="text-right">Fosfato (mg/L)</TableHead>
                  <TableHead className="text-right">Dureza (mg/L)</TableHead>
                  <TableHead className="text-right">Alcalinidad (mg/L)</TableHead>
                  <TableHead className="text-right">Turbidez (NTU)</TableHead>
                  <TableHead className="text-right">Ganancia diaria (g/día)</TableHead>
                  <TableHead className="text-right">FCA</TableHead>
                  <TableHead className="text-right">Biomasa (kg)</TableHead>
                  <TableHead className="text-center">Descargar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => (
                  <TableRow id={`record-${rec.id}`} key={rec.id} className="transition-colors duration-150 hover:bg-muted/50">
                    {canEdit ? (
                      <TableCell className="text-center">
                        <RecordEditModal
                          record={{
                            id: rec.id,
                            record_date: rec.record_date,
                            pond_name: batchPondMap[rec.batch_id] || '-',
                            fish_count: rec.fish_count,
                            feed_kg: rec.feed_kg,
                            avg_weight_g: rec.avg_weight_kg != null ? rec.avg_weight_kg * 1000 : null,
                            biomass_kg: rec.biomass_kg,
                            sampling_weight_g: rec.sampling_weight_g,
                            mortality_count: rec.mortality_count,
                            temperature_c: rec.temperature_c,
                            oxygen_mg_l: rec.oxygen_mg_l,
                            ammonia_mg_l: rec.ammonia_mg_l,
                            nitrite_mg_l: rec.nitrite_mg_l,
                            nitrate_mg_l: rec.nitrate_mg_l,
                            ph: rec.ph,
                            phosphate_mg_l: rec.phosphate_mg_l,
                            hardness_mg_l: rec.hardness_mg_l,
                            alkalinity_mg_l: rec.alkalinity_mg_l,
                            turbidity_ntu: rec.turbidity_ntu,
                            effective_fca: rec.effective_fca,
                            fca_source: rec.fca_source,
                            record_time: rec.record_time,
                            notes: rec.notes,
                          }}
                          defaultFca={organizationDefaultFca}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="text-center">
                      <Link
                        href={`/dashboard/records/${rec.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        aria-label="Ver detalle del reporte"
                        title="Ver detalle del reporte"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {rec.report_type === 'weekly' && rec.week_end_date ? (
                        <span className="whitespace-nowrap">
                          {format(new Date(rec.record_date), 'dd/MM')} – {format(new Date(rec.week_end_date), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        format(new Date(rec.record_date), 'dd/MM/yyyy')
                      )}
                    </TableCell>
                    <TableCell>
                      {rec.report_type === 'weekly' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          <CalendarRange className="h-3 w-3" />
                          Semanal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          Diario
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{batchPondMap[rec.batch_id] || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[180px]">
                        {rec.upload?.sender_name || rec.upload?.sender_phone ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {rec.upload?.sender_name ?? 'Contacto WhatsApp'}
                            </span>
                            {rec.upload?.sender_phone ? (
                              <span className="text-xs text-muted-foreground">
                                {formatColombianPhoneNumber(rec.upload.sender_phone)}
                              </span>
                            ) : null}
                          </div>
                        ) : rec.upload?.source === 'web' || !rec.upload_id ? (
                          <span className="text-sm text-muted-foreground">Panel web</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">WhatsApp</span>
                        )}
                      </div>
                    </TableCell>
                    {(() => {
                      const batchInfo = batchDataMap[rec.batch_id]
                      const diasCultivo = batchInfo
                        ? differenceInDays(new Date(rec.record_date), new Date(batchInfo.start_date))
                        : null
                      const diasLago = batchInfo
                        ? differenceInDays(new Date(rec.record_date), new Date(batchInfo.pond_entry_date ?? batchInfo.start_date))
                        : null
                      const animalActual = batchInfo?.current_population ?? batchInfo?.initial_population ?? null
                      const pctSob = batchInfo && batchInfo.initial_population > 0 && animalActual != null
                        ? (animalActual / batchInfo.initial_population) * 100
                        : null
                      return (
                        <>
                          <TableCell className="text-right">{diasCultivo != null ? diasCultivo : '-'}</TableCell>
                          <TableCell className="text-right">{diasLago != null ? diasLago : '-'}</TableCell>
                          <TableCell className="text-right">{rec.fish_count ?? '-'}</TableCell>
                          <TableCell className="text-right">{animalActual ?? '-'}</TableCell>
                          <TableCell className="text-right">{pctSob != null ? pctSob.toFixed(1) + '%' : '-'}</TableCell>
                        </>
                      )
                    })()}
                    <TableCell className="text-right">{rec.feed_kg?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {rec.avg_weight_kg != null ? (rec.avg_weight_kg * 1000).toFixed(1) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{rec.sampling_weight_g?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {rec.mortality_count > 0 ? (
                        <span className="text-destructive">{rec.mortality_count}</span>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell className="text-right">{rec.temperature_c?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{rec.oxygen_mg_l?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{rec.ammonia_mg_l?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-right">{rec.nitrite_mg_l?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-right">{rec.ph?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{rec.phosphate_mg_l?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-right">{rec.hardness_mg_l?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{rec.alkalinity_mg_l?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{rec.turbidity_ntu?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{rec.daily_gain_g?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span>{rec.effective_fca != null ? rec.effective_fca.toFixed(2) : '-'}</span>
                        {rec.fca_source ? (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {rec.fca_source === 'default' ? 'configurado' : 'calculado'}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {rec.biomass_kg != null ? rec.biomass_kg.toFixed(1) : '-'}
                    </TableCell>

                    <TableCell className="text-center">
                      <SingleRecordExport
                        record={{
                          id: rec.id,
                          record_date: rec.record_date,
                          pond_name: batchPondMap[rec.batch_id] || '-',
                          fish_count: rec.fish_count,
                          feed_kg: rec.feed_kg,
                          avg_weight_g: rec.avg_weight_kg != null ? rec.avg_weight_kg * 1000 : null,
                          biomass_kg: rec.biomass_kg,
                          sampling_weight_g: rec.sampling_weight_g,
                          mortality_count: rec.mortality_count,
                          temperature_c: rec.temperature_c,
                          oxygen_mg_l: rec.oxygen_mg_l,
                          ammonia_mg_l: rec.ammonia_mg_l,
                          nitrite_mg_l: rec.nitrite_mg_l,
                          ph: rec.ph,
                          phosphate_mg_l: rec.phosphate_mg_l,
                          hardness_mg_l: rec.hardness_mg_l,
                          alkalinity_mg_l: rec.alkalinity_mg_l,
                          turbidity_ntu: rec.turbidity_ntu,
                          daily_gain_g: rec.daily_gain_g,
                          effective_fca: rec.effective_fca,
                          fca_source: rec.fca_source,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {startItem}-{endItem} de {totalRecords}
              </p>
              <div className="flex items-center gap-2">
                {hasPrevPage ? (
                  <a
                    href={buildPageHref(safeCurrentPage - 1)}
                    className="rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground"
                  >
                    Anterior
                  </a>
                ) : (
                  <span className="rounded-md border border-input px-3 py-2 text-sm font-medium text-muted-foreground">
                    Anterior
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  Pagina {safeCurrentPage} de {totalPages}
                </span>
                {hasNextPage ? (
                  <a
                    href={buildPageHref(safeCurrentPage + 1)}
                    className="rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground"
                  >
                    Siguiente
                  </a>
                ) : (
                  <span className="rounded-md border border-input px-3 py-2 text-sm font-medium text-muted-foreground">
                    Siguiente
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  ) : (
    <>
      {readings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <Gauge className="h-10 w-10 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Sin lecturas rápidas</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    No hay lecturas de oxígeno y temperatura para los filtros seleccionados.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">
                  {totalReadings} lecturas
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Estanque</TableHead>
                      <TableHead className="text-right">Oxígeno (mg/L)</TableHead>
                      <TableHead className="text-right">Temperatura (°C)</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readings.map((reading) => (
                      <TableRow key={reading.id} className="transition-colors duration-150 hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {format(new Date(reading.reading_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          {reading.reading_time ? reading.reading_time.slice(0, 5) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {ponds.find((p) => p.id === reading.pond_id)?.name || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {reading.oxygen_mg_l != null ? reading.oxygen_mg_l.toFixed(1) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {reading.temperature_c != null ? reading.temperature_c.toFixed(1) : '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {reading.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startItem}-{endItem} de {totalReadings}
                  </p>
                  <div className="flex items-center gap-2">
                    {hasPrevPage ? (
                      <a
                        href={buildPageHref(safeCurrentPage - 1)}
                        className="rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground"
                      >
                        Anterior
                      </a>
                    ) : (
                      <span className="rounded-md border border-input px-3 py-2 text-sm font-medium text-muted-foreground">
                        Anterior
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      Pagina {safeCurrentPage} de {totalPages}
                    </span>
                    {hasNextPage ? (
                      <a
                        href={buildPageHref(safeCurrentPage + 1)}
                        className="rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground"
                      >
                        Siguiente
                      </a>
                    ) : (
                      <span className="rounded-md border border-input px-3 py-2 text-sm font-medium text-muted-foreground">
                        Siguiente
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
