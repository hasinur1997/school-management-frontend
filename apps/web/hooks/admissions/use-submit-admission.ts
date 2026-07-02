"use client"

/**
 * `useSubmitAdmission()` — submits the public application as multipart/form-data
 * to `POST /public/admissions` (task 2.5). Returns the `application_no` (and an
 * `invoice_id` when an admission payment is required).
 *
 * Public/unauthenticated: no token is sent. The caller builds the `FormData`
 * (see `build-form-data.ts`) so only documented fields are submitted; Axios sets
 * the multipart boundary from the `FormData` instance.
 */

import { useMutation } from "@tanstack/react-query"

import { publicApi } from "@/lib/api"
import type { AdmissionSubmitResponse } from "@/types/admission"

export function useSubmitAdmission() {
  return useMutation({
    mutationFn: (form: FormData) =>
      publicApi.post<AdmissionSubmitResponse>("/public/admissions", form),
  })
}
