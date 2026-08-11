# Architecture

Root-level reference for how this repo is structured and how data flows through it. For command reference and rule files, see [CLAUDE.md](CLAUDE.md).

## What this project is

Stackbase — a pnpm monorepo boilerplate for building full-stack apps fast, with two independently deployable apps that share one contract:

- **Backend** — Fastify 5 API server (TypeScript, Drizzle ORM, Better Auth, Postgres)
- **Frontend** — Next.js 16 / React 19 app (App Router, TanStack Query, Redux Toolkit, shadcn/ui)

The backend's OpenAPI spec is the single source of truth for the frontend's API layer — nothing in the frontend hand-describes a request/response shape.

---

## Repo tree

```
sumandey-boilerplate/
├── backend/
│   ├── src/
│   │   ├── index.ts                     # process entrypoint — boots Fastify, calls app.ts
│   │   ├── app.ts                       # fastify-plugin factory — wires every plugin + route, in fixed order
│   │   │
│   │   ├── AuthModule/
│   │   │   ├── BetterAuthConfig.ts      # Better Auth instance config (session TTL, trustedOrigins, email hooks)
│   │   │   ├── Middleware/
│   │   │   │   └── AuthMiddleware.ts    # validateUserRole(allowedRoles) preHandler
│   │   │   └── Routes/
│   │   │       ├── auth.public.routes.ts   # /api/public/* — sign-in, sign-up, password reset
│   │   │       └── profile.routes.ts       # /api/* — authenticated profile endpoints
│   │   │
│   │   ├── DatabaseModule/
│   │   │   ├── connection.ts            # Drizzle + Postgres client
│   │   │   ├── schema/
│   │   │   │   ├── auth/                # Better Auth tables: accounts, sessions, verifications
│   │   │   │   ├── core/                # domain tables: users, roles, enums
│   │   │   │   ├── relations.ts         # Drizzle relation definitions across schemas
│   │   │   │   └── index.ts             # re-exports the full schema
│   │   │   └── seed/
│   │   │       └── bootstrap.ts         # seeds roles + initial data
│   │   │
│   │   ├── SharedModule/
│   │   │   ├── Plugins/                 # one file per Fastify plugin (cors, helmet, cookie,
│   │   │   │                            #   swagger, jwt, auth, websocket, staticFrontend)
│   │   │   ├── Middleware/
│   │   │   │   └── ErrorHandler.ts      # global Fastify error handler
│   │   │   └── utils/
│   │   │       ├── constants.ts         # UserRoles, shared enums — never hardcode role strings
│   │   │       ├── errorcode.ts         # Err object — every error code used in route schemas
│   │   │       ├── Config.ts            # env var loading/validation
│   │   │       ├── CryptoUtils.ts, PaiseUtils.ts, Interfaces.ts
│   │   │       └── logger/              # pino-based logger, writes to backend/logs/
│   │   │
│   │   └── GlobalModule/                # (present in some environments) cross-domain features, e.g. AI routes
│   │
│   ├── scripts/generate-openapi.js      # fetches live OpenAPI spec → openapi.json (repo root)
│   ├── drizzle.config.ts                # Drizzle Kit config for migrations
│   └── logs/<date>/ServerLogs/          # daily rotated combined + error logs
│
├── frontend/
│   └── src/
│       ├── app/                         # Next.js App Router — routing + layout only
│       │   ├── (auth)/                  # route group: sign-in, sign-up, forgot/reset password
│       │   ├── dashboard/               # layout.tsx (session guard) + page.tsx + profile/
│       │   ├── layout.tsx               # root layout — wraps <Providers>
│       │   └── page.tsx
│       │
│       ├── sections/<domain>/           # ALL feature UI + local state, one folder per domain
│       │   ├── auth/                    # sign-in-view, sign-up-view, forgot-password-view, ...
│       │   ├── dashboard/               # dashboard-view + dashboard-stats + dashboard-getting-started
│       │   └── profile/                 # profile-view
│       │
│       ├── components/
│       │   ├── ui/                      # shadcn primitives — closed set, approval required to extend
│       │   ├── layout/                  # app-sidebar, app-toolbar, page-header
│       │   ├── sidebar/                 # sidebar-menu, sidebar-provider
│       │   ├── common/                  # icon-box and other cross-domain shared bits
│       │   ├── motion.tsx               # the ONLY source of animation primitives
│       │   └── providers.tsx            # provider tree root (Theme → QueryClient → Auth)
│       │
│       ├── contexts/
│       │   ├── AuthContext.tsx          # Better Auth session context — useAuth() / useSession()
│       │   └── ThemeRippleContext.tsx
│       │
│       ├── store/                       # Redux Toolkit — global client UI state only
│       │   ├── index.ts                 # configureStore, RootState, AppDispatch
│       │   ├── hooks.ts                 # typed useAppSelector / useAppDispatch
│       │   └── slices/ui.slice.ts
│       │
│       ├── services/
│       │   └── AuthService.ts           # ONLY layer that calls generated SDK / authClient
│       │
│       ├── api/
│       │   ├── client.ts                # sets baseUrl + credentials — the only config point
│       │   └── generated/               # openapi-ts output — NEVER hand-edited, fully regenerated
│       │
│       ├── hooks/                       # use-haptic, use-mobile, use-nav-breadcrumbs
│       ├── lib/
│       │   ├── constants/nav.ts         # nav config — single source of truth for enums/options
│       │   ├── haptic.ts                # pure haptic logic (Android WebView bridge)
│       │   └── utils.ts                 # cn() = clsx + tailwind-merge
│       └── proxy.ts                     # Next.js 16 request interception (replaces middleware.ts)
│
├── ci/
│   ├── env/production.base
│   └── pm2/ecosystem.config.js          # production process manager config
│
├── openapi.json                         # generated backend spec — input to frontend codegen
├── .claude/rules/                       # mandatory architecture rules (auth, UI, API integration, haptics)
├── CLAUDE.md                            # commands + high-level rules for AI agents
└── ARCHITECTURE.md                      # this file
```

