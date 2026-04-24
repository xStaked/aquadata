'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCOP } from '@/lib/format'

interface ConsumptionRecord {
  id: string
  pond_name: string
  species: string
  production_stage: 'levante' | 'engorde'
  year: number
  month: number
  kg_used: number
  cost_per_kg: number
  total_cost: number
}

interface ConcentrateConsumptionFilterProps {
  consumption: ConsumptionRecord[]
}

const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

function parseDateInput(value: string): Date | null {
  if (!value) return null
  const d = new Date(value + '-01')
  if (isNaN(d.getTime())) return null
  return d
}

function getRecordDate(c: ConsumptionRecord): Date {
  return new Date(c.year, c.month - 1, 1)
}

export function ConcentrateConsumptionFilter({ consumption }: ConcentrateConsumptionFilterProps) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filtered = useMemo(() => {
    const fromDate = parseDateInput(from)
    const toDate = parseDateInput(to)
    return consumption.filter(c => {
      const d = getRecordDate(c)
      if (fromDate && d < fromDate) return false
      if (toDate && d > toDate) return false
      return true
    })
  }, [consumption, from, to])

  const totalKg = filtered.reduce((s, c) => s + c.kg_used, 0)
  const totalCost = filtered.reduce((s, c) => s + c.total_cost, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Desde</Label>
          <Input
            type="month"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="month"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground pb-1">
          <span>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
          <span className="text-primary font-semibold">{totalKg.toLocaleString()} kg · {formatCOP(totalCost)}</span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Período</TableHead>
            <TableHead>Estanque</TableHead>
            <TableHead>Especie</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead>Kg usados</TableHead>
            <TableHead>Precio/kg</TableHead>
            <TableHead>Costo total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                No hay registros en el rango seleccionado.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map(c => (
              <TableRow key={c.id} className="transition-colors hover:bg-muted/40">
                <TableCell className="font-medium">{MONTHS[c.month - 1]} {c.year}</TableCell>
                <TableCell>{c.pond_name}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{c.species}</TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.production_stage === 'levante'
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {c.production_stage === 'levante' ? 'Levante' : 'Engorde'}
                  </span>
                </TableCell>
                <TableCell>{c.kg_used.toLocaleString()} kg</TableCell>
                <TableCell>{formatCOP(c.cost_per_kg)}</TableCell>
                <TableCell className="font-semibold text-primary">{formatCOP(c.total_cost)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
