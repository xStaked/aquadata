'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Plus, X } from 'lucide-react'
import {
  createBioremediationProduct,
  updateBioremediationProduct,
  uploadProductImage,
} from '@/app/admin/products/actions'
import { bioremediationProductInputSchema, productCategoryValues } from '@/lib/bioremediation-products/schema'
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

type ProductFormState = {
  name: string
  category: (typeof productCategoryValues)[number]
  description: string
  presentation: string
  dose_unit: string
  application_method: string
  species_scope: string
  sort_order: string
  image_url: string
}

type ProductFormDialogProps = {
  mode?: 'create' | 'edit'
  defaultValues?: Partial<ProductFormState & { id: string }>
  trigger?: ReactNode
}

const defaultFormState: ProductFormState = {
  name: '',
  category: 'agua',
  description: '',
  presentation: '',
  dose_unit: 'L/ha',
  application_method: '',
  species_scope: '',
  sort_order: '100',
  image_url: '',
}

function buildFormState(defaultValues?: Partial<ProductFormState & { id: string }>): ProductFormState {
  if (!defaultValues) return { ...defaultFormState }
  return {
    name: defaultValues.name ?? '',
    category: defaultValues.category ?? 'agua',
    description: defaultValues.description ?? '',
    presentation: defaultValues.presentation ?? '',
    dose_unit: defaultValues.dose_unit ?? 'L/ha',
    application_method: defaultValues.application_method ?? '',
    species_scope: Array.isArray(defaultValues.species_scope)
      ? (defaultValues.species_scope as string[]).join(', ')
      : (defaultValues.species_scope ?? ''),
    sort_order: defaultValues.sort_order != null ? String(defaultValues.sort_order) : '100',
    image_url: defaultValues.image_url ?? '',
  }
}

function getFirstValidationError(fieldErrors: Record<string, string[] | undefined>) {
  for (const errors of Object.values(fieldErrors)) {
    if (errors?.[0]) {
      return errors[0]
    }
  }

  return 'Revisa los datos del producto antes de guardar.'
}

export function ProductFormDialog({ mode = 'create', defaultValues, trigger }: ProductFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormState>(() => buildFormState(defaultValues))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isExistingImage, setIsExistingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setForm(buildFormState(defaultValues))
      setError(null)
      setSuccess(null)
      setIsSaving(false)
      setImageFile(null)
      if (imagePreview && !isExistingImage) {
        URL.revokeObjectURL(imagePreview)
      }
      const existingUrl = defaultValues?.image_url ?? null
      setImagePreview(existingUrl || null)
      setIsExistingImage(!!existingUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Initialize image preview from defaultValues when dialog first opens
  useEffect(() => {
    if (open) {
      setForm(buildFormState(defaultValues))
      const existingUrl = defaultValues?.image_url ?? null
      if (existingUrl && !imageFile) {
        setImagePreview(existingUrl)
        setIsExistingImage(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const setField = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Formato de imagen no permitido. Usa JPG, PNG o WebP.')
      return
    }

    const maxSizeBytes = 2 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setError('La imagen supera el limite de 2 MB.')
      return
    }

    setError(null)
    setImageFile(file)
    if (imagePreview && !isExistingImage) {
      URL.revokeObjectURL(imagePreview)
    }
    setIsExistingImage(false)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    if (imagePreview && !isExistingImage) {
      URL.revokeObjectURL(imagePreview)
    }
    setIsExistingImage(false)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    let resolvedImageUrl: string | undefined = undefined

    if (imageFile) {
      try {
        const formData = new FormData()
        formData.append('file', imageFile)
        resolvedImageUrl = await uploadProductImage(formData)
      } catch (uploadError) {
        setIsSaving(false)
        setError(
          uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.',
        )
        return
      }
    } else if (isExistingImage && imagePreview) {
      // Keep the existing image URL unchanged
      resolvedImageUrl = imagePreview
    }

    const parsed = bioremediationProductInputSchema.safeParse({
      ...form,
      presentation: form.presentation.trim() || undefined,
      application_method: form.application_method.trim() || undefined,
      species_scope: form.species_scope
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      sort_order: form.sort_order,
      image_url: resolvedImageUrl,
    })

    if (!parsed.success) {
      setIsSaving(false)
      setError(getFirstValidationError(parsed.error.flatten().fieldErrors))
      return
    }

    try {
      if (mode === 'edit') {
        if (!defaultValues?.id) {
          throw new Error('ID del producto no disponible.')
        }
        await updateBioremediationProduct({ ...parsed.data, id: defaultValues.id })
        setSuccess('Producto actualizado correctamente.')
      } else {
        await createBioremediationProduct(parsed.data)
        setSuccess('Producto guardado correctamente.')
      }
      setOpen(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el producto.')
    } finally {
      setIsSaving(false)
    }
  }

  const title =
    mode === 'edit' ? 'Editar producto de bioremediacion' : 'Registrar producto de bioremediacion'
  const saveLabel = mode === 'edit' ? 'Guardar cambios' : 'Guardar producto'

  const triggerElement = trigger ? (
    <DialogTrigger asChild>{trigger}</DialogTrigger>
  ) : (
    <DialogTrigger asChild>
      <Button>
        <Plus className="h-4 w-4" />
        Nuevo producto
      </Button>
    </DialogTrigger>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerElement}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Modifica los campos del producto y guarda los cambios.'
              : 'Crea un producto reusable para filtros y captura de casos dentro del panel admin.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          {/* Image upload section */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Imagen del producto</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            {imagePreview ? (
              <div className="flex items-center gap-3">
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  {!isExistingImage && (
                    <p className="text-sm text-muted-foreground">{imageFile?.name}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4" />
                      Cambiar imagen
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                      Eliminar imagen
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                Seleccionar imagen
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Formatos permitidos: JPG, PNG, WebP. Tamano maximo: 2 MB. Opcional.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-name">Nombre</Label>
            <Input
              id="product-name"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="Ej. AquaVet BioClear"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-category">Categoria</Label>
            <select
              id="product-category"
              value={form.category}
              onChange={(event) => setField('category', event.target.value as ProductFormState['category'])}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="agua">Agua</option>
              <option value="suelo">Suelo</option>
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="product-description">Descripcion</Label>
            <Textarea
              id="product-description"
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              placeholder="Describe el objetivo tecnico y el uso esperado del producto."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-presentation">Presentacion</Label>
            <Input
              id="product-presentation"
              value={form.presentation}
              onChange={(event) => setField('presentation', event.target.value)}
              placeholder="Ej. Garrafa x 20 L"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-dose-unit">Unidad de dosis</Label>
            <Input
              id="product-dose-unit"
              value={form.dose_unit}
              onChange={(event) => setField('dose_unit', event.target.value)}
              placeholder="L/ha"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-application-method">Metodo de aplicacion</Label>
            <Input
              id="product-application-method"
              value={form.application_method}
              onChange={(event) => setField('application_method', event.target.value)}
              placeholder="Aplicacion directa en espejo de agua"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-sort-order">Orden</Label>
            <Input
              id="product-sort-order"
              type="number"
              min="0"
              step="1"
              value={form.sort_order}
              onChange={(event) => setField('sort_order', event.target.value)}
              placeholder="100"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="product-species-scope">Especies objetivo</Label>
            <Input
              id="product-species-scope"
              value={form.species_scope}
              onChange={(event) => setField('species_scope', event.target.value)}
              placeholder="Tilapia roja, Cachama, Camaron"
            />
            <p className="text-xs text-muted-foreground">
              Separa varias especies con comas. Es opcional.
            </p>
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
