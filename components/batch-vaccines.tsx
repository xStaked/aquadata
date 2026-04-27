'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import {
  Plus,
  Pencil,
  Trash2,
  Syringe,
  CheckCircle2,
  XCircle,
  Settings,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  createBatchVaccine,
  updateBatchVaccine,
  deleteBatchVaccine,
  createVaccineType,
  updateVaccineType,
  deleteVaccineType,
} from '@/app/dashboard/ponds/actions'

interface VaccineType {
  id: string
  name: string
  description: string | null
}

interface BatchVaccine {
  id: string
  batch_id: string
  vaccine_type_id: string | null
  vaccine_type_name: string | null
  is_vaccinated: boolean
  application_date: string | null
  notes: string | null
  created_at: string
}

interface BatchVaccinesProps {
  batchId: string
  batchName?: string
  vaccines: BatchVaccine[]
  vaccineTypes: VaccineType[]
  canEdit: boolean
}

const emptyVaccineForm = {
  vaccine_type_id: '',
  vaccine_type_name: '',
  is_vaccinated: false,
  application_date: '',
  notes: '',
}

type VaccineForm = typeof emptyVaccineForm

interface VaccineFormFieldsProps {
  form: VaccineForm
  setForm: React.Dispatch<React.SetStateAction<VaccineForm>>
  err: string
  vaccineTypes: VaccineType[]
}

