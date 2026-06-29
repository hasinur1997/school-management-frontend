# Design System — School MS

App-wide design system for the School MS management app. Foundations and components are grounded in the **actually implemented** values from the Mark Entry screens, then generalized so *any* screen — students, fees, attendance, exams, admissions, settings — can be built from this one document.

**Conventions**
- Visual language: clean, data-dense admin dashboard. Neutral surfaces, clear hierarchy, restrained accent reserved for primary actions, active state, and status.
- Values below are literal style values (the project styles inline, per its component model). Where a token is themeable, it's written `{token}` and resolved from the tables here.
- Two independent theme axes: **color mode** (light / dark / system) and **accent** (6 options). They compose — pick one of each.
- Default theme as shipped: **light + Purple**.

---

# 1. Foundations

## 1.1 Fonts

| Role | Stack | Used for |
| --- | --- | --- |
| UI / sans | `"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | All labels, headings, buttons, body |
| Numeric / mono | `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace` | Money, IDs, marks, GPA, %, dates, counts, page numbers, `⌘K` |

Loaded from Google Fonts (400/500/600/700). Body: `-webkit-font-smoothing: antialiased`, `font-feature-settings: "cv11","ss01"`. Mono carries tabular figures so numeric columns align — use it for every figure that sits in a column or table.

## 1.2 Color — Neutrals (light / dark)

| Role | Light | Dark |
| --- | --- | --- |
| Page background | `#f7f7f8` | `#0c0d10` |
| Surface / card | `#ffffff` | `#15171c` |
| Elevated surface (menus, popovers) | `#ffffff` | `#1c1f26` |
| Subtle surface (table header, rails) | `#fafafa` | `#22262f` |
| Hover surface | `#f4f4f5` | `#22262f` |
| Track (segmented / progress) | `#efeff1` / `#eeeef0` | `#22262f` |
| Border — structural | `#ececef` | `#2a2e38` |
| Border — default / strong | `#e2e2e6` | `#363b46` |
| Row divider | `#f0f0f2` | `#22262f` |
| Text — primary | `#1b1b1f` | `#f0f1f4` |
| Text — secondary | `#71717a` | `#c2c6cf` |
| Text — muted | `#9a9aa3` | `#828896` |
| Text — faint / placeholder / disabled | `#c4c4cc` | `#5b606b` |

## 1.3 Color mode mechanics
- Modes: `light`, `dark`, `system`. Apply dark by toggling a `dark` class/flag on the root; `system` follows `prefers-color-scheme`.
- Only the **neutral** palette (1.2) and status surfaces re-point between modes; the accent axis is independent.
- Persist the chosen mode (localStorage). Default `light`.

## 1.4 Accent themes
Accent overrides **only** the primary + its soft/dim derivatives. Everything else is shared. Default **Purple**.

| Accent | Primary (light) | Primary (dark) | Soft (light bg) | Soft border (light) | Status |
| --- | --- | --- | --- | --- | --- |
| Purple *(default)* | `#7c3aed` | `#8b5cf6` | `#f3effe` | `#e7defb` | wired |
| Blue | `#2563eb` | `#3b82f6` | `#e9f1fe` | `#d4e2fb` | wired |
| Teal / Emerald | `#0d9488` | `#10b981` | `#e6f6f4` | `#c7ebe6` | wired |
| Rose | `#e11d48` | `#fb7185` | `#fdeaef` | `#f8cdd8` | wired |
| Amber | `#d97706` | `#f59e0b` | `#fef3e6` | `#f7dcb4` | recommended |
| Cyan | `#0891b2` | `#22d3ee` | `#e3f5f9` | `#bce8f1` | recommended |

Derivatives: **soft** ≈ 10% accent tint on light / 14% alpha on dark (`accent-dim`); **button shadow** = `0 2px 8px rgba(accent, .28)`; **focus ring** = `0 0 0 3px rgba(accent, .12–.16)`; **focus border** = a light tint of accent. Logo gradient (Purple): `linear-gradient(160deg,#8b5cf6,#6d28d9)` — recolor per accent if desired.

> Currently 4 accents are exposed as the `accent` prop (Purple/Blue/Teal/Rose). Amber & Cyan are the recommended additions to reach the full 6 — add by appending a soft/border pair; no component changes needed.

