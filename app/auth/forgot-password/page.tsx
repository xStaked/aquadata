'use client'

import React from "react"

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState } from 'react'
import { Fish, Waves, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Ocurrio un error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background p-6 md:p-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5 text-primary">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Fish className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground">AquaData</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Waves className="h-4 w-4" />
              <p className="text-sm">Plataforma Acuicola Digital</p>
            </div>
          </div>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Recuperar contrasena</CardTitle>
              <CardDescription>
                Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Si existe una cuenta con <strong>{email}</strong>, recibiras un correo con un enlace para restablecer tu contrasena.
                  </p>
                  <Link href="/auth/login">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver al inicio de sesion
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleReset}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="operario@granja.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Enviando...' : 'Enviar enlace de recuperacion'}
                    </Button>
                  </div>
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    <Link
                      href="/auth/login"
                      className="text-primary underline underline-offset-4"
                    >
                      Volver al inicio de sesion
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
