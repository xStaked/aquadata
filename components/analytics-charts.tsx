'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface Record {
  id: string
  record_date: string
  feed_kg: number | null
  avg_weight_g: number | null
  mortality_count: number
  temperature_c: number | null
  oxygen_mg_l: number | null
  ammonia_mg_l: number | null
  nitrite_mg_l: number | null
  nitrate_mg_l: number | null
  ph: number | null
  calculated_fca: number | null
  calculated_biomass_kg: number | null
  pond_name: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function WeightChart({ records, targetWeight }: { records: Record[]; targetWeight?: number }) {
  const data = records
    .filter((r) => r.avg_weight_g !== null)
    .sort((a, b) => a.record_date.localeCompare(b.record_date))
    .map((r) => ({
      date: formatDate(r.record_date),
      peso: r.avg_weight_g,
      estanque: r.pond_name,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">Peso Promedio (g)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin datos de peso aun</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="peso"
                name="Peso real"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              {targetWeight && (
                <ReferenceLine
                  y={targetWeight}
                  stroke="hsl(var(--chart-3))"
                  strokeDasharray="5 5"
                  label={{ value: 'Objetivo', position: 'right', fill: 'hsl(var(--chart-3))' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function FeedConsumptionChart({ records }: { records: Record[] }) {
  const data = records
    .filter((r) => r.feed_kg !== null)
    .sort((a, b) => a.record_date.localeCompare(b.record_date))
    .map((r) => ({
      date: formatDate(r.record_date),
      alimento: r.feed_kg,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">Consumo de Alimento (kg)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin datos de alimento aun</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="alimento" name="Alimento (kg)" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function WaterQualityChart({ records }: { records: Record[] }) {
  const data = records
    .filter((r) => r.temperature_c !== null || r.oxygen_mg_l !== null)
    .sort((a, b) => a.record_date.localeCompare(b.record_date))
    .map((r) => ({
      date: formatDate(r.record_date),
      temperatura: r.temperature_c,
      oxigeno: r.oxygen_mg_l,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">Temperatura y Oxigeno</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin datos ambientales aun</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="temp" className="text-xs" />
              <YAxis yAxisId="oxy" orientation="right" className="text-xs" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temperatura"
                name="Temp (C)"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
              />
              <Line
                yAxisId="oxy"
                type="monotone"
                dataKey="oxigeno"
                name="O2 (mg/L)"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
              />
              <ReferenceLine
                yAxisId="oxy"
                y={4}
                stroke="hsl(var(--chart-5))"
                strokeDasharray="5 5"
                label={{ value: 'Min O2', position: 'left', fill: 'hsl(var(--chart-5))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function NitrogenChart({ records }: { records: Record[] }) {
  const data = records
    .filter((r) => r.ammonia_mg_l !== null || r.nitrite_mg_l !== null || r.nitrate_mg_l !== null)
    .sort((a, b) => a.record_date.localeCompare(b.record_date))
    .map((r) => ({
      date: formatDate(r.record_date),
      amonio: r.ammonia_mg_l,
      nitritos: r.nitrite_mg_l,
      nitratos: r.nitrate_mg_l,
      ph: r.ph,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">Compuestos Nitrogenados y pH</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin datos de nitrogeno aun</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="amonio" name="NH3 (mg/L)" stroke="hsl(var(--chart-5))" strokeWidth={2} />
              <Line type="monotone" dataKey="nitritos" name="NO2 (mg/L)" stroke="hsl(var(--chart-3))" strokeWidth={2} />
              <Line type="monotone" dataKey="nitratos" name="NO3 (mg/L)" stroke="hsl(var(--chart-4))" strokeWidth={2} />
              <ReferenceLine y={0.5} stroke="hsl(var(--chart-5))" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function MortalityChart({ records }: { records: Record[] }) {
  const sorted = records
    .sort((a, b) => a.record_date.localeCompare(b.record_date))

  let cumulative = 0
  const data = sorted.map((r) => {
    cumulative += r.mortality_count ?? 0
    return {
      date: formatDate(r.record_date),
      diaria: r.mortality_count,
      acumulada: cumulative,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">Mortalidad</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin datos de mortalidad aun</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="diaria" name="Diaria" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="acumulada" name="Acumulada" stroke="hsl(var(--chart-1))" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function FcaChart({ records }: { records: Record[] }) {
  const data = records
    .filter((r) => r.calculated_fca !== null)
    .sort((a, b) => a.record_date.localeCompare(b.record_date))
    .map((r) => ({
      date: formatDate(r.record_date),
      fca: Number(r.calculated_fca?.toFixed(2)),
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">Factor de Conversion Alimenticia (FCA)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Se necesitan al menos 2 registros de peso para calcular FCA</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="fca"
                name="FCA"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <ReferenceLine
                y={1.8}
                stroke="hsl(var(--chart-4))"
                strokeDasharray="5 5"
                label={{ value: 'Objetivo 1.8', position: 'right', fill: 'hsl(var(--chart-4))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
