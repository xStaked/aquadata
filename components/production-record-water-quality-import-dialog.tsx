'use client'

import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { bulkImportWaterQualityProductionRecords } from '@/app/dashboard/records/actions'
import type { ParsedWaterQualityProductionImportRow } from '@/lib/production-record-water-quality-import'
import { parseWaterQualityProductionWorkbook } from '@/lib/production-record-water-quality-import'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Pond {
  id: string
  name: string
}

interface EditableParsedRow extends ParsedWaterQualityProductionImportRow {
  manual_pond_id: string | null
}

interface ImportResult {
  imported: number
}

function normalizeError(error: string) {
  return error.toLowerCase()
}

function hasAnyMetric(row: EditableParsedRow) {
  return [
    row.ph,
    row.ammonia_mg_l,
    row.nitrite_mg_l,
    row.nitrate_mg_l,
    row.phosphate_mg_l,
    row.turbidity_ntu,
    row.alkalinity_mg_l,
    row.hardness_mg_l,
  ].some((value) => value != null)
}

function getResolvedPondId(row: EditableParsedRow) {
  return row.manual_pond_id ?? row.matched_pond_id
}

function getPreviewRowState(
  row: EditableParsedRow,
  activeBatchPondIds: Set<string>
): 'ready' | 'needs_pond' | 'invalid' {
  if (!hasAnyMetric(row)) {
    return 'invalid'
  }

  const pondId = getResolvedPondId(row)
  if (!pondId) {
    return 'needs_pond'
  }

  if (!activeBatchPondIds.has(pondId)) {
    return 'invalid'
  }

  return 'ready'
}

function getVisibleErrors(row: EditableParsedRow, activeBatchPondIds: Set<string>) {
  const resolvedPondId = getResolvedPondId(row)
  const errors = row.errors.filter((error) => {
    if (normalizeError(error).includes('estanque') && resolvedPondId) {
      return false
    }

    return true
  })

  if (resolvedPondId && !activeBatchPondIds.has(resolvedPondId)) {
    errors.push('El estanque seleccionado no tiene lote activo')
  }

  return errors
}

