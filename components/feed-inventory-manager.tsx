'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Package, Plus, Pencil, Trash2, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react'
import {
  createFeedInventoryEntry,
  updateFeedInventoryEntry,
  deleteFeedInventoryEntry,
} from '@/app/dashboard/feed/actions'
import { formatCOP } from '@/lib/format'

interface Concentrate {
  id: string
  name: string
  brand: string | null
}

interface InventoryEntry {
  id: string
  concentrate_id: string
  concentrate_name: string
  bags_received: number
  kg_per_bag: number
  price_per_bag: number
  supplier: string | null
  lot_number: string | null
  entry_date: string
  notes: string | null
}

interface StockItem {
  concentrate_id: string
  concentrate_name: string
  total_bags: number
  total_kg_in: number
  total_kg_out: number
  available_kg: number
  latest_cost_per_kg: number | null
}

interface FeedInventoryManagerProps {
  concentrates: Concentrate[]
  inventoryEntries: InventoryEntry[]
  stock: StockItem[]
  canEdit: boolean
}

const emptyForm = {
  concentrate_id: '',
  bags_received: '',
  kg_per_bag: '40',
  price_per_bag: '',
  supplier: '',
  lot_number: '',
  entry_date: new Date().toISOString().split('T')[0],
  notes: '',
}

type FormState = typeof emptyForm

function calculateCostPerKg(pricePerBag: number, kgPerBag: number): number | null {
  if (!pricePerBag || !kgPerBag || kgPerBag <= 0) return null
  return pricePerBag / kgPerBag
}

