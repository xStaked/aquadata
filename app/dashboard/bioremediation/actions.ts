'use server'

import { revalidatePath } from 'next/cache'
import { createBioremediationCalc, getOrgContext } from '@/lib/db'
import { isWriterRole } from '@/lib/auth/roles'

export async function saveBioremediationCalc(data: {
  pond_length: number
  pond_width: number
  pond_depth: number
  volume_m3: number
  bioremediation_dose: number
}) {
  const ctx = await getOrgContext()

  if (!isWriterRole(ctx.role)) {
    throw new Error('Tu usuario tiene permisos de solo lectura')
  }

  await createBioremediationCalc({
    user_id: ctx.userId,
    pond_length: data.pond_length,
    pond_width: data.pond_width,
    pond_depth: data.pond_depth,
    volume_m3: data.volume_m3,
    bioremediation_dose: data.bioremediation_dose,
  })

  revalidatePath('/dashboard/bioremediation')
}
