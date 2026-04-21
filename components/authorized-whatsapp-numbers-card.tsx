import Link from 'next/link'
import { Phone, Settings, Users } from 'lucide-react'

import type { AuthorizedWhatsappContact } from '@/db/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatColombianPhoneNumber } from '@/lib/phone'

export function AuthorizedWhatsappNumbersCard({
  primaryPhone,
  authorizedContacts,
}: {
  primaryPhone: string | null
  authorizedContacts: AuthorizedWhatsappContact[]
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Acceso del bot por WhatsApp
        </CardTitle>
        <CardDescription>
          Estos son los números que pueden enviar capturas al bot para cargar reportes OCR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Phone className="h-4 w-4" />
            Número principal
          </div>
          <p className="text-sm text-muted-foreground">
            {primaryPhone ? formatColombianPhoneNumber(primaryPhone) : 'No configurado'}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Contactos autorizados del equipo</p>
          {authorizedContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no has autorizado contactos del equipo.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {authorizedContacts.map((contact) => (
                <Badge
                  key={contact.phone}
                  variant="secondary"
                  className="flex items-center gap-2 rounded-full px-3 py-1"
                >
                  <span className="font-medium">{contact.name}</span>
                  <span className="text-muted-foreground">
                    {formatColombianPhoneNumber(contact.phone)}
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-primary/80"
        >
          <Settings className="h-4 w-4" />
          Administrar accesos en configuración
        </Link>
      </CardContent>
    </Card>
  )
}
