# UI Context

## Theme

A clean, professional administrative dashboard. Light by default, with a dark mode and a set of selectable accent themes (Blue is the default; Purple, Emerald, Rose, Amber, and Cyan are also offered). The visual language is utilitarian and data-dense — neutral surfaces, clear hierarchy, and restrained accent color reserved for primary actions and status.

All colors are defined as CSS custom properties in `globals.css` and mapped to Tailwind tokens via `@theme inline`. Components must use these tokens — no hardcoded hex values or raw Tailwind color classes like `zinc-*`. Dark mode is the same tokens re-pointed under a `.dark` selector.

### Theme model — two independent axes

Theme selection has **two orthogonal axes**, both persisted (localStorage) and applied to the `<html>` element:

1. **Color mode** — `light` | `dark` | `system`, applied via the `.dark` class (managed with `next-themes`). Controls the neutral surface/border/text palette.
2. **Accent theme** — applied via a `data-accent` attribute (`blue` default, `purple`, `emerald`, `rose`, `amber`, `cyan`). Overrides **only** the accent tokens, layered on top of either color mode.

This keeps a single neutral palette per mode and avoids duplicating full palettes per theme. The user picks a color mode and an accent independently; "Purple", "Emerald", etc. in the theme switcher set `data-accent`, while Light/Dark/System set the mode. The neutral palette below is shared by every accent.

### Neutral palette (shared by all accents)

| Role             | CSS Variable        | Light value          | Dark value           |
| ---------------- | ------------------- | -------------------- | -------------------- |
| Page background  | `--bg-base`         | `#f7f8fa`            | `#0c0d10`            |
| Surface          | `--bg-surface`      | `#ffffff`            | `#15171c`            |
| Elevated surface | `--bg-elevated`     | `#ffffff`            | `#1c1f26`            |
| Subtle surface   | `--bg-subtle`       | `#eef0f4`            | `#22262f`            |
| Default border   | `--border-default`  | `#e2e5ea`            | `#2a2e38`            |
| Subtle border    | `--border-subtle`   | `#eef0f4`            | `#363b46`            |
| Primary text     | `--text-primary`    | `#16181d`            | `#f0f1f4`            |
| Secondary text   | `--text-secondary`  | `#4a4f59`            | `#c2c6cf`            |
| Muted text       | `--text-muted`      | `#828896`            | `#828896`            |
| Brand accent     | `--accent-primary`  | `#2563eb` (blue)     | `#3b82f6`            |
| Brand dim        | `--accent-primary-dim` | `rgba(37,99,235,0.10)` | `rgba(59,130,246,0.14)` |
| Success          | `--state-success`   | `#16a34a`            | `#34d399`            |
| Warning          | `--state-warning`   | `#d97706`            | `#fbbf24`            |
| Error            | `--state-error`     | `#dc2626`            | `#ff5a5e`            |
| Info             | `--state-info`      | `#0891b2`            | `#22d3ee`            |

Tailwind utility names map to these variables. Use `bg-base`, `bg-surface`, `text-copy-primary`, `text-copy-muted`, `border-surface-border`, `text-brand`, `bg-accent-dim`, etc.

> The `--accent-primary` / `--accent-primary-dim` rows above are the **Blue** (default) accent. Selecting another accent re-points only those two variables; everything else is unchanged.

### Accent themes

Each accent overrides `--accent-primary` and `--accent-primary-dim` only. Defined as `[data-accent="…"]` (light) and `.dark[data-accent="…"]` (dark) blocks. Blue is the baseline (no attribute needed).

| Accent  | `data-accent` | Light primary | Dark primary | Dim (light / dark)                          |
| ------- | ------------- | ------------- | ------------ | ------------------------------------------- |
| Blue    | _(default)_   | `#2563eb`     | `#3b82f6`    | `rgba(37,99,235,0.10)` / `rgba(59,130,246,0.14)` |
| Purple  | `purple`      | `#7c3aed`     | `#8b5cf6`    | `rgba(124,58,237,0.10)` / `rgba(139,92,246,0.14)` |
| Emerald | `emerald`     | `#059669`     | `#10b981`    | `rgba(5,150,105,0.10)` / `rgba(16,185,129,0.14)` |
| Rose    | `rose`        | `#e11d48`     | `#fb7185`    | `rgba(225,29,72,0.10)` / `rgba(251,113,133,0.14)` |
| Amber   | `amber`       | `#d97706`     | `#f59e0b`    | `rgba(217,119,6,0.10)` / `rgba(245,158,11,0.14)` |
| Cyan    | `cyan`        | `#0891b2`     | `#22d3ee`    | `rgba(8,145,178,0.10)` / `rgba(34,211,238,0.14)` |

The state tokens (success/warning/error/info) are **not** affected by the accent — status color stays consistent across themes. New accents are added by appending one `[data-accent]` / `.dark[data-accent]` pair; no component changes.

## Status Colors

Status is communicated with a small `Badge` using the state tokens. Map domain statuses consistently:

