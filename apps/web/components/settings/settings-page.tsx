"use client"

import * as React from "react"
import {
  Bell,
  CalendarRange,
  CreditCard,
  Lock,
  Save,
  School,
  Users,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@/components/button"
import { CardSkeleton } from "@/components/skeletons"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import {
  useDetailTab,
  type DetailTab,
} from "@/components/detail/detail-tabs"
import { useBranch } from "@/components/branch/branch-provider"
import { usePermission } from "@/hooks/auth/use-permission"
import { useSettings } from "@/hooks/settings"
import { SettingsPanelControls, SettingsPanelStatus } from "./settings-section-card"
import { SETTING_MANAGE } from "./permissions"
import {
  AcademicSessionCard,
  BranchesSummaryCard,
  FeatureTogglesCard,
  IdentitySettingsCard,
  NotificationCredentialsCard,
  PaymentCredentialsCard,
} from "./settings-cards"
import { GradingScaleEditor } from "./grading-scale-editor"

type PanelId =
  | "identity"
  | "academic"
  | "grading"
  | "payment"
  | "notification"
  | "toggles"

type SectionKey =
  | "profile"
  | "academic"
  | "billing"
  | "notifications"
  | "users"

interface SettingsSection extends DetailTab {
  key: SectionKey
  panels: readonly PanelId[]
}

const EMPTY_PANEL_STATUS: SettingsPanelStatus = {
  dirty: false,
  submitting: false,
}

const SECTION_TABS: SettingsSection[] = [
  {
    key: "profile",
    label: "School profile",
    icon: School,
    panels: ["identity"],
  },
  {
    key: "academic",
    label: "Academic",
    icon: CalendarRange,
    panels: ["academic", "grading"],
  },
  {
    key: "billing",
    label: "Fees & billing",
    icon: CreditCard,
    panels: ["toggles", "payment"],
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: Bell,
    panels: ["notification"],
  },
  {
    key: "users",
    label: "Users & roles",
    icon: Users,
    panels: [],
  },
]

const DEFAULT_PANEL_STATUS: Record<PanelId, SettingsPanelStatus> = {
  identity: EMPTY_PANEL_STATUS,
  academic: EMPTY_PANEL_STATUS,
  grading: EMPTY_PANEL_STATUS,
  payment: EMPTY_PANEL_STATUS,
  notification: EMPTY_PANEL_STATUS,
  toggles: EMPTY_PANEL_STATUS,
}

export function SettingsPage() {
  const canManage = usePermission(SETTING_MANAGE)
  const { currentBranch } = useBranch()
  const { active, setActive } = useDetailTab(SECTION_TABS)
  const settingsQuery = useSettings({ enabled: canManage })
  const [panelStatus, setPanelStatus] = React.useState(DEFAULT_PANEL_STATUS)
  const panelControlsRef = React.useRef<Partial<Record<PanelId, SettingsPanelControls>>>({})

  const registerPanelControls = React.useCallback(
    (panel: PanelId) => (controls: SettingsPanelControls | null) => {
      if (controls) {
        panelControlsRef.current[panel] = controls
        return
      }

      delete panelControlsRef.current[panel]
    },
    []
  )

  const updatePanel = React.useCallback(
    (panel: PanelId) => (status: SettingsPanelStatus) => {
      setPanelStatus((previous) => {
        const current = previous[panel]
        if (
          current.dirty === status.dirty &&
          current.submitting === status.submitting
        ) {
          return previous
        }

        return {
          ...previous,
          [panel]: status,
        }
      })
    },
    []
  )

  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to manage school settings."
      />
    )
  }

  if (settingsQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-32 rounded-md bg-subtle" />
            <div className="h-4 w-96 rounded-md bg-subtle" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-[11px] bg-subtle" />
            <div className="h-9 w-32 rounded-[11px] bg-subtle" />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[216px_minmax(0,760px)]">
          <CardSkeleton className="h-72" />
          <CardSkeleton className="min-h-[28rem]" />
        </div>
      </div>
    )
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <ErrorPanel
        description="We couldn't load the settings right now."
        onRetry={() => void settingsQuery.refetch()}
      />
    )
  }

  const settings = settingsQuery.data
  const activeSection =
    SECTION_TABS.find((section) => section.key === active) ?? SECTION_TABS[0]
  const activePanels = activeSection?.panels ?? []
  const hasSectionActions = activePanels.length > 0
  const isDirty = activePanels.some((panel) => panelStatus[panel].dirty)
  const isSubmitting = activePanels.some((panel) => panelStatus[panel].submitting)

  const runForActivePanels = (method: keyof SettingsPanelControls) => {
    for (const panel of activePanels) {
      panelControlsRef.current[panel]?.[method]()
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-[#1b1b1f]">
            Settings
          </h1>
          <p className="text-[14.5px] text-[#71717a]">
            School profile, academic sessions, billing rules, notifications and
            user access.
          </p>
          <p className="text-[13px] text-[#9a9aa3]">
            {currentBranch
              ? `Branch-specific billing rules currently reflect ${currentBranch.name}.`
              : "Global settings are available now. Select a branch to edit branch-scoped billing rules."}
          </p>
        </div>

        <div className="flex items-center gap-[9px]">
          <Button
            type="button"
            variant="outline"
            disabled={!hasSectionActions || isSubmitting || !isDirty}
            className="h-[38px] rounded-[11px] border-[#e2e2e6] bg-white px-3.5 text-[13.5px] font-semibold text-[#1b1b1f] hover:bg-[#f4f4f5]"
            onClick={() => runForActivePanels("reset")}
          >
            Discard changes
          </Button>
          <Button
            type="button"
            disabled={!hasSectionActions || !isDirty}
            loading={isSubmitting}
            className="h-[38px] rounded-[11px] bg-[#7c3aed] px-4 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(124,58,237,0.28)] hover:bg-[#6d28d9]"
            onClick={() => runForActivePanels("submit")}
          >
            <Save className="size-4" aria-hidden />
            Save changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[216px_minmax(0,760px)] xl:items-start">
        <nav className="flex flex-col gap-2 xl:sticky xl:top-24">
          {SECTION_TABS.map((section) => {
            const Icon = section.icon ?? School
            const selected = section.key === active

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActive(section.key)}
                className={cn(
                  "flex items-center gap-[11px] rounded-[10px] px-3 py-[9px] text-left text-[14px] transition-colors",
                  selected
                    ? "bg-[#f3effe] font-semibold text-[#7c3aed]"
                    : "font-medium text-[#71717a] hover:bg-[#f4f4f5]"
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                <span>{section.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          {active === "profile" ? (
            <>
              <IdentitySettingsCard
                settings={settings}
                hideFooter
                onStatusChange={updatePanel("identity")}
                onRegisterControls={registerPanelControls("identity")}
              />
              <BranchesSummaryCard />
            </>
          ) : null}

          {active === "academic" ? (
            <>
              <AcademicSessionCard
                settings={settings}
                hideFooter
                onStatusChange={updatePanel("academic")}
                onRegisterControls={registerPanelControls("academic")}
              />
              <GradingScaleEditor
                hideFooter
                onStatusChange={updatePanel("grading")}
                onRegisterControls={registerPanelControls("grading")}
              />
            </>
          ) : null}

          {active === "billing" ? (
            <>
              <FeatureTogglesCard
                settings={settings}
                hideFooter
                onStatusChange={updatePanel("toggles")}
                onRegisterControls={registerPanelControls("toggles")}
              />
              <PaymentCredentialsCard
                settings={settings}
                hideFooter
                onStatusChange={updatePanel("payment")}
                onRegisterControls={registerPanelControls("payment")}
              />
            </>
          ) : null}

          {active === "notifications" ? (
            <NotificationCredentialsCard
              settings={settings}
              hideFooter
              onStatusChange={updatePanel("notification")}
              onRegisterControls={registerPanelControls("notification")}
            />
          ) : null}

          {active === "users" ? (
            <div className="rounded-[14px] border border-[#ececef] bg-white p-8 shadow-[0_1px_3px_rgba(16,16,20,0.05)]">
              <EmptyState
                icon={Users}
                title="Users and roles are not wired here yet"
                description="This part of the imported settings design depends on the access-control work tracked in task 6.6 and the blocked backend 15.1 deliverable."
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
