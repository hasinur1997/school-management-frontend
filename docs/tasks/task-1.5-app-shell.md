# Task F-1.5 — App Shell, Navigation & Branch Switcher

| Field | Value |
|---|---|
| Phase | 1 — Foundation |
| Status | `done` |
| Depends on | 1.1, 1.4 |
| Blocks | 1.6, 1.7, all feature screens |
| Feature spec | `feature-specs/04-app-shell.md` |
| Context | `ui-context.md` (Layout Patterns, Responsive) |
| Endpoints | `GET /branches` (switcher source) |

## Objective
The authenticated dashboard layout: fixed sidebar + fixed topbar + scrollable content, permission-filtered nav, theme switcher, branch switcher, and user menu — fully responsive.

## Screens / Components
- App-shell layout for the authenticated route group: **fixed** full-height collapsible left sidebar + **fixed** full-width topbar; only content scrolls, offset by sidebar width + topbar height.
- **Sidebar**: grouped nav for every module (Dashboard, Admissions, Students, Teachers, Academic, Attendance, Exams, Results, Promotion, Fees, Finance, Documents, Reports, Settings). Each item declares its required permission and is hidden via the permissions context when absent. Active-route highlight; collapsed/expanded state persisted.
- **Topbar** three zones: left = logo + brand (sidebar collapse toggle on small screens); center = global search placeholder slot (implemented in 1.6); right = theme switcher (from 1.1), branch switcher, notifications, user menu.
- **User menu**: avatar + name → Profile, Settings, Change password (opens 1.4 dialog), Logout.
- **Branch switcher** (super admin only): selecting a branch sets active branch context (forwarded as documented `branch_id` param/header) and invalidates branch-scoped queries; includes "All branches" (consolidated) where supported. Non-super-admin sees a static branch label and sends no `branch_id`.
- **Responsive**: `<lg` sidebar becomes an off-canvas Sheet drawer toggled by a hamburger; topbar stays fixed; user-menu name label hides `<sm`.

## Rules
- Nav visibility permission-driven, never role-name-driven.
- Only super admin sends branch context.

## Check When Done
- [x] User sees only permitted nav items; sidebar/topbar fixed while content scrolls.
- [x] Super admin can switch branch / consolidated and it propagates to queries; non-super-admin sees no switcher and sends no `branch_id`.
- [x] User menu (Profile, Settings, Change password, Logout) works.
- [x] Drawer + responsive behavior verified at 360 / 768 / ≥1280px.
- [x] `npm run build` passes.
