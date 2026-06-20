"use client"

/**
 * Profile screen for the currently signed-in user. Reads the resolved
 * `AuthUser` from `useAuth()` (the `AuthProvider` already owns the `GET /auth/me`
 * query and gates the subtree behind its loading/error states, so the user is
 * always present here). Lets the user view their details and edit them, change
 * their photo, and change their password. Role/branch/permission data is
 * read-only — those stay API-owned.
 */

import * as React from "react"
import { ImageUp, KeyRound, Pencil, ShieldCheck } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { cn } from "@workspace/ui/lib/utils"
import { userInitials } from "@/types/auth"
import { ProfileFormDialog } from "./profile-form-dialog"
import { ProfilePhotoDialog } from "./profile-photo-dialog"

const EMPTY = "—"

export function ProfileView() {
  const { user, roles, isSuperAdmin } = useAuth()
  const [editOpen, setEditOpen] = React.useState(false)
  const [photoOpen, setPhotoOpen] = React.useState(false)
  const [passwordOpen, setPasswordOpen] = React.useState(false)

  const roleLabels = isSuperAdmin && roles.length === 0 ? ["Super admin"] : roles
  const branchLabel = isSuperAdmin
    ? "All branches"
    : (user.branch?.name ?? EMPTY)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-copy-primary">Profile</h1>
        <p className="text-sm text-copy-muted">
          View and manage your account details.
        </p>
      </div>

      {/* Header card */}
      <div className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar className="size-28 shrink-0">
            {user.photo_url ? (
              <AvatarImage src={user.photo_url} alt="" />
            ) : null}
            <AvatarFallback>{userInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-copy-primary">
              {user.name}
            </h2>
            <p className="truncate text-sm text-copy-muted">
              {user.email || user.username || EMPTY}
            </p>
            {roleLabels.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roleLabels.map((role) => (
                  <Badge key={role} variant="secondary" className="capitalize">
                    {role}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setPhotoOpen(true)}>
            <ImageUp className="size-4" aria-hidden />
            Photo
          </Button>
          <Button variant="outline" onClick={() => setPasswordOpen(true)}>
            <KeyRound className="size-4" aria-hidden />
            Password
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal */}
        <section className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:p-6">
          <h3 className="text-base font-semibold text-copy-primary">
            Personal information
          </h3>
          <dl className="flex flex-col divide-y divide-surface-border">
            <Field label="Name" value={user.name} />
            <Field label="Email" value={user.email} />
            <Field label="Username" value={user.username} />
            <Field label="Phone" value={user.phone} />
          </dl>
        </section>

        {/* Access */}
        <section className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:p-6">
          <h3 className="text-base font-semibold text-copy-primary">
            Roles &amp; access
          </h3>
          <dl className="flex flex-col divide-y divide-surface-border">
            <Field label="Branch" value={branchLabel} />
            <div className="flex items-start justify-between gap-4 py-2">
              <dt className="text-sm text-copy-muted">Roles</dt>
              <dd className="flex min-w-0 flex-wrap justify-end gap-1.5">
                {roleLabels.length > 0 ? (
                  roleLabels.map((role) => (
                    <Badge
                      key={role}
                      variant="secondary"
                      className="capitalize"
                    >
                      {role}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-copy-secondary">{EMPTY}</span>
                )}
              </dd>
            </div>
          </dl>
          <EmptyState
            icon={ShieldCheck}
            title="Permissions are managed by an administrator"
            description="Your access is set by your assigned roles and can't be changed here."
            className="border-0 bg-transparent py-4"
          />
        </section>
      </div>

      <ProfileFormDialog open={editOpen} onOpenChange={setEditOpen} user={user} />
      <ProfilePhotoDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        user={user}
      />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  )
}

function Field({
  label,
  value,
  className,
}: {
  label: string
  value?: string | null
  className?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-copy-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-sm text-copy-secondary",
          className
        )}
      >
        {value || EMPTY}
      </dd>
    </div>
  )
}
