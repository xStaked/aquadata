'use client'

import { useState, useTransition } from 'react'

import { updateOrganizationDefaultFca } from '@/app/dashboard/settings/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OrganizationFcaSettings({
  farmName,
  initialDefaultFca,
}: {
  farmName: string
  initialDefaultFca: number | null
}) {
  const [value, setValue] = useState(initialDefaultFca != null ? String(initialDefaultFca) : '')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    const trimmedValue = value.trim()
    const parsedValue = trimmedValue === '' ? null : Number(trimmedValue)

    if (
      trimmedValue !== '' &&
      (parsedValue == null || !Number.isFinite(parsedValue) || parsedValue <= 0)
    ) {
      setError('Ingresa un FCA válido mayor a 0')
      return
    }

    setError('')
    startTransition(async () => {
      try {
        await updateOrganizationDefaultFca(parsedValue)
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la configuración')
      }
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Configuración de finca</CardTitle>
        <CardDescription>
          Define el FCA operativo por defecto para {farmName}. Se usará en los reportes cuando el operario
          elija aplicar el valor configurado de la finca.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="default_fca">FCA por defecto</Label>
          <Input
            id="default_fca"
            type="number"
            min="0"
            step="0.01"
            placeholder="Ej: 1.65"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Déjalo vacío si quieres obligar a usar solo el FCA calculado.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          El cálculo automático seguirá guardándose para trazabilidad, pero dashboards, registros y exportaciones
          usarán el FCA efectivo seleccionado en cada reporte.
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
