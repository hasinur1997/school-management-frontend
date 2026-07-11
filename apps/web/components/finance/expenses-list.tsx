"use client"

/**
 * Expense ledger (task F-5.4, backend 11.3): a paginated, filterable table with
 * a mobile card list and a create/edit dialog. Reads `useExpenses`; writes
 * invalidate the cache. Filters by category, an inclusive date range, and an
 * item-name search (debounced). All four states — loading / empty / error /
 * loaded — are present and the layout is responsive (table ≥ md, cards below).
 *
 * Money renders from the API's decimal string via `formatMoney` (no float math);
 * no client-side aggregation — totals come from the API. Every expense is
 * user-created, so all rows are editable/deletable (with `expense.manage`).
 */

import * as React from "react"
import { Pencil, Plus, TrendingDown, Trash2 } from "lucide-react"

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
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useExpenses, useDeleteExpense, useCategories } from "@/hooks/finance"
import { usePermission } from "@/hooks/auth/use-permission"
import { toastError, toastSuccess } from "@/lib/toast"
import { formatDate, formatMoney } from "@/lib/format"
import type { Expense } from "@/types/finance"
import { EXPENSE_MANAGE } from "./permissions"
import { ExpenseFormDialog } from "./expense-form-dialog"
import {
  FinanceFilters,
  type FinanceFiltersValue,
} from "./finance-filters"

const EMPTY = "—"

export function ExpensesList() {
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

  const { data, isPending, isError, isFetching, refetch } = useExpenses({
    category_id: categoryId,
    from,
    to,
    search: debouncedSearch.trim() || null,
    page,
  })

  // The row carries only the category id hash; map it to a name via the cached
  // expense-category list (same source as the filter/form select).
  const { data: categories } = useCategories("expense")
  const categoryName = React.useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.name]))
    return (id: string | null | undefined) => (id ? (map.get(id) ?? null) : null)
  }, [categories])

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Expense | undefined>()
  const [deleteTarget, setDeleteTarget] = React.useState<Expense | null>(null)

  const canManage = usePermission(EXPENSE_MANAGE)
  const deleteExpense = useDeleteExpense()

  const expenses = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const filters: FinanceFiltersValue = { categoryId, from, to, search }
  const hasFilters =
    categoryId != null || from != null || to != null || search.trim() !== ""

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteExpense.mutateAsync(deleteTarget.id)
      toastSuccess("Expense deleted.", { id: "expense-delete" })
      setDeleteTarget(null)
    } catch (error) {
      toastError(error, "Couldn't delete the expense.", {
        id: "expense-delete",
      })
      throw error
    }
  }

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(expense: Expense) {
    setEditing(expense)
    setFormOpen(true)
  }

  const createButton = (
    <Can permission={EXPENSE_MANAGE}>
      <Button onClick={openCreate}>
        <Plus className="size-4" aria-hidden />
        New expense
      </Button>
    </Can>
  )

  const rowActions = (expense: Expense) => (
    <Can permission={EXPENSE_MANAGE}>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEdit(expense)}
          title="Edit expense"
        >
          <Pencil className="size-4" aria-hidden />
          <span className="sr-only">Edit {expense.item_name}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteTarget(expense)}
          title="Delete expense"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          <span className="sr-only">Delete {expense.item_name}</span>
        </Button>
      </div>
    </Can>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-copy-primary">
            Expenses
          </h2>
          <p className="truncate text-sm text-copy-muted">
            Manual expense entries for this branch.
          </p>
        </div>
        {createButton}
      </div>

      <FinanceFilters
        type="expense"
        value={filters}
        onCategoryChange={changeCategory}
        onFromChange={changeFrom}
        onToChange={changeTo}
        onSearchChange={changeSearch}
        onClear={clearFilters}
        searchPlaceholder="Search item…"
      />

      {isPending ? (
        <TableSkeleton rows={8} columns={canManage ? 5 : 4} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the expense entries."
          onRetry={() => void refetch()}
        />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title={hasFilters ? "No matching expenses" : "No expenses yet"}
          description={
            hasFilters
              ? "No expense entries match the current filters."
              : "Record an expense entry to get started."
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
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {canManage ? (
                    <TableHead className="w-px text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap text-copy-secondary tabular-nums">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell className="font-medium text-copy-primary">
                      <span className="block">{expense.item_name}</span>
                      {expense.description ? (
                        <span className="block max-w-xs truncate text-xs font-normal text-copy-muted">
                          {expense.description}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {categoryName(expense.category_id) ?? EMPTY}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-copy-primary">
                      {formatMoney(expense.amount)}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        {rowActions(expense)}
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
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-copy-primary">
                    {expense.item_name}
                  </p>
                  <p className="truncate text-xs text-copy-muted">
                    {[formatDate(expense.date), categoryName(expense.category_id)]
                      .filter((v) => v && v !== EMPTY)
                      .join(" · ") || EMPTY}
                  </p>
                </div>
                {expense.description ? (
                  <p className="text-sm text-copy-secondary">
                    {expense.description}
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium tabular-nums text-copy-primary">
                    {formatMoney(expense.amount)}
                  </p>
                  {rowActions(expense)}
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

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={editing}
      />

      <DeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete expense"
        description={
          deleteTarget ? (
            <>
              Delete{" "}
              <span className="font-medium">{deleteTarget.item_name}</span>? This
              can&apos;t be undone.
            </>
          ) : null
        }
        onConfirm={confirmDelete}
      />
    </div>
  )
}
