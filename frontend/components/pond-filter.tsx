'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function PondFilter({ ponds }: { ponds: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('pond') ?? ''

  return (
    <select
      id="pond-filter"
      value={current}
      onChange={(e) => {
        const val = e.target.value
        const url = val ? `/dashboard/analytics?pond=${val}` : '/dashboard/analytics'
        router.push(url)
      }}
      className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring sm:w-56"
    >
      <option value="">Todos los estanques</option>
      {ponds.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