---

## Backend architecture

### Boot sequence

```
index.ts
  └─ registers app.ts (fastify-plugin factory)
       └─ appFactory(fastify) — fixed plugin order:
            1. corsPlugin
            2. helmetPlugin
            3. cookiePlugin
            4. swaggerPlugin
            5. fastifySSE
            6. fastifyMultipart   (20MB file limit)
            7. websocketPlugin
            8. jwtPlugin
            9. authPlugin          ← decorates fastify.authenticate (Better Auth session)
           10. authPublicRoutes    → /api/public/*   (no auth required)
           11. profileRoutes       → /api/*          (fastify.authenticate required)
           12. staticFrontendPlugin  (production only — serves built Next.js output)
```

This order is load-bearing: `authPlugin` must come after `jwtPlugin`; every domain route registers after `authPlugin` so `fastify.authenticate` exists when routes reference it.

### Domain module pattern

Every backend feature is a `<Domain>Module/` folder with the same shape:

```
<Domain>Module/
  Routes/<Name>.routes.ts     # Fastify routes, inline schema block, tags + full response map
  Middleware/                 # domain-specific preHandlers
```

Cross-cutting concerns (plugins, error handling, constants, logging) live in `SharedModule/`.

### Request lifecycle (authenticated route)

```
Browser request (session cookie)
      ↓
fastify.authenticate            (AuthModule/Plugins/auth.plugin.ts)
  — auth.api.getSession() via Better Auth
  — joins m_users + m_roles → status + roleKey
  — 401 if no session / inactive / banned
  — sets req.user = { id, email, name, roleKey }
      ↓
validateUserRole(allowedRoles)  (AuthModule/Middleware/AuthMiddleware.ts)   [only on role-restricted routes]
  — 403 if req.user.roleKey not in allowedRoles
      ↓
Route handler — req.user guaranteed populated
```

Two roles today: `UserRoles.SUPER_ADMIN` (`'superadmin'`) and `UserRoles.USER` (`'user'`), defined once in `SharedModule/utils/constants.ts` — never hardcoded elsewhere.

### Data layer

