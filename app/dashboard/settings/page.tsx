import { redirect } from 'next/navigation'

import { OrganizationFcaSettings } from '@/components/organization-fca-settings'
import { OrganizationFishPriceSettings } from '@/components/organization-fish-price-settings'
import { OrganizationWhatsappSettings } from '@/components/organization-whatsapp-settings'
import { getColombianMarketPrices } from '@/lib/market-data'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, whatsapp_phone')
    .eq('id', user!.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  const [{ data: organization }, { data: ponds }, marketPrices] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, default_fca, custom_fish_prices, authorized_whatsapp_phones')
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración</h1>
        <p className="mt-1 text-muted-foreground">
          Parámetros operativos compartidos por toda la finca.
        </p>
      </div>

      <OrganizationFcaSettings
        farmName={organization?.name ?? 'tu finca'}
        initialDefaultFca={organization?.default_fca != null ? Number(organization.default_fca) : null}
      />

      <OrganizationWhatsappSettings
        farmName={organization?.name ?? 'tu finca'}
        primaryPhone={profile?.whatsapp_phone ?? null}
        initialAuthorizedPhones={
          Array.isArray(organization?.authorized_whatsapp_phones)
            ? organization.authorized_whatsapp_phones.filter(
                (value): value is string => typeof value === 'string'
              )
            : []
        }
      />

      <OrganizationFishPriceSettings
        species={species}
        initialPrices={initialPrices}
        marketPrices={marketPriceMap}
      />
    </div>
  )
}
