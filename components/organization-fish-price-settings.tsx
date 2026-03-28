'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { updateOrganizationCustomFishPrices } from '@/app/dashboard/settings/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OrganizationFishPriceSettings({
  species,
  initialPrices,
  marketPrices,
}: {
  species: string[]
  initialPrices: Record<string, number>
  marketPrices?: Record<string, number>
}) {
  const router = useRouter()
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const s of species) {
      initial[s] = initialPrices[s] != null ? String(initialPrices[s]) : ''
    }
    return initial
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    // Build the payload validating each price entry
    const payload: Record<string, number | null> = {}
    for (const s of species) {
      const raw = (prices[s] ?? '').trim()
      if (raw === '') {
        payload[s] = null
        continue
      }
      const parsed = Number(raw)
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError(`Precio inválido para ${s}. Ingresa un número mayor o igual a 0.`)
        return
      }
      payload[s] = parsed
    }

    setError('')
    setSuccess('')
    startTransition(async () => {
      try {
        const updated = await updateOrganizationCustomFishPrices(payload)
        // Sync local state with what was actually saved (nulls get dropped)
        const savedPrices = updated.customFishPrices
        setPrices(prev => {
          const next = { ...prev }
          for (const s of species) {
            next[s] = savedPrices[s] != null ? String(savedPrices[s]) : ''
          }
          return next
        })
        setSuccess('Precios guardados')
        router.refresh()
      } catch (saveError) {
        setSuccess('')
        setError(
          saveError instanceof Error ? saveError.message : 'No se pudieron guardar los precios'
        )
      }
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Precios de venta por especie</CardTitle>
        <CardDescription>
          Define precios de venta de referencia por especie para tu finca. Se usan cuando no hay un
          precio definido a nivel de lote.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {species.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay estanques con especies definidas. Agrega especies en tus estanques para
            configurar precios.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {species.map(s => {
              const marketPrice = marketPrices?.[s]
              return (
                <div key={s} className="grid gap-2 sm:max-w-xs">
                  <Label htmlFor={`price-${s}`}>{s}</Label>
                  <Input
                    id={`price-${s}`}
                    type="number"
                    min="0"
                    step="100"
                    placeholder={
                      marketPrice != null
                        ? `$${marketPrice.toLocaleString('es-CO')}`
                        : 'Precio personalizado'
                    }
                    value={prices[s] ?? ''}
                    onChange={e => setPrices(prev => ({ ...prev, [s]: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dejar vacío para usar precio SIPSA
                    {marketPrice != null
                      ? ` ($${marketPrice.toLocaleString('es-CO')}/kg)`
                      : ''}
                  </p>
                </div>
              )
            })}
          </div>
        )}

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

        {species.length > 0 ? (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar precios'}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
