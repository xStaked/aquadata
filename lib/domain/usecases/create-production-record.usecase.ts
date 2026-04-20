/**
 * Use case: Create Production Record.
 * Orchestrates FCA calculation, population update, record creation, and alert generation.
 * Depends on ports (interfaces), not on Supabase directly.
 */

import type { Result } from '@/domain/types/result'
import { success, failure } from '@/domain/types/result'
import type { CreateProductionRecord, CreateProductionRecordInput } from '@/domain/ports/input/create-production-record.port'
import type { ProductionRecordRepositoryPort } from '@/domain/ports/output/production-record.repository.port'
import type { BatchRepositoryPort } from '@/domain/ports/output/batch.repository.port'
import type { OrganizationRepositoryPort } from '@/domain/ports/output/organization.repository.port'
import type { AlertServicePort } from '@/domain/ports/output/alert.service.port'
import type { AlertPayload } from '@/alerts/types'
import { calculateCalculatedFca, resolveEffectiveFca } from '@/lib/fca'
import { generateAlerts, type WaterQualityReading } from '@/lib/alerts'

export class CreateProductionRecordUseCase implements CreateProductionRecord {
  constructor(
    private readonly recordRepo: ProductionRecordRepositoryPort,
    private readonly batchRepo: BatchRepositoryPort,
    private readonly orgRepo: OrganizationRepositoryPort,
    private readonly alertService: AlertServicePort,
  ) {}

  async execute(input: CreateProductionRecordInput): Promise<Result<void>> {
    try {
      // 1. Get batch for population tracking
      const batchResult = await this.batchRepo.findById(input.batch_id)
      if (!batchResult.ok || !batchResult.data) {
        return failure('Lote no encontrado', 'BATCH_NOT_FOUND')
      }
      const batch = batchResult.data

      // 2. Resolve fish count
      const resolvedFishCount = input.fish_count ?? batch.current_population ?? batch.initial_population ?? null

      // 3. Calculate FCA and biomass
      const { calculated_fca, calculated_biomass_kg } = calculateCalculatedFca({
        fish_count: resolvedFishCount,
        feed_kg: input.feed_kg,
        avg_weight_g: input.avg_weight_g,
        mortality_count: input.mortality_count,
      })

      // 4. Update batch population if mortality
      if (input.mortality_count && input.mortality_count > 0) {
        const currentPop = batch.current_population ?? batch.initial_population
        const newPop = Math.max(0, currentPop - input.mortality_count)
        await this.batchRepo.updatePopulation(input.batch_id, newPop)
      }

      // 5. Resolve effective FCA
      const orgResult = await this.orgRepo.findById(input.orgId)
      const defaultFca = orgResult.ok && orgResult.data?.default_fca != null
        ? Number(orgResult.data.default_fca)
        : null

      const { effective_fca } = resolveEffectiveFca({
        calculatedFca: calculated_fca,
        defaultFca,
        source: input.fca_source,
      })

      // 6. Create record (delegate to repo - it handles the DB insert)
      await this.recordRepo.create({
        ...input,
        fish_count: resolvedFishCount,
      })

      // 7. Generate alerts
      const batchWithPond = await this.batchRepo.findByIdWithPond(input.batch_id)
      const pondId = batchWithPond.ok && batchWithPond.data ? batchWithPond.data.pond_id : null

      const reading: WaterQualityReading = {
        batch_id: input.batch_id,
        pond_id: pondId,
        oxygen_mg_l: input.oxygen_mg_l,
        ammonia_mg_l: input.ammonia_mg_l,
        ph: input.ph,
        temperature_c: input.temperature_c,
        nitrite_mg_l: input.nitrite_mg_l,
        nitrate_mg_l: input.nitrate_mg_l,
        hardness_mg_l: input.hardness_mg_l,
        alkalinity_mg_l: input.alkalinity_mg_l,
        phosphate_mg_l: input.phosphate_mg_l,
        mortality_count: input.mortality_count,
        effective_fca,
      }

      const alertResult = await this.generateAlertsInternal(reading, input.orgId)
      if (alertResult.ok && alertResult.data.length > 0) {
        await this.alertService.createBatch(alertResult.data)
      }

      return success(undefined)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al crear el registro de producción',
        'CREATE_RECORD_FAILED',
      )
    }
  }

  private async generateAlertsInternal(
    reading: WaterQualityReading,
    orgId: string,
  ): Promise<Result<AlertPayload[]>> {
    try {
      const alerts = generateAlerts(reading, orgId)
      return success(alerts)
    } catch (err) {
      return failure(
        err instanceof Error ? err.message : 'Error al generar alertas',
        'GENERATE_ALERTS_FAILED',
      )
    }
  }
}
