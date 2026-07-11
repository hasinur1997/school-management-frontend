"use client"

/**
 * Finance container (task F-5.4). Splits the module into tabs: **Income** and
 * **Expenses**, each its own paginated ledger. Only the tabs the user is
 * permitted to see are rendered — `income.manage` unlocks Income, `expense.manage`
 * unlocks Expenses — and the active tab is mirrored into `?tab=` so the selection
 * survives a refresh and is shareable.
 *
 * Super-admin branch scoping is handled by the shell's branch switcher — it folds
 * the active branch into the shared read query keys and the API attaches
 * `branch_id`, so switching branch re-scopes both ledgers. Non-super-admin users
 * are auto-scoped by the API.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { usePermission } from "@/hooks/auth/use-permission"
import { IncomesList } from "./incomes-list"
import { ExpensesList } from "./expenses-list"
import { INCOME_MANAGE, EXPENSE_MANAGE } from "./permissions"

// Segmented-control tab styling shared with the other tabbed screens (Academic,
// Attendance) — subtle track + surface-filled active pill.
const tabTriggerClass =
  "h-9 flex-none rounded-lg px-4 text-sm font-medium text-copy-muted data-active:bg-surface data-active:text-copy-primary data-active:shadow-sm"

export function FinanceManagement() {
  const canIncome = usePermission(INCOME_MANAGE)
  const canExpense = usePermission(EXPENSE_MANAGE)

  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const values: string[] = []
  if (canIncome) values.push("income")
  if (canExpense) values.push("expenses")

  const fromUrl = params.get("tab")
  const fallback = values[0] ?? "income"
  const active = fromUrl && values.includes(fromUrl) ? fromUrl : fallback

  const onValueChange = (next: string) => {
    const search = new URLSearchParams(params.toString())
    // The first available tab is the default — keep its URL clean (no param).
    if (next === fallback) search.delete("tab")
    else search.set("tab", next)
    const query = search.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-copy-primary">
          Finance
        </h1>
        <p className="truncate text-sm text-copy-muted">
          Income and expense entries for this branch.
        </p>
      </div>

      <Tabs value={active} onValueChange={onValueChange} className="gap-6">
        <TabsList className="inline-flex h-auto w-fit max-w-full flex-wrap justify-start gap-1 rounded-xl bg-subtle p-1">
          {canIncome ? (
            <TabsTrigger value="income" className={tabTriggerClass}>
              Income
            </TabsTrigger>
          ) : null}
          {canExpense ? (
            <TabsTrigger value="expenses" className={tabTriggerClass}>
              Expenses
            </TabsTrigger>
          ) : null}
        </TabsList>

        {canIncome ? (
          <TabsContent value="income">
            <IncomesList />
          </TabsContent>
        ) : null}
        {canExpense ? (
          <TabsContent value="expenses">
            <ExpensesList />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
