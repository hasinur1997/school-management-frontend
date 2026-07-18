"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { api, queryKey, STALE_TIME } from "@/lib/api"
import type { GradingBand, SettingsPatch, SettingsState } from "@/types/settings"

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function readSessionId(value: unknown): number | string | null {
  if (typeof value === "string" && value.trim()) return value
  return readNumber(value)
}

function readSecret(value: unknown) {
  return {
    is_set:
      typeof value === "object" &&
      value !== null &&
      "is_set" in value &&
      (value as { is_set?: unknown }).is_set === true,
  }
}

function normalizeSettings(data: unknown): SettingsState {
  const root = typeof data === "object" && data !== null ? data : {}
  const globalSource =
    "global" in root && typeof root.global === "object" && root.global !== null
      ? (root.global as Record<string, unknown>)
      : {}
  const branchSource =
    "branch" in root && typeof root.branch === "object" && root.branch !== null
      ? (root.branch as Record<string, unknown>)
      : {}

  return {
    global: {
      school_name: readString(globalSource.school_name),
      school_logo: readString(globalSource.school_logo),
      current_session_id: readSessionId(globalSource.current_session_id),
      sslcommerz_store_id: readString(globalSource.sslcommerz_store_id),
      sslcommerz_store_password: readSecret(
        globalSource.sslcommerz_store_password
      ),
      sslcommerz_sandbox: readBoolean(globalSource.sslcommerz_sandbox),
      mail_from: readString(globalSource.mail_from),
      sms_api_key: readSecret(globalSource.sms_api_key),
      sms_sender_id: readString(globalSource.sms_sender_id),
    },
    branch: {
      partial_payment_enabled: readBoolean(branchSource.partial_payment_enabled),
      late_fee_enabled: readBoolean(branchSource.late_fee_enabled),
      teacher_late_threshold: readString(branchSource.teacher_late_threshold),
      invoice_due_day: readNumber(branchSource.invoice_due_day),
    },
  }
}

export interface UseSettingsOptions {
  enabled?: boolean
  retry?: boolean
}

/**
 * `useSettings()` — reads the effective global + branch settings for the active
 * branch context (`GET /settings`). Branch scoping is handled by the shared
 * branch interceptor / backend context; the query key keeps separate cache
 * entries for each active branch.
 */
export function useSettings(options: UseSettingsOptions = {}) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("settings", "detail", { branch: branchParam }),
    queryFn: () => api.get<unknown>("/settings"),
    select: normalizeSettings,
    staleTime: STALE_TIME.REFERENCE,
    enabled: options.enabled ?? true,
    retry: options.retry,
  })
}

function invalidateSettingsCaches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["settings"] })
  void queryClient.invalidateQueries({ queryKey: ["grading-scales"] })
  void queryClient.invalidateQueries({ queryKey: ["public-settings"] })
}

/**
 * `PUT /settings` — bulk upsert known global/branch keys. Writes invalidate the
 * settings, grading-scale, and public-settings caches per task 6.4.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: SettingsPatch) =>
      normalizeSettings(
        await api.put<unknown>("/settings", {
          settings,
        })
      ),
    onSuccess: () => invalidateSettingsCaches(queryClient),
  })
}

/**
 * `PUT /grading-scales` — replace the whole server-owned grading scale.
 */
export function useUpdateGradingScale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scale: GradingBand[]) =>
      api.put<GradingBand[]>("/grading-scales", {
        scale,
      }),
    onSuccess: () => invalidateSettingsCaches(queryClient),
  })
}
