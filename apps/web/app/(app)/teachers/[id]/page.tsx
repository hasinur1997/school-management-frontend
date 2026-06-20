"use client"

/**
 * Teacher detail route (task 2.4). Gates on `teachers.view`; an invalid id or
 * out-of-branch record surfaces as not-found inside `TeacherDetail`. `params` is
 * a promise in the App Router, unwrapped with `React.use`.
 */

import * as React from "react"
import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { TeacherDetail, TEACHER_VIEW } from "@/components/teachers"

export default function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const canView = usePermission(TEACHER_VIEW)
  const teacherId = Number(id)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to view teachers."
      />
    )
  }

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return (
      <EmptyState
        title="Teacher not found"
        description="This teacher reference is invalid."
      />
    )
  }

  return <TeacherDetail id={teacherId} />
}
