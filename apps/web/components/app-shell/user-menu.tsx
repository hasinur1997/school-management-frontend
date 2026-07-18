"use client"

/**
 * Topbar user menu (task 1.5): avatar + name opening a dropdown for Profile,
 * Settings, Change password (opens the 1.4 dialog), and Logout (the 1.4 logout
 * action — revoke + clear cookie + redirect). The name label hides below `sm`
 * per the responsive rules; the avatar always shows.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Settings, User } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { useAuth } from "@/components/auth/auth-provider"
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog"
import { LogoutButton } from "@/components/auth/logout-button"
import { userInitials } from "@/types/auth"

export function UserMenu() {
  const router = useRouter()
  const { user, hasPermission, roles } = useAuth()
  const [changeOpen, setChangeOpen] = React.useState(false)
  const isStudent = roles.includes("student")
  const canViewSettings = hasPermission("setting.manage")
  const showAccountActions = !isStudent || canViewSettings

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="h-11 gap-2 px-1.5 sm:h-9 sm:pr-2.5"
              aria-label="Open user menu"
            >
              <Avatar size="sm">
                {user.photo_url ? (
                  <AvatarImage src={user.photo_url} alt="" />
                ) : null}
                <AvatarFallback>{userInitials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[10rem] truncate text-sm font-medium text-copy-primary sm:inline">
                {user.name}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-copy-primary">
                {user.name}
              </span>
              {user.email ? (
                <span className="truncate text-xs font-normal text-copy-muted">
                  {user.email}
                </span>
              ) : null}
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          {showAccountActions ? <DropdownMenuSeparator /> : null}

          {!isStudent ? (
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User aria-hidden />
              Profile
            </DropdownMenuItem>
          ) : null}
          {canViewSettings ? (
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings aria-hidden />
              Settings
            </DropdownMenuItem>
          ) : null}
          {!isStudent ? (
            <DropdownMenuItem onClick={() => setChangeOpen(true)}>
              <KeyRound aria-hidden />
              Change password
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <LogoutButton asMenuItem />
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={changeOpen} onOpenChange={setChangeOpen} />
    </>
  )
}
