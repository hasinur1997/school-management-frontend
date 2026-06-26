"use client"

import * as React from "react"
import { BookOpenCheck, Quote } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"

const GUIDELINES = [
  {
    author: "Dr. Ayesha Rahman",
    role: "Academic counselor",
    title: "Start with the hardest lesson",
    body: "Use the first focused hour for the subject that needs the most attention. Easy work can wait until your energy drops.",
  },
  {
    author: "Prof. Mahmud Hasan",
    role: "Head teacher",
    title: "Keep one clean notebook",
    body: "Write dates, headings, and corrections clearly. A tidy notebook makes revision faster before class tests and exams.",
  },
  {
    author: "Nusrat Jahan",
    role: "Student mentor",
    title: "Ask before confusion grows",
    body: "If a topic feels unclear after two attempts, note the exact question and ask your teacher before the next lesson.",
  },
  {
    author: "Md. Farhan Karim",
    role: "Science teacher",
    title: "Practice in short cycles",
    body: "Study for 25 minutes, solve a few questions, then take a short break. Repeating this is better than one long unfocused session.",
  },
  {
    author: "Sadia Akter",
    role: "Class advisor",
    title: "Review the same day",
    body: "Spend ten minutes after school reviewing each main lesson. Same-day revision helps the topic stay familiar.",
  },
  {
    author: "Imran Hossain",
    role: "Mathematics teacher",
    title: "Show every step",
    body: "Do not only write the final answer. Clear working steps help you find mistakes and earn marks for method.",
  },
  {
    author: "Lamia Chowdhury",
    role: "Language teacher",
    title: "Read aloud once",
    body: "Reading a paragraph aloud improves attention, pronunciation, and memory. Mark unfamiliar words for later practice.",
  },
  {
    author: "Tanvir Ahmed",
    role: "Examination coordinator",
    title: "Prepare the night before",
    body: "Pack books, admit cards, stationery, and uniform items before sleeping so the morning starts calmly.",
  },
]

function hashSeed(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function seededGuidelines(seed: string) {
  const next = [...GUIDELINES]
  let value = hashSeed(seed)

  for (let i = next.length - 1; i > 0; i--) {
    value = (value * 1664525 + 1013904223) >>> 0
    const j = value % (i + 1)
    const current = next[i]!
    next[i] = next[j]!
    next[j] = current
  }

  return next.slice(0, 4)
}

export function StudentAdvisoryGuidelines() {
  const { user } = useAuth()
  const items = React.useMemo(
    () => seededGuidelines(String(user.id)),
    [user.id]
  )

  return (
    <section className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="mb-5 flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-dim text-brand">
          <BookOpenCheck className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-copy-primary">
            Advisory guidelines
          </h2>
          <p className="truncate text-sm text-copy-muted">
            Short guidance from different academic mentors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article
            key={`${item.author}-${item.title}`}
            className="flex min-h-56 flex-col rounded-xl border border-surface-border bg-base p-4"
          >
            <Quote className="mb-4 size-5 text-brand" aria-hidden />
            <h3 className="text-base font-semibold text-copy-primary">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-copy-secondary">
              {item.body}
            </p>
            <div className="mt-auto border-t border-surface-border-subtle pt-4">
              <p className="truncate text-sm font-semibold text-copy-primary">
                {item.author}
              </p>
              <p className="truncate text-xs text-copy-muted">{item.role}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
