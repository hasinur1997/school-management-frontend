/**
 * Printable money-receipt document (task F-5.3) — recreates the imported
 * "Money Receipt" Claude Design handoff as an A4 paper document bound to the
 * real `PaymentResource`/`InvoiceResource` contract.
 *
 * A receipt acknowledges one recorded `Payment` against its `Invoice`. Like the
 * sibling `invoice-paper.tsx`, this is a fixed-palette paper: it deliberately
 * ignores the app's light/dark theme so the receipt looks identical on screen
 * and in print, and reuses the shared `.invoice-paper-root` isolation hook so
 * the print stylesheet in `globals.css` hides the app shell for both papers.
 *
 * The receipt reprints the invoice's described line items (tuition, exam, …) for
 * context, then states the amount actually received in this payment. As in the
 * invoice paper, the mock's fabricated fields — the flat "Discount / waiver"
 * line — are dropped rather than invented, since the contract carries no
 * discount concept. The "Amount in words" band is a faithful integer-based
 * transformation of the real `payment.amount` (no float math). Money is
 * rendered from the API's decimal strings via `formatMoney`.
 */

import * as React from "react"

import { formatDate, formatMoney } from "@/lib/format"
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  invoiceMonthLabel,
  invoiceStudentName,
  type Invoice,
  type InvoiceEnrollmentRef,
  type Payment,
  type PaymentStatus,
} from "@/types/invoice"

/** A4 page width the paper renders at (matches the design handoff). */
export const RECEIPT_PAPER_WIDTH = 794

/** Fixed default institution — no settings feature yet (mirrors the invoice). */
const SCHOOL_NAME = "Hazi Jabed Ali Memorial School"
const SCHOOL_NAME_BN = "হাজী জাবেদ আলী মেমোরিয়াল স্কুল"
const SCHOOL_ADDRESS = "Lakshmipur, Dhanuyaghata, Chatmohor, Pabna · Estd. 2017"
const SCHOOL_LOGO = "/branding/hjams-school-seal.svg"
const SCHOOL_MOTTO = "পড়, তোমার প্রভুর নামে"

const RECEIPT_NOTE =
  "This receipt confirms the payment recorded above. Please retain it for your " +
  "records and contact the office for any discrepancy."

const FONT_SANS =
  "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FONT_MONO = "var(--font-mono), monospace"
const FONT_BN = "'Noto Sans Bengali', var(--font-sans), sans-serif"

const INK = "#1b1b1f"
const MUTED = "#71717a"
const FAINT = "#9a9aa3"
const HAIRLINE = "#ececef"
const NAVY = "#1b3a63"
const ACCENT = "#7c3aed"

/** Status pill palette — the four payment statuses map onto the mock's tones. */
const STATUS_STYLE: Record<
  PaymentStatus,
  { color: string; bg: string; border: string; dot: string }
> = {
  paid: { color: "#15803d", bg: "#e9f8ee", border: "#cdeed7", dot: "#22c55e" },
  pending: { color: "#b45309", bg: "#fffbeb", border: "#fce7ad", dot: "#f59e0b" },
  failed: { color: "#c2410c", bg: "#fff2e8", border: "#fbdcc4", dot: "#f97316" },
  cancelled: { color: "#71717a", bg: "#f4f4f5", border: "#e4e4e7", dot: "#a1a1aa" },
}

/**
 * "Class Eight, Section B, Roll 17" from the enrollment snapshot, dropping any
 * part the API didn't carry (so a missing section/roll never prints a stray
 * comma). Returns null when nothing is known. Mirrors `invoice-paper.tsx`.
 */
function formatEnrollmentLine(
  enrollment: InvoiceEnrollmentRef | null | undefined
): string | null {
  if (!enrollment) return null
  const parts: string[] = []
  if (enrollment.class) parts.push(`Class ${enrollment.class}`)
  if (enrollment.section) parts.push(`Section ${enrollment.section}`)
  if (enrollment.roll_no != null) parts.push(`Roll ${enrollment.roll_no}`)
  return parts.length > 0 ? parts.join(", ") : null
}

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
  "sixteen", "seventeen", "eighteen", "nineteen",
]
const TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty",
  "ninety",
]

