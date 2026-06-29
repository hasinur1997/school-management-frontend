"use client"

/**
 * Academic structure management container (tasks 2.2 + 2.3). Splits the
 * settings-area screen into tabs: Sessions and Classes (each class owns its
 * nested sections and subjects), Assignments (teacher assignments), and — for
 * super admin only — Branches.
 *
 * Super-admin branch scoping is handled by the shell's branch switcher — it folds
 * the active branch into the shared read query keys (task 2.1) and the API
 * attaches `branch_id`, so switching branch re-scopes every list here.
 * Non-super-admin users are auto-scoped by the API.
 */

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { useBranch } from "@/components/branch/branch-provider"
import { AssignmentsManager } from "./assignments-manager"
import { BranchesManager } from "./branches-manager"
import { ClassesManager } from "./classes-manager"
import { SessionsManager } from "./sessions-manager"

// Segmented-control tab styling shared by every trigger, matching the app-wide
// convention (subtle track + surface-filled active pill) used elsewhere in the
// shell so the academic tabs read the same as Attendance and the rest.
const tabTriggerClass =
  "h-9 flex-none rounded-lg px-4 text-sm font-medium text-copy-muted data-active:bg-surface data-active:text-copy-primary data-active:shadow-sm"

export function AcademicManagement() {
  // Branch management is super-admin only (task 2.3) — it's the source for the
  // shell's branch switcher and has no per-branch scope of its own.
  const { isSuperAdmin } = useBranch()

  return (
    <Tabs defaultValue="sessions" className="gap-6">
      <TabsList className="inline-flex h-auto w-fit max-w-full flex-wrap justify-start gap-1 rounded-xl bg-subtle p-1">
        <TabsTrigger value="sessions" className={tabTriggerClass}>
          Sessions
        </TabsTrigger>
        <TabsTrigger value="classes" className={tabTriggerClass}>
          Classes
        </TabsTrigger>
        <TabsTrigger value="assignments" className={tabTriggerClass}>
          Assignments
        </TabsTrigger>
        {isSuperAdmin ? (
          <TabsTrigger value="branches" className={tabTriggerClass}>
            Branches
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="sessions">
        <SessionsManager />
      </TabsContent>
      <TabsContent value="classes">
        <ClassesManager />
      </TabsContent>
      <TabsContent value="assignments">
        <AssignmentsManager />
      </TabsContent>
      {isSuperAdmin ? (
        <TabsContent value="branches">
          <BranchesManager />
        </TabsContent>
      ) : null}
    </Tabs>
  )
}
