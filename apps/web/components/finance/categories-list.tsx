"use client"

/**
 * Category manager (task F-5.6, backend 11.1): a paginated, type-filterable list
 * of the income/expense categories that feed every `CategorySelect`. Reads
 * `useCategoriesList`; writes invalidate the `["categories"]` cache so the list
 * and all selects refresh together. All four states — loading / empty / error /
 * loaded — are present and the layout is responsive (table ≥ md, cards below).
 *
 * Gated on `income.manage` OR `expense.manage` (the same guard the backend puts
 * on category CRUD). Deleting a category still referenced by income/expense rows
 * is rejected server-side with `409` — the confirm surfaces that message.
 */

import * as React from "react"
import { Pencil, Plus, Tags, Trash2 } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { useCategoriesList, useDeleteCategory } from "@/hooks/finance"
import { usePermission } from "@/hooks/auth/use-permission"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  CATEGORY_TYPE_LABELS,
  type Category,
  type CategoryType,
} from "@/types/finance"
import { INCOME_MANAGE, EXPENSE_MANAGE } from "./permissions"
import { CategoryFormDialog } from "./category-form-dialog"

const ALL = "all"

// Categories are grouped as income or expense; the badge tone mirrors the
// income/expense ledgers (income reads as a positive success, expense neutral).
const TYPE_TONE: Record<CategoryType, "success" | "neutral"> = {
  income: "success",
  expense: "neutral",
}

export function CategoriesList() {
  const [type, setType] = React.useState<CategoryType | null>(null)
  const [page, setPage] = React.useState(1)

  function changeType(next: string | null) {
    setType(!next || next === ALL ? null : (next as CategoryType))
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useCategoriesList({
    type: type ?? undefined,
    page,
  })

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Category | undefined>()
  const [deleteTarget, setDeleteTarget] = React.useState<Category | null>(null)

  const canIncome = usePermission(INCOME_MANAGE)
  const canExpense = usePermission(EXPENSE_MANAGE)
  const canManage = canIncome || canExpense
  const deleteCategory = useDeleteCategory()

  const categories = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilter = type != null

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteCategory.mutateAsync(deleteTarget.id)
      toastSuccess("Category deleted.", { id: "category-delete" })
      setDeleteTarget(null)
    } catch (error) {
      // A `409` here means the category is still in use — surface the API
      // message and keep the dialog open so the user can back out.
      toastError(error, "Couldn't delete the category.", {
        id: "category-delete",
      })
      throw error
    }
  }

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(category: Category) {
    setEditing(category)
    setFormOpen(true)
  }

  const createButton = canManage ? (
    <Button onClick={openCreate}>
      <Plus className="size-4" aria-hidden />
      New category
    </Button>
  ) : null

  const rowActions = (category: Category) => {
    if (!canManage) return null
    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEdit(category)}
          title="Edit category"
        >
          <Pencil className="size-4" aria-hidden />
          <span className="sr-only">Edit {category.name}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteTarget(category)}
          title="Delete category"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          <span className="sr-only">Delete {category.name}</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-copy-primary">
            Categories
          </h2>
          <p className="truncate text-sm text-copy-muted">
            Income and expense categories used across finance entries.
          </p>
        </div>
        {createButton}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3 sm:flex-row sm:items-center">
        <div className="sm:w-48">
          <Select value={type ?? ALL} onValueChange={changeType}>
            <SelectTrigger className="w-full" aria-label="Filter by type">
              <SelectValue placeholder="All types">
                {(v: string) =>
                  v === ALL
                    ? "All types"
                    : (CATEGORY_TYPE_LABELS[v as CategoryType] ?? "All types")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              <SelectItem value="income">
                {CATEGORY_TYPE_LABELS.income}
              </SelectItem>
              <SelectItem value="expense">
                {CATEGORY_TYPE_LABELS.expense}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending ? (
        <TableSkeleton rows={8} columns={canManage ? 3 : 2} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the categories."
          onRetry={() => void refetch()}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={hasFilter ? "No matching categories" : "No categories yet"}
          description={
            hasFilter
              ? "No categories match the current type filter."
              : "Add a category to get started."
          }
          action={hasFilter ? undefined : (createButton ?? undefined)}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  {canManage ? (
                    <TableHead className="w-px text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium text-copy-primary">
                      {category.name}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={CATEGORY_TYPE_LABELS[category.type]}
                        tone={TYPE_TONE[category.type]}
                      />
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        {rowActions(category)}
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
                unit="category"
                unitPlural="categories"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface p-4"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate font-medium text-copy-primary">
                    {category.name}
                  </p>
                  <StatusBadge
                    status={CATEGORY_TYPE_LABELS[category.type]}
                    tone={TYPE_TONE[category.type]}
                    className="w-fit"
                  />
                </div>
                {rowActions(category)}
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="category"
              unitPlural="categories"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
      />

      <DeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete category"
        description={
          deleteTarget ? (
            <>
              Delete{" "}
              <span className="font-medium">{deleteTarget.name}</span>? A category
              still used by income or expense entries can&apos;t be deleted.
            </>
          ) : null
        }
        onConfirm={confirmDelete}
      />
    </div>
  )
}
