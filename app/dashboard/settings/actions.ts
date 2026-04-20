'use server'

import { revalidatePath } from 'next/cache'
import { getOrgContext } from '@/lib/db/context'
import { updateOrganization } from '@/lib/db'
import { normalizeColombianPhoneNumber } from '@/lib/phone'

export async function updateOrganizationDefaultFca(defaultFca: number | null) {
  const ctx = await getOrgContext()
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
  const ctx = await getOrgContext()
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

export async function updateOrganizationAuthorizedWhatsappPhones(phoneInputs: string[]) {
  const ctx = await getOrgContext()
  const { orgId } = ctx

  const normalizedPhones = Array.from(
    new Set(
      phoneInputs
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => {
          const normalized = normalizeColombianPhoneNumber(value)

          if (!normalized) {
            throw new Error(
              `Número inválido: ${value}. Usa formato Colombia de 10 dígitos, por ejemplo 3001234567.`
            )
          }

          return normalized
        })
    )
  )

  const updated = await updateOrganization(orgId, {
    authorized_whatsapp_phones: normalizedPhones,
  })

  if (!updated) {
    throw new Error('No se pudieron actualizar los números autorizados')
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/upload')

  return {
    id: updated.id,
    authorizedWhatsappPhones: updated.authorized_whatsapp_phones ?? [],
  }
}

export async function updateOrganizationSalesModuleEnabled(enabled: boolean) {
  const ctx = await getOrgContext()
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
