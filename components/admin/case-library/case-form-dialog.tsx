'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { upsertBioremediationCase } from '@/app/admin/bioremediation/cases/actions'
import { caseInputSchema, caseStatusValues } from '@/lib/case-library/schema'
import type { BioremediationCaseFormValues } from '@/lib/case-library/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type CaseFormDialogProps = {
  defaultValues?: Partial<BioremediationCaseFormValues>
  mode?: 'create' | 'edit'
  trigger?: ReactNode
}

type CaseFormState = {
  id?: string
  issue: string
  zone: string
  species: string
  product_name: string
  treatment_approach: string
  dose: string
  dose_unit: string
  outcome: string
  status: BioremediationCaseFormValues['status']
  notes: string
}

function buildFormState(defaultValues?: Partial<BioremediationCaseFormValues>): CaseFormState {
  return {
    id: defaultValues?.id,
    issue: defaultValues?.issue ?? '',
    zone: defaultValues?.zone ?? '',
    species: defaultValues?.species ?? '',
    product_name: defaultValues?.product_name ?? '',
    treatment_approach: defaultValues?.treatment_approach ?? '',
    dose: defaultValues?.dose != null ? String(defaultValues.dose) : '',
    dose_unit: defaultValues?.dose_unit ?? 'L',
    outcome: defaultValues?.outcome ?? '',
    status: defaultValues?.status ?? 'draft',
    notes: defaultValues?.notes ?? '',
  }
}

function getFirstValidationError(fieldErrors: Record<string, string[] | undefined>) {
  for (const errors of Object.values(fieldErrors)) {
    if (errors?.[0]) {
      return errors[0]
    }
  }

  return 'Revisa los datos del caso antes de guardar.'
}

export function CaseFormDialog({
  defaultValues,
  mode = 'create',
  trigger,
}: CaseFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CaseFormState>(() => buildFormState(defaultValues))

  useEffect(() => {
    if (!open) {
      setForm(buildFormState(defaultValues))
      setError(null)
      setIsSaving(false)
    }
  }, [defaultValues, open])

  const setField = <K extends keyof CaseFormState>(field: K, value: CaseFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    const parsed = caseInputSchema.safeParse({
      ...form,
      notes: form.notes.trim() || undefined,
    })

    if (!parsed.success) {
      setIsSaving(false)
      setError(getFirstValidationError(parsed.error.flatten().fieldErrors))
      return
    }

    try {
      await upsertBioremediationCase(parsed.data)
      setOpen(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el caso')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo caso
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar caso' : 'Crear caso de bioremediacion'}</DialogTitle>
          <DialogDescription>
            Registra el caso gobernado que servira como referencia para el equipo Aquavet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`case-issue-${mode}`}>Problema</Label>
            <Input
              id={`case-issue-${mode}`}
              value={form.issue}
              onChange={(event) => setField('issue', event.target.value)}
              placeholder="Ej. amonia alta despues de lluvia"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`case-zone-${mode}`}>Zona</Label>
            <Input
              id={`case-zone-${mode}`}
              value={form.zone}
              onChange={(event) => setField('zone', event.target.value)}
              placeholder="Ej. Caribe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`case-species-${mode}`}>Especie</Label>
            <Input
              id={`case-species-${mode}`}
              value={form.species}
              onChange={(event) => setField('species', event.target.value)}
              placeholder="Tilapia roja"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`case-product-${mode}`}>Producto</Label>
            <Input
              id={`case-product-${mode}`}
              value={form.product_name}
              onChange={(event) => setField('product_name', event.target.value)}
              placeholder="AquaVet BioClear"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`case-treatment-${mode}`}>Enfoque de tratamiento</Label>
            <Textarea
              id={`case-treatment-${mode}`}
              value={form.treatment_approach}
              onChange={(event) => setField('treatment_approach', event.target.value)}
              placeholder="Describe el protocolo aplicado y la logica tecnica."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`case-dose-${mode}`}>Dosis</Label>
            <Input
              id={`case-dose-${mode}`}
              type="number"
              min="0"
              step="0.01"
              value={form.dose}
              onChange={(event) => setField('dose', event.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`case-dose-unit-${mode}`}>Unidad</Label>
            <Input
              id={`case-dose-unit-${mode}`}
              value={form.dose_unit}
              onChange={(event) => setField('dose_unit', event.target.value)}
              placeholder="L"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`case-outcome-${mode}`}>Resultado observado</Label>
            <Textarea
              id={`case-outcome-${mode}`}
              value={form.outcome}
              onChange={(event) => setField('outcome', event.target.value)}
              placeholder="Resume el resultado y el tiempo de respuesta observado."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`case-status-${mode}`}>Estado</Label>
            <select
              id={`case-status-${mode}`}
              value={form.status}
              onChange={(event) =>
                setField('status', event.target.value as CaseFormState['status'])
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {caseStatusValues.map((status) => (
                <option key={status} value={status}>
                  {status === 'draft'
                    ? 'Borrador'
                    : status === 'approved'
                      ? 'Aprobado'
                      : 'Retirado'}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`case-notes-${mode}`}>Notas internas</Label>
            <Textarea
              id={`case-notes-${mode}`}
              value={form.notes}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder="Observaciones internas opcionales para el equipo."
              className="min-h-10"
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'edit' ? 'Guardar cambios' : 'Guardar caso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CaseEditDialog({
  defaultValues,
}: {
  defaultValues: Partial<BioremediationCaseFormValues>
}) {
  return (
    <CaseFormDialog
      mode="edit"
      defaultValues={defaultValues}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary">
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      }
    />
  )
}
