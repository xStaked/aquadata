import { Eye } from 'lucide-react'

export function ReadOnlyBanner({
  title = 'Modo solo lectura',
  description = 'Tu usuario puede consultar la información de la finca, pero no crear, editar ni eliminar datos.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
          <Eye className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm text-amber-800">{description}</p>
        </div>
      </div>
    </div>
  )
}
