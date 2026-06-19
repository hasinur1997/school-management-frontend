"use client"

/**
 * `POST /auth/change-password` mutation. Runs through the shared Axios client
 * (in-memory bearer token), so a `401` is handled centrally. The dialog maps a
 * `422` back onto its fields; success shows a toast.
 */

import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api"

export interface ChangePasswordInput {
  current_password: string
  password: string
  password_confirmation: string
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      api.post<null>("/auth/change-password", input),
  })
}