function formatMetric(value: number | null, digits = 2) {
  if (value == null) return '-'
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function ProductionRecordWaterQualityImportDialog({
  ponds,
  activeBatchPondIds,
}: {
  ponds: Pond[]
  activeBatchPondIds: string[]
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'select-file' | 'preview'>('select-file')
  const [fileName, setFileName] = useState<string | null>(null)
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<EditableParsedRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeBatchPondIdSet = useMemo(() => new Set(activeBatchPondIds), [activeBatchPondIds])

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const state = getPreviewRowState(row, activeBatchPondIdSet)
        if (state === 'ready') acc.ready += 1
        if (state === 'needs_pond') acc.needsPond += 1
        if (state === 'invalid') acc.invalid += 1
        return acc
      },
      { ready: 0, needsPond: 0, invalid: 0 }
    )
  }, [rows, activeBatchPondIdSet])

  const importableRows = useMemo(
    () =>
      rows
        .filter((row) => getPreviewRowState(row, activeBatchPondIdSet) === 'ready')
        .map((row) => ({
          pond_id: getResolvedPondId(row)!,
          record_date: recordDate,
          ph: row.ph,
          ammonia_mg_l: row.ammonia_mg_l,
          nitrite_mg_l: row.nitrite_mg_l,
          nitrate_mg_l: row.nitrate_mg_l,
          phosphate_mg_l: row.phosphate_mg_l,
          turbidity_ntu: row.turbidity_ntu,
          alkalinity_mg_l: row.alkalinity_mg_l,
          hardness_mg_l: row.hardness_mg_l,
          notes: `Importado desde Excel CALIDAD DE AGUA (fila ${row.source_row})`,
        })),
    [rows, activeBatchPondIdSet, recordDate]
  )

  const resetState = () => {
    setStep('select-file')
    setFileName(null)
    setRows([])
    setError(null)
    setIsImporting(false)
    setResult(null)
    setRecordDate(new Date().toISOString().slice(0, 10))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetState()
    }
  }

  const handleFileSelect = (file: File) => {
    setError(null)
    setResult(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const parsedRows = parseWaterQualityProductionWorkbook(workbook, ponds).map((row) => ({
          ...row,
          manual_pond_id: null,
        }))

        setRows(parsedRows)
        setStep('preview')
      } catch (parseError) {
        setRows([])
        setStep('select-file')
        setError(parseError instanceof Error ? parseError.message : 'No se pudo procesar el archivo')
      }
    }

    reader.onerror = () => {
      setRows([])
      setStep('select-file')
      setError('No se pudo leer el archivo seleccionado')
    }

    reader.readAsArrayBuffer(file)
  }

  const handleManualPondSelect = (clientId: string, pondId: string) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.client_id === clientId
          ? {
              ...row,
              manual_pond_id: pondId === '__unmatched__' ? null : pondId,
            }
          : row
      )
    )
  }

  const handleImport = async () => {
    if (!recordDate) {
      setError('Selecciona la fecha del reporte')
      return
    }

    if (importableRows.length === 0) {
      setError('No hay filas listas para importar')
      return
    }

    setIsImporting(true)
    setError(null)
    setResult(null)

    try {
      const importResult = await bulkImportWaterQualityProductionRecords(importableRows)
      setResult(importResult)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'No se pudo completar la importación')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>

      <DialogContent className="flex h-[94vh] w-[98vw] max-w-[1400px] flex-col overflow-hidden p-0 sm:h-[92vh]">
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle>Importar calidad de agua a registros productivos</DialogTitle>
          <DialogDescription>
            Wizard de 2 pasos para la hoja <strong>CALIDAD DE AGUA</strong>. El parser busca la columna
            <strong> NUMEOR</strong> o <strong>NUMERO</strong> de lagos y permite corregir el estanque en el preview.
          </DialogDescription>
          <div className="flex gap-2 pt-2">
            <Badge variant={step === 'select-file' ? 'default' : 'outline'}>Paso 1: Archivo</Badge>
            <Badge variant={step === 'preview' ? 'default' : 'outline'}>Paso 2: Preview</Badge>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />

          {result ? (
            <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card py-16 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">Importación completada</h3>
                <p className="text-sm text-muted-foreground">
                  Se importaron {result.imported} registros de calidad de agua.
                </p>
              </div>
              <Button onClick={resetState}>Importar otro archivo</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {step === 'select-file' ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Archivo fuente</p>
                      <p className="text-sm text-muted-foreground">
                        Se leerá únicamente la hoja <strong>CALIDAD DE AGUA</strong>.
                      </p>
                      {fileName ? (
                        <p className="flex items-center gap-2 text-sm text-foreground">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                          {fileName}
                        </p>
                      ) : null}
                    </div>

                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Seleccionar archivo
                    </Button>
                  </div>
                </div>
              ) : null}

              {step === 'preview' ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Filas detectadas</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">{rows.length}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Listas</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">{counts.ready}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Requieren estanque</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">{counts.needsPond}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Invalidas</p>
                      <p className="mt-1 text-2xl font-semibold text-destructive">{counts.invalid}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="rounded-xl border bg-card p-4">
                      <p className="text-sm font-semibold text-foreground">Fecha del reporte</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Esta hoja no trae fecha confiable; la importación usará la fecha que selecciones aquí.
                      </p>
                      <DatePicker
                        value={recordDate}
                        onChange={setRecordDate}
                        className="mt-4"
                        buttonClassName="w-full"
                      />
                    </div>

                    <div className="rounded-xl border bg-card p-4">
                      <p className="text-sm font-semibold text-foreground">Reglas de importación</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <li>Se importan solo filas con al menos un parámetro de calidad de agua.</li>
                        <li>El estanque puede corregirse manualmente si el match automático falla.</li>
                        <li>El estanque debe tener un lote activo para generar el registro productivo.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card">
                    <div className="border-b px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">Preview de filas detectadas</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Desplázate horizontal y verticalmente dentro de la tabla sin perder el header del modal.
                      </p>
                    </div>
                    <div className="max-h-[52vh] overflow-auto">
                      <Table className="min-w-[1280px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fila</TableHead>
                          <TableHead>Lago archivo</TableHead>
                          <TableHead>Estanque</TableHead>
                          <TableHead className="text-right">pH</TableHead>
                          <TableHead className="text-right">Amonio</TableHead>
                          <TableHead className="text-right">Nitrito</TableHead>
                          <TableHead className="text-right">Nitrato</TableHead>
                          <TableHead className="text-right">Fosfatos</TableHead>
                          <TableHead className="text-right">Turbidez</TableHead>
                          <TableHead className="text-right">Alcalinidad</TableHead>
                          <TableHead className="text-right">Dureza</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const state = getPreviewRowState(row, activeBatchPondIdSet)
                          const visibleErrors = getVisibleErrors(row, activeBatchPondIdSet)

                          return (
                            <TableRow key={row.client_id}>
                              <TableCell className="text-xs">{row.source_row}</TableCell>
                              <TableCell className="text-xs font-medium">{row.source_pond_name}</TableCell>
                              <TableCell className="min-w-[220px]">
                                <Select
                                  value={getResolvedPondId(row) ?? '__unmatched__'}
                                  onValueChange={(value) => handleManualPondSelect(row.client_id, value)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Selecciona un estanque" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__unmatched__">Sin asignar</SelectItem>
                                    {ponds.map((pond) => (
                                      <SelectItem key={pond.id} value={pond.id}>
                                        {pond.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right text-xs">{formatMetric(row.ph, 2)}</TableCell>
                              <TableCell className="text-right text-xs">{formatMetric(row.ammonia_mg_l, 2)}</TableCell>
                              <TableCell className="text-right text-xs">{formatMetric(row.nitrite_mg_l, 2)}</TableCell>
                              <TableCell className="text-right text-xs">{formatMetric(row.nitrate_mg_l, 2)}</TableCell>
                              <TableCell className="text-right text-xs">{formatMetric(row.phosphate_mg_l, 2)}</TableCell>
                              <TableCell className="text-right text-xs">{formatMetric(row.turbidity_ntu, 1)}</TableCell>
                              <TableCell className="text-right text-xs">{formatMetric(row.alkalinity_mg_l, 1)}</TableCell>
                              <TableCell className="text-right text-xs">{formatMetric(row.hardness_mg_l, 1)}</TableCell>
                              <TableCell className="min-w-[220px]">
                                <div className="space-y-2">
                                  <Badge
                                    variant={
                                      state === 'ready'
                                        ? 'default'
                                        : state === 'needs_pond'
                                          ? 'secondary'
                                          : 'destructive'
                                    }
                                  >
                                    {state === 'ready'
                                      ? 'Lista'
                                      : state === 'needs_pond'
                                        ? 'Requiere estanque'
                                        : 'Inválida'}
                                  </Badge>
                                  {visibleErrors.length > 0 ? (
                                    <div className="space-y-1">
                                      {visibleErrors.map((visibleError) => (
                                        <p key={`${row.client_id}-${visibleError}`} className="text-xs text-muted-foreground">
                                          {visibleError}
                                        </p>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : null}

              {error ? (
                <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-4 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>
            Cerrar
          </Button>
          {step === 'preview' ? (
            <Button type="button" variant="outline" onClick={() => setStep('select-file')} disabled={isImporting}>
              Volver
            </Button>
          ) : null}
          {step === 'select-file' ? (
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              Seleccionar archivo
            </Button>
          ) : (
            <Button type="button" onClick={handleImport} disabled={isImporting || importableRows.length === 0}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${importableRows.length > 0 ? importableRows.length : ''} filas listas`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
