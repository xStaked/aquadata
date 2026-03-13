export type FcaSource = 'calculated' | 'default'

export interface ProductionFcaInput {
  fish_count: number | null
  feed_kg: number | null
  avg_weight_g: number | null
  mortality_count: number | null
}

export function calculateBiomassKg(input: ProductionFcaInput) {
  if (input.fish_count == null || input.avg_weight_g == null) {
    return null
  }

  const effectiveFish = Math.max(0, input.fish_count - (input.mortality_count ?? 0))
  return effectiveFish * input.avg_weight_g / 1000
}

export function calculateCalculatedFca(input: ProductionFcaInput) {
  const biomassKg = calculateBiomassKg(input)

  if (input.feed_kg == null || biomassKg == null || biomassKg <= 0) {
    return {
      calculated_fca: null,
      calculated_biomass_kg: biomassKg,
    }
  }

  return {
    calculated_fca: input.feed_kg / biomassKg,
    calculated_biomass_kg: biomassKg,
  }
}

export function resolveEffectiveFca(params: {
  calculatedFca: number | null
  defaultFca: number | null
  source: FcaSource
}) {
  if (params.source === 'default') {
    if (params.defaultFca == null) {
      throw new Error('La finca no tiene un FCA por defecto configurado')
    }

    return {
      effective_fca: params.defaultFca,
      fca_source: 'default' as const,
    }
  }

  if (params.calculatedFca == null) {
    return {
      effective_fca: null,
      fca_source: 'calculated' as const,
    }
  }

  return {
    effective_fca: params.calculatedFca,
    fca_source: 'calculated' as const,
  }
}
