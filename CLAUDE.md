# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stackbase (https://stackbase.sumandey.com) — pnpm monorepo, Fastify 5 backend + Next.js 16 / React 19 frontend. Built by Suman Dey (https://sumandey.com).

**Package manager:** pnpm ≥ 8. **Node:** ≥ 20.

---

## Commands

### Root
```bash
pnpm dev              # run backend + frontend dev servers concurrently
pnpm generate:openapi # fetch live OpenAPI spec from running backend → openapi.json
pnpm generate:api     # generate:openapi + regenerate frontend/src/api/generated/*
pnpm lint             # lint all workspaces
pnpm prettier         # format all TS/TSX/JSON/MD files
pnpm pre-checks       # full preflight: prettier + lint + build
```

### Backend
```bash
pnpm --filter @stackbase/backend dev         # tsx watch, port 44300
pnpm --filter @stackbase/backend build       # prettier + lint + tsc --noEmit + tsup
pnpm --filter @stackbase/backend lint
pnpm --filter @stackbase/backend lint:fix
```

### Frontend
```bash
pnpm --filter @stackbase/frontend dev        # next dev, port 3000
pnpm --filter @stackbase/frontend build
pnpm --filter @stackbase/frontend lint
```

---

## Architecture

### Backend — `backend/src/`

Entrypoint: `index.ts` → registers `app.ts` (a `fastify-plugin` factory).

`app.ts` wires plugins then routes. Each domain lives as `<Domain>Module/` with:
- `Routes/<Name>.routes.ts` — Fastify route file with inline `schema` block
- `Middleware/` — Fastify preHandlers
- `SharedModule/` — cross-cutting: plugins, middleware, utils

**Auth & role rules (see `.claude/rules/auth-role-patterns.md`):**
- Routes under `/api/*` require `preHandler: [fastify.authenticate]` — never omitted.
- Role-restricted routes add `validateUserRole(UserRoles.X)` after authenticate.
- Public routes go under `/api/public/` in `NonRestrictedRoutes/` — no preHandler needed.
- Two roles: `UserRoles.SUPER_ADMIN` (`'superadmin'`) and `UserRoles.USER` (`'user'`) — defined in `SharedModule/utils/constants.ts`.
- Never hardcode role strings — always use `UserRoles.*` constants.

**Route schema rules (see `.claude/rules/api-integration.md`):**
- Every route must declare a `schema` with `tags`, body/params/querystring (if applicable), and `response` for every status code.
- Tags must be registered in `SharedModule/Plugins/swagger.plugin.ts`.
- Use plain JSON Schema objects — not `zod-to-json-schema` (incompatible with this project's Zod version).
- Use `zod` only for runtime `.parse()` inside handlers.
- Error codes go in `SharedModule/utils/errorcode.ts` (`Err` object) — never inline magic numbers.
- Swagger UI: `http://localhost:44300/api-docs` | OpenAPI JSON: `http://localhost:44300/documentation/json`

### Frontend — `frontend/src/`

Next.js App Router. Key directories:

```
app/            Pages and layouts (App Router)
components/
  ui/           shadcn-style primitives — always use these, never hand-roll HTML elements
lib/
  utils.ts      cn() helper (clsx + tailwind-merge)
hooks/
```

**UI rules (see `.claude/rules/ui-architecture.md`):**
- Always reuse `components/ui/` primitives. Never hand-roll `<button>`, `<input>`, `<select>`, modals, etc.
- Theme-altering classes (`bg-*`, `text-*`, `border-*`, `shadow-*`, `rounded-*`) belong inside `ui/` component variants, not at call sites.
- Files over 500 lines must be split — hard ceiling.
- Enum/dropdown values: single source of truth in `lib/constants/` — never inline option arrays in JSX.
- Animation: reuse `components/motion.tsx` primitives. Animate only `transform`/`opacity`. Every tappable element needs `whileTap={{ scale: 0.96 }}` spring feedback.

### API Client Pipeline (see `.claude/rules/api-integration.md`)

The backend OpenAPI spec is the single source of truth. Flow:

```
backend route schema → openapi.json → src/api/generated/ → services/<Domain>Service.ts → pages/components
```

1. Add/change a backend route schema
2. `pnpm generate:api` (backend must be running) — fully rewrites `frontend/src/api/generated/`
3. Wrap generated SDK functions in `services/<Domain>Service.ts` using `@tanstack/react-query`
4. Pages import only from `services/` — never from `api/generated/` directly, never hand-rolled `fetch`

Never hand-edit `src/api/generated/`. Never hardcode API path strings in frontend code.

### Deployment

Production build: `pnpm build` at root runs backend build → copies frontend → `next build` → assembles deploy via `scripts/assemble-deploy.js`. The backend serves the built Next.js output as static files in production.

## graphify — MANDATORY. These rules override default behavior. Follow them exactly.

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

**STOP — before answering any codebase question or browsing source files:**

1. **`graphify-out/graph.json` exists → you MUST run `graphify query "<question>"` first.** Do not grep, do not read files, do not browse directories until you have run the query. The graph returns a scoped subgraph in seconds — raw source browsing without it is forbidden.
2. **For relationship questions** (what calls X, what depends on Y) → `graphify path "<A>" "<B>"`. Never trace manually.
3. **For concept explanations** → `graphify explain "<concept>"`. Never infer from filename alone.
4. **If `graphify-out/wiki/index.md` exists** → use it for broad navigation. Do not list directories instead.
5. **Read `graphify-out/GRAPH_REPORT.md` only** for broad architecture review when query/path/explain return insufficient context. Never read it as a first step.
6. **After every code modification** → run `graphify update .` before ending the session. AST-only, no API cost, no exceptions.

Violation of any rule above is not a judgment call.
