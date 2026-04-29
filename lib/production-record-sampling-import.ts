import * as XLSX from 'xlsx'

export interface ProductionRecordSamplingImportPondOption {
  id: string
  name: string
}

export interface ParsedSamplingProductionImportRow {
  client_id: string
  source_sheet: string
  source_row: number
  record_date: string | null
  source_pond_name: string
  matched_pond_id: string | null
  matched_pond_name: string | null
  species: string | null
  sampling_weight_g: number | null
  sample_fish_count: number | null
  avg_weight_g: number | null
  errors: string[]
}

interface SamplingHeaderMap {
  date: number | null
  pond: number
  species: number | null
  samplingWeight: number | null
  sampleFishCount: number | null
  avgWeight: number | null
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
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

function toIsoDateFromExcelSerial(value: number): string | null {
  const parsed = XLSX.SSF.parse_date_code(value)
  if (!parsed || !parsed.y || !parsed.m || !parsed.d) {
    return null
  }

  return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
}

function parseRecordDate(value: unknown): string | null {
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
    const [, day, month, yearRaw] = slashLike
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function buildPondAliases(name: string) {
  const normalized = normalizeText(name)
  const aliases = new Set<string>()
  if (normalized) aliases.add(normalized)

  const digitMatches = normalized.match(/\d+/g) ?? []
  for (const digits of digitMatches) {
    aliases.add(digits)
  }

  return aliases
}

function buildPondLookup(ponds: ProductionRecordSamplingImportPondOption[]) {
  const lookup = new Map<string, ProductionRecordSamplingImportPondOption[]>()

  for (const pond of ponds) {
    for (const alias of buildPondAliases(pond.name)) {
      const current = lookup.get(alias) ?? []
      current.push(pond)
      lookup.set(alias, current)
    }
  }

  return lookup
}

function resolvePond(
  sourcePondName: string,
  pondsByLookup: Map<string, ProductionRecordSamplingImportPondOption[]>
) {
  const aliases = buildPondAliases(sourcePondName)
  for (const alias of aliases) {
    const matches = pondsByLookup.get(alias) ?? []
    if (matches.length === 1) return matches[0]
  }

  return null
}

function hasAnySamplingMetric(row: ParsedSamplingProductionImportRow) {
  return row.sampling_weight_g != null || row.avg_weight_g != null
}

function findHeaderRow(
  rows: Array<Array<string | number | Date | null>>
): { headerRowIndex: number; map: SamplingHeaderMap } | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 10); rowIndex += 1) {
    const row = rows[rowIndex] ?? []
    const normalized = row.map(normalizeText)

    const date = normalized.findIndex((cell) => cell === 'fecha' || cell.includes('fecha'))
    const pond = normalized.findIndex((cell) =>
      cell.includes('numeordelagos') || cell.includes('numerodelagos') || cell === 'numeor' || cell === 'numero'
    )
    const species = normalized.findIndex((cell) => cell.includes('especie'))
    const samplingWeight = normalized.findIndex((cell) =>
      cell.includes('pesomuestro') || cell.includes('pesomuestreo')
    )
    const sampleFishCount = normalized.findIndex((cell) =>
      cell === 'ndepeces' || cell.includes('numerodepeces') || cell.includes('npeces')
    )
    const avgWeight = normalized.findIndex((cell) => cell.includes('pesopromedio'))

    if (pond >= 0 && (samplingWeight >= 0 || avgWeight >= 0)) {
      return {
        headerRowIndex: rowIndex,
        map: {
          date: date >= 0 ? date : null,
          pond,
          species: species >= 0 ? species : null,
          samplingWeight: samplingWeight >= 0 ? samplingWeight : null,
          sampleFishCount: sampleFishCount >= 0 ? sampleFishCount : null,
          avgWeight: avgWeight >= 0 ? avgWeight : null,
        },
      }
    }
  }

  return null
}

export function findSamplingProductionSheetName(sheetNames: string[]) {
  return sheetNames.find((sheetName) => normalizeText(sheetName) === 'muestreo') ?? null
}

export function parseSamplingProductionWorkbook(
  workbook: XLSX.WorkBook,
  ponds: ProductionRecordSamplingImportPondOption[]
): ParsedSamplingProductionImportRow[] {
  const sheetName = findSamplingProductionSheetName(workbook.SheetNames)
  if (!sheetName) {
    throw new Error('El archivo no contiene una hoja llamada MUESTREO')
  }

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error('No se pudo leer la hoja MUESTREO')
  }

  const rawRows = XLSX.utils.sheet_to_json<Array<string | number | Date | null>>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  })

  const header = findHeaderRow(rawRows)
  if (!header) {
    throw new Error('La hoja MUESTREO no tiene el encabezado esperado')
  }

  const pondsByLookup = buildPondLookup(ponds)
  const parsedRows: ParsedSamplingProductionImportRow[] = []

  for (let rowIndex = header.headerRowIndex + 1; rowIndex < rawRows.length; rowIndex += 1) {
    const row = rawRows[rowIndex] ?? []
    const sourcePondName = String(row[header.map.pond] ?? '').trim()
    const pondValueNormalized = normalizeText(sourcePondName)

    if (!pondValueNormalized) continue

    const parsedRow: ParsedSamplingProductionImportRow = {
      client_id: `${sheetName}-${rowIndex + 1}`,
      source_sheet: sheetName,
      source_row: rowIndex + 1,
      record_date: header.map.date != null ? parseRecordDate(row[header.map.date]) : null,
      source_pond_name: sourcePondName,
      matched_pond_id: null,
      matched_pond_name: null,
      species: header.map.species != null ? String(row[header.map.species] ?? '').trim() || null : null,
      sampling_weight_g: header.map.samplingWeight != null ? parseNumericValue(row[header.map.samplingWeight]) : null,
      sample_fish_count: header.map.sampleFishCount != null ? parseNumericValue(row[header.map.sampleFishCount]) : null,
      avg_weight_g: header.map.avgWeight != null ? parseNumericValue(row[header.map.avgWeight]) : null,
      errors: [],
    }

    const matchedPond = resolvePond(sourcePondName, pondsByLookup)
    parsedRow.matched_pond_id = matchedPond?.id ?? null
    parsedRow.matched_pond_name = matchedPond?.name ?? null

    if (!hasAnySamplingMetric(parsedRow)) {
      parsedRow.errors.push('La fila no contiene biometria importable')
    }

    if (!matchedPond) {
      parsedRow.errors.push('Estanque no encontrado')
    }

    parsedRows.push(parsedRow)
  }

  const importableRows = parsedRows.filter((row) => hasAnySamplingMetric(row))
  if (importableRows.length === 0) {
    throw new Error('La hoja MUESTREO no contiene filas importables')
  }

  return parsedRows
}
