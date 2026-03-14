import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export default async function PortalLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  // Si un admin intenta entrar al portal de cliente, redirigir al admin panel
  if (profile?.role && profile.role !== 'cliente') {
    redirect('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">N</span>
          </div>
          <span className="font-semibold text-foreground">Norgtech</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {profile?.full_name}
        </span>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
