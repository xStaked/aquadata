'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

export async function updateOrganizationDefaultFca(defaultFca: number | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No autenticado')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    throw new Error('No se encontró la finca del usuario')
  }

  const { data: updatedOrganization, error } = await supabase
    .from('organizations')
    .update({ default_fca: defaultFca })
    .eq('id', profile.organization_id)
    .select('id, default_fca')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!updatedOrganization) {
    throw new Error('No se pudo actualizar el FCA de la finca')
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/upload')
  revalidatePath('/dashboard/records')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/admin/analytics')

  return {
    id: updatedOrganization.id,
    defaultFca:
      updatedOrganization.default_fca != null ? Number(updatedOrganization.default_fca) : null,
  }
}

export async function updateOrganizationCustomFishPrices(
  customFishPrices: Record<string, number | null>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No autenticado')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    throw new Error('No se encontró la finca del usuario')
  }

  // Filter out entries with null, undefined, or zero values — only store species with actual prices
  const cleanedPrices: Record<string, number> = {}
  for (const [species, price] of Object.entries(customFishPrices)) {
    if (price != null && Number.isFinite(price) && price > 0) {
      cleanedPrices[species] = price
    }
  }

  const { data: updatedOrganization, error } = await supabase
    .from('organizations')
    .update({ custom_fish_prices: cleanedPrices })
    .eq('id', profile.organization_id)
    .select('id, custom_fish_prices')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!updatedOrganization) {
    throw new Error('No se pudo actualizar los precios de la finca')
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/costs')

  return {
    id: updatedOrganization.id,
    customFishPrices: (updatedOrganization.custom_fish_prices ?? {}) as Record<string, number>,
  }
}
