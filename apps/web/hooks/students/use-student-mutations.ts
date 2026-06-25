"use client"

/**
 * Student write mutations (task 2.7):
 *   - `POST  /students`             — create a student directly (office path)
 *   - `PUT   /students/{id}`        — update mutable profile fields
 *   - `PATCH /students/{id}/status` — flip active/inactive (tc is rejected — 422)
 *   - `POST  /students/{id}/photo`  — upload/replace photo (multipart)
 *   - `POST  /students/{id}/resend-credentials` — re-dispatch login credentials
 *
 * Each invalidates the `["students"]` key so the list and detail refetch after a
 * write. The API stays authoritative on validation (`422` → field errors at the
 * form), the immutable identity columns, the tc-status guard, and branch scoping
 * (`branch_id` via the interceptor).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  EnrollmentUpdateInput,
  Student,
  StudentCreateInput,
  StudentEnrollment,
  StudentStatusValue,
  StudentUpdateInput,
} from "@/types/student"

function useInvalidateStudents() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["students"] })
  }
}

export function useCreateStudent() {
  const invalidate = useInvalidateStudents()
  return useMutation({
    mutationFn: (input: StudentCreateInput) => api.post<Student>("/students", input),
    onSuccess: invalidate,
  })
}

export function useUpdateStudent() {
  const invalidate = useInvalidateStudents()
  return useMutation({
    mutationFn: ({ id, ...input }: StudentUpdateInput & { id: string }) =>
      api.put<Student>(`/students/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useUpdateEnrollment() {
  const invalidate = useInvalidateStudents()
  return useMutation({
    mutationFn: ({
      studentId,
      enrollmentId,
      ...input
    }: EnrollmentUpdateInput & { studentId: string; enrollmentId: string }) =>
      api.put<StudentEnrollment>(
        `/students/${studentId}/enrollments/${enrollmentId}`,
        input
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateStudentStatus() {
  const invalidate = useInvalidateStudents()
  return useMutation({
    // Only "active" | "inactive" are accepted here; tc is owned by the TC module.
    mutationFn: ({ id, status }: { id: string; status: Extract<StudentStatusValue, "active" | "inactive"> }) =>
      api.patch<Student>(`/students/${id}/status`, { status }),
    onSuccess: invalidate,
  })
}

export function useUploadStudentPhoto() {
  const invalidate = useInvalidateStudents()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const body = new FormData()
      body.append("photo", file)
      return api.post<Student>(`/students/${id}/photo`, body)
    },
    onSuccess: invalidate,
  })
}

export function useResendStudentCredentials() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<null>(`/students/${id}/resend-credentials`),
  })
}
