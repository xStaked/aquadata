'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { Plus, RefreshCcw, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FarmCard } from '@/components/admin/farm-card'
import { listClients, type ClientListItem } from '@/lib/api/clients'
import { listFarms, type FarmListItem } from '@/lib/api/farms'

export default function FarmsPage() {
  const [isPending, startTransition] = useTransition()
  const [farms, setFarms] = useState<FarmListItem[]>([])
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [clientId, setClientId] = useState('all')
  const [speciesType, setSpeciesType] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    startTransition(() => {
      void (async () => {
        try {
          const [farmResponse, clientResponse] = await Promise.all([
            listFarms(),
            listClients({ limit: 100, status: 'active' }),
          ])

          if (!active) return
          setFarms(farmResponse.items)
          setClients(clientResponse.items)
        } catch (loadError) {
          if (!active) return
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el módulo de granjas.',
          )
        }
      })()
    })

    return () => {
      active = false
    }
  }, [])

  const visibleFarms = farms.filter((farm) => {
    const matchesClient = clientId === 'all' || farm.clientId === clientId
    const matchesSpecies = speciesType === 'all' || farm.speciesType === speciesType
    const haystack = `${farm.name} ${farm.client.fullName} ${farm.client.companyName || ''} ${farm.location || ''}`.toLowerCase()
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase())
    return matchesClient && matchesSpecies && matchesSearch
  })

  return (
    <div className="space-y-8 p-6">
      <section className="rounded-[2rem] border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-primary">CRM técnico</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Granjas y operaciones</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Centraliza la operación avícola y porcina, filtra por productor y detecta rápidamente las unidades con mayor actividad técnica.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-primary/20 bg-background/70"
              onClick={() => window.location.reload()}
              disabled={isPending}
            >
              <RefreshCcw className="size-4" />
              Recargar
            </Button>
            <Button asChild>
              <Link href="/admin/farms/new">
                <Plus className="size-4" />
                Nueva granja
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.75rem] border border-border bg-card/80 p-4 shadow-sm lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Search className="size-3.5" />
            Búsqueda rápida
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por granja, productor o ubicación"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <SlidersHorizontal className="size-3.5" />
            Productor
          </div>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los productores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los productores</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Especie</div>
          <Select value={speciesType} onValueChange={setSpeciesType}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las especies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las especies</SelectItem>
              <SelectItem value="poultry">Avícola</SelectItem>
              <SelectItem value="swine">Porcino</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        {visibleFarms.map((farm) => (
          <FarmCard key={farm.id} farm={farm} />
        ))}
      </section>

      {!isPending && !error && visibleFarms.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <p className="text-lg font-medium text-foreground">No hay granjas para los filtros actuales.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajusta la búsqueda o crea una nueva granja para empezar a poblar el módulo.
          </p>
        </div>
      ) : null}
    </div>
  )
}
