"use client"

/**
 * Shared individual-promotion dialog (task 4.5). Self-contained: it owns the
 * target session/class/section + roll pickers and the promotion mutation, so any
 * caller (the promotion preview table, the student detail actions) only has to
 * open it with a student. Promoting a held student who did not pass needs
 * `promotion.override` — the API's 403 stays the real boundary.
 */

import * as React from "react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

import { ClassSelect } from "@/components/academic/class-select"
import { SectionSelect } from "@/components/academic/section-select"
import { SessionSelect } from "@/components/academic/session-select"
import { Button } from "@/components/button"
import { useClasses } from "@/hooks/academic"
import { usePromoteIndividual } from "@/hooks/promotions"
import { toastError, toastSuccess } from "@/lib/toast"

export interface PromoteStudentTarget {
  /** Student public id (hash). */
  id: string | number
  name: string | null
  /** Current roll, used to seed the target roll field. */
  currentRoll?: string | number | null
  /** When false the student did not pass — promoting is an override. */
  isEligible?: boolean
}

function PromoteStudentForm({
  student,
  defaultClassName,
  onClose,
  onPromoted,
}: {
  student: PromoteStudentTarget
  defaultClassName: string | null
  onClose: () => void
  onPromoted?: () => void
}) {
  const [toSessionId, setToSessionId] = React.useState<string | null>(null)
  const [toClassId, setToClassId] = React.useState<string | null>(null)
  const [toSectionId, setToSectionId] = React.useState<string | null>(null)
  const [roll, setRoll] = React.useState(
    student.currentRoll != null ? String(student.currentRoll) : ""
  )
  const promote = usePromoteIndividual()
  const isOverride = student.isEligible === false

  // Default the target class to the resolved next class by matching its name
  // against the options (adjust-state-during-render; the guard stops it
  // re-entering once set). Callers that don't know the next class pass null.
  const classesQuery = useClasses()
  if (toClassId == null && defaultClassName && classesQuery.data) {
    const match = classesQuery.data.find(
      (schoolClass) => schoolClass.name === defaultClassName
    )
    if (match) setToClassId(match.id)
  }

  const rollValue = Number(roll)
  const rollValid =
    roll.trim().length > 0 &&
    Number.isInteger(rollValue) &&
    rollValue >= 1 &&
    rollValue <= 65535
  const ready = Boolean(toSessionId && toClassId && toSectionId && rollValid)

  function changeClass(value: string | null) {
    setToClassId(value)
    setToSectionId(null)
  }

  async function handleConfirm() {
    if (!ready || !toSessionId || !toClassId || !toSectionId) return
    try {
      await promote.mutateAsync({
        student_id: student.id,
        to_session_id: toSessionId,
        to_class_id: toClassId,
        to_section_id: toSectionId,
        roll_no: rollValue,
      })
      toastSuccess(`${student.name || "Student"} promoted.`, {
        id: "promotions-individual",
      })
      onPromoted?.()
      onClose()
    } catch (error) {
      toastError(error, "Couldn't promote this student.", {
        id: "promotions-individual",
      })
    }
  }

  return (
    <DialogContent className="rounded-2xl sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {isOverride ? "Promote held student?" : "Promote student?"}
        </DialogTitle>
        <DialogDescription>
          {isOverride
            ? `${student.name || "This student"} did not pass — this is an override promotion. Choose where to move them.`
            : `Move ${student.name || "this student"} into a target class, section and session.`}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
            Target session
          </span>
          <SessionSelect
            value={toSessionId}
            onValueChange={setToSessionId}
            placeholder="Select session"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
            Target class
          </span>
          <ClassSelect value={toClassId} onValueChange={changeClass} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
            Target section
          </span>
          <SectionSelect
            classId={toClassId}
            value={toSectionId}
            onValueChange={setToSectionId}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
            Roll number
          </span>
          <Input
            value={roll}
            onChange={(event) => setRoll(event.target.value)}
            inputMode="numeric"
            placeholder="e.g. 5"
            className="font-mono tabular-nums"
          />
          {roll.trim() && !rollValid ? (
            <span className="text-xs text-error">
              Enter a whole number between 1 and 65535.
            </span>
          ) : null}
        </label>
      </div>
      <DialogFooter>
        <DialogClose
          render={
            <Button type="button" variant="outline" disabled={promote.isPending}>
              Cancel
            </Button>
          }
        />
        <Button
          type="button"
          loading={promote.isPending}
          disabled={!ready}
          onClick={handleConfirm}
        >
          {promote.isPending ? "Promoting..." : "Promote"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

/**
 * Dialog shell that mounts a fresh {@link PromoteStudentForm} per student (keyed
 * on the student id) so its target/roll state seeds cleanly on each open.
 */
export function PromoteStudentDialog({
  student,
  defaultClassName = null,
  onClose,
  onPromoted,
}: {
  student: PromoteStudentTarget | null
  /** The API-resolved next class name, to default the target class. */
  defaultClassName?: string | null
  onClose: () => void
  onPromoted?: () => void
}) {
  return (
    <Dialog open={student !== null} onOpenChange={(open) => !open && onClose()}>
      {student ? (
        <PromoteStudentForm
          key={String(student.id)}
          student={student}
          defaultClassName={defaultClassName}
          onClose={onClose}
          onPromoted={onPromoted}
        />
      ) : null}
    </Dialog>
  )
}
