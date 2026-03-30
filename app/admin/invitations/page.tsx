import { requireAdminUser } from '@/lib/auth/roles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Ticket, CheckCircle2, XCircle } from 'lucide-react'

type ProfileRelation = {
  full_name: string | null
  email: string | null
} | null

type InvitationCode = {
  id: string
  code: string
  description: string | null
  used: boolean
  used_by: string | null
  used_at: string | null
  created_at: string
  profiles: ProfileRelation
}

export default async function AdminInvitationsPage() {
  const { supabase } = await requireAdminUser()

  const { data: codes = [] } = await supabase
    .from('invitation_codes')
    .select('id, code, description, used, used_by, used_at, created_at, profiles:used_by(full_name, email)')
    .order('created_at', { ascending: false })

  const typedCodes = (codes as unknown as InvitationCode[]) ?? []
  const total = typedCodes.length
  const usedCount = typedCodes.filter((c) => c.used).length
  const availableCount = total - usedCount

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Control de acceso
          </p>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Codigos de invitacion
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Gestiona los codigos de acceso a la plataforma para nuevos productores.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Codigos disponibles</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{availableCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Codigos usados</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{usedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-4 w-4 text-primary" />
            Todos los codigos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typedCodes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay codigos de invitacion registrados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Codigo</th>
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Descripcion</th>
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Estado</th>
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Usado por</th>
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Fecha de uso</th>
                    <th className="py-2 pr-0 font-medium text-muted-foreground">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {typedCodes.map((code) => {
                    const profile = code.profiles
                    const usedByName = profile
                      ? profile.full_name || profile.email || '-'
                      : '-'
                    return (
                      <tr key={code.id} className="border-b border-border/70">
                        <td className="py-3 pr-4">
                          <span className="font-mono text-sm text-foreground">{code.code}</span>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {code.description || '-'}
                        </td>
                        <td className="py-3 pr-4">
                          {code.used ? (
                            <Badge variant="destructive">Usado</Badge>
                          ) : (
                            <Badge variant="default">Disponible</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{usedByName}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {code.used_at
                            ? new Date(code.used_at).toLocaleDateString('es-CO')
                            : '-'}
                        </td>
                        <td className="py-3 pr-0 text-muted-foreground">
                          {new Date(code.created_at).toLocaleDateString('es-CO')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
