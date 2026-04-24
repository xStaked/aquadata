'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { createBatch } from '@/app/dashboard/ponds/actions'

export function BatchForm({ pondId }: { pondId: string }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      if (!startDate) {
        throw new Error('La fecha de inicio es requerida')
      }

      const formData = new FormData(e.currentTarget)
      formData.set('pond_id', pondId)
      formData.set('start_date', startDate)
      await createBatch(formData)
      setOpen(false)
      setStartDate(new Date().toISOString().split('T')[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear lote')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 bg-transparent">
          <Plus className="h-3.5 w-3.5" />
          Nuevo Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Iniciar Nuevo Lote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="start_date">Fecha de inicio</Label>
            <DatePicker
              id="start_date"
              name="start_date"
              value={startDate}
              onChange={setStartDate}
              required
              placeholder="Selecciona la fecha de siembra"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="initial_population">Poblacion inicial</Label>
            <Input
              id="initial_population"
              name="initial_population"
              type="number"
              placeholder="10000"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seed_source">Origen de semilla</Label>
            <Input
              id="seed_source"
              name="seed_source"
              type="text"
              placeholder="Proveedor o hatchery"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creando...' : 'Iniciar Lote'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
