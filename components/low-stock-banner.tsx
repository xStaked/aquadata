import { AlertTriangle, Package } from 'lucide-react'
import { stockPercentage } from '@/lib/inventory/constants'

interface LowStockItem {
  concentrate_name: string
  available_kg: number
  total_kg_in: number
  concentrate_id: string
}

interface LowStockBannerProps {
  items: LowStockItem[]
}

export function LowStockBanner({ items }: LowStockBannerProps) {
  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">
            {items.length === 1
              ? '1 concentrado con stock crítico'
              : `${items.length} concentrados con stock crítico`}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {items.map((item) => (
              <li
                key={item.concentrate_id}
                className="flex items-center gap-2 text-sm text-amber-800"
              >
                <Package className="h-3 w-3 shrink-0" />
                <span className="font-medium">{item.concentrate_name}</span>
                <span>— {item.available_kg.toLocaleString()} kg ({stockPercentage(item.available_kg, item.total_kg_in)})</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-700">
            Recomendación: registre una nueva compra antes de que el stock se agote.
          </p>
        </div>
      </div>
    </div>
  )
}
