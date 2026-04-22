import { BioremediationForm } from '@/components/bioremediation-form'
import { createClient } from '@/lib/supabase/server'
import { isWriterRole } from '@/lib/auth/roles'
import { ReadOnlyBanner } from '@/components/read-only-banner'

export default async function BioremediationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const canEdit = isWriterRole(profile?.role)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Calculadora de Bioremediacion</h1>
        <p className="mt-1 text-muted-foreground">
          Calcula la dosis estimada de bioremediación usando el área del estanque y su profundidad
        </p>
      </div>
      {!canEdit ? (
        <ReadOnlyBanner description="Los usuarios de solo lectura pueden consultar la calculadora, pero no guardar cálculos." />
      ) : null}
      <BioremediationForm />
    </div>
  )
}
