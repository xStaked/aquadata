import { redirect } from 'next/navigation'

import { OrganizationFcaSettings } from '@/components/organization-fca-settings'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('name, default_fca')
    .eq('id', profile.organization_id)
    .single()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración</h1>
        <p className="mt-1 text-muted-foreground">
          Parámetros operativos compartidos por toda la finca.
        </p>
      </div>

      <OrganizationFcaSettings
        farmName={organization?.name ?? 'tu finca'}
        initialDefaultFca={organization?.default_fca != null ? Number(organization.default_fca) : null}
      />
    </div>
  )
}