## 1.5 Color — Status (consistent across every accent)

| Status (domain mapping) | fg (light) | bg | border | dot | fg (dark) |
| --- | --- | --- | --- | --- | --- |
| **Success** — Present / Paid / Active / Pass / Published | `#15803d` | `#e9f8ee` | `#cdeed7` | `#22c55e` | `#34d399` |
| **Warning** — Late / Pending / Partial / grade C–D | `#c2410c` | `#fff2e8` | `#fbdcc4` | `#f97316` | `#fbbf24` |
| **Error** — Absent / Unpaid / Fail / Rejected | `#dc2626` | `#fdecec` | `#f8d3d3` | `#ef4444` | `#ff5a5e` |
| **Info** — Leave / TC / grade A-–B / informational | `#2563eb` | `#e9f1fe` | `#d4e2fb` | `#3b82f6` | `#22d3ee` |

Status never changes with the accent. Map every domain status to one of these four.

## 1.6 Type scale

| Role | Size / weight |
| --- | --- |
| Page title (h1) | `27px` / 700, tracking `-0.025em` |
| Section / card title | `17–18px` / 600 |
| Metric — primary | `26px` / 700 (mono) |
| Metric — secondary | `22px` / 700 (mono) |
| Hero numeric input | `40px` / 700 |
| Brand / nav-active | `16px` / 600 |
| Body, inputs, controls | `14–15px` / 400–600 |
| Nav item | `14.5px` / 500 (active 600) |
| Caption / helper | `12.5–13px` |
| Badge | `12–13px` / 600–700 |
| Eyebrow / table header | `11–12px` / 600, uppercase, tracking `0.04–0.08em` |

Floor: `11px` (uppercase micro-labels only); interactive text ≥ `13px`.

## 1.7 Spacing scale
4px base. Common steps used across the app: `2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24 · 26 · 32 · 36 · 48 · 64`. Prefer flex/grid `gap` over per-element margins. Page padding tightens on mobile (`16px`) → desktop (`26–36px`).

## 1.8 Radius
inputs / buttons `9–10px` · nav item `10px` · cards / panels / tables `14px` · modals / overlays `16px` · pills / dots / progress `999px` · logo / segmented track `11px` · toast `12px`.

## 1.9 Elevation (shadow)
| Level | Value |
| --- | --- |
| Subtle | `0 1px 2px rgba(16,16,20,.04)` |
| Card | `0 1px 3px rgba(16,16,20,.05)` |
| Popover / menu | `0 8px 24px rgba(16,16,20,.12)` |
| Modal | `0 24px 60px rgba(16,16,20,.22)` |
| Toast | `0 8px 28px rgba(16,16,20,.28)` |
| Sticky-column edge | `±8px 0 8px -8px rgba(16,16,20,.08–.10)` |
| Accent button | `0 2px 8px rgba(accent,.28)` |

Dark mode: deepen alphas (~1.6×) and add a hairline top border on raised surfaces for separation.

## 1.10 Icons
Lucide-style **stroke** icons only (no fills). `stroke-width 1.8–2`, round caps/joins. Sizes: `13–17px` inline / in controls, `19px` nav, `20–21px` logo, `8×8` (32px) empty-state & metric glyphs.

## 1.11 Z-index
content `0` · sticky table columns `2–4` · topbar / sidebar `20` · dropdown / popover `40` · drawer / sheet `50` · modal `60` · toast `100`.

## 1.12 Motion
Durations `.14s` (hover/color), `.22–.25s` (enter/exit), `.3s` (progress). Easing `ease` / `ease-out`. Keyframes in use: `toastIn` (fade + 12px rise), `bannerIn` (fade + 6px rise). Respect `prefers-reduced-motion`.

---

# 2. Layout & app shell

**Grid:** CSS grid `256px / 1fr`, `min-height: 100vh`. Sidebar + topbar are fixed/sticky; only content scrolls. Content offset by sidebar width and topbar height.

