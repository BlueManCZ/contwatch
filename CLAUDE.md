# ContWatch v2 — Project Guidelines

## Common Commands

### Frontend (`cd frontend`)

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Type-check + production build |
| `pnpm typecheck` | Type-check only (no emit) |
| `pnpm lint` | Run Biome linter |
| `pnpm lint:fix` | Run Biome linter with auto-fix |
| `pnpm format` | Format source files with Biome |
| `pnpm codegen` | Regenerate API hooks from backend OpenAPI (backend must be running on :8000) |

### Backend (`cd backend`)

| Command | Description |
|---|---|
| `make dev` | Start dev server |
| `make test` | Run tests |
| `make lint` | Lint with Ruff |
| `make lint-fix` | Lint with auto-fix |
| `make format` | Format with Ruff |
| `make check` | Lint + test |

## Dev Servers

- **Assume both the backend (`uvicorn` on :8000) and frontend (`vite` dev server) are already running and hot-reloading.** Do not start or restart them unless a command that depends on them (e.g. `pnpm codegen`) fails.

## API Types & Hooks (Codegen)

- **Never hand-write API types or hooks** — always run `pnpm codegen` to generate them from the backend OpenAPI schema. All types and hooks live in `frontend/src/api/generated/` and must come from orval.
- Frontend components should import types from `@/api/generated/contWatchAPI.schemas` and hooks from `@/api/generated/<tag>/<tag>`.
- **If you create Alembic migrations, always run `cd backend && uv run alembic upgrade head` before running `pnpm codegen`** — the backend must be able to start (which requires the DB schema to be up to date) for codegen to fetch the OpenAPI schema.

## Code Reusability

- **Strongly prioritize reusability.** If a pattern, helper, or logic appears (or would appear) in more than one place, extract it into shared code — a utility function, a custom hook, a shared component, etc.
- Before writing new code, check if similar logic already exists elsewhere. Reuse and extend it rather than duplicating.
- This applies to both frontend and backend: shared formatting functions, i18n patterns, API utilities, validation logic, etc.

## Code Quality

- **Every task must finish with a clean build and lint — zero errors, zero warnings.** Run `pnpm typecheck` and `pnpm lint:fix` (frontend) or `make check` (backend) before considering work done. Always use `pnpm lint:fix` (not `pnpm lint`) so formatting issues are auto-fixed immediately.
- Fix all issues, including pre-existing ones unrelated to your changes. The codebase must always be warning-free.
- **Do not suppress lint warnings with ignore comments by default.** Always try to fix the issue properly first. Only add a suppress comment when the lint rule genuinely does not apply and a proper fix would be worse (e.g. less readable, wrong behavior). Include a clear justification in the comment.

## Audits

- **When fixing an item from any audit in `audits/`**, always mark it as fixed in the audit file (strikethrough title, add ✅ FIXED, add a note with what was done).

## Bug Fixes

- **When fixing a bug, always search the entire codebase for the same pattern** before considering the fix done. Proactively find and fix all similar occurrences.

## UI/UX

- **All clickable elements must have `cursor-pointer`.** Buttons, icon buttons, clickable cards, and any other interactive elements should always show a pointer cursor on hover.

## Package Management

- **Backend uses `uv`, frontend uses `pnpm`. Never use `pip` or `npm`.** To add a backend dependency use `uv add <package>`. To add a frontend dependency use `pnpm add <package>`.

## Common Pitfalls

- **Always invalidate React Query cache after mutations.** Every mutation's `onSuccess` must call `queryClient.invalidateQueries()` for the affected query keys. Do not rely solely on Socket.IO `mutate` events for cache invalidation — explicit invalidation ensures the UI updates immediately.
- **Always commit the DB transaction before emitting Socket.IO events.** If a socket event fires before the commit, clients will re-fetch and get stale data. Pattern: `await session.commit()` first, then `sio.emit(...)`.

## shadcn/ui Components

- **Never modify files in `frontend/src/components/ui/`** — these are managed by the shadcn CLI and must be reinstallable at any time via `npx shadcn@latest add <component> --overwrite` without losing our changes.
- To customize styling or behavior, create wrapper components in `frontend/src/components/` (outside `ui/`).
- Style is `base-vega` (Base UI primitives, not Radix). See `frontend/components.json`.
- **If you need a component that doesn't exist yet in `frontend/src/components/ui/`**, install it from shadcn via `npx shadcn@latest add <component>`. Do not reimplement or work around missing components with other primitives.
- **`SelectTrigger` uses `w-fit` by default**, so it only sizes to its content. To make it fill its container, override with `[&_[data-slot=select-trigger]]:w-full` on a parent element or pass `className="w-full"` to `<SelectTrigger>`.
