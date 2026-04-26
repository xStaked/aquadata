'use client'

import { useEffect, useState } from 'react'
import { calculateCalculatedFca } from '@/lib/fca'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Fish,
  Droplets,
  Calculator,
  CalendarDays,
  CalendarRange,
} from 'lucide-react'
import { confirmProductionRecord } from '@/app/dashboard/upload/actions'
import { BatchSummaryCard } from '@/components/batch-summary-card'
import { BatchContextFields } from '@/components/batch-context-fields'

interface Batch {
  id: string
  pond_name: string
  start_date: string
  status: string
  estimated_fish_count: number | null
}

type FcaMode = 'default' | 'calculated'
type ReportType = 'daily' | 'weekly'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function FieldLabel({
  children,
  htmlFor,
  unit,
}: {
  children: React.ReactNode
  htmlFor?: string
  unit?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
    >
      {children}
      {unit && (
        <span className="rounded px-1.5 py-px text-[9px] font-semibold bg-accent/10 text-accent">
          {unit}
        </span>
      )}
    </label>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  variant,
}: {
  icon: React.ElementType
  title: string
  variant: 'primary' | 'accent'
}) {
  const isPrimary = variant === 'primary'
  return (
    <div
      className={`flex items-center gap-3 border-b pb-3 ${
        isPrimary ? 'border-primary/20' : 'border-accent/20'
      }`}
    >
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-md ${
          isPrimary
            ? 'bg-primary/10 text-primary'
            : 'bg-accent/10 text-accent'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span
        className={`text-[11px] font-bold uppercase tracking-widest ${
          isPrimary ? 'text-primary' : 'text-accent'
        }`}
      >
        {title}
      </span>
    </div>
  )
}

export function ManualRecordForm({
  batches,
  defaultFca,
}: {
  batches: Batch[]
  defaultFca: number | null
}) {
  const [resolvedDefaultFca, setResolvedDefaultFca] = useState<number | null>(defaultFca)
  const [selectedBatch, setSelectedBatch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [fcaMode, setFcaMode] = useState<FcaMode>(defaultFca != null ? 'default' : 'calculated')
  const [reportType, setReportType] = useState<ReportType>('daily')

  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    record_date: today,
    week_end_date: addDays(today, 6),
    fish_count: '',
    feed_kg: '',
    avg_weight_g: '',
    biomass_kg: '',
    sampling_weight_g: '',
    mortality_count: '',
    temperature_c: '',
    oxygen_mg_l: '',
    ammonia_mg_l: '',
    nitrite_mg_l: '',
    nitrate_mg_l: '',
    ph: '',
    phosphate_mg_l: '',
    hardness_mg_l: '',
    alkalinity_mg_l: '',
    turbidity_ntu: '',
    record_time: '',
    notes: '',
  })

  useEffect(() => {
    let cancelled = false

    const loadDefaultFca = async () => {
      try {
        const response = await fetch('/api/organization/default-fca', { cache: 'no-store' })
        if (!response.ok) return

        const result = await response.json()
        if (cancelled) return

        const nextDefaultFca =
          typeof result.defaultFca === 'number' && Number.isFinite(result.defaultFca)
            ? result.defaultFca
            : null

        setResolvedDefaultFca(nextDefaultFca)
        setFcaMode((current) =>
          current === 'default' || nextDefaultFca == null ? current : 'default'
        )
      } catch {
        // Keep server-rendered fallback when the refresh request fails.
      }
    }

    void loadDefaultFca()

    return () => {
      cancelled = true
    }
  }, [])

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toNum = (v: string) => (v === '' ? null : Number(v))
  const selectedBatchPopulation =
    batches.find((batch) => batch.id === selectedBatch)?.estimated_fish_count ?? null

  const handleSubmit = async () => {
    if (!selectedBatch) {
      setError('Selecciona un lote')
      return
    }
    if (!formData.record_date) {
      setError('La fecha es obligatoria')
      return
    }
    if (formData.biomass_kg === '' || Number(formData.biomass_kg) <= 0) {
      setError('La biomasa es obligatoria y debe ser mayor a 0')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await confirmProductionRecord({
        batch_id: selectedBatch,
        record_date: formData.record_date,
        report_type: reportType,
        week_end_date: reportType === 'weekly' ? formData.week_end_date : null,
        fish_count: toNum(formData.fish_count) ?? selectedBatchPopulation,
        feed_kg: toNum(formData.feed_kg),
        avg_weight_g: toNum(formData.avg_weight_g),
        biomass_kg: toNum(formData.biomass_kg),
        sampling_weight_g: toNum(formData.sampling_weight_g),
        mortality_count: toNum(formData.mortality_count),
        temperature_c: toNum(formData.temperature_c),
        oxygen_mg_l: toNum(formData.oxygen_mg_l),
        ammonia_mg_l: toNum(formData.ammonia_mg_l),
        nitrite_mg_l: toNum(formData.nitrite_mg_l),
        nitrate_mg_l: toNum(formData.nitrate_mg_l),
        ph: toNum(formData.ph),
        phosphate_mg_l: toNum(formData.phosphate_mg_l),
        hardness_mg_l: toNum(formData.hardness_mg_l),
        alkalinity_mg_l: toNum(formData.alkalinity_mg_l),
        turbidity_ntu: toNum(formData.turbidity_ntu),
        record_time: formData.record_time || null,
        notes: formData.notes || null,
        fca_source: fcaMode,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReportTypeChange = (type: ReportType) => {
    setReportType(type)
    if (type === 'weekly') {
      setFormData((prev) => ({
        ...prev,
        week_end_date: addDays(prev.record_date, 6),
      }))
    }
  }

  const resetForm = () => {
    setDone(false)
    setError(null)
    setSelectedBatch('')
    setReportType('daily')
    setFcaMode(resolvedDefaultFca != null ? 'default' : 'calculated')
    setFormData({
      record_date: today,
      week_end_date: addDays(today, 6),
      fish_count: '',
      feed_kg: '',
      avg_weight_g: '',
      biomass_kg: '',
      sampling_weight_g: '',
      mortality_count: '',
      temperature_c: '',
      oxygen_mg_l: '',
      ammonia_mg_l: '',
      nitrite_mg_l: '',
      nitrate_mg_l: '',
      ph: '',
      phosphate_mg_l: '',
      hardness_mg_l: '',
      alkalinity_mg_l: '',
      turbidity_ntu: '',
      record_time: '',
      notes: '',
    })
  }

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">No hay lotes activos</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Primero debes crear un estanque y un lote activo en la sección de Estanques.
          </p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card py-16 text-center shadow-sm">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Registro guardado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Los datos han sido registrados exitosamente.
          </p>
        </div>
        <Button onClick={resetForm} className="px-8">
          Nuevo registro
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Registro de Producción
        </p>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Manual
        </span>
      </div>

      <div className="space-y-8 p-6">
        {/* ── Tipo de Reporte ── */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleReportTypeChange('daily')}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-colors ${
              reportType === 'daily'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Diario
          </button>
          <button
            type="button"
            onClick={() => handleReportTypeChange('weekly')}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-colors ${
              reportType === 'weekly'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            Semanal
          </button>
        </div>

        {/* ── Lote & Fecha ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="m_batch">Lote / Estanque</FieldLabel>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger id="m_batch" className="h-9">
                <SelectValue placeholder="Selecciona un lote" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.pond_name} — Inicio: {b.start_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reportType === 'daily' ? (
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_record_date">Fecha del registro</FieldLabel>
              <div className="flex items-center gap-2">
                <DatePicker
                  id="m_record_date"
                  value={formData.record_date}
                  onChange={(value) => updateField('record_date', value)}
                  buttonClassName="h-9 flex-1"
                />
                <input
                  id="m_record_time"
                  type="time"
                  value={formData.record_time}
                  onChange={(e) => updateField('record_time', e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <FieldLabel>Semana</FieldLabel>
              <div className="flex items-center gap-2">
                <DatePicker
                  id="m_record_date"
                  value={formData.record_date}
                  onChange={(value) => {
                    updateField('record_date', value)
                    setFormData((prev) => ({ ...prev, record_date: value, week_end_date: addDays(value, 6) }))
                  }}
                  buttonClassName="h-9 flex-1"
                />
                <input
                  id="m_record_time_weekly"
                  type="time"
                  value={formData.record_time}
                  onChange={(e) => updateField('record_time', e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <span className="text-xs text-muted-foreground shrink-0">al</span>
                <DatePicker
                  id="m_week_end_date"
                  value={formData.week_end_date}
                  onChange={(value) => updateField('week_end_date', value)}
                  buttonClassName="h-9 flex-1"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {selectedBatch ? (
            <>
              <BatchContextFields batchId={selectedBatch} />
              <BatchSummaryCard batchId={selectedBatch} />
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                Selecciona un lote para ver días de cultivo, días en lago, consumo, sobrevivencia, biomasa y origen de semilla.
              </p>
            </div>
          )}
        </div>

        {/* ── Datos de Producción ── */}
        <div className="space-y-4">
          <SectionHeader icon={Fish} title="Datos de Producción" variant="primary" />
          {reportType === 'weekly' && (
            <p className="text-[11px] text-muted-foreground">
              Para reporte semanal: ingresa alimento y mortalidad <span className="font-semibold text-foreground">totales</span> de la semana; peso promedio y calidad del agua como <span className="font-semibold text-foreground">promedio</span>.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_fish_count" unit="ind">Nº de Peces</FieldLabel>
              <Input
                id="m_fish_count"
                type="number"
                placeholder="0"
                className="h-9"
                value={formData.fish_count}
                onChange={(e) => updateField('fish_count', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_feed_kg" unit="kg">
                {reportType === 'weekly' ? 'Alimento total' : 'Alimento'}
              </FieldLabel>
              <Input
                id="m_feed_kg"
                type="number"
                step="0.1"
                placeholder="0.0"
                className="h-9"
                value={formData.feed_kg}
                onChange={(e) => updateField('feed_kg', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_avg_weight_g" unit="g">Peso promedio</FieldLabel>
              <Input
                id="m_avg_weight_g"
                type="number"
                step="0.1"
                placeholder="0.0"
                className="h-9"
                value={formData.avg_weight_g}
                onChange={(e) => updateField('avg_weight_g', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_biomass_kg" unit="kg">
                Biomasa <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="m_biomass_kg"
                type="number"
                step="0.1"
                placeholder="0.0"
                className="h-9"
                value={formData.biomass_kg}
                onChange={(e) => updateField('biomass_kg', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_sampling_weight_g" unit="g">Peso de muestreo</FieldLabel>
              <Input
                id="m_sampling_weight_g"
                type="number"
                step="0.1"
                placeholder="0.0"
                className="h-9"
                value={formData.sampling_weight_g}
                onChange={(e) => updateField('sampling_weight_g', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_mortality_count" unit="ind">
                {reportType === 'weekly' ? 'Mortalidad total' : 'Mortalidad'}
              </FieldLabel>
              <Input
                id="m_mortality_count"
                type="number"
                placeholder="0"
                className="h-9"
                value={formData.mortality_count}
                onChange={(e) => updateField('mortality_count', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Valores Calculados ── */}
        {(() => {
          const resolvedFishCount =
            formData.fish_count !== '' ? Number(formData.fish_count) : selectedBatchPopulation
          const manualBiomass = formData.biomass_kg !== '' ? Number(formData.biomass_kg) : null
          const { biomass_kg: biomasaCalculada, calculated_fca: fcaCalculado } = calculateCalculatedFca({
            fish_count: resolvedFishCount,
            avg_weight_g: formData.avg_weight_g !== '' ? Number(formData.avg_weight_g) : null,
            biomass_kg: manualBiomass,
            feed_kg: formData.feed_kg !== '' ? Number(formData.feed_kg) : null,
            mortality_count: formData.mortality_count !== '' ? Number(formData.mortality_count) : 0,
          })
          const biomasa = manualBiomass ?? biomasaCalculada
          const fcaEfectivo = fcaMode === 'default' ? resolvedDefaultFca : fcaCalculado
          return (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Calculator className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Valores Calculados
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Biomasa
                    <span className="ml-1.5 rounded px-1.5 py-px text-[9px] font-semibold bg-primary/10 text-primary">kg</span>
                  </p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {biomasa !== null ? biomasa.toFixed(2) : <span className="text-sm font-normal text-muted-foreground">Ingresa nº peces y peso</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">(peces − mortalidad) × peso prom.</p>
                  {formData.fish_count === '' && selectedBatchPopulation != null ? (
                    <p className="text-[10px] text-muted-foreground">
                      Usando población actual del lote: {selectedBatchPopulation}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Conversión Alimenticia
                    <span className="ml-1.5 rounded px-1.5 py-px text-[9px] font-semibold bg-primary/10 text-primary">FCA</span>
                  </p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {fcaEfectivo !== null ? fcaEfectivo.toFixed(2) : <span className="text-sm font-normal text-muted-foreground">Ingresa alimento y biomasa</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {fcaMode === 'default'
                      ? 'Usando FCA por defecto de la finca'
                      : 'Usando FCA calculado desde el reporte'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-md border border-primary/15 bg-background/70 p-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Fuente de FCA
                  </p>
                  <Select value={fcaMode} onValueChange={(value) => setFcaMode(value as FcaMode)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {resolvedDefaultFca != null ? (
                        <SelectItem value="default">Usar configurado ({resolvedDefaultFca.toFixed(2)})</SelectItem>
                      ) : null}
                      <SelectItem value="calculated">Usar calculado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Calculado: {fcaCalculado != null ? fcaCalculado.toFixed(2) : '-'}</p>
                  <p>Configurado finca: {resolvedDefaultFca != null ? resolvedDefaultFca.toFixed(2) : 'No configurado'}</p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Calidad del Agua ── */}
        <div className="space-y-4">
          <SectionHeader
            icon={Droplets}
            title={reportType === 'weekly' ? 'Calidad del Agua (promedios)' : 'Calidad del Agua'}
            variant="accent"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_temperature_c" unit="°C">Temperatura</FieldLabel>
              <Input
                id="m_temperature_c"
                type="number"
                step="0.1"
                placeholder="28.0"
                className="h-9"
                value={formData.temperature_c}
                onChange={(e) => updateField('temperature_c', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_oxygen_mg_l" unit="mg/L">Oxígeno</FieldLabel>
              <Input
                id="m_oxygen_mg_l"
                type="number"
                step="0.1"
                placeholder="6.0"
                className="h-9"
                value={formData.oxygen_mg_l}
                onChange={(e) => updateField('oxygen_mg_l', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_ph">pH</FieldLabel>
              <Input
                id="m_ph"
                type="number"
                step="0.1"
                placeholder="7.5"
                className="h-9"
                value={formData.ph}
                onChange={(e) => updateField('ph', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_ammonia_mg_l" unit="mg/L">Amonio NH₃</FieldLabel>
              <Input
                id="m_ammonia_mg_l"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-9"
                value={formData.ammonia_mg_l}
                onChange={(e) => updateField('ammonia_mg_l', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_nitrite_mg_l" unit="mg/L">Nitritos NO₂</FieldLabel>
              <Input
                id="m_nitrite_mg_l"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-9"
                value={formData.nitrite_mg_l}
                onChange={(e) => updateField('nitrite_mg_l', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_nitrate_mg_l" unit="mg/L">Nitratos NO₃</FieldLabel>
              <Input
                id="m_nitrate_mg_l"
                type="number"
                step="0.1"
                placeholder="0.0"
                className="h-9"
                value={formData.nitrate_mg_l}
                onChange={(e) => updateField('nitrate_mg_l', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_phosphate_mg_l" unit="mg/L">Fosfato</FieldLabel>
              <Input
                id="m_phosphate_mg_l"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-9"
                value={formData.phosphate_mg_l}
                onChange={(e) => updateField('phosphate_mg_l', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_hardness_mg_l" unit="mg/L">Dureza</FieldLabel>
              <Input
                id="m_hardness_mg_l"
                type="number"
                step="1"
                placeholder="0"
                className="h-9"
                value={formData.hardness_mg_l}
                onChange={(e) => updateField('hardness_mg_l', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_alkalinity_mg_l" unit="mg/L">Alcalinidad</FieldLabel>
              <Input
                id="m_alkalinity_mg_l"
                type="number"
                step="1"
                placeholder="0"
                className="h-9"
                value={formData.alkalinity_mg_l}
                onChange={(e) => updateField('alkalinity_mg_l', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="m_turbidity_ntu" unit="NTU">Turbidez</FieldLabel>
              <Input
                id="m_turbidity_ntu"
                type="number"
                step="0.1"
                placeholder="0.0"
                className="h-9"
                value={formData.turbidity_ntu}
                onChange={(e) => updateField('turbidity_ntu', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Observaciones ── */}
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="m_notes">Observaciones</FieldLabel>
          <Input
            id="m_notes"
            className="h-9"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Condiciones del estanque, eventos relevantes..."
          />
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Submit ── */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedBatch}
          className="h-10 w-full text-sm font-semibold tracking-wide"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando registro...
            </>
          ) : (
            'Guardar Registro'
          )}
        </Button>
      </div>
    </div>
  )
}
