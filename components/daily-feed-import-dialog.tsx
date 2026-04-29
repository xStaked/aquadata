'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { bulkImportDailyFeedRecords, type DailyFeedRecordInput } from '@/app/dashboard/feed/daily-actions'
import type { Concentrate, BatchForForms } from '@/app/dashboard/costs/types'

interface PondInfo {
  id: string
  name: string
}

interface DailyFeedImportDialogProps {
  concentrates: Concentrate[]
  batches: BatchForForms[]
  ponds: PondInfo[]
}

interface ParsedRow {
  rowIndex: number
  raw: Record<string, string | number | null>
  parsed: DailyFeedRecordInput | null
  errors: string[]
}

interface ParsedSheetData {
  headers: string[]
  dataRows: Array<{ rowIndex: number; values: Array<string | number | null> }>
}

function normalizeText(str: string): string {
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function findConcentrate(name: string, concentrates: Concentrate[]): Concentrate | null {
  if (!name) return null
  const normalized = normalizeText(name)
  if (!normalized) return null

  // Exact match first
  let match = concentrates.find((c) => normalizeText(c.name) === normalized)
  if (match) return match

  // Contains match
  match = concentrates.find((c) => normalizeText(c.name).includes(normalized) || normalized.includes(normalizeText(c.name)))
  if (match) return match

  // Word-by-word match (best score)
  const inputWords = normalized.split(/\d+/).filter(Boolean)
  let bestScore = 0
  let bestMatch: Concentrate | null = null

  for (const c of concentrates) {
    const cWords = normalizeText(c.name).split(/\d+/).filter(Boolean)
    let score = 0
    for (const w1 of inputWords) {
      for (const w2 of cWords) {
        if (w1 === w2) score += 3
        else if (w1.includes(w2) || w2.includes(w1)) score += 1
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = c
    }
  }

  return bestScore >= 2 ? bestMatch : null
}

function findBatch(
  lagoValue: string | number | null,
  loteValue: string | number | null,
  batches: BatchForForms[],
  ponds: PondInfo[]
): BatchForForms | null {
  if (!lagoValue && !loteValue) return null

  const lagoNorm = normalizeText(lagoValue?.toString() ?? '')
  const loteNorm = normalizeText(loteValue?.toString() ?? '')

  // Try match by pond name first
  if (lagoNorm) {
    const pond = ponds.find((p) => normalizeText(p.name) === lagoNorm)
    if (pond) {
      const batch = batches.find((b) => normalizeText(b.pond_name) === normalizeText(pond.name))
      if (batch) return batch
    }

    // Fuzzy pond match
    const fuzzyPond = ponds.find((p) =>
      normalizeText(p.name).includes(lagoNorm) || lagoNorm.includes(normalizeText(p.name))
    )
    if (fuzzyPond) {
      const batch = batches.find((b) => normalizeText(b.pond_name) === normalizeText(fuzzyPond.name))
      if (batch) return batch
    }
  }

  // Try match by batch pond name directly
  if (lagoNorm) {
    const batch = batches.find((b) => normalizeText(b.pond_name) === lagoNorm)
    if (batch) return batch

    const fuzzyBatch = batches.find((b) =>
      normalizeText(b.pond_name).includes(lagoNorm) || lagoNorm.includes(normalizeText(b.pond_name))
    )
    if (fuzzyBatch) return fuzzyBatch
  }

  // Try match by lote name
  if (loteNorm) {
    const batch = batches.find((b) => normalizeText(b.id) === loteNorm)
    if (batch) return batch
  }

  return null
}

function parseNumber(value: string | number | null): number | null {
  if (value == null || value === '') return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function detectColumns(headers: string[]): Record<string, string | null> {
  const normalizedHeaders = headers.map((h) => normalizeText(h))

  const find = (patterns: string[]): string | null => {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const h = normalizedHeaders[i]
      for (const p of patterns) {
        if (h.includes(p) || p.includes(h)) {
          return headers[i]
        }
      }
    }
    return null
  }

  return {
    lago: find(['lago', 'estanque', 'pond', 'numero', 'numeor', 'lagos']),
    am: find(['am', 'manana', 'mañana', 'morning']),
    pm: find(['pm', 'tarde', 'afternoon', 'evening']),
    total: find(['total', 'bultos']),
    lote: find(['lote', 'batch']),
    referencia: find(['referencia', 'ref', 'mm', 'marca', 'concentrado']),
    mortalidad: find(['mortalidad', 'mortality', 'muertos']),
    observaciones: find(['observaciones', 'obs', 'notas', 'notes']),
    fecha: find(['fecha', 'date', 'dia']),
  }
}

function findFeedingSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  const feedingSheetName = workbook.SheetNames.find((sheetName) => normalizeText(sheetName) === 'alimentacion')
  return feedingSheetName ? workbook.Sheets[feedingSheetName] ?? null : null
}

function buildHeaderLabel(parts: Array<string | number | null | undefined>): string {
  return parts
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasAnyCellValue(values: Array<string | number | null | undefined>): boolean {
  return values.some((value) => String(value ?? '').trim() !== '')
}

function extractSheetData(sheet: XLSX.WorkSheet): ParsedSheetData | null {
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, {
    header: 1,
    defval: '',
  })

  for (let startIndex = 0; startIndex < Math.min(rows.length, 10); startIndex++) {
    const headerRows = rows.slice(startIndex, startIndex + 3)
    if (headerRows.length === 0) continue

    const maxColumns = Math.max(...headerRows.map((row) => row.length), 0)
    const headers = Array.from({ length: maxColumns }, (_, columnIndex) =>
      buildHeaderLabel(headerRows.map((row) => row[columnIndex]))
    )
    const columns = detectColumns(headers)
    const looksLikeHeader =
      !!columns.lago &&
      (!!columns.am || !!columns.pm || !!columns.total) &&
      (!!columns.referencia || !!columns.lote)

    if (!looksLikeHeader) continue

    let dataStartIndex = startIndex + headerRows.length
    while (dataStartIndex < rows.length && !hasAnyCellValue(rows[dataStartIndex])) {
      dataStartIndex += 1
    }

    return {
      headers,
      dataRows: rows
        .slice(dataStartIndex)
        .map((values, offset) => ({
          rowIndex: dataStartIndex + offset + 1,
          values,
        }))
        .filter((row) => hasAnyCellValue(row.values)),
    }
  }

  return null
}

export function DailyFeedImportDialog({ concentrates, batches, ponds }: DailyFeedImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number } | { error: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validRows = parsedRows.filter((r) => r.parsed && r.errors.length === 0)
  const invalidRows = parsedRows.filter((r) => !r.parsed || r.errors.length > 0)
  const hasFileLevelError =
    parsedRows.length === 1 &&
    parsedRows[0]?.rowIndex === 0 &&
    parsedRows[0]?.parsed == null &&
    Object.keys(parsedRows[0]?.raw ?? {}).length === 0 &&
    parsedRows[0]?.errors.length > 0

  const processFile = useCallback(
    (selectedFile: File) => {
      setFile(selectedFile)
      setParsedRows([])
      setImportResult(null)

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const feedingSheet = findFeedingSheet(workbook)

          if (!feedingSheet) {
            const availableSheets = workbook.SheetNames.join(', ')
            setParsedRows([{
              rowIndex: 0,
              raw: {},
              parsed: null,
              errors: [
                availableSheets
                  ? `No se encontró la hoja "alimentacion". Hojas disponibles: ${availableSheets}`
                  : 'No se encontró la hoja "alimentacion" en el archivo.',
              ],
            }])
            return
          }

          const sheetData = extractSheetData(feedingSheet)

          if (!sheetData || sheetData.dataRows.length === 0) {
            setParsedRows([{
              rowIndex: 0,
              raw: {},
              parsed: null,
              errors: ['No se pudo identificar el encabezado o no hay filas de datos en la hoja "alimentacion".'],
            }])
            return
          }

          const { headers, dataRows } = sheetData
          const cols = detectColumns(headers)

          const results: ParsedRow[] = []

          for (const sheetRow of dataRows) {
            const raw: Record<string, string | number | null> = {}
            headers.forEach((header, idx) => {
              if (!header) return
              raw[header] = sheetRow.values[idx] ?? null
            })

            const errors: string[] = []

            // Extract values
            const lagoValue = cols.lago ? raw[cols.lago] : null
            const loteValue = cols.lote ? raw[cols.lote] : null
            const amValue = cols.am ? raw[cols.am] : null
            const pmValue = cols.pm ? raw[cols.pm] : null
            const totalValue = cols.total ? raw[cols.total] : null
            const refValue = cols.referencia ? raw[cols.referencia] : null
            const mortValue = cols.mortalidad ? raw[cols.mortalidad] : null
            const obsValue = cols.observaciones ? raw[cols.observaciones] : null
            const fechaValue = cols.fecha ? raw[cols.fecha] : null

            // Find batch
            const batch = findBatch(lagoValue, loteValue, batches, ponds)
            if (!batch) {
              errors.push(`No se encontró lote para lago "${lagoValue}" / lote "${loteValue}"`)
            }

            // Find concentrate
            const concentrate = findConcentrate(String(refValue ?? ''), concentrates)
            if (!concentrate) {
              errors.push(`No se encontró concentrado "${refValue}"`)
            }

            // Parse bags
            let bagsAm = parseNumber(amValue)
            let bagsPm = parseNumber(pmValue)
            const bagsTotal = parseNumber(totalValue)

            if (bagsAm == null && bagsPm == null && bagsTotal != null) {
              // If only total is provided, split or assign to AM
              bagsAm = bagsTotal
              bagsPm = 0
            }

            if (bagsAm == null) bagsAm = 0
            if (bagsPm == null) bagsPm = 0

            if (bagsAm === 0 && bagsPm === 0) {
              errors.push('No hay bultos registrados (AM/PM/TOTAL)')
            }

            // Parse mortality
            const mortality = parseNumber(mortValue) ?? 0

            // Parse date
            let recordDate: string | null = null
            if (fechaValue) {
              const d = new Date(String(fechaValue))
              if (!isNaN(d.getTime())) {
                recordDate = d.toISOString().split('T')[0]
              }
            }
            if (!recordDate && batch) {
              // Default to today if no date column found
              recordDate = new Date().toISOString().split('T')[0]
            }
            if (!recordDate) {
              errors.push('Fecha no válida o no encontrada')
            }

            if (errors.length > 0) {
              results.push({ rowIndex: sheetRow.rowIndex, raw, parsed: null, errors })
              continue
            }

            results.push({
              rowIndex: sheetRow.rowIndex,
              raw,
              parsed: {
                batch_id: batch!.id,
                record_date: recordDate!,
                concentrate_id: concentrate?.id ?? null,
                concentrate_name: concentrate?.name ?? String(refValue ?? 'Desconocido'),
                bags_am: bagsAm,
                bags_pm: bagsPm,
                kg_per_bag: 40,
                mortality_count: mortality,
                reference: String(refValue ?? ''),
                notes: String(obsValue ?? ''),
              },
              errors: [],
            })
          }

          setParsedRows(results)
        } catch (err) {
          setParsedRows([{ rowIndex: 0, raw: {}, parsed: null, errors: ['Error al leer el archivo: ' + (err instanceof Error ? err.message : 'desconocido')] }])
        }
      }
      reader.readAsArrayBuffer(selectedFile)
    },
    [batches, concentrates, ponds]
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    if (!selected) return
    processFile(selected)
  }

  const handleImport = async () => {
    if (validRows.length === 0) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const records = validRows.map((r) => r.parsed!)
      const result = await bulkImportDailyFeedRecords(records)
      setImportResult(result)
      setTimeout(() => {
        setOpen(false)
      }, 2000)
    } catch (err) {
      setImportResult({ error: err instanceof Error ? err.message : 'Error al importar' })
    } finally {
      setIsImporting(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setFile(null)
      setParsedRows([])
      setImportResult(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const previewRows = parsedRows.slice(0, 8)
  const remainingCount = parsedRows.length - 8

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Importar registro diario de alimentación</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel con las columnas: Número de Lagos, Bultos AM/PM, Total, Lote, Referencia, Mortalidad y Observaciones.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="excel-file-input">
              Seleccionar archivo Excel (.xlsx, .xls)
            </label>
            <input
              id="excel-file-input"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
            />
          </div>

          {hasFileLevelError ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {parsedRows[0].errors[0]}
            </p>
          ) : null}

          {parsedRows.length > 0 && !hasFileLevelError ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-sm font-medium">Vista previa</p>
                <span className="text-xs text-muted-foreground">{parsedRows.length} filas encontradas</span>
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validRows.length} válidas
                </span>
                {invalidRows.length > 0 ? (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <XCircle className="h-3.5 w-3.5" />
                    {invalidRows.length} con errores
                  </span>
                ) : null}
              </div>

              {invalidRows.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Filas con errores</p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {invalidRows.slice(0, 5).map((r) => (
                        <li key={r.rowIndex}>
                          Fila {r.rowIndex + 1}: {r.errors.join(', ')}
                        </li>
                      ))}
                      {invalidRows.length > 5 && (
                        <li>... y {invalidRows.length - 5} filas más con errores</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fila</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Lote</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Concentrado</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Bultos AM</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Bultos PM</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Mortalidad</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.map((result) => (
                      <tr key={result.rowIndex} className={result.errors.length > 0 ? 'bg-destructive/5' : ''}>
                        <td className="px-3 py-2 text-muted-foreground">{result.rowIndex + 1}</td>
                        <td className="px-3 py-2">{result.parsed?.record_date ?? '-'}</td>
                        <td className="px-3 py-2 max-w-[120px] truncate">
                          {result.parsed ? batches.find((b) => b.id === result.parsed!.batch_id)?.pond_name ?? result.parsed.batch_id : '-'}
                        </td>
                        <td className="px-3 py-2 max-w-[120px] truncate">
                          {result.parsed?.concentrate_name ?? '-'}
                        </td>
                        <td className="px-3 py-2">{result.parsed?.bags_am ?? '-'}</td>
                        <td className="px-3 py-2">{result.parsed?.bags_pm ?? '-'}</td>
                        <td className="px-3 py-2">{result.parsed?.mortality_count ?? '-'}</td>
                        <td className="px-3 py-2">
                          {result.errors.length === 0 ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Válida
                            </span>
                          ) : (
                            <span className="flex flex-col gap-0.5 text-destructive">
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                Error
                              </span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {remainingCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  ... y {remainingCount} {remainingCount === 1 ? 'fila más' : 'filas más'}
                </p>
              ) : null}
            </div>
          ) : null}

          {importResult ? (
            'error' in importResult ? (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {importResult.error}
              </p>
            ) : (
              <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {importResult.imported} {importResult.imported === 1 ? 'registro importado' : 'registros importados'} exitosamente
              </p>
            )
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleImport} disabled={isImporting || validRows.length === 0}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importando...
              </>
            ) : (
              `Importar ${validRows.length > 0 ? validRows.length : ''} registros válidos`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
