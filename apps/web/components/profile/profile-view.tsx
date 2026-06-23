"use client"

/**
 * Profile screen for the currently signed-in user. Reads the resolved
 * `AuthUser` from `useAuth()` (the `AuthProvider` already owns the `GET /auth/me`
 * query and gates the subtree behind its loading/error states, so the user is
 * always present here). Lets the user view their details and edit them, change
 * their photo, and change their password. Role/branch/permission data is
 * read-only — those stay API-owned. Uses the shared detail layout so it mirrors
 * the teacher/student detail pages.
 */

import * as React from "react"
import { ImageUp, KeyRound, Pencil, ShieldCheck, UserRound } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import {
  DetailActions,
  DetailCard,
  DetailHero,
  DetailLayout,
  DetailRow,
  type DetailAction,
} from "@/components/detail/detail-ui"
import { EmptyState } from "@/components/empty-state"
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { userInitials } from "@/types/auth"
import { ProfileFormDialog } from "./profile-form-dialog"
import { ProfilePhotoDialog } from "./profile-photo-dialog"

export function ProfileView() {
  const { user, roles, isSuperAdmin } = useAuth()
  const [editOpen, setEditOpen] = React.useState(false)
  const [photoOpen, setPhotoOpen] = React.useState(false)
  const [passwordOpen, setPasswordOpen] = React.useState(false)

  const roleLabels = isSuperAdmin && roles.length === 0 ? ["Super admin"] : roles
  const branchLabel = isSuperAdmin
    ? "All branches"
    : (user.branch?.name ?? null)

  const actions: DetailAction[] = [
    {
      key: "photo",
      label: "Change photo",
      icon: ImageUp,
      onSelect: () => setPhotoOpen(true),
    },
    {
      key: "password",
      label: "Change password",
      icon: KeyRound,
      onSelect: () => setPasswordOpen(true),
    },
    {
      key: "edit",
      label: "Edit",
      icon: Pencil,
      onSelect: () => setEditOpen(true),
      primary: true,
    },
  ]

  return (
    <DetailLayout>
      <DetailHero
        tone="info"
        statusLabel={roleLabels[0] ?? "Active"}
        photo={user.photo_url}
        initials={userInitials(user.name)}
        title={user.name}
        subtitle={
          <p className="text-[15px] text-copy-secondary">
            {user.email || user.username || ""}
          </p>
        }
        actions={<DetailActions actions={actions} />}
        facts={[
          { label: "Email", value: user.email },
          { label: "Username", value: user.username },
          { label: "Phone", value: user.phone, mono: true },
          { label: "Branch", value: branchLabel },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Personal */}
        <DetailCard icon={UserRound} title="Personal information">
          <DetailRow label="Name" value={user.name} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Username" value={user.username} />
          <DetailRow label="Phone" value={user.phone} mono />
        </DetailCard>

        {/* Access */}
        <DetailCard icon={ShieldCheck} title="Roles & access" headerClassName="mb-3">
          <DetailRow label="Branch" value={branchLabel} />
          <div className="flex items-start justify-between gap-4 border-t border-surface-border-subtle py-[13px]">
            <span className="shrink-0 text-[13px] text-copy-muted">Roles</span>
            <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
              {roleLabels.length > 0 ? (
                roleLabels.map((role) => (
                  <Badge key={role} variant="secondary" className="capitalize">
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-copy-muted">—</span>
              )}
            </div>
          </div>
          <EmptyState
            icon={ShieldCheck}
            title="Permissions are managed by an administrator"
            description="Your access is set by your assigned roles and can't be changed here."
            className="border-0 bg-transparent py-4"
          />
        </DetailCard>
      </div>

      <ProfileFormDialog open={editOpen} onOpenChange={setEditOpen} user={user} />
      <ProfilePhotoDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        user={user}
      />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </DetailLayout>
  )
}
