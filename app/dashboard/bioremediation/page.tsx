import { BioremediationForm } from '@/components/bioremediation-form'

export default function BioremediationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Calculadora de Bioremediacion</h1>
        <p className="mt-1 text-muted-foreground">
          Calcula el volumen de tu estanque y la dosis estimada de bioremediacion
        </p>
      </div>
      <BioremediationForm />
    </div>
  )
}
