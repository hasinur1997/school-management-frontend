"use client"

/**
 * Logout control. Calls the `logoutAction` server action, which revokes the
 * token via the API, clears the httpOnly cookie, and redirects to login. The
 * user menu (1.5) reuses this; a bare button stands in until then.
 */

import * as React from "react"
import { LogOut } from "lucide-react"

import { DropdownMenuItem } from "@workspace/ui/components/dropdown-menu"
import { Button } from "@/components/button"
import { logoutAction } from "@/lib/auth/actions"

export function LogoutButton({
  variant = "outline",
  className,
  asMenuItem = false,
}: {
  variant?: React.ComponentProps<typeof Button>["variant"]
  className?: string
  asMenuItem?: boolean
}) {
  const [pending, startTransition] = React.useTransition()
  const label = pending ? "Signing out…" : "Sign out"
  const onLogout = () => startTransition(() => logoutAction())

  if (asMenuItem) {
    return (
      <DropdownMenuItem
        variant="destructive"
        disabled={pending}
        onClick={onLogout}
        className={className}
      >
        <LogOut aria-hidden />
        {label}
      </DropdownMenuItem>
    )
  }

  return (
    <Button
      variant={variant}
      className={className}
      loading={pending}
      onClick={onLogout}
    >
      <LogOut aria-hidden />
      {label}
    </Button>
  )
}
