'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EyeOff, Store } from 'lucide-react'

import { updateOrganizationSalesModuleEnabled } from '@/app/dashboard/settings/actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function OrganizationSalesModuleSettings({
  initialEnabled,
}: {
  initialEnabled: boolean
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleCheckedChange = (checked: boolean) => {
    setEnabled(checked)
    setError('')
    setSuccess('')

    startTransition(async () => {
      try {
        const updated = await updateOrganizationSalesModuleEnabled(checked)
        setEnabled(updated.salesModuleEnabled)
        setSuccess(
          updated.salesModuleEnabled
            ? 'Módulo de ventas visible nuevamente'
            : 'Módulo de ventas oculto para esta finca'
        )
        router.refresh()
      } catch (saveError) {
        setEnabled(!checked)
        setSuccess('')
        setError(
          saveError instanceof Error
            ? saveError.message
            : 'No se pudo actualizar la visibilidad del módulo'
        )
      }
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Visibilidad del módulo de ventas</CardTitle>
        <CardDescription>
          Decide si la finca debe ver ventas y su configuración asociada dentro del dashboard.
          Al ocultarlo, se quitan accesos y submódulos visibles, pero los cálculos y procesos que
          usan estos datos siguen funcionando igual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label htmlFor="sales-module-enabled" className="text-sm font-medium text-foreground">
              Mostrar ventas en el dashboard
            </Label>
            <p className="text-sm leading-6 text-muted-foreground">
              Cuando está apagado, se ocultan la entrada de navegación a ventas, los accesos
              rápidos del panel y la configuración de precios por especie.
            </p>
          </div>
          <Switch
            id="sales-module-enabled"
            checked={enabled}
            disabled={isPending}
            onCheckedChange={handleCheckedChange}
            aria-label="Mostrar módulo de ventas"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <Store className="h-4 w-4" />
              Módulo visible
            </div>
            <p className="mt-2 text-sm leading-6 text-emerald-900/80">
              El equipo ve ventas, cosechas, ingresos y precios de referencia dentro del panel.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <EyeOff className="h-4 w-4" />
              Módulo oculto
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Se simplifica la navegación para usuarios que no trabajan ventas, sin afectar la
              información ya usada por otras operaciones.
            </p>
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-md border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
