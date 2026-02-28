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

## Code Quality

- **Every task must finish with a clean build and lint — zero errors, zero warnings.** Run `pnpm typecheck`, `pnpm lint`, and `pnpm format` (frontend) or `make check` (backend) before considering work done.
- Fix all issues, including pre-existing ones unrelated to your changes. The codebase must always be warning-free.
- **Do not suppress lint warnings with ignore comments by default.** Always try to fix the issue properly first. Only add a suppress comment when the lint rule genuinely does not apply and a proper fix would be worse (e.g. less readable, wrong behavior). Include a clear justification in the comment.

## shadcn/ui Components

- **Never modify files in `frontend/src/components/ui/`** — these are managed by the shadcn CLI and must be reinstallable at any time via `npx shadcn@latest add <component> --overwrite` without losing our changes.
- To customize styling or behavior, create wrapper components in `frontend/src/components/` (outside `ui/`).
- Style is `base-vega` (Base UI primitives, not Radix). See `frontend/components.json`.
