import { redirect } from 'next/navigation'

import { OrganizationFcaSettings } from '@/components/organization-fca-settings'
import { OrganizationFishPriceSettings } from '@/components/organization-fish-price-settings'
import { OrganizationSalesModuleSettings } from '@/components/organization-sales-module-settings'
import { OrganizationWhatsappSettings } from '@/components/organization-whatsapp-settings'
import { getColombianMarketPrices } from '@/lib/market-data'
import { createClient } from '@/lib/supabase/server'
import { parseAuthorizedWhatsappContacts } from '@/lib/whatsapp-contacts'
import { isWriterRole } from '@/lib/auth/roles'
import { ReadOnlyBanner } from '@/components/read-only-banner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, whatsapp_phone, role')
    .eq('id', user!.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  const [{ data: organization }, { data: ponds }, marketPrices] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, default_fca, custom_fish_prices, authorized_whatsapp_contacts, sales_module_enabled')
      .eq('id', profile.organization_id)
      .single(),
    supabase
      .from('ponds')
      .select('species')
      .eq('organization_id', profile.organization_id),
    getColombianMarketPrices('BOGOTÁ'),
  ])

  const species = [...new Set((ponds ?? []).map(p => p.species).filter(Boolean))] as string[]

  // Build a market price map keyed by species using the same fuzzy match as the costs page
  const marketPriceMap: Record<string, number> = {}
  for (const s of species) {
    const match = marketPrices.find(mp =>
      s.toLowerCase().includes(mp.species.toLowerCase().split(' ')[0])
    )
    if (match) {
      marketPriceMap[s] = match.price_avg
    }
  }

  const initialPrices = (organization?.custom_fish_prices ?? {}) as Record<string, number>
  const canEdit = isWriterRole(profile?.role)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración</h1>
        <p className="mt-1 text-muted-foreground">
          Parámetros operativos compartidos por toda la finca.
        </p>
      </div>

      {!canEdit ? <ReadOnlyBanner description="Puedes consultar la configuración compartida de la finca, pero solo un operario o admin puede modificarla." /> : null}

      {canEdit ? (
        <>
          <OrganizationFcaSettings
            farmName={organization?.name ?? 'tu finca'}
            initialDefaultFca={organization?.default_fca != null ? Number(organization.default_fca) : null}
          />

          <OrganizationWhatsappSettings
            farmName={organization?.name ?? 'tu finca'}
            primaryPhone={profile?.whatsapp_phone ?? null}
            initialAuthorizedContacts={parseAuthorizedWhatsappContacts(organization?.authorized_whatsapp_contacts)}
          />

          <OrganizationSalesModuleSettings
            initialEnabled={organization?.sales_module_enabled !== false}
          />

          {organization?.sales_module_enabled !== false ? (
            <OrganizationFishPriceSettings
              species={species}
              initialPrices={initialPrices}
              marketPrices={marketPriceMap}
            />
          ) : null}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen de la configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Finca: <span className="font-medium text-foreground">{organization?.name ?? 'tu finca'}</span></p>
            <p>FCA por defecto: <span className="font-medium text-foreground">{organization?.default_fca != null ? Number(organization.default_fca).toFixed(2) : 'No configurado'}</span></p>
            <p>Módulo de ventas: <span className="font-medium text-foreground">{organization?.sales_module_enabled !== false ? 'Activo' : 'Oculto'}</span></p>
            <p>Contactos WhatsApp autorizados: <span className="font-medium text-foreground">{parseAuthorizedWhatsappContacts(organization?.authorized_whatsapp_contacts).length}</span></p>
            <p>Especies configuradas: <span className="font-medium text-foreground">{species.length}</span></p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
