import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BioremediationCaseStatus } from '@/lib/case-library/types'

const statusLabelMap: Record<BioremediationCaseStatus, string> = {
  draft: 'Borrador',
  approved: 'Aprobado',
  retired: 'Retirado',
}

const statusClassMap: Record<BioremediationCaseStatus, string> = {
  draft: 'border-slate-200 bg-slate-100 text-slate-700',
  approved: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  retired: 'border-amber-200 bg-amber-100 text-amber-700',
}

export function CaseStatusBadge({ status }: { status: BioremediationCaseStatus }) {
  return (
    <Badge variant="outline" className={cn('font-semibold', statusClassMap[status])}>
      {statusLabelMap[status]}
    </Badge>
  )
}
