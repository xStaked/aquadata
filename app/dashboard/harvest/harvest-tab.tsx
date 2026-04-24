import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale, Fish, TrendingDown } from 'lucide-react'
import { HarvestForm } from '@/components/harvest-form'

export type HarvestRecord = {
  id: string
  batch_id: string
  pond_name: string
  harvest_date: string
  total_animals: number
  avg_weight_whole_g: number
  avg_weight_eviscerated_g: number | null
  labor_cost: number
  notes: string | null
}

export type BatchForForms = {
  id: string
  pond_name: string
  species: string
  initial_population: number
}

interface HarvestTabProps {
  harvests: HarvestRecord[]
  batchesForForms: BatchForForms[]
  canEdit: boolean
}

export function HarvestTab({ harvests, batchesForForms, canEdit }: HarvestTabProps) {
  const withEvisceration = harvests.filter(h => h.avg_weight_eviscerated_g != null)
  const avgShrinkage = withEvisceration.length > 0
    ? withEvisceration.reduce((s, h) => {
        const pct = ((h.avg_weight_whole_g - h.avg_weight_eviscerated_g!) / h.avg_weight_whole_g) * 100
        return s + pct
      }, 0) / withEvisceration.length
    : null
  const totalWholeKg = harvests.reduce((s, h) => s + h.total_animals * h.avg_weight_whole_g / 1000, 0)
  const totalEviscKg = harvests.filter(h => h.avg_weight_eviscerated_g).reduce(
    (s, h) => s + h.total_animals * h.avg_weight_eviscerated_g! / 1000, 0
  )

  return (
    <div className="flex flex-col gap-6">
      {harvests.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Biomasa total cosechada</CardTitle>
              <Scale className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWholeKg.toFixed(1)} <span className="text-sm font-normal">kg</span></div>
              <p className="text-xs text-muted-foreground">Peso entero</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Biomasa eviscerada</CardTitle>
              <Fish className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEviscKg.toFixed(1)} <span className="text-sm font-normal">kg</span></div>
              <p className="text-xs text-muted-foreground">Viscera: {(totalWholeKg - totalEviscKg).toFixed(1)} kg</p>
            </CardContent>
          </Card>

          <Card className={`transition-all hover:shadow-md ${avgShrinkage != null && avgShrinkage > 15 ? 'border-destructive/20 bg-destructive/5' : avgShrinkage != null ? 'border-green-500/20 bg-green-500/5' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Merma promedio</CardTitle>
              <TrendingDown className={`h-4 w-4 ${avgShrinkage != null && avgShrinkage > 15 ? 'text-destructive' : avgShrinkage != null ? 'text-green-600' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${avgShrinkage != null && avgShrinkage > 15 ? 'text-destructive' : avgShrinkage != null ? 'text-green-600' : ''}`}>
                {avgShrinkage != null ? `${avgShrinkage.toFixed(1)}%` : '—'}
              </div>
              <p className="text-xs text-muted-foreground">Pérdida al eviscerado</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registro de cosechas</CardTitle>
          <CardDescription>
            Controla la merma real: diferencia entre peso entero y peso eviscerado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HarvestForm batches={batchesForForms} harvests={harvests} canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  )
}
