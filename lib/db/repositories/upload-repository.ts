import { createClient } from '@/lib/supabase/server'
import type { Upload } from '@/db/types'

/**
 * Fetch all uploads for an organization.
 * Uses a join through batches -> ponds to filter by org.
 */
export async function getUploadsByOrg(orgId: string): Promise<Upload[]> {
  const supabase = await createClient()

  // Uploads are scoped by user_id (the uploader).
  // To get all uploads for an org, we join through batch -> pond -> org.
  const { data, error } = await supabase
    .from('uploads')
    .select('*, batches(*, ponds(*))')
    .or(`batch_id.is.null, batches.ponds.organization_id.eq.${orgId}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Error fetching uploads: ${error.message}`)
  return (data ?? []).map(normalizeUpload)
}

/**
 * Create a new upload record.
 */
export async function createUpload(data: {
  user_id: string
  image_url: string
  batch_id?: string | null
  raw_ocr_text?: string | null
  processed_data?: Record<string, unknown> | null
  status?: string
}): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('uploads').insert({
    user_id: data.user_id,
    image_url: data.image_url,
    batch_id: data.batch_id ?? null,
    raw_ocr_text: data.raw_ocr_text ?? null,
    processed_data: data.processed_data ?? null,
    status: data.status ?? 'pending',
  })

  if (error) throw new Error(`Error creating upload: ${error.message}`)
}

function normalizeUpload(raw: Record<string, unknown>): Upload {
  return {
    id: raw.id as string,
    batch_id: (raw.batch_id as string) ?? null,
    user_id: raw.user_id as string,
    image_url: raw.image_url as string,
    raw_ocr_text: (raw.raw_ocr_text as string) ?? null,
    processed_data: (raw.processed_data as Record<string, unknown>) ?? null,
    status: (raw.status as Upload['status']) ?? 'pending',
    created_at: raw.created_at as string,
  }
}
