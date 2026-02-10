import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

export default async function CostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  interface CycleData {
    batchId: string
    pondName: string
    status: string
    startDate: string
    endDate: string | null
    initialPop: number
    currentPop: number
    feedCostPerKg: number
    salePricePerKg: number
    totalFeedKg: number
    lastWeightG: number
    biomassKg: number
    totalFeedCost: number
    estimatedRevenue: number
    estimatedProfit: number
    profitMargin: number
  }

  const cycles: CycleData[] = []

  if (profile?.organization_id) {
    const { data: ponds } = await supabase
      .from('ponds')
      .select('id, name')
      .eq('organization_id', profile.organization_id)

    if (ponds && ponds.length > 0) {
      const pondIds = ponds.map((p) => p.id)
      const pondMap: Record<string, string> = {}
      for (const p of ponds) pondMap[p.id] = p.name

      const { data: batches } = await supabase
        .from('batches')
        .select('*')
        .in('pond_id', pondIds)
        .order('start_date', { ascending: false })

      if (batches) {
        for (const batch of batches) {
          const { data: records } = await supabase
            .from('production_records')
            .select('feed_kg, avg_weight_g, feed_cost')
            .eq('batch_id', batch.id)
            .order('record_date', { ascending: false })

          const totalFeedKg = (records ?? []).reduce((sum, r) => sum + (Number(r.feed_kg) || 0), 0)
          const lastWeight = records?.[0]?.avg_weight_g ?? 0
          const population = batch.current_population ?? batch.initial_population
          const biomassKg = (Number(lastWeight) * population) / 1000
          const feedCostPerKg = Number(batch.feed_cost_per_kg) || 25
          const salePricePerKg = Number(batch.sale_price_per_kg) || 80

          const totalFeedCost = totalFeedKg * feedCostPerKg
          const totalOtherCosts = (records ?? []).reduce((sum, r) => sum + (Number(r.feed_cost) || 0), 0)
          const effectiveFeedCost = totalOtherCosts > 0 ? totalOtherCosts : totalFeedCost
          const estimatedRevenue = biomassKg * salePricePerKg
          const estimatedProfit = estimatedRevenue - effectiveFeedCost
          const profitMargin = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0

          cycles.push({
            batchId: batch.id,
            pondName: pondMap[batch.pond_id] ?? '',
            status: batch.status,
            startDate: batch.start_date,
            endDate: batch.end_date,
            initialPop: batch.initial_population,
            currentPop: population,
            feedCostPerKg,
            salePricePerKg,
            totalFeedKg,
            lastWeightG: Number(lastWeight),
            biomassKg,
            totalFeedCost: effectiveFeedCost,
            estimatedRevenue,
            estimatedProfit,
            profitMargin,
          })
        }
      }
    }
  }

  const totalRevenue = cycles.reduce((s, c) => s + c.estimatedRevenue, 0)
  const totalCost = cycles.reduce((s, c) => s + c.totalFeedCost, 0)
  const totalProfit = totalRevenue - totalCost

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Costos y Rentabilidad</h1>
        <p className="mt-1 text-muted-foreground">Analisis economico por ciclo productivo</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingreso Estimado</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${totalRevenue.toLocaleString('es', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Basado en biomasa actual x precio/kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Costo Total Alimento</CardTitle>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${totalCost.toLocaleString('es', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Alimento acumulado x costo/kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilidad Estimada</CardTitle>
            <TrendingUp className={`h-5 w-5 ${totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              ${totalProfit.toLocaleString('es', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Ingreso - costo de alimento</p>
          </CardContent>
        </Card>
      </div>

      {cycles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Sin ciclos productivos</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Crea estanques y lotes para comenzar a ver el analisis de costos y rentabilidad.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Detalle por Ciclo</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estanque</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead className="text-right">Poblacion</TableHead>
                  <TableHead className="text-right">Alimento (kg)</TableHead>
                  <TableHead className="text-right">Biomasa (kg)</TableHead>
                  <TableHead className="text-right">Costo ($)</TableHead>
                  <TableHead className="text-right">Ingreso ($)</TableHead>
                  <TableHead className="text-right">Utilidad ($)</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((c) => (
                  <TableRow key={c.batchId}>
                    <TableCell className="font-medium">{c.pondName}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                        {c.status === 'active' ? 'Activo' : 'Cerrado'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(c.startDate).toLocaleDateString('es')}</TableCell>
                    <TableCell className="text-right">
                      {c.currentPop.toLocaleString('es')}
                    </TableCell>
                    <TableCell className="text-right">{c.totalFeedKg.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{c.biomassKg.toFixed(1)}</TableCell>
                    <TableCell className="text-right text-destructive">
                      ${c.totalFeedCost.toLocaleString('es', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ${c.estimatedRevenue.toLocaleString('es', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${c.estimatedProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      ${c.estimatedProfit.toLocaleString('es', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={c.profitMargin >= 0 ? 'border-primary/30 text-primary' : 'border-destructive/30 text-destructive'}
                      >
                        {c.profitMargin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-foreground">Nota sobre los calculos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Los costos se calculan con base en el alimento registrado x costo por kg configurado en el lote
            (default: $25/kg). Los ingresos se estiman con la biomasa actual x precio de venta por kg
            (default: $80/kg). Puedes ajustar estos valores editando cada lote en la seccion de Estanques.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
