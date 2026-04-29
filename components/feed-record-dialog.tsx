'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, PlusCircle, Wheat, X } from 'lucide-react'

import { createMonthlyFeedRecord, createConcentrate } from '@/app/dashboard/feed/actions'
import { createDailyFeedRecord } from '@/app/dashboard/feed/daily-actions'
import type { BatchForForms, Concentrate, FeedStock } from '@/app/dashboard/costs/types'
import { formatCOP } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FeedRecordType = 'daily' | 'monthly'

interface FeedRecordDialogProps {
  batches: BatchForForms[]
  concentrates: Concentrate[]
  stock: FeedStock[]
}

interface MonthlyFormState {
  batch_id: string
  concentrate_id: string
  production_stage: 'levante' | 'engorde'
  year: string
  month: string
  kg_used: string
  cost_per_kg: string
  notes: string
}

interface DailyFormState {
  batch_id: string
  record_date: string
  concentrate_id: string
  bags_am: string
  bags_pm: string
  kg_per_bag: string
  mortality_count: string
  notes: string
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const now = new Date()

const emptyMonthlyForm: MonthlyFormState = {
  batch_id: '',
  concentrate_id: '',
  production_stage: 'engorde',
  year: String(now.getFullYear()),
  month: String(now.getMonth() + 1),
  kg_used: '',
  cost_per_kg: '',
  notes: '',
}

const emptyDailyForm: DailyFormState = {
  batch_id: '',
  record_date: new Date().toISOString().split('T')[0],
  concentrate_id: '',
  bags_am: '',
  bags_pm: '',
  kg_per_bag: '40',
  mortality_count: '',
  notes: '',
}

const emptyQuick = { name: '', brand: '', price_per_kg: '' }

export function FeedRecordDialog({ batches, concentrates, stock }: FeedRecordDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [recordType, setRecordType] = useState<FeedRecordType>('daily')
  const [monthlyForm, setMonthlyForm] = useState<MonthlyFormState>(emptyMonthlyForm)
  const [dailyForm, setDailyForm] = useState<DailyFormState>(emptyDailyForm)
  const [error, setError] = useState('')
  const [showQuick, setShowQuick] = useState(false)
  const [quickForm, setQuickForm] = useState(emptyQuick)
  const [quickError, setQuickError] = useState('')
  const [pendingSelect, setPendingSelect] = useState('')

  const activeConcentrates = concentrates.filter((c) => c.is_active)
  const totalMonthlyCost = (Number(monthlyForm.kg_used) || 0) * (Number(monthlyForm.cost_per_kg) || 0)
  const totalDailyKg = ((Number(dailyForm.bags_am) || 0) + (Number(dailyForm.bags_pm) || 0)) * (Number(dailyForm.kg_per_bag) || 40)

  useEffect(() => {
    if (!pendingSelect || concentrates.length === 0) return

    const found = concentrates.find((c) => c.name === pendingSelect)
    if (!found) return

    const stockItem = stock.find((item) => item.concentrate_id === found.id)
    const autoPrice = stockItem?.latest_cost_per_kg ?? found.price_per_kg

    setMonthlyForm((current) => ({
      ...current,
      concentrate_id: found.id,
      cost_per_kg: autoPrice != null ? String(autoPrice) : current.cost_per_kg,
    }))
    setDailyForm((current) => ({
      ...current,
      concentrate_id: found.id,
    }))
    setPendingSelect('')
  }, [concentrates, pendingSelect, stock])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) return

