"use client"

/**
 * `useStudentOutstandingInvoices(studentId)` — every invoice for one student
 * that still has a balance (unpaid or partial), for the "collect payment across
 * all invoices" flow (task F-5.3 follow-up). Reads the staff list
 * (`GET /invoices?student_id=&per_page=100`) and filters to those with an
 * outstanding balance; a student's monthly invoices comfortably fit one page
 * (the backend caps `per_page` at 100), so no paging is needed here.
 *
 * Staff-only (the list requires `invoice.view`); the counter-collect action it
 * feeds is itself gated by `fee.collect`. The API stays the real boundary.
 */

import { useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import { invoiceHasOutstanding, type Invoice } from "@/types/invoice"

/** Page size for the one-shot fetch — the backend's `per_page` ceiling. */
const OUTSTANDING_PER_PAGE = 100

export function useStudentOutstandingInvoices(
  studentId: string | undefined,
  enabled = true
) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("invoices", "outstanding", {
      student_id: studentId ?? "",
      branch: branchParam,
    }),
    queryFn: async () => {
      const { data } = await requestPaginated<Invoice>("/invoices", {
        params: { student_id: studentId, per_page: OUTSTANDING_PER_PAGE },
      })
      return data.filter(invoiceHasOutstanding)
    },
    enabled: enabled && !!studentId,
    staleTime: STALE_TIME.STANDARD,
  })
}
