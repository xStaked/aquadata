'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Loader2, Upload, XCircle } from 'lucide-react'
import { bulkUpsertBioremediationCases } from '@/app/admin/bioremediation/cases/actions'
import { caseInputSchema } from '@/lib/case-library/schema'
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

const CSV_HEADERS = ['issue', 'zone', 'species', 'product_name', 'treatment_approach', 'dose', 'dose_unit', 'outcome', 'notes']

type ValidationResult = {
  row: number
  data: Record<string, string>
  valid: boolean
  error?: string
}

function downloadTemplate() {
  const header = CSV_HEADERS.join(',')
  const rows = [
    [
      '"Amonia elevada por sobrecarga de alimentacion"',
      '"Llanos Orientales"',
      '"Cachama blanca"',
      '"BioAquapro"',
      '"Aplicacion preventiva al amanecer con aireacion activa. Dosis calculada sobre volumen total del estanque de 0.5 ha. Repetir a las 72h si amonia sigue por encima de 1 mg/L."',
      '3.5',
      '"L"',
      '"Reduccion de amonia de 2.8 a 0.6 mg/L en 48 horas. Cosecha sin novedad 12 dias despues."',
      '"Estanque con 3 anos de produccion continua sin recambio de sedimento"',
    ],
    [
      '"Floracion de cianobacterias post lluvia"',
      '"Caribe"',
      '"Tilapia roja"',
      '"BioAquapro"',
      '"Intervencion de emergencia a las 6am. Aplicar sobre la superficie sin aireacion las primeras 2 horas para maximizar contacto. Activar aireacion nocturna al segundo dia."',
      '5',
      '"L"',
      '"Quiebre de floracion visible a las 36h. Transparencia del agua recuperada en 4 dias."',
      '"Floracion asociada a entrada de escorrentia agricola con nitratos"',
    ],
    [
      '"Nitrito alto en etapa de alevinaje"',
      '"Llanos Orientales"',
      '"Cachama blanca"',
      '"BioAquapro"',
      '"Dosis fraccionada: mitad en la manana y mitad en la tarde. Mantener aireacion continua. No alimentar las primeras 24h."',
      '1.5',
      '"L"',
      '"Nitrito bajo de 0.9 a 0.15 mg/L en 72 horas sin mortalidad adicional."',
      '"Alevinaje de 25 dias de edad al momento del tratamiento"',
    ],
    [
      '"Exceso de materia organica en fondo por mortalidad parcial"',
      '"Antioquia"',
      '"Trucha arcoiris"',
      '"BioAquapro"',
      '"Aplicacion directa sobre zona de acumulacion usando manguera sumergida. Complementar con recambio del 20% del agua al tercer dia."',
      '2',
      '"L"',
      '"Reduccion visible de capa organica en fondo. DBO reducida de 18 a 6 mg/L en 5 dias."',
      '"Mortalidad previa de aprox 8% por cambio brusco de temperatura"',
    ],
    [
      '"Colapso de oxigeno post-alimentacion en dia nublado"',
      '"Llanos Orientales"',
      '"Cachama negra"',
      '"BioAquapro"',
      '"Suspension inmediata de alimentacion. Aplicacion de emergencia distribuida en todo el espejo de agua desde lancha. Aireacion maxima simultanea."',
      '6',
      '"L"',
      '"Recuperacion de oxigeno de 0.8 a 4.2 mg/L en 3 horas. Mortalidad final inferior al 1%."',
      '"Intervencion de emergencia. Respuesta rapida fue clave para contener la perdida."',
    ],
  ]
  const csvContent = `${header}\n${rows.map((r) => r.join(',')).join('\n')}`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla-casos-bioremediacion.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } | { headerError: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) {
    return { headerError: 'El archivo CSV esta vacio.' }
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim())
  const expectedHeaders = CSV_HEADERS

  const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h))
  if (missingHeaders.length > 0) {
    return { headerError: 'Las columnas del CSV no coinciden con la plantilla esperada' }
  }

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

