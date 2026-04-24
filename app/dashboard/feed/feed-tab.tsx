import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle } from 'lucide-react'
import { MonthlyFeedForm } from '@/components/monthly-feed-form'
import { type Concentrate, type FeedRecord, type BatchForForms, type FeedStock } from '../costs/types'

interface FeedTabProps {
  concentrates: Concentrate[]
  batchesForForms: BatchForForms[]
  feedRecords: FeedRecord[]
  stock: FeedStock[]
  canEdit: boolean
}

export function FeedTab({ concentrates, batchesForForms, feedRecords, stock, canEdit }: FeedTabProps) {
  const hasConsumo = feedRecords.length > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Step guide — visible until there are feed records */}
      {!hasConsumo && (
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cómo funciona la alimentación
          </p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-700">
                  Concentrados registrados ({concentrates.length})
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gestiona tus concentrados desde el módulo <span className="font-medium text-foreground">Inventario</span>.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Circle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Registra cuántos kg usó cada estanque por mes
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Usa el botón &quot;Registrar alimento&quot; en la sección de abajo
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Alimento consumido por mes</CardTitle>
          <CardDescription>
            Registra cuánto concentrado usó en cada lote por mes y marca si el costo corresponde a levante o engorde.
            El costo se carga automáticamente desde la última compra del inventario.
            {concentrates.length === 0 && (
              <span className="block mt-1 text-amber-600 font-medium">
                Puedes crear un concentrado directamente desde el formulario de registro.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyFeedForm
            batches={batchesForForms}
            concentrates={concentrates.filter(c => c.is_active)}
            feedRecords={feedRecords}
            stock={stock}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  )
}
