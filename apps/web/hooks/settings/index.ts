/**
 * Settings hooks (task F-6.4) plus the partial-payment reader the fees module
 * consumes (task F-5.3).
 */

export {
  useSettings,
  useUpdateSettings,
  useUpdateGradingScale,
} from "./use-settings"
export { useAllowPartialPayment } from "./use-payment-settings"
export type { AllowPartialPayment } from "./use-payment-settings"