## 2.1 Sidebar
- `border-right` structural, surface background, full height, sticky.
- **Brand:** 38×38 gradient logo (radius 11, accent shadow) + 16px/600 name; doubles as collapse/menu toggle on small screens.
- **Section labels:** 11px/600 uppercase muted, tracking `0.08em`, padding `14px 10px 6px`.
- **Nav item:** flex gap 12, padding `9px 11px`, radius 10, 14.5px/500 secondary text. Hover → hover-surface + primary text. **Active** → `bg {accent-soft}`, `color {accent}`, weight 600.
- Show only modules the user has permission for (see §7).
- **Footer:** collapse toggle row, top border, muted.

## 2.2 Topbar (3 zones)
- 68px, structural bottom border, translucent surface + `backdrop-filter: blur(8px)`, sticky `z-index 20`.
- **Left:** logo + school name (aligned to sidebar; hamburger on `<lg`).
- **Center:** command-style search, max-width 540, 40px field, leading search icon, trailing `⌘K` chip; `Cmd/Ctrl+K` focuses; opens a results/command panel. Collapses to an icon → command dialog on `<md`.
- **Right:** theme switcher (mode + accent) · super-admin branch switcher · notifications · user menu (38px avatar + name; name hides `<sm`).

## 2.3 Page templates
- **List page:** header (title + primary action) → filter/search bar → paginated table. Must define loading, empty, error states.
- **Detail page:** header (title + contextual actions) → content cards grouped by concern.
- **Form page:** single column `<lg`, two columns `≥lg`, labels above inputs, inline errors, sticky action footer.
- **Public (unauth):** standalone centered layout — no shell — for login, public admission, payment callbacks.

## 2.4 Responsive
Breakpoints (Tailwind defaults): `sm 640 · md 768 · lg 1024 · xl 1280`. `<lg` = compact (drawer nav); `≥lg` = full (persistent sidebar).
- Sidebar → off-canvas drawer (`<lg`); topbar stays fixed.
- Tables → stacked label/value **card list** for primary entities on `<md`; or pin the key column in an overflow-x wrapper. Filters → a "Filters" sheet; bulk-action bar → sticky bottom bar.
- Forms → single column; sticky footer full-width with full-width primary button.
- Dialogs → bottom **sheet** / full-screen on `<sm`.
- Touch targets ≥ `44×44px`. Use `min-w-0` / `truncate` / wrapping; never allow body horizontal overflow. Verify at 360 / 768 / ≥1280.

---

# 3. Components

## 3.1 Buttons
| Variant | Spec |
| --- | --- |
| Primary | `bg {accent}`, `#fff`, radius 9, h 38 (lg 42), 13.5–14px/600, accent shadow, leading icon |
| Secondary / outline | `bg surface`, default border, primary text, radius 9–10; hover → hover-surface |
| Ghost / muted | transparent, secondary text; hover → hover-surface + primary text |
| Destructive | `bg #dc2626`/`#fff` (or error-outline); confirm first |
| On-success | `#fff`, success border, success text; hover faint success |
| Icon-only / touch | 38×38, radius 10; toggled state may invert to a solid status color |

Loading: disabled + spinner, label swaps to "Saving…/Publishing…"; never allow double submit.

## 3.2 Segmented control
Track subtle-surface, padding 4, radius 11, gap 4. Buttons padding `8×15`, radius 8, 13.5px/600. **Active** → surface bg, `{accent}` text, subtle shadow. Inactive → transparent, secondary text. (2–3 short options; use a Select past that.)

## 3.3 Inputs / textarea
| Property | Value |
| --- | --- |
| Background | surface (`#fff` light / `#15171c` dark) |
| Border | default border |
| Radius | `9–10px` (form-field convention may use larger) |
| Height | `38–40px` (textarea auto) |
| Text | 14–15px; **numeric** inputs use Geist Mono 600, centered |
| Placeholder | muted text |
| Focus | `outline:none`, accent focus border, accent ring |
| Invalid | error border + error ring; inline `FormMessage` below (see §4) |
| Disabled / readOnly | faint text, subtle bg, no ring |

Numeric fields: `inputmode="numeric"`, sanitized to digits, clamped to range; arrows/Enter move focus in grids.

## 3.4 Select / picker
Trigger pill: `inline-flex`, h 40, padding `0 13px`, default border, radius 10, surface bg, 14px/600, muted chevron; hover → hover-surface. Eyebrow label above (5px gap). Menu uses elevated surface + popover shadow.

