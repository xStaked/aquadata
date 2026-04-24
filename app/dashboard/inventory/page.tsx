import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Package } from 'lucide-react'
import { ConcentrateManager } from '@/components/concentrate-manager'
import { FeedInventoryManager } from '@/components/feed-inventory-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type Concentrate, type FeedInventoryEntry, type FeedStock } from '../costs/types'
import { isWriterRole } from '@/lib/auth/roles'
import { ReadOnlyBanner } from '@/components/read-only-banner'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const canEdit = isWriterRole(profile?.role)

  let concentrates: Concentrate[] = []
  let inventoryEntries: FeedInventoryEntry[] = []
  let stock: FeedStock[] = []

  if (profile?.organization_id) {
    const [
      { data: rawConcentrates },
      { data: rawInventoryEntries },
      { data: rawStock },
      { data: rawLatestCosts },
    ] = await Promise.all([
      supabase
        .from('feed_concentrates')
        .select('id, name, brand, price_per_kg, protein_pct, is_active')
        .eq('organization_id', profile.organization_id)
        .order('name'),
      supabase
        .from('feed_inventory_entries')
        .select('id, concentrate_id, bags_received, kg_per_bag, price_per_bag, supplier, lot_number, entry_date, notes')
        .eq('organization_id', profile.organization_id)
        .order('entry_date', { ascending: false }),
      supabase
        .from('feed_stock_summary')
        .select('concentrate_id, total_bags, total_kg_in, total_kg_out, available_kg')
        .eq('organization_id', profile.organization_id),
      supabase
        .from('feed_latest_entry_cost')
        .select('concentrate_id, latest_cost_per_kg')
        .eq('organization_id', profile.organization_id),
    ])

    const concentrateMap: Record<string, string> = {}
    concentrates = (rawConcentrates ?? []).map(c => {
      concentrateMap[c.id] = c.name
      return {
        id: c.id,
        name: c.name,
        brand: c.brand,
        price_per_kg: Number(c.price_per_kg),
        protein_pct: c.protein_pct != null ? Number(c.protein_pct) : null,
        is_active: c.is_active,
      }
    })

    inventoryEntries = (rawInventoryEntries ?? []).map(e => ({
      id: e.id,
      concentrate_id: e.concentrate_id,
      concentrate_name: concentrateMap[e.concentrate_id] ?? 'Desconocido',
      bags_received: Number(e.bags_received),
      kg_per_bag: Number(e.kg_per_bag),
      price_per_bag: Number(e.price_per_bag),
      supplier: e.supplier,
      lot_number: e.lot_number,
      entry_date: e.entry_date,
      notes: e.notes,
    }))

    const latestCostMap: Record<string, number | null> = {}
    for (const lc of (rawLatestCosts ?? [])) {
      latestCostMap[lc.concentrate_id] = lc.latest_cost_per_kg != null ? Number(lc.latest_cost_per_kg) : null
    }

    stock = (rawStock ?? []).map(s => ({
      concentrate_id: s.concentrate_id,
      concentrate_name: concentrateMap[s.concentrate_id] ?? 'Desconocido',
      total_bags: Number(s.total_bags),
      total_kg_in: Number(s.total_kg_in),
      total_kg_out: Number(s.total_kg_out),
      available_kg: Number(s.available_kg),
      latest_cost_per_kg: latestCostMap[s.concentrate_id] ?? null,
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Inventario de concentrado
          </h1>
          <p className="mt-1 text-muted-foreground">
            Registra compras, controla stock disponible y revisa historial de entradas
          </p>
        </div>
      </div>

      {!canEdit ? (
        <ReadOnlyBanner description="Puedes consultar el inventario y el historial de compras, pero no registrar ni editar entradas." />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Concentrados registrados</CardTitle>
          <CardDescription>
            Alimentos que usa en su granja: nombre, marca, precio y % de proteína.
            {canEdit
              ? ' Puedes agregar, editar o desactivar concentrados.'
              : ' Vista histórica en modo solo lectura.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConcentrateManager concentrates={concentrates} canEdit={canEdit} />
        </CardContent>
      </Card>

      <FeedInventoryManager
        concentrates={concentrates}
        inventoryEntries={inventoryEntries}
        stock={stock}
        canEdit={canEdit}
      />
    </div>
  )
}
