import { createClient } from '@/lib/supabase/server'
import { ArrowRightLeft } from 'lucide-react'
import { isWriterRole } from '@/lib/auth/roles'
import { ReadOnlyBanner } from '@/components/read-only-banner'
import { TransferForm } from '@/components/transfer-form'
import { getTransfersByOrg } from '@/lib/db'

export default async function TransfersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const canEdit = isWriterRole(profile?.role)

  let transfers: Awaited<ReturnType<typeof getTransfersByOrg>> = []
  let activeBatches: Array<{
    id: string
    pond_id: string
    pond_name: string
    current_population: number
    start_date: string
  }> = []
  let ponds: Array<{ id: string; name: string }> = []

  if (profile?.organization_id) {
    const [
      { data: pondsData },
      { data: batchesData },
      transfersData,
    ] = await Promise.all([
      supabase
        .from('ponds')
        .select('id, name')
        .eq('organization_id', profile.organization_id)
        .order('sort_order', { ascending: true })
        .order('name'),
      supabase
        .from('batches')
        .select('id, pond_id, status, start_date, current_population')
        .eq('status', 'active'),
      getTransfersByOrg(profile.organization_id),
    ])

    ponds = (pondsData ?? []).map((p) => ({ id: p.id, name: p.name }))

    const pondMap: Record<string, string> = {}
    for (const p of pondsData ?? []) pondMap[p.id] = p.name

    activeBatches = (batchesData ?? [])
      .filter((b) => pondMap[b.pond_id])
      .map((b) => ({
        id: b.id,
        pond_id: b.pond_id,
        pond_name: pondMap[b.pond_id] ?? 'S/E',
        current_population: b.current_population || 0,
        start_date: b.start_date,
      }))

    transfers = transfersData
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Traslados
          </h1>
          <p className="mt-1 text-muted-foreground">
            Registro de movimientos de animales entre estanques
          </p>
        </div>
      </div>

      {!canEdit ? (
        <ReadOnlyBanner description="Puedes consultar los traslados históricos, pero no registrar ni eliminar traslados." />
      ) : null}

      <TransferForm
        ponds={ponds}
        activeBatches={activeBatches}
        transfers={transfers}
        canEdit={canEdit}
      />
    </div>
  )
}
