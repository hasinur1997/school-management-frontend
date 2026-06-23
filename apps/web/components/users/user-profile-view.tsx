"use client"

/**
 * Read-only profile for another user account, linked from "recorded by" on the
 * attendance roster (`/users/[id]`). The route is gated by `USER_VIEW`
 * (`role.manage`). Editing another user's profile fields isn't supported by the
 * API (only the access-control surface manages roles), so this is view-only —
 * matching "view only when not permitted to edit". Uses the shared detail
 * layout so it mirrors the teacher/student detail pages. Owns loading /
 * not-found / error / loaded states.
 */

import { ShieldCheck, UserRound } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import {
  DetailCard,
  DetailHero,
  DetailLayout,
  DetailRow,
} from "@/components/detail/detail-ui"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { DetailSkeleton } from "@/components/skeletons"
import { useUser } from "@/hooks/users"
import { isNotFoundError } from "@/lib/api"
import { getErrorMessage } from "@/lib/toast"
import { userInitials } from "@/types/auth"

export function UserProfileView({ id }: { id: string }) {
  const { data: user, isPending, isError, error, refetch } = useUser(id)

  if (isPending) {
    return (
      <DetailLayout>
        <DetailSkeleton />
      </DetailLayout>
    )
  }

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <DetailLayout>
          <EmptyState
            icon={UserRound}
            title="User not found"
            description="This account doesn't exist or isn't visible to you."
          />
        </DetailLayout>
      )
    }
    return (
      <DetailLayout>
        <ErrorPanel
          description={getErrorMessage(error, "We couldn't load this user.")}
          onRetry={() => void refetch()}
        />
      </DetailLayout>
    )
  }

  const roles = user.roles ?? []
  const active = user.is_active !== false
  const primaryRole = roles[0]

  return (
    <DetailLayout>
      <DetailHero
        tone={active ? "success" : "error"}
        statusLabel={active ? "Active" : "Inactive"}
        initials={userInitials(user.name)}
        title={user.name}
        subtitle={
          <p className="text-[15px] text-copy-secondary capitalize">
            {primaryRole ?? "User"}
          </p>
        }
        facts={[
          { label: "Email", value: user.email },
          { label: "Phone", value: user.phone, mono: true },
          { label: "Role", value: primaryRole ?? null },
          { label: "Status", value: active ? "Active" : "Inactive" },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Contact */}
        <DetailCard icon={UserRound} title="Profile">
          <DetailRow label="Name" value={user.name} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Phone" value={user.phone} mono />
        </DetailCard>

        {/* Roles & access */}
        <DetailCard icon={ShieldCheck} title="Roles & access" headerClassName="mb-3">
          {roles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize">
                  {role}
                </Badge>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No roles assigned"
              description="This user has no roles yet."
              className="border-0 bg-transparent py-6"
            />
          )}
          <p className="mt-3 text-[13px] text-copy-muted">
            This profile is read-only. A user&apos;s roles and permissions are
            changed from the access-control surface.
          </p>
        </DetailCard>
      </div>
    </DetailLayout>
  )
}
