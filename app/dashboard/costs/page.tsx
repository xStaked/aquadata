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
import { DollarSign, TrendingUp, Droplets, FlaskConical, ArrowDownRight } from 'lucide-react'

// Precio de referencia por litro de producto (configurable)
const PRICE_PER_LITER = 12.50

export default async function CostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  let treatments: Array<{
    id: string
    pond_name: string
    treatment_date: string
    product_name: string
    dose_liters: number
    ammonia_before: number | null
    ammonia_after: number | null
    notes: string | null
    revenue: number
    effectiveness: number | null
  }> = []

  if (profile?.organization_id) {
    const [{ data: ponds }, { data: rawTreatments }] = await Promise.all([
      supabase
        .from('ponds')
        .select('id, name')
        .eq('organization_id', profile.organization_id),
      supabase
        .from('bioremediation_treatments')
        .select('id, pond_id, treatment_date, product_name, dose_liters, ammonia_before, ammonia_after, notes')
        .eq('user_id', user!.id)
        .order('treatment_date', { ascending: false }),
    ])

    const pondMap: Record<string, string> = {}
    for (const p of ponds ?? []) pondMap[p.id] = p.name

    treatments = (rawTreatments ?? []).map((t) => {
      const dose = Number(t.dose_liters) || 0
      const before = t.ammonia_before != null ? Number(t.ammonia_before) : null
      const after = t.ammonia_after != null ? Number(t.ammonia_after) : null
      let effectiveness: number | null = null
      if (before != null && after != null && before > 0) {
        effectiveness = ((before - after) / before) * 100
      }
      return {
        id: t.id,
        pond_name: pondMap[t.pond_id] ?? 'Sin estanque',
        treatment_date: t.treatment_date,
        product_name: t.product_name,
        dose_liters: dose,
        ammonia_before: before,
        ammonia_after: after,
        notes: t.notes,
        revenue: dose * PRICE_PER_LITER,
        effectiveness,
      }
    })
  }

  const totalLiters = treatments.reduce((s, t) => s + t.dose_liters, 0)
  const totalRevenue = treatments.reduce((s, t) => s + t.revenue, 0)
  const totalTreatments = treatments.length
  const avgEffectiveness = (() => {
    const valid = treatments.filter((t) => t.effectiveness != null)
    if (valid.length === 0) return null
    return valid.reduce((s, t) => s + t.effectiveness!, 0) / valid.length
  })()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Ventas de Bioremediacion</h1>
        <p className="mt-1 text-muted-foreground">Ingresos por producto aplicado y efectividad de tratamientos</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              ${totalRevenue.toLocaleString('es', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalTreatments} tratamiento{totalTreatments !== 1 ? 's' : ''} aplicado{totalTreatments !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Producto Vendido</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Droplets className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {totalLiters.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">litros</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Precio ref: ${PRICE_PER_LITER}/litro
            </p>
          </CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Promedio</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              ${totalTreatments > 0 ? (totalRevenue / totalTreatments).toLocaleString('es', { maximumFractionDigits: 0 }) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">Por tratamiento</p>
          </CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Efectividad Promedio</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-primary">
              {avgEffectiveness != null ? `${avgEffectiveness.toFixed(0)}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Reduccion de amonio</p>
          </CardContent>
        </Card>
      </div>

      {/* Treatment history */}
      {treatments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Droplets className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Sin tratamientos registrados</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Los tratamientos de bioremediacion aplicados apareceran aqui con su detalle de ingresos y efectividad.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Historial de Tratamientos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estanque</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Dosis (L)</TableHead>
                  <TableHead className="text-right">Ingreso ($)</TableHead>
                  <TableHead className="text-right">NH3 Antes</TableHead>
                  <TableHead className="text-right">NH3 Despues</TableHead>
                  <TableHead className="text-right">Efectividad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treatments.map((t) => (
                  <TableRow key={t.id} className="transition-colors duration-150 hover:bg-muted/50">
                    <TableCell>{new Date(t.treatment_date + 'T12:00:00').toLocaleDateString('es')}</TableCell>
                    <TableCell className="font-medium">{t.pond_name}</TableCell>
                    <TableCell>{t.product_name}</TableCell>
                    <TableCell className="text-right">{t.dose_liters.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      ${t.revenue.toLocaleString('es', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.ammonia_before != null ? `${t.ammonia_before} mg/L` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.ammonia_after != null ? (
                        <span className="flex items-center justify-end gap-1">
                          <ArrowDownRight className="h-3 w-3 text-primary" />
                          {t.ammonia_after} mg/L
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.effectiveness != null ? (
                        <Badge
                          variant="outline"
                          className={
                            t.effectiveness >= 60
                              ? 'border-primary/30 text-primary'
                              : t.effectiveness >= 30
                              ? 'border-amber-500/30 text-amber-600'
                              : 'border-destructive/30 text-destructive'
                          }
                        >
                          {t.effectiveness.toFixed(0)}%
                        </Badge>
                      ) : '—'}
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
          <CardTitle className="text-sm text-foreground">Sobre los calculos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ingresos = dosis aplicada (litros) x precio de referencia (${PRICE_PER_LITER}/L).
            La efectividad se calcula como el porcentaje de reduccion de amonio (NH3) entre la medicion antes y despues del tratamiento.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
