/**
 * Admission hooks. The public, unauthenticated submission/status endpoints
 * (task 2.5) and the authenticated review queue/detail + approve/reject
 * mutations (task 2.6). Import from `@/hooks/admissions`.
 */

export { useAdmissions, ADMISSIONS_PER_PAGE } from "./use-admissions"
export { useTrashedAdmissions } from "./use-trashed-admissions"
export type { TrashedAdmissionParams } from "./use-trashed-admissions"
export { useAdmission } from "./use-admission"
export {
  useApproveAdmission,
  useRejectAdmission,
  useDeleteAdmission,
  useBulkDeleteAdmission,
  useRestoreAdmission,
  useBulkRestoreAdmission,
  useForceDeleteAdmission,
  useBulkForceDeleteAdmission,
} from "./use-admission-mutations"

export { usePublicSettings } from "./use-public-settings"
export { useSubmitAdmission } from "./use-submit-admission"
export { useAdmissionStatus } from "./use-admission-status"
export { usePublicAdmissionStatus } from "./use-public-admission-status"
export type { PublicAdmissionStatusArgs } from "./use-public-admission-status"
export { useInitiatePayment } from "./use-initiate-payment"
export type { InitiatePaymentArgs } from "./use-initiate-payment"
