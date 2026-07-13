/**
 * Printable transfer certificate (task 6.2) — a faithful, pixel-for-pixel
 * recreation of the imported "Transfer Certificate" Claude Design handoff, bound
 * to real student data. A single A4 page (794×1123) laid out exactly as the
 * design so the on-screen preview and the client-rendered PDF match it.
 *
 * Like the sibling invoice/receipt/ID-card papers this is a **fixed-palette**
 * paper: it deliberately ignores the app's light/dark theme and uses inline
 * styles with literal design values so it renders identically on screen, in the
 * exported PDF, and in print. The fonts (Geist, Geist Mono, Noto Sans Bengali)
 * are the app's own `--font-*` variables — the faces the design specifies. The
 * page carries the shared `invoice-paper-root` class so `paper-pdf` flattens its
 * border/radius/shadow for a clean, full-bleed document.
 */

import * as React from "react"

/** The design's page width in px; the exporter fits the PDF to this. */
export const TC_PAPER_WIDTH = 794
/** The design's page height (A4 portrait at 96dpi). */
export const TC_PAPER_HEIGHT = 1123

/** Fixed institution identity (mirrors the design + `id-card-paper.tsx`). */
const SCHOOL_NAME = "Hazi Jabed Ali Memorial School"
const SCHOOL_NAME_BN = "হাজী জাবেদ আলী মেমোরিয়াল স্কুল"
const SCHOOL_ADDRESS_LINE =
  "Lakshmipur, Dhanuyaghata, Chatmohor, Pabna · Estd. 2017"
const SCHOOL_MOTTO = "পড়, তোমার প্রভুর নামে"
const FOOTER_NOTE =
  "This certificate is invalid without the official seal and signature."
const SCHOOL_LOGO = "/branding/hjams-school-seal.svg"

const NAVY = "#1b3a63"

const FONT_SANS =
  "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FONT_MONO = "var(--font-mono), 'Geist Mono', monospace"
const FONT_BN =
  "var(--font-bengali), 'Noto Sans Bengali', var(--font-sans), sans-serif"

export interface TcPaperData {
  refNo: string
  issueDate: string
  studentName: string
  fatherName: string
  motherName: string
  studentId: string
  dateOfBirth: string
  className: string
  roll: string
  admissionDate: string
  leavingDate: string
  lastExam: string
  promotedTo: string
  conduct: string
  reason: string
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#9a9aa3",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 13,
          color: "#1b1b1f",
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </>
  )
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr" }}>
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #ececef",
          fontSize: 13.5,
          color: "#71717a",
        }}
      >
        {label}
      </div>
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #ececef",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Signature({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 170,
          borderTop: "1px solid #1b1b1f",
          paddingTop: 6,
          fontSize: 12.5,
          color: "#71717a",
        }}
      >
        {label}
      </div>
    </div>
  )
}

export function TcPaper({ data }: { data: TcPaperData }) {
  const recordRows: { label: string; value: string }[] = [
    { label: "Student ID", value: data.studentId },
    { label: "Date of birth", value: data.dateOfBirth },
    { label: "Class last attended", value: data.className },
    { label: "Roll number", value: data.roll },
    { label: "Date of admission", value: data.admissionDate },
    { label: "Date of leaving", value: data.leavingDate },
    { label: "Last examination taken", value: data.lastExam },
    { label: "Promoted to class", value: data.promotedTo },
  ]

  return (
    <div
      className="invoice-paper-root"
      data-screen-label="Transfer Certificate"
      style={{
        width: TC_PAPER_WIDTH,
        maxWidth: "100%",
        minHeight: TC_PAPER_HEIGHT,
        background: "#ffffff",
        border: "1px solid #ececef",
        borderRadius: 14,
        boxShadow:
          "0 1px 3px rgba(16,16,20,0.05), 0 1px 1px rgba(16,16,20,0.03)",
        padding: "52px 56px 44px",
        boxSizing: "border-box",
        color: "#1b1b1f",
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT_SANS,
      }}
    >
      {/* Header: school identity */}
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
            alt="School logo"
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              objectFit: "cover",
              flex: "none",
            }}
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
            <div style={{ fontSize: 13, color: "#71717a", marginTop: 6 }}>
              {SCHOOL_ADDRESS_LINE}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <MetaBlock label="Ref No." value={data.refNo} />
          <div style={{ marginTop: 12 }}>
            <MetaBlock label="Date of issue" value={data.issueDate} />
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginTop: 34 }}>
        <div
          style={{
            display: "inline-block",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: NAVY,
            borderBottom: `2px solid ${NAVY}`,
            padding: "0 18px 8px",
          }}
        >
          Transfer Certificate
        </div>
        <div
          style={{
            fontFamily: FONT_BN,
            fontSize: 14,
            color: "#71717a",
            marginTop: 10,
          }}
        >
          ছাড়পত্র / স্থানান্তর সনদ
        </div>
      </div>

      {/* Certification statement */}
      <div
        style={{
          fontSize: 14.5,
          lineHeight: 1.8,
          color: "#1b1b1f",
          marginTop: 30,
        }}
      >
        This is to certify that <strong>{data.studentName}</strong>, son/daughter
        of <strong>{data.fatherName}</strong> and{" "}
        <strong>{data.motherName}</strong>, was a bona fide student of this
        institution. On the guardian&rsquo;s application, he/she is hereby granted
        this Transfer Certificate. All dues to the school have been cleared, and
        nothing remains outstanding against his/her name.
      </div>

      {/* Student record grid */}
      <div
        style={{
          marginTop: 26,
          border: "1px solid #ececef",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#fafafa",
            padding: "12px 18px",
            borderBottom: "1px solid #ececef",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#9a9aa3",
          }}
        >
          Student record
        </div>
        {recordRows.map((row) => (
          <RecordRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>

      {/* Conduct + reason */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginTop: 26,
        }}
      >
        <div
          style={{
            background: "#fafafa",
            border: "1px solid #ececef",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#9a9aa3",
            }}
          >
            General conduct
          </div>
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              marginTop: 8,
              color: "#15803d",
            }}
          >
            {data.conduct}
          </div>
        </div>
        <div
          style={{
            background: "#fafafa",
            border: "1px solid #ececef",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#9a9aa3",
            }}
          >
            Reason for leaving
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>
            {data.reason}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.7,
          color: "#71717a",
          marginTop: 22,
        }}
      >
        We wish him/her every success in future endeavours. This certificate is
        issued without any erasure or alteration; any correction is valid only
        under the Head Teacher&rsquo;s signature and the school seal.
      </div>

      {/* Signatures */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: "auto",
          paddingTop: 64,
        }}
      >
        <Signature label="Class Teacher" />
        <Signature label="Office Seal" />
        <Signature label="Head Teacher" />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 28,
          paddingTop: 16,
          borderTop: "1px solid #ececef",
        }}
      >
        <div style={{ fontFamily: FONT_BN, fontSize: 13, color: "#9a9aa3" }}>
          {SCHOOL_MOTTO}
        </div>
        <div style={{ fontSize: 12, color: "#9a9aa3" }}>{FOOTER_NOTE}</div>
      </div>
    </div>
  )
}
