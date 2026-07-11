/**
 * Settings read hooks. Currently the partial-payment feature toggle the fees
 * module reads (task F-5.3); the full settings feature is task 6.4.
 */

export { useAllowPartialPayment } from "./use-payment-settings"
export type { AllowPartialPayment } from "./use-payment-settings"
