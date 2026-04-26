import { createClient } from '@/lib/supabase/server'
import { ArrowRightLeft, Fish, Layers, Scale } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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

  const totalTransfers = transfers.length
  const totalAnimals = transfers.reduce((sum, t) => sum + t.animal_count, 0)
  const partialTransfers = transfers.filter((t) => t.is_partial_harvest).length
  const totalBiomassKg = transfers.reduce(
    (sum, t) => sum + (t.avg_weight_g ? (t.animal_count * t.avg_weight_g) / 1000 : 0),
    0
  )

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

      {transfers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary transition-shadow hover:shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total traslados</p>
                <p className="text-xl font-bold leading-tight">{totalTransfers}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-sky-500 transition-shadow hover:shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <Fish className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Animales trasladados</p>
                <p className="text-xl font-bold leading-tight">{totalAnimals.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 transition-shadow hover:shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Layers className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Traslados parciales</p>
                <p className="text-xl font-bold leading-tight">{partialTransfers}</p>
                <p className="text-[11px] text-muted-foreground">
                  {totalTransfers > 0 ? Math.round((partialTransfers / totalTransfers) * 100) : 0}% del total
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 transition-shadow hover:shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Scale className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Biomasa trasladada</p>
                <p className="text-xl font-bold leading-tight">{totalBiomassKg.toFixed(1)} kg</p>
                <p className="text-[11px] text-muted-foreground">estimación total</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <TransferForm
        ponds={ponds}
        activeBatches={activeBatches}
        transfers={transfers}
        canEdit={canEdit}
      />
    </div>
  )
}
