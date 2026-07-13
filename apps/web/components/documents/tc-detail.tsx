"use client"

/**
 * Transfer certificate detail (task 6.2, `GET /tcs/{tc}`, `tc.view`). Renders the
 * imported "Transfer Certificate" design as a live, pixel-exact preview and
 * downloads / prints it as a client-generated PDF (`TcCertificateView`). The
 * full student profile is fetched alongside the certificate so the design's date
 * of birth / admission date (absent from the TC's embedded student summary) are
 * populated. An out-of-branch / missing id surfaces as not-found (the API hides
 * it as `404`).
 */

import * as React from "react"
import Link from "next/link"
import { ScrollText } from "lucide-react"

import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { DetailSkeleton } from "@/components/skeletons"
import { DetailBackLink, DetailLayout } from "@/components/detail/detail-ui"
import { useStudent } from "@/hooks/students"
import { useTc } from "@/hooks/documents"
import { isNotFoundError } from "@/lib/api"
import { TcCertificateView } from "./tc-certificate-view"
import { buildTcPaperData } from "./tc-document"

export function TcDetail({
  id,
  backHref = "/documents",
  backLabel = "Back to documents",
}: {
  id: string
  backHref?: string
  backLabel?: string
}) {
  const { data: tc, isPending, isError, error, refetch } = useTc(id)
  // The full profile carries the design's date of birth / admission date; it's
  // fetched once the TC resolves the student id. A denial/miss just leaves those
  // rows as the empty marker.
  const { data: student } = useStudent(tc?.student.id ?? null)

  if (isPending) {
    return (
      <DetailLayout>
        <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
        <DetailSkeleton />
      </DetailLayout>
    )
  }

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <DetailLayout>
          <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
          <EmptyState
            icon={ScrollText}
            title="Certificate not found"
            description="This transfer certificate doesn't exist, isn't in your branch, or you don't have access."
            action={
              <Link href={backHref}>
                <Button>{backLabel}</Button>
              </Link>
            }
          />
        </DetailLayout>
      )
    }
    return (
      <DetailLayout>
        <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
        <ErrorPanel
          description="We couldn't load this transfer certificate."
          onRetry={() => void refetch()}
        />
      </DetailLayout>
    )
  }

  const data = buildTcPaperData(tc, student)
  const fileName = `tc-${tc.tc_no}`

  return (
    <DetailLayout>
      <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
      <TcCertificateView data={data} fileName={fileName} />
    </DetailLayout>
  )
}
