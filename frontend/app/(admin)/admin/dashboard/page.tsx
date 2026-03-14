import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboardPage() {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenido, {profile?.full_name || 'Asesor'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Panel de control Norgtech — {profile?.role?.replace('_', ' ')}
        </p>
      </div>

      {/* KPIs se implementan en Fase 6 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Clientes activos', 'Casos abiertos', 'Visitas este mes', 'Calculadoras usadas'].map((label) => (
          <div key={label} className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1 text-primary">—</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Los KPIs se activarán en la Fase 6 del roadmap.
      </p>
    </div>
  )
}
