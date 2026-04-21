import { createClient } from '@/lib/supabase/server'
import type { Organization } from '@/db/types'
import { parseAuthorizedWhatsappContacts } from '@/lib/whatsapp-contacts'

/**
 * Fetch a single organization by ID.
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (error) throw new Error(`Error fetching organization: ${error.message}`)
  return normalizeOrganization(data)
}

/**
 * Update organization fields.
 */
export async function updateOrganization(
  orgId: string,
  data: Partial<Organization>
): Promise<Organization> {
  const supabase = await createClient()

  const { data: updated, error } = await supabase
    .from('organizations')
    .update(data)
    .eq('id', orgId)
    .select('*')
    .single()

  if (error) throw new Error(`Error updating organization: ${error.message}`)
  if (!updated) throw new Error('Organization not found after update')
  return normalizeOrganization(updated)
}

/**
 * Fetch a user's profile together with their organization.
 * Returns null if the user has no profile or no org linked.
 */
export async function getOrganizationWithProfile(
  userId: string
): Promise<{ profile: OrganizationProfile; organization: Organization } | null> {
  const supabase = await createClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', userId)
    .single()

  if (profileError || !profile?.organization_id || !profile.organizations) {
    return null
  }

  return {
    profile: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      whatsapp_phone: profile.whatsapp_phone,
      phone: profile.phone,
      role: profile.role,
      organization_id: profile.organization_id,
      created_at: profile.created_at,
    },
    organization: normalizeOrganization(profile.organizations),
  }
}

interface OrganizationProfile {
  id: string
  email: string | null
  full_name: string | null
  whatsapp_phone?: string | null
  phone?: string | null
  role: string
  organization_id: string | null
  created_at: string
}

function normalizeOrganization(raw: Record<string, unknown>): Organization {
  return {
    id: raw.id as string,
    name: raw.name as string,
    default_fca: raw.default_fca != null ? Number(raw.default_fca) : null,
    custom_fish_prices: (raw.custom_fish_prices as Record<string, number>) ?? {},
    authorized_whatsapp_contacts: parseAuthorizedWhatsappContacts(raw.authorized_whatsapp_contacts),
    sales_module_enabled: raw.sales_module_enabled !== false,
    created_at: raw.created_at as string,
  }
}
