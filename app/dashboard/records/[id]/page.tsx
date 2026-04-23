import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Fish,
  Package,
  User,
} from 'lucide-react'

import { getProductionRecordDetail } from '@/app/dashboard/records/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatColombianPhoneNumber } from '@/lib/phone'

function ValueItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function formatNumber(value: number | null, decimals = 1) {
  if (value == null) return '-'
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getProductionRecordDetail(id)

  if (!detail) {
    notFound()
  }

  const { record, batch, pond, upload, historical } = detail

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/records"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a registros
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Detalle del Reporte
            </h1>
            {record.report_type === 'weekly' ? (
              <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                <CalendarRange className="h-3.5 w-3.5" />
                Semanal
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Diario
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {record.report_type === 'weekly' && record.week_end_date
              ? `${format(new Date(record.record_date), 'dd/MM/yyyy')} al ${format(new Date(record.week_end_date), 'dd/MM/yyyy')}`
              : format(new Date(record.record_date), 'dd/MM/yyyy')}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/records?page=1#record-${record.id}`}>Ubicar en tabla</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ClipboardList className="h-4 w-4" />
                Datos Capturados
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ValueItem label="Estanque" value={pond.name} />
              <ValueItem label="Nº de peces" value={record.fish_count?.toLocaleString('es-CO') ?? '-'} />
              <ValueItem label="Mortalidad" value={String(record.mortality_count ?? 0)} />
              <ValueItem label="Alimento" value={record.feed_kg != null ? `${formatNumber(record.feed_kg)} kg` : '-'} />
              <ValueItem label="Peso promedio" value={record.avg_weight_kg != null ? `${formatNumber(record.avg_weight_kg * 1000)} g` : '-'} />
              <ValueItem label="Peso de muestreo" value={record.sampling_weight_g != null ? `${formatNumber(record.sampling_weight_g)} g` : '-'} />
              <ValueItem label="Biomasa reportada" value={record.biomass_kg != null ? `${formatNumber(record.biomass_kg)} kg` : '-'} />
              <ValueItem label="FCA calculado" value={record.calculated_fca != null ? formatNumber(record.calculated_fca, 2) : '-'} />
              <ValueItem
                label="FCA efectivo"
                value={
                  record.effective_fca != null
                    ? `${formatNumber(record.effective_fca, 2)}${record.fca_source ? ` · ${record.fca_source === 'default' ? 'configurado' : 'calculado'}` : ''}`
                    : '-'
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Fish className="h-4 w-4" />
                Calidad Del Agua
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ValueItem label="Temperatura" value={record.temperature_c != null ? `${formatNumber(record.temperature_c)} °C` : '-'} />
              <ValueItem label="Oxígeno" value={record.oxygen_mg_l != null ? `${formatNumber(record.oxygen_mg_l)} mg/L` : '-'} />
              <ValueItem label="pH" value={record.ph != null ? formatNumber(record.ph, 1) : '-'} />
              <ValueItem label="Amonio" value={record.ammonia_mg_l != null ? `${formatNumber(record.ammonia_mg_l, 2)} mg/L` : '-'} />
              <ValueItem label="Nitritos" value={record.nitrite_mg_l != null ? `${formatNumber(record.nitrite_mg_l, 2)} mg/L` : '-'} />
              <ValueItem label="Nitratos" value={record.nitrate_mg_l != null ? `${formatNumber(record.nitrate_mg_l, 1)} mg/L` : '-'} />
              <ValueItem label="Fosfato" value={record.phosphate_mg_l != null ? `${formatNumber(record.phosphate_mg_l, 2)} mg/L` : '-'} />
              <ValueItem label="Dureza" value={record.hardness_mg_l != null ? `${formatNumber(record.hardness_mg_l, 1)} mg/L` : '-'} />
              <ValueItem label="Alcalinidad" value={record.alkalinity_mg_l != null ? `${formatNumber(record.alkalinity_mg_l, 1)} mg/L` : '-'} />
              <ValueItem label="Turbidez" value={record.turbidity_ntu != null ? `${formatNumber(record.turbidity_ntu, 1)} NTU` : '-'} />
              <ValueItem label="Ganancia diaria" value={record.daily_gain_g != null ? `${formatNumber(record.daily_gain_g, 2)} g/día` : '-'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Package className="h-4 w-4" />
                Valores Calculados Del Reporte
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ValueItem label="Días de cultivo" value={`${historical.days_culture} días`} />
              <ValueItem label="Días en lago" value={`${historical.days_pond} días`} />
              <ValueItem label="Animal actual" value={historical.animal_actual.toLocaleString('es-CO')} />
              <ValueItem label="Mortalidad acumulada" value={historical.accumulated_mortality.toLocaleString('es-CO')} />
              <ValueItem
                label="Porcentaje de sobrevivencia"
                value={historical.survival_pct != null ? `${formatNumber(historical.survival_pct, 1)}%` : '-'}
              />
              <ValueItem label="Consumo acumulado" value={`${formatNumber(historical.accumulated_feed_kg)} kg`} />
              <ValueItem label="Consumo quincenal" value={`${formatNumber(historical.fortnightly_feed_kg)} kg`} />
              <ValueItem label="Origen de semilla" value={batch.seed_source ?? '-'} />
              <ValueItem label="Valores por periodo" value={record.report_type === 'weekly' ? 'Semanales' : 'Diarios'} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Contexto Del Lote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ValueItem label="Lote" value={batch.id} />
              <ValueItem label="Fecha de inicio" value={format(new Date(batch.start_date), 'dd/MM/yyyy')} />
              <ValueItem
                label="Ingreso al lago"
                value={format(new Date(batch.pond_entry_date ?? batch.start_date), 'dd/MM/yyyy')}
              />
              <ValueItem label="Población sembrada" value={batch.initial_population.toLocaleString('es-CO')} />
              <ValueItem
                label="Población actual del lote"
                value={batch.current_population?.toLocaleString('es-CO') ?? '-'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="h-4 w-4" />
                Trazabilidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ValueItem
                label="Subido por"
                value={
                  upload?.sender_name
                    ?? (upload?.source === 'whatsapp' ? 'Contacto WhatsApp' : 'Panel web')
                }
              />
              <ValueItem
                label="Canal"
                value={upload?.source === 'whatsapp' ? 'WhatsApp' : 'Panel web'}
              />
              <ValueItem
                label="Teléfono"
                value={upload?.sender_phone ? formatColombianPhoneNumber(upload.sender_phone) : '-'}
              />
              <ValueItem
                label="Creado"
                value={format(new Date(record.created_at), 'dd/MM/yyyy HH:mm')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                {record.notes?.trim() ? record.notes : 'Sin observaciones registradas.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