| Domain status                          | Token             |
| -------------------------------------- | ----------------- |
| Present / Paid / Active / Approved / Passed | `--state-success` |
| Late / Pending / Partial               | `--state-warning` |
| Absent / Unpaid / Inactive / Rejected / Failed | `--state-error`   |
| Leave / TC / Informational             | `--state-info`    |

## Typography

| Role      | Font          | CSS Variable        |
| --------- | ------------- | ------------------- |
| UI text   | Inter / Geist Sans | `--font-sans`  |
| Numeric / tabular | Geist Mono (tabular figures) | `--font-mono` |

Tables, currency, GPA, and IDs use tabular figures so columns align. The base `body` uses the sans font with `antialiased`.

## Border Radius

| Context              | Class         |
| -------------------- | ------------- |
| Badges / buttons          | `rounded-md` / `rounded-lg` |
| Form fields (input, select, textarea) | `rounded-xl` |
| Cards / panels / tables   | `rounded-xl`  |
| Modals / overlays         | `rounded-2xl` |

### Form-modal pattern

Create/edit dialogs share one look, driven by the shared primitives (no per-form overrides):

- **Fields**: `h-11`, `rounded-xl`, `px-4`, `text-base` inputs/selects/textareas with a default border; labels are `font-semibold text-foreground` above the field; `2.5`-unit gap label→field, `5`-unit gap between fields (two-column on `≥ sm`).
- **Header**: pass an `icon` to `DialogHeader` to render the rounded `bg-primary/10` icon badge beside the bold title + muted description, with a full-width divider below. The close (X) sits top-right. No per-modal theme toggle — theming stays in the global topbar switcher.
- **Footer**: `DialogFooter` is a clean top-bordered row (no muted bar), right-aligned, with `h-11` buttons — outline Cancel + primary submit (submit carries a check icon and the loading/disabled state).

## Layout Patterns

- **App shell**: a **fixed** left sidebar (full-height, collapsible) and a **fixed** topbar (full-width, spanning above the content); only the content area scrolls. The sidebar lists only the modules the user has permission for. Content is offset by the sidebar width and topbar height so nothing sits under the fixed bars.
- **Topbar** (fixed, three zones):
  - **Left**: app logo + brand/school name, aligned with the sidebar; doubles as the sidebar collapse toggle on small screens.
  - **Center**: a global **search box** (command-palette style) that searches across all app entities and navigable options — modules, students, teachers, classes, settings, etc. Opens results in a dropdown/`Command` panel; `Cmd/Ctrl+K` focuses it.
  - **Right**: a theme switcher (color mode + accent), a super-admin-only branch switcher, notifications, and the **user menu** — avatar (profile picture) + name with a dropdown for Profile, Settings, and Logout.
- **List pages**: page header (title + primary action), a filter/search bar, and a paginated data table. Empty, loading (skeleton), and error states are required for every list.
- **Detail pages**: header with title and contextual actions; content in cards grouped by concern.
- **Forms**: single-column on narrow screens, two-column on wide; labels above inputs; inline field errors; a sticky action footer for long forms.
- **Modals/dialogs**: centered overlay, `rounded-2xl`, used for create/edit, confirmations, and quick actions. Destructive confirmations use the error token.
- **Public admission**: standalone, unauthenticated layout — no app shell, just a centered branded multi-step form.

## Responsive & Mobile

Mobile-first and responsive is a baseline requirement for **every** screen — design for small viewports first, then enhance upward. Nothing is desktop-only.

