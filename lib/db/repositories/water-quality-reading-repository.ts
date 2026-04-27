import { createClient } from '@/lib/supabase/server'
import type { WaterQualityReading } from '@/db/types'

const SELECT = `
  id,
  pond_id,
  batch_id,
  reading_date,
  reading_time,
  temperature_c,
  oxygen_mg_l,
  notes,
  created_by,
  created_at
`.replace(/\s+/g, ' ').trim()

function normalize(raw: Record<string, unknown>): WaterQualityReading {
  return {
    id: raw.id as string,
    pond_id: raw.pond_id as string,
    batch_id: (raw.batch_id as string) ?? null,
    reading_date: raw.reading_date as string,
    reading_time: (raw.reading_time as string) ?? null,
    temperature_c: raw.temperature_c != null ? Number(raw.temperature_c) : null,
    oxygen_mg_l: raw.oxygen_mg_l != null ? Number(raw.oxygen_mg_l) : null,
    notes: (raw.notes as string) ?? null,
    created_by: (raw.created_by as string) ?? null,
    created_at: raw.created_at as string,
  }
}

export async function createWaterQualityReading(data: {
  pond_id: string
  batch_id?: string | null
  reading_date: string
  reading_time?: string | null
  temperature_c?: number | null
  oxygen_mg_l?: number | null
  notes?: string | null
  created_by?: string | null
}): Promise<string> {
  const supabase = await createClient()

  const { data: inserted, error } = await supabase
    .from('water_quality_readings')
    .insert({
      pond_id: data.pond_id,
      batch_id: data.batch_id ?? null,
      reading_date: data.reading_date,
      reading_time: data.reading_time ?? null,
      temperature_c: data.temperature_c ?? null,
      oxygen_mg_l: data.oxygen_mg_l ?? null,
      notes: data.notes ?? null,
      created_by: data.created_by ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Error creating water quality reading: ${error.message}`)
  return inserted.id as string
}

export async function getWaterQualityReadingsByPondAndDate(
  pondId: string,
  date: string
): Promise<WaterQualityReading[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('water_quality_readings')
    .select(SELECT)
    .eq('pond_id', pondId)
    .eq('reading_date', date)
    .order('reading_time', { ascending: false })

  if (error) throw new Error(`Error fetching water quality readings: ${error.message}`)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(normalize)
}

export async function getLatestWaterQualityReadingByPond(
  pondId: string
): Promise<WaterQualityReading | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('water_quality_readings')
    .select(SELECT)
    .eq('pond_id', pondId)
    .order('reading_date', { ascending: false })
    .order('reading_time', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Error fetching latest water quality reading: ${error.message}`)
  if (!data || data.length === 0) return null
  return normalize(data[0] as unknown as Record<string, unknown>)
}

export async function getWaterQualityReadingsByPond(
  pondId: string,
  limit = 50
): Promise<WaterQualityReading[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('water_quality_readings')
    .select(SELECT)
    .eq('pond_id', pondId)
    .order('reading_date', { ascending: false })
    .order('reading_time', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Error fetching water quality readings: ${error.message}`)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(normalize)
}
