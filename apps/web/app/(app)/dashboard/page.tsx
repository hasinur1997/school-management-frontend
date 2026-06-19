"use client"

/**
 * Placeholder dashboard. The real dashboard (1.7) replaces this; it now renders
 * inside the app shell (1.5), which owns the topbar, navigation, user menu, and
 * branch switcher. Kept minimal: it proves the auth round-trip — the permission
 * context is populated and `<Can>` gates content.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { useAuth } from "@/components/auth/auth-provider"
import { Can } from "@/components/auth/can"

export default function DashboardPage() {
  const { user, permissions, roles } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <header className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-copy-primary">
          Welcome, {user.name}
        </h1>
        <p className="truncate text-sm text-copy-muted">
          {user.email ?? "Signed in"}
          {roles.length ? ` · ${roles.join(", ")}` : ""}
        </p>
      </header>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Your permissions</CardTitle>
          <CardDescription>
            UI is gated on these — never on role names.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.length ? (
            <ul className="flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <li
                  key={permission}
                  className="rounded-md bg-accent-dim px-2.5 py-1 font-mono text-xs text-brand"
                >
                  {permission}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-copy-muted">
              No permissions assigned to your account.
            </p>
          )}
        </CardContent>
      </Card>

      <Can
        permission="dashboard.view"
        fallback={
          <p className="text-sm text-copy-muted">
            You don&apos;t have access to the dashboard widgets.
          </p>
        }
      >
        <p className="text-sm text-copy-secondary">
          Dashboard widgets will appear here (task 1.7).
        </p>
      </Can>
    </div>
  )
}
