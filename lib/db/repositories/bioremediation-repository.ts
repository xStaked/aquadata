import { createClient } from '@/lib/supabase/server'
import type { BioremediationCalc } from '@/db/types'

/**
 * Create a new bioremediation calculation.
 */
export async function createBioremediationCalc(data: {
  user_id: string
  pond_length: number
  pond_width: number
  pond_depth: number
  volume_m3: number
  bioremediation_dose?: number | null
  notes?: string | null
}): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('bioremediation_calcs').insert({
    user_id: data.user_id,
    pond_length: data.pond_length,
    pond_width: data.pond_width,
    pond_depth: data.pond_depth,
    volume_m3: data.volume_m3,
    bioremediation_dose: data.bioremediation_dose ?? null,
    notes: data.notes ?? null,
  })

  if (error) throw new Error(`Error creating bioremediation calc: ${error.message}`)
}

/**
 * Fetch all bioremediation calculations for a user.
 * (bioremediation_calcs is scoped by user_id, not org_id)
 */
export async function getCalcsByUser(userId: string): Promise<BioremediationCalc[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bioremediation_calcs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Error fetching bioremediation calcs: ${error.message}`)
  return (data ?? []).map(normalizeCalc)
}

function normalizeCalc(raw: Record<string, unknown>): BioremediationCalc {
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    pond_length: Number(raw.pond_length),
    pond_width: Number(raw.pond_width),
    pond_depth: Number(raw.pond_depth),
    volume_m3: Number(raw.volume_m3),
    bioremediation_dose: raw.bioremediation_dose != null ? Number(raw.bioremediation_dose) : null,
    notes: (raw.notes as string) ?? null,
    created_at: raw.created_at as string,
  }
}
