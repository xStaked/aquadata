'use client'

import React from "react"

import { useState, useRef } from 'react'
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
import { Camera, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { confirmProductionRecord } from '@/app/dashboard/upload/actions'

interface Batch {
  id: string
  pond_name: string
  start_date: string
  status: string
}

interface OcrResult {
  record_date: string | null
  feed_kg: number | null
  avg_weight_g: number | null
  mortality_count: number | null
  temperature_c: number | null
  oxygen_mg_l: number | null
  ammonia_mg_l: number | null
  nitrite_mg_l: number | null
  nitrate_mg_l: number | null
  ph: number | null
  notes: string | null
  confidence: {
    record_date: number
    feed_kg: number
    avg_weight_g: number
    mortality_count: number
    temperature_c: number
    oxygen_mg_l: number
    ammonia_mg_l: number
    nitrite_mg_l: number
    nitrate_mg_l: number
    ph: number
  }
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 80
      ? 'bg-emerald-100 text-emerald-800'
      : value >= 50
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-800'
  return (
    <span className={cn('ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', color)}>
      {value}%
    </span>
  )
}

export function UploadForm({ batches }: { batches: Batch[] }) {
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'done'>('upload')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ocrData, setOcrData] = useState<OcrResult | null>(null)
  const [editedData, setEditedData] = useState<Partial<OcrResult>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Send to OCR
    setStep('processing')
    setError(null)

    try {
      const base64Reader = new FileReader()
      const base64Promise = new Promise<string>((resolve) => {
        base64Reader.onload = () => {
          const result = base64Reader.result as string
          const base64 = result.split(',')[1]
          resolve(base64)
        }
      })
      base64Reader.readAsDataURL(file)
      const imageBase64 = await base64Promise

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mediaType: file.type,
        }),
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      setOcrData(result.data)
      setEditedData(result.data)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar imagen')
      setStep('upload')
    }
  }

  const handleConfirm = async () => {
    if (!selectedBatch || !editedData.record_date) {
      setError('Selecciona un lote y verifica la fecha')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await confirmProductionRecord({
        batch_id: selectedBatch,
        record_date: editedData.record_date!,
        feed_kg: editedData.feed_kg ?? null,
        avg_weight_g: editedData.avg_weight_g ?? null,
        mortality_count: editedData.mortality_count ?? null,
        temperature_c: editedData.temperature_c ?? null,
        oxygen_mg_l: editedData.oxygen_mg_l ?? null,
        ammonia_mg_l: editedData.ammonia_mg_l ?? null,
        nitrite_mg_l: editedData.nitrite_mg_l ?? null,
        nitrate_mg_l: editedData.nitrate_mg_l ?? null,
        ph: editedData.ph ?? null,
        notes: editedData.notes ?? null,
      })
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep('upload')
    setImagePreview(null)
    setOcrData(null)
    setEditedData({})
    setError(null)
    setSelectedBatch('')
    if (fileInputRef.current) fileInputRef.current.value = ''
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

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left: Image */}
      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">
              {step === 'upload' ? 'Subir Reporte' : step === 'processing' ? 'Procesando...' : 'Imagen Original'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 'upload' && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label>Lote de destino</Label>
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
                <label
                  htmlFor="photo-upload"
                  className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/30 p-10 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Camera className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Tomar foto o seleccionar imagen</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG - Maximo 10MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handleFileSelect}
                    disabled={!selectedBatch}
                  />
                </label>
                {!selectedBatch && (
                  <p className="text-xs text-amber-600">Selecciona un lote antes de subir la imagen</p>
                )}
              </div>
            )}

            {step === 'processing' && (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium text-foreground">Analizando imagen con IA...</p>
                  <p className="text-sm text-muted-foreground">Extrayendo datos del reporte</p>
                </div>
              </div>
            )}

            {(step === 'review' || step === 'done') && imagePreview && (
              <img
                src={imagePreview || "/placeholder.svg"}
                alt="Reporte subido"
                className="w-full rounded-lg"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Review Form */}
      <div className="flex-1">
        {step === 'review' && ocrData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Verificar Datos Extraidos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Revisa y corrige los datos antes de confirmar
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="record_date">Fecha</Label>
                    {ocrData.confidence.record_date > 0 && (
                      <ConfidenceBadge value={ocrData.confidence.record_date} />
                    )}
                  </div>
                  <Input
                    id="record_date"
                    type="date"
                    value={editedData.record_date || ''}
                    onChange={(e) => setEditedData({ ...editedData, record_date: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="feed_kg">Alimento (kg)</Label>
                      {ocrData.confidence.feed_kg > 0 && (
                        <ConfidenceBadge value={ocrData.confidence.feed_kg} />
                      )}
                    </div>
                    <Input
                      id="feed_kg"
                      type="number"
                      step="0.1"
                      value={editedData.feed_kg ?? ''}
                      onChange={(e) => setEditedData({ ...editedData, feed_kg: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="avg_weight_g">Peso prom. (g)</Label>
                      {ocrData.confidence.avg_weight_g > 0 && (
                        <ConfidenceBadge value={ocrData.confidence.avg_weight_g} />
                      )}
                    </div>
                    <Input
                      id="avg_weight_g"
                      type="number"
                      step="0.1"
                      value={editedData.avg_weight_g ?? ''}
                      onChange={(e) => setEditedData({ ...editedData, avg_weight_g: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="mortality_count">Mortalidad</Label>
                      {ocrData.confidence.mortality_count > 0 && (
                        <ConfidenceBadge value={ocrData.confidence.mortality_count} />
                      )}
                    </div>
                    <Input
                      id="mortality_count"
                      type="number"
                      value={editedData.mortality_count ?? ''}
                      onChange={(e) => setEditedData({ ...editedData, mortality_count: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="temperature_c">Temp. (C)</Label>
                      {ocrData.confidence.temperature_c > 0 && (
                        <ConfidenceBadge value={ocrData.confidence.temperature_c} />
                      )}
                    </div>
                    <Input
                      id="temperature_c"
                      type="number"
                      step="0.1"
                      value={editedData.temperature_c ?? ''}
                      onChange={(e) => setEditedData({ ...editedData, temperature_c: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="oxygen_mg_l">Oxigeno (mg/L)</Label>
                    {ocrData.confidence.oxygen_mg_l > 0 && (
                      <ConfidenceBadge value={ocrData.confidence.oxygen_mg_l} />
                    )}
                  </div>
                  <Input
                    id="oxygen_mg_l"
                    type="number"
                    step="0.1"
                    value={editedData.oxygen_mg_l ?? ''}
                    onChange={(e) => setEditedData({ ...editedData, oxygen_mg_l: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="ammonia_mg_l">Amonio (mg/L)</Label>
                      {ocrData.confidence.ammonia_mg_l > 0 && (
                        <ConfidenceBadge value={ocrData.confidence.ammonia_mg_l} />
                      )}
                    </div>
                    <Input
                      id="ammonia_mg_l"
                      type="number"
                      step="0.01"
                      value={editedData.ammonia_mg_l ?? ''}
                      onChange={(e) => setEditedData({ ...editedData, ammonia_mg_l: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="nitrite_mg_l">Nitritos (mg/L)</Label>
                      {ocrData.confidence.nitrite_mg_l > 0 && (
                        <ConfidenceBadge value={ocrData.confidence.nitrite_mg_l} />
                      )}
                    </div>
                    <Input
                      id="nitrite_mg_l"
                      type="number"
                      step="0.01"
                      value={editedData.nitrite_mg_l ?? ''}
                      onChange={(e) => setEditedData({ ...editedData, nitrite_mg_l: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="nitrate_mg_l">Nitratos (mg/L)</Label>
                      {ocrData.confidence.nitrate_mg_l > 0 && (
                        <ConfidenceBadge value={ocrData.confidence.nitrate_mg_l} />
                      )}
                    </div>
                    <Input
                      id="nitrate_mg_l"
                      type="number"
                      step="0.1"
                      value={editedData.nitrate_mg_l ?? ''}
                      onChange={(e) => setEditedData({ ...editedData, nitrate_mg_l: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="ph">pH</Label>
                      {ocrData.confidence.ph > 0 && (
                        <ConfidenceBadge value={ocrData.confidence.ph} />
                      )}
                    </div>
                    <Input
                      id="ph"
                      type="number"
                      step="0.1"
                      value={editedData.ph ?? ''}
                      onChange={(e) => setEditedData({ ...editedData, ph: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Input
                    id="notes"
                    value={editedData.notes ?? ''}
                    onChange={(e) => setEditedData({ ...editedData, notes: e.target.value || null })}
                    placeholder="Observaciones adicionales..."
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Confirmar y Guardar'
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'done' && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <CheckCircle className="h-12 w-12 text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Registro guardado</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los datos han sido confirmados y guardados exitosamente.
                </p>
              </div>
              <Button onClick={resetForm}>Subir otro reporte</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {error && step === 'upload' && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
