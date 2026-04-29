'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, Loader2, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Badge } from '@/components/ui/badge'
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
  sourcePondName: string
  sourceConcentrateName: string
  matchedBatchId: string | null
  manualBatchId: string | null
  matchedConcentrateId: string | null
  manualConcentrateId: string | null
  draft: Omit<DailyFeedRecordInput, 'batch_id'> | null
  errors: string[]
}

interface ParsedSheetData {
  headers: string[]
  columnMap: Record<string, number | null>
  dataRows: Array<{ rowIndex: number; values: Array<string | number | Date | null> }>
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
  lagoValue: string | number | Date | null,
  batches: BatchForForms[],
  ponds: PondInfo[]
): BatchForForms | null {
  if (!lagoValue) return null
  if (lagoValue instanceof Date) return null

  const lagoNorm = normalizeText(lagoValue?.toString() ?? '')

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

  return null
}

function parseNumber(value: string | number | Date | null): number | null {
  if (value == null || value === '') return null
  if (value instanceof Date) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function parseExcelDate(value: string | number | Date | null): string | null {
  if (value == null || value === '') return null

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null

    const month = String(parsed.m).padStart(2, '0')
    const day = String(parsed.d).padStart(2, '0')
    return `${parsed.y}-${month}-${day}`
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const rawValue = String(value).trim()
  if (!rawValue) return null

  const normalized = rawValue.replace(/\./g, '/').replace(/-/g, '/')
  const parts = normalized.split('/').map((part) => part.trim())

  if (parts.length === 3) {
    const [first, second, third] = parts

    if (first.length === 4) {
      const year = Number(first)
      const month = Number(second)
      const day = Number(third)
      if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
        return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }

    const day = Number(first)
    const month = Number(second)
    const year = Number(third)
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  const parsedDate = new Date(rawValue)
  if (Number.isNaN(parsedDate.getTime())) return null

  return parsedDate.toISOString().split('T')[0]
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

  const findExactOrIncludes = (exactPatterns: string[], includePatterns: string[]): string | null => {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i]
      if (exactPatterns.includes(header)) {
        return headers[i]
      }
    }

    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i]
      for (const pattern of includePatterns) {
        if (header.includes(pattern)) {
          return headers[i]
        }
      }
    }

    return null
  }

  const findPreferred = (preferredPatterns: string[], fallbackPatterns: string[]): string | null => {
    return find(preferredPatterns) ?? find(fallbackPatterns)
  }

  return {
    lago: findPreferred(
      ['nombredelago', 'nombrelago', 'nombredeestanque', 'nombreestanque'],
      ['lago', 'estanque', 'pond', 'numerodelago', 'numerolago', 'numero', 'numeor', 'lagos']
    ),
    am: find(['am', 'manana', 'mañana', 'morning']),
    pm: find(['pm', 'tarde', 'afternoon', 'evening']),
    total: find(['total', 'bultos']),
    lote: find(['lote', 'batch']),
    referencia: find(['referencia', 'ref', 'mm', 'marca', 'concentrado']),
    mortalidad: find(['mortalidad', 'mortality', 'muertos']),
    observaciones: find(['observaciones', 'obs', 'notas', 'notes']),
    fecha: findExactOrIncludes(['fecha', 'date'], ['fechaderegistro', 'fechareporte', 'recorddate']),
  }
}

function findFeedingSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  const feedingSheetName = workbook.SheetNames.find((sheetName) => normalizeText(sheetName) === 'alimentacion')
  return feedingSheetName ? workbook.Sheets[feedingSheetName] ?? null : null
}

