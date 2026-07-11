"use client"

/**
 * Income ledger (task F-5.4, backend 11.2): a paginated, filterable table with a
 * mobile card list and a create/edit dialog. Reads `useIncomes`; writes
 * invalidate the cache. Filters by category, an inclusive date range, and a
 * title search (debounced). All four states — loading / empty / error / loaded —
 * are present and the layout is responsive (table ≥ md, cards below).
 *
 * **System-generated fee income** (`is_system`) is flagged with a badge and is
 * read-only: its row actions are hidden and the API rejects any edit/delete with
 * `403`. Money renders from the API's decimal string via `formatMoney` (no float
 * math); no client-side aggregation — totals come from the API.
 */

import * as React from "react"
import { Pencil, Plus, TrendingUp, Trash2 } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useIncomes, useDeleteIncome, useCategories } from "@/hooks/finance"
import { usePermission } from "@/hooks/auth/use-permission"
import { toastError, toastSuccess } from "@/lib/toast"
import { formatDate, formatMoney } from "@/lib/format"
import type { Income } from "@/types/finance"
import { INCOME_MANAGE } from "./permissions"
import { IncomeFormDialog } from "./income-form-dialog"
import {
  FinanceFilters,
  type FinanceFiltersValue,
} from "./finance-filters"

const EMPTY = "—"

export function IncomesList() {
  const [categoryId, setCategoryId] = React.useState<string | null>(null)
  const [from, setFrom] = React.useState<string | null>(null)
  const [to, setTo] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)

  const debouncedSearch = useDebouncedValue(search, 300)

  // Changing any filter resets to the first page.
  function changeCategory(value: string | null) {
    setCategoryId(value)
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
  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
  }
  function clearFilters() {
    setCategoryId(null)
    setFrom(null)
    setTo(null)
    setSearch("")
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useIncomes({
    category_id: categoryId,
    from,
    to,
    search: debouncedSearch.trim() || null,
    page,
  })

  // The row carries only the category id hash; map it to a name via the cached
  // income-category list (same source as the filter/form select).
  const { data: categories } = useCategories("income")
  const categoryName = React.useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.name]))
    return (id: string | null | undefined) => (id ? (map.get(id) ?? null) : null)
  }, [categories])

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Income | undefined>()
  const [deleteTarget, setDeleteTarget] = React.useState<Income | null>(null)

  const canManage = usePermission(INCOME_MANAGE)
  const deleteIncome = useDeleteIncome()

  const incomes = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const filters: FinanceFiltersValue = { categoryId, from, to, search }
  const hasFilters =
    categoryId != null || from != null || to != null || search.trim() !== ""

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteIncome.mutateAsync(deleteTarget.id)
      toastSuccess("Income deleted.", { id: "income-delete" })
      setDeleteTarget(null)
    } catch (error) {
      // A `403` here means a system-generated row slipped through; surface the
      // API message and keep the dialog open so the user can back out.
      toastError(error, "Couldn't delete the income.", { id: "income-delete" })
      throw error
    }
  }

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(income: Income) {
    setEditing(income)
    setFormOpen(true)
  }

  const createButton = (
    <Can permission={INCOME_MANAGE}>
      <Button onClick={openCreate}>
        <Plus className="size-4" aria-hidden />
        New income
      </Button>
    </Can>
  )

  // Row actions — hidden for system-generated rows (immutable) and when the
  // user lacks `income.manage`.
  const rowActions = (income: Income) => {
    if (!canManage) return null
    if (income.is_system) {
      return (
        <StatusBadge status="System" tone="info" />
      )
    }
    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEdit(income)}
          title="Edit income"
        >
          <Pencil className="size-4" aria-hidden />
          <span className="sr-only">Edit {income.title}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteTarget(income)}
          title="Delete income"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          <span className="sr-only">Delete {income.title}</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-copy-primary">
            Income
          </h2>
          <p className="truncate text-sm text-copy-muted">
            Manual income entries plus system-generated fee income.
          </p>
        </div>
        {createButton}
      </div>

      <FinanceFilters
        type="income"
        value={filters}
        onCategoryChange={changeCategory}
        onFromChange={changeFrom}
        onToChange={changeTo}
        onSearchChange={changeSearch}
        onClear={clearFilters}
        searchPlaceholder="Search title…"
      />

      {isPending ? (
        <TableSkeleton rows={8} columns={canManage ? 5 : 4} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the income entries."
          onRetry={() => void refetch()}
        />
      ) : incomes.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title={hasFilters ? "No matching income" : "No income yet"}
          description={
            hasFilters
              ? "No income entries match the current filters."
              : "Record an income entry to get started."
          }
          action={hasFilters ? undefined : createButton}
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
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {canManage ? (
                    <TableHead className="w-px text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="whitespace-nowrap text-copy-secondary tabular-nums">
                      {formatDate(income.date)}
                    </TableCell>
                    <TableCell className="font-medium text-copy-primary">
                      <span className="block">{income.title}</span>
                      {income.description ? (
                        <span className="block max-w-xs truncate text-xs font-normal text-copy-muted">
                          {income.description}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {categoryName(income.category_id) ?? EMPTY}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-copy-primary">
                      {formatMoney(income.amount)}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        {rowActions(income)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-surface-border px-6 py-3.5">
              <ListPager
                meta={meta}
                page={page}
                lastPage={lastPage}
                unit="entry"
                unitPlural="entries"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {incomes.map((income) => (
              <li
                key={income.id}
                className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-copy-primary">
                      {income.title}
                    </p>
                    <p className="truncate text-xs text-copy-muted">
                      {[
                        formatDate(income.date),
                        categoryName(income.category_id),
                      ]
                        .filter((v) => v && v !== EMPTY)
                        .join(" · ") || EMPTY}
                    </p>
                  </div>
                  {income.is_system ? (
                    <StatusBadge status="System" tone="info" />
                  ) : null}
                </div>
                {income.description ? (
                  <p className="text-sm text-copy-secondary">
                    {income.description}
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium tabular-nums text-copy-primary">
                    {formatMoney(income.amount)}
                  </p>
                  {income.is_system ? null : rowActions(income)}
                </div>
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="entry"
              unitPlural="entries"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}

      <IncomeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        income={editing}
      />

      <DeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete income"
        description={
          deleteTarget ? (
            <>
              Delete{" "}
              <span className="font-medium">{deleteTarget.title}</span>? This
              can&apos;t be undone.
            </>
          ) : null
        }
        onConfirm={confirmDelete}
      />
    </div>
  )
}
