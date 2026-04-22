import { createClient } from '@/lib/supabase/server'
import type { OrgContext } from './types'
import { isWriterRole } from '@/lib/auth/roles'

/**
 * Centralized helper that resolves the authenticated user's org context.
 * Replaces the ~20 duplicated getUser -> getProfile -> getOrgId blocks
 * scattered across pages and actions.
 *
 * Throws descriptive errors when the user is unauthenticated or has no org.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('No autenticado')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    throw new Error('No se encontro la organizacion del usuario')
  }

  return {
    userId: user.id,
    orgId: profile.organization_id,
    role: profile.role ?? 'operario',
    user: { id: user.id, email: user.email },
  }
}

export async function requireOrgWriteContext(): Promise<OrgContext> {
  const ctx = await getOrgContext()

  if (!isWriterRole(ctx.role)) {
    throw new Error('Tu usuario tiene permisos de solo lectura')
  }

  return ctx
}
