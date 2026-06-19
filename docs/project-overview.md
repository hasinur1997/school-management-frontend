# School Management System — Frontend

## Overview

This is the Phase 2 frontend for the School Management System: a multi-branch school administration platform. The backend is a Laravel REST API under `/api/v1`; this app is the web client that consumes it. It covers the full school lifecycle — public admission, daily attendance, exams and weighted result generation, class promotion, fee collection with online payment, finance tracking, and administrative documents like ID cards and transfer certificates.

The frontend holds no business logic of its own. Every rule (result computation, fee calculation, promotion, branch scoping, authorization) lives in the API. This app authenticates, presents data, and orchestrates user actions against the API.

## Goals

1. Let a public visitor apply for admission and let admins review and approve applications.
2. Provide role-aware dashboards for six roles: super admin, admin, accountant, teacher, student, parent.
3. Reflect branch scoping: regular users see only their branch; super admin can switch branch context and view consolidated data.
4. Let permitted users record daily student attendance and teacher check-ins.
5. Let permitted users enter subject-wise marks and view weighted annual results.
6. Let admins promote passed students to the next class, in bulk or individually.
7. Let students/parents pay monthly fees via SSLCommerz and download money receipts.
8. Let staff manage income, expenses, and assets per branch.
9. Trigger and present API-generated PDFs: result sheets, ID cards, money receipts, transfer certificates, reports.
10. Show filterable reports across finance, students, teachers, and assets.

## Core User Flow

1. A visitor submits the public admission form for a branch and class.
2. An admin reviews the pending application and approves it; the API creates the student account and sends credentials.
3. A teacher signs in, checks in (the API validates the branch IP whitelist), and records daily attendance.
4. During each exam period, teachers enter subject-wise marks.
5. The API computes grades, per-exam GPA, and the weighted annual result; users view and download result PDFs.
6. After final results, an admin clicks Promote to move passed students to the next class.
7. A student or parent pays a monthly fee via SSLCommerz, or staff records a local payment; the API generates a money receipt PDF.
8. Admins and accountants review reports filtered by week, month, year, or date range.

## Features

### Authentication and Authorization
- Token-based login against the API (Laravel Sanctum); bearer token attached to every request.
- The signed-in user's permission list drives what the UI shows — never role-name checks.
- Protected routes redirect unauthenticated users to login; the API's 401/403/404 are the real access boundary.

### App Shell and Navigation
- Persistent sidebar navigation filtered by the user's permissions.
- Topbar with current user, branch switcher (super admin only), and logout.
- Dashboard landing with role-appropriate summary cards.

### Admission
- Public, unauthenticated multi-step admission form (personal info, guardian info, photo, documents).
- Admin review queue: list pending applications, view detail, approve or reject with reason.

### People Management
- Students: list, profile, admin create/edit, parent linking.
- Teachers: list, profile, admin create with subject/class assignments, active/inactive status.
- Parents: list, link to one or more students.

### Academic Structure
- Branches, academic sessions, classes, sections, and subjects per class.
- Class-teacher and subject-teacher assignments.

### Attendance
- Daily student attendance entry per class/section (present, absent, late, leave).
- Monthly attendance sheets for students and parents (own/children only).
- Teacher self check-in/check-out and admin correction views.

### Exams and Results
- Subject-wise mark entry per student per exam (first semester, second semester, final).
- Per-exam and weighted annual result views (25% S1 + 25% S2 + 50% final).
- Result search and result-sheet PDF download.

### Promotion
- One-click bulk promotion of passed students to the next class and session.
- Individual student promotion or hold.

### Fees and Payments
- Monthly invoice lists with paid/unpaid status.
- SSLCommerz hosted-checkout redirect and local payment recording by staff.
- Money receipt PDF download.

### Finance
- Income, expense, and asset entry and listing per branch, with category filters.
- Total asset value and profit/loss summaries.

### Documents
- ID card generation for a student or whole class (PDF).
- Transfer certificate issuance (PDF); TC students are excluded from active operations.

### Reports
- Filterable reports (weekly, monthly, yearly, custom range; per branch or consolidated) on income, expenses, students, teachers, and assets, plus profit/loss.
- PDF export.

### Settings
- Global settings (school identity, academic session, grading scale, SSLCommerz and notification credentials) and per-branch settings (branch info, check-in IP whitelist, class fee amounts), surfaced to permitted users only.

## Scope

### In Scope
- Next.js web frontend consuming the Laravel `/api/v1` REST API
- Sanctum token auth and permission-aware UI for six roles
- Branch-scoped views with super-admin branch switching and consolidation
- Public admission form and admin review surface
- Student/teacher/parent management
- Student and teacher attendance surfaces
- Mark entry, result views, and result PDFs
- Bulk and individual promotion
- Fee invoices, SSLCommerz and local payments, money receipts
- Income, expense, and asset management
- Triggering and presenting API-generated PDFs
- Filterable reports and settings

### Out of Scope
- Any backend business logic, persistence, or PDF generation (owned by the API)
- Parent self-registration
- Library, hostel, transport, LMS, and payroll modules
- Native mobile applications and push notifications

## Success Criteria

1. A visitor can submit the admission form and an admin can approve it through the UI.
2. Each role sees only the navigation and data its permissions and branch allow; super admin can switch branches and view consolidated data.
3. A teacher can check in and record daily attendance once per student per day, with API errors surfaced clearly.
4. Marks entered across three exams produce a correct annual result view and a downloadable PDF.
5. Clicking Promote moves the passed students of a class as the API reports them.
6. A fee paid through SSLCommerz or the counter reflects as paid and offers a money receipt PDF.
7. Reports render correct figures for any weekly, monthly, yearly, or custom date-range filter, per branch or consolidated.
8. A TC-issued student is visibly excluded from attendance, invoicing, and promotion surfaces.
