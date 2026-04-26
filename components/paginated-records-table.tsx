'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function formatNumber(value: number | null, decimals = 1) {
  if (value == null) return '-'
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

interface RecordItem {
  id: string
  batch_id: string
  record_date: string
  report_type: string | null
  week_end_date: string | null
  fish_count: number | null
  avg_weight_kg: number | null
  biomass_kg: number | null
  effective_fca: number | null
}

interface PaginatedRecordsTableProps {
  records: RecordItem[]
  pageSize?: number
}

export function PaginatedRecordsTable({
  records,
  pageSize = 10,
}: PaginatedRecordsTableProps) {
  const [page, setPage] = useState(0)

  if (!records || records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay reportes productivos asociados a este estanque.
      </p>
    )
  }

  const totalPages = Math.ceil(records.length / pageSize)
  const start = page * pageSize
  const end = start + pageSize
  const pageRecords = records.slice(start, end)

  return (
    <div className="space-y-3">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 px-2 text-center text-[10px] uppercase tracking-wider" />
            <TableHead className="px-2 text-[10px] uppercase tracking-wider">Fecha</TableHead>
            <TableHead className="w-16 px-2 text-center text-[10px] uppercase tracking-wider">Tipo</TableHead>
            <TableHead className="px-2 text-right text-[10px] uppercase tracking-wider">Peces</TableHead>
            <TableHead className="px-2 text-right text-[10px] uppercase tracking-wider">Peso (g)</TableHead>
            <TableHead className="px-2 text-right text-[10px] uppercase tracking-wider">Biomasa</TableHead>
            <TableHead className="px-2 text-right text-[10px] uppercase tracking-wider">FCA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRecords.map((record) => (
            <TableRow key={record.id} className="group">
              <TableCell className="px-2 text-center">
                <Link
                  href={`/dashboard/records/${record.id}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  title="Ver detalle del reporte"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap px-2">
                {record.report_type === 'weekly' && record.week_end_date
                  ? `${format(new Date(record.record_date), 'dd/MM')} - ${format(new Date(record.week_end_date), 'dd/MM/yyyy')}`
                  : format(new Date(record.record_date), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell className="px-2 text-center">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {record.report_type === 'weekly' ? 'Sem' : 'Dia'}
                </Badge>
              </TableCell>
              <TableCell className="px-2 text-right tabular-nums">
                {record.fish_count?.toLocaleString('es-CO') ?? '-'}
              </TableCell>
              <TableCell className="px-2 text-right tabular-nums">
                {record.avg_weight_kg != null ? formatNumber(Number(record.avg_weight_kg) * 1000, 1) : '-'}
              </TableCell>
              <TableCell className="px-2 text-right tabular-nums">
                {record.biomass_kg != null ? `${formatNumber(Number(record.biomass_kg))} kg` : '-'}
              </TableCell>
              <TableCell className="px-2 text-right tabular-nums">
                {record.effective_fca != null ? formatNumber(Number(record.effective_fca), 2) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {start + 1}-{Math.min(end, records.length)} de {records.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
