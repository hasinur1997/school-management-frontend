/**
 * Printable invoice document (task F-5.2) — recreates the imported "Invoice"
 * Claude Design handoff as an A4 paper document bound to the real
 * `InvoiceResource`/`PaymentResource` contract.
 *
 * Like the BTEB mark sheet (`result-mark-sheet-paper.tsx`), this is a
 * fixed-palette paper: it deliberately ignores the app's light/dark theme so
 * the invoice looks identical on screen and in print. The `.invoice-paper-root`
 * class is the isolation hook for the print stylesheet in `globals.css`.
 *
 * The invoice carries one or more described line items (e.g. tuition, exam,
 * transport) whose amounts sum to the total; the mock's discount and issue date
 * are still dropped rather than fabricated. It renders the item table, a
 * Total / Paid / Outstanding summary, and the real payment history. Money is
 * rendered from the API's decimal strings via `formatMoney`/`subtractMoney`
 * (no float math).
 */

import * as React from "react"

import { formatDate, formatMoney, subtractMoney } from "@/lib/format"
import {
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  invoiceMonthLabel,
  invoiceStudentName,
  type Invoice,
  type InvoiceEnrollmentRef,
} from "@/types/invoice"

/** A4 page width the paper renders at (matches the design handoff). */
export const INVOICE_PAPER_WIDTH = 794

/** Fixed default institution — no settings feature yet (mirrors the mark sheet). */
const SCHOOL_NAME = "Hazi Jabed Ali Memorial School"
const SCHOOL_NAME_BN = "হাজী জাবেদ আলী মেমোরিয়াল স্কুল"
const SCHOOL_ADDRESS = "Lakshmipur, Dhanuyaghata, Chatmohor, Pabna · Estd. 2017"
const SCHOOL_LOGO = "/branding/hjams-school-seal.svg"
const SCHOOL_MOTTO = "পড়, তোমার প্রভুর নামে"

const PAYMENT_NOTE =
  "Cash at the school office, or bKash / Nagad (ref: student ID). Please clear " +
  "dues before the due date to avoid a late fee. Contact the office for any discrepancy."

const FONT_SANS =
  "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FONT_MONO = "var(--font-mono), monospace"
const FONT_BN =
  "var(--font-bengali), 'Noto Sans Bengali', var(--font-sans), sans-serif"

const INK = "#1b1b1f"
const MUTED = "#71717a"
const FAINT = "#9a9aa3"
const HAIRLINE = "#ececef"
const NAVY = "#1b3a63"
const ACCENT = "#7c3aed"

/** Status pill palette. The three real statuses map onto the mock's tones. */
const STATUS_STYLE: Record<
  Invoice["status"],
  { color: string; bg: string; border: string; dot: string }
> = {
  paid: { color: "#15803d", bg: "#e9f8ee", border: "#cdeed7", dot: "#22c55e" },
  partial: { color: "#b45309", bg: "#fffbeb", border: "#fce7ad", dot: "#f59e0b" },
  unpaid: { color: "#c2410c", bg: "#fff2e8", border: "#fbdcc4", dot: "#f97316" },
}

/**
 * "Class Eight, Section B, Roll 17" from the enrollment snapshot, dropping any
 * part the API didn't carry (so a missing section/roll never prints a stray
 * comma). Returns null when nothing is known.
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

export function InvoicePaper({
  invoice,
  className,
}: {
  invoice: Invoice
  className?: string
}) {
  const status = STATUS_STYLE[invoice.status] ?? STATUS_STYLE.unpaid
  const outstanding = subtractMoney(invoice.amount, invoice.paid_amount)
  const settled = invoice.status === "paid"
  const period = invoiceMonthLabel(invoice.month, invoice.year)
  const payments = invoice.payments ?? []
  const enrollmentLine = formatEnrollmentLine(invoice.enrollment)
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
        width: INVOICE_PAPER_WIDTH,
        maxWidth: "100%",
        background: "#ffffff",
        border: `1px solid ${HAIRLINE}`,
        borderRadius: 14,
        boxShadow:
          "0 1px 3px rgba(16,16,20,0.05), 0 1px 1px rgba(16,16,20,0.03)",
        padding: "clamp(28px, 5vw, 52px) clamp(20px, 5vw, 56px) clamp(28px, 5vw, 44px)",
        boxSizing: "border-box",
        color: INK,
        fontFamily: FONT_SANS,
      }}
    >
      {/* Header: school identity + invoice title */}
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
            INVOICE
          </div>
          {invoice.invoice_no ? (
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 13,
                color: MUTED,
                marginTop: 4,
              }}
            >
              #{invoice.invoice_no}
            </div>
          ) : null}
        </div>
      </div>

      {/* Meta grid: bill-to + invoice info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 24,
          marginTop: 26,
        }}
      >
        <div>
          <div style={labelCap}>Billed to</div>
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
          <InfoRow label="Billing period">{period}</InfoRow>
          <InfoRow label="Due date">
            {invoice.due_date ? formatDate(invoice.due_date) : "—"}
          </InfoRow>
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
              {INVOICE_STATUS_LABELS[invoice.status]}
            </span>
          </div>
        </div>
      </div>

      {/* Line items — the described charges whose amounts sum to the total. An
          older invoice loaded without items falls back to a single line. */}
      <div
        style={{
          marginTop: 30,
          border: `1px solid ${HAIRLINE}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 160px", background: "#fafafa" }}
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

      {/* Totals: Subtotal / Paid / Outstanding */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <div
          style={{
            width: 300,
            display: "flex",
            flexDirection: "column",
            gap: 9,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              color: MUTED,
            }}
          >
            <span>Subtotal</span>
            <span style={{ fontFamily: FONT_MONO, color: INK }}>
              {formatMoney(invoice.amount)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              color: MUTED,
            }}
          >
            <span>Paid</span>
            <span style={{ fontFamily: FONT_MONO, color: INK }}>
              &minus; {formatMoney(invoice.paid_amount)}
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
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {settled ? "Total paid" : "Outstanding"}
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                fontFamily: FONT_MONO,
                color: settled ? "#15803d" : ACCENT,
              }}
            >
              {settled ? formatMoney(invoice.amount) : formatMoney(outstanding)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {payments.length > 0 ? (
        <div
          style={{
            marginTop: 34,
            paddingTop: 22,
            borderTop: `1px solid ${HAIRLINE}`,
          }}
        >
          <div style={labelCap}>Payment history</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column" }}>
            {payments.map((payment, i) => (
              <div
                key={payment.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  padding: "11px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${HAIRLINE}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {formatMoney(payment.amount)}
                  </div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>
                    {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                    {payment.receipt_no ? ` · ${payment.receipt_no}` : ""}
                    {payment.paid_at ? ` · ${formatDate(payment.paid_at)}` : ""}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color:
                      payment.status === "paid"
                        ? "#15803d"
                        : payment.status === "failed"
                          ? "#dc2626"
                          : MUTED,
                  }}
                >
                  {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Payment method note */}
      <div
        style={{
          marginTop: 34,
          paddingTop: 22,
          borderTop: `1px solid ${HAIRLINE}`,
        }}
      >
        <div style={labelCap}>Payment method</div>
        <div
          style={{ fontSize: 13, marginTop: 8, lineHeight: 1.7, color: MUTED }}
        >
          {PAYMENT_NOTE}
        </div>
      </div>

      {/* Footer: motto + signature */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 56,
        }}
      >
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
            Authorized signature
          </div>
        </div>
      </div>
    </div>
  )
}
