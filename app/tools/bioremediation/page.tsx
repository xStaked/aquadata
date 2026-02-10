import { PublicBioremediationCalc } from '@/components/public-bioremediation'
import { Fish } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calculadora de Bioremediacion - AquaData',
  description:
    'Calcula el volumen de tu estanque acuicola y la dosis estimada de bioremediacion. Herramienta gratuita para productores.',
}

export default function PublicBioremediationPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Fish className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">AquaData</span>
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Iniciar sesion
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Calculadora de Bioremediacion
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Herramienta gratuita para calcular el volumen de tu estanque acuicola y la
            dosis estimada de productos de bioremediacion.
          </p>
        </div>

        <PublicBioremediationCalc />

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Quieres guardar tus calculos y gestionar toda tu operacion acuicola?
          </p>
          <Link
            href="/auth/signup"
            className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Crea tu cuenta gratis en AquaData
          </Link>
        </div>
      </main>
    </div>
  )
}
