"use client"

/**
 * Live transfer certificate preview + client PDF actions (task 6.2). Shows a
 * pixel-exact, scaled-to-fit preview of the imported design (`TcPaper`) and
 * downloads / prints it as a client-generated PDF that matches the preview
 * exactly — the certificate is produced in the browser, so the on-screen view
 * and the file can't drift. Shared by the TC detail screen and the student's TC
 * tab so both render one certificate surface.
 */

import * as React from "react"
import { Download, Printer } from "lucide-react"

import { Button } from "@/components/button"
import { toastError, toastSuccess } from "@/lib/toast"
import { TcPaper, TC_PAPER_HEIGHT, TC_PAPER_WIDTH, type TcPaperData } from "./tc-paper"
import { downloadTcPdf, printTcPdf } from "./tc-document"

/**
 * Scales the fixed-width certificate down to fit the available width so the A4
 * page is always fully visible (never clipped / horizontally scrolled),
 * regardless of the column width. Only scales down; the container reserves the
 * scaled height so nothing overlaps below. Mirrors the ID-card preview.
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
    <div ref={ref} style={{ height: height * scale }}>
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

export function TcCertificateView({
  data,
  fileName,
}: {
  data: TcPaperData
  fileName: string
}) {
  const [downloading, setDownloading] = React.useState(false)
  const [printing, setPrinting] = React.useState(false)
  const busy = downloading || printing

  async function onDownload() {
    setDownloading(true)
    try {
      const ok = await downloadTcPdf(data, fileName)
      if (ok) {
        toastSuccess("Transfer certificate downloaded.", { id: "tc-download" })
      } else {
        toastError(new Error("Export failed"), "Couldn't generate the certificate.", {
          id: "tc-download",
        })
      }
    } finally {
      setDownloading(false)
    }
  }

  async function onPrint() {
    setPrinting(true)
    try {
      const ok = await printTcPdf(data, fileName)
      if (!ok) {
        toastError(new Error("Export failed"), "Couldn't print the certificate.", {
          id: "tc-print",
        })
      }
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-copy-primary">
            Transfer certificate
          </h2>
          <p className="text-sm text-copy-muted">
            Preview the certificate below, then download or print it as a PDF.
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

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-[#f7f7f8] p-4 shadow-sm sm:p-6">
        <FitToWidth width={TC_PAPER_WIDTH} height={TC_PAPER_HEIGHT}>
          <TcPaper data={data} />
        </FitToWidth>
      </div>
    </div>
  )
}
