import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const ADMIN_ROLES = ['admin'] as const
export const WRITER_ROLES = ['admin', 'operario'] as const
export const READ_ONLY_ROLES = ['viewer'] as const

export function isAdminRole(role: string | null | undefined) {
  return !!role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
}

export function isWriterRole(role: string | null | undefined) {
  return !!role && WRITER_ROLES.includes(role as (typeof WRITER_ROLES)[number])
}

export function isReadOnlyRole(role: string | null | undefined) {
  return !!role && READ_ONLY_ROLES.includes(role as (typeof READ_ONLY_ROLES)[number])
}

export async function requireAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) {
    redirect('/dashboard')
  }

  return { supabase, user, profile }
}