- **Drizzle ORM** over Postgres, schema split into `auth/` (Better Auth's own tables) and `core/` (domain tables: users, roles, enums), joined via `relations.ts`.
- `DatabaseModule/seed/bootstrap.ts` seeds roles and baseline data.
- Migrations driven by `drizzle.config.ts` (Drizzle Kit).

### API contract surface

Every route declares a full JSON Schema `schema` block (tags, body/params/querystring, response per status code). This is what makes the OpenAPI spec — and therefore the entire frontend codegen pipeline — possible. Swagger UI at `/api-docs`, raw spec at `/documentation/json`.

---

## Frontend architecture

### Layered structure (enforced, not optional)

```
app/**/page.tsx        Routing only: metadata, session guard, one <XView /> import — nothing else
      ↓
sections/<domain>/      Feature UI + local state + data-fetching hooks for ONE domain
      ↓
components/             Shared feature components (2+ domains) + components/ui/ primitives
```

- A page file never contains raw HTML, business logic, or inline Tailwind theme classes.
- A section (`*-view.tsx`) owns its data fetching (React Query hooks from `services/`) and composes `components/ui/` primitives.
- `components/ui/` is a closed set (shadcn-style primitives) — new variants go in via `cva`, never a new file, without explicit approval.

### State ownership — decision table

| State | Home | Tool |
|---|---|---|
| Server data | `services/<Domain>Service.ts` | TanStack React Query |
| Cross-domain global UI state | `store/slices/<domain>.slice.ts` | Redux Toolkit |
| Auth session / theme | `contexts/<Name>Context.tsx` | Context API |
| Local transient toggle | the component itself | `useState` |

No prop drilling: a value threaded through a component that doesn't use it itself is a violation — lift to context/Redux or re-fetch via React Query in the child instead.

### API client pipeline

```
backend route schema
      ↓  (backend running)
pnpm generate:openapi  →  openapi.json (repo root)
      ↓
pnpm generate:api  →  frontend/src/api/generated/*   (openapi-ts codegen — fully rewritten every run)
      ↓
frontend/src/api/client.ts     (sets baseUrl + credentials — only config point)
      ↓
frontend/src/services/<Domain>Service.ts   (wraps generated SDK in React Query hooks; only call site
                                             for generated code AND for Better Auth's authClient)
      ↓
sections/ and components/      (call only useXyz() hooks from services/)
```

`api/generated/` is never hand-edited — a wrong shape there means the backend schema is wrong; fix it there and regenerate.

### Provider tree (fixed order)

```
ThemeProvider
  └─ ThemeRippleProvider
       └─ QueryClientProvider     ← must wrap AuthProvider (service hooks need the query client)
            └─ AuthProvider       ← Better Auth session, available app-wide via useAuth()/useSession()
```

### Auth on the frontend

- `useSession()` — read-only session check (`{ data, isPending, error }`).
- `useAuth()` — full context, use when calling `authClient` methods directly.
- Session guard pattern in every protected layout: `isPending` → skeleton; `!data` → redirect to `/sign-in`.
- Better Auth native operations (sign-in, sign-out, updateUser, changePassword, password reset) go straight through `authClient` — never a custom backend route.

---

## Cross-cutting: how a feature gets built end-to-end

1. **Backend**: add/extend a route in the right `<Domain>Module/Routes/` file with a full `schema` block; register its tag in `swagger.plugin.ts` if new.
2. Verify the route in `/api-docs` with a fully populated schema.
3. **Codegen**: `pnpm generate:api` (backend running on :44300) — rewrites `frontend/src/api/generated/`.
4. **Frontend service**: wrap the generated SDK call in `services/<Domain>Service.ts` as a React Query hook (or `authClient` call for native auth ops).
5. **Frontend UI**: build/extend a `sections/<domain>/*-view.tsx` that calls the service hook and composes `components/ui/` primitives; page file just imports the view.
6. Loading/empty states use `<Skeleton />` / `<Empty />`; errors surface via `toast` inside the service layer's `onError`.

---

## Deployment

```
pnpm build (root)
  → backend build (prettier + lint + tsc --noEmit + tsup)
  → frontend `next build`
  → scripts/assemble-deploy.js copies frontend output into the backend's static serving path
  → production: staticFrontendPlugin serves the built Next.js output directly from Fastify
```

Process management in production via `ci/pm2/ecosystem.config.js`; environment base in `ci/env/production.base`.

---

## Key invariants worth remembering

- Backend OpenAPI schema is the only source of truth for frontend types — never hand-typed interfaces mirroring API shapes.
- Every `/api/*` route requires `fastify.authenticate`; only `/api/public/*` skips it.
- Role checks always go through `UserRoles.*` constants, never string literals, on both frontend and backend.
- `components/ui/` and `api/generated/` are both "generated/closed" in spirit — one by codegen, one by design-system governance — and neither is hand-edited casually.
- Global client state defaults to Redux Toolkit only when 2+ unrelated components need it; server data never goes in Redux.
