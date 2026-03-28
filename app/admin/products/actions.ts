'use server'

import { revalidatePath } from 'next/cache'
import {
  bioremediationProductInputSchema,
  bioremediationProductStatusSchema,
  bioremediationProductUpdateSchema,
} from '@/lib/bioremediation-products/schema'
import { requireAdminUser } from '@/lib/auth/roles'
import { randomUUID } from 'crypto'

function slugifyProductName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function revalidateProductPaths() {
  revalidatePath('/admin')
  revalidatePath('/admin/products')
  revalidatePath('/admin/bioremediation')
  revalidatePath('/admin/bioremediation/cases')
}

export async function uploadProductImage(formData: FormData): Promise<string> {
  const { supabase } = await requireAdminUser()

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    throw new Error('No se recibio un archivo valido.')
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Formato de imagen no permitido. Usa JPG, PNG o WebP.')
  }

  const maxSizeBytes = 2 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    throw new Error('La imagen supera el limite de 2 MB.')
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
  const filename = `${randomUUID()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filename, buffer, { contentType: file.type })

  if (error) {
    throw new Error(error.message || 'No se pudo subir la imagen.')
  }

  const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filename)
  return urlData.publicUrl
}

export async function createBioremediationProduct(input: unknown) {
  const { supabase } = await requireAdminUser()
  const payload = bioremediationProductInputSchema.parse(input)
  const slug = slugifyProductName(payload.name)

  if (!slug) {
    throw new Error('El nombre del producto no es valido para generar un identificador.')
  }

  const { data: existingSlug } = await supabase
    .from('bioremediation_products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existingSlug) {
    throw new Error('Ya existe un producto con un nombre equivalente.')
  }

  const { data, error } = await supabase
    .from('bioremediation_products')
    .insert({
      name: payload.name,
      slug,
      category: payload.category,
      description: payload.description,
      presentation: payload.presentation ?? null,
      dose_unit: payload.dose_unit,
      application_method: payload.application_method ?? null,
      species_scope: payload.species_scope,
      sort_order: payload.sort_order,
      image_url: payload.image_url ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'No se pudo crear el producto.')
  }

  revalidateProductPaths()
  return data
}

export async function updateBioremediationProduct(input: unknown) {
  const { supabase } = await requireAdminUser()
  const payload = bioremediationProductUpdateSchema.parse(input)
  const slug = slugifyProductName(payload.name)

  if (!slug) {
    throw new Error('El nombre del producto no es valido para generar un identificador.')
  }

  const { data: existingSlug } = await supabase
    .from('bioremediation_products')
    .select('id')
    .eq('slug', slug)
    .neq('id', payload.id)
    .maybeSingle()

  if (existingSlug) {
    throw new Error('Ya existe otro producto con un nombre equivalente.')
  }

  const { data, error } = await supabase
    .from('bioremediation_products')
    .update({
      name: payload.name,
      slug,
      category: payload.category,
      description: payload.description,
      presentation: payload.presentation ?? null,
      dose_unit: payload.dose_unit,
      application_method: payload.application_method ?? null,
      species_scope: payload.species_scope,
      sort_order: payload.sort_order,
      image_url: payload.image_url ?? null,
    })
    .eq('id', payload.id)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'No se pudo actualizar el producto.')
  }

  revalidateProductPaths()
  return data
}

export async function toggleBioremediationProductStatus(input: unknown) {
  const { supabase } = await requireAdminUser()
  const payload = bioremediationProductStatusSchema.parse(input)

  const { data, error } = await supabase
    .from('bioremediation_products')
    .update({ is_active: payload.isActive })
    .eq('id', payload.id)
    .select('id, is_active')
    .single()

  if (error) {
    throw new Error(error.message || 'No se pudo actualizar el estado del producto.')
  }

  revalidateProductPaths()
  return data
}
