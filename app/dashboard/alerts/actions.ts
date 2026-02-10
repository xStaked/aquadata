'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markAllAlertsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return

  await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('organization_id', profile.organization_id)
    .eq('is_read', false)

  revalidatePath('/dashboard/alerts')
}
