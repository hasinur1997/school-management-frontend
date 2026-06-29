"use client"

/**
 * App-wide date picker. A themed input you can **type into** (fast for far-back
 * dates like a date of birth — no clicking back through months) paired with a
 * calendar popover for browsing. Inside the calendar, month + year dropdowns let
 * you jump straight to any year.
 *
 * Replaces native `type="date"` inputs so every date selection shares one look
 * across browsers. Values are plain ISO date strings (`YYYY-MM-DD`) so it drops
 * straight into the existing RHF/string form state; the visible text uses the
 * app date format (`31 Jan 2025`, see `lib/format/date`).
 */

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

const ISO_FORMAT = "yyyy-MM-dd"
const DISPLAY_FORMAT = "dd MMM yyyy"

/** Human formats we accept when someone types a date directly. */
const TYPED_FORMATS = [
  "dd MMM yyyy",
  "d MMM yyyy",
  "dd MMMM yyyy",
  "d MMMM yyyy",
  "yyyy-MM-dd",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "dd-MM-yyyy",
]

/** Parse a stored `YYYY-MM-DD` value into a local `Date` (no timezone drift). */
function parseISODate(value?: string | null): Date | undefined {
  if (!value) return undefined
  const date = parse(value, ISO_FORMAT, new Date())
  return isValid(date) ? date : undefined
}

/** Best-effort parse of free-typed text into a Date. */
function parseTyped(text: string): Date | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  for (const fmt of TYPED_FORMATS) {
    const date = parse(trimmed, fmt, new Date())
    if (isValid(date)) return date
  }
  return undefined
}

export interface DatePickerProps {
  /** Selected value as an ISO date string (`YYYY-MM-DD`). */
  value?: string | null
  /** Called with the new ISO date string when a day is picked or typed. */
  onValueChange?: (value: string) => void
  /** Fired on input blur so RHF can run blur validation. */
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  id?: string
  name?: string
  className?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-describedby"?: string
  /**
   * Caption style. Defaults to `"dropdown"` (month + year selects) so any year
   * is one click away. Pair with `startMonth`/`endMonth` to bound the range.
   */
  captionLayout?: React.ComponentProps<typeof Calendar>["captionLayout"]
  startMonth?: Date
  endMonth?: Date
  /** Restrict selectable days (e.g. `{ after: new Date() }`). */
  disabledDates?: React.ComponentProps<typeof Calendar>["disabled"]
}

function DatePicker({
  value,
  onValueChange,
  onBlur,
  placeholder = "e.g. 19 May 1970",
  disabled,
  id,
  name,
  className,
  captionLayout = "dropdown",
  startMonth,
  endMonth,
  disabledDates,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseISODate(value)

  // Visible text is local state so typing isn't clobbered mid-keystroke; it
  // re-syncs from the canonical value whenever that changes externally.
  const [text, setText] = React.useState(
    selected ? format(selected, DISPLAY_FORMAT) : ""
  )
  const focusedRef = React.useRef(false)
  React.useEffect(() => {
    if (!focusedRef.current) {
      setText(selected ? format(selected, DISPLAY_FORMAT) : "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Month shown by the calendar — controlled so the year dropdown can jump.
  const [month, setMonth] = React.useState<Date | undefined>(selected)

  // The year dropdown needs a bounded range; fall back to a wide default so
  // callers that don't care (exam/session dates) still get the dropdown.
  const resolvedStart = startMonth ?? new Date(1940, 0)
  const resolvedEnd =
    endMonth ?? new Date(new Date().getFullYear() + 10, 11)

  function commit(date: Date) {
    onValueChange?.(format(date, ISO_FORMAT))
    setMonth(date)
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        name={name}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        autoComplete="off"
        className="pr-10"
        onFocus={() => {
          focusedRef.current = true
        }}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          if (next.trim() === "") {
            onValueChange?.("")
            return
          }
          const parsed = parseTyped(next)
          if (parsed) commit(parsed)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setOpen(true)
          }
        }}
        onBlur={() => {
          focusedRef.current = false
          // Re-render typed text in the canonical format (or clear if unparsable).
          setText(selected ? format(selected, DISPLAY_FORMAT) : "")
          onBlur?.()
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              tabIndex={-1}
              aria-label="Open calendar"
              className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <CalendarIcon className="size-4" aria-hidden />
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selected}
            month={month ?? selected}
            onMonthChange={setMonth}
            // Always render 6 week-rows so the popover keeps a constant height
            // and doesn't jump/reflow when navigating between months.
            fixedWeeks
            captionLayout={captionLayout}
            startMonth={resolvedStart}
            endMonth={resolvedEnd}
            disabled={disabledDates}
            autoFocus
            onSelect={(date) => {
              if (date) {
                commit(date)
                setText(format(date, DISPLAY_FORMAT))
                setOpen(false)
                onBlur?.()
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DatePicker }
