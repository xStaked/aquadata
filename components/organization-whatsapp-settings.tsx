'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Plus, Trash2, Users } from 'lucide-react'

import { updateOrganizationAuthorizedWhatsappPhones } from '@/app/dashboard/settings/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatColombianPhoneNumber, normalizeColombianPhoneNumber } from '@/lib/phone'

export function OrganizationWhatsappSettings({
  farmName,
  primaryPhone,
  initialAuthorizedPhones,
}: {
  farmName: string
  primaryPhone: string | null
  initialAuthorizedPhones: string[]
}) {
  const router = useRouter()
  const [phones, setPhones] = useState<string[]>(initialAuthorizedPhones)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleAddPhone = () => {
    const normalized = normalizeColombianPhoneNumber(draft)

    if (!normalized) {
      setError('Ingresa un número válido de Colombia. Ejemplo: 3001234567')
      return
    }

    if (normalized === primaryPhone) {
      setError('Ese número ya es el principal de la cuenta')
      return
    }

    if (phones.includes(normalized)) {
      setError('Ese número ya está autorizado')
      return
    }

    setPhones((current) => [...current, normalized])
    setDraft('')
    setError('')
    setSuccess('')
  }

  const handleRemovePhone = (phone: string) => {
    setPhones((current) => current.filter((item) => item !== phone))
    setError('')
    setSuccess('')
  }

  const handleSave = () => {
    setError('')
    setSuccess('')

    startTransition(async () => {
      try {
        const updated = await updateOrganizationAuthorizedWhatsappPhones(phones)
        setPhones(updated.authorizedWhatsappPhones)
        setSuccess('Números autorizados guardados')
        router.refresh()
      } catch (saveError) {
        setSuccess('')
        setError(
          saveError instanceof Error
            ? saveError.message
            : 'No se pudieron guardar los números autorizados'
        )
      }
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Acceso al bot de WhatsApp</CardTitle>
        <CardDescription>
          Autoriza números adicionales del equipo para que puedan enviar capturas al bot de {farmName}
          sin depender del número principal del jefe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Número principal de la cuenta</p>
              <p>
                {primaryPhone ? formatColombianPhoneNumber(primaryPhone) : 'No configurado'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="authorized-whatsapp-phone">Agregar número del equipo</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="authorized-whatsapp-phone"
              type="tel"
              placeholder="3001234567 o +573001234567"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button type="button" variant="secondary" onClick={handleAddPhone} className="sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Agregar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Se normalizan a formato Colombia `+57`. Guarda al final para aplicar cambios.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-foreground" />
            <p className="text-sm font-medium text-foreground">Números autorizados del equipo</p>
          </div>

          {phones.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
              No hay números adicionales autorizados todavía.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {phones.map((phone) => (
                <Badge
                  key={phone}
                  variant="secondary"
                  className="flex items-center gap-2 rounded-full px-3 py-1"
                >
                  <span>{formatColombianPhoneNumber(phone)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(phone)}
                    className="rounded-full p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
                    aria-label={`Eliminar ${phone}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-md border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar accesos'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
