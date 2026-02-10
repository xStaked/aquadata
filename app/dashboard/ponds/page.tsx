import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Waves, Fish, Calendar } from 'lucide-react'
import { PondForm } from '@/components/pond-form'
import { BatchForm } from '@/components/batch-form'
import { DeletePondButton } from '@/components/pond-actions'
import { CloseBatchButton } from '@/components/pond-actions'
import { format } from 'date-fns'

export default async function PondsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const hasOrganization = !!profile?.organization_id

  let ponds: Array<{
    id: string
    name: string
    area_m2: number | null
    depth_m: number | null
    species: string | null
    status: string
    created_at: string
    batches: Array<{
      id: string
      start_date: string
      end_date: string | null
      initial_population: number
      current_population: number | null
      status: string
    }>
  }> = []

  if (profile?.organization_id) {
    const { data } = await supabase
      .from('ponds')
      .select(`
        id, name, area_m2, depth_m, species, status, created_at,
        batches (id, start_date, end_date, initial_population, current_population, status)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    ponds = (data as typeof ponds) ?? []
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Estanques</h1>
          <p className="mt-1 text-muted-foreground">Gestiona tus estanques y lotes productivos</p>
        </div>
        <PondForm hasOrganization={hasOrganization} />
      </div>

      {ponds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Waves className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No hay estanques</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Crea tu primer estanque para empezar a registrar lotes y datos de produccion.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ponds.map((pond) => {
            const activeBatches = pond.batches?.filter(b => b.status === 'active') ?? []
            return (
              <Card key={pond.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <Waves className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base text-foreground">{pond.name}</CardTitle>
                  </div>
                  <DeletePondButton pondId={pond.id} />
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {pond.species && (
                      <Badge variant="secondary" className="gap-1">
                        <Fish className="h-3 w-3" />
                        {pond.species}
                      </Badge>
                    )}
                    {pond.area_m2 && <Badge variant="outline">{pond.area_m2} m2</Badge>}
                    {pond.depth_m && <Badge variant="outline">{pond.depth_m} m prof.</Badge>}
                  </div>

                  {/* Batches */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        Lotes ({activeBatches.length} activos)
                      </p>
                      <BatchForm pondId={pond.id} />
                    </div>

                    {pond.batches && pond.batches.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {pond.batches.map((batch) => (
                          <div
                            key={batch.id}
                            className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2"
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={batch.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {batch.status === 'active' ? 'Activo' : 'Cerrado'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {batch.current_population?.toLocaleString() ?? batch.initial_population.toLocaleString()} peces
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(batch.start_date), 'dd/MM/yyyy')}
                              </div>
                            </div>
                            {batch.status === 'active' && (
                              <CloseBatchButton batchId={batch.id} />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sin lotes registrados</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
