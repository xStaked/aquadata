'use client'

import { useState } from 'react'
import { Loader2, Package } from 'lucide-react'
import { toggleBioremediationProductStatus } from '@/app/admin/products/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type ProductTableRow = {
  id: string
  name: string
  category: 'agua' | 'suelo'
  description: string
  dose_unit: string
  species_scope: string[]
  presentation: string | null
  is_active: boolean
  image_url: string | null
}

export function ProductTable({ rows }: { rows: ProductTableRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async (row: ProductTableRow) => {
    setPendingId(row.id)
    setError(null)

    try {
      await toggleBioremediationProductStatus({
        id: row.id,
        isActive: !row.is_active,
      })
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : 'No se pudo actualizar el estado del producto.',
      )
    } finally {
      setPendingId(null)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">Aun no hay productos registrados.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Crea el primer producto para gobernar el catalogo de bioremediacion.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium text-muted-foreground">Imagen</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Producto</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Categoria</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Unidad</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Especies</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isPending = pendingId === row.id

              return (
                <tr key={row.id} className="border-b border-border/70 align-middle last:border-b-0">
                  <td className="px-4 py-4">
                    {row.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.image_url}
                        alt={row.name}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.description}</p>
                      {row.presentation ? (
                        <p className="text-xs text-muted-foreground">Presentacion: {row.presentation}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {row.category === 'agua' ? 'Agua' : 'Suelo'}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{row.dose_unit}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {row.species_scope.length > 0 ? row.species_scope.join(', ') : 'Todas'}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={row.is_active ? 'default' : 'secondary'}>
                      {row.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(row)}
                      disabled={isPending}
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {row.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
