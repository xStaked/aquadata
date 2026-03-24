import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (!profile?.organization_id) {
    return NextResponse.json({ defaultFca: null })
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('default_fca')
    .eq('id', profile.organization_id)
    .single()

  if (organizationError) {
    return NextResponse.json({ error: organizationError.message }, { status: 500 })
  }

  return NextResponse.json({
    defaultFca: organization?.default_fca != null ? Number(organization.default_fca) : null,
  })
}
