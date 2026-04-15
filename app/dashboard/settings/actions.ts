'use server'

import { revalidatePath } from 'next/cache'
import { getOrgContext } from '@/lib/db/context'
import { updateOrganization } from '@/lib/db'

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
