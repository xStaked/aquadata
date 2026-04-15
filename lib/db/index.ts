/**
 * Data access layer barrel export.
 *
 * Import from '@/db' to get all types, context helpers, and repository functions.
 * This is the single entry point for all database operations.
 */

// ── Types ─────────────────────────────────────────────────────
export type {
  Organization,
  Profile,
  Pond,
  PondStatus,
  Batch,
  BatchWithPond,
  BatchStatus,
  ProductionRecord,
  ProductionRecordWithBatch,
  FcaSource,
  ReportType,
  Alert,
  AlertType,
  AlertSeverity,
  Upload,
  UploadStatus,
  BioremediationCalc,
  OrgContext,
} from './types'

// ── Context ───────────────────────────────────────────────────
export { getOrgContext } from './context'

// ── Organization Repository ───────────────────────────────────
export {
  getOrganization,
  updateOrganization,
  getOrganizationWithProfile,
} from './repositories/organization-repository'

// ── Pond Repository ───────────────────────────────────────────
export {
  getPondsByOrg,
  getPond,
  createPond,
  deletePond,
  updatePondOrder,
  getNextSortOrder,
} from './repositories/pond-repository'

// ── Batch Repository ──────────────────────────────────────────
export {
  getBatch,
  getBatchWithPond,
  getBatchesByPond,
  getActiveBatchesByOrg,
  createBatch,
  updateBatchPopulation,
  closeBatch,
  updateBatchFinancial,
} from './repositories/batch-repository'

// ── Production Record Repository ──────────────────────────────
export {
  getRecordsByBatch,
  getRecordsByOrg,
  createRecord,
  updateRecord,
  getLatestRecordByBatch,
} from './repositories/production-record-repository'

// ── Alert Repository ──────────────────────────────────────────
export {
  getAlertsByOrg,
  createAlerts,
  markAlertResolved,
  markAllAlertsRead,
  getUnresolvedAlertsByOrg,
} from './repositories/alert-repository'

// ── Upload Repository ─────────────────────────────────────────
export {
  getUploadsByOrg,
  createUpload,
} from './repositories/upload-repository'

// ── Bioremediation Repository ─────────────────────────────────
export {
  createBioremediationCalc,
  getCalcsByUser,
} from './repositories/bioremediation-repository'
