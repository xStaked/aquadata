'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Plus, Trash2, Users } from 'lucide-react'

import type { AuthorizedWhatsappContact } from '@/db/types'
import { updateOrganizationAuthorizedWhatsappContacts } from '@/app/dashboard/settings/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatColombianPhoneNumber, normalizeColombianPhoneNumber } from '@/lib/phone'
import { normalizeWhatsappContactName } from '@/lib/whatsapp-contacts'

export function OrganizationWhatsappSettings({
  farmName,
  primaryPhone,
  initialAuthorizedContacts,
}: {
  farmName: string
  primaryPhone: string | null
  initialAuthorizedContacts: AuthorizedWhatsappContact[]
}) {
  const router = useRouter()
  const [contacts, setContacts] = useState<AuthorizedWhatsappContact[]>(initialAuthorizedContacts)
  const [draftName, setDraftName] = useState('')
  const [draftPhone, setDraftPhone] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleAddContact = () => {
    const normalizedPhone = normalizeColombianPhoneNumber(draftPhone)
    const normalizedName = normalizeWhatsappContactName(draftName)

    if (!normalizedName) {
      setError('Ingresa el nombre de la persona responsable')
      return
    }

    if (!normalizedPhone) {
      setError('Ingresa un número válido de Colombia. Ejemplo: 3001234567')
      return
    }

    if (normalizedPhone === primaryPhone) {
      setError('Ese número ya es el principal de la cuenta')
      return
    }

    if (contacts.some((contact) => contact.phone === normalizedPhone)) {
      setError('Ese número ya está autorizado')
      return
    }

    setContacts((current) => [...current, { name: normalizedName, phone: normalizedPhone }])
    setDraftName('')
    setDraftPhone('')
    setError('')
    setSuccess('')
  }

  const handleRemoveContact = (phone: string) => {
    setContacts((current) => current.filter((item) => item.phone !== phone))
    setError('')
    setSuccess('')
  }

  const handleSave = () => {
    setError('')
    setSuccess('')

    startTransition(async () => {
      try {
        const updated = await updateOrganizationAuthorizedWhatsappContacts(contacts)
        setContacts(updated.authorizedWhatsappContacts)
        setSuccess('Contactos autorizados guardados')
        router.refresh()
      } catch (saveError) {
        setSuccess('')
        setError(
          saveError instanceof Error
            ? saveError.message
            : 'No se pudieron guardar los contactos autorizados'
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
          <Label htmlFor="authorized-whatsapp-name">Agregar contacto del equipo</Label>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              id="authorized-whatsapp-name"
              type="text"
              placeholder="Nombre de la persona"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
            <Input
              id="authorized-whatsapp-phone"
              type="tel"
              placeholder="3001234567 o +573001234567"
              value={draftPhone}
              onChange={(event) => setDraftPhone(event.target.value)}
            />
            <Button type="button" variant="secondary" onClick={handleAddContact} className="sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Agregar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Guarda nombre y número en formato Colombia `+57` para identificar quién sube cada reporte.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-foreground" />
            <p className="text-sm font-medium text-foreground">Contactos autorizados del equipo</p>
          </div>

          {contacts.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
              No hay contactos adicionales autorizados todavía.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contacts.map((contact) => (
                <Badge
                  key={contact.phone}
                  variant="secondary"
                  className="flex items-center gap-2 rounded-full px-3 py-1"
                >
                  <span className="font-medium">{contact.name}</span>
                  <span>{formatColombianPhoneNumber(contact.phone)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveContact(contact.phone)}
                    className="rounded-full p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
                    aria-label={`Eliminar ${contact.name}`}
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
            {isPending ? 'Guardando...' : 'Guardar contactos'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
