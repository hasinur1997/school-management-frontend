"use client"

/**
 * Student detail route (task 2.7). Unlike the list, the profile is *not* gated on
 * `student.view` client-side: the API authorizes it via `StudentPolicy::view`
 * (staff, the student itself, or a linked parent), so a student/parent session
 * can open its own record without the staff list permission. An unauthorized,
 * out-of-branch, or missing record surfaces as not-found inside `StudentDetail`
 * (the API hides it as `404`). `params` is a promise, unwrapped with `React.use`.
 */

import * as React from "react"

import { StudentDetail } from "@/components/students"

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  return <StudentDetail id={String(id)} />
}
