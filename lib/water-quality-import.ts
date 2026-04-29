import * as XLSX from 'xlsx'

export interface WaterQualityImportPondOption {
  id: string
  name: string
}

export interface ParsedOtImportRow {
  client_id: string
  source_sheet: string
  source_rows: number[]
  reading_date: string | null
  reading_time: string | null
  source_pond_name: string
  matched_pond_id: string | null
  matched_pond_name: string | null
  oxygen_mg_l: number | null
  temperature_c: number | null
  errors: string[]
}

interface OtHeaderMap {
  date: number
  time: number
  pond: number | null
  variable: number
  value: number
}

interface OtDraftReading {
  sourceRows: number[]
  readingDate: string | null
  readingTime: string | null
  sourcePondName: string
  oxygenMgL: number | null
  temperatureC: number | null
}

function normalizeHeaderCell(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizePondLookup(name: string): string {
  return name.trim().toLowerCase()
}

function toIsoDateFromExcelSerial(value: number): string | null {
  const parsed = XLSX.SSF.parse_date_code(value)
  if (!parsed || !parsed.y || !parsed.m || !parsed.d) {
    return null
  }

  const year = String(parsed.y).padStart(4, '0')
  const month = String(parsed.m).padStart(2, '0')
  const day = String(parsed.d).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toTimeFromExcelSerial(value: number): string | null {
  const totalSeconds = Math.round(value * 24 * 60 * 60)
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return null
  }

  const hours = String(Math.floor(totalSeconds / 3600) % 24).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  return `${hours}:${minutes}`
}

function parseReadingDate(value: unknown): string | null {
  if (typeof value === 'number') {
    return toIsoDateFromExcelSerial(value)
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const raw = String(value ?? '').trim()
  if (!raw) return null

  const isoLike = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoLike) {
    const [, year, month, day] = isoLike
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const slashLike = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashLike) {
    const [, left, middle, yearRaw] = slashLike
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
    // Excel raw serials are preferred. For string fallback, assume day/month/year.
    return `${year}-${middle.padStart(2, '0')}-${left.padStart(2, '0')}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().slice(0, 10)
}

function parseReadingTime(value: unknown): string | null {
  if (typeof value === 'number') {
    return toTimeFromExcelSerial(value)
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(11, 16)
  }

  const raw = String(value ?? '').trim()
  if (!raw) return null

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return null

  const [, hours, minutes] = match
  return `${hours.padStart(2, '0')}:${minutes}`
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const raw = String(value ?? '').trim()
  if (!raw) return null

  const normalized = raw.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeVariable(value: unknown): 'oxygen' | 'temperature' | null {
  const normalized = normalizeHeaderCell(value)

  if (normalized.includes('oxigen')) return 'oxygen'
  if (normalized.includes('temperatura')) return 'temperature'
  return null
}

function fillMergedCells(
  rows: Array<Array<string | number | Date | null>>,
  merges: XLSX.Range[] | undefined
): Array<Array<string | number | Date | null>> {
  if (!merges || merges.length === 0) {
    return rows
  }

  const nextRows = rows.map((row) => [...row])
  for (const merge of merges) {
    const topLeft = nextRows[merge.s.r]?.[merge.s.c]
    if (topLeft == null || topLeft === '') continue

    for (let rowIndex = merge.s.r; rowIndex <= merge.e.r; rowIndex += 1) {
      if (!nextRows[rowIndex]) nextRows[rowIndex] = []
      for (let columnIndex = merge.s.c; columnIndex <= merge.e.c; columnIndex += 1) {
        if (nextRows[rowIndex][columnIndex] == null || nextRows[rowIndex][columnIndex] === '') {
          nextRows[rowIndex][columnIndex] = topLeft
        }
      }
    }
  }

  return nextRows
}

function findOtHeaderRow(
  rows: Array<Array<string | number | Date | null>>
): { headerRowIndex: number; map: OtHeaderMap } | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 10); rowIndex += 1) {
    const row = rows[rowIndex] ?? []
    const normalized = row.map(normalizeHeaderCell)

    const date = normalized.findIndex((cell) => cell === 'fecha')
    const time = normalized.findIndex((cell) => cell === 'hora')
    const pond = normalized.findIndex((cell) => cell === 'estanque')
    const variable = normalized.findIndex((cell) => cell === 'variable')
    const value = normalized.findIndex((cell) => cell === 'valor')

    if (date >= 0 && time >= 0 && variable >= 0 && value >= 0) {
      return {
        headerRowIndex: rowIndex,
        map: {
          date,
          time,
          pond: pond >= 0 ? pond : null,
          variable,
          value,
        },
      }
    }
  }

  return null
}

function flushDraft(
  rows: ParsedOtImportRow[],
  draft: OtDraftReading | null,
  pondsByLookup: Map<string, WaterQualityImportPondOption>,
  sourceSheet: string
) {
  if (!draft) return

  const errors: string[] = []
  if (!draft.readingDate) errors.push('Fecha invalida o ausente')
  if (!draft.readingTime) errors.push('Hora invalida o ausente')
  if (draft.oxygenMgL == null) errors.push('Falta oxigeno')
  if (draft.temperatureC == null) errors.push('Falta temperatura')

  const sourcePondName = draft.sourcePondName.trim()
  const matchedPond = sourcePondName
    ? pondsByLookup.get(normalizePondLookup(sourcePondName)) ?? null
    : null

  if (!matchedPond) {
    errors.push(sourcePondName ? 'Estanque no encontrado' : 'Estanque ausente en archivo')
  }

  rows.push({
    client_id: `${sourceSheet}-${draft.sourceRows.join('-')}`,
    source_sheet: sourceSheet,
    source_rows: draft.sourceRows,
    reading_date: draft.readingDate,
    reading_time: draft.readingTime,
    source_pond_name: sourcePondName,
    matched_pond_id: matchedPond?.id ?? null,
    matched_pond_name: matchedPond?.name ?? null,
    oxygen_mg_l: draft.oxygenMgL,
    temperature_c: draft.temperatureC,
    errors,
  })
}

function sameSignature(
  draft: OtDraftReading,
  readingDate: string | null,
  readingTime: string | null,
  sourcePondName: string
) {
  return (
    draft.readingDate === readingDate &&
    draft.readingTime === readingTime &&
    draft.sourcePondName === sourcePondName
  )
}

export function findOtSheetName(sheetNames: string[]): string | null {
  return (
    sheetNames.find((sheetName) => normalizeHeaderCell(sheetName).replace(/\s+/g, '') === 'ot') ??
    null
  )
}

export function parseOtWorkbook(
  workbook: XLSX.WorkBook,
  ponds: WaterQualityImportPondOption[]
): ParsedOtImportRow[] {
  const sheetName = findOtSheetName(workbook.SheetNames)
  if (!sheetName) {
    throw new Error('El archivo no contiene una hoja llamada OT')
  }

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error('No se pudo leer la hoja OT')
  }

  const rawRows = XLSX.utils.sheet_to_json<Array<string | number | Date | null>>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  })

  const rows = fillMergedCells(rawRows, sheet['!merges'])
  const header = findOtHeaderRow(rows)
  if (!header) {
    throw new Error('La hoja OT no tiene el encabezado esperado')
  }

  const pondsByLookup = new Map(
    ponds.map((pond) => [normalizePondLookup(pond.name), pond] as const)
  )

  const parsedRows: ParsedOtImportRow[] = []
  let currentDraft: OtDraftReading | null = null

  for (let rowIndex = header.headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? []
    const variable = normalizeVariable(row[header.map.variable])
    if (!variable) continue

    const readingDate = parseReadingDate(row[header.map.date])
    const readingTime = parseReadingTime(row[header.map.time])
    const sourcePondName =
      header.map.pond != null ? String(row[header.map.pond] ?? '').trim() : ''
    const value = parseNumericValue(row[header.map.value])

    if (!currentDraft) {
      currentDraft = {
        sourceRows: [rowIndex + 1],
        readingDate,
        readingTime,
        sourcePondName,
        oxygenMgL: null,
        temperatureC: null,
      }
    } else if (
      !sameSignature(currentDraft, readingDate, readingTime, sourcePondName) ||
      (variable === 'oxygen' && currentDraft.oxygenMgL != null) ||
      (variable === 'temperature' && currentDraft.temperatureC != null)
    ) {
      flushDraft(parsedRows, currentDraft, pondsByLookup, sheetName)
      currentDraft = {
        sourceRows: [rowIndex + 1],
        readingDate,
        readingTime,
        sourcePondName,
        oxygenMgL: null,
        temperatureC: null,
      }
    } else {
      currentDraft.sourceRows.push(rowIndex + 1)
    }

    if (variable === 'oxygen') currentDraft.oxygenMgL = value
    if (variable === 'temperature') currentDraft.temperatureC = value

    if (currentDraft.oxygenMgL != null && currentDraft.temperatureC != null) {
      flushDraft(parsedRows, currentDraft, pondsByLookup, sheetName)
      currentDraft = null
    }
  }

  flushDraft(parsedRows, currentDraft, pondsByLookup, sheetName)

  if (parsedRows.length === 0) {
    throw new Error('La hoja OT no contiene lecturas importables')
  }

  return parsedRows
}
