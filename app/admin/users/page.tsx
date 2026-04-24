import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requireAdminUser } from '@/lib/auth/roles'
import { createOrganizationUser } from '@/app/admin/actions'
import { Users, ShieldCheck, UserCog, Eye, ArrowLeft, Building2 } from 'lucide-react'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; role?: string }>
}) {
  const { org, role } = await searchParams
  const selectedOrg = org && org !== 'all' ? org : null
  const selectedRole = role && role !== 'all' ? role : null

  const { supabase } = await requireAdminUser()

  const [orgsRes, profilesRes] = await Promise.allSettled([
    supabase.from('organizations').select('id, name').order('name', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, email, role, organization_id, created_at, organizations(name)')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const orgs = orgsRes.status === 'fulfilled' ? orgsRes.value.data ?? [] : []
  const profiles = profilesRes.status === 'fulfilled' ? profilesRes.value.data ?? [] : []

  const orgMap = new Map(orgs.map((o) => [o.id, o.name]))

  const filteredProfiles = profiles.filter((p) => {
    if (selectedOrg && p.organization_id !== selectedOrg) return false
    if (selectedRole && p.role !== selectedRole) return false
    return true
  })

  const totalUsers = filteredProfiles.length
  const adminCount = filteredProfiles.filter((p) => p.role === 'admin').length
  const operarioCount = filteredProfiles.filter((p) => p.role === 'operario').length
  const viewerCount = filteredProfiles.filter((p) => p.role === 'viewer').length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Admin
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Usuarios</h2>
          <p className="mt-1 text-muted-foreground">
            Gestiona usuarios de la plataforma, roles y acceso a granjas
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total usuarios</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{adminCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Operarios</CardTitle>
            <UserCog className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{operarioCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Solo lectura</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{viewerCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Crear usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createOrganizationUser} className="space-y-3">
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
                <Input
                  id="phone"
                  name="phone"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="3001234567"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  name="role"
                  defaultValue="viewer"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="viewer">Solo lectura</option>
                  <option value="operario">Operario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="organization_id">Granja</Label>
                <select
                  id="organization_id"
                  name="organization_id"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecciona una granja</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">
                Crear usuario e invitar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Usuarios registrados</span>
              <form method="GET" className="flex items-center gap-2">
                <select
                  id="org"
                  name="org"
                  defaultValue={selectedOrg ?? 'all'}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="all">Todas las granjas</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <select
                  id="role"
                  name="role"
                  defaultValue={selectedRole ?? 'all'}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="all">Todos los roles</option>
                  <option value="admin">Admin</option>
                  <option value="operario">Operario</option>
                  <option value="viewer">Solo lectura</option>
                </select>
                <Button type="submit" size="sm" variant="outline">
                  Filtrar
                </Button>
              </form>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium text-muted-foreground">Nombre</th>
                    <th className="py-2 pr-3 font-medium text-muted-foreground">Email</th>
                    <th className="py-2 pr-3 font-medium text-muted-foreground">Rol</th>
                    <th className="py-2 pr-0 font-medium text-muted-foreground">Granja</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-muted-foreground">
                        No se encontraron usuarios
                      </td>
                    </tr>
                  )}
                  {filteredProfiles.map((profile) => {
                    const orgName =
                      (profile.organizations as unknown as { name?: string } | null)?.name ||
                      orgMap.get(profile.organization_id || '') ||
                      '-'
                    return (
                      <tr key={profile.id} className="border-b border-border/70">
                        <td className="py-2 pr-3 text-foreground">
                          {profile.full_name || '-'}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {profile.email || '-'}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge
                            variant={
                              profile.role === 'admin'
                                ? 'default'
                                : profile.role === 'viewer'
                                  ? 'outline'
                                  : 'secondary'
                            }
                          >
                            {profile.role}
                          </Badge>
                        </td>
                        <td className="py-2 pr-0 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {orgName}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
