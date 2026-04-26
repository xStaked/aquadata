'use client'

import { useState, useTransition, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, ArrowRightLeft, Trash2, Fish } from 'lucide-react'
import { createTransferRecord, deleteTransferRecord } from '@/app/dashboard/transfers/actions'

interface Pond {
  id: string
  name: string
}

interface Batch {
  id: string
  pond_id: string
  pond_name: string
  current_population: number
  start_date: string
}

interface TransferRecord {
  id: string
  transfer_date: string
  animal_count: number
  avg_weight_g: number | null
  is_partial_harvest: boolean
  notes: string | null
  source_pond: { name: string }
  destination_pond: { name: string }
}

interface TransferFormProps {
  ponds: Pond[]
  activeBatches: Batch[]
  transfers: TransferRecord[]
  canEdit: boolean
}

const today = new Date().toISOString().split('T')[0]
const emptyForm = {
  source_batch_id: '',
  destination_pond_id: '',
  transfer_date: today,
  animal_count: '',
  avg_weight_g: '',
  is_partial_harvest: false,
  notes: '',
}

export function TransferForm({ ponds, activeBatches, transfers, canEdit }: TransferFormProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const selectedBatch = useMemo(
    () => activeBatches.find((b) => b.id === form.source_batch_id),
    [activeBatches, form.source_batch_id]
  )

  const maxAnimals = selectedBatch?.current_population ?? 0
  const animals = Number(form.animal_count) || 0
  const weightG = Number(form.avg_weight_g) || 0
  const estimatedBiomassKg = animals > 0 && weightG > 0 ? (animals * weightG) / 1000 : null

  const handleSubmit = () => {
    if (!form.source_batch_id || !form.destination_pond_id || !form.transfer_date || !form.animal_count) {
      setError('Lote origen, estanque destino, fecha y cantidad de animales son requeridos')
      return
    }
    if (animals <= 0) {
      setError('La cantidad de animales debe ser mayor a cero')
      return
    }
    if (selectedBatch && animals > selectedBatch.current_population) {
      setError(`La cantidad excede la población disponible (${selectedBatch.current_population.toLocaleString()} animales)`)
      return
    }

    setError('')
    startTransition(async () => {
      try {
        await createTransferRecord({
          source_batch_id: form.source_batch_id,
          destination_pond_id: form.destination_pond_id,
          transfer_date: form.transfer_date,
          animal_count: animals,
          avg_weight_g: form.avg_weight_g ? Number(form.avg_weight_g) : undefined,
          is_partial_harvest: form.is_partial_harvest,
          notes: form.notes || undefined,
        })
        setOpen(false)
        setForm(emptyForm)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este registro de traslado?')) return
    startTransition(async () => {
      try {
        await deleteTransferRecord(id)
      } catch {
        alert('Error al eliminar traslado')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowRightLeft className="h-4 w-4" />
          <span>
            {transfers.length} traslado{transfers.length !== 1 ? 's' : ''} registrado
            {transfers.length !== 1 ? 's' : ''}
          </span>
        </div>
        {canEdit ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={() => { setForm(emptyForm); setError('') }}>
                <Plus className="h-4 w-4" />
                Registrar traslado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registro de traslado entre estanques</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Lote origen */}
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label>Lote origen *</Label>
                    <Select
                      value={form.source_batch_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, source_batch_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar lote activo…" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeBatches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.pond_name} — {b.current_population.toLocaleString()} animales — Inicio:{' '}
                            {new Date(b.start_date + 'T12:00:00').toLocaleDateString('es-CO')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedBatch && (
                      <p className="text-xs text-muted-foreground">
                        Población disponible:{' '}
                        <span className="font-medium text-foreground">
                          {selectedBatch.current_population.toLocaleString()} animales
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Estanque destino */}
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label>Estanque destino *</Label>
                    <Select
                      value={form.destination_pond_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, destination_pond_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estanque…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ponds
                          .filter((p) => p.id !== selectedBatch?.pond_id)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fecha */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="t-date">Fecha de traslado *</Label>
                    <DatePicker
                      id="t-date"
                      value={form.transfer_date}
                      onChange={(value) => setForm((f) => ({ ...f, transfer_date: value }))}
                      placeholder="Selecciona la fecha"
                    />
                  </div>

                  {/* Animales */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="t-animals">N.° animales trasladados *</Label>
                    <Input
                      id="t-animals"
                      type="number"
                      min="1"
                      max={maxAnimals || undefined}
                      placeholder="Ej: 5000"
                      value={form.animal_count}
                      onChange={(e) => setForm((f) => ({ ...f, animal_count: e.target.value }))}
                    />
                  </div>

                  {/* Peso promedio */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="t-weight">Peso promedio (g)</Label>
                    <Input
                      id="t-weight"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Ej: 45"
                      value={form.avg_weight_g}
                      onChange={(e) => setForm((f) => ({ ...f, avg_weight_g: e.target.value }))}
                    />
                  </div>

                  {/* Cosecha parcial */}
                  <div className="col-span-2 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
                    <Checkbox
                      id="t-partial"
                      checked={form.is_partial_harvest}
                      onCheckedChange={(checked) =>
                        setForm((f) => ({ ...f, is_partial_harvest: checked === true }))
                      }
                    />
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor="t-partial" className="text-sm font-medium">
                        Cosecha parcial
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Si dejas animales en el origen, el lote seguirá activo para futuros traslados.
                      </p>
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="t-notes">Notas / Observaciones</Label>
                    <Input
                      id="t-notes"
                      placeholder="Ej: Traslado por malla, condiciones óptimas…"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Preview de biomasa */}
                {estimatedBiomassKg != null && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Estimación de biomasa trasladada
                    </p>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Biomasa total:</span>
                      <span className="ml-2 font-semibold">{estimatedBiomassKg.toFixed(1)} kg</span>
                    </div>
                  </div>
                )}

                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending ? 'Guardando…' : 'Registrar traslado'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Origen → Destino</TableHead>
            <TableHead>Animales</TableHead>
            <TableHead>Peso prom.</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Notas</TableHead>
            {canEdit ? <TableHead /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canEdit ? 7 : 6}
                className="h-20 text-center text-muted-foreground"
              >
                No hay traslados registrados.
              </TableCell>
            </TableRow>
          ) : (
            transfers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm">
                  {new Date(t.transfer_date + 'T12:00:00').toLocaleDateString('es-CO')}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    <span>{t.source_pond.name}</span>
                    <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                    <span>{t.destination_pond.name}</span>
                  </div>
                </TableCell>
                <TableCell>{t.animal_count.toLocaleString()}</TableCell>
                <TableCell>
                  {t.avg_weight_g != null ? `${t.avg_weight_g} g` : '—'}
                </TableCell>
                <TableCell>
                  {t.is_partial_harvest ? (
                    <Badge variant="outline" className="text-xs">
                      Parcial
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Total
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {t.notes || '—'}
                </TableCell>
                {canEdit ? (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