    setRecordType(activeConcentrates.length === 0 ? 'monthly' : 'daily')
    setMonthlyForm(emptyMonthlyForm)
    setDailyForm(emptyDailyForm)
    setError('')
    setShowQuick(concentrates.length === 0)
    setQuickForm(emptyQuick)
    setQuickError('')
  }

  const handleConcentrateChange = (id: string) => {
    const concentrate = concentrates.find((item) => item.id === id)
    const stockItem = stock.find((item) => item.concentrate_id === id)
    const autoPrice = stockItem?.latest_cost_per_kg ?? concentrate?.price_per_kg

    setMonthlyForm((current) => ({
      ...current,
      concentrate_id: id,
      cost_per_kg: autoPrice != null ? String(autoPrice) : current.cost_per_kg,
    }))
    setDailyForm((current) => ({
      ...current,
      concentrate_id: id,
    }))
  }

  const handleQuickCreate = () => {
    if (!quickForm.name.trim() || !quickForm.price_per_kg) {
      setQuickError('Nombre y precio son requeridos')
      return
    }

    setQuickError('')
    startTransition(async () => {
      try {
        await createConcentrate({
          name: quickForm.name.trim(),
          brand: quickForm.brand.trim() || undefined,
          price_per_kg: Number(quickForm.price_per_kg),
        })
        setPendingSelect(quickForm.name.trim())
        setQuickForm(emptyQuick)
        setShowQuick(false)
        router.refresh()
      } catch (err) {
        setQuickError(err instanceof Error ? err.message : 'No se pudo crear el concentrado')
      }
    })
  }

  const handleMonthlySubmit = () => {
    if (!monthlyForm.batch_id || !monthlyForm.concentrate_id || !monthlyForm.kg_used || !monthlyForm.year || !monthlyForm.month) {
      setError('Lote, concentrado, kg y período son requeridos')
      return
    }

    if (!monthlyForm.cost_per_kg || Number(monthlyForm.cost_per_kg) <= 0) {
      setError('El precio por kg debe ser mayor a 0')
      return
    }

    const kgUsed = Number(monthlyForm.kg_used)
    const stockItem = stock.find((item) => item.concentrate_id === monthlyForm.concentrate_id)
    if (stockItem && kgUsed > stockItem.available_kg) {
      setError(`Stock insuficiente. Disponible: ${stockItem.available_kg.toLocaleString()} kg`)
      return
    }

    setError('')
    const concentrate = concentrates.find((item) => item.id === monthlyForm.concentrate_id)

    startTransition(async () => {
      try {
        await createMonthlyFeedRecord({
          batch_id: monthlyForm.batch_id,
          concentrate_id: monthlyForm.concentrate_id,
          concentrate_name: concentrate?.name ?? monthlyForm.concentrate_id,
          production_stage: monthlyForm.production_stage,
          year: Number(monthlyForm.year),
          month: Number(monthlyForm.month),
          kg_used: Number(monthlyForm.kg_used),
          cost_per_kg: Number(monthlyForm.cost_per_kg),
          notes: monthlyForm.notes || undefined,
        })
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el registro mensual')
      }
    })
  }

  const handleDailySubmit = () => {
    if (!dailyForm.batch_id) {
      setError('Selecciona un lote')
      return
    }
    if (!dailyForm.record_date) {
      setError('Selecciona una fecha')
      return
    }
    if (!dailyForm.concentrate_id) {
      setError('Selecciona un concentrado')
      return
    }

    const bagsAm = Number(dailyForm.bags_am) || 0
    const bagsPm = Number(dailyForm.bags_pm) || 0
    if (bagsAm === 0 && bagsPm === 0) {
      setError('Ingresa al menos bultos AM o PM')
      return
    }

    setError('')
    const selectedConcentrate = concentrates.find((item) => item.id === dailyForm.concentrate_id)

    startTransition(async () => {
      try {
        await createDailyFeedRecord({
          batch_id: dailyForm.batch_id,
          record_date: dailyForm.record_date,
          concentrate_id: dailyForm.concentrate_id,
          concentrate_name: selectedConcentrate?.name ?? 'Desconocido',
          bags_am: bagsAm,
          bags_pm: bagsPm,
          kg_per_bag: Number(dailyForm.kg_per_bag) || 40,
          mortality_count: Number(dailyForm.mortality_count) || 0,
          notes: dailyForm.notes || undefined,
        })
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el registro diario')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar alimento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar alimento</DialogTitle>
          <DialogDescription>
            Usa el mismo módulo para registrar consumo diario o mensual por lote.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="feed-record-type">Tipo de registro</Label>
            <Select
              value={recordType}
              onValueChange={(value) => {
                setRecordType(value as FeedRecordType)
                setError('')
              }}
            >
              <SelectTrigger id="feed-record-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diario</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Concentrado / Alimento</Label>
              {concentrates.length > 0 && !showQuick ? (
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={() => {
                    setShowQuick(true)
                    setQuickError('')
                  }}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Agregar nuevo
                </button>
              ) : null}
            </div>

            {showQuick ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">
                    {concentrates.length === 0 ? 'Primero registra el alimento que usas' : 'Nuevo concentrado'}
                  </span>
                  {concentrates.length > 0 ? (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setShowQuick(false)
                        setQuickError('')
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 grid gap-1">
                    <Label className="text-xs">Nombre del alimento *</Label>
                    <Input
                      value={quickForm.name}
                      onChange={(event) => setQuickForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Ej: Purina 32%, Mojarra Inicio..."
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Marca / Proveedor</Label>
                    <Input
                      value={quickForm.brand}
                      onChange={(event) => setQuickForm((current) => ({ ...current, brand: event.target.value }))}
                      placeholder="Ej: Italcol"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Precio/kg (COP) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={quickForm.price_per_kg}
                      onChange={(event) => setQuickForm((current) => ({ ...current, price_per_kg: event.target.value }))}
                      placeholder="Ej: 2800"
                    />
                  </div>
                </div>

                {quickError ? <p className="mt-3 text-xs text-destructive">{quickError}</p> : null}

                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={handleQuickCreate}
                  disabled={isPending}
                >
                  {isPending ? 'Creando...' : 'Crear y seleccionar'}
                </Button>
              </div>
            ) : (
              <>
                <Select
                  value={recordType === 'daily' ? dailyForm.concentrate_id : monthlyForm.concentrate_id}
                  onValueChange={handleConcentrateChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un concentrado" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeConcentrates.map((concentrate) => {
                      const stockItem = stock.find((item) => item.concentrate_id === concentrate.id)
                      return (
                        <SelectItem key={concentrate.id} value={concentrate.id}>
                          {concentrate.name}
                          {concentrate.brand ? ` (${concentrate.brand})` : ''}
                          {recordType === 'monthly' && stockItem ? ` · ${stockItem.available_kg.toLocaleString()} kg disp.` : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                {recordType === 'monthly' && monthlyForm.concentrate_id ? (
                  (() => {
                    const stockItem = stock.find((item) => item.concentrate_id === monthlyForm.concentrate_id)
                    if (!stockItem) return null

                    const lowStock = stockItem.available_kg < 100
                    return (
                      <p className={`text-xs ${lowStock ? 'font-medium text-amber-600' : 'text-muted-foreground'}`}>
                        Stock disponible: {stockItem.available_kg.toLocaleString()} kg
                        {stockItem.latest_cost_per_kg ? ` · Costo/kg: ${formatCOP(stockItem.latest_cost_per_kg)}` : ''}
                        {lowStock ? ' · Stock bajo' : ''}
                      </p>
                    )
                  })()
                ) : null}
              </>
            )}
          </div>

          {recordType === 'daily' ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="daily-batch">Lote / Estanque</Label>
                  <Select
                    value={dailyForm.batch_id}
                    onValueChange={(value) => setDailyForm((current) => ({ ...current, batch_id: value }))}
                  >
                    <SelectTrigger id="daily-batch">
                      <SelectValue placeholder="Selecciona un lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.pond_name} — {batch.species}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="daily-date">Fecha</Label>
                  <DatePicker
                    id="daily-date"
                    value={dailyForm.record_date}
                    onChange={(value) => setDailyForm((current) => ({ ...current, record_date: value }))}
                    placeholder="Selecciona la fecha"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="bags_am">Bultos AM</Label>
                  <Input
                    id="bags_am"
                    type="number"
                    min={0}
                    step="0.1"
                    value={dailyForm.bags_am}
                    onChange={(event) => setDailyForm((current) => ({ ...current, bags_am: event.target.value }))}
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
                    value={dailyForm.bags_pm}
                    onChange={(event) => setDailyForm((current) => ({ ...current, bags_pm: event.target.value }))}
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
                    value={dailyForm.kg_per_bag}
                    onChange={(event) => setDailyForm((current) => ({ ...current, kg_per_bag: event.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-md border border-primary/10 bg-primary/5 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Total estimado:{' '}
                  <span className="font-semibold text-foreground">{totalDailyKg} kg</span>
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mortality_count">Mortalidad</Label>
                <Input
                  id="mortality_count"
                  type="number"
                  min={0}
                  value={dailyForm.mortality_count}
                  onChange={(event) => setDailyForm((current) => ({ ...current, mortality_count: event.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="daily-notes">Observaciones</Label>
                <Input
                  id="daily-notes"
                  value={dailyForm.notes}
                  onChange={(event) => setDailyForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 grid gap-2">
                  <Label htmlFor="monthly-batch">Lote / Estanque</Label>
                  <Select
                    value={monthlyForm.batch_id}
                    onValueChange={(value) => setMonthlyForm((current) => ({ ...current, batch_id: value }))}
                  >
                    <SelectTrigger id="monthly-batch">
                      <SelectValue placeholder="Seleccionar lote..." />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.pond_name} — {batch.species}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Año</Label>
                  <Input
                    type="number"
                    min="2020"
                    max="2030"
                    value={monthlyForm.year}
                    onChange={(event) => setMonthlyForm((current) => ({ ...current, year: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Mes</Label>
                  <Select
                    value={monthlyForm.month}
                    onValueChange={(value) => setMonthlyForm((current) => ({ ...current, month: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, index) => (
                        <SelectItem key={month} value={String(index + 1)}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Etapa del costo</Label>
                  <Select
                    value={monthlyForm.production_stage}
                    onValueChange={(value) => setMonthlyForm((current) => ({
                      ...current,
                      production_stage: value as MonthlyFormState['production_stage'],
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="levante">Levante</SelectItem>
                      <SelectItem value="engorde">Engorde</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Usa levante si ese consumo debe sumarse al costo histórico del lote antes del engorde.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="kg_used">Kg usados</Label>
                  <Input
                    id="kg_used"
                    type="number"
                    min="0"
                    step="0.1"
                    value={monthlyForm.kg_used}
                    onChange={(event) => setMonthlyForm((current) => ({ ...current, kg_used: event.target.value }))}
                    placeholder="Ej: 120"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cost_per_kg">Precio/kg (COP)</Label>
                  <Input
                    id="cost_per_kg"
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyForm.cost_per_kg}
                    onChange={(event) => setMonthlyForm((current) => ({ ...current, cost_per_kg: event.target.value }))}
                    placeholder="Ej: 2800"
                  />
                </div>
              </div>

              {totalMonthlyCost > 0 ? (
                <div className="rounded-lg border bg-primary/5 p-3 text-sm">
                  <span className="text-muted-foreground">Costo total del mes: </span>
                  <span className="font-bold text-primary">{formatCOP(totalMonthlyCost)}</span>
                </div>
              ) : null}
            </div>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={recordType === 'daily' ? handleDailySubmit : handleMonthlySubmit}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Wheat className="mr-2 h-4 w-4" />
                  Guardar registro
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
