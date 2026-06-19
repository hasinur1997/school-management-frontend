/**
 * Authenticated route-group guard. Server-side check: requests without a
 * session cookie are redirected to login before any authenticated UI renders
 * (`code-standards.md`, Authentication on every screen). The token is handed to
 * `AuthProvider`, which loads the user + permission context for the subtree.
 *
 * The app shell (sidebar / topbar / user menu) is added in 1.5 and will wrap
 * `children` inside this provider.
 */

import { redirect } from "next/navigation"

import { AuthProvider } from "@/components/auth/auth-provider"
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

  return <AuthProvider token={token}>{children}</AuthProvider>
}
