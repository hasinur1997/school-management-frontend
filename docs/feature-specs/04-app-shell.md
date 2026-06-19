# 04 — App Shell & Navigation

Build the authenticated dashboard layout: sidebar, topbar, branch switcher, and permission-filtered navigation.

## Implementation

- App-shell layout for the authenticated route group: a **fixed** full-height collapsible left sidebar + a **fixed** full-width topbar + a scrollable content area. The content is offset by the sidebar width and topbar height; only the content scrolls.
- Sidebar: grouped nav items for every module (Dashboard, Admissions, Students, Teachers, Academic, Attendance, Exams, Results, Promotion, Fees, Finance, Documents, Reports, Settings). Each item declares the permission it requires and is hidden when the user lacks it (use the permissions context from 03).
- Topbar, three zones (per `ui-context.md`):
  - **Left**: app logo + brand/school name, aligned over the sidebar; serves as the sidebar collapse toggle on small screens.
  - **Center**: a global **search box** (`Command`-style, `Cmd/Ctrl+K`) that searches all app options and entities — navigable modules plus records (students, teachers, classes, settings, etc.). Selecting a result navigates to it. Results are permission-filtered.
  - **Right**: the theme switcher (color mode + accent, from feature 01), the super-admin-only branch switcher, notifications, and the **user menu** — avatar (profile picture) + user name opening a dropdown for Profile, Settings, Change password, and Logout.
- **Branch switcher**: rendered only for super admin. Selecting a branch sets the active branch context (forwarded to the API as the documented `branch_id` param / header) and invalidates branch-scoped queries. Includes an "All branches" (consolidated) option where the API supports it. Non-super-admin users see a static branch label and send no `branch_id`.
- Active-route highlighting; collapsed/expanded state persisted.
- Responsive: the fixed sidebar becomes an overlay drawer on small screens; the topbar stays fixed and the center search collapses to an icon that opens the command panel.

## Rules

- Nav visibility is permission-driven, not role-name-driven.
- Only super admin sends branch context.

## Check When Done

- Signed-in user sees only the nav items their permissions allow.
- Sidebar and topbar stay fixed while content scrolls; nothing renders under them.
- Topbar shows logo + brand on the left, the global search in the center, and the user menu (avatar + name) on the right.
- Global search returns permission-filtered modules and entities and navigates on select; `Cmd/Ctrl+K` opens it.
- Super admin can switch branch / consolidated; the choice propagates to queries.
- Non-super-admin sees no branch switcher and sends no `branch_id`.
- User menu (Profile, Settings, Change password, Logout) works; logout works.
- `npm run build` passes.
