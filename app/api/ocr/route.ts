import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getGoogleVisionModelCandidates } from '@/lib/ai/provider'

const productionDataSchema = z.object({
  record_date: z.string().nullable().describe('Fecha del registro en formato YYYY-MM-DD'),
  fish_count: z.number().nullable().describe('Numero total de peces en el estanque'),
  feed_kg: z.number().nullable().describe('Alimento suministrado en kg'),
  avg_weight_g: z.number().nullable().describe('Peso promedio del animal en gramos'),
  mortality_count: z.number().nullable().describe('Cantidad de mortalidad del dia'),
  temperature_c: z.number().nullable().describe('Temperatura del agua en grados Celsius'),
  oxygen_mg_l: z.number().nullable().describe('Oxigeno disuelto en mg/L'),
  ammonia_mg_l: z.number().nullable().describe('Amonio (NH3/NH4+) en mg/L'),
  nitrite_mg_l: z.number().nullable().describe('Nitritos (NO2) en mg/L'),
  nitrate_mg_l: z.number().nullable().describe('Nitratos (NO3) en mg/L'),
  ph: z.number().nullable().describe('pH del agua'),
  phosphate_mg_l: z.number().nullable().describe('Fosfatos (PO4) en mg/L'),
  hardness_mg_l: z.number().nullable().describe('Dureza total del agua en mg/L como CaCO3 (opcional)'),
  alkalinity_mg_l: z.number().nullable().describe('Alcalinidad total del agua en mg/L como CaCO3 (opcional)'),
  notes: z.string().nullable().describe('Notas o observaciones adicionales del reporte'),
  confidence: z.object({
    record_date: z.number().describe('Confianza de 0 a 100 para la fecha'),
    fish_count: z.number().describe('Confianza de 0 a 100 para numero de peces'),
    feed_kg: z.number().describe('Confianza de 0 a 100 para alimento'),
    avg_weight_g: z.number().describe('Confianza de 0 a 100 para peso promedio en gramos'),
    mortality_count: z.number().describe('Confianza de 0 a 100 para mortalidad'),
    temperature_c: z.number().describe('Confianza de 0 a 100 para temperatura'),
    oxygen_mg_l: z.number().describe('Confianza de 0 a 100 para oxigeno'),
    ammonia_mg_l: z.number().describe('Confianza de 0 a 100 para amonio'),
    nitrite_mg_l: z.number().describe('Confianza de 0 a 100 para nitritos'),
    nitrate_mg_l: z.number().describe('Confianza de 0 a 100 para nitratos'),
    ph: z.number().describe('Confianza de 0 a 100 para pH'),
    phosphate_mg_l: z.number().describe('Confianza de 0 a 100 para fosfatos'),
    hardness_mg_l: z.number().describe('Confianza de 0 a 100 para dureza'),
    alkalinity_mg_l: z.number().describe('Confianza de 0 a 100 para alcalinidad'),
  }).describe('Nivel de confianza para cada campo extraido, de 0 a 100'),
})

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      return Response.json({ error: 'No se recibio imagen' }, { status: 400 })
    }

    const prompt = `Analiza esta imagen de un reporte acuicola de campo. Extrae los siguientes datos de produccion:

- Fecha del registro
- Numero de peces (cantidad total en el estanque)
- Alimento suministrado (kg)
- Peso promedio del animal (gramos)
- Mortalidad (cantidad de animales muertos)
- Temperatura del agua (grados Celsius)
- Oxigeno disuelto (mg/L)
- Amonio NH3/NH4+ (mg/L)
- Nitritos NO2 (mg/L)
- Nitratos NO3 (mg/L)
- pH del agua
- Fosfatos PO4 (mg/L)
- Dureza total (mg/L como CaCO3) — campo opcional
- Alcalinidad total (mg/L como CaCO3) — campo opcional
- Notas u observaciones

La imagen puede ser un formulario manuscrito, una tabla impresa, o una hoja de registro.
Si un campo no es visible o no puedes leerlo con certeza, devuelve null para ese campo.
Para cada campo, asigna un nivel de confianza de 0 a 100 indicando que tan seguro estas de la lectura.
Los campos de dureza y alcalinidad son opcionales; si no aparecen, devuelve null y confianza 0.

IMPORTANTE: Si la fecha esta en formato DD/MM/YYYY, conviertela a YYYY-MM-DD.`

    let lastError: unknown = null
    const googleModels = getGoogleVisionModelCandidates()

    for (const candidate of googleModels) {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const { output } = await generateText({
            model: candidate.model,
            output: Output.object({
              schema: productionDataSchema,
            }),
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: prompt,
                  },
                  {
                    type: 'image',
                    image: imageBase64,
                  },
                ],
              },
            ],
          })

          return Response.json({ data: output, model: candidate.label })
        } catch (error) {
          lastError = error

          if (!isRetryableCapacityError(error)) {
            throw error
          }

          console.warn('OCR capacity retry', {
            provider: 'google',
            model: candidate.label,
            attempt,
            message: getErrorMessage(error),
          })

          if (attempt < 2) {
            await wait(1200 * attempt)
          }
        }
      }
    }

    console.error('OCR Error: todos los modelos de Google saturados', lastError)

    return Response.json(
      {
        error:
          'El analisis OCR esta temporalmente saturado. Intenta de nuevo en unos minutos.',
      },
      { status: 503 }
    )
  } catch (error) {
    if (isRetryableCapacityError(error)) {
      console.error('OCR Error: capacidad temporal agotada', error)
      return Response.json(
        {
          error:
            'El analisis OCR esta temporalmente saturado. Intenta de nuevo en unos minutos.',
        },
        { status: 503 }
      )
    }

    console.error('OCR Error:', error)
    return Response.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    )
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return JSON.stringify(error)
}

function isRetryableCapacityError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()

  return (
    message.includes('high demand') ||
    message.includes('try again later') ||
    message.includes('overloaded') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('status code: 429') ||
    message.includes('status code: 503') ||
    message.includes('status: 429') ||
    message.includes('status: 503')
  )
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
