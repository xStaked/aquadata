import { BioremediationForm } from '@/components/bioremediation-form'

export default function BioremediationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Calculadora de Bioremediacion</h1>
        <p className="mt-1 text-muted-foreground">
          Calcula la dosis estimada de bioremediación usando el área del estanque y su profundidad
        </p>
      </div>
      <BioremediationForm />
    </div>
  )
}
