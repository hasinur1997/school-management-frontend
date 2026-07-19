"use client"

/**
 * Roles → permissions editor — the imported "Access Control" design, wired to
 * the live registry (`GET /permissions` / `GET /roles`, backend 15.1). A sticky
 * role list on the left selects the role whose permission bundle the matrix on
 * the right edits; Save syncs the whole set (`PUT /roles/{id}/permissions`).
 *
 * The registry is seeder-fixed, so the design's rigid View/Create/Edit/Delete
 * grid becomes a **checklist grouped by module** that renders exactly the
 * permissions each module actually exposes (`code-standards.md` — never invent
 * permissions). The super_admin role is protected: locked, "Full access", no
 * toggles, no save. Loading / empty / error states are all present.
 */

import * as React from "react"
import { Check, Info, Lock, Plus, Save, SlidersHorizontal } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { isForbiddenError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import type { PermissionGroup, Role } from "@/types/access-control"
import { buildMatrix, CAPABILITIES } from "./matrix"
import { CreateRoleDialog } from "./create-role-dialog"
import { roleDescription, roleLabel, roleVisual } from "./role-visual"

interface EditorProps {
  roles: Role[]
  groups: PermissionGroup[]
  onGoToUsers: () => void
  syncPermissions: (input: {
    roleId: string
    permissions: string[]
  }) => Promise<unknown>
  isSaving: boolean
}

/** Set equality by membership. */
function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

export function RolesPermissionsEditor({
  roles,
  groups,
  onGoToUsers,
  syncPermissions,
  isSaving,
}: EditorProps) {
  const allPermissionNames = React.useMemo(
    () => groups.flatMap((g) => g.permissions.map((p) => p.name)),
    [groups]
  )
  const totalCount = allPermissionNames.length

  const matrix = React.useMemo(() => buildMatrix(groups), [groups])

  const rolesById = React.useMemo(() => {
    const map = new Map<string, Role>()
    for (const role of roles) map.set(role.id, role)
    return map
  }, [roles])

  // The selection defaults to the first editable role (else the first role)
  // and heals when a chosen role vanishes after a refetch — derived at render.
  const [chosenRoleId, setChosenRoleId] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const defaultRole = roles.find((r) => !r.is_protected) ?? roles[0]
  const selectedRole =
    (chosenRoleId ? rolesById.get(chosenRoleId) : undefined) ?? defaultRole
  const selectedRoleId = selectedRole?.id ?? null
  const locked = selectedRole?.is_protected ?? false

  // The server-truth permission set for the selected role, as a stable key so
  // the draft resets on role switch and after a successful save (refetch).
  const serverKey = selectedRole
    ? `${selectedRole.id}|${[...selectedRole.permissions].sort().join(" ")}`
    : ""
  const serverSet = React.useMemo(
    () => new Set(selectedRole?.permissions ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serverKey]
  )

  // Draft edits for the selected role. Rather than an effect, reset during
  // render whenever the server key changes (role switch or post-save refetch) —
  // React's "adjust state while rendering" pattern, so no cascading effect.
  const [draft, setDraft] = React.useState<Set<string>>(serverSet)
  const [trackedKey, setTrackedKey] = React.useState(serverKey)
  if (trackedKey !== serverKey) {
    setTrackedKey(serverKey)
    setDraft(new Set(serverSet))
  }

  const dirty = !locked && !sameSet(draft, serverSet)

  // A matrix cell is granted when every real permission it maps to is granted
  // (a protected role always reads as fully granted).
  const cellOn = (perms: string[]) =>
    locked || (perms.length > 0 && perms.every((p) => draft.has(p)))

  function toggleCell(perms: string[]) {
    if (locked || perms.length === 0) return
    const allOn = perms.every((p) => draft.has(p))
    setDraft((prev) => {
      const next = new Set(prev)
      for (const p of perms) {
        if (allOn) next.delete(p)
        else next.add(p)
      }
      return next
    })
  }

  function setAll(granted: boolean) {
    if (locked) return
    setDraft(granted ? new Set(allPermissionNames) : new Set())
  }

  async function handleSave() {
    if (!selectedRole || locked || !dirty) return
    try {
      await syncPermissions({
        roleId: selectedRole.id,
        permissions: [...draft],
      })
      toastSuccess(`Permissions saved for ${roleLabel(selectedRole.name)}`)
    } catch (error) {
      toastError(
        error,
        isForbiddenError(error)
          ? "This role can't be modified."
          : "We couldn't save the permissions. Please try again."
      )
    }
  }

  function handleDiscard() {
    if (!selectedRole || !dirty) return
    setDraft(new Set(serverSet))
    toastSuccess("Changes discarded")
  }

  // Live granted count for the selected role reflects the draft; other roles
  // show their server count.
  const grantedFor = (role: Role) =>
    role.id === selectedRoleId ? draft.size : role.permissions.length

  if (roles.length === 0) {
    return (
      <EmptyState
        icon={SlidersHorizontal}
        title="No roles to manage"
        description="The permission registry returned no roles."
      />
    )
  }

  const sel = selectedRole ?? roles[0]!
  const selVisual = roleVisual(sel.name)
  const headerGrant = locked ? "Full access" : `${draft.size} / ${totalCount}`

  return (
    <div className="flex flex-col gap-[22px]">
      {/* Header: title + Save / Discard */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-[#1b1b1f]">
            Access control
          </h1>
          <p className="max-w-[560px] text-[14.5px] text-[#71717a]">
            Choose exactly what each role can see and do across the school.
            Changes apply to everyone assigned to that role.
          </p>
        </div>
        <div className="flex items-center gap-[9px]">
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || isSaving}
            className="h-[38px] rounded-[11px] border-[#e2e2e6] bg-white px-3.5 text-[13.5px] font-semibold text-[#1b1b1f] hover:bg-[#f4f4f5]"
            onClick={handleDiscard}
          >
            Discard changes
          </Button>
          <Button
            type="button"
            disabled={!dirty}
            loading={isSaving}
            className="h-[38px] rounded-[11px] bg-[#7c3aed] px-4 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(124,58,237,0.28)] hover:bg-[#6d28d9]"
            onClick={handleSave}
          >
            <Save className="size-[15px]" aria-hidden />
            Save changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[288px_1fr]">
        {/* Roles list */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-[98px]">
          <div className="overflow-hidden rounded-[14px] border border-[#ececef] bg-white shadow-[0_1px_3px_rgba(16,16,20,0.05)]">
            <div className="flex flex-col gap-0.5 border-b border-[#ececef] px-[18px] pb-3 pt-4">
              <span className="text-[14px] font-bold text-[#1b1b1f]">Roles</span>
              <span className="text-[12px] text-[#9a9aa3]">
                Select a role to edit its permissions.
              </span>
            </div>
            <div className="flex flex-col gap-1.5 p-2">
              {roles.map((role) => {
                const isSel = role.id === sel.id
                const vis = roleVisual(role.name)
                const on = grantedFor(role)
                const grantLabel = role.is_protected
                  ? "Full access"
                  : `${on} of ${totalCount} granted`
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setChosenRoleId(role.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[11px] border px-[11px] py-[11px] text-left transition-colors",
                      isSel
                        ? "border-[#d7c9f8] bg-[#fbfaff]"
                        : "border-[#ececef] bg-white hover:border-[#d7c9f8]"
                    )}
                  >
                    <span
                      className="size-2.5 flex-none rounded-full"
                      style={{
                        background: vis.dot,
                        boxShadow: `0 0 0 4px ${vis.dotRing}`,
                      }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-[#1b1b1f]">
                        {roleLabel(role.name)}
                      </span>
                      <span className="text-[12px] text-[#9a9aa3]">
                        {grantLabel}
                      </span>
                    </span>
                    <span className="flex-none font-mono text-[11.5px] text-[#71717a]">
                      {role.users_count}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="px-3 pb-3.5 pt-1.5">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-[7px] text-[13px] font-semibold text-[#7c3aed] transition-colors hover:text-[#6d28d9]"
              >
                <Plus className="size-3.5" strokeWidth={2.4} aria-hidden />
                Create custom role
              </button>
            </div>
          </div>

          <div className="flex gap-[11px] rounded-[14px] border border-[#ececef] bg-white px-[18px] py-[15px] shadow-[0_1px_3px_rgba(16,16,20,0.05)]">
            <Info className="mt-px size-[17px] flex-none text-[#9a9aa3]" aria-hidden />
            <span className="text-[12.5px] leading-relaxed text-[#71717a]">
              Assign roles to people from{" "}
              <button
                type="button"
                onClick={onGoToUsers}
                className="font-semibold text-[#7c3aed] hover:text-[#6d28d9]"
              >
                Users
              </button>
              . A person can hold one or more roles.
            </span>
          </div>
        </div>

        {/* Permission matrix */}
        <div className="min-w-0 overflow-hidden rounded-[14px] border border-[#ececef] bg-white shadow-[0_1px_3px_rgba(16,16,20,0.05)]">
          <div className="flex items-center gap-3.5 border-b border-[#ececef] px-[22px] py-[18px]">
            <span
              className="grid size-11 flex-none place-items-center rounded-[12px] border"
              style={{
                background: selVisual.badgeBg,
                borderColor: selVisual.badgeBorder,
                color: selVisual.badgeFg,
              }}
            >
              <SlidersHorizontal className="size-[21px]" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <div className="flex items-center gap-2.5">
                <span className="text-[16px] font-bold text-[#1b1b1f]">
                  {roleLabel(sel.name)}
                </span>
                <span
                  className="inline-flex rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold"
                  style={{
                    background: selVisual.badgeBg,
                    borderColor: selVisual.badgeBorder,
                    color: selVisual.badgeFg,
                  }}
                >
                  {sel.users_count} {sel.users_count === 1 ? "user" : "users"}
                </span>
              </div>
              <span className="text-[13px] text-[#9a9aa3]">
                {roleDescription(sel.name) || " "}
              </span>
            </div>
            <div className="flex flex-none flex-col items-end gap-[3px]">
              <span className="text-[13px] font-bold text-[#1b1b1f]">
                {headerGrant}
              </span>
              <span className="text-[11.5px] text-[#9a9aa3]">
                permissions granted
              </span>
            </div>
          </div>

          {locked ? (
            <div className="mx-[22px] mt-4 flex items-center gap-2.5 rounded-[11px] border border-[#fbdcc4] bg-[#fff8f2] px-[15px] py-3">
              <Lock className="size-[17px] flex-none text-[#c2410c]" aria-hidden />
              <span className="text-[12.5px] leading-relaxed text-[#9a4a12]">
                <span className="font-bold">
                  {roleLabel(sel.name)} is a protected role.
                </span>{" "}
                It always has full access and can&apos;t be restricted — this
                keeps at least one person able to manage the system.
              </span>
            </div>
          ) : null}

          {/* Column header */}
          <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,74px)] items-center gap-1.5 border-b border-[#ececef] px-[22px] pb-2.5 pt-4">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#9a9aa3]">
              Module
            </span>
            {CAPABILITIES.map((cap) => (
              <span
                key={cap.key}
                className="text-center text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#9a9aa3]"
              >
                {cap.label}
              </span>
            ))}
          </div>

          {/* Module rows */}
          {matrix.map((row) => (
            <div
              key={row.module}
              className="grid grid-cols-[minmax(0,1fr)_repeat(4,74px)] items-center gap-1.5 border-b border-[#f2f2f4] px-[22px] py-[13px] transition-colors hover:bg-[#fafafa]"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-[#1b1b1f]">
                  {row.name}
                </span>
                {row.desc ? (
                  <span className="text-[12px] text-[#9a9aa3]">{row.desc}</span>
                ) : null}
              </span>
              {row.cells.map((cell) => {
                const on = cellOn(cell.permissions)
                return (
                  <span
                    key={cell.capability}
                    className="grid place-items-center"
                  >
                    {cell.applicable ? (
                      <button
                        type="button"
                        title={cell.permissions.join(", ")}
                        onClick={() => toggleCell(cell.permissions)}
                        disabled={locked}
                        aria-pressed={on}
                        aria-label={`${cell.capability} ${row.name}`}
                        className={cn(
                          "grid size-[23px] place-items-center rounded-[7px] border-[1.5px] transition-colors",
                          locked ? "cursor-default" : "cursor-pointer"
                        )}
                        style={{
                          background: on ? "#7c3aed" : "#fff",
                          borderColor: on ? "#7c3aed" : "#d7d7dc",
                        }}
                      >
                        <Check
                          className="size-[13px] text-white"
                          strokeWidth={3}
                          style={{ opacity: on ? 1 : 0 }}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <span className="h-0.5 w-3.5 rounded-[2px] bg-[#e2e2e6]" />
                    )}
                  </span>
                )
              })}
            </div>
          ))}

          {/* Legend + bulk actions */}
          <div className="flex flex-wrap items-center justify-between gap-3.5 px-[22px] py-[15px]">
            <div className="flex items-center gap-4 text-[12px] text-[#9a9aa3]">
              <span className="flex items-center gap-[7px]">
                <span className="size-4 rounded-[5px] bg-[#7c3aed]" />
                Granted
              </span>
              <span className="flex items-center gap-[7px]">
                <span className="size-4 rounded-[5px] border-[1.5px] border-[#d7d7dc] bg-white" />
                Denied
              </span>
              <span className="flex items-center gap-[7px]">
                <span className="h-0.5 w-3.5 rounded-[2px] bg-[#e2e2e6]" />
                Not applicable
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAll(false)}
                disabled={locked}
                className={cn(
                  "h-8 rounded-[9px] border border-[#e2e2e6] bg-white px-3 text-[12.5px] font-semibold transition-colors",
                  locked
                    ? "cursor-not-allowed text-[#c7c7cc]"
                    : "text-[#1b1b1f] hover:bg-[#f4f4f5]"
                )}
              >
                Deny all
              </button>
              <button
                type="button"
                onClick={() => setAll(true)}
                disabled={locked}
                className={cn(
                  "h-8 rounded-[9px] border border-[#e2e2e6] bg-white px-3 text-[12.5px] font-semibold transition-colors",
                  locked
                    ? "cursor-not-allowed text-[#c7c7cc]"
                    : "text-[#1b1b1f] hover:bg-[#f4f4f5]"
                )}
              >
                Grant all
              </button>
            </div>
          </div>
        </div>
      </div>

      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(role) => setChosenRoleId(role.id)}
      />
    </div>
  )
}
