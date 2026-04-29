'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { createDailyFeedRecord, updateDailyFeedRecord } from '@/app/dashboard/feed/daily-actions'
import type { Concentrate, BatchForForms } from '@/app/dashboard/costs/types'

interface DailyFeedRecord {
  id: string
  batch_id: string
  record_date: string
  concentrate_id: string | null
  concentrate_name: string
  bags_am: number
  bags_pm: number
  bags_total: number
  kg_per_bag: number
  kg_total: number
  mortality_count: number
  notes: string | null
}

interface DailyFeedFormDialogProps {
  concentrates: Concentrate[]
  batches: BatchForForms[]
  record?: DailyFeedRecord
  trigger?: React.ReactNode
}

export function DailyFeedFormDialog({ concentrates, batches, record, trigger }: DailyFeedFormDialogProps) {
  const isEdit = !!record
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emptyForm = {
    batch_id: '',
    record_date: new Date().toISOString().split('T')[0],
    concentrate_id: '',
    bags_am: '',
    bags_pm: '',
    kg_per_bag: '40',
    mortality_count: '',
    notes: '',
  }

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (record && open) {
      setForm({
        batch_id: record.batch_id,
        record_date: record.record_date,
        concentrate_id: record.concentrate_id ?? '',
        bags_am: String(record.bags_am),
        bags_pm: String(record.bags_pm),
        kg_per_bag: String(record.kg_per_bag),
        mortality_count: String(record.mortality_count),
        notes: record.notes ?? '',
      })
    }
  }, [record, open])

  const selectedConcentrate = concentrates.find((c) => c.id === form.concentrate_id)

  const handleSubmit = async () => {
    setError(null)

    if (!form.batch_id) {
      setError('Selecciona un lote')
      return
    }
    if (!form.record_date) {
      setError('Selecciona una fecha')
      return
    }
    if (!form.concentrate_id) {
      setError('Selecciona un concentrado')
      return
    }

    const bagsAm = Number(form.bags_am) || 0
    const bagsPm = Number(form.bags_pm) || 0
    if (bagsAm === 0 && bagsPm === 0) {
      setError('Ingresa al menos bultos AM o PM')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        batch_id: form.batch_id,
        record_date: form.record_date,
        concentrate_id: form.concentrate_id,
        concentrate_name: selectedConcentrate?.name ?? 'Desconocido',
        bags_am: bagsAm,
        bags_pm: bagsPm,
        kg_per_bag: Number(form.kg_per_bag) || 40,
        mortality_count: Number(form.mortality_count) || 0,
        notes: form.notes || undefined,
      }

      if (isEdit) {
        await updateDailyFeedRecord(record.id, payload)
      } else {
        await createDailyFeedRecord(payload)
      }

      setOpen(false)
      if (!isEdit) {
        setForm(emptyForm)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={isEdit ? 'ghost' : 'default'} size={isEdit ? 'icon' : 'default'} className={isEdit ? 'h-7 w-7' : ''}>
            {isEdit ? <Pencil className="h-3.5 w-3.5" /> : <><Plus className="h-4 w-4 mr-2" />Nuevo registro</>}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar registro diario' : 'Registrar alimentación diaria'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los datos del registro seleccionado.'
              : 'Ingresa los datos de alimentación, concentrado y mortalidad para un día específico.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="batch_id">Lote / Estanque</Label>
              <Select value={form.batch_id} onValueChange={(v) => setForm({ ...form, batch_id: v })}>
                <SelectTrigger id="batch_id">
                  <SelectValue placeholder="Selecciona un lote" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.pond_name} — {b.species}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="record_date">Fecha</Label>
              <DatePicker
                id="record_date"
                value={form.record_date}
                onChange={(v) => setForm({ ...form, record_date: v })}
                placeholder="Selecciona la fecha"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="concentrate_id">Concentrado</Label>
            <Select value={form.concentrate_id} onValueChange={(v) => setForm({ ...form, concentrate_id: v })}>
              <SelectTrigger id="concentrate_id">
                <SelectValue placeholder="Selecciona un concentrado" />
              </SelectTrigger>
              <SelectContent>
                {concentrates.filter((c) => c.is_active).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.brand ? `(${c.brand})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bags_am">Bultos AM</Label>
              <Input
                id="bags_am"
                type="number"
                min={0}
                step="0.1"
                value={form.bags_am}
                onChange={(e) => setForm({ ...form, bags_am: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bags_pm">Bultos PM</Label>
              <Input
                id="bags_pm"
                type="number"
                min={0}
                step="0.1"
                value={form.bags_pm}
                onChange={(e) => setForm({ ...form, bags_pm: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kg_per_bag">Kg por bulto</Label>
              <Input
                id="kg_per_bag"
                type="number"
                min={1}
                step="0.1"
                value={form.kg_per_bag}
                onChange={(e) => setForm({ ...form, kg_per_bag: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-md border border-primary/10 bg-primary/5 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Total estimado:{' '}
              <span className="font-semibold text-foreground">
                {((Number(form.bags_am) || 0) + (Number(form.bags_pm) || 0)) * (Number(form.kg_per_bag) || 40)} kg
              </span>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mortality_count">Mortalidad</Label>
            <Input
              id="mortality_count"
              type="number"
              min={0}
              value={form.mortality_count}
              onChange={(e) => setForm({ ...form, mortality_count: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas adicionales..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              isEdit ? 'Guardar cambios' : 'Guardar registro'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
