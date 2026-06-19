# Development Workflow

## Approach

Build this frontend incrementally using a spec-driven workflow. Context files define what to build, how to build it, and the current state of progress. The Laravel API is already defined in `docs/api/*.md` and `docs/api-spec.md` — always implement against those contracts. Do not infer or invent API behavior or product behavior from scratch.

## Scoping Rules

- Work on one feature unit or module at a time, following `feature-specs/`.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated modules in a single implementation step.

## When To Split Work

Split an implementation step if it combines:

- The API client/data layer and unrelated UI changes
- Multiple unrelated modules or routes
- Foundation (shell, auth, design system) and feature work
- Behavior that is not clearly defined in the context files or the API contracts

If a change cannot be verified end to end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior or API endpoints not defined in the context files or `docs/api/*.md`.
- If the API contract is ambiguous, resolve it against `docs/api-spec.md` and the relevant `docs/api/*.md` file before implementing.
- If a requirement is genuinely missing, add it as an open question in `progress-tracker.md` before continuing.

## Protected Foundation Components

Do not modify generated third-party foundation components unless explicitly instructed.

This includes:

- `components/ui/*` (shadcn/ui components)
- third-party library internals

These should remain default and reusable. Project-specific styling, layout, and feature logic belong in app-level components, not in foundation components. Only modify these files when a task explicitly requires it.

## Keeping Docs In Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries (`architecture-context.md`)
- UI tokens, layout, or component conventions (`ui-context.md`)
- Code conventions or standards (`code-standards.md`)
- Feature scope (`project-overview.md`)

Progress state in `progress-tracker.md` must reflect the actual state of the implementation, not the intended state.

## Before Moving To The Next Unit

1. The current unit works end to end within its defined scope against the real API contract.
2. No invariant defined in `architecture-context.md` was violated (no business logic on the client, API treated as authoritative, permission-based gating).
3. Loading (skeleton/preloader), empty, error, and success states exist for any new data surface — no blank screens, no white-screen crashes (error boundary in place).
4. Every form validates with Zod + RHF and shows a per-field inline message on each input; API `422` errors map back to fields; submit shows a loading state and a success toast.
5. The screen is gated: protected by auth and permission-checked; actions/nav hidden without permission; `401/403/404` handled.
6. Every success shows a success message and every failure a clear error message (no swallowed errors, no raw error text).
7. Verified responsive at 360px, 768px, and ≥ 1280px with no horizontal overflow.
8. `progress-tracker.md` reflects the completed work.
9. `npm run build` passes.
