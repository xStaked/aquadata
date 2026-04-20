import React from "react"
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organizations(name, sales_module_enabled)')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  return (
    <div className="flex min-h-svh bg-background">
      <DashboardSidebar
        initialFarmName={
          (profile?.organizations as { name?: string | null } | null)?.name ?? null
        }
        initialUserRole={profile?.role ?? null}
        initialSalesModuleEnabled={
          (profile?.organizations as { sales_module_enabled?: boolean | null } | null)
            ?.sales_module_enabled !== false
        }
      />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