- **Breakpoints**: Tailwind defaults — `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Treat `< lg` as "compact" (drawer nav) and `≥ lg` as "full" (persistent sidebar).
- **App shell**:
  - `≥ lg`: fixed persistent sidebar + fixed topbar; content offset by both.
  - `< lg`: sidebar collapses to an off-canvas overlay drawer (Sheet) toggled by a hamburger in the topbar-left; topbar stays fixed full-width.
  - Topbar **center search** shows as a full input on `≥ md` and collapses to a search icon (opens the `Command` dialog) on `< md`. The user menu keeps the avatar; the name label hides below `sm`.
- **Tables**: never force horizontal scroll of critical data. On `< md`, either (a) wrap the table in an overflow-x container with the key column pinned, or (b) switch to a stacked **card list** (label/value rows) — prefer the card list for primary entity lists. Filters collapse into a "Filters" sheet/popover; bulk-action toolbar becomes a sticky bottom bar.
- **Forms**: single column on `< lg`, two columns on `≥ lg`. The sticky action footer spans full width on mobile with full-width primary buttons.
- **Dialogs**: centered modal on `≥ sm`; on `< sm` use a bottom **Sheet**/full-screen dialog so content and the keyboard fit.
- **Touch targets**: interactive elements ≥ 44×44px on touch; adequate spacing in menus and row actions.
- **Typography & spacing**: fluid/scaled down on small screens; page padding tightens (`px-4` mobile → `px-6/8` desktop). No fixed pixel widths that overflow narrow viewports; use `min-w-0`, `truncate`, and flex/grid wrapping to prevent overflow.
- **Media & content**: images and charts are fluid (`max-w-full`); long text truncates with tooltips; horizontal overflow is never allowed on the page body.
- **Testing**: every screen verified at 360px (mobile), 768px (tablet), and ≥ 1280px (desktop) before a feature is considered done.

## Data Tables

- Server-side pagination, default 15 rows, driven by the API's `meta` block (`current_page`, `per_page`, `total`, `last_page`).
- Column types: text, badge (status), currency (right-aligned, tabular), date, and an actions column.
- Row actions appear in a kebab/overflow menu; bulk actions (e.g. promotion, attendance) appear in a toolbar above the table when rows are selected.
- Filters (branch, session, class, status, date range) sit above the table and map to API query params.

## Forms and Validation

- Built with React Hook Form + Zod via shadcn `Form`. **Every** form has a Zod schema; **every** input is wired through `FormField` so it can show its own message.
- Client validation mirrors the API's Form Request rules but is never authoritative. Validate on submit and on blur/change after the first submit so messages appear next to each field as the user fixes them.
- **Per-field messages are mandatory**: every input renders a `FormMessage` (inline, error token color, below the field) — required, format, length, range, match (e.g. password confirm), and uniqueness errors. The field also gets an error style (`aria-invalid`, error border).
- The API's `422` validation errors are mapped back onto the corresponding fields by name; field errors not tied to an input, plus non-field/general messages, show in a form-level error banner. The first invalid field is focused/scrolled into view.
- Disable the submit button and show its loading state while submitting (see Feedback & States); never allow double submit.
- On success: show a success toast and close/redirect/reset per the flow. On failure: keep entered values, surface the error, never silently swallow.
- Money inputs are decimal strings, displayed and submitted exactly as the API expects (`decimal(12,2)`) — no float math.

## Feedback, Loading & Resilience

These apply to **every** component and screen — no screen ships without its loading, empty, error, and success states.

- **Loading / preloaders** (required wherever data is fetched or a mutation runs):
  - Data fetch: `Skeleton` placeholders matching the final layout (table rows, cards, detail blocks) — not a bare spinner — for initial loads. Use a subtle inline spinner for background refetches.
  - Route-level: a `loading.tsx` (Suspense fallback) for every async route segment so navigation never shows a blank screen.
  - Mutations (submit/save/delete): the triggering button enters a disabled + spinner "loading" state with its label (e.g. "Saving…"); the relevant region may show an overlay/`aria-busy`. Bulk actions show progress.
  - A top-level route-change progress indicator (thin bar) for navigations.
- **Success feedback**: **every** successful mutation shows a concise success `toast` (Sonner) describing what happened — this includes small inline actions (toggles, inline edits, status changes, single-row actions), not just full forms. Destructive actions confirm first (Dialog) and then confirm success. To avoid stacking on rapid repeats, use a stable Sonner toast `id` per action so a new toast replaces the prior one rather than piling up.
- **Error feedback**: every failed request shows a clear, human error message — inline (forms, fields) where it maps to input, otherwise a toast or an error state panel. Messages prefer the API's `message`, with a sensible fallback; never show raw stack traces or `[object Object]`.
- **Empty states**: lists/tables/detail sections that resolve to no data render a purposeful empty state (icon + short copy + primary action), never a blank area.
- **Resilience / no unexpected errors**:
  - A root **error boundary** plus per-route `error.tsx` segments catch render/runtime errors and show a recoverable "Something went wrong" panel with a retry — the app never white-screens.
  - Query/mutation errors are handled at the boundary or with `isError` UI; no unhandled promise rejections.
  - Guard against undefined/partial API data (optional chaining, defaults); components must not crash on missing fields.
  - Network/timeout/`5xx` errors render a retryable error state.

## Authentication & Authorization (every screen)

- **Authentication**: the entire authenticated route group is protected by a server-side session check; unauthenticated users are redirected to login. Only the public group (login, public admission, payment callbacks) is exempt. A `401` from the API clears the session and redirects to login.
- **Authorization**: every screen and action is gated on **permissions** (never role names) from the `/auth/me` permission context. Nav items, route access, buttons, and row actions are hidden/disabled when the permission is absent; the server remains authoritative (`403`/`404` are respected, out-of-branch records render as not-found).
- Use the `usePermission()` helper and `<Can permission="…">` gate consistently; a protected screen with no permission shows an access-denied/not-found state rather than partial UI.
- Branch context: only super admin sends `branch_id`; switching branch re-scopes and invalidates queries.

## Currency, Dates, and Numbers

- Money: render the API's decimal string with a `৳`/configured currency prefix; right-align in tables.
- Dates: a single app-wide format helper; show relative time only where it aids scanning (e.g. "submitted 2h ago").
- GPA/grades: shown to two decimals using tabular figures.

## Component Library

shadcn/ui on top of Tailwind v4. No custom design system. Components live in `components/ui/` and are added via the `shadcn` CLI rather than written from scratch. Core primitives in use: Button, Input, Select, Dialog, Table, Badge, Card, Tabs, DropdownMenu, Form, Toast/Sonner, Skeleton, Pagination, Calendar/DatePicker.

## Icons

Lucide React. Stroke-based icons only — no filled variants. Sizes: `h-4 w-4` inline, `h-5 w-5` in buttons and nav, `h-8 w-8` for empty-state and summary-card glyphs.
