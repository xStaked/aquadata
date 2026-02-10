import { createClient } from '@/lib/supabase/server'
import { UploadForm } from '@/components/upload-form'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  let batches: Array<{
    id: string
    pond_name: string
    start_date: string
    status: string
  }> = []

  if (profile?.organization_id) {
    const { data: ponds } = await supabase
      .from('ponds')
      .select('id, name')
      .eq('organization_id', profile.organization_id)

    if (ponds && ponds.length > 0) {
      const pondIds = ponds.map(p => p.id)
      const { data: activeBatches } = await supabase
        .from('batches')
        .select('id, pond_id, start_date, status')
        .in('pond_id', pondIds)
        .eq('status', 'active')

      if (activeBatches) {
        batches = activeBatches.map(b => ({
          id: b.id,
          pond_name: ponds.find(p => p.id === b.pond_id)?.name ?? 'Estanque',
          start_date: b.start_date,
          status: b.status,
        }))
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Captura OCR</h1>
        <p className="mt-1 text-muted-foreground">
          Sube una foto de tu reporte de campo y la IA extraera los datos automaticamente
        </p>
      </div>
      <UploadForm batches={batches} />
    </div>
  )
}
