'use client'

import { Button } from '@/components/ui/button'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { useState } from 'react'

interface RecordRow {
  id: string
  record_date: string
  pond_name: string
  feed_kg: number | null
  avg_weight_g: number | null
  mortality_count: number
  temperature_c: number | null
  oxygen_mg_l: number | null
  ammonia_mg_l: number | null
  nitrite_mg_l: number | null
  ph: number | null
  calculated_fca: number | null
  calculated_biomass_kg: number | null
}

interface RecordsExportProps {
  records: RecordRow[]
}

const HEADERS = [
  'Fecha',
  'Estanque',
  'Alimento (kg)',
  'Peso prom. (g)',
  'Mortalidad',
  'Temp. (°C)',
  'O₂ (mg/L)',
  'NH₃ (mg/L)',
  'NO₂ (mg/L)',
  'pH',
  'FCA',
  'Biomasa (kg)',
]

function formatRow(rec: RecordRow) {
  const d = new Date(rec.record_date)
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  return [
    date,
    rec.pond_name || '-',
    rec.feed_kg?.toFixed(1) ?? '-',
    rec.avg_weight_g?.toFixed(1) ?? '-',
    rec.mortality_count,
    rec.temperature_c?.toFixed(1) ?? '-',
    rec.oxygen_mg_l?.toFixed(1) ?? '-',
    rec.ammonia_mg_l?.toFixed(2) ?? '-',
    rec.nitrite_mg_l?.toFixed(2) ?? '-',
    rec.ph?.toFixed(1) ?? '-',
    rec.calculated_fca?.toFixed(2) ?? '-',
    rec.calculated_biomass_kg?.toFixed(1) ?? '-',
  ]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function SingleRecordExport({ record }: { record: RecordRow }) {
  async function handlePdf() {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const d = new Date(record.record_date)
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

    doc.setFontSize(18)
    doc.text('Reporte de Produccion', 14, 18)
    doc.setFontSize(11)
    doc.text('AquaData', 14, 25)
    doc.setFontSize(9)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 31)

    const fields = [
      ['Fecha', dateStr],
      ['Estanque', record.pond_name || '-'],
      ['Alimento (kg)', record.feed_kg?.toFixed(1) ?? '-'],
      ['Peso promedio (g)', record.avg_weight_g?.toFixed(1) ?? '-'],
      ['Mortalidad', String(record.mortality_count)],
      ['Temperatura (°C)', record.temperature_c?.toFixed(1) ?? '-'],
      ['Oxigeno (mg/L)', record.oxygen_mg_l?.toFixed(1) ?? '-'],
      ['Amoniaco NH3 (mg/L)', record.ammonia_mg_l?.toFixed(2) ?? '-'],
      ['Nitrito NO2 (mg/L)', record.nitrite_mg_l?.toFixed(2) ?? '-'],
      ['pH', record.ph?.toFixed(1) ?? '-'],
      ['FCA', record.calculated_fca?.toFixed(2) ?? '-'],
      ['Biomasa (kg)', record.calculated_biomass_kg?.toFixed(1) ?? '-'],
    ]

    autoTable(doc, {
      startY: 36,
      head: [['Parametro', 'Valor']],
      body: fields,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 10 },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
      margin: { left: 14, right: 14 },
    })

    doc.save(`reporte_${record.pond_name || 'registro'}_${dateStr.replace(/\//g, '-')}.pdf`)
  }

  async function handleExcel() {
    const XLSX = await import('xlsx')
    const d = new Date(record.record_date)
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

    const data = [
      ['Parametro', 'Valor'],
      ['Fecha', dateStr],
      ['Estanque', record.pond_name || '-'],
      ['Alimento (kg)', record.feed_kg?.toFixed(1) ?? '-'],
      ['Peso promedio (g)', record.avg_weight_g?.toFixed(1) ?? '-'],
      ['Mortalidad', record.mortality_count],
      ['Temperatura (°C)', record.temperature_c?.toFixed(1) ?? '-'],
      ['Oxigeno (mg/L)', record.oxygen_mg_l?.toFixed(1) ?? '-'],
      ['Amoniaco NH3 (mg/L)', record.ammonia_mg_l?.toFixed(2) ?? '-'],
      ['Nitrito NO2 (mg/L)', record.nitrite_mg_l?.toFixed(2) ?? '-'],
      ['pH', record.ph?.toFixed(1) ?? '-'],
      ['FCA', record.calculated_fca?.toFixed(2) ?? '-'],
      ['Biomasa (kg)', record.calculated_biomass_kg?.toFixed(1) ?? '-'],
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    downloadBlob(blob, `reporte_${record.pond_name || 'registro'}_${dateStr.replace(/\//g, '-')}.xlsx`)
  }

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        onClick={handleExcel}
        title="Descargar Excel"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
        <span className="text-muted-foreground">XLS</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        onClick={handlePdf}
        title="Descargar PDF"
      >
        <FileText className="h-3.5 w-3.5 text-red-500" />
        <span className="text-muted-foreground">PDF</span>
      </Button>
    </div>
  )
}

export function RecordsExport({ records }: RecordsExportProps) {
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)

  async function handleExcel() {
    setLoadingExcel(true)
    try {
      const XLSX = await import('xlsx')
      const rows = records.map(formatRow)
      const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])

      // Column widths
      ws['!cols'] = HEADERS.map((h) => ({ wch: Math.max(h.length, 12) }))

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Registros')
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      downloadBlob(blob, `registros_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setLoadingExcel(false)
    }
  }

  async function handlePdf() {
    setLoadingPdf(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      doc.setFontSize(16)
      doc.text('Registros Productivos — AquaData', 14, 15)
      doc.setFontSize(9)
      doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 21)

      const rows = records.map(formatRow)

      autoTable(doc, {
        startY: 26,
        head: [HEADERS],
        body: rows,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 7 },
        alternateRowStyles: { fillColor: [240, 253, 250] },
        margin: { left: 14, right: 14 },
      })

      doc.save(`registros_${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      setLoadingPdf(false)
    }
  }

  if (records.length === 0) return null

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExcel}
        disabled={loadingExcel}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {loadingExcel ? 'Generando...' : 'Excel'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePdf}
        disabled={loadingPdf}
      >
        <FileText className="mr-2 h-4 w-4" />
        {loadingPdf ? 'Generando...' : 'PDF'}
      </Button>
    </div>
  )
}
