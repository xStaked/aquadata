import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export default async function PortalDashboardPage() {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Hola, {profile?.full_name || 'Productor'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Este es tu portal de seguimiento técnico con Norgtech.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Casos abiertos', 'Última visita técnica', 'Recomendaciones pendientes'].map((label) => (
          <div key={label} className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1 text-primary">—</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        El contenido completo del portal se activa en la Fase 7 del roadmap.
      </p>
    </div>
  )
}
