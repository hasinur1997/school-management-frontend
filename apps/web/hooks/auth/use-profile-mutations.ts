"use client"

/**
 * Self-service profile mutations for the signed-in user:
 *   - `PUT  /auth/profile`        — update own name / email / phone
 *   - `POST /auth/photo`          — upload own avatar (multipart `photo`)
 *
 * Both invalidate the `["auth","me"]` key so the `AuthProvider` context (which
 * owns the `GET /auth/me` query) refetches and every surface bound to it — the
 * topbar avatar, user menu, and this page — reflects the change. The API stays
 * authoritative on validation (`422` → field errors at the form) and storage.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api, queryKey } from "@/lib/api"
import type { AuthUser, ProfileUpdateInput } from "@/types/auth"

function useInvalidateMe() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKey("auth", "me") })
  }
}

export function useUpdateProfile() {
  const invalidate = useInvalidateMe()
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) =>
      api.put<AuthUser>("/auth/profile", input),
    onSuccess: invalidate,
  })
}

export function useUploadAvatar() {
  const invalidate = useInvalidateMe()
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData()
      body.append("photo", file)
      return api.post<AuthUser>("/auth/photo", body)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteAvatar() {
  const invalidate = useInvalidateMe()
  return useMutation({
    mutationFn: () => api.delete<AuthUser>("/auth/photo"),
    onSuccess: invalidate,
  })
}
