'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'

import { updateBatchDetails } from '@/app/dashboard/ponds/actions'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function BatchEditModal({
  batchId,
  startDate: initialStartDate,
  pondEntryDate: initialPondEntryDate,
  seedSource: initialSeedSource,
}: {
  batchId: string
  startDate: string
  pondEntryDate: string | null
  seedSource: string | null
}) {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [pondEntryDate, setPondEntryDate] = useState(initialPondEntryDate ?? initialStartDate)
  const [seedSource, setSeedSource] = useState(initialSeedSource ?? '')

  const resetState = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setError(null)
      setIsSaving(false)
      setStartDate(initialStartDate)
      setPondEntryDate(initialPondEntryDate ?? initialStartDate)
      setSeedSource(initialSeedSource ?? '')
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      const formData = new FormData()
      formData.set('batch_id', batchId)
      formData.set('start_date', startDate)
      formData.set('pond_entry_date', pondEntryDate)
      formData.set('seed_source', seedSource)

      await updateBatchDetails(formData)
      resetState(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el lote')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetState}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar lote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`batch-start-date-${batchId}`}>Fecha de inicio</Label>
            <DatePicker
              id={`batch-start-date-${batchId}`}
              value={startDate}
              onChange={setStartDate}
              buttonClassName="w-full justify-between"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`batch-pond-entry-date-${batchId}`}>Fecha ingreso al lago</Label>
            <DatePicker
              id={`batch-pond-entry-date-${batchId}`}
              value={pondEntryDate}
              onChange={setPondEntryDate}
              buttonClassName="w-full justify-between"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`batch-seed-source-${batchId}`}>Origen de semilla</Label>
            <Input
              id={`batch-seed-source-${batchId}`}
              value={seedSource}
              onChange={(event) => setSeedSource(event.target.value)}
              placeholder="Proveedor o hatchery"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => resetState(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
