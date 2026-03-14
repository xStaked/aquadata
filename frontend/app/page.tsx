import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/auth/roles'

export default async function Home() {
  try {
    const supabase = createClient(await cookies())
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      redirect(isAdminRole(profile?.role) ? '/admin/dashboard' : '/portal/dashboard')
    }
  } catch (error: unknown) {
    // redirect() throws a NEXT_REDIRECT error — re-throw it so Next.js handles it
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }
    // Any other error: fall through to login redirect
  }

  redirect('/auth/login')
}
