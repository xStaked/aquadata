'use client'

import { useState, useTransition } from 'react'
import { createOrganizationUser } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Organization = { id: string; name: string }

export function CreateOrganizationUserForm({
  organizationId,
  organizations = [],
}: {
  organizationId?: string
  organizations?: Organization[]
}) {
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState('viewer')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        setSuccess(null)

        const form = event.currentTarget
        const formData = new FormData(form)

        startTransition(async () => {
          try {
            const result = await createOrganizationUser(formData)
            if (!result.ok) {
              setError(result.error)
              return
            }
            form.reset()
            setRole('viewer')
            setSuccess('Usuario creado correctamente.')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo crear el usuario')
          }
        })
      }}
    >
      {organizationId ? <input type="hidden" name="organization_id" value={organizationId} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="create-full-name">Nombre completo</Label>
          <Input id="create-full-name" name="full_name" placeholder="Juan Perez" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-email">Email</Label>
          <Input id="create-email" name="email" type="email" placeholder="juan@granja.com" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-phone">Teléfono</Label>
          <Input
            id="create-phone"
            name="phone"
            inputMode="numeric"
            maxLength={10}
            placeholder="3001234567"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-password">Contraseña</Label>
          <Input
            id="create-password"
            name="password"
            type="password"
            placeholder="Minimo 6 caracteres"
            minLength={6}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-role">Rol</Label>
          <select
            id="create-role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="viewer">Solo lectura</option>
            <option value="operario">Operario</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {organizationId ? null : (
          <div className="space-y-1">
            <Label htmlFor="create-organization">Granja</Label>
            <select
              id="create-organization"
              key={role}
              name="organization_id"
              required={role !== 'admin'}
              disabled={role === 'admin'}
              defaultValue=""
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="">{role === 'admin' ? 'Admin global (sin granja)' : 'Selecciona una granja'}</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creando...' : organizationId ? 'Crear usuario de finca' : 'Crear usuario'}
      </Button>
    </form>
  )
}