export function FeedInventoryManager({ concentrates, inventoryEntries, stock, canEdit }: FeedInventoryManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [openAdd, setOpenAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<InventoryEntry | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setError('')
    setOpenAdd(true)
  }

  const handleOpenEdit = (entry: InventoryEntry) => {
    setForm({
      concentrate_id: entry.concentrate_id,
      bags_received: String(entry.bags_received),
      kg_per_bag: String(entry.kg_per_bag),
      price_per_bag: String(entry.price_per_bag),
      supplier: entry.supplier ?? '',
      lot_number: entry.lot_number ?? '',
      entry_date: entry.entry_date,
      notes: entry.notes ?? '',
    })
    setError('')
    setEditTarget(entry)
  }

  const validateForm = (): boolean => {
    if (!form.concentrate_id) {
      setError('Selecciona un concentrado')
      return false
    }
    if (!form.bags_received || Number(form.bags_received) <= 0) {
      setError('La cantidad de bultos debe ser mayor a 0')
      return false
    }
    if (!form.kg_per_bag || Number(form.kg_per_bag) <= 0) {
      setError('Los kg por bulto deben ser mayor a 0')
      return false
    }
    if (!form.price_per_bag || Number(form.price_per_bag) <= 0) {
      setError('El precio por bulto debe ser mayor a 0')
      return false
    }
    if (!form.entry_date) {
      setError('La fecha es requerida')
      return false
    }
    return true
  }

  const handleAdd = () => {
    if (!validateForm()) return
    setError('')
    startTransition(async () => {
      try {
        await createFeedInventoryEntry({
          concentrate_id: form.concentrate_id,
          bags_received: Number(form.bags_received),
          kg_per_bag: Number(form.kg_per_bag),
          price_per_bag: Number(form.price_per_bag),
          supplier: form.supplier.trim() || undefined,
          lot_number: form.lot_number.trim() || undefined,
          entry_date: form.entry_date,
          notes: form.notes.trim() || undefined,
        })
        setOpenAdd(false)
        setForm(emptyForm)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const handleEdit = () => {
    if (!editTarget || !validateForm()) return
    setError('')
    startTransition(async () => {
      try {
        await updateFeedInventoryEntry(editTarget.id, {
          concentrate_id: form.concentrate_id,
          bags_received: Number(form.bags_received),
          kg_per_bag: Number(form.kg_per_bag),
          price_per_bag: Number(form.price_per_bag),
          supplier: form.supplier.trim() || undefined,
          lot_number: form.lot_number.trim() || undefined,
          entry_date: form.entry_date,
          notes: form.notes.trim() || undefined,
        })
        setEditTarget(null)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteFeedInventoryEntry(id)
      } catch (e: any) {
        console.error(e.message)
      }
    })
  }

  const totalBagsInStock = stock.reduce((sum, s) => sum + s.total_bags, 0)
  const totalKgAvailable = stock.reduce((sum, s) => sum + s.available_kg, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stock.map(s => {
          const lowStock = s.available_kg < 100
          return (
            <div
              key={s.concentrate_id}
              className={`rounded-lg border bg-background p-3 flex flex-col gap-1 ${
                lowStock ? 'border-amber-400/50 bg-amber-50/30' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold truncate">{s.concentrate_name}</span>
                {lowStock && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">{s.available_kg.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">kg disp.</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{s.total_bags.toLocaleString()} bultos entrados</span>
                <span className="text-muted-foreground/40">|</span>
                <span>{s.latest_cost_per_kg ? formatCOP(s.latest_cost_per_kg) + '/kg' : 'Sin compras'}</span>
              </div>
            </div>
          )
        })}
        {stock.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No hay entradas de inventario registradas. Registra tu primera compra de concentrado.
          </div>
        )}
      </div>

      {/* Totals */}
      {stock.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{totalBagsInStock.toLocaleString()} bultos totales entrados</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ArrowUp className="h-4 w-4" />
            <span>{totalKgAvailable.toLocaleString()} kg disponibles</span>
          </div>
        </div>
      )}

      {/* Actions + History */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Historial de compras</p>
        {canEdit ? (
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleOpenAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Registrar compra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar compra de concentrado</DialogTitle>
              </DialogHeader>
              <InventoryForm
                form={form}
                setForm={setForm}
                error={error}
                concentrates={concentrates}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancelar</Button>
                <Button onClick={handleAdd} disabled={isPending}>
                  {isPending ? 'Guardando…' : 'Guardar'}
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
            <TableHead>Concentrado</TableHead>
            <TableHead>Bultos</TableHead>
            <TableHead>Kg/Bulto</TableHead>
            <TableHead>Kg total</TableHead>
            <TableHead>Precio/bulto</TableHead>
            <TableHead>Costo/kg</TableHead>
            {canEdit ? <TableHead className="text-right">Acciones</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventoryEntries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canEdit ? 8 : 7} className="h-20 text-center text-muted-foreground">
                No hay compras registradas.
              </TableCell>
            </TableRow>
          ) : (
            inventoryEntries.map(e => {
              const totalKg = e.bags_received * e.kg_per_bag
              const costPerKg = calculateCostPerKg(e.price_per_bag, e.kg_per_bag)
              return (
                <TableRow key={e.id} className="transition-colors hover:bg-muted/40">
                  <TableCell className="font-medium">{e.entry_date}</TableCell>
                  <TableCell>{e.concentrate_name}</TableCell>
                  <TableCell>{e.bags_received}</TableCell>
                  <TableCell>{e.kg_per_bag} kg</TableCell>
                  <TableCell>{totalKg.toLocaleString()} kg</TableCell>
                  <TableCell>{formatCOP(e.price_per_bag)}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {costPerKg ? formatCOP(costPerKg) : '—'}
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Dialog open={editTarget?.id === e.id} onOpenChange={open => !open && setEditTarget(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => handleOpenEdit(e)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Editar compra</DialogTitle>
                            </DialogHeader>
                            <InventoryForm
                              form={form}
                              setForm={setForm}
                              error={error}
                              concentrates={concentrates}
                            />
                            <div className="flex justify-end gap-2 pt-2">
                              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
                              <Button onClick={handleEdit} disabled={isPending}>
                                {isPending ? 'Guardando…' : 'Actualizar'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
                          onClick={() => handleDelete(e.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Sub-component: form fields ────────────────────────────────

interface InventoryFormProps {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  error: string
  concentrates: Concentrate[]
}

function InventoryForm({ form, setForm, error, concentrates }: InventoryFormProps) {
  const costPerKg = calculateCostPerKg(Number(form.price_per_bag), Number(form.kg_per_bag))
  const totalKg = (Number(form.bags_received) || 0) * (Number(form.kg_per_bag) || 0)
  const totalCost = (Number(form.bags_received) || 0) * (Number(form.price_per_bag) || 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label>Concentrado *</Label>
          <Select
            value={form.concentrate_id}
            onValueChange={v => setForm(f => ({ ...f, concentrate_id: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar concentrado…" />
            </SelectTrigger>
            <SelectContent>
              {concentrates.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.brand ? `— ${c.brand}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Bultos recibidos *</Label>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="Ej: 20"
            value={form.bags_received}
            onChange={e => setForm(f => ({ ...f, bags_received: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Kg por bulto *</Label>
          <Input
            type="number"
            min="0"
            step="0.1"
            placeholder="Ej: 40"
            value={form.kg_per_bag}
            onChange={e => setForm(f => ({ ...f, kg_per_bag: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Precio por bulto (COP) *</Label>
          <Input
            type="number"
            min="0"
            step="100"
            placeholder="Ej: 120000"
            value={form.price_per_bag}
            onChange={e => setForm(f => ({ ...f, price_per_bag: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Fecha de compra *</Label>
          <Input
            type="date"
            value={form.entry_date}
            onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Proveedor</Label>
          <Input
            placeholder="Ej: Italcol"
            value={form.supplier}
            onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>N° Lote del concentrado</Label>
          <Input
            placeholder="Ej: L-2024-001"
            value={form.lot_number}
            onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Notas</Label>
          <Input
            placeholder="Observaciones…"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </div>

      {/* Preview */}
      {totalKg > 0 && totalCost > 0 && (
        <div className="rounded-lg border bg-primary/5 p-3 text-sm flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kg totales:</span>
            <span className="font-medium">{totalKg.toLocaleString()} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Costo total:</span>
            <span className="font-medium">{formatCOP(totalCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Costo por kg:</span>
            <span className="font-bold text-primary">{costPerKg ? formatCOP(costPerKg) : '—'}</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
