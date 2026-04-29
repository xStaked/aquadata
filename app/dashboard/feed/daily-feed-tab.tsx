'use client'

import { useEffect, useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DailyFeedImportDialog } from '@/components/daily-feed-import-dialog'
import { DailyFeedFormDialog } from '@/components/daily-feed-form-dialog'
import { deleteDailyFeedRecord } from './daily-actions'
import type { Concentrate, BatchForForms } from '../costs/types'

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
  pond_name: string
  created_at: string
}

interface DailyFeedTabProps {
  concentrates: Concentrate[]
  batches: BatchForForms[]
  records: DailyFeedRecord[]
  canEdit: boolean
  showRegisterButton?: boolean
}

interface PondInfo {
  id: string
  name: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function DailyFeedTab({
  concentrates,
  batches,
  records,
  canEdit,
  showRegisterButton = true,
}: DailyFeedTabProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const paginatedRecords = records.slice(startIndex, startIndex + pageSize)

  const totalKg = records.reduce((sum, record) => sum + record.kg_total, 0)
  const totalMortality = records.reduce((sum, record) => sum + record.mortality_count, 0)
  const uniquePonds = new Set(records.map((record) => record.pond_name)).size
  const uniqueDates = new Set(records.map((record) => record.record_date)).size

  const byDate = Object.entries(
    records.reduce<Record<string, { kg: number; mortality: number; records: number }>>((acc, record) => {
      if (!acc[record.record_date]) {
        acc[record.record_date] = { kg: 0, mortality: 0, records: 0 }
      }
      acc[record.record_date].kg += record.kg_total
      acc[record.record_date].mortality += record.mortality_count
      acc[record.record_date].records += 1
      return acc
    }, {})
  )
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 10)

  const byPond = Object.entries(
    records.reduce<Record<string, { kg: number; mortality: number; records: number }>>((acc, record) => {
      if (!acc[record.pond_name]) {
        acc[record.pond_name] = { kg: 0, mortality: 0, records: 0 }
      }
      acc[record.pond_name].kg += record.kg_total
      acc[record.pond_name].mortality += record.mortality_count
      acc[record.pond_name].records += 1
      return acc
    }, {})
  ).sort(([, a], [, b]) => b.kg - a.kg)

  const ponds: PondInfo[] = batches.map((b) => ({
    id: b.id,
    name: b.pond_name,
  }))

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil(records.length / pageSize))))
  }, [records.length])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteDailyFeedRecord(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Registro diario de alimentación</CardTitle>
            <CardDescription>
              Importa desde Excel o consulta los registros diarios por lote, concentrado y turno. La columna
              ` REFERENCIA / MM Y MARCA ` se usa para relacionar el archivo con tus concentrados registrados.
            </CardDescription>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              {showRegisterButton ? <DailyFeedFormDialog concentrates={concentrates} batches={batches} /> : null}
              <DailyFeedImportDialog concentrates={concentrates} batches={batches} ponds={ponds} />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No hay registros diarios de alimentación.</p>
              <p className="text-xs mt-1">Usa el botón &quot;Importar Excel&quot; para cargar datos.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Registros</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{records.length}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Consumo total</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {totalKg.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Mortalidad total</p>
                  <p className="mt-1 text-2xl font-semibold text-destructive">
                    {totalMortality.toLocaleString('es-CO')}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cobertura</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {uniquePonds} estanques / {uniqueDates} fechas
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Estanque</TableHead>
                      <TableHead className="text-xs">Concentrado</TableHead>
                      <TableHead className="text-xs text-right">Bultos AM</TableHead>
                      <TableHead className="text-xs text-right">Bultos PM</TableHead>
                      <TableHead className="text-xs text-right">Total (kg)</TableHead>
                      <TableHead className="text-xs text-right">Mortalidad</TableHead>
                      <TableHead className="text-xs">Notas</TableHead>
                      {canEdit && <TableHead className="text-xs w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(r.record_date)}</TableCell>
                        <TableCell className="text-xs">{r.pond_name}</TableCell>
                        <TableCell className="text-xs max-w-[140px] truncate" title={r.concentrate_name}>
                          {r.concentrate_name}
                        </TableCell>
                        <TableCell className="text-xs text-right">{r.bags_am}</TableCell>
                        <TableCell className="text-xs text-right">{r.bags_pm}</TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {r.kg_total.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {r.mortality_count > 0 ? (
                            <span className="text-destructive">{r.mortality_count}</span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate" title={r.notes ?? ''}>
                          {r.notes || '-'}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="w-20">
                            <div className="flex items-center gap-1">
                              <DailyFeedFormDialog
                                concentrates={concentrates}
                                batches={batches}
                                record={r}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDelete(r.id)}
                                disabled={deletingId === r.id}
                              >
                                {deletingId === r.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Mostrando {records.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, records.length)} de {records.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safeCurrentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Página {safeCurrentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safeCurrentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="mb-3 text-sm font-semibold">Resumen por fecha</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Fecha</TableHead>
                        <TableHead className="text-xs text-right">Registros</TableHead>
                        <TableHead className="text-xs text-right">Kg</TableHead>
                        <TableHead className="text-xs text-right">Mortalidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byDate.map(([date, summary]) => (
                        <TableRow key={date}>
                          <TableCell className="text-xs">{formatDate(date)}</TableCell>
                          <TableCell className="text-xs text-right">{summary.records}</TableCell>
                          <TableCell className="text-xs text-right">
                            {summary.kg.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {summary.mortality > 0 ? summary.mortality.toLocaleString('es-CO') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="mb-3 text-sm font-semibold">Resumen por estanque</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Estanque</TableHead>
                        <TableHead className="text-xs text-right">Registros</TableHead>
                        <TableHead className="text-xs text-right">Kg</TableHead>
                        <TableHead className="text-xs text-right">Mortalidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byPond.map(([pondName, summary]) => (
                        <TableRow key={pondName}>
                          <TableCell className="text-xs">{pondName}</TableCell>
                          <TableCell className="text-xs text-right">{summary.records}</TableCell>
                          <TableCell className="text-xs text-right">
                            {summary.kg.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {summary.mortality > 0 ? summary.mortality.toLocaleString('es-CO') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
