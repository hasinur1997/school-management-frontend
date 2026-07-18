import type { GradingBand } from "./mark"

/** The masked shape the API returns for write-only secrets. */
export interface MaskedSecretSetting {
  is_set: boolean
}

/** Global, school-wide settings from `GET /settings`. */
export interface GlobalSettings {
  school_name: string | null
  school_logo: string | null
  /**
   * Stored by the API after `ResolvePublicIds` runs. Existing installs may
   * therefore return either an internal integer id or an unresolved public id.
   */
  current_session_id: number | string | null
  sslcommerz_store_id: string | null
  sslcommerz_store_password: MaskedSecretSetting
  sslcommerz_sandbox: boolean | null
  mail_from: string | null
  sms_api_key: MaskedSecretSetting
  sms_sender_id: string | null
}

/** Branch-scoped settings for the active branch context. */
export interface BranchSettings {
  partial_payment_enabled: boolean | null
  late_fee_enabled: boolean | null
  teacher_late_threshold: string | null
  invoice_due_day: number | null
}

/** Effective settings payload returned by `GET /settings`. */
export interface SettingsState {
  global: GlobalSettings
  branch: BranchSettings
}

export type GlobalSettingKey =
  | "school_name"
  | "school_logo"
  | "current_session_id"
  | "sslcommerz_store_id"
  | "sslcommerz_store_password"
  | "sslcommerz_sandbox"
  | "mail_from"
  | "sms_api_key"
  | "sms_sender_id"

export type BranchSettingKey =
  | "partial_payment_enabled"
  | "late_fee_enabled"
  | "teacher_late_threshold"
  | "invoice_due_day"

export type SettingKey = GlobalSettingKey | BranchSettingKey

export type SettingsPatch = Partial<Record<SettingKey, string | number | boolean>>

export type { GradingBand }