/** Words for an integer 0–999 (no leading/trailing spaces). */
function belowThousandToWords(n: number): string {
  const parts: string[] = []
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)] ?? ""} hundred`)
    n %= 100
  }
  if (n >= 20) {
    const tens = TENS[Math.floor(n / 10)] ?? ""
    parts.push(tens + (n % 10 ? ` ${ONES[n % 10] ?? ""}` : ""))
  } else if (n > 0) {
    parts.push(ONES[n] ?? "")
  }
  return parts.join(" ")
}

/**
 * Render an integer taka amount in English words using the South-Asian scale
 * (thousand / lakh / crore) standard for Bangladeshi money receipts, e.g.
 * `6000 → "six thousand"`. Operates on an integer count of taka only — no float
 * math — so it pairs with the string-based `payment.amount`.
 */
function integerToWords(n: number): string {
  if (n === 0) return "zero"
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const rest = n % 1000

  const segments: string[] = []
  if (crore) segments.push(`${integerToWords(crore)} crore`)
  if (lakh) segments.push(`${belowThousandToWords(lakh)} lakh`)
  if (thousand) segments.push(`${belowThousandToWords(thousand)} thousand`)
  if (rest) segments.push(belowThousandToWords(rest))
  return segments.join(" ")
}

/**
 * A decimal money string (`"6000.00"`) as a receipt-style words line, e.g.
 * "Six thousand taka only" or "One thousand two hundred taka and fifty paisa
 * only". Parses the string directly (no `Number` on the whole value) so large
 * amounts keep full precision; returns null for a non-numeric amount.
 */
function amountInWords(value: string): string | null {
  const raw = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null
  const [intPart = "0", decRaw = ""] = raw.replace(/^-/, "").split(".")
  const taka = Number(intPart)
  const paisa = Number(decRaw.slice(0, 2).padEnd(2, "0"))

  let words = `${integerToWords(taka)} taka`
  if (paisa > 0) words += ` and ${belowThousandToWords(paisa)} paisa`
  words += " only"
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const labelCap: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: FAINT,
}

function InfoRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        fontSize: 13.5,
      }}
    >
      <span style={{ color: MUTED }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{children}</span>
    </div>
  )
}

export function ReceiptPaper({
  invoice,
  payment,
  className,
}: {
  invoice: Invoice
  payment: Payment
  className?: string
}) {
  const status = STATUS_STYLE[payment.status] ?? STATUS_STYLE.pending
  const period = invoiceMonthLabel(invoice.month, invoice.year)
  const enrollmentLine = formatEnrollmentLine(invoice.enrollment)
  const words = amountInWords(payment.amount)
  // The invoice's line items, or a single synthesized line from the total for
  // an older invoice loaded without items (so the table never renders empty).
  const lineItems =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : [{ description: `Monthly fee — ${period}`, amount: invoice.amount }]

  return (
    <div
      className={`invoice-paper-root${className ? ` ${className}` : ""}`}
      style={{
        width: RECEIPT_PAPER_WIDTH,
        maxWidth: "100%",
        background: "#ffffff",
        border: `1px solid ${HAIRLINE}`,
        borderRadius: 14,
        boxShadow:
          "0 1px 3px rgba(16,16,20,0.05), 0 1px 1px rgba(16,16,20,0.03)",
        padding:
          "clamp(28px, 5vw, 52px) clamp(20px, 5vw, 56px) clamp(28px, 5vw, 44px)",
        boxSizing: "border-box",
        color: INK,
        fontFamily: FONT_SANS,
      }}
    >
      {/* Header: school identity + receipt title */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          borderBottom: `2px solid ${NAVY}`,
          paddingBottom: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SCHOOL_LOGO}
            alt=""
            style={{ width: 76, height: 76, objectFit: "contain", flex: "none" }}
          />
          <div>
            <div
              style={{
                fontSize: 21,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {SCHOOL_NAME}
            </div>
            <div
              style={{
                fontFamily: FONT_BN,
                fontSize: 15,
                fontWeight: 600,
                color: NAVY,
                marginTop: 2,
              }}
            >
              {SCHOOL_NAME_BN}
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>
              {SCHOOL_ADDRESS}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: NAVY,
            }}
          >
            MONEY RECEIPT
          </div>
          {payment.receipt_no ? (
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 13,
                color: MUTED,
                marginTop: 4,
              }}
            >
              #{payment.receipt_no}
            </div>
          ) : null}
        </div>
      </div>

      {/* Meta grid: received-from + receipt info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 24,
          marginTop: 26,
        }}
      >
        <div>
          <div style={labelCap}>Received from</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginTop: 8,
              letterSpacing: "-0.01em",
            }}
          >
            {invoiceStudentName(invoice)}
          </div>
          {invoice.student ? (
            <div
              style={{
                fontSize: 13.5,
                color: MUTED,
                marginTop: 4,
                lineHeight: 1.6,
              }}
            >
              {enrollmentLine ? (
                <>
                  {enrollmentLine}
                  <br />
                </>
              ) : null}
              Student ID:{" "}
              <span style={{ fontFamily: FONT_MONO }}>{invoice.student.id}</span>
              {invoice.student.guardian_name ? (
                <>
                  <br />
                  Guardian: {invoice.student.guardian_name}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        <div
          style={{
            background: "#fafafa",
            border: `1px solid ${HAIRLINE}`,
            borderRadius: 12,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <InfoRow label="Receipt date">
            {payment.paid_at ? formatDate(payment.paid_at) : "—"}
          </InfoRow>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              fontSize: 13.5,
            }}
          >
            <span style={{ color: MUTED }}>Against invoice</span>
            <span style={{ fontWeight: 600, fontFamily: FONT_MONO }}>
              {invoice.invoice_no ? `#${invoice.invoice_no}` : "—"}
            </span>
          </div>
          <InfoRow label="Billing period">{period}</InfoRow>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13.5,
            }}
          >
            <span style={{ color: MUTED }}>Status</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 11px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                border: `1px solid ${status.border}`,
                color: status.color,
                background: status.bg,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: status.dot,
                }}
              />
              {PAYMENT_STATUS_LABELS[payment.status]}
            </span>
          </div>
        </div>
      </div>

      {/* Line items — the invoice's described charges, for context. An older
          invoice loaded without items falls back to a single line. */}
      <div
        style={{
          marginTop: 30,
          border: `1px solid ${HAIRLINE}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 160px",
            background: "#fafafa",
          }}
        >
          <div
            style={{
              ...labelCap,
              padding: "12px 18px",
              borderBottom: `1px solid ${HAIRLINE}`,
            }}
          >
            Description
          </div>
          <div
            style={{
              ...labelCap,
              textAlign: "right",
              padding: "12px 18px",
              borderBottom: `1px solid ${HAIRLINE}`,
            }}
          >
            Amount
          </div>
        </div>
        {lineItems.map((item, i) => (
          <div
            key={i}
            style={{ display: "grid", gridTemplateColumns: "1fr 160px" }}
          >
            <div
              style={{
                padding: "13px 18px",
                fontSize: 14.5,
                borderTop: i === 0 ? "none" : `1px solid ${HAIRLINE}`,
              }}
            >
              {item.description}
            </div>
            <div
              style={{
                padding: "13px 18px",
                fontSize: 14.5,
                textAlign: "right",
                fontFamily: FONT_MONO,
                borderTop: i === 0 ? "none" : `1px solid ${HAIRLINE}`,
              }}
            >
              {formatMoney(item.amount)}
            </div>
          </div>
        ))}
      </div>

      {/* Totals: invoice subtotal + the amount received in this payment. The
          mock's flat discount/waiver line is dropped — the contract has no
          discount concept (mirrors invoice-paper.tsx). */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <div
          style={{ width: 300, display: "flex", flexDirection: "column", gap: 9 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              color: MUTED,
            }}
          >
            <span>Invoice subtotal</span>
            <span style={{ fontFamily: FONT_MONO, color: INK }}>
              {formatMoney(invoice.amount)}
            </span>
          </div>
          <div style={{ height: 1, background: HAIRLINE, margin: "2px 0" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700 }}>Amount received</span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                fontFamily: FONT_MONO,
                color: ACCENT,
              }}
            >
              {formatMoney(payment.amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Amount in words — a faithful transform of the real amount received. */}
      {words ? (
        <div
          style={{
            marginTop: 22,
            background: "#f3effe",
            border: "1px solid #e7defb",
            borderRadius: 12,
            padding: "14px 18px",
          }}
        >
          <div style={{ ...labelCap, color: ACCENT }}>Amount in words</div>
          <div
            style={{
              fontSize: 14.5,
              marginTop: 6,
              fontWeight: 600,
              color: INK,
            }}
          >
            {words}
          </div>
        </div>
      ) : null}

      {/* Payment method + notes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginTop: 26,
          paddingTop: 22,
          borderTop: `1px solid ${HAIRLINE}`,
        }}
      >
        <div>
          <div style={labelCap}>Payment method</div>
          <div
            style={{ fontSize: 14, marginTop: 8, lineHeight: 1.7, color: INK }}
          >
            {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
          </div>
        </div>
        <div>
          <div style={labelCap}>Notes</div>
          <div
            style={{ fontSize: 13, marginTop: 8, lineHeight: 1.7, color: MUTED }}
          >
            {RECEIPT_NOTE}
          </div>
        </div>
      </div>

      {/* Footer: guardian + office signatures with the school motto between */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 52,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 180,
              borderTop: `1px solid ${INK}`,
              paddingTop: 6,
              fontSize: 12.5,
              color: MUTED,
            }}
          >
            Guardian signature
          </div>
        </div>
        <div style={{ fontFamily: FONT_BN, fontSize: 13, color: FAINT }}>
          {SCHOOL_MOTTO}
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 180,
              borderTop: `1px solid ${INK}`,
              paddingTop: 6,
              fontSize: 12.5,
              color: MUTED,
            }}
          >
            Received by (office)
          </div>
        </div>
      </div>
    </div>
  )
}
