// Domain layer barrel export
//
// Import from '@/domain' to get:
// - Types (Result, domain types)
// - Ports (input/use cases + output/infrastructure interfaces)
// - Use case implementations
// - DI container

// Types
export { success, failure, isSuccess, isFailure, unwrap } from './types'
export type { Result, Success, Failure } from './types'

// Ports
export * from './ports'

// Use cases
export { CreateProductionRecordUseCase } from './usecases/create-production-record.usecase'
export { GenerateWaterQualityAlertsUseCase } from './usecases/generate-water-quality-alerts.usecase'

// Adapters
export { SupabaseProductionRecordRepository } from './adapters/supabase-production-record.adapter'
export { SupabaseBatchRepository } from './adapters/supabase-batch.adapter'
export { SupabaseOrganizationRepository } from './adapters/supabase-organization.adapter'
export { SupabaseAlertService } from './adapters/supabase-alert.adapter'
export { SupabasePondRepository } from './adapters/supabase-pond.adapter'

// DI Container
export {
  createProductionRecordUseCase,
  generateWaterQualityAlertsUseCase,
  productionRecordRepo,
  batchRepo,
  orgRepo,
  alertService,
  pondRepo,
} from './container'
