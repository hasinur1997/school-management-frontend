"use client"

/**
 * Data hooks for the access-control surface (backend 15.1, `role.manage`, super
 * admin only). Reads the permission registry, the roles with their bundles, and
 * the paginated user accounts; writes replace a role's permission set or a
 * user's role set.
 *
 * Every write invalidates roles, users **and** the current user's `/auth/me`
 * cache — a permission/role change can alter the acting super admin's own
 * effective permissions and thus the app's UI gating (task 6.6).
 */

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { api, queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type {
  AccessUser,
  AccessUserListParams,
  CreateRoleInput,
  PermissionRegistry,
  Role,
} from "@/types/access-control"

export const USERS_PER_PAGE = 15

/** `GET /permissions` — the full assignable registry, grouped by module. */
export function usePermissionRegistry(enabled = true) {
  return useQuery({
    queryKey: queryKey("permissions", "registry"),
    queryFn: () => api.get<PermissionRegistry>("/permissions"),
    select: (data) => data.groups,
    enabled,
    staleTime: STALE_TIME.REFERENCE,
  })
}

/** `GET /roles` — every role with its permissions and assigned-user count. */
export function useRoles(enabled = true) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("roles", "list", { branch: branchParam }),
    queryFn: () => api.get<Role[]>("/roles"),
    enabled,
    staleTime: STALE_TIME.REFERENCE,
  })
}

/** Drop empty / `all` filters so the request only carries active ones. */
function toUserParams(params: AccessUserListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? USERS_PER_PAGE,
  }
  if (params.role && params.role !== "all") query.role = params.role
  const search = params.search?.trim()
  if (search) query.search = search
  return query
}

/** `GET /users` — paginated, searchable, role-filterable account list. */
export function useAccessUsers(params: AccessUserListParams, enabled = true) {
  const { branchParam } = useBranch()
  const query = toUserParams(params)

  return useQuery({
    queryKey: queryKey("access-users", "list", {
      ...query,
      branch: params.branch_id ?? branchParam,
    }),
    queryFn: () => requestPaginated<AccessUser>("/users", { params: query }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}

/** Invalidate everything a role/permission change can affect. */
function invalidateAccessCaches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["roles"] })
  void queryClient.invalidateQueries({ queryKey: ["access-users"] })
  // A permission/role change can alter the acting user's own effective
  // permissions — refresh the gating source of truth.
  void queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
}

/**
 * `POST /roles` — create a custom role. Duplicate name → 422 on `name`. Only
 * the roles list is affected (a brand-new role holds no users yet).
 */
export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateRoleInput) => api.post<Role>("/roles", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  })
}

/**
 * `PUT /roles/{id}/permissions` — replace a role's permission set (sync).
 * Editing super_admin → 403; unknown permission → 422 on `permissions`.
 */
export function useSyncRolePermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      roleId,
      permissions,
    }: {
      roleId: string
      permissions: string[]
    }) => api.put<Role>(`/roles/${roleId}/permissions`, { permissions }),
    onSuccess: () => invalidateAccessCaches(queryClient),
  })
}

/**
 * `PUT /users/{id}/roles` — replace a user's role set (sync). Stripping the last
 * active super admin → 422 on `roles`.
 */
export function useSyncUserRoles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: string[] }) =>
      api.put<AccessUser>(`/users/${userId}/roles`, { roles }),
    onSuccess: () => invalidateAccessCaches(queryClient),
  })
}
