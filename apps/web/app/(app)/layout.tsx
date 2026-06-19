/**
 * Authenticated route-group guard. Server-side check: requests without a
 * session cookie are redirected to login before any authenticated UI renders
 * (`code-standards.md`, Authentication on every screen). The token is handed to
 * `AuthProvider`, which loads the user + permission context for the subtree.
 *
 * The app shell (sidebar / topbar / user menu, task 1.5) wraps `children`
 * inside the auth + branch providers so nav gating, the user menu, and the
 * branch switcher all have their context.
 */

import { redirect } from "next/navigation"

import { AuthProvider } from "@/components/auth/auth-provider"
import { BranchProvider } from "@/components/branch/branch-provider"
import { AppShell } from "@/components/app-shell/app-shell"
import { getSessionToken } from "@/lib/auth/session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = await getSessionToken()

  if (!token) {
    redirect("/login")
  }

  return (
    <AuthProvider token={token}>
      <BranchProvider>
        <AppShell>{children}</AppShell>
      </BranchProvider>
    </AuthProvider>
  )
}
