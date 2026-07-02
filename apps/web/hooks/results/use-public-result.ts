"use client"

/**
 * Public result lookup (task 4.3.1). This reads the standalone, unauthenticated
 * endpoint and runs only after a submitted URL state provides every required
 * field. The API owns all result computation; consumers display returned values.
 */

import { useQuery } from "@tanstack/react-query"

import { publicApi, queryKey, STALE_TIME } from "@/lib/api"
import type { PublicResult, PublicResultLookupParams } from "@/types/result"

function cleanPublicResultParams(
  params: PublicResultLookupParams | null
): PublicResultLookupParams | null {
  if (!params) return null

  const cleaned = {
    roll_no: params.roll_no.trim(),
    branch_id: params.branch_id.trim(),
    class_id: params.class_id.trim(),
    year: params.year.trim(),
    semester: params.semester.trim(),
  }

  return Object.values(cleaned).every(Boolean) ? cleaned : null
}

export function usePublicResultLookup(
  params: PublicResultLookupParams | null
) {
  const query = cleanPublicResultParams(params)

  return useQuery({
    queryKey: queryKey(
      "public-results",
      "lookup",
      query ? { ...query } : {}
    ),
    queryFn: () =>
      publicApi.get<PublicResult>("/public/results", { params: query }),
    enabled: query !== null,
    retry: false,
    staleTime: STALE_TIME.STANDARD,
    select: (data): PublicResult => ({
      student_information: data?.student_information ?? null,
      subjects: Array.isArray(data?.subjects) ? data.subjects : [],
    }),
  })
}
