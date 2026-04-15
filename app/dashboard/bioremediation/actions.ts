'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createBioremediationCalc } from '@/lib/db'

export async function saveBioremediationCalc(data: {
  pond_length: number
  pond_width: number
  pond_depth: number
  volume_m3: number
  bioremediation_dose: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await createBioremediationCalc({
    user_id: user.id,
    pond_length: data.pond_length,
    pond_width: data.pond_width,
    pond_depth: data.pond_depth,
    volume_m3: data.volume_m3,
    bioremediation_dose: data.bioremediation_dose,
  })

  revalidatePath('/dashboard/bioremediation')
}
