import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Waves, Fish, Scale, Camera, ClipboardList, Calculator, BarChart3, DollarSign, Bell, AlertTriangle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id')
    .eq('id', user!.id)
    .single()

  // Fetch counts for the org
  let pondCount = 0
  let batchCount = 0
  let recordCount = 0
  let unreadAlerts: Array<{ id: string; severity: string; message: string; alert_type: string; created_at: string }> = []

  if (profile?.organization_id) {
    const { count: ponds } = await supabase
      .from('ponds')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
    pondCount = ponds ?? 0

    const { data: orgPonds } = await supabase
      .from('ponds')
      .select('id')
      .eq('organization_id', profile.organization_id)

    if (orgPonds && orgPonds.length > 0) {
      const pondIds = orgPonds.map(p => p.id)
      const { count: batches } = await supabase
        .from('batches')
        .select('*', { count: 'exact', head: true })
        .in('pond_id', pondIds)
        .eq('status', 'active')
      batchCount = batches ?? 0

      const { data: activeBatches } = await supabase
        .from('batches')
        .select('id')
        .in('pond_id', pondIds)

      if (activeBatches && activeBatches.length > 0) {
        const batchIds = activeBatches.map(b => b.id)
        const { count: records } = await supabase
          .from('production_records')
          .select('*', { count: 'exact', head: true })
          .in('batch_id', batchIds)
        recordCount = records ?? 0
      }
    }

    // Fetch unread alerts
    const { data: alertData } = await supabase
      .from('alerts')
      .select('id, severity, message, alert_type, created_at')
      .eq('organization_id', profile.organization_id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    unreadAlerts = (alertData ?? []) as typeof unreadAlerts
  }

  const greeting = profile?.full_name
    ? `Hola, ${profile.full_name}`
    : 'Bienvenido'

  const kpis = [
    {
      title: 'Estanques',
      value: pondCount,
      description: 'Registrados',
      icon: Waves,
    },
    {
      title: 'Lotes Activos',
      value: batchCount,
      description: 'En produccion',
      icon: Fish,
    },
    {
      title: 'Registros',
      value: recordCount,
      description: 'Datos capturados',
      icon: Scale,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {greeting}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Resumen general de tu operacion acuicola
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <Icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{kpi.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Alerts Banner */}
      {unreadAlerts.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-foreground">
              <Bell className="h-4 w-4 text-amber-600" />
              Alertas recientes
              <Badge variant="secondary" className="ml-auto">
                {unreadAlerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {unreadAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-start gap-2">
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${alert.severity === 'critical' ? 'text-destructive' : 'text-amber-600'}`} />
                  <p className="text-sm text-foreground">{alert.message}</p>
                </div>
              ))}
            </div>
            <a href="/dashboard/alerts" className="mt-3 block text-sm font-medium text-primary hover:underline">
              Ver todas las alertas
            </a>
          </CardContent>
        </Card>
      )}

      {/* Getting started guide if no organization */}
      {!profile?.organization_id && (
        <Card className="border-dashed border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Fish className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Comienza configurando tu granja</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Ve a la seccion de Estanques para crear tu primera granja y estanque.
                Luego podras agregar lotes, subir reportes fotograficos y ver tus KPIs.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Acciones rapidas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Subir reporte', href: '/dashboard/upload', Icon: Camera, desc: 'Foto a datos con IA' },
            { label: 'Analitica', href: '/dashboard/analytics', Icon: BarChart3, desc: 'Graficas y tendencias' },
            { label: 'Costos', href: '/dashboard/costs', Icon: DollarSign, desc: 'Rentabilidad por ciclo' },
            { label: 'Estanques', href: '/dashboard/ponds', Icon: Waves, desc: 'Gestionar estanques' },
            { label: 'Registros', href: '/dashboard/records', Icon: ClipboardList, desc: 'Ver historial' },
            { label: 'Bioremediacion', href: '/dashboard/bioremediation', Icon: Calculator, desc: 'Calcular dosis' },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <action.Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
