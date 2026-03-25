'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { transitionBioremediationCaseStatus } from '@/app/admin/bioremediation/cases/actions'
import { CaseEditDialog } from '@/components/admin/case-library/case-form-dialog'
import { CaseStatusBadge } from '@/components/admin/case-library/case-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { BioremediationCaseFormValues, BioremediationCaseRow, BioremediationCaseStatus } from '@/lib/case-library/types'

export type CaseTableRow = BioremediationCaseRow & {
  author_name: string
  reviewer_name: string | null
}

const statusOptions: Array<{ value: BioremediationCaseStatus; label: string }> = [
  { value: 'draft', label: 'Borrador' },
  { value: 'approved', label: 'Aprobar' },
  { value: 'retired', label: 'Retirar' },
]

function formatReviewedAt(value: string | null) {
  if (!value) {
    return 'Sin revision'
  }

  return new Date(value).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function buildDefaultValues(row: CaseTableRow): Partial<BioremediationCaseFormValues> {
  return {
    id: row.id,
    issue: row.issue,
    zone: row.zone,
    species: row.species,
    product_name: row.product_name,
    treatment_approach: row.treatment_approach,
    dose: Number(row.dose),
    dose_unit: row.dose_unit,
    outcome: row.outcome,
    status: row.status,
    notes: row.notes ?? undefined,
  }
}

export function CaseTable({ rows }: { rows: CaseTableRow[] }) {
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTransition = async (id: string, status: BioremediationCaseStatus) => {
    setPendingAction(`${id}:${status}`)
    setError(null)

    try {
      await transitionBioremediationCaseStatus({ id, status })
    } catch (transitionError) {
      setError(
        transitionError instanceof Error
          ? transitionError.message
          : 'No se pudo actualizar el estado del caso',
      )
    } finally {
      setPendingAction(null)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No hay casos que coincidan con los filtros.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajusta el estado, especie o producto para ver otros registros gobernados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium text-muted-foreground">Caso</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Zona</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Especie</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Producto</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Autor</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Ultima revision</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Grounding</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/70 align-top last:border-b-0">
                <td className="px-4 py-4">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{row.issue}</p>
                    <p className="text-xs text-muted-foreground">{row.treatment_approach}</p>
                  </div>
                </td>
                <td className="px-4 py-4 text-muted-foreground">{row.zone}</td>
                <td className="px-4 py-4 text-muted-foreground">{row.species}</td>
                <td className="px-4 py-4 text-muted-foreground">{row.product_name}</td>
                <td className="px-4 py-4">
                  <CaseStatusBadge status={row.status} />
                </td>
                <td className="px-4 py-4 text-muted-foreground">{row.author_name}</td>
                <td className="px-4 py-4">
                  <div className="space-y-1 text-muted-foreground">
                    <p>{formatReviewedAt(row.last_reviewed_at)}</p>
                    <p className="text-xs">
                      {row.reviewer_name ? `Por ${row.reviewer_name}` : 'Sin revisor registrado'}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <Badge
                    variant={row.status_usable_for_grounding ? 'default' : 'secondary'}
                    className="whitespace-nowrap"
                  >
                    {row.status_usable_for_grounding
                      ? 'Elegible para assistant grounding'
                      : 'No elegible'}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-3">
                    <CaseEditDialog defaultValues={buildDefaultValues(row)} />
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((option) => {
                        const actionKey = `${row.id}:${option.value}`
                        const isPending = pendingAction === actionKey
                        const isCurrent = row.status === option.value

                        return (
                          <Button
                            key={option.value}
                            type="button"
                            variant={isCurrent ? 'secondary' : 'outline'}
                            size="sm"
                            disabled={isCurrent || pendingAction !== null}
                            onClick={() => handleTransition(row.id, option.value)}
                          >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {option.label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
