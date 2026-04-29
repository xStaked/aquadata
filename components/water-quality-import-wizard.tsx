'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, WandSparkles } from 'lucide-react'
import { bulkImportOtWaterQualityReadings } from '@/app/dashboard/upload/actions'
import type { ParsedOtImportRow } from '@/lib/water-quality-import'
import { parseOtWorkbook } from '@/lib/water-quality-import'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Pond {
  id: string
  name: string
}

interface EditableParsedRow extends ParsedOtImportRow {
  manual_pond_id: string | null
}

interface ImportSummary {
  imported: number
  omitted: number
}

function hasRequiredReadingData(row: EditableParsedRow) {
  return !!row.reading_date && !!row.reading_time && row.oxygen_mg_l != null && row.temperature_c != null
}

function getResolvedPondId(row: EditableParsedRow) {
  return row.manual_pond_id ?? row.matched_pond_id
}

function getResolvedPondName(row: EditableParsedRow, pondsById: Map<string, Pond>) {
  const pondId = getResolvedPondId(row)
  return pondId ? pondsById.get(pondId)?.name ?? null : null
}

function getPreviewRowState(row: EditableParsedRow): 'ready' | 'needs_pond' | 'invalid' {
  if (!hasRequiredReadingData(row)) {
    return 'invalid'
  }

  if (!getResolvedPondId(row)) {
    return 'needs_pond'
  }

  return 'ready'
}

function getVisibleErrors(row: EditableParsedRow) {
  if (getResolvedPondId(row)) {
    return row.errors.filter((error) => !error.toLowerCase().includes('estanque'))
  }

  return row.errors
}

function formatStateLabel(state: 'ready' | 'needs_pond' | 'invalid') {
  if (state === 'ready') return 'Lista'
  if (state === 'needs_pond') return 'Requiere estanque'
  return 'Invalida'
}

function formatStateVariant(state: 'ready' | 'needs_pond' | 'invalid'): 'default' | 'secondary' | 'destructive' {
  if (state === 'ready') return 'default'
  if (state === 'needs_pond') return 'secondary'
  return 'destructive'
}