function VaccineFormFields({
  form: f,
  setForm: sf,
  err,
  vaccineTypes,
}: VaccineFormFieldsProps) {
  const getTypeName = (typeId: string) => {
    const type = vaccineTypes.find((t) => t.id === typeId)
    return type?.name ?? ''
  }

  const handleTypeChange = (typeId: string) => {
    const name = getTypeName(typeId)
    sf((prev) => ({
      ...prev,
      vaccine_type_id: typeId,
      vaccine_type_name: name,
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vaccine-type">Tipo de vacuna *</Label>
        <Select value={f.vaccine_type_id} onValueChange={handleTypeChange}>
          <SelectTrigger id="vaccine-type">
            <SelectValue placeholder="Seleccionar tipo de vacuna" />
          </SelectTrigger>
          <SelectContent>
            {vaccineTypes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
            {vaccineTypes.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No hay tipos de vacuna. Agrega uno primero.
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
        <Checkbox
          id="is-vaccinated"
          checked={f.is_vaccinated}
          onCheckedChange={(checked) =>
            sf((prev) => ({ ...prev, is_vaccinated: checked === true }))
          }
        />
        <Label htmlFor="is-vaccinated" className="cursor-pointer font-normal">
          ¿Vacunado?
        </Label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="application-date">Fecha de aplicación</Label>
        <DatePicker
          id="application-date"
          value={f.application_date}
          onChange={(value) =>
            sf((prev) => ({ ...prev, application_date: value }))
          }
          buttonClassName="w-full justify-between"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vaccine-notes">Observaciones</Label>
        <Input
          id="vaccine-notes"
          value={f.notes}
          onChange={(e) => sf((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Notas adicionales..."
        />
      </div>

      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  )
}

export function BatchVaccines({
  batchId,
  batchName,
  vaccines,
  vaccineTypes,
  canEdit,
}: BatchVaccinesProps) {
  const [isPending, startTransition] = useTransition()
  const [openAdd, setOpenAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<BatchVaccine | null>(null)
  const [form, setForm] = useState<VaccineForm>(emptyVaccineForm)
  const [error, setError] = useState('')

  // Vaccine type management
  const [openTypes, setOpenTypes] = useState(false)
  const [typeForm, setTypeForm] = useState({ name: '', description: '' })
  const [editTypeTarget, setEditTypeTarget] = useState<VaccineType | null>(null)
  const [typeError, setTypeError] = useState('')

  const handleOpenAdd = () => {
    setForm(emptyVaccineForm)
    setError('')
    setOpenAdd(true)
  }

  const handleOpenEdit = (v: BatchVaccine) => {
    setForm({
      vaccine_type_id: v.vaccine_type_id ?? '',
      vaccine_type_name: v.vaccine_type_name ?? '',
      is_vaccinated: v.is_vaccinated,
      application_date: v.application_date ?? '',
      notes: v.notes ?? '',
    })
    setError('')
    setEditTarget(v)
  }

  const validateForm = (): boolean => {
    if (!form.vaccine_type_id && !form.vaccine_type_name.trim()) {
      setError('Selecciona o ingresa un tipo de vacuna')
      return false
    }
    if (form.is_vaccinated && !form.application_date) {
      setError('La fecha de aplicación es requerida cuando está vacunado')
      return false
    }
    return true
  }

  const handleAdd = () => {
    if (!validateForm()) return
    setError('')
    startTransition(async () => {
      try {
        await createBatchVaccine({
          batch_id: batchId,
          vaccine_type_id: form.vaccine_type_id || null,
          vaccine_type_name: form.vaccine_type_name,
          is_vaccinated: form.is_vaccinated,
          application_date: form.application_date || null,
          notes: form.notes || null,
        })
        setOpenAdd(false)
        setForm(emptyVaccineForm)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const handleEdit = () => {
    if (!editTarget) return
    if (!validateForm()) return
    setError('')
    startTransition(async () => {
      try {
        await updateBatchVaccine(editTarget.id, {
          vaccine_type_id: form.vaccine_type_id || null,
          vaccine_type_name: form.vaccine_type_name,
          is_vaccinated: form.is_vaccinated,
          application_date: form.application_date || null,
          notes: form.notes || null,
        })
        setEditTarget(null)
        setForm(emptyVaccineForm)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteBatchVaccine(id)
      } catch (e: any) {
        console.error(e)
      }
    })
  }

  // Vaccine type handlers
  const handleCreateType = () => {
    if (!typeForm.name.trim()) {
      setTypeError('El nombre es requerido')
      return
    }
    setTypeError('')
    startTransition(async () => {
      try {
        await createVaccineType({
          name: typeForm.name.trim(),
          description: typeForm.description.trim() || undefined,
        })
        setTypeForm({ name: '', description: '' })
      } catch (e: any) {
        setTypeError(e.message)
      }
    })
  }

  const handleUpdateType = () => {
    if (!editTypeTarget || !typeForm.name.trim()) {
      setTypeError('El nombre es requerido')
      return
    }
    setTypeError('')
    startTransition(async () => {
      try {
        await updateVaccineType(editTypeTarget.id, {
          name: typeForm.name.trim(),
          description: typeForm.description.trim() || undefined,
        })
        setEditTypeTarget(null)
        setTypeForm({ name: '', description: '' })
      } catch (e: any) {
        setTypeError(e.message)
      }
    })
  }

  const handleDeleteType = (id: string) => {
    startTransition(async () => {
      try {
        await deleteVaccineType(id)
      } catch (e: any) {
        console.error(e)
      }
    })
  }

  const openEditType = (t: VaccineType) => {
    setTypeForm({ name: t.name, description: t.description ?? '' })
    setEditTypeTarget(t)
  }

  const sortedVaccines = [...vaccines].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Syringe className="h-4 w-4" />
          <span>
            {vaccines.length} vacuna{vaccines.length !== 1 ? 's' : ''} registrada
            {vaccines.length !== 1 ? 's' : ''}
          </span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Dialog open={openTypes} onOpenChange={setOpenTypes}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  Tipos
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Gestionar tipos de vacuna</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={typeForm.name}
                      onChange={(e) =>
                        setTypeForm((t) => ({ ...t, name: e.target.value }))
                      }
                      placeholder="Ej: Vacuna contra Aeromonas"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Descripción</Label>
                    <Input
                      value={typeForm.description}
                      onChange={(e) =>
                        setTypeForm((t) => ({
                          ...t,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Opcional"
                    />
                  </div>
                  {typeError && (
                    <p className="text-xs text-destructive">{typeError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    {editTypeTarget ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditTypeTarget(null)
                            setTypeForm({ name: '', description: '' })
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={handleUpdateType} disabled={isPending}>
                          {isPending ? 'Guardando…' : 'Actualizar'}
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleCreateType} disabled={isPending}>
                        {isPending ? 'Guardando…' : 'Agregar tipo'}
                      </Button>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tipos existentes
                    </p>
                    {vaccineTypes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay tipos de vacuna registrados.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {vaccineTypes.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium">{t.name}</p>
                              {t.description && (
                                <p className="text-xs text-muted-foreground">
                                  {t.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditType(t)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive/70 hover:text-destructive"
                                onClick={() => handleDeleteType(t.id)}
                                disabled={isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleOpenAdd} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Agregar vacuna
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    Agregar vacuna
                    {batchName ? ` · ${batchName}` : ''}
                  </DialogTitle>
                </DialogHeader>
                <VaccineFormFields
                  form={form}
                  setForm={setForm}
                  err={error}
                  vaccineTypes={vaccineTypes}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpenAdd(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAdd} disabled={isPending}>
                    {isPending ? 'Guardando…' : 'Guardar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {sortedVaccines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay registros de vacunación para este lote.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-2 px-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha aplicación</TableHead>
                <TableHead>Observaciones</TableHead>
                {canEdit && (
                  <TableHead className="text-right w-[100px]">Acciones</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVaccines.map((v) => (
                <TableRow key={v.id} className="group transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {v.vaccine_type_name ?? '—'}
                  </TableCell>
                  <TableCell>
                    {v.is_vaccinated ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 text-emerald-600 bg-emerald-50/50 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Vacunado
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 text-amber-600 bg-amber-50/50 gap-1"
                      >
                        <XCircle className="h-3 w-3" />
                        Pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {v.application_date
                      ? format(new Date(v.application_date), 'dd/MM/yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {v.notes ?? '—'}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Dialog
                          open={editTarget?.id === v.id}
                          onOpenChange={(open) =>
                            !open && setEditTarget(null)
                          }
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer opacity-60 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleOpenEdit(v)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Editar vacuna</DialogTitle>
                            </DialogHeader>
                            <VaccineFormFields
                              form={form}
                              setForm={setForm}
                              err={error}
                              vaccineTypes={vaccineTypes}
                            />
                            <div className="flex justify-end gap-2 pt-2">
                              <Button
                                variant="outline"
                                onClick={() => setEditTarget(null)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleEdit}
                                disabled={isPending}
                              >
                                {isPending ? 'Guardando…' : 'Actualizar'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer text-destructive/70 hover:text-destructive opacity-60 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(v.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
