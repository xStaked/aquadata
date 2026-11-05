'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/admin'

function randomCode() {
  const tail = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `AQUA-${tail}`
}

export async function createInvitationCode(formData: FormData) {
  const { supabase } = await requireAdminUser()

  const rawCode = (formData.get('code') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim()

  const code = (rawCode || randomCode()).toUpperCase()

  const { error } = await supabase.from('invitation_codes').insert({
    code,
    description: description || null,
    used: false,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
}

export type AdminActionResult = { ok: true } | { ok: false; error: string }

export async function createOrganizationUser(formData: FormData): Promise<AdminActionResult> {
  await requireAdminUser()

  const organizationId = String(formData.get('organization_id') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const fullName = String(formData.get('full_name') || '').trim()
  const phoneDigits = String(formData.get('phone') || '').replace(/\D/g, '')
  const password = String(formData.get('password') || '').trim()
  const rawRole = String(formData.get('role') || 'viewer').trim()
  const role = ['admin', 'operario', 'viewer'].includes(rawRole) ? rawRole : 'viewer'

  // Admitir roles globales sin finca; operarios/viewers si la requieren.
  if (role !== 'admin' && !organizationId) {
    return { ok: false, error: 'La organización es obligatoria para operarios y usuarios de solo lectura' }
  }

  if (!email) {
    return { ok: false, error: 'El email es obligatorio' }
  }

  if (!fullName) {
    return { ok: false, error: 'El nombre es obligatorio' }
  }

  if (!/^\d{10}$/.test(phoneDigits)) {
    return { ok: false, error: 'El número telefónico debe tener 10 dígitos' }
  }

  if (!password || password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  const supabaseAdmin = createAdminClient()
  const phone = `+57${phoneDigits}`

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
      role,
      organization_id: role === 'admin' ? null : organizationId,
    },
  })

  if (error) {
    const message = error.message || 'No se pudo crear el usuario'
    return {
      ok: false,
      error: /already|registered|exists/i.test(message)
        ? 'Ya existe un usuario con este email'
        : message,
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/users')
  revalidatePath('/admin/producers')
  if (organizationId) {
    revalidatePath(`/admin/producers/${organizationId}`)
  }

  return { ok: true }
}

export async function deleteOrganizationUser(userId: string): Promise<AdminActionResult> {
  const { user, supabase } = await requireAdminUser()

  if (!userId) {
    return { ok: false, error: 'Usuario no válido' }
  }

  if (userId === user.id) {
    return { ok: false, error: 'No puedes eliminar tu propio usuario' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (error) {
    const message = error.message || 'No se pudo eliminar el usuario'
    return {
      ok: false,
      error: /foreign key/i.test(message)
        ? 'No se puede eliminar: el usuario tiene registros asociados'
        : message,
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/users')
  revalidatePath('/admin/producers')
  if (profile?.organization_id) {
    revalidatePath(`/admin/producers/${profile.organization_id}`)
  }

  return { ok: true }
}
