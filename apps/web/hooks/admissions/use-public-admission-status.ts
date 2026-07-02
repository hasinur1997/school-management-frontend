"use client"

/**
 * `usePublicAdmissionStatus({ applicationNo, dateOfBirth })` — the public
 * status-check lookup (task 2.9). Reads
 * `GET /public/admissions/{application_no}/status?date_of_birth=YYYY-MM-DD`.
 *
 * Public/unauthenticated and disabled until BOTH the application number and the
 * date of birth are present (the lookup form validates this before submit). A
 * `404` (or the backend's "not found" response) surfaces as an `ApiNotFoundError`
 * and is **not** retried; network/5xx retry once per the shared client config so
 * the caller can keep those failure modes separate from "not found".
 *
 * Distinct from `useAdmissionStatus` (task 2.5), which the in-session payment
 * flow uses without a date-of-birth check.
 */

import { useQuery } from "@tanstack/react-query"

import { publicApi, queryKey, STALE_TIME } from "@/lib/api"
import type { AdmissionStatus } from "@/types/admission"

export interface PublicAdmissionStatusArgs {
  applicationNo: string | null
  dateOfBirth: string | null
}

export function usePublicAdmissionStatus({
  applicationNo,
  dateOfBirth,
}: PublicAdmissionStatusArgs) {
  const enabled = !!applicationNo && !!dateOfBirth

  return useQuery({
    queryKey: queryKey("admissions", "status-check", {
      applicationNo: applicationNo ?? "",
      dateOfBirth: dateOfBirth ?? "",
    }),
    queryFn: () => {
      const search = new URLSearchParams({
        date_of_birth: dateOfBirth as string,
      })
      return publicApi.get<AdmissionStatus>(
        `/public/admissions/${encodeURIComponent(applicationNo as string)}/status?${search}`
      )
    },
    enabled,
    staleTime: STALE_TIME.SHORT,
  })
}
