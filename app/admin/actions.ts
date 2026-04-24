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

export async function createOrganizationUser(formData: FormData) {
  await requireAdminUser()

  const organizationId = String(formData.get('organization_id') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const fullName = String(formData.get('full_name') || '').trim()
  const phoneDigits = String(formData.get('phone') || '').replace(/\D/g, '')
  const password = String(formData.get('password') || '').trim()
  const rawRole = String(formData.get('role') || 'viewer').trim()
  const role = ['admin', 'operario', 'viewer'].includes(rawRole) ? rawRole : 'viewer'

  if (!organizationId) {
    throw new Error('La organización es obligatoria')
  }

  if (!email) {
    throw new Error('El email es obligatorio')
  }

  if (!fullName) {
    throw new Error('El nombre es obligatorio')
  }

  if (!/^\d{10}$/.test(phoneDigits)) {
    throw new Error('El número telefónico debe tener 10 dígitos')
  }

  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres')
  }

  const supabaseAdmin = createAdminClient()
  const phone = `+57${phoneDigits}`

  const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
  const alreadyExists = existing?.users?.some((u) => u.email?.toLowerCase() === email)
  if (alreadyExists) {
    throw new Error('Ya existe un usuario con este email')
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
      role,
      organization_id: organizationId,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  revalidatePath('/admin/users')
  revalidatePath('/admin/producers')
  revalidatePath(`/admin/producers/${organizationId}`)
}
