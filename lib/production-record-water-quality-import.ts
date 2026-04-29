import * as XLSX from 'xlsx'

export interface ProductionRecordWaterQualityImportPondOption {
  id: string
  name: string
}

export interface ParsedWaterQualityProductionImportRow {
  client_id: string
  source_sheet: string
  source_row: number
  source_pond_name: string
  matched_pond_id: string | null
  matched_pond_name: string | null
  ph: number | null
  ammonia_mg_l: number | null
  nitrite_mg_l: number | null
  nitrate_mg_l: number | null
  phosphate_mg_l: number | null
  turbidity_ntu: number | null
  alkalinity_mg_l: number | null
  hardness_mg_l: number | null
  errors: string[]
}

interface WaterQualityHeaderMap {
  pond: number
  ph: number | null
  ammonia: number | null
  nitrite: number | null
  nitrate: number | null
  phosphate: number | null
  turbidity: number | null
  alkalinity: number | null
  hardness: number | null
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

function buildPondLookup(ponds: ProductionRecordWaterQualityImportPondOption[]) {
  const lookup = new Map<string, ProductionRecordWaterQualityImportPondOption[]>()

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
  pondsByLookup: Map<string, ProductionRecordWaterQualityImportPondOption[]>
) {
  const aliases = buildPondAliases(sourcePondName)
  for (const alias of aliases) {
    const matches = pondsByLookup.get(alias) ?? []
    if (matches.length === 1) {
      return matches[0]
    }
  }

  return null
}

function hasAnyMetric(row: ParsedWaterQualityProductionImportRow) {
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

function findHeaderRow(
  rows: Array<Array<string | number | Date | null>>
): { headerRowIndex: number; map: WaterQualityHeaderMap } | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 10); rowIndex += 1) {
    const row = rows[rowIndex] ?? []
    const normalized = row.map(normalizeText)

    const pond = normalized.findIndex((cell) =>
      cell.includes('numeordelagos') || cell.includes('numerodelagos') || cell === 'numeor' || cell === 'numero'
    )
    const ph = normalized.findIndex((cell) => cell === 'ph')
    const ammonia = normalized.findIndex((cell) => cell.includes('amonio'))
    const nitrite = normalized.findIndex((cell) => cell.includes('nitrito'))
    const nitrate = normalized.findIndex((cell) => cell.includes('nitrato'))
    const phosphate = normalized.findIndex((cell) => cell.includes('fosfato'))
    const turbidity = normalized.findIndex((cell) => cell.includes('turbidez'))
    const alkalinity = normalized.findIndex((cell) => cell.includes('alcalinidad'))
    const hardness = normalized.findIndex((cell) => cell.includes('dureza'))

    if (pond >= 0 && [ph, ammonia, nitrite, nitrate, phosphate, turbidity, alkalinity, hardness].some((index) => index >= 0)) {
      return {
        headerRowIndex: rowIndex,
        map: {
          pond,
          ph: ph >= 0 ? ph : null,
          ammonia: ammonia >= 0 ? ammonia : null,
          nitrite: nitrite >= 0 ? nitrite : null,
          nitrate: nitrate >= 0 ? nitrate : null,
          phosphate: phosphate >= 0 ? phosphate : null,
          turbidity: turbidity >= 0 ? turbidity : null,
          alkalinity: alkalinity >= 0 ? alkalinity : null,
          hardness: hardness >= 0 ? hardness : null,
        },
      }
    }
  }

  return null
}

export function findWaterQualityProductionSheetName(sheetNames: string[]) {
  return (
    sheetNames.find((sheetName) => normalizeText(sheetName) === 'calidaddeagua') ??
    null
  )
}

export function parseWaterQualityProductionWorkbook(
  workbook: XLSX.WorkBook,
  ponds: ProductionRecordWaterQualityImportPondOption[]
): ParsedWaterQualityProductionImportRow[] {
  const sheetName = findWaterQualityProductionSheetName(workbook.SheetNames)
  if (!sheetName) {
    throw new Error('El archivo no contiene una hoja llamada CALIDAD DE AGUA')
  }

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error('No se pudo leer la hoja CALIDAD DE AGUA')
  }

  const rawRows = XLSX.utils.sheet_to_json<Array<string | number | Date | null>>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  })

  const header = findHeaderRow(rawRows)
  if (!header) {
    throw new Error('La hoja CALIDAD DE AGUA no tiene el encabezado esperado')
  }

  const pondsByLookup = buildPondLookup(ponds)
  const parsedRows: ParsedWaterQualityProductionImportRow[] = []

  for (let rowIndex = header.headerRowIndex + 1; rowIndex < rawRows.length; rowIndex += 1) {
    const row = rawRows[rowIndex] ?? []
    const sourcePondName = String(row[header.map.pond] ?? '').trim()
    const pondValueNormalized = normalizeText(sourcePondName)

    if (!pondValueNormalized) {
      continue
    }

    const parsedRow: ParsedWaterQualityProductionImportRow = {
      client_id: `${sheetName}-${rowIndex + 1}`,
      source_sheet: sheetName,
      source_row: rowIndex + 1,
      source_pond_name: sourcePondName,
      matched_pond_id: null,
      matched_pond_name: null,
      ph: header.map.ph != null ? parseNumericValue(row[header.map.ph]) : null,
      ammonia_mg_l: header.map.ammonia != null ? parseNumericValue(row[header.map.ammonia]) : null,
      nitrite_mg_l: header.map.nitrite != null ? parseNumericValue(row[header.map.nitrite]) : null,
      nitrate_mg_l: header.map.nitrate != null ? parseNumericValue(row[header.map.nitrate]) : null,
      phosphate_mg_l: header.map.phosphate != null ? parseNumericValue(row[header.map.phosphate]) : null,
      turbidity_ntu: header.map.turbidity != null ? parseNumericValue(row[header.map.turbidity]) : null,
      alkalinity_mg_l: header.map.alkalinity != null ? parseNumericValue(row[header.map.alkalinity]) : null,
      hardness_mg_l: header.map.hardness != null ? parseNumericValue(row[header.map.hardness]) : null,
      errors: [],
    }

    const matchedPond = resolvePond(sourcePondName, pondsByLookup)
    parsedRow.matched_pond_id = matchedPond?.id ?? null
    parsedRow.matched_pond_name = matchedPond?.name ?? null

    if (!hasAnyMetric(parsedRow)) {
      parsedRow.errors.push('La fila no contiene parametros de calidad de agua')
    }

    if (!matchedPond) {
      parsedRow.errors.push('Estanque no encontrado')
    }

    parsedRows.push(parsedRow)
  }

  const importableRows = parsedRows.filter((row) => hasAnyMetric(row))
  if (importableRows.length === 0) {
    throw new Error('La hoja CALIDAD DE AGUA no contiene filas importables')
  }

  return parsedRows
}
