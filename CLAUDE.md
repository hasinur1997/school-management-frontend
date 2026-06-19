<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Application Building Context

Read the following files in order before implementing or making any architectural decision:

1. Open `docs/progress-tracker.md`, find the first unchecked task.
2. Read that task's ticket in `docs/tasks/` — tickets are **self-contained**

1. `docs/project-overview.md` — product definition, goals, features, and scope
2. `docs/architecture-context.md` — system structure, boundaries, storage model, and invariants
3. `docs/ui-context.md` — theme, colors, typography, canvas design, and component conventions
4. `docs/code-standards.md` — implementation rules and conventions
5. `docs/ai-workflow-rules.md` — development workflow, scoping rules, and delivery approach
6. `docs/progress-tracker.md` — current phase, completed work, open questions, and next steps



Update `docs/progress-tracker.md` after each meaningful implementation change.

If implementation changes the architecture, scope, or standards documented in the context files, update the relevant file before continuing.