"use client"

/**
 * Users → roles assignment (task 6.6). A paginated, searchable, role-filterable
 * account table (`GET /users`) where each account's **roles** can be edited
 * (`PUT /users/{id}/roles`, sync). A user may hold **one or more roles** at once
 * — the per-row control is a multi-select popover that syncs the whole set
 * `{ roles: [...] }`. Backend guards surface as toasts: stripping the last super
 * admin → 422 on `roles`. Table ≥ md, card list below; all four states present.
 */

import * as React from "react"
import { Check, ChevronDown, Search, UserRound, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useAccessUsers, useSyncUserRoles } from "@/hooks/access-control"
import { toastError, toastSuccess } from "@/lib/toast"
import type { AccessUser, Role, RoleFilter } from "@/types/access-control"
import { roleLabel, roleVisual } from "./role-visual"

const EMPTY = "—"

/** Set equality by membership. */
function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

/** A small role pill in the role's colour. */
function RolePill({ name }: { name: string }) {
  const vis = roleVisual(name)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold"
      style={{
        background: vis.badgeBg,
        borderColor: vis.badgeBorder,
        color: vis.badgeFg,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: vis.dot }} />
      {roleLabel(name)}
    </span>
  )
}

/** Per-user multi-role editor: a popover with a checkbox list and Save. */
function RoleAssign({ user, roles }: { user: AccessUser; roles: Role[] }) {
  const sync = useSyncUserRoles()
  const [open, setOpen] = React.useState(false)

  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(user.roles)
  )
  // Re-sync from the server whenever the account's roles change (after a save /
  // refetch) — adjust state during render, no effect.
  const serverKey = [...user.roles].sort().join(" ")
  const [trackedKey, setTrackedKey] = React.useState(serverKey)
  if (trackedKey !== serverKey) {
    setTrackedKey(serverKey)
    setSelected(new Set(user.roles))
  }

  const dirty = !sameSet(selected, new Set(user.roles))

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function save() {
    try {
      await sync.mutateAsync({ userId: user.id, roles: [...selected] })
      toastSuccess(`Roles updated for ${user.name}`)
      setOpen(false)
    } catch (error) {
      toastError(error, "We couldn't update this user's roles.")
    }
  }

  function onOpenChange(next: boolean) {
    // Discard unsaved edits when closing without saving.
    if (!next) setSelected(new Set(user.roles))
    setOpen(next)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e2e2e6] bg-white px-3 text-[13px] font-semibold text-[#1b1b1f] transition-colors hover:bg-[#f4f4f5]"
          >
            Edit roles
            <ChevronDown className="size-4 text-[#9a9aa3]" aria-hidden />
          </button>
        }
      />
      <PopoverContent align="end" className="w-64 gap-0 p-0">
        <div className="border-b border-[#ececef] px-3 py-2.5">
          <p className="text-[13px] font-bold text-[#1b1b1f]">Assign roles</p>
          <p className="truncate text-[12px] text-[#9a9aa3]">{user.name}</p>
        </div>
        <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto p-1.5">
          {roles.map((role) => {
            const on = selected.has(role.name)
            const vis = roleVisual(role.name)
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => toggle(role.name)}
                aria-pressed={on}
                className="flex items-center gap-2.5 rounded-[9px] px-2 py-2 text-left transition-colors hover:bg-[#f4f4f5]"
              >
                <span
                  className="grid size-[20px] flex-none place-items-center rounded-[6px] border-[1.5px] transition-colors"
                  style={{
                    background: on ? "#7c3aed" : "#fff",
                    borderColor: on ? "#7c3aed" : "#d7d7dc",
                  }}
                >
                  <Check
                    className="size-3 text-white"
                    strokeWidth={3}
                    style={{ opacity: on ? 1 : 0 }}
                    aria-hidden
                  />
                </span>
                <span
                  className="size-2 flex-none rounded-full"
                  style={{ background: vis.dot }}
                />
                <span className="text-[13.5px] font-medium text-[#1b1b1f]">
                  {roleLabel(role.name)}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[#ececef] px-3 py-2.5">
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-3 text-[13px] text-[#71717a]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!dirty}
            loading={sync.isPending}
            className="h-8 rounded-md bg-[#7c3aed] px-3.5 text-[13px] font-semibold text-white hover:bg-[#6d28d9]"
            onClick={save}
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function UsersRolesPanel({ roles }: { roles: Role[] }) {
  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput, 300)
  const [role, setRole] = React.useState<RoleFilter>("all")
  const [page, setPage] = React.useState(1)

  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }
  function changeRole(value: RoleFilter) {
    setRole(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useAccessUsers({
    search,
    role,
    page,
  })

  const users = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilters = search.trim().length > 0 || role !== "all"

  function clearFilters() {
    setSearchInput("")
    setRole("all")
    setPage(1)
  }

  const userRoles = (user: AccessUser) =>
    user.roles.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {user.roles.map((r) => (
          <RolePill key={r} name={r} />
        ))}
      </div>
    ) : (
      <span className="text-[13px] text-[#9a9aa3]">No role</span>
    )

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] font-bold tracking-[-0.02em] text-[#1b1b1f]">
          Users &amp; roles
        </h1>
        <p className="max-w-[560px] text-[14.5px] text-[#71717a]">
          Assign roles to each account. A user can hold one or more roles; their
          permissions are the union of every role they hold.
        </p>
      </div>

      {/* Search + role filter */}
      <div className="flex flex-col gap-3 rounded-[14px] border border-[#ececef] bg-white p-3 shadow-[0_1px_3px_rgba(16,16,20,0.05)] sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9a9aa3]"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            aria-label="Search users"
            className="h-10 border-[#e2e2e6] bg-white pl-9"
          />
        </div>
        <div className="sm:w-48">
          <Select
            value={role}
            onValueChange={(next) => changeRole((next as RoleFilter) ?? "all")}
          >
            <SelectTrigger
              aria-label="Filter by role"
              className="h-10 w-full border-[#e2e2e6] bg-white"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.name}>
                  {roleLabel(r.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters ? (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="h-10 text-[#71717a]"
          >
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      {isPending ? (
        <TableSkeleton rows={8} columns={4} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the user accounts."
          onRetry={() => void refetch()}
        />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={hasFilters ? "No matching users" : "No users yet"}
          description={
            hasFilters
              ? "No accounts match the current search or role filter."
              : "User accounts will appear here once they exist."
          }
        />
      ) : (
        <>
          <div
            className={cn(
              "hidden overflow-hidden rounded-[14px] border border-[#ececef] bg-white shadow-[0_1px_3px_rgba(16,16,20,0.05)] md:block",
              isFetching && "opacity-70"
            )}
            aria-busy={isFetching}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Assign roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-[#1b1b1f]">
                          {user.name}
                        </span>
                        <span className="text-xs text-[#9a9aa3]">
                          {user.email ?? user.phone ?? EMPTY}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{userRoles(user)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          user.is_active === false
                            ? "text-[13px] font-medium text-[#c2410c]"
                            : "text-[13px] font-medium text-[#15803d]"
                        }
                      >
                        {user.is_active === false ? "Inactive" : "Active"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <RoleAssign user={user} roles={roles} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-[#ececef] px-6 py-3.5">
              <ListPager
                meta={meta}
                page={page}
                lastPage={lastPage}
                unit="user"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-3 rounded-[14px] border border-[#ececef] bg-white p-4 shadow-[0_1px_3px_rgba(16,16,20,0.05)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1b1b1f]">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-[#9a9aa3]">
                      {user.email ?? user.phone ?? EMPTY}
                    </p>
                  </div>
                  <RoleAssign user={user} roles={roles} />
                </div>
                {userRoles(user)}
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="user"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}
    </div>
  )
}
