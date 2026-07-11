"use client"

/**
 * Category write mutations (task F-5.6, backend 11.1):
 *   - `POST   /categories`      — create a category (branch stamped server-side)
 *   - `PUT    /categories/{id}` — rename/re-type a category
 *   - `DELETE /categories/{id}` — delete a category
 *
 * Each invalidates the `["categories"]` key so both the manager list and every
 * cached `CategorySelect` refetch after a write. The API stays authoritative:
 * the `(branch, name, type)` uniqueness rule is a `422` on `name`, and deleting
 * a category still referenced by income/expense rows is rejected with `409`.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Category, CategoryInput } from "@/types/finance"

function useInvalidateCategories() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["categories"] })
  }
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      api.post<Category>("/categories", input),
    onSuccess: invalidate,
  })
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: ({ id, ...input }: CategoryInput & { id: string }) =>
      api.put<Category>(`/categories/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/categories/${id}`),
    onSuccess: invalidate,
  })
}
