/**
 * Dependency injection container for domain use cases.
 * Wire up ports with their Supabase adapters and inject into use cases.
 *
 * In a production app, you'd use a DI framework or factory.
 * For now, this centralizes the wiring so Server Actions can just import ready-to-use instances.
 */

import { SupabaseProductionRecordRepository } from '@/domain/adapters/supabase-production-record.adapter'
import { SupabaseBatchRepository } from '@/domain/adapters/supabase-batch.adapter'
import { SupabaseOrganizationRepository } from '@/domain/adapters/supabase-organization.adapter'
import { SupabaseAlertService } from '@/domain/adapters/supabase-alert.adapter'
import { SupabasePondRepository } from '@/domain/adapters/supabase-pond.adapter'
import { CreateProductionRecordUseCase } from '@/domain/usecases/create-production-record.usecase'
import { GenerateWaterQualityAlertsUseCase } from '@/domain/usecases/generate-water-quality-alerts.usecase'

// ── Infrastructure adapters (singleton-like, stateless) ──

const productionRecordRepo = new SupabaseProductionRecordRepository()
const batchRepo = new SupabaseBatchRepository()
const orgRepo = new SupabaseOrganizationRepository()
const alertService = new SupabaseAlertService()
const pondRepo = new SupabasePondRepository()

// ── Use cases (wired with their dependencies) ──

export const createProductionRecordUseCase = new CreateProductionRecordUseCase(
  productionRecordRepo,
  batchRepo,
  orgRepo,
  alertService,
)

export const generateWaterQualityAlertsUseCase = new GenerateWaterQualityAlertsUseCase()

// ── Repositories (also exported for direct use in Server Actions) ──

export { productionRecordRepo, batchRepo, orgRepo, alertService, pondRepo }