## 3.5 Checkbox / radio / switch
Square `16px` radius 4 (checkbox) / circle (radio); checked = `{accent}` fill + white glyph. Switch: pill track, `{accent}` when on, muted track off. All ≥ 44px touch area via padding.

## 3.6 Badge / status pill
`inline-flex` gap 6, padding `4–5px 10–12px`, radius 999, 12–13px/600: 6px status dot + label using the matching status `fg/bg/border`. **Grade chip** variant: min-w 38, h 26, radius 8, mono 700.

## 3.7 Avatar
Circle, sizes 32/38/42px, `object-fit: cover`, neutral placeholder bg, optional initials fallback. In menus pair with name (14.5px/600) + chevron.

## 3.8 Metric / stat card
Card row: surface, structural border, radius 14, padding `20–24px`, gap 26, wrap. Each metric = mono value (22–26px/700) + 11–12px uppercase muted label; `1px` vertical dividers between; lead metric may carry an 8px progress bar (track + `{accent}` fill). Tint values by meaning (success/accent/error).

## 3.9 Card / panel
Surface, structural border, radius 14, card shadow, padding `20–30px`. Section title 17–18px/600 + optional muted description; group related fields/metrics by concern.

## 3.10 Tabs / pills
Underline tabs (active = `{accent}` text + 2px accent underline) **or** pill tabs (active = `{accent-soft}` bg, accent text/border). Horizontal scroll on overflow; each pill may show a label + progress sub-line.

## 3.11 Data table
- Container: card, `overflow: hidden`; overflow-x wrapper when wide.
- **Header:** subtle-surface bg, structural bottom border, 11.5px/600 uppercase muted, padding `13px 18px`.
- **Rows:** row-divider border, padding `9px 18px`; hover subtle-surface. Status rows tint with the status bg (fail `#fef6f6`, etc.).
- **Column types:** text · badge · currency (right-aligned, mono) · date · actions (kebab menu).
- **Sticky columns:** freeze key/identity left and summary right with edge shadows; numeric body scrolls between.
- **Footer:** aggregate row (subtotals/averages) on subtle surface.
- **Bulk actions:** when rows selected, show a toolbar above (desktop) / sticky bottom bar (mobile).
- Server-side pagination, default 15 rows.

## 3.12 Pagination
Footer flex row, structural top border, padding `14px 20px`. Range text 13px secondary. Prev/Next h 34, radius 8, outline; page numbers min-w 34, mono, **active** = `{accent}` bg / white. Disabled ends: opacity `.45`, default cursor.

## 3.13 Banner / alert
Full-width, status-tinted bg + border, radius 14, padding `14px 18px`, gap 12: status icon + bold title + sub-line + optional action button. Enter with `bannerIn`. Use for published/locked, warnings, info notices.

## 3.14 Toast (Sonner)
Fixed bottom-center, inverted dark surface, white text, padding `12px 20px`, radius 12, toast shadow, success check glyph. Enter `toastIn`; auto-dismiss ~2.2s. Use a stable toast `id` per action so rapid repeats replace rather than stack. **Every** successful mutation (incl. inline toggles) toasts.

## 3.15 Dialog / modal
Centered overlay (scrim `rgba(16,16,20,.4)`), elevated surface, radius 16, modal shadow, max-width ~`520–640px`. **Header:** accent-soft icon badge + bold title + muted description + divider; close (X) top-right. **Body:** form fields (§4). **Footer:** top-bordered right-aligned row, h 11 outline Cancel + primary submit (submit shows check + loading). Destructive confirmations use the error token. On `<sm` → bottom sheet / full-screen.

## 3.16 Sheet / drawer
Edge-anchored panel (left nav drawer, right filters), elevated surface, drawer shadow, slide-in. Scrim dismiss. Used for mobile nav, filters, and quick side detail.

## 3.17 Tooltip
Dark inverted surface, white 12px, radius 8, small shadow, 6px offset; for truncated text and icon-only controls.

## 3.18 Breadcrumb
Muted 13px segments + chevron separators; last segment secondary/primary 600. (Mark-entry header uses this pattern.)