export function CaseCsvImportDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validRows = validationResults.filter((r) => r.valid)
  const invalidRows = validationResults.filter((r) => !r.valid)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
    setHeaderError(null)
    setValidationResults([])
    setImportResult(null)

    if (!selected) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)

      if ('headerError' in parsed) {
        setHeaderError(parsed.headerError)
        return
      }

      const results: ValidationResult[] = parsed.rows.map((row, index) => {
        const result = caseInputSchema.safeParse({ ...row, status: 'draft' })
        if (result.success) {
          return { row: index + 1, data: row, valid: true }
        }
        const fieldErrors = result.error.flatten().fieldErrors
        const firstError = Object.values(fieldErrors).find((e) => e && e.length > 0)?.[0]
        return {
          row: index + 1,
          data: row,
          valid: false,
          error: firstError ?? 'Datos invalidos',
        }
      })

      setValidationResults(results)
    }
    reader.readAsText(selected)
  }

  const handleImport = async () => {
    if (validRows.length === 0) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const validData = validRows.map((r) => ({ ...r.data, status: 'draft' }))
      const result = await bulkUpsertBioremediationCases(validData)
      setImportResult(result)
      setTimeout(() => {
        setOpen(false)
      }, 1500)
    } catch (err) {
      setImportResult({
        inserted: 0,
        errors: [err instanceof Error ? err.message : 'Error al importar los casos'],
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setFile(null)
      setHeaderError(null)
      setValidationResults([])
      setImportResult(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const previewRows = validationResults.slice(0, 5)
  const remainingCount = validationResults.length - 5

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar casos desde CSV</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, completa los casos y sube el archivo para importarlos como borradores.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" type="button" onClick={downloadTemplate}>
              Descargar plantilla CSV
            </Button>
            <span className="text-xs text-muted-foreground">
              Descarga el archivo de ejemplo con las columnas correctas
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="csv-file-input">
              Seleccionar archivo CSV
            </label>
            <input
              id="csv-file-input"
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
            />
          </div>

          {headerError ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {headerError}
            </p>
          ) : null}

          {validationResults.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium">Vista previa</p>
                <span className="text-xs text-muted-foreground">{validationResults.length} filas encontradas</span>
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validRows.length} validas
                </span>
                {invalidRows.length > 0 ? (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <XCircle className="h-3.5 w-3.5" />
                    {invalidRows.length} con errores
                  </span>
                ) : null}
              </div>

              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fila</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Problema</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Especie</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Dosis</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.map((result) => (
                      <tr key={result.row} className={result.valid ? '' : 'bg-destructive/5'}>
                        <td className="px-3 py-2 text-muted-foreground">{result.row}</td>
                        <td className="max-w-[180px] truncate px-3 py-2">{result.data.issue || '-'}</td>
                        <td className="px-3 py-2">{result.data.species || '-'}</td>
                        <td className="max-w-[120px] truncate px-3 py-2">{result.data.product_name || '-'}</td>
                        <td className="px-3 py-2">
                          {result.data.dose ? `${result.data.dose} ${result.data.dose_unit || 'L'}` : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {result.valid ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Valida
                            </span>
                          ) : (
                            <span className="flex flex-col gap-0.5 text-destructive">
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                Error
                              </span>
                              <span className="text-[10px] leading-tight text-destructive/80">
                                {result.error}
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
                  ... y {remainingCount} {remainingCount === 1 ? 'fila mas' : 'filas mas'}
                </p>
              ) : null}
            </div>
          ) : null}

          {importResult ? (
            importResult.inserted > 0 ? (
              <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {importResult.inserted} {importResult.inserted === 1 ? 'caso importado exitosamente' : 'casos importados exitosamente'}
              </p>
            ) : (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {importResult.errors[0] ?? 'No se pudieron importar los casos'}
              </p>
            )
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isImporting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isImporting || validRows.length === 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              `Importar ${validRows.length > 0 ? validRows.length : ''} casos validos`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
