'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClipboardEdit, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { confirmProductionRecord } from '@/app/dashboard/upload/actions'

interface Batch {
  id: string
  pond_name: string
  start_date: string
  status: string
}

export function ManualRecordForm({ batches }: { batches: Batch[] }) {
  const [selectedBatch, setSelectedBatch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [formData, setFormData] = useState({
    record_date: new Date().toISOString().split('T')[0],
    feed_kg: '',
    avg_weight_g: '',
    mortality_count: '',
    temperature_c: '',
    oxygen_mg_l: '',
    ammonia_mg_l: '',
    nitrite_mg_l: '',
    nitrate_mg_l: '',
    ph: '',
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
        feed_kg: toNum(formData.feed_kg),
        avg_weight_g: toNum(formData.avg_weight_g),
        mortality_count: toNum(formData.mortality_count),
        temperature_c: toNum(formData.temperature_c),
        oxygen_mg_l: toNum(formData.oxygen_mg_l),
        ammonia_mg_l: toNum(formData.ammonia_mg_l),
        nitrite_mg_l: toNum(formData.nitrite_mg_l),
        nitrate_mg_l: toNum(formData.nitrate_mg_l),
        ph: toNum(formData.ph),
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
      feed_kg: '',
      avg_weight_g: '',
      mortality_count: '',
      temperature_c: '',
      oxygen_mg_l: '',
      ammonia_mg_l: '',
      nitrite_mg_l: '',
      nitrate_mg_l: '',
      ph: '',
      notes: '',
    })
  }

  if (batches.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">No hay lotes activos</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Primero debes crear un estanque y un lote activo en la seccion de Estanques.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle className="h-12 w-12 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Registro guardado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Los datos han sido guardados exitosamente.
            </p>
          </div>
          <Button onClick={resetForm}>Crear otro registro</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ClipboardEdit className="h-5 w-5 text-primary" />
            Datos de Produccion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Lote</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un lote" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.pond_name} - Inicio: {b.start_date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="m_record_date">Fecha</Label>
              <Input
                id="m_record_date"
                type="date"
                value={formData.record_date}
                onChange={(e) => updateField('record_date', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="m_feed_kg">Alimento (kg)</Label>
                <Input
                  id="m_feed_kg"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.feed_kg}
                  onChange={(e) => updateField('feed_kg', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="m_avg_weight_g">Peso prom. (g)</Label>
                <Input
                  id="m_avg_weight_g"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.avg_weight_g}
                  onChange={(e) => updateField('avg_weight_g', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="m_mortality_count">Mortalidad</Label>
                <Input
                  id="m_mortality_count"
                  type="number"
                  placeholder="0"
                  value={formData.mortality_count}
                  onChange={(e) => updateField('mortality_count', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="m_temperature_c">Temp. (°C)</Label>
                <Input
                  id="m_temperature_c"
                  type="number"
                  step="0.1"
                  placeholder="28.0"
                  value={formData.temperature_c}
                  onChange={(e) => updateField('temperature_c', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ClipboardEdit className="h-5 w-5 text-primary" />
            Calidad de Agua
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="m_oxygen_mg_l">Oxigeno (mg/L)</Label>
              <Input
                id="m_oxygen_mg_l"
                type="number"
                step="0.1"
                placeholder="6.0"
                value={formData.oxygen_mg_l}
                onChange={(e) => updateField('oxygen_mg_l', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="m_ammonia_mg_l">Amonio (mg/L)</Label>
                <Input
                  id="m_ammonia_mg_l"
                  type="number"
                  step="0.01"
                  placeholder="0.0"
                  value={formData.ammonia_mg_l}
                  onChange={(e) => updateField('ammonia_mg_l', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="m_nitrite_mg_l">Nitritos (mg/L)</Label>
                <Input
                  id="m_nitrite_mg_l"
                  type="number"
                  step="0.01"
                  placeholder="0.0"
                  value={formData.nitrite_mg_l}
                  onChange={(e) => updateField('nitrite_mg_l', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="m_nitrate_mg_l">Nitratos (mg/L)</Label>
                <Input
                  id="m_nitrate_mg_l"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.nitrate_mg_l}
                  onChange={(e) => updateField('nitrate_mg_l', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="m_ph">pH</Label>
                <Input
                  id="m_ph"
                  type="number"
                  step="0.1"
                  placeholder="7.5"
                  value={formData.ph}
                  onChange={(e) => updateField('ph', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="m_notes">Notas</Label>
              <Input
                id="m_notes"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Observaciones adicionales..."
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={handleSubmit} disabled={isSubmitting || !selectedBatch}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Registro'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
