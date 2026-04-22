'use server'

import { revalidatePath } from 'next/cache'
import { getOrgContext, requireOrgWriteContext } from '@/lib/db/context'
import { updateOrganization } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import type { AuthorizedWhatsappContact } from '@/db/types'
import { normalizeColombianPhoneNumber } from '@/lib/phone'
import { normalizeWhatsappContact, parseAuthorizedWhatsappContacts } from '@/lib/whatsapp-contacts'

export async function updateOrganizationDefaultFca(defaultFca: number | null) {
  const ctx = await requireOrgWriteContext()
  const { orgId } = ctx

  const updated = await updateOrganization(orgId, { default_fca: defaultFca })

  if (!updated) {
    throw new Error('No se pudo actualizar el FCA de la finca')
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/upload')
  revalidatePath('/dashboard/records')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/admin/analytics')

  return {
    id: updated.id,
    defaultFca: updated.default_fca != null ? Number(updated.default_fca) : null,
  }
}

export async function updateOrganizationCustomFishPrices(
  customFishPrices: Record<string, number | null>
) {
  const ctx = await requireOrgWriteContext()
  const { orgId } = ctx

  // Filter out entries with null, undefined, or zero values — only store species with actual prices
  const cleanedPrices: Record<string, number> = {}
  for (const [species, price] of Object.entries(customFishPrices)) {
    if (price != null && Number.isFinite(price) && price > 0) {
      cleanedPrices[species] = price
    }
  }

  const updated = await updateOrganization(orgId, { custom_fish_prices: cleanedPrices })

  if (!updated) {
    throw new Error('No se pudo actualizar los precios de la finca')
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/costs')

  return {
    id: updated.id,
    customFishPrices: (updated.custom_fish_prices ?? {}) as Record<string, number>,
  }
}

export async function updateOrganizationAuthorizedWhatsappContacts(
  contactInputs: AuthorizedWhatsappContact[]
) {
  const ctx = await requireOrgWriteContext()
  const { orgId, userId } = ctx

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('whatsapp_phone')
    .eq('id', userId)
    .single()

  const contactsByPhone = new Map<string, AuthorizedWhatsappContact>()

  for (const contactInput of contactInputs) {
    const normalized = normalizeWhatsappContact(contactInput)

    if (!normalized) {
      throw new Error(
        `Contacto inválido: ${contactInput.name || contactInput.phone}. Verifica nombre y usa formato Colombia de 10 dígitos, por ejemplo 3001234567.`
      )
    }

    if (normalized.phone === profile?.whatsapp_phone) {
      throw new Error('Ese número ya es el principal de la cuenta')
    }

    if (contactsByPhone.has(normalized.phone)) {
      throw new Error(`El número ${normalized.phone} ya está registrado`)
    }

    contactsByPhone.set(normalized.phone, normalized)
  }

  const normalizedContacts = Array.from(contactsByPhone.values())

  const [{ data: existingProfiles }, { data: organizations }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, whatsapp_phone')
      .not('whatsapp_phone', 'is', null),
    supabase
      .from('organizations')
      .select('id, authorized_whatsapp_contacts'),
  ])

  const conflictingProfilePhone = (existingProfiles ?? [])
    .map((profileRow) => normalizeColombianPhoneNumber(String(profileRow.whatsapp_phone)))
    .find(
      (phone): phone is string =>
        Boolean(phone) && normalizedContacts.some((contact) => contact.phone === phone)
    )

  if (conflictingProfilePhone) {
    throw new Error(
      `El número ${conflictingProfilePhone} ya está registrado como número principal de un usuario.`
    )
  }

  for (const organizationRow of organizations ?? []) {
    if (organizationRow.id === orgId) {
      continue
    }

    const existingContacts = parseAuthorizedWhatsappContacts(
      organizationRow.authorized_whatsapp_contacts
    )
    const conflict = existingContacts.find((existingContact) =>
      normalizedContacts.some((contact) => contact.phone === existingContact.phone)
    )

    if (conflict) {
      throw new Error(
        `El número ${conflict.phone} ya está autorizado para otro equipo (${conflict.name}).`
      )
    }
  }

  const updated = await updateOrganization(orgId, {
    authorized_whatsapp_contacts: normalizedContacts,
  })

  if (!updated) {
    throw new Error('No se pudieron actualizar los contactos autorizados')
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/upload')

  return {
    id: updated.id,
    authorizedWhatsappContacts: updated.authorized_whatsapp_contacts ?? [],
  }
}

export async function updateOrganizationSalesModuleEnabled(enabled: boolean) {
  const ctx = await requireOrgWriteContext()
  const { orgId } = ctx

  const updated = await updateOrganization(orgId, {
    sales_module_enabled: enabled,
  })

  if (!updated) {
    throw new Error('No se pudo actualizar la visibilidad del módulo de ventas')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/costs')
  revalidatePath('/dashboard/settings')

  return {
    id: updated.id,
    salesModuleEnabled: updated.sales_module_enabled,
  }
}
