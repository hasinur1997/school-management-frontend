"use client"

/**
 * Active-branch context for the global branch switcher.
 *
 * The API returns the branches a user may operate in as `user.branches`
 * (`/auth/me`): super admins get every active branch; everyone else gets their
 * home branch plus any explicitly granted (`branch_user`). This provider:
 *
 *   1. tracks the selected branch (one of the accessible branches);
 *   2. mirrors it into the API branch bridge (`lib/api/branch`) so the request
 *      interceptor forwards `branch_id` on every call — the backend honours it
 *      only for branches the user may access, otherwise falls back to home;
 *   3. invalidates branch-scoped queries when the branch changes so the UI
 *      re-fetches under the new scope;
 *   4. persists the choice (localStorage) so it survives reloads, and tracks a
 *      per-session "chosen" flag that drives the post-login branch picker.
 *
 * A user with a single accessible branch is auto-selected into it and never
 * sees the picker.
 */

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { setActiveBranchId } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"
import type { Branch } from "@/types/branch"

const RECENT_LIMIT = 3

export interface BranchContextValue {
  /**
   * Whether the current user is a super admin. Mirrored from the auth context
   * so screens that branch on it can keep reading it from here (many create
   * forms and lists do).
   */
  isSuperAdmin: boolean
  /** Whether the current user may switch branch context (has ≥ 2 branches). */
  canSwitch: boolean
  /** Branches the user may switch between (from `/auth/me`). */
  branches: Branch[]
  /** Selected branch id, or `null` before a choice / when none are available. */
  activeBranchId: string | null
  /** The selected branch object, when resolvable. */
  currentBranch: Branch | undefined
  /** Recently used branches (most-recent first), excluding the current one. */
  recentBranches: Branch[]
  /** Select a branch and mark the session as having chosen. */
  setActiveBranch: (id: string) => void
  /**
   * True when the user must pick a branch before using the app (≥ 2 accessible
   * branches and no choice made yet this session). Drives the login picker.
   */
  needsBranchSelection: boolean
  /**
   * Value to fold into query keys so cache entries are scoped per branch.
   * `undefined` when no specific branch is active (consolidated view).
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

function storageKeys(userId: string) {
  return {
    active: `active_branch:${userId}`,
    recent: `recent_branches:${userId}`,
    chosen: `branch_chosen:${userId}`,
  }
}

function readRecent(key: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []
  } catch {
    return []
  }
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin } = useAuth()
  const queryClient = useQueryClient()

  const branches = React.useMemo<Branch[]>(() => user.branches ?? [], [user.branches])
  const userId = String(user.id)
  const keys = React.useMemo(() => storageKeys(userId), [userId])

  // The user's default landing branch: their home branch when present, else the
  // first accessible branch.
  const homeBranchId =
    (user.branch?.id != null ? String(user.branch.id) : null) ?? branches[0]?.id ?? null

  // Lazy init from storage (client only). A single-branch user is auto-selected
  // and considered "chosen" (no picker). Everyone else restores a still-valid
  // persisted choice; the per-session flag decides whether the picker shows.
  const [state, setState] = React.useState<{ activeBranchId: string | null; hasChosen: boolean }>(
    () => {
      if (typeof window === "undefined") {
        return { activeBranchId: branches.length <= 1 ? homeBranchId : null, hasChosen: branches.length <= 1 }
      }
      if (branches.length <= 1) {
        return { activeBranchId: branches[0]?.id ?? homeBranchId, hasChosen: true }
      }
      const persisted = window.localStorage.getItem(keys.active)
      const valid = persisted && branches.some((b) => b.id === persisted) ? persisted : null
      const chosenThisSession = window.sessionStorage.getItem(keys.chosen) === "1"
      return { activeBranchId: valid, hasChosen: chosenThisSession && valid !== null }
    }
  )

  const [recentIds, setRecentIds] = React.useState<string[]>(() => readRecent(keys.recent))

  // Keep the API bridge in sync with the active branch, and clear it on
  // unmount / user switch so a new session never inherits a stale branch.
  React.useEffect(() => {
    setActiveBranchId(state.activeBranchId)
    return () => setActiveBranchId(null)
  }, [state.activeBranchId])

  const setActiveBranch = React.useCallback(
    (id: string) => {
      if (!branches.some((b) => b.id === id)) return

      setState((prev) => {
        if (prev.activeBranchId === id && prev.hasChosen) return prev
        return { activeBranchId: id, hasChosen: true }
      })

      // Track recents (previous branch moves to the front).
      setRecentIds((prev) => {
        const previous = state.activeBranchId
        const next = [previous, ...prev.filter((r) => r !== previous && r !== id)]
          .filter((v): v is string => typeof v === "string" && v !== id)
          .slice(0, RECENT_LIMIT)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(keys.recent, JSON.stringify(next))
        }
        return next
      })

      if (typeof window !== "undefined") {
        window.localStorage.setItem(keys.active, id)
        window.sessionStorage.setItem(keys.chosen, "1")
      }

      setActiveBranchId(id)

      // Re-scope: drop every cached query except the user/permission context so
      // branch-scoped reads refetch under the new branch.
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      })
    },
    [branches, state.activeBranchId, keys, queryClient]
  )

  const currentBranch = branches.find((b) => b.id === state.activeBranchId)

  const recentBranches = React.useMemo(
    () =>
      recentIds
        .map((id) => branches.find((b) => b.id === id))
        .filter((b): b is Branch => b != null && b.id !== state.activeBranchId),
    [recentIds, branches, state.activeBranchId]
  )

  const value = React.useMemo<BranchContextValue>(
    () => ({
      isSuperAdmin,
      canSwitch: branches.length >= 2,
      branches,
      activeBranchId: state.activeBranchId,
      currentBranch,
      recentBranches,
      setActiveBranch,
      needsBranchSelection: branches.length >= 2 && !state.hasChosen,
      branchParam: state.activeBranchId ?? undefined,
    }),
    [isSuperAdmin, branches, state.activeBranchId, state.hasChosen, currentBranch, recentBranches, setActiveBranch]
  )

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}
