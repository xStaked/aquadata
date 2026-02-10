'use client'

import { Button } from '@/components/ui/button'
import { CheckCheck } from 'lucide-react'
import { markAllAlertsRead } from '@/app/dashboard/alerts/actions'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function AlertActions() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await markAllAlertsRead()
          router.refresh()
        })
      }}
    >
      <CheckCheck className="mr-2 h-4 w-4" />
      Marcar todas leidas
    </Button>
  )
}
