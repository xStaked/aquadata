'use client'

import { Button } from '@/components/ui/button'
import { Trash2, XCircle } from 'lucide-react'
import { deletePond, closeBatch } from '@/app/dashboard/ponds/actions'
import { useState } from 'react'

export function DeletePondButton({ pondId }: { pondId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Seguro que deseas eliminar este estanque? Se eliminaran todos los lotes y registros asociados.')) return
    setIsLoading(true)
    try {
      await deletePond(pondId)
    } catch {
      alert('Error al eliminar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={isLoading}
      aria-label="Eliminar estanque"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}

export function CloseBatchButton({ batchId }: { batchId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClose = async () => {
    if (!confirm('Cerrar este lote? No podras agregar mas registros.')) return
    setIsLoading(true)
    try {
      await closeBatch(batchId)
    } catch {
      alert('Error al cerrar lote')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1 text-muted-foreground hover:text-destructive"
      onClick={handleClose}
      disabled={isLoading}
    >
      <XCircle className="h-3.5 w-3.5" />
      Cerrar
    </Button>
  )
}
