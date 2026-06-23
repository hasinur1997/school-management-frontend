"use client"

/**
 * Active-branch context for super-admin sessions (task 1.5).
 *
 * Only super admin can switch branch context (`architecture-context.md`). This
 * provider:
 *   1. keeps the selected branch (`null` = all branches / consolidated),
 *      persisted in localStorage and restored on load;
 *   2. mirrors it into the API branch bridge (`lib/api/branch`) so the request
 *      interceptor forwards `branch_id` on every call;
 *   3. invalidates branch-scoped queries when the branch changes so the UI
 *      re-fetches under the new scope.
 *
 * Non-super-admin users keep the branch at `null` forever — they never send
 * `branch_id`; the API scopes their data automatically.
 */

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { setActiveBranchId } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"

const STORAGE_KEY = "active_branch_id"

export interface BranchContextValue {
  /** Whether the current user may switch branch context. */
  isSuperAdmin: boolean
  /** Selected branch id; `null` = all branches (consolidated) / not super admin. */
  activeBranchId: string | null
  /** Switch branch (super admin only); `null` selects all branches. */
  setActiveBranch: (id: string | null) => void
  /**
   * Value to fold into query keys so cache entries are scoped per branch
   * (`code-standards.md`, API Access). `undefined` for non-super-admin so their
   * keys carry no branch.
   */
  branchParam: string | undefined
}

const BranchContext = React.createContext<BranchContextValue | null>(null)

/** Access the active-branch context. Throws if used outside the provider. */
export function useBranch(): BranchContextValue {
  const ctx = React.useContext(BranchContext)
  if (!ctx) {
    throw new Error("useBranch must be used within <BranchProvider>")
  }
  return ctx
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuth()
  const queryClient = useQueryClient()

  // Restore the persisted branch (super admin only) during the first render so
  // the bridge is set before any branch-scoped query fires.
  const [activeBranchId, setActiveBranchIdState] = React.useState<string | null>(
    () => {
      if (!isSuperAdmin || typeof window === "undefined") return null
      const stored = window.localStorage.getItem(STORAGE_KEY)
      const initial = stored && stored.length > 0 ? stored : null
      setActiveBranchId(initial)
      return initial
    }
  )

  // Keep the API bridge in sync and clear it on unmount / user switch so a new
  // session never inherits a stale branch.
  React.useEffect(() => {
    setActiveBranchId(isSuperAdmin ? activeBranchId : null)
    return () => setActiveBranchId(null)
  }, [isSuperAdmin, activeBranchId])

  const setActiveBranch = React.useCallback(
    (id: string | null) => {
      if (!isSuperAdmin || id === activeBranchId) return

      setActiveBranchId(id)
      setActiveBranchIdState(id)

      if (typeof window !== "undefined") {
        if (id === null) window.localStorage.removeItem(STORAGE_KEY)
        else window.localStorage.setItem(STORAGE_KEY, String(id))
      }

      // Re-scope: drop every cached query except the user/permission context so
      // branch-scoped reads refetch under the new branch.
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      })
    },
    [isSuperAdmin, activeBranchId, queryClient]
  )

  const value = React.useMemo<BranchContextValue>(
    () => ({
      isSuperAdmin,
      activeBranchId: isSuperAdmin ? activeBranchId : null,
      setActiveBranch,
      branchParam: isSuperAdmin && activeBranchId !== null ? activeBranchId : undefined,
    }),
    [isSuperAdmin, activeBranchId, setActiveBranch]
  )

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  )
}
