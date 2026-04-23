'use client'

import { startTransition, useState } from 'react'
import { Loader2, Pencil } from 'lucide-react'

import { updateProductionRecord } from '@/app/dashboard/records/actions'
import { calculateCalculatedFca } from '@/lib/fca'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'

interface RecordEditModalProps {
  defaultFca: number | null
  record: {
    id: string
    record_date: string
    pond_name: string
    fish_count: number | null
    feed_kg: number | null
    avg_weight_g: number | null
    biomass_kg: number | null
    sampling_weight_g: number | null
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
    effective_fca: number | null
    fca_source: 'calculated' | 'default' | null
    notes: string | null
  }
}

type FormState = {
  record_date: string
  fish_count: string
  feed_kg: string
  avg_weight_g: string
  biomass_kg: string
  sampling_weight_g: string
  mortality_count: string
  temperature_c: string
  oxygen_mg_l: string
  ammonia_mg_l: string
  nitrite_mg_l: string
  nitrate_mg_l: string
  ph: string
  phosphate_mg_l: string
  hardness_mg_l: string
  alkalinity_mg_l: string
  turbidity_ntu: string
  fca_source: 'calculated' | 'default'
  notes: string
}

function toInputValue(value: number | string | null | undefined) {
  return value == null ? '' : String(value)
}

function buildFormState(record: RecordEditModalProps['record']): FormState {
  return {
    record_date: record.record_date,
    fish_count: toInputValue(record.fish_count),
    feed_kg: toInputValue(record.feed_kg),
    avg_weight_g: toInputValue(record.avg_weight_g),
    biomass_kg: toInputValue(record.biomass_kg),
    sampling_weight_g: toInputValue(record.sampling_weight_g),
    mortality_count: toInputValue(record.mortality_count),
    temperature_c: toInputValue(record.temperature_c),
    oxygen_mg_l: toInputValue(record.oxygen_mg_l),
    ammonia_mg_l: toInputValue(record.ammonia_mg_l),
    nitrite_mg_l: toInputValue(record.nitrite_mg_l),
    nitrate_mg_l: toInputValue(record.nitrate_mg_l),
    ph: toInputValue(record.ph),
    phosphate_mg_l: toInputValue(record.phosphate_mg_l),
    hardness_mg_l: toInputValue(record.hardness_mg_l),
    alkalinity_mg_l: toInputValue(record.alkalinity_mg_l),
    turbidity_ntu: toInputValue(record.turbidity_ntu),
    fca_source: record.fca_source === 'default' ? 'default' : 'calculated',
    notes: record.notes ?? '',
  }
}

function toNullableNumber(value: string) {
  return value === '' ? null : Number(value)
}

