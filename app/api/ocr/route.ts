import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getVisionModel } from '@/lib/ai/provider'

const productionDataSchema = z.object({
  record_date: z.string().nullable().describe('Fecha del registro en formato YYYY-MM-DD'),
  feed_kg: z.number().nullable().describe('Alimento suministrado en kg'),
  avg_weight_g: z.number().nullable().describe('Peso promedio del animal en gramos'),
  mortality_count: z.number().nullable().describe('Cantidad de mortalidad del dia'),
  temperature_c: z.number().nullable().describe('Temperatura del agua en grados Celsius'),
  oxygen_mg_l: z.number().nullable().describe('Oxigeno disuelto en mg/L'),
  ammonia_mg_l: z.number().nullable().describe('Amonio (NH3/NH4+) en mg/L'),
  nitrite_mg_l: z.number().nullable().describe('Nitritos (NO2) en mg/L'),
  nitrate_mg_l: z.number().nullable().describe('Nitratos (NO3) en mg/L'),
  ph: z.number().nullable().describe('pH del agua'),
  notes: z.string().nullable().describe('Notas o observaciones adicionales del reporte'),
  confidence: z.object({
    record_date: z.number().describe('Confianza de 0 a 100 para la fecha'),
    feed_kg: z.number().describe('Confianza de 0 a 100 para alimento'),
    avg_weight_g: z.number().describe('Confianza de 0 a 100 para peso promedio'),
    mortality_count: z.number().describe('Confianza de 0 a 100 para mortalidad'),
    temperature_c: z.number().describe('Confianza de 0 a 100 para temperatura'),
    oxygen_mg_l: z.number().describe('Confianza de 0 a 100 para oxigeno'),
    ammonia_mg_l: z.number().describe('Confianza de 0 a 100 para amonio'),
    nitrite_mg_l: z.number().describe('Confianza de 0 a 100 para nitritos'),
    nitrate_mg_l: z.number().describe('Confianza de 0 a 100 para nitratos'),
    ph: z.number().describe('Confianza de 0 a 100 para pH'),
  }).describe('Nivel de confianza para cada campo extraido, de 0 a 100'),
})

export async function POST(req: Request) {
  try {
    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64) {
      return Response.json({ error: 'No se recibio imagen' }, { status: 400 })
    }

    const { output } = await generateText({
      model: getVisionModel(),
      output: Output.object({
        schema: productionDataSchema,
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza esta imagen de un reporte acuicola de campo. Extrae los siguientes datos de produccion:

- Fecha del registro
- Alimento suministrado (kg)
- Peso promedio del animal (gramos)
- Mortalidad (cantidad de animales muertos)
- Temperatura del agua (grados Celsius)
- Oxigeno disuelto (mg/L)
- Amonio NH3/NH4+ (mg/L)
- Nitritos NO2 (mg/L)
- Nitratos NO3 (mg/L)
- pH del agua
- Notas u observaciones

La imagen puede ser un formulario manuscrito, una tabla impresa, o una hoja de registro.
Si un campo no es visible o no puedes leerlo con certeza, devuelve null para ese campo.
Para cada campo, asigna un nivel de confianza de 0 a 100 indicando que tan seguro estas de la lectura.

IMPORTANTE: Si la fecha esta en formato DD/MM/YYYY, conviertela a YYYY-MM-DD.`,
            },
            {
              type: 'image',
              image: imageBase64,
            },
          ],
        },
      ],
    })

    return Response.json({ data: output })
  } catch (error) {
    console.error('OCR Error:', error)
    return Response.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    )
  }
}
