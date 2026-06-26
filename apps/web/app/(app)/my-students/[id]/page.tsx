"use client"

/**
 * Parent-facing student detail. Reuses the shared `StudentDetail` surface, which
 * is fully permission-gated: a parent holds no `student.update` (so every edit,
 * photo, status, and resend action is hidden) and renders read-only. The API
 * authorizes the read via `StudentPolicy::view` (a linked parent); an unlinked,
 * out-of-branch, or missing record surfaces as not-found inside `StudentDetail`.
 * The back link returns to the parent's `/my-students` list, not the staff list.
 */

import * as React from "react"

import { StudentDetail } from "@/components/students"

export default function MyStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  return (
    <StudentDetail
      id={String(id)}
      backHref="/my-students"
      backLabel="Back to students"
    />
  )
}
