'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { createPond } from '@/app/dashboard/ponds/actions'

export function PondForm({ hasOrganization }: { hasOrganization: boolean }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const formData = new FormData(e.currentTarget)
      await createPond(formData)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear estanque')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Estanque
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Agregar Estanque</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!hasOrganization && (
            <div className="grid gap-2">
              <Label htmlFor="org_name">Nombre de la granja</Label>
              <Input
                id="org_name"
                name="org_name"
                placeholder="Mi Granja Acuicola"
                required
              />
              <p className="text-xs text-muted-foreground">
                Se creara tu organizacion automaticamente
              </p>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del estanque</Label>
            <Input id="name" name="name" placeholder="Estanque A-1" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="area_m2">Area (m2)</Label>
              <Input id="area_m2" name="area_m2" type="number" step="0.01" placeholder="100" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="depth_m">Profundidad (m)</Label>
              <Input id="depth_m" name="depth_m" type="number" step="0.01" placeholder="1.5" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="species">Especie</Label>
            <Input id="species" name="species" placeholder="Tilapia, Camaron..." />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creando...' : 'Crear Estanque'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
