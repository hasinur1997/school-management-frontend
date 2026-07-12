"use client"

/**
 * Single student ID card (task 6.1), shown on the student detail "ID card" tab.
 * Renders a live, pixel-exact preview of the imported design (`IdCardPaper`) and
 * downloads/prints it as a client-generated PDF that matches the preview exactly
 * — the card is produced in the browser, so the on-screen view and the PDF can't
 * drift. Generation is gated on `idcard.generate` (the API is still the real
 * boundary for any server-side card); a card only makes sense for an active
 * student, so a TC/inactive student shows a note instead.
 *
 * The student photo is resolved to a `data:` URL up front so both the preview
 * and the PDF read from the same source and the rasterizer never trips over a
 * cross-origin image (see `usePhotoDataUrl`).
 */

import * as React from "react"
import { Download, IdCard, Loader2, Lock, Printer, ScrollText } from "lucide-react"

import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { usePermission } from "@/hooks/auth/use-permission"
import { usePhotoDataUrl } from "@/hooks/documents"
import { formatDate } from "@/lib/format"
import { proxiedImageUrl } from "@/lib/image-proxy"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  studentDisplayName,
  studentInitials,
  type Student,
} from "@/types/student"
import {
  IdCardPaper,
  ID_CARD_HEIGHT,
  ID_CARD_WIDTH,
  type IdCardData,
} from "./id-card-paper"
import { downloadIdCardPdf, printIdCardPdf } from "./id-card-document"
import { IDCARD_GENERATE } from "./permissions"

const EMPTY = "—"

/**
 * Scales a fixed-size child down to fit the available width so the two-card
 * layout is always fully visible (never clipped / horizontally scrolled),
 * regardless of how narrow the detail column is. Only scales down — on a wide
 * column the card renders at its natural size. The container reserves the
 * scaled height so nothing overlaps below.
 */
function FitToWidth({
  width,
  height,
  children,
}: {
  width: number
  height: number
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(1)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setScale(Math.min(1, el.clientWidth / width))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [width])

  return (
    <div ref={ref} className="overflow-hidden" style={{ height: height * scale }}>
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Build the card's fields from the full student profile. */
function toCardData(student: Student, photoUrl: string | null): IdCardData {
  const enrollment =
    student.enrollments?.find((e) => e.status === "active") ??
    student.enrollments?.[0] ??
    null

  const className = enrollment?.class?.name
    ? enrollment.section?.name
      ? `${enrollment.class.name}, Section ${enrollment.section.name}`
      : enrollment.class.name
    : EMPTY

  const guardianName =
    student.father_name_en || student.mother_name_en || EMPTY
  const guardianPhone = student.father_mobile || student.mother_mobile || EMPTY

  return {
    studentName: studentDisplayName(student),
    className,
    roll: enrollment?.roll_no != null ? String(enrollment.roll_no) : EMPTY,
    studentId: student.admission_no || EMPTY,
    // Blood group isn't part of the student profile contract yet.
    bloodGroup: EMPTY,
    dob: student.date_of_birth ? formatDate(student.date_of_birth) : EMPTY,
    validThru: enrollment?.session?.name || EMPTY,
    photoUrl,
    initials: studentInitials(student),
    guardianName,
    guardianPhone,
  }
}

export function IdCardPanel({ student }: { student: Student }) {
  const canGenerate = usePermission(IDCARD_GENERATE)
  const [downloading, setDownloading] = React.useState(false)
  const [printing, setPrinting] = React.useState(false)

  // Resolve the photo to a data URL so the preview and PDF are identical. The
  // photo lives on the cross-origin media host, so it's routed through the
  // same-origin proxy first (otherwise the fetch/canvas is CORS-blocked). Hooks
  // run unconditionally, before the active/permission short-circuits below.
  const photo = usePhotoDataUrl(proxiedImageUrl(student.photo_url))

  const fileName = `idcard-${student.admission_no ?? student.id}`
  const data = React.useMemo(
    () => toCardData(student, photo.data ?? null),
    [student, photo.data]
  )
  // Wait for the photo fetch to settle so the export doesn't race it.
  const photoPending = Boolean(student.photo_url) && photo.isPending

  if (!canGenerate) {
    return (
      <EmptyState
        icon={Lock}
        title="ID cards are issued by staff"
        description="You don't have permission to generate this student's ID card."
      />
    )
  }

  if (student.status !== "active") {
    return (
      <EmptyState
        icon={ScrollText}
        title="No ID card available"
        description="An ID card can only be issued to a student with an active enrollment. This student is no longer active."
      />
    )
  }

  async function onDownload() {
    setDownloading(true)
    try {
      const ok = await downloadIdCardPdf(data, fileName)
      if (ok) {
        toastSuccess("ID card downloaded.", { id: "id-card-download" })
      } else {
        toastError(new Error("Export failed"), "Couldn't generate the ID card.", {
          id: "id-card-download",
        })
      }
    } finally {
      setDownloading(false)
    }
  }

  async function onPrint() {
    setPrinting(true)
    try {
      const ok = await printIdCardPdf(data, fileName)
      if (!ok) {
        toastError(new Error("Export failed"), "Couldn't print the ID card.", {
          id: "id-card-print",
        })
      }
    } finally {
      setPrinting(false)
    }
  }

  const busy = downloading || printing || photoPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-copy-primary">
            Student ID card
          </h2>
          <p className="text-sm text-copy-muted">
            Preview the card below, then download or print it as a PDF.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onPrint}
            disabled={busy}
            loading={printing}
          >
            <Printer className="size-4" aria-hidden />
            Print
          </Button>
          <Button
            type="button"
            onClick={onDownload}
            disabled={busy}
            loading={downloading}
          >
            <Download className="size-4" aria-hidden />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="relative rounded-2xl border border-surface-border shadow-sm">
        {photoPending ? (
          <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-surface/90 px-2 py-1 text-xs text-copy-muted shadow-sm">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading photo…
          </div>
        ) : null}
        <FitToWidth width={ID_CARD_WIDTH} height={ID_CARD_HEIGHT}>
          <IdCardPaper data={data} />
        </FitToWidth>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-copy-muted">
        <IdCard className="size-3.5" aria-hidden />
        The card shows both sides — front (identity) and back (terms &amp;
        contact).
      </p>
    </div>
  )
}
