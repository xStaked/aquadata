import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isAdminRole, isClientRole } from '@/lib/auth/roles'

export async function requireAuth() {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, organization_id')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
}

export async function requireAdminUser() {
  const { supabase, user, profile } = await requireAuth()

  if (!isAdminRole(profile?.role)) {
    redirect('/portal/dashboard')
  }

  return { supabase, user, profile }
}

export async function requireClientUser() {
  const { supabase, user, profile } = await requireAuth()

  if (!isClientRole(profile?.role)) {
    redirect('/admin/dashboard')
  }

  return { supabase, user, profile }
}
