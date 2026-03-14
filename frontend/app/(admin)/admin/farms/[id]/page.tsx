'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { ArrowLeft, Bird, CalendarClock, MapPinned, PiggyBank, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getFarm, getFarmSpeciesLabel, getFarmStats, type FarmDetail, type FarmStats } from '@/lib/api/farms'

export default function FarmDetailPage() {
  const params = useParams<{ id: string }>()
  const [isPending, startTransition] = useTransition()
  const [farm, setFarm] = useState<FarmDetail | null>(null)
  const [stats, setStats] = useState<FarmStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params.id) return

    let active = true

    startTransition(() => {
      void (async () => {
        try {
          const [farmResponse, statsResponse] = await Promise.all([
            getFarm(params.id),
            getFarmStats(params.id),
          ])

          if (!active) return
          setFarm(farmResponse)
          setStats(statsResponse)
        } catch (loadError) {
          if (!active) return
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar la ficha de la granja.',
          )
        }
      })()
    })

    return () => {
      active = false
    }
  }, [params.id])

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  if (isPending || !farm || !stats) {
    return (
      <div className="p-6">
        <div className="rounded-[1.75rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Cargando ficha operativa de la granja...
        </div>
      </div>
    )
  }

  const SpeciesIcon = farm.speciesType === 'swine' ? PiggyBank : Bird

  return (
    <div className="space-y-6 p-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/admin/farms">
          <ArrowLeft className="size-4" />
          Volver a granjas
        </Link>
      </Button>

      <section className="rounded-[2rem] border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit gap-1 bg-primary/15 text-primary hover:bg-primary/15">
              <SpeciesIcon className="size-3.5" />
              {getFarmSpeciesLabel(farm.speciesType)}
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{farm.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {farm.client.fullName} {farm.client.companyName ? `· ${farm.client.companyName}` : ''}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
            <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Capacidad</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {farm.capacity?.toLocaleString('es-CO') || 'N/D'}
              </p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ubicación</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{farm.location || 'Pendiente'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Visitas</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats.kpis.totalVisits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Casos totales</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats.kpis.totalCases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Casos abiertos</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats.kpis.openCases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Casos cerrados</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats.kpis.closedCases}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle>Historial de visitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {farm.visits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                Aún no hay visitas registradas para esta granja.
              </div>
            ) : (
              farm.visits.map((visit) => (
                <div key={visit.id} className="rounded-2xl border border-border/70 bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarClock className="size-4 text-primary" />
                      {new Date(visit.visitDate).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    <Badge variant="outline">Asesor {visit.advisorId.slice(0, 8)}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {visit.observations || 'Sin observaciones registradas.'}
                  </p>
                  {visit.recommendations ? (
                    <p className="mt-2 text-sm text-foreground">
                      Recomendaciones: {visit.recommendations}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contexto operativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <MapPinned className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Ubicación</p>
                  <p className="text-muted-foreground">{farm.location || 'Sin ubicación registrada'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <ShieldAlert className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Última visita</p>
                  <p className="text-muted-foreground">
                    {stats.lastVisit
                      ? new Date(stats.lastVisit.visitDate).toLocaleDateString('es-CO')
                      : 'Aún no se han registrado visitas'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productor asociado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-lg font-medium text-foreground">{farm.client.fullName}</p>
              <p className="text-muted-foreground">
                {farm.client.companyName || 'Sin razón social registrada'}
              </p>
              <p className="text-muted-foreground">{farm.client.email || 'Sin correo registrado'}</p>
              <p className="text-muted-foreground">{farm.client.phone || 'Sin teléfono registrado'}</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
