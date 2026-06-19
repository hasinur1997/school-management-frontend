"use client"

/**
 * Client auth context. The server-side route guard reads the httpOnly cookie
 * and hands the bearer token down to this provider, which:
 *
 *   1. registers the token with the API session bridge (`lib/api/session`) so
 *      the Axios client can attach it, and wires the `401` handler to clear the
 *      session and bounce to login;
 *   2. fetches `GET /auth/me` once to load the current user + permission list;
 *   3. exposes that through context so screens gate on permissions (never role
 *      names — `architecture-context.md`).
 *
 * No authenticated screen renders before this resolves (`code-standards.md`,
 * Authentication on every screen): children are gated behind loading/error.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import {
  api,
  clearApiToken,
  queryKey,
  setApiToken,
  setUnauthorizedHandler,
  STALE_TIME,
} from "@/lib/api"
import { clearSessionAction } from "@/lib/auth/actions"
import { ErrorPanel } from "@/components/error-state"
import type { AuthUser } from "@/types/auth"

export interface AuthContextValue {
  user: AuthUser
  /** Flat permission list for the current user. */
  permissions: string[]
  /** Role names (display only — never gate on these). */
  roles: string[]
  /**
   * Super admin = a user with no owning branch (`architecture-context.md`:
   * every non-super-admin belongs to exactly one branch; super admin switches
   * context). Derived from the API's branch data, not a role name — only super
   * admin sees the branch switcher and sends `branch_id`.
   */
  isSuperAdmin: boolean
  /** Whether the user holds the given permission. */
  hasPermission: (permission: string) => boolean
  /** Refetch `GET /auth/me` (e.g. after a profile change). */
  refresh: () => void
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

/** Access the authenticated user + permission context. Throws if unmounted. */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>")
  }
  return ctx
}

export function AuthProvider({
  token,
  children,
}: {
  token: string
  children: React.ReactNode
}) {
  const router = useRouter()

  // Register the token with the API bridge before any query fires. Lazy state
  // init runs during render, ahead of the `useQuery` below and child effects.
  const [registered] = React.useState(() => {
    setApiToken(token)
    return token
  })
  if (registered !== token) {
    // Token prop changed (re-login) — keep the bridge in sync.
    setApiToken(token)
  }

  // Wire the `401` handler: clear the in-memory token + server cookie and send
  // the user to login. Restored to the default on unmount.
  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      clearApiToken()
      void clearSessionAction()
      router.replace("/login")
    })
    return () => setUnauthorizedHandler(null)
  }, [router])

  const query = useQuery({
    queryKey: queryKey("auth", "me"),
    queryFn: () => api.get<AuthUser>("/auth/me"),
    staleTime: STALE_TIME.REFERENCE,
  })

  const user = query.data
  const value = React.useMemo<AuthContextValue | null>(() => {
    if (!user) return null
    const permissions = user.permissions ?? []
    const permissionSet = new Set(permissions)
    return {
      user,
      permissions,
      roles: user.roles ?? [],
      isSuperAdmin: user.branch_id == null && user.branch == null,
      hasPermission: (permission: string) => permissionSet.has(permission),
      refresh: () => query.refetch(),
    }
    // `query.refetch` is stable; depend on the resolved user only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Loading: never show authenticated UI before auth + permissions resolve.
  if (query.isPending) {
    return (
      <div
        className="flex min-h-svh items-center justify-center bg-base"
        aria-busy
      >
        <Loader2 className="size-6 animate-spin text-copy-muted" aria-hidden />
        <span className="sr-only">Loading your account…</span>
      </div>
    )
  }

  // Error: a `401` is already redirecting; anything else is recoverable.
  if (query.isError || !value) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-base p-4">
        <ErrorPanel
          title="Couldn't load your account"
          description={
            query.error instanceof Error
              ? query.error.message
              : "Please try again."
          }
          onRetry={() => query.refetch()}
        />
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