function buildHeaderLabel(parts: Array<string | number | Date | null | undefined>): string {
  return parts
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasAnyCellValue(values: Array<string | number | Date | null | undefined>): boolean {
  return values.some((value) => String(value ?? '').trim() !== '')
}

function extractSheetData(sheet: XLSX.WorkSheet): ParsedSheetData | null {
  const rows = XLSX.utils.sheet_to_json<Array<string | number | Date | null>>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
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
      columnMap: Object.fromEntries(Object.entries(columns).map(([key, header]) => [key, header ? headers.indexOf(header) : null])),
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
  const [step, setStep] = useState<'select-file' | 'preview'>('select-file')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number } | { error: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const batchById = new Map(batches.map((batch) => [batch.id, batch] as const))
  const concentrateById = new Map(concentrates.map((concentrate) => [concentrate.id, concentrate] as const))

  const isBatchResolutionError = (error: string) => error.startsWith('No se encontró lote para')
  const isConcentrateResolutionError = (error: string) => error.startsWith('No se encontró concentrado')
  const getResolvedBatchId = (row: ParsedRow) => row.manualBatchId ?? row.matchedBatchId
  const getResolvedConcentrateId = (row: ParsedRow) => row.manualConcentrateId ?? row.matchedConcentrateId
  const getVisibleErrors = (row: ParsedRow) => {
    return row.errors.filter((error) => {
      if (isBatchResolutionError(error) && getResolvedBatchId(row)) return false
      if (isConcentrateResolutionError(error) && getResolvedConcentrateId(row)) return false
      return true
    })
  }

  const getRowState = (row: ParsedRow): 'ready' | 'needs_pond' | 'invalid' => {
    if (!row.draft) return 'invalid'

    const hasBlockingErrors = getVisibleErrors(row).length > 0
    if (hasBlockingErrors) return 'invalid'

    if (!getResolvedBatchId(row) || !getResolvedConcentrateId(row)) return 'needs_pond'

    return 'ready'
  }

  const validRows = parsedRows.filter((row) => getRowState(row) === 'ready')
  const needsPondRows = parsedRows.filter((row) => getRowState(row) === 'needs_pond')
  const invalidRows = parsedRows.filter((row) => getRowState(row) === 'invalid')
  const hasFileLevelError =
    parsedRows.length === 1 &&
    parsedRows[0]?.rowIndex === 0 &&
    parsedRows[0]?.draft == null &&
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
              sourcePondName: '',
              sourceConcentrateName: '',
              matchedBatchId: null,
              manualBatchId: null,
              matchedConcentrateId: null,
              manualConcentrateId: null,
              draft: null,
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
              sourcePondName: '',
              sourceConcentrateName: '',
              matchedBatchId: null,
              manualBatchId: null,
              matchedConcentrateId: null,
              manualConcentrateId: null,
              draft: null,
              errors: ['No se pudo identificar el encabezado o no hay filas de datos en la hoja "alimentacion".'],
            }])
            return
          }

          const { headers, columnMap, dataRows } = sheetData

          const results: ParsedRow[] = []

          for (const sheetRow of dataRows) {
            const raw: Record<string, string | number | null> = {}
            headers.forEach((header, idx) => {
              if (!header) return
              const value = sheetRow.values[idx] ?? null
              raw[header] =
                value instanceof Date
                  ? value.toISOString().slice(0, 10)
                  : typeof value === 'string' || typeof value === 'number' || value == null
                    ? value
                    : String(value)
            })

            const errors: string[] = []

            // Extract values
            const pondNameValue = columnMap.lago != null ? sheetRow.values[columnMap.lago] ?? null : null
            const loteValue = columnMap.lote != null ? sheetRow.values[columnMap.lote] ?? null : null
            const amValue = columnMap.am != null ? sheetRow.values[columnMap.am] ?? null : null
            const pmValue = columnMap.pm != null ? sheetRow.values[columnMap.pm] ?? null : null
            const totalValue = columnMap.total != null ? sheetRow.values[columnMap.total] ?? null : null
            const refValue = columnMap.referencia != null ? sheetRow.values[columnMap.referencia] ?? null : null
            const mortValue = columnMap.mortalidad != null ? sheetRow.values[columnMap.mortalidad] ?? null : null
            const obsValue = columnMap.observaciones != null ? sheetRow.values[columnMap.observaciones] ?? null : null
            const fechaValue = columnMap.fecha != null ? sheetRow.values[columnMap.fecha] ?? null : null

            // Find batch
            const batch = findBatch(pondNameValue, batches, ponds)
            if (!batch) {
              errors.push(`No se encontró lote para nombre de lago "${pondNameValue}" / lote "${loteValue}"`)
            }

            // Find concentrate
            const concentrateLookupValue = String(refValue ?? loteValue ?? '').trim()
            const concentrate = findConcentrate(concentrateLookupValue, concentrates)
            if (!concentrate) {
              errors.push(`No se encontró concentrado "${concentrateLookupValue}"`)
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
            let recordDate = parseExcelDate(fechaValue)
            if (!recordDate) {
              // Si el archivo no trae fecha, usamos la fecha actual.
              recordDate = new Date().toISOString().split('T')[0]
            }

            if (errors.length > 0) {
              const hasOnlyRecoverableErrors = errors.every(
                (error) => isBatchResolutionError(error) || isConcentrateResolutionError(error)
              )
              results.push({
                rowIndex: sheetRow.rowIndex,
                raw,
                sourcePondName: String(pondNameValue ?? loteValue ?? '').trim(),
                sourceConcentrateName: concentrateLookupValue,
                matchedBatchId: batch?.id ?? null,
                manualBatchId: null,
                matchedConcentrateId: concentrate?.id ?? null,
                manualConcentrateId: null,
                draft: hasOnlyRecoverableErrors
                  ? {
                      record_date: recordDate,
                      concentrate_id: concentrate?.id ?? null,
                      concentrate_name: concentrate?.name ?? (concentrateLookupValue || 'Desconocido'),
                      bags_am: bagsAm,
                      bags_pm: bagsPm,
                      kg_per_bag: 40,
                      mortality_count: mortality,
                      reference: concentrateLookupValue,
                      notes: String(obsValue ?? ''),
                    }
                  : null,
                errors,
              })
              continue
            }

            results.push({
              rowIndex: sheetRow.rowIndex,
              raw,
              sourcePondName: String(pondNameValue ?? loteValue ?? '').trim(),
              sourceConcentrateName: concentrateLookupValue,
              matchedBatchId: batch!.id,
              manualBatchId: null,
              matchedConcentrateId: concentrate?.id ?? null,
              manualConcentrateId: null,
              draft: {
                record_date: recordDate,
                concentrate_id: concentrate?.id ?? null,
                concentrate_name: concentrate?.name ?? (concentrateLookupValue || 'Desconocido'),
                bags_am: bagsAm,
                bags_pm: bagsPm,
                kg_per_bag: 40,
                mortality_count: mortality,
                reference: concentrateLookupValue,
                notes: String(obsValue ?? ''),
              },
              errors: [],
            })
          }

          setParsedRows(results)
          setStep('preview')
        } catch (err) {
          setParsedRows([{
            rowIndex: 0,
            raw: {},
            sourcePondName: '',
            sourceConcentrateName: '',
            matchedBatchId: null,
            manualBatchId: null,
            matchedConcentrateId: null,
            manualConcentrateId: null,
            draft: null,
            errors: ['Error al leer el archivo: ' + (err instanceof Error ? err.message : 'desconocido')],
          }])
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
      const records = validRows.map((row) => ({
        ...row.draft!,
        batch_id: getResolvedBatchId(row)!,
        concentrate_id: getResolvedConcentrateId(row),
        concentrate_name:
          (getResolvedConcentrateId(row) && concentrateById.get(getResolvedConcentrateId(row)!)?.name) ??
          row.draft!.concentrate_name,
      }))
      const result = await bulkImportDailyFeedRecords(records)
      setImportResult(result)
    } catch (err) {
      setImportResult({ error: err instanceof Error ? err.message : 'Error al importar' })
    } finally {
      setIsImporting(false)
    }
  }

  const handleBatchSelect = (rowIndex: number, batchId: string) => {
    setParsedRows((currentRows) =>
      currentRows.map((row) =>
        row.rowIndex === rowIndex
          ? {
              ...row,
              manualBatchId: batchId,
            }
          : row
      )
    )
  }

  const handleConcentrateSelect = (rowIndex: number, concentrateId: string) => {
    setParsedRows((currentRows) =>
      currentRows.map((row) =>
        row.rowIndex === rowIndex
          ? {
              ...row,
              manualConcentrateId: concentrateId,
            }
          : row
      )
    )
  }

  const resetState = () => {
    setFile(null)
    setStep('select-file')
    setParsedRows([])
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      resetState()
    }
  }

  const formatStateLabel = (state: 'ready' | 'needs_pond' | 'invalid') => {
    if (state === 'ready') return 'Lista'
    if (state === 'needs_pond') return 'Requiere estanque'
    return 'Inválida'
  }

  const formatStateVariant = (state: 'ready' | 'needs_pond' | 'invalid'): 'default' | 'secondary' | 'destructive' => {
    if (state === 'ready') return 'default'
    if (state === 'needs_pond') return 'secondary'
    return 'destructive'
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto px-0 sm:w-[calc(100vw-2rem)] sm:max-w-6xl xl:max-w-7xl">
        <DialogHeader>
          <DialogTitle className="px-4 pt-4 sm:px-6">Importar registro diario de alimentación</DialogTitle>
          <DialogDescription className="px-4 sm:px-6">
            Wizard de 2 pasos con preview editable. Si no encuentra el estanque, puedes asignarlo manualmente y se importan solo las filas listas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-4 py-2 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={step === 'select-file' ? 'default' : 'outline'}>Paso 1: Archivo</Badge>
            <Badge variant={step === 'preview' ? 'default' : 'outline'}>Paso 2: Preview</Badge>
          </div>

          {step === 'select-file' ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Archivo fuente</p>
                  <p className="text-sm text-muted-foreground">
                    Se intentará leer la hoja <strong>alimentacion</strong>. El formato nuevo usa las columnas <strong>fecha</strong> y <strong>nombre de lago</strong>. Si no existe columna de fecha, se usa la fecha actual. `Lote` también se usa como apoyo para encontrar el concentrado.
                  </p>
                  {file ? (
                    <p className="flex items-center gap-2 text-sm text-foreground">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      {file.name}
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={resetState} disabled={!file}>
                    Reiniciar
                  </Button>
                  <Button type="button" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Seleccionar Excel
                  </Button>
                </div>
              </div>

              <input
                id="excel-file-input"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : null}

          {hasFileLevelError ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {parsedRows[0].errors[0]}
            </p>
          ) : null}

          {step === 'preview' && parsedRows.length > 0 && !hasFileLevelError ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-sm font-medium">Vista previa</p>
                <span className="text-xs text-muted-foreground">{parsedRows.length} filas encontradas</span>
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validRows.length} válidas
                </span>
                {needsPondRows.length > 0 ? (
                  <span className="flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {needsPondRows.length} requieren estanque
                  </span>
                ) : null}
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
                          Fila {r.rowIndex}: {getVisibleErrors(r).join(', ')}
                        </li>
                      ))}
                      {invalidRows.length > 5 && (
                        <li>... y {invalidRows.length - 5} filas más con errores</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <div className="grid gap-3 xl:hidden">
                {parsedRows.map((row) => {
                  const state = getRowState(row)
                  const resolvedBatchId = getResolvedBatchId(row)
                  const resolvedBatch = resolvedBatchId ? batchById.get(resolvedBatchId) : null
                  const resolvedConcentrateId = getResolvedConcentrateId(row)
                  const resolvedConcentrate = resolvedConcentrateId ? concentrateById.get(resolvedConcentrateId) : null
                  const visibleErrors = getVisibleErrors(row)

                  return (
                    <div
                      key={row.rowIndex}
                      className={`rounded-xl border p-4 ${state === 'invalid' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-background'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Fila {row.rowIndex}</p>
                          <p className="text-sm font-medium text-foreground">{row.draft?.record_date ?? '-'}</p>
                        </div>
                        <Badge variant={formatStateVariant(state)}>{formatStateLabel(state)}</Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Estanque archivo</p>
                          <p className="text-sm text-foreground">{row.sourcePondName || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Estanque destino</p>
                          {!resolvedBatchId ? (
                            <Select
                              value={row.manualBatchId ?? undefined}
                              onValueChange={(batchId) => handleBatchSelect(row.rowIndex, batchId)}
                            >
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Selecciona un estanque" />
                              </SelectTrigger>
                              <SelectContent>
                                {batches.map((batch) => (
                                  <SelectItem key={batch.id} value={batch.id}>
                                    {batch.pond_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm text-foreground">{resolvedBatch?.pond_name ?? '-'}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Concentrado archivo</p>
                          <p className="text-sm text-foreground break-words">{row.sourceConcentrateName || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Concentrado destino</p>
                          {!resolvedConcentrateId ? (
                            <Select
                              value={row.manualConcentrateId ?? undefined}
                              onValueChange={(concentrateId) => handleConcentrateSelect(row.rowIndex, concentrateId)}
                            >
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Selecciona un concentrado" />
                              </SelectTrigger>
                              <SelectContent>
                                {concentrates.map((concentrate) => (
                                  <SelectItem key={concentrate.id} value={concentrate.id}>
                                    {concentrate.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm text-foreground break-words">
                              {resolvedConcentrate?.name ?? row.draft?.concentrate_name ?? '-'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/30 p-3">
                        <div>
                          <p className="text-[11px] text-muted-foreground">AM</p>
                          <p className="text-sm font-medium">{row.draft?.bags_am ?? '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">PM</p>
                          <p className="text-sm font-medium">{row.draft?.bags_pm ?? '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Mortalidad</p>
                          <p className="text-sm font-medium">{row.draft?.mortality_count ?? '-'}</p>
                        </div>
                      </div>

                      {visibleErrors.length > 0 ? (
                        <div className="mt-3 text-xs text-muted-foreground">
                          {visibleErrors.join(', ')}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              <div className="hidden overflow-x-auto rounded-md border border-border xl:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estanque archivo</TableHead>
                      <TableHead>Estanque destino</TableHead>
                      <TableHead>Concentrado archivo</TableHead>
                      <TableHead>Concentrado destino</TableHead>
                      <TableHead className="text-right">AM</TableHead>
                      <TableHead className="text-right">PM</TableHead>
                      <TableHead className="text-right">Mortalidad</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row) => {
                      const state = getRowState(row)
                      const resolvedBatchId = getResolvedBatchId(row)
                      const resolvedBatch = resolvedBatchId ? batchById.get(resolvedBatchId) : null
                      const resolvedConcentrateId = getResolvedConcentrateId(row)
                      const resolvedConcentrate = resolvedConcentrateId ? concentrateById.get(resolvedConcentrateId) : null
                      const visibleErrors = getVisibleErrors(row)

                      return (
                        <TableRow key={row.rowIndex} className={state === 'invalid' ? 'bg-destructive/5' : ''}>
                          <TableCell className="text-muted-foreground">{row.rowIndex}</TableCell>
                          <TableCell>{row.draft?.record_date ?? '-'}</TableCell>
                          <TableCell>{row.sourcePondName || '-'}</TableCell>
                          <TableCell className="w-[180px]">
                            {!resolvedBatchId ? (
                              <Select
                                value={row.manualBatchId ?? undefined}
                                onValueChange={(batchId) => handleBatchSelect(row.rowIndex, batchId)}
                              >
                                <SelectTrigger className="h-9 w-full">
                                  <SelectValue placeholder="Selecciona un estanque" />
                                </SelectTrigger>
                                <SelectContent>
                                  {batches.map((batch) => (
                                    <SelectItem key={batch.id} value={batch.id}>
                                      {batch.pond_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              resolvedBatch?.pond_name ?? '-'
                            )}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate" title={row.sourceConcentrateName}>
                            {row.sourceConcentrateName || '-'}
                          </TableCell>
                          <TableCell className="w-[220px]">
                            {!resolvedConcentrateId ? (
                              <Select
                                value={row.manualConcentrateId ?? undefined}
                                onValueChange={(concentrateId) => handleConcentrateSelect(row.rowIndex, concentrateId)}
                              >
                                <SelectTrigger className="h-9 w-full">
                                  <SelectValue placeholder="Selecciona un concentrado" />
                                </SelectTrigger>
                                <SelectContent>
                                  {concentrates.map((concentrate) => (
                                    <SelectItem key={concentrate.id} value={concentrate.id}>
                                      {concentrate.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              resolvedConcentrate?.name ?? row.draft?.concentrate_name ?? '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">{row.draft?.bags_am ?? '-'}</TableCell>
                          <TableCell className="text-right">{row.draft?.bags_pm ?? '-'}</TableCell>
                          <TableCell className="text-right">{row.draft?.mortality_count ?? '-'}</TableCell>
                          <TableCell className="space-y-2">
                            <Badge variant={formatStateVariant(state)}>{formatStateLabel(state)}</Badge>
                            {visibleErrors.length > 0 ? (
                              <div className="text-xs text-muted-foreground">
                                {visibleErrors.join(', ')}
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-md border border-border bg-muted/20 px-3 py-3 text-sm">
                Se importarán <strong>{validRows.length}</strong> filas listas. Las filas que requieran estanque o sigan inválidas se omiten.
              </div>
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

        <DialogFooter className="px-4 pb-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>
            Cerrar
          </Button>
          {step === 'preview' ? (
            <Button type="button" variant="outline" onClick={() => setStep('select-file')} disabled={isImporting}>
              Cambiar archivo
            </Button>
          ) : null}
          <Button type="button" onClick={handleImport} disabled={isImporting || validRows.length === 0}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importando...
              </>
            ) : (
              `Importar ${validRows.length > 0 ? validRows.length : ''} filas listas`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
