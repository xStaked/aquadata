'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'
import { confirmProductionRecord } from '@/app/dashboard/upload/actions'

interface Batch {
  id: string
  pond_name: string
  start_date: string
  status: string
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

export function ManualRecordForm({ batches }: { batches: Batch[] }) {
  const [selectedBatch, setSelectedBatch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [formData, setFormData] = useState({
    record_date: new Date().toISOString().split('T')[0],
    fish_count: '',
    feed_kg: '',
    avg_weight_g: '',
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
    notes: '',
  })

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toNum = (v: string) => (v === '' ? null : Number(v))

  const handleSubmit = async () => {
    if (!selectedBatch) {
      setError('Selecciona un lote')
      return
    }
    if (!formData.record_date) {
      setError('La fecha es obligatoria')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await confirmProductionRecord({
        batch_id: selectedBatch,
        record_date: formData.record_date,
        fish_count: toNum(formData.fish_count),
        feed_kg: toNum(formData.feed_kg),
        avg_weight_g: toNum(formData.avg_weight_g),
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
        notes: formData.notes || null,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setDone(false)
    setError(null)
    setSelectedBatch('')
    setFormData({
      record_date: new Date().toISOString().split('T')[0],
      fish_count: '',
      feed_kg: '',
      avg_weight_g: '',
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
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="m_record_date">Fecha del registro</FieldLabel>
            <Input
              id="m_record_date"
              type="date"
              className="h-9"
              value={formData.record_date}
              onChange={(e) => updateField('record_date', e.target.value)}
            />
          </div>
        </div>

        {/* ── Datos de Producción ── */}
        <div className="space-y-4">
          <SectionHeader icon={Fish} title="Datos de Producción" variant="primary" />
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
              <FieldLabel htmlFor="m_feed_kg" unit="kg">Alimento</FieldLabel>
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
              <FieldLabel htmlFor="m_mortality_count" unit="ind">Mortalidad</FieldLabel>
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
          const fishCount = formData.fish_count !== '' ? Number(formData.fish_count) : null
          const avgWeight = formData.avg_weight_g !== '' ? Number(formData.avg_weight_g) : null
          const feedKg = formData.feed_kg !== '' ? Number(formData.feed_kg) : null
          const mortality = formData.mortality_count !== '' ? Number(formData.mortality_count) : 0
          const effectiveFish = Math.max(0, (fishCount ?? 0) - mortality)
          const biomasa = fishCount && avgWeight ? effectiveFish * avgWeight : null
          const fca = feedKg && biomasa && biomasa > 0 ? feedKg / biomasa : null
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
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Conversión Alimenticia
                    <span className="ml-1.5 rounded px-1.5 py-px text-[9px] font-semibold bg-primary/10 text-primary">FCA</span>
                  </p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {fca !== null ? fca.toFixed(2) : <span className="text-sm font-normal text-muted-foreground">Ingresa alimento y biomasa</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">consumo / biomasa</p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Calidad del Agua ── */}
        <div className="space-y-4">
          <SectionHeader icon={Droplets} title="Calidad del Agua" variant="accent" />
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
