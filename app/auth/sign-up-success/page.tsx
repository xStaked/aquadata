import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Fish, Mail } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <Fish className="h-8 w-8 text-primary" />
          </div>
          <Card>
            <CardHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-center text-2xl text-foreground">
                Registro exitoso
              </CardTitle>
              <CardDescription className="text-center">
                Revisa tu correo electronico para confirmar tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground">
                Te enviamos un enlace de confirmacion. Una vez que confirmes tu
                email, podras iniciar sesion y comenzar a usar AquaData.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
