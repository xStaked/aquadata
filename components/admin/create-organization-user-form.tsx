'use client'

import { useState, useTransition } from 'react'
import { createOrganizationUser } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateOrganizationUserForm({
  organizationId,
}: {
  organizationId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        setSuccess(null)

        const formData = new FormData(event.currentTarget)

        startTransition(async () => {
          try {
            await createOrganizationUser(formData)
            ;(event.currentTarget as HTMLFormElement).reset()
            setSuccess('Invitación enviada. El usuario quedará creado dentro de esta finca.')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo crear el usuario')
          }
        })
      }}
    >
      <input type="hidden" name="organization_id" value={organizationId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input id="full_name" name="full_name" placeholder="Juan Perez" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="juan@granja.com" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" inputMode="numeric" maxLength={10} placeholder="3001234567" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" placeholder="Minimo 6 caracteres" minLength={6} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="role">Rol</Label>
          <select
            id="role"
            name="role"
            defaultValue="viewer"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="viewer">Solo lectura</option>
            <option value="operario">Operario</option>
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Enviando...' : 'Crear usuario de finca'}
      </Button>
    </form>
  )
}
