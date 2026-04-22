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

export async function inviteOrganizationUser(formData: FormData) {
  await requireAdminUser()

  const organizationId = String(formData.get('organization_id') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const fullName = String(formData.get('full_name') || '').trim()
  const phoneDigits = String(formData.get('phone') || '').replace(/\D/g, '')
  const rawRole = String(formData.get('role') || 'viewer').trim()
  const role = rawRole === 'operario' ? 'operario' : 'viewer'

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

  const supabaseAdmin = createAdminClient()
  const phone = `+57${phoneDigits}`

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      phone,
      role,
      organization_id: organizationId,
    },
    redirectTo:
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
      process.env.NEXT_PUBLIC_SITE_URL,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  revalidatePath('/admin/producers')
  revalidatePath(`/admin/producers/${organizationId}`)
}
