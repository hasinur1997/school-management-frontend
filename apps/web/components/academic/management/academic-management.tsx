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

export function AcademicManagement() {
  // Branch management is super-admin only (task 2.3) — it's the source for the
  // shell's branch switcher and has no per-branch scope of its own.
  const { isSuperAdmin } = useBranch()

  return (
    <Tabs defaultValue="sessions" className="gap-6">
      <TabsList>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
        <TabsTrigger value="classes">Classes</TabsTrigger>
        <TabsTrigger value="assignments">Assignments</TabsTrigger>
        {isSuperAdmin ? (
          <TabsTrigger value="branches">Branches</TabsTrigger>
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
