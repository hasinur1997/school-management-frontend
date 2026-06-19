"use client"

/**
 * Logout control. Calls the `logoutAction` server action, which revokes the
 * token via the API, clears the httpOnly cookie, and redirects to login. The
 * user menu (1.5) reuses this; a bare button stands in until then.
 */

import * as React from "react"
import { LogOut } from "lucide-react"

import { Button } from "@/components/button"
import { logoutAction } from "@/lib/auth/actions"

export function LogoutButton({
  variant = "outline",
  className,
}: {
  variant?: React.ComponentProps<typeof Button>["variant"]
  className?: string
}) {
  const [pending, startTransition] = React.useTransition()

  return (
    <Button
      variant={variant}
      className={className}
      loading={pending}
      onClick={() => startTransition(() => logoutAction())}
    >
      <LogOut aria-hidden />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  )
}
