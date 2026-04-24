'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCOP } from '@/lib/format'

interface ChartData {
  month: string
  kg: number
  cost: number
}

interface ConcentrateConsumptionChartProps {
  data: ChartData[]
}

export function ConcentrateConsumptionChart({ data }: ConcentrateConsumptionChartProps) {
  if (data.length === 0) return null

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis
            yAxisId="kg"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'Kg', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
          />
          <YAxis
            yAxisId="cost"
            orientation="right"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v: number) => `$${(v / 1000000).toFixed(1)}M`}
            label={{ value: 'Costo', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'cost') return [formatCOP(value), 'Costo']
              return [`${value.toLocaleString()} kg`, 'Kg consumidos']
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value: string) => (value === 'cost' ? 'Costo (COP)' : 'Kg consumidos')}
          />
          <Bar yAxisId="kg" dataKey="kg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="cost" dataKey="cost" fill="hsl(var(--amber-500))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