function Field({
  id,
  label,
  unit,
  step,
  value,
  onChange,
}: {
  id: string
  label: string
  unit?: string
  step?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {unit ? ` (${unit})` : ''}
      </Label>
      <Input
        id={id}
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export function RecordEditModal({ record, defaultFca }: RecordEditModalProps) {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(() => buildFormState(record))

  const resetState = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setError(null)
      setForm(buildFormState(record))
      setIsSaving(false)
    }
  }

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.record_date) {
      setError('La fecha del registro es obligatoria')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await updateProductionRecord({
        id: record.id,
        record_date: form.record_date,
        fish_count: toNullableNumber(form.fish_count),
        feed_kg: toNullableNumber(form.feed_kg),
        avg_weight_g: toNullableNumber(form.avg_weight_g),
        biomass_kg: toNullableNumber(form.biomass_kg),
        sampling_weight_g: toNullableNumber(form.sampling_weight_g),
        mortality_count: toNullableNumber(form.mortality_count),
        temperature_c: toNullableNumber(form.temperature_c),
        oxygen_mg_l: toNullableNumber(form.oxygen_mg_l),
        ammonia_mg_l: toNullableNumber(form.ammonia_mg_l),
        nitrite_mg_l: toNullableNumber(form.nitrite_mg_l),
        nitrate_mg_l: toNullableNumber(form.nitrate_mg_l),
        ph: toNullableNumber(form.ph),
        phosphate_mg_l: toNullableNumber(form.phosphate_mg_l),
        hardness_mg_l: toNullableNumber(form.hardness_mg_l),
        alkalinity_mg_l: toNullableNumber(form.alkalinity_mg_l),
        turbidity_ntu: toNullableNumber(form.turbidity_ntu),
        fca_source: form.fca_source,
        notes: form.notes.trim() || null,
      })

      toast({
        variant: 'success',
        title: 'Edicion exitosa',
        description: 'El registro se actualizo correctamente.',
      })

      startTransition(() => {
        resetState(false)
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar el registro')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetState}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar registro</DialogTitle>
          <DialogDescription>
            {record.pond_name} · {record.record_date}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          {(() => {
            const { calculated_fca: calculatedFca } = calculateCalculatedFca({
              fish_count: toNullableNumber(form.fish_count),
              feed_kg: toNullableNumber(form.feed_kg),
              avg_weight_g: toNullableNumber(form.avg_weight_g),
              biomass_kg: toNullableNumber(form.biomass_kg),
              mortality_count: toNullableNumber(form.mortality_count),
            })
            const effectiveFca = form.fca_source === 'default' ? defaultFca : calculatedFca

            return (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,220px),1fr]">
                  <div className="space-y-2">
                    <Label htmlFor={`fca-source-${record.id}`}>Fuente de FCA</Label>
                    <Select
                      value={form.fca_source}
                      onValueChange={(value) => setField('fca_source', value as FormState['fca_source'])}
                    >
                      <SelectTrigger id={`fca-source-${record.id}`} className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultFca != null || form.fca_source === 'default' ? (
                          <SelectItem value="default">
                            {defaultFca != null
                              ? `Usar configurado (${defaultFca.toFixed(2)})`
                              : `Usar configurado previo (${record.effective_fca?.toFixed(2) ?? '-'})`}
                          </SelectItem>
                        ) : null}
                        <SelectItem value="calculated">Usar calculado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-md border bg-background px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Calculado</p>
                      <p className="mt-1 font-semibold text-foreground">{calculatedFca != null ? calculatedFca.toFixed(2) : '-'}</p>
                    </div>
                    <div className="rounded-md border bg-background px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Configurado finca</p>
                      <p className="mt-1 font-semibold text-foreground">{defaultFca != null ? defaultFca.toFixed(2) : 'No configurado'}</p>
                    </div>
                    <div className="rounded-md border bg-background px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">FCA efectivo</p>
                      <p className="mt-1 font-semibold text-foreground">{effectiveFca != null ? effectiveFca.toFixed(2) : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`record-date-${record.id}`}>Fecha del registro</Label>
              <DatePicker
                id={`record-date-${record.id}`}
                value={form.record_date}
                onChange={(value) => setField('record_date', value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id={`fish-count-${record.id}`} label="Nº de peces" unit="ind" value={form.fish_count} onChange={(value) => setField('fish_count', value)} />
            <Field id={`feed-kg-${record.id}`} label="Alimento" unit="kg" step="0.1" value={form.feed_kg} onChange={(value) => setField('feed_kg', value)} />
            <Field id={`avg-weight-${record.id}`} label="Peso promedio" unit="g" step="0.1" value={form.avg_weight_g} onChange={(value) => setField('avg_weight_g', value)} />
            <Field id={`biomass-${record.id}`} label="Biomasa" unit="kg" step="0.1" value={form.biomass_kg} onChange={(value) => setField('biomass_kg', value)} />
            <Field id={`sampling-weight-${record.id}`} label="Peso de muestreo" unit="g" step="0.1" value={form.sampling_weight_g} onChange={(value) => setField('sampling_weight_g', value)} />
            <Field id={`mortality-${record.id}`} label="Mortalidad" unit="ind" value={form.mortality_count} onChange={(value) => setField('mortality_count', value)} />
            <Field id={`temperature-${record.id}`} label="Temperatura" unit="C" step="0.1" value={form.temperature_c} onChange={(value) => setField('temperature_c', value)} />
            <Field id={`oxygen-${record.id}`} label="Oxígeno" unit="mg/L" step="0.1" value={form.oxygen_mg_l} onChange={(value) => setField('oxygen_mg_l', value)} />
            <Field id={`ammonia-${record.id}`} label="Amonio" unit="mg/L" step="0.01" value={form.ammonia_mg_l} onChange={(value) => setField('ammonia_mg_l', value)} />
            <Field id={`nitrite-${record.id}`} label="Nitrito" unit="mg/L" step="0.01" value={form.nitrite_mg_l} onChange={(value) => setField('nitrite_mg_l', value)} />
            <Field id={`nitrate-${record.id}`} label="Nitrato" unit="mg/L" step="0.1" value={form.nitrate_mg_l} onChange={(value) => setField('nitrate_mg_l', value)} />
            <Field id={`ph-${record.id}`} label="pH" step="0.1" value={form.ph} onChange={(value) => setField('ph', value)} />
            <Field id={`phosphate-${record.id}`} label="Fosfato" unit="mg/L" step="0.01" value={form.phosphate_mg_l} onChange={(value) => setField('phosphate_mg_l', value)} />
            <Field id={`hardness-${record.id}`} label="Dureza" unit="mg/L" step="1" value={form.hardness_mg_l} onChange={(value) => setField('hardness_mg_l', value)} />
            <Field id={`alkalinity-${record.id}`} label="Alcalinidad" unit="mg/L" step="1" value={form.alkalinity_mg_l} onChange={(value) => setField('alkalinity_mg_l', value)} />
            <Field id={`turbidity-${record.id}`} label="Turbidez" unit="NTU" step="0.1" value={form.turbidity_ntu} onChange={(value) => setField('turbidity_ntu', value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`notes-${record.id}`}>Observaciones</Label>
            <Input
              id={`notes-${record.id}`}
              value={form.notes}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder="Condiciones del estanque, eventos relevantes..."
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => resetState(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
