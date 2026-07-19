"use client"

/**
 * Access-control surface (task 6.6, backend 15.1) — super-admin-only. Renders
 * the imported "Access Control" design as the **Roles & permissions** view and
 * adds a **Users** view for role assignment (both required by the ticket; the
 * design's own info card links across to Users). Gated on `role.manage`; the
 * API's `403/404` stays the authoritative boundary.
 *
 * The active view is persisted in `?view=` so it survives a refresh and the
 * "Users" cross-link is shareable.
 */

import * as React from "react"
import { ChevronRight, Lock, ShieldCheck, Users } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { CardSkeleton } from "@/components/skeletons"
import { useDetailTab } from "@/components/detail/detail-tabs"
import { usePermission } from "@/hooks/auth/use-permission"
import {
  usePermissionRegistry,
  useRoles,
  useSyncRolePermissions,
} from "@/hooks/access-control"
import { ROLE_MANAGE } from "./permissions"
import { RolesPermissionsEditor } from "./roles-permissions-editor"
import { UsersRolesPanel } from "./users-roles-panel"

const VIEWS = [
  { key: "roles", label: "Roles & permissions", icon: ShieldCheck },
  { key: "users", label: "Users", icon: Users },
] as const

export function AccessControlPage() {
  const canManage = usePermission(ROLE_MANAGE)
  const { active, setActive } = useDetailTab([...VIEWS], "view")

  const rolesQuery = useRoles(canManage)
  const registryQuery = usePermissionRegistry(canManage)
  const syncPermissions = useSyncRolePermissions()

  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to manage roles and access control."
      />
    )
  }

  const roles = rolesQuery.data ?? []

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-[9px] text-[12.5px] font-medium text-[#9a9aa3]">
        <span>Settings</span>
        <ChevronRight className="size-[13px]" aria-hidden />
        <span className="text-[#71717a]">Access control</span>
      </div>

      {/* View switch */}
      <div className="flex w-fit items-center gap-1 rounded-[12px] border border-[#ececef] bg-white p-1 shadow-[0_1px_3px_rgba(16,16,20,0.05)]">
        {VIEWS.map((view) => {
          const Icon = view.icon
          const selected = view.key === active
          return (
            <button
              key={view.key}
              type="button"
              onClick={() => setActive(view.key)}
              className={cn(
                "flex items-center gap-2 rounded-[9px] px-3.5 py-2 text-[13.5px] font-semibold transition-colors",
                selected
                  ? "bg-[#f3effe] text-[#7c3aed]"
                  : "text-[#71717a] hover:bg-[#f4f4f5]"
              )}
            >
              <Icon className="size-4" aria-hidden />
              {view.label}
            </button>
          )
        })}
      </div>

      {rolesQuery.isPending || (active === "roles" && registryQuery.isPending) ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[288px_1fr]">
          <CardSkeleton className="h-72" />
          <CardSkeleton className="min-h-[32rem]" />
        </div>
      ) : rolesQuery.isError ||
        (active === "roles" && registryQuery.isError) ? (
        <ErrorPanel
          description="We couldn't load the access-control data."
          onRetry={() => {
            void rolesQuery.refetch()
            void registryQuery.refetch()
          }}
        />
      ) : active === "roles" ? (
        <RolesPermissionsEditor
          roles={roles}
          groups={registryQuery.data ?? []}
          onGoToUsers={() => setActive("users")}
          syncPermissions={(input) => syncPermissions.mutateAsync(input)}
          isSaving={syncPermissions.isPending}
        />
      ) : (
        <UsersRolesPanel roles={roles} />
      )}
    </div>
  )
}
