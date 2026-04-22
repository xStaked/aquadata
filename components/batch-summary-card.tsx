'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBatchSummary, type BatchSummary } from '@/app/dashboard/upload/actions'
import {
  CalendarDays,
  Fish,
  TrendingUp,
  TrendingDown,
  Wheat,
  Weight,
  Package,
} from 'lucide-react'

export function BatchSummaryCard({ batchId }: { batchId: string }) {
  const [summary, setSummary] = useState<BatchSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!batchId) {
      setSummary(null)
      return
    }

    let cancelled = false
    setLoading(true)

    getBatchSummary(batchId).then((data) => {
      if (!cancelled) {
        setSummary(data)
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
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">Cargando resumen del lote...</p>
      </div>
    )
  }

  if (!summary) return null

  const items = [
    {
      icon: CalendarDays,
      label: 'Días de cultivo',
      value: `${summary.days_culture} días`,
      accent: 'text-primary',
    },
    {
      icon: CalendarDays,
      label: 'Días en lago',
      value: `${summary.days_pond} días`,
      accent: 'text-primary',
    },
    {
      icon: Fish,
      label: 'Animal actual',
      value: summary.animal_actual?.toLocaleString('es-CO') ?? '-',
      accent: 'text-emerald-600',
    },
    {
      icon: TrendingUp,
      label: '% Sobrevivencia',
      value: summary.survival_pct != null ? `${summary.survival_pct.toFixed(1)}%` : '-',
      accent: summary.survival_pct != null && summary.survival_pct >= 80 ? 'text-emerald-600' : 'text-amber-600',
    },
    {
      icon: Wheat,
      label: 'Consumo acumulado',
      value: summary.accumulated_feed_kg != null ? `${summary.accumulated_feed_kg.toFixed(1)} kg` : '-',
      accent: 'text-amber-600',
    },
    {
      icon: Wheat,
      label: 'Consumo quincenal',
      value: summary.fortnightly_feed_kg != null ? `${summary.fortnightly_feed_kg.toFixed(1)} kg` : '-',
      accent: 'text-amber-600',
    },
    {
      icon: TrendingDown,
      label: 'Mortalidad acumulada',
      value: summary.accumulated_mortality != null ? `${summary.accumulated_mortality}` : '-',
      accent: 'text-destructive',
    },
    {
      icon: Weight,
      label: 'Último peso promedio',
      value: summary.latest_avg_weight_g != null ? `${summary.latest_avg_weight_g.toFixed(1)} g` : '-',
      accent: 'text-sky-600',
    },
    {
      icon: Package,
      label: 'Última biomasa',
      value: summary.latest_biomass_kg != null ? `${summary.latest_biomass_kg.toFixed(1)} kg` : '-',
      accent: 'text-sky-600',
    },
  ]

  return (
    <Card className="border-primary/15">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Package className="h-4 w-4" />
          Resumen del Lote
          {summary.seed_source ? (
            <span className="ml-2 text-[10px] font-normal text-muted-foreground">
              Origen: {summary.seed_source}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/20 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <item.icon className={`h-3 w-3 ${item.accent}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
