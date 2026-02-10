'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, Droplets, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Dose reference table (liters per m3)
const DOSE_TABLE = [
  { maxVolume: 50, dose: 0.5, label: 'Muy pequeno' },
  { maxVolume: 200, dose: 0.4, label: 'Pequeno' },
  { maxVolume: 500, dose: 0.35, label: 'Mediano' },
  { maxVolume: 1000, dose: 0.3, label: 'Grande' },
  { maxVolume: Infinity, dose: 0.25, label: 'Muy grande' },
]

function getDose(volume: number) {
  const entry = DOSE_TABLE.find(d => volume <= d.maxVolume)
  return entry ?? DOSE_TABLE[DOSE_TABLE.length - 1]
}

export function BioremediationForm() {
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [depth, setDepth] = useState('')
  const [result, setResult] = useState<{
    volume: number
    dose: number
    totalDose: number
    label: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleCalculate = () => {
    const l = Number(length)
    const w = Number(width)
    const d = Number(depth)

    if (l <= 0 || w <= 0 || d <= 0) return

    const volume = l * w * d
    const doseInfo = getDose(volume)
    const totalDose = volume * doseInfo.dose

    setResult({ volume, dose: doseInfo.dose, totalDose, label: doseInfo.label })
    setSaved(false)
  }

  const handleSave = async () => {
    if (!result) return
    setIsSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      await supabase.from('bioremediation_calcs').insert({
        user_id: user.id,
        pond_length: Number(length),
        pond_width: Number(width),
        pond_depth: Number(depth),
        volume_m3: result.volume,
        bioremediation_dose: result.totalDose,
      })
      setSaved(true)
    } catch {
      alert('Error al guardar el calculo')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calculator className="h-5 w-5 text-primary" />
            Dimensiones del Estanque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="length">Largo (metros)</Label>
              <Input
                id="length"
                type="number"
                step="0.1"
                placeholder="20"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="width">Ancho (metros)</Label>
              <Input
                id="width"
                type="number"
                step="0.1"
                placeholder="10"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="depth">Profundidad (metros)</Label>
              <Input
                id="depth"
                type="number"
                step="0.1"
                placeholder="1.5"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
              />
            </div>
            <Button onClick={handleCalculate} disabled={!length || !width || !depth}>
              Calcular
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Droplets className="h-5 w-5 text-primary" />
            Resultado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Volumen</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {result.volume.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">m3</span>
                  </p>
                </div>
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Clasificacion</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{result.label}</p>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-medium text-muted-foreground">Dosis de bioremediacion estimada</p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {result.totalDose.toFixed(1)} <span className="text-base font-normal">litros</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Basado en {result.dose} L/m3 para estanques de tipo {result.label.toLowerCase()}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Formula: V = L x A x P = {length} x {width} x {depth} = {result.volume.toFixed(1)} m3
                </p>
                <p className="text-xs text-muted-foreground">
                  Dosis = {result.volume.toFixed(1)} m3 x {result.dose} L/m3 = {result.totalDose.toFixed(1)} L
                </p>
              </div>

              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={handleSave}
                disabled={isSaving || saved}
              >
                <Save className="h-4 w-4" />
                {saved ? 'Guardado' : isSaving ? 'Guardando...' : 'Guardar calculo'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Droplets className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Ingresa las dimensiones del estanque para calcular la dosis de bioremediacion
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reference table */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm text-foreground">Tabla de Referencia de Dosis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {DOSE_TABLE.map((entry) => (
              <div
                key={entry.label}
                className="rounded-lg border border-border p-3 text-center"
              >
                <p className="text-xs font-medium text-muted-foreground">{entry.label}</p>
                <p className="mt-1 text-lg font-bold text-foreground">{entry.dose} L/m3</p>
                <p className="text-xs text-muted-foreground">
                  {'<'} {entry.maxVolume === Infinity ? '1000+' : entry.maxVolume} m3
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
