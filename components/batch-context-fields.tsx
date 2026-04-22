'use client'

import { useEffect, useState } from 'react'

import { getBatchSummary, type BatchSummary } from '@/app/dashboard/upload/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function formatNumber(value: number | null, decimals = 0) {
  if (value == null) return ''
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function ReadonlyField({
  id,
  label,
  value,
}: {
  id: string
  label: string
  value: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} readOnly disabled />
    </div>
  )
}

export function BatchContextFields({ batchId }: { batchId: string }) {
  const [summary, setSummary] = useState<BatchSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!batchId) {
      setSummary(null)
      return
    }

    let cancelled = false
    setLoading(true)

    getBatchSummary(batchId)
      .then((data) => {
        if (!cancelled) {
          setSummary(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [batchId])

  if (!batchId) return null

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">Cargando datos del lote...</p>
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          Datos Del Lote
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Estos valores se usan como referencia al diligenciar el reporte.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ReadonlyField
          id={`batch-days-culture-${batchId}`}
          label="Días de cultivo"
          value={`${summary.days_culture} días`}
        />
        <ReadonlyField
          id={`batch-days-pond-${batchId}`}
          label="Días en lago"
          value={`${summary.days_pond} días`}
        />
        <ReadonlyField
          id={`batch-animal-actual-${batchId}`}
          label="Animal actual"
          value={formatNumber(summary.animal_actual)}
        />
        <ReadonlyField
          id={`batch-feed-fortnight-${batchId}`}
          label="Consumo quincenal"
          value={summary.fortnightly_feed_kg != null ? `${formatNumber(summary.fortnightly_feed_kg, 1)} kg` : ''}
        />
        <ReadonlyField
          id={`batch-feed-accumulated-${batchId}`}
          label="Consumo acumulado"
          value={summary.accumulated_feed_kg != null ? `${formatNumber(summary.accumulated_feed_kg, 1)} kg` : ''}
        />
        <ReadonlyField
          id={`batch-biomass-${batchId}`}
          label="Biomasa"
          value={summary.latest_biomass_kg != null ? `${formatNumber(summary.latest_biomass_kg, 1)} kg` : ''}
        />
        <ReadonlyField
          id={`batch-survival-${batchId}`}
          label="Porcentaje de sobrevivencia"
          value={summary.survival_pct != null ? `${formatNumber(summary.survival_pct, 1)}%` : ''}
        />
        <ReadonlyField
          id={`batch-seed-source-${batchId}`}
          label="Origen de semilla"
          value={summary.seed_source ?? ''}
        />
        <ReadonlyField
          id={`batch-period-values-${batchId}`}
          label="Valores por periodo"
          value="Quincenales"
        />
      </div>
    </div>
  )
}
