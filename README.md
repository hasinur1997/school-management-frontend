# School Management System — Web Frontend

A multi-branch school administration platform. This repository contains the **web frontend**: a Next.js client that consumes a Laravel REST API (`/api/v1`) to deliver the complete school lifecycle — from public admission through attendance, exams, results, promotion, fee collection, finance, and administrative documents.

> The frontend holds **no business logic**. Every rule (result computation, fee calculation, promotion, branch scoping, authorization) lives in the API. This app authenticates, presents data, and orchestrates user actions against the API.

---

## Project Overview

The School Management System is a role-aware administration platform for schools that operate across multiple branches. A public visitor can apply for admission; staff manage the full operational lifecycle of each branch; students and parents access their own academic and financial records.

Six server-side roles are supported — **super admin, admin, accountant, teacher, student, and parent** — each seeing a tailored, permission-driven view. Regular users are scoped to a single branch, while a super admin can switch branch context and view consolidated data across the organization.

---

## Project Goals

1. Let a public visitor apply for admission and let admins review and approve applications.
2. Provide role-aware dashboards for all six roles.
3. Reflect branch scoping: regular users see only their branch; super admin can switch context and consolidate data.
4. Let permitted users record daily student attendance and teacher check-ins.
5. Let permitted users enter subject-wise marks and view weighted annual results.
6. Let admins promote passed students to the next class, in bulk or individually.
7. Let students/parents pay monthly fees via SSLCommerz and download money receipts.
8. Let staff manage income, expenses, and assets per branch.
9. Trigger and present API-generated PDFs: result sheets, ID cards, money receipts, transfer certificates, and reports.
10. Show filterable reports across finance, students, teachers, and assets.

---

## Project Features

| Area | Capabilities |
| --- | --- |
| **Authentication & Authorization** | Token-based login (Laravel Sanctum); permission-driven UI (never role-name checks); protected routes with API `401/403/404` as the real boundary. |
| **App Shell & Navigation** | Permission-filtered sidebar, topbar with branch switcher (super admin) and logout, role-appropriate dashboard cards. |
| **Admission** | Public multi-step admission form (personal/guardian info, photo, documents) and an admin review queue to approve or reject. |
| **People Management** | Students, teachers, and parents — lists, profiles, admin create/edit, and parent–student linking. |
| **Academic Structure** | Branches, academic sessions, classes, sections, subjects, and teacher assignments. |
| **Attendance** | Daily student attendance, monthly sheets for students/parents, and teacher self check-in/out. |
| **Exams & Results** | Subject-wise mark entry per exam and weighted annual results (25% S1 + 25% S2 + 50% final), with result-sheet PDFs. |
| **Promotion** | One-click bulk promotion and individual promote/hold controls. |
| **Fees & Payments** | Monthly invoices, SSLCommerz hosted checkout, local payment recording, and money-receipt PDFs. |
| **Finance** | Income, expense, and asset management per branch with category filters and profit/loss summaries. |
| **Documents** | ID card and transfer-certificate generation (PDF). |
| **Reports** | Filterable (weekly/monthly/yearly/custom; per branch or consolidated) finance, student, teacher, and asset reports with PDF export. |
| **Settings** | Global (school identity, grading scale, credentials) and per-branch (info, check-in IP whitelist, fee amounts) configuration. |

---

## Project Architecture

The frontend is a **presentation and orchestration layer** over the Laravel API. It owns no database, ORM, or background workers — all persistence, business rules, and PDF generation live server-side.

### System Boundaries

```
apps/web/
├── app/            # Next.js App Router routes (server + client components)
│                   #   public group (admission, login) vs. authenticated dashboard
├── lib/            # Axios API client, auth/token helpers, permission helpers, utilities
├── components/     # Dashboard shells, tables, forms, dialogs, feature widgets
├── hooks/          # TanStack Query hooks and client-side state per module
└── types/          # TypeScript contracts mirroring API resource/envelope shapes

packages/
├── ui/             # Shared shadcn/ui component library (@workspace/ui)
├── eslint-config/  # Shared ESLint configuration
└── typescript-config/  # Shared TypeScript configuration
```

### Key Architectural Principles

- **Single source of truth** — the Laravel API. The client caches via TanStack Query but never becomes authoritative; every mutation reconciles against the API response.
- **Permission-based authorization** — the UI reads the permission list the API returns and shows/hides accordingly. Role names are never branched on.
- **Branch scoping** — regular users are auto-scoped server-side and send no `branch_id`; super admin forwards a selected branch only for their session.
- **Server-generated artifacts** — PDFs (result sheets, ID cards, receipts, TC, reports) are streamed by the API; the client only triggers and presents them.
- **Auth state** — the Sanctum token lives in an httpOnly cookie, never in `localStorage`.
- **Server/client boundaries** — `"use client"` is added only where browser interactivity, hooks, or token-bound requests require it.
- **Payments** — the client redirects to SSLCommerz hosted checkout; validation and invoice updates happen via the API callback, never client-side.

---

## Technologies Used

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 16** (App Router) + **React 19** + **TypeScript 5** |
| Styling / UI | **Tailwind CSS v4** + **shadcn/ui** (dark-only theme), **lucide-react** icons |
| Server state | **TanStack Query v5** + **Axios** (with auth interceptors) |
| Forms & validation | **React Hook Form** + **Zod** |
| Backend API | **Laravel REST `/api/v1`** (JSON) — external |
| Auth | **Laravel Sanctum** (bearer tokens) |
| Payments | **SSLCommerz** hosted checkout (redirect) |
| PDFs | Server-generated; client-side helpers (`jspdf`, `html2canvas`) where needed |
| Theming | **next-themes** |
| Monorepo tooling | **Turborepo** + **npm workspaces** |
| Tooling | ESLint 9, Prettier, TypeScript |

---

## Development Environment

### Prerequisites

- **Node.js** `>= 20`
- **npm** `>= 11` (declared via `packageManager`)
- A running instance of the Laravel API exposing `/api/v1`

### Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd school-app

# 2. Install dependencies (installs all workspaces)
npm install

# 3. Configure environment
#    Create apps/web/.env.local and point it at the API, e.g.:
#    NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### Common Commands

Run from the repository root (Turborepo orchestrates the workspaces):

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server (`apps/web` on Next.js dev). |
| `npm run build` | Production build of all apps/packages. |
| `npm run lint` | Lint across the monorepo. |
| `npm run typecheck` | Type-check all workspaces (`tsc --noEmit`). |
| `npm run format` | Format with Prettier. |

To run only the web app, target the workspace (e.g. `npm run dev -w web`).

### Adding UI Components

shadcn/ui components are shared via the `@workspace/ui` package. From the repo root:

```bash
npx shadcn@latest add button -c apps/web
```

Import them in the app:

```tsx
import { Button } from "@workspace/ui/components/button";
```

### Project Documentation

Deeper context lives in [`docs/`](docs/):

- [`project-overview.md`](docs/project-overview.md) — product definition, goals, features, and scope
- [`architecture-context.md`](docs/architecture-context.md) — system structure, boundaries, storage model, and invariants
- [`ui-context.md`](docs/ui-context.md) — theme, colors, typography, and component conventions
- [`code-standards.md`](docs/code-standards.md) — implementation rules and conventions
- [`ai-workflow-rules.md`](docs/ai-workflow-rules.md) — development workflow and delivery approach
- [`progress-tracker.md`](docs/progress-tracker.md) — current phase, completed work, and next steps
