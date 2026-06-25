"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, UserRoundPlus, Users, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { ListPager } from "@/components/list-pager"
import { TableSkeleton } from "@/components/skeletons"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useParents, useResendParentCredentials } from "@/hooks/parents"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  linkedStudentLabel,
  parentRelationLabel,
  type ParentProfile,
} from "@/types/parent"
import { ConfirmDialog } from "@/components/teachers/confirm-dialog"
import { LinkStudentsDialog } from "./link-students-dialog"
import { ParentFormDialog } from "./parent-form-dialog"
import { ParentRowActions } from "./parent-row-actions"

const EMPTY = "—"

export function ParentsList() {
  const router = useRouter()
  const [searchInput, setSearchInput] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [linkTarget, setLinkTarget] = React.useState<ParentProfile | null>(null)
  const [resendTarget, setResendTarget] = React.useState<ParentProfile | null>(null)
  const resendCredentials = useResendParentCredentials()

  const search = useDebouncedValue(searchInput, 300)
  const { data, isPending, isError, isFetching, refetch } = useParents({ search, page })

  async function confirmResend() {
    if (!resendTarget) return
    try {
      await resendCredentials.mutateAsync(resendTarget.id)
      toastSuccess("Login credentials resent.", { id: "parent-resend" })
      setResendTarget(null)
    } catch (error) {
      toastError(error, "Couldn't resend credentials.", { id: "parent-resend" })
      throw error
    }
  }

  const parents = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasSearch = search.trim().length > 0

  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">Parents</h1>
          <p className="truncate text-sm text-copy-muted">
            Create parent accounts and manage linked students.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:self-start">
          <Plus className="size-4" aria-hidden />
          Create parent
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-copy-muted"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder="Search by parent name or phone…"
            aria-label="Search parents"
            className="h-9 pl-8"
          />
        </div>
        {hasSearch ? (
          <div>
            <Button
              variant="ghost"
              onClick={() => {
                setSearchInput("")
                setPage(1)
              }}
            >
              <X className="size-4" aria-hidden />
              Clear search
            </Button>
          </div>
        ) : null}
      </div>

      {isPending ? (
        <TableSkeleton rows={8} columns={4} />
      ) : isError ? (
        <ErrorPanel description="We couldn't load the parents." onRetry={() => void refetch()} />
      ) : parents.length === 0 ? (
        <EmptyState
          icon={UserRoundPlus}
          title={hasSearch ? "No matching parents" : "No parents yet"}
          description={
            hasSearch
              ? "No parent accounts match the current search."
              : "Create a parent account and link it to a student."
          }
          action={
            hasSearch ? undefined : (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden />
                Create parent
              </Button>
            )
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
                  <TableHead>Parent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Linked students</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.map((parent) => (
                  <TableRow
                    key={parent.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/parents/${parent.id}`)}
                  >
                    <TableCell>
                      <ParentIdentity parent={parent} />
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-mono text-sm">{parent.phone || EMPTY}</span>
                        <span className="truncate text-xs text-copy-muted">
                          {parent.email || "No email"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <LinkedStudentsSummary parent={parent} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <ParentRowActions
                        label={parent.name}
                        onView={() => router.push(`/parents/${parent.id}`)}
                        onLinkStudents={() => setLinkTarget(parent)}
                        onResendCredentials={() => setResendTarget(parent)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-surface-border px-6 py-3.5">
              <ListPager
                meta={meta}
                page={page}
                lastPage={lastPage}
                unit="parent"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {parents.map((parent) => (
              <li
                key={parent.id}
                className="rounded-xl border border-surface-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => router.push(`/parents/${parent.id}`)}
                  >
                    <ParentIdentity parent={parent} />
                  </button>
                  <ParentRowActions
                    label={parent.name}
                    onView={() => router.push(`/parents/${parent.id}`)}
                    onLinkStudents={() => setLinkTarget(parent)}
                    onResendCredentials={() => setResendTarget(parent)}
                  />
                </div>
                <div className="mt-3 grid gap-1 text-sm text-copy-secondary">
                  <p className="font-mono">{parent.phone || EMPTY}</p>
                  <p className="truncate text-copy-muted">{parent.email || "No email"}</p>
                </div>
                <div className="mt-3">
                  <LinkedStudentsSummary parent={parent} />
                </div>
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="parent"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}

      <ParentFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <LinkStudentsDialog
        open={linkTarget != null}
        onOpenChange={(open) => !open && setLinkTarget(null)}
        parent={linkTarget}
      />
      <ConfirmDialog
        open={resendTarget != null}
        onOpenChange={(open) => !open && setResendTarget(null)}
        title="Resend credentials"
        description={
          resendTarget ? (
            <>
              Generate and email fresh login credentials to{" "}
              <span className="font-medium">{resendTarget.name}</span>
              {resendTarget.email ? ` (${resendTarget.email})` : ""}? The parent
              needs an email address on file to receive them.
            </>
          ) : null
        }
        confirmLabel="Resend"
        pendingLabel="Sending…"
        onConfirm={confirmResend}
      />
    </div>
  )
}

function ParentIdentity({ parent }: { parent: ParentProfile }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-dim text-sm font-semibold text-brand">
        {parentInitials(parent.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-copy-primary">{parent.name || EMPTY}</p>
        <p className="truncate text-xs text-copy-muted">
          {parentRelationLabel(parent.relation)}
        </p>
      </div>
    </div>
  )
}

function LinkedStudentsSummary({ parent }: { parent: ParentProfile }) {
  const students = parent.students ?? []
  if (students.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-copy-muted">
        <Users className="size-4" aria-hidden />
        No linked students
      </div>
    )
  }

  const preview = students.slice(0, 2).map(linkedStudentLabel).join(", ")
  const remaining = students.length > 2 ? ` +${students.length - 2} more` : ""

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Badge variant="outline">{students.length} linked</Badge>
      <span className="min-w-0 truncate text-sm text-copy-muted">
        {preview}
        {remaining}
      </span>
    </div>
  )
}

function parentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "P"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
