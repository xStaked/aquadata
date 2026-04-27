'use client'

import { useEffect, useState } from 'react'
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
import { Loader2, CheckCircle2, AlertCircle, Thermometer, Wind } from 'lucide-react'
import { confirmWaterQualityReading } from '@/app/dashboard/upload/actions'

interface Pond {
  id: string
  name: string
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

export function QuickWaterReadingForm({ ponds }: { ponds: Pond[] }) {
  const [selectedPond, setSelectedPond] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    reading_date: today,
    reading_time: '',
    temperature_c: '',
    oxygen_mg_l: '',
    notes: '',
  })

  // Pre-select pond from URL query param
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const pondId = params.get('pond_id')
    if (pondId && ponds.some((p) => p.id === pondId)) {
      setSelectedPond(pondId)
    }
  }, [ponds])

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toNum = (v: string) => (v === '' ? null : Number(v))

  const handleSubmit = async () => {
    if (!selectedPond) {
      setError('Selecciona un estanque')
      return
    }
    if (!formData.reading_date) {
      setError('La fecha es obligatoria')
      return
    }
    if (formData.temperature_c === '' && formData.oxygen_mg_l === '') {
      setError('Ingresa al menos temperatura u oxígeno')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await confirmWaterQualityReading({
        pond_id: selectedPond,
        reading_date: formData.reading_date,
        reading_time: formData.reading_time || null,
        temperature_c: toNum(formData.temperature_c),
        oxygen_mg_l: toNum(formData.oxygen_mg_l),
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
    setSelectedPond('')
    setFormData({
      reading_date: today,
      reading_time: '',
      temperature_c: '',
      oxygen_mg_l: '',
      notes: '',
    })
  }

  if (ponds.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">No hay estanques</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Primero debes crear un estanque en la sección de Estanques.
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
          <h3 className="text-lg font-bold text-foreground">Lectura guardada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Los datos de oxígeno y temperatura han sido registrados.
          </p>
        </div>
        <Button onClick={resetForm} className="px-8">
          Nueva lectura
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Lectura Rápida de Calidad de Agua
        </p>
        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Oxígeno / Temperatura
        </span>
      </div>

      <div className="space-y-6 p-6">
        {/* Estanque & Fecha */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="q_pond">Estanque</FieldLabel>
            <Select value={selectedPond} onValueChange={setSelectedPond}>
              <SelectTrigger id="q_pond" className="h-9">
                <SelectValue placeholder="Selecciona un estanque" />
              </SelectTrigger>
              <SelectContent>
                {ponds.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="q_date">Fecha de lectura</FieldLabel>
            <div className="flex items-center gap-2">
              <DatePicker
                id="q_date"
                value={formData.reading_date}
                onChange={(value) => updateField('reading_date', value)}
                buttonClassName="h-9 flex-1"
              />
              <input
                id="q_time"
                type="time"
                value={formData.reading_time}
                onChange={(e) => updateField('reading_time', e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* O₂ y T */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="q_oxygen" unit="mg/L">
              <Wind className="h-3 w-3" />
              Oxígeno
            </FieldLabel>
            <Input
              id="q_oxygen"
              type="number"
              step="0.1"
              placeholder="6.0"
              className="h-9"
              value={formData.oxygen_mg_l}
              onChange={(e) => updateField('oxygen_mg_l', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="q_temp" unit="°C">
              <Thermometer className="h-3 w-3" />
              Temperatura
            </FieldLabel>
            <Input
              id="q_temp"
              type="number"
              step="0.1"
              placeholder="28.0"
              className="h-9"
              value={formData.temperature_c}
              onChange={(e) => updateField('temperature_c', e.target.value)}
            />
          </div>
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="q_notes">Observaciones</FieldLabel>
          <Input
            id="q_notes"
            className="h-9"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Condiciones del momento, hora del día..."
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedPond}
          className="h-10 w-full text-sm font-semibold tracking-wide"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando lectura...
            </>
          ) : (
            'Guardar Lectura'
          )}
        </Button>
      </div>
    </div>
  )
}