## 3.19 Empty state
Centered: `8×8` stroke glyph (muted) + short title + one-line copy + primary action. Never leave a resolved-empty region blank.

## 3.20 Skeleton / loading
Skeleton blocks matching final layout (table rows, cards, detail blocks) for initial loads — not a bare spinner. Subtle inline spinner for background refetch. Route-level fallback per async segment; thin top progress bar on navigation. Mutations: button spinner + `aria-busy` region.

## 3.21 Progress
8px track (`#eeeef0` / dark subtle), `{accent}` fill, radius 999, `.3s` width transition. Bulk actions show determinate progress.

## 3.22 File upload
Dashed default-border dropzone, radius 14, subtle bg, centered glyph + prompt; on file → thumbnail/row with remove. Used for admission docs, photos.

## 3.23 Grading-scale legend *(domain)*
Inline wrap, 12.5px secondary: uppercase label + mono grade letters colored by band (A+/A success, A-/B info, C/D warning, F error) + threshold · GPA.

---

# 4. Forms & validation
- Every form has a schema; every input shows its own message. Single column `<lg`, two-column `≥lg`.
- **Field anatomy:** label (`600`, primary, above) → 2.5-unit gap → control → inline `FormMessage` (error token, below). 5-unit gap between fields.
- Validate on submit, then on blur/change after first submit. Invalid field gets `aria-invalid` + error border/ring; first invalid field is focused/scrolled into view.
- Map API `422` errors back onto fields by name; non-field errors → a form-level error banner.
- Submit disabled + loading while pending; never double-submit. Success → toast + close/redirect/reset; failure → keep values, surface error.
- **Money** inputs are decimal strings (`decimal(12,2)`), displayed/submitted exactly — no float math.

---

# 5. Feedback & states (every screen)
- **Loading** — skeletons for fetch, button spinners for mutations, route fallback, top progress bar.
- **Empty** — purposeful empty state (§3.19).
- **Error** — human message (prefer API `message`), inline where it maps to a field else toast/panel; never raw stack traces or `[object Object]`.
- **Success** — concise toast on every mutation, stable `id` to avoid stacking.
- **Resilience** — root error boundary + per-route error segment with retry; guard undefined/partial data (optional chaining, defaults); network/`5xx` render a retryable state. The app never white-screens.

---

# 6. Data formatting
- **Money:** API decimal string with a `৳`/configured prefix; right-aligned, mono, in tables.
- **Dates:** one app-wide format helper; relative time ("2h ago") only where it aids scanning.
- **GPA / grades:** two decimals, mono tabular.
- **Numbers / IDs / counts:** mono so columns align.

---

# 7. Auth & permissions (every screen)
- Authenticated route group behind a server session check; `401` clears session → login. Public group (login, admission, payment callback) exempt.
- Gate on **permissions** (never role names) from the permission context. Hide/disable nav items, routes, buttons, and row actions when the permission is absent; server stays authoritative (`403`/`404` respected, out-of-branch records render as not-found). A protected screen with no permission shows access-denied/not-found, not partial UI.
- **Branch context:** only super admin sends `branch_id`; switching branch re-scopes and invalidates queries.

---

# 8. Accessibility
- Color is never the only signal — pair status color with a dot/icon/label.
- Visible focus ring on every interactive element (accent ring). Maintain logical focus order; trap focus in modals/sheets; `Esc` closes.
- Touch targets ≥ 44px; adequate menu/row spacing.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Meet WCAG AA contrast for text on its surface in both modes.

---

# 9. Domain specifics (Mark Entry reference)
Tweakable props demonstrated on the mark-entry screens:

| Prop | Editor | Default | Range / options |
| --- | --- | --- | --- |
| `passMark` | range | `33` | 20–50 marks |
| `maxMarks` | int | `100` | 20–100 (step 5) |
| `pageSize` | int | `10` | 5–28 rows |
| `highlightFails` | boolean | `true` | tint failing rows/cells |
| `accent` | color | `#7c3aed` | Purple / Blue / Teal / Rose |

View modes: density switch (Spreadsheet / Comfortable / Focus) and Matrix-grid / By-subject. Keyboard: arrows move between mark cells, Enter → next student; focused cell raises `z-index` above sticky columns.
