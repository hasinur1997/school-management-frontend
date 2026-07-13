"use client"

/**
 * Issued transfer certificates list (task 6.2, `GET /tcs`, `tc.view`). A
 * paginated, searchable ledger of every TC issued in the branch, with an
 * inclusive issue-date range. Each row links to the full certificate and offers
 * the stored PDF download (streamed by the API, triggered here only). All four
 * states — loading / empty / error / loaded — are present and responsive
 * (table ≥ md, cards below).
 */

import * as React from "react"
import Link from "next/link"
import { Download, Eye, ScrollText, Search, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { useDownloadTc, useTcs } from "@/hooks/documents"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { toastError, toastSuccess } from "@/lib/toast"
import { formatDate } from "@/lib/format"
import type { TransferCertificate } from "@/types/document"

const EMPTY = "—"

function cohort(tc: TransferCertificate): string {
  const { class: className, section } = tc.student
  if (!className) return EMPTY
  return section ? `${className} · ${section}` : className
}

/** Per-row PDF download button (each row owns its own in-flight state). */
function DownloadButton({ tc }: { tc: TransferCertificate }) {
  const download = useDownloadTc()

  async function onDownload() {
    try {
      await download.mutateAsync(tc)
      toastSuccess("Transfer certificate downloaded.", { id: "tc-download" })
    } catch (err) {
      toastError(err, "Couldn't download the certificate.", {
        id: "tc-download",
      })
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onDownload}
      loading={download.isPending}
      title="Download PDF"
    >
      <Download className="size-4" aria-hidden />
      <span className="hidden sm:inline">PDF</span>
      <span className="sr-only">Download certificate {tc.tc_no}</span>
    </Button>
  )
}

export function TcList() {
  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput, 300)
  const [from, setFrom] = React.useState<string | null>(null)
  const [to, setTo] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }
  function changeFrom(value: string | null) {
    setFrom(value)
    setPage(1)
  }
  function changeTo(value: string | null) {
    setTo(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useTcs({
    search,
    from,
    to,
    page,
  })

  const tcs = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilters =
    search.trim().length > 0 || from != null || to != null

  function clearFilters() {
    setSearchInput("")
    setFrom(null)
    setTo(null)
    setPage(1)
  }

  const rowActions = (tc: TransferCertificate) => (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/documents/tcs/${tc.id}`} title="View certificate">
        <Button variant="ghost" size="sm">
          <Eye className="size-4" aria-hidden />
          <span className="hidden sm:inline">View</span>
          <span className="sr-only">View certificate {tc.tc_no}</span>
        </Button>
      </Link>
      <DownloadButton tc={tc} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-copy-primary">
          Transfer certificates
        </h2>
        <p className="text-sm text-copy-muted">
          Every transfer certificate issued in this branch.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-copy-muted"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search by TC no, student name, or admission no…"
            aria-label="Search transfer certificates"
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from ?? ""}
              onChange={(e) => changeFrom(e.target.value || null)}
              aria-label="Issued from date"
              className="sm:w-40"
            />
            <span className="text-sm text-copy-muted" aria-hidden>
              –
            </span>
            <Input
              type="date"
              value={to ?? ""}
              onChange={(e) => changeTo(e.target.value || null)}
              aria-label="Issued to date"
              className="sm:w-40"
            />
          </div>
          {hasFilters ? (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="size-4" aria-hidden />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {isPending ? (
        <TableSkeleton rows={8} columns={5} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the transfer certificates."
          onRetry={() => void refetch()}
        />
      ) : tcs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={hasFilters ? "No matching certificates" : "No transfer certificates yet"}
          description={
            hasFilters
              ? "No certificates match the current search or filters."
              : "Certificates issued from a student's profile will appear here."
          }
        />
      ) : (
        <>
          <div
            className="hidden overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm md:block"
            aria-busy={isFetching}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TC no</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tcs.map((tc) => (
                  <TableRow key={tc.id}>
                    <TableCell className="font-mono text-xs text-copy-secondary">
                      {tc.tc_no}
                    </TableCell>
                    <TableCell className="font-medium text-copy-primary">
                      <Link
                        href={`/documents/tcs/${tc.id}`}
                        className="hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {tc.student.name_en}
                      </Link>
                      <span className="block text-xs text-copy-muted">
                        {tc.student.admission_no ?? EMPTY}
                      </span>
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {cohort(tc)}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {tc.issue_date ? formatDate(tc.issue_date) : EMPTY}
                    </TableCell>
                    <TableCell className="text-right">{rowActions(tc)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-surface-border px-6 py-3.5">
              <ListPager
                meta={meta}
                page={page}
                lastPage={lastPage}
                unit="certificate"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {tcs.map((tc) => (
              <li
                key={tc.id}
                className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-copy-primary">
                      {tc.student.name_en}
                    </p>
                    <p className="truncate text-xs text-copy-muted">
                      {tc.tc_no} · {cohort(tc)}
                    </p>
                    <p className="truncate text-xs text-copy-muted">
                      {tc.issue_date ? formatDate(tc.issue_date) : EMPTY}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  {rowActions(tc)}
                </div>
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="certificate"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}
    </div>
  )
}