export function WaterQualityImportWizard({ ponds }: { ponds: Pond[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<EditableParsedRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [isPending, startTransition] = useTransition()

  const pondsById = useMemo(() => new Map(ponds.map((pond) => [pond.id, pond] as const)), [ponds])

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const state = getPreviewRowState(row)
        if (state === 'ready') acc.ready += 1
        if (state === 'needs_pond') acc.needsPond += 1
        if (state === 'invalid') acc.invalid += 1
        return acc
      },
      { ready: 0, needsPond: 0, invalid: 0 }
    )
  }, [rows])

  const importableRows = useMemo(
    () =>
      rows
        .filter((row) => getPreviewRowState(row) === 'ready')
        .map((row) => ({
          pond_id: getResolvedPondId(row)!,
          reading_date: row.reading_date!,
          reading_time: row.reading_time!,
          oxygen_mg_l: row.oxygen_mg_l!,
          temperature_c: row.temperature_c!,
          notes: `Importado desde Excel OT (filas ${row.source_rows.join(', ')})`,
        })),
    [rows]
  )

  const handleFileSelect = (file: File) => {
    setError(null)
    setSummary(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const parsedRows = parseOtWorkbook(workbook, ponds).map((row) => ({
          ...row,
          manual_pond_id: null,
        }))
        setRows(parsedRows)
      } catch (parseError) {
        setRows([])
        setError(parseError instanceof Error ? parseError.message : 'No se pudo procesar el archivo')
      }
    }

    reader.onerror = () => {
      setRows([])
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
              manual_pond_id: pondId,
            }
          : row
      )
    )
  }

  const handleImport = () => {
    if (importableRows.length === 0) {
      setError('No hay filas listas para importar')
      return
    }

    setError(null)
    setSummary(null)

    startTransition(async () => {
      try {
        const result = await bulkImportOtWaterQualityReadings(importableRows)
        setSummary({
          imported: result.imported,
          omitted: rows.length - importableRows.length,
        })
      } catch (importError) {
        setError(importError instanceof Error ? importError.message : 'No se pudo completar la importación')
      }
    })
  }

  const handleReset = () => {
    setFileName(null)
    setRows([])
    setError(null)
    setSummary(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="border-b border-border bg-muted/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <WandSparkles className="h-4 w-4 text-primary" />
              Importar desde Excel
            </CardTitle>
            <CardDescription className="mt-1">
              Lee la hoja <strong>OT</strong>, arma el preview y permite corregir estanques antes de importar.
            </CardDescription>
          </div>
          <Badge variant="outline">Wizard OT</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
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

        {summary ? (
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
                Se importaron {summary.imported} lecturas y se omitieron {summary.omitted}.
              </p>
            </div>

            <Button onClick={handleReset}>Importar otro archivo</Button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Archivo fuente</p>
                  <p className="text-sm text-muted-foreground">
                    Se leerá únicamente la hoja <strong>OT</strong>. Las demás hojas del workbook se ignoran en esta fase.
                  </p>
                  {fileName && (
                    <p className="flex items-center gap-2 text-sm text-foreground">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      {fileName}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset} disabled={!fileName && rows.length === 0}>
                    Reiniciar
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Seleccionar Excel
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error de importación</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {rows.length > 0 && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Listas</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{counts.ready}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Requieren estanque</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{counts.needsPond}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Inválidas</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{counts.invalid}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Preview obligatorio</p>
                      <p className="text-xs text-muted-foreground">
                        Corrige los estanques no resueltos y luego importa solo las filas listas.
                      </p>
                    </div>
                    <Badge variant="outline">{rows.length} filas</Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filas</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Estanque archivo</TableHead>
                        <TableHead>Estanque destino</TableHead>
                        <TableHead>Oxígeno</TableHead>
                        <TableHead>Temperatura</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => {
                        const state = getPreviewRowState(row)
                        const resolvedPondName = getResolvedPondName(row, pondsById)
                        const visibleErrors = getVisibleErrors(row)

                        return (
                          <TableRow key={row.client_id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {row.source_rows.join(', ')}
                            </TableCell>
                            <TableCell>{row.reading_date ?? 'Sin fecha'}</TableCell>
                            <TableCell>{row.reading_time ?? 'Sin hora'}</TableCell>
                            <TableCell>
                              {row.source_pond_name ? (
                                row.source_pond_name
                              ) : (
                                <span className="text-muted-foreground">Sin nombre</span>
                              )}
                            </TableCell>
                            <TableCell className="min-w-48">
                              {state === 'needs_pond' ? (
                                <Select
                                  value={row.manual_pond_id ?? undefined}
                                  onValueChange={(pondId) => handleManualPondSelect(row.client_id, pondId)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Selecciona un estanque" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ponds.map((pond) => (
                                      <SelectItem key={pond.id} value={pond.id}>
                                        {pond.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : resolvedPondName ? (
                                resolvedPondName
                              ) : (
                                <span className="text-muted-foreground">No resuelto</span>
                              )}
                            </TableCell>
                            <TableCell>{row.oxygen_mg_l != null ? row.oxygen_mg_l.toFixed(2) : 'N/D'}</TableCell>
                            <TableCell>{row.temperature_c != null ? row.temperature_c.toFixed(2) : 'N/D'}</TableCell>
                            <TableCell className="space-y-2">
                              <Badge variant={formatStateVariant(state)}>{formatStateLabel(state)}</Badge>
                              {visibleErrors.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {visibleErrors.join(', ')}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/10 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Import parcial</p>
                    <p className="text-sm text-muted-foreground">
                      Se importarán {importableRows.length} filas listas. Las demás se omiten.
                    </p>
                  </div>

                  <Button onClick={handleImport} disabled={isPending || importableRows.length === 0}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      `Importar ${importableRows.length} lecturas`
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
