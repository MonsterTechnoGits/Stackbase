# Auth & Role Patterns

These rules are **mandatory** for all authentication, authorization, and role-based access work. They override default behavior. Follow them exactly — violations are not judgment calls.

---

## STOP — Read this before writing any auth or role code

Before writing any auth-related code, answer these questions in order:

1. **Is this a route protection decision (which requests are allowed)?**
   - **Backend route** → use `preHandler: [fastify.authenticate]` + optionally `validateUserRole(...)`. See [Route Protection Rules](#rule-2--route-protection).

2. **Is this a frontend access decision (which UI the user sees)?**
   - **If yes** → read role from `useAuth()`. Never call `auth.api.getSession()` on the frontend. Never re-fetch the session manually.

3. **Is this a new role or permission?**
   - Roles live in `m_roles` (database) and in `UserRoles` in [backend/src/SharedModule/utils/constants.ts](../../backend/src/SharedModule/utils/constants.ts). Both must be updated together. See [Role Management Rules](#rule-4--role-management).

4. **Is this a Better Auth native operation** (sign-in, sign-out, session, updateUser, changePassword)?
   - **If yes** → see [api-integration.md](./api-integration.md) Rule 7. Do not create a custom backend route for these.

---

## How authentication works end-to-end

Understanding this flow is required before changing any part of it:

```
Browser request (with session cookie)
        ↓
fastify.authenticate  (auth.plugin.ts)
  — calls auth.api.getSession() via Better Auth
  — queries m_users JOIN m_roles for status + role_key
  — rejects 401 if no session, inactive, or banned
  — sets req.user = { id, email, name, roleKey }
        ↓
validateUserRole(allowedRoles)  (AuthMiddleware.ts)
  — reads req.user.roleKey
  — rejects 403 if role not in allowedRoles
  — passes if allowedRoles includes 'ALL'
        ↓
Route handler — req.user is always populated here
```

**Session config** (BetterAuthConfig.ts):
- Session expires: **7 days**
- Session refreshes if older than: **1 day**
- Cookie cache TTL: **5 minutes** (reduces DB hits per request)
- `SESSION_INACTIVITY_TIMEOUT_MINUTES`: env var, default **15 min** — tracked via `last_activity_at` on `ba_sessions`

---

## Rule 1 — Route registration: public vs authenticated

There are exactly two route prefixes. Every new route must go in one of them — never invent a third.

| Prefix | Plugin registered in `app.ts` | Who can call it |
|---|---|---|
| `/api/public/*` | `authPublicRoutes` | Anyone — no session required |
| `/api/*` | Your domain routes | Must have a valid session (enforced by `fastify.authenticate`) |

**Public routes** (`/api/public/*`):
- Sign-in, sign-out, get-session, password reset, email verification, any unauthenticated webhook
- Registered as: `fastify.register(authPublicRoutes, { prefix: '/api/public' })`
- `NonRestrictedRoutes/` is the directory for additional public route files — add them there, not inline in `app.ts`
- Never put business data endpoints under `/api/public/` — only auth and unauthenticated flows

**Authenticated routes** (`/api/*`):
- Every business domain endpoint
- Must always have `preHandler: [fastify.authenticate]` (or `validateUserRole` which implies it)
- Registered as: `fastify.register(domainRoutes, { prefix: '/api' })`

**Plugin registration order in `app.ts` is fixed — do not change it:**
```
corsPlugin → helmetPlugin → cookiePlugin → swaggerPlugin →
fastifySSE → fastifyMultipart → websocketPlugin → jwtPlugin →
authPlugin          ← must come after jwtPlugin
authPublicRoutes    ← must come after authPlugin
domainRoutes        ← must come after authPlugin
staticFrontendPlugin (production only)
```

---

## Rule 2 — Route protection

Every authenticated route must declare its access level explicitly via `preHandler`. Never rely on implicit protection.

### Pattern A — Any authenticated user (any role)

```ts
fastify.get('/items', {
  preHandler: [fastify.authenticate],
  schema: { ... },
  handler: async (req, reply) => {
    // req.user is guaranteed non-null here
  },
});
```

### Pattern B — Specific role(s) only

```ts
import { validateUserRole } from '@/AuthModule/Middleware/AuthMiddleware';

fastify.delete('/items/:id', {
  preHandler: [fastify.authenticate, validateUserRole(UserRoles.SUPER_ADMIN)],
  schema: { ... },
  handler: async (req, reply) => { ... },
});

// Multiple roles allowed:
fastify.post('/reports', {
  preHandler: [fastify.authenticate, validateUserRole([UserRoles.SUPER_ADMIN, UserRoles.USER])],
  schema: { ... },
  handler: async (req, reply) => { ... },
});
```

### Pattern C — Any authenticated user, role checked inside handler

Use `validateUserRole('ALL')` when authentication is required but all roles are permitted — identical to Pattern A but documents the intent explicitly:

```ts
preHandler: [fastify.authenticate, validateUserRole('ALL')]
```

**Violation examples — never do this:**
```ts
// ❌ no preHandler — route is silently unprotected
fastify.get('/admin/users', {
  schema: { ... },
  handler: async (req, reply) => { ... },
});

// ❌ manual session check inside handler — bypasses the standard middleware stack
handler: async (req, reply) => {
  const session = await auth.api.getSession(...);
  if (!session) return reply.status(401).send(...);
}

// ❌ validateUserRole without fastify.authenticate first — req.user will be null
preHandler: [validateUserRole(UserRoles.SUPER_ADMIN)]
```

### `req.user` shape

Inside any handler that has `fastify.authenticate` in `preHandler`, `req.user` is always populated:

```ts
req.user: {
  id: string;       // Better Auth user ID
  email: string;
  name: string;
  roleKey: UserRole; // 'superadmin' | 'user'
}
```

`req.user` is `null` only before `fastify.authenticate` runs (i.e. on public routes). Never access `req.user` on a public route handler.

---

## Rule 3 — Frontend auth patterns

### Hook usage — `useAuth()` vs `useSession()`

Both hooks come from [frontend/src/contexts/AuthContext.tsx](../../frontend/src/contexts/AuthContext.tsx). Use the right one:

| Hook | Returns | Use when |
|---|---|---|
| `useSession()` | `{ data, isPending, error }` — Better Auth session object | You only need to know if a session exists or read raw session fields |
| `useAuth()` | `{ authClient, session }` — full context | You need to call `authClient` methods (sign-out, updateUser, etc.) AND read session |

```ts
// ✅ checking if logged in / reading user data
const session = useSession();
if (session.isPending) return <Skeleton />;
if (!session.data) redirect('/sign-in');
const user = session.data.user;

// ✅ need to call authClient + read session together
const { authClient, session } = useAuth();
```

**Never do this:**
```ts
// ❌ calling authClient directly in a component — goes through services/
import { authClient } from '@/contexts/AuthContext';

// ❌ fetching session via a custom fetch/API call
const res = await fetch('/api/public/auth/get-session');

// ❌ reading session outside AuthProvider tree
const session = authClient.useSession(); // called outside a component inside AuthProvider
```

### AuthProvider position in the provider tree

`AuthProvider` wraps inside `QueryClientProvider` in [frontend/src/components/providers.tsx](../../frontend/src/components/providers.tsx). This order is fixed:

```
ThemeProvider
  └─ ThemeRippleProvider
       └─ QueryClientProvider    ← React Query must wrap AuthProvider
            └─ AuthProvider      ← Better Auth session available to all children
```

**Never move `AuthProvider` outside `QueryClientProvider`** — service hooks that call `authClient` inside `useQuery`/`useMutation` depend on the query client being available in the same tree.

### Role-based UI rendering

Read `roleKey` from the session to conditionally show UI. Never hardcode role strings — import from the source of truth:

```ts
// ✅
import { UserRoles } from '@/lib/constants/roles'; // frontend mirror of backend UserRoles
const session = useSession();
const isSuperAdmin = session.data?.user?.roleKey === UserRoles.SUPER_ADMIN;

// ❌ hardcoded string comparison
if (user.roleKey === 'superadmin') { ... }
```

> Frontend `UserRoles` constant must mirror `backend/src/SharedModule/utils/constants.ts`. If roles are added to the backend, update the frontend constant in the same PR.

### Session expiry and inactivity handling

- Better Auth session cookie expires after **7 days** of no refresh.
- The backend tracks `last_activity_at` on `ba_sessions` — inactivity timeout is `SESSION_INACTIVITY_TIMEOUT_MINUTES` (default 15 min).
- On the frontend: if `useSession()` returns `data: null` after `isPending` resolves, the session has expired. Redirect to `/sign-in`.
- Never show a stale "you are logged in" state — always gate on `!session.isPending && session.data`.

```ts
// ✅ correct session guard in a protected layout
const session = useSession();
if (session.isPending) return <FullPageSkeleton />;
if (!session.data) redirect('/sign-in');
```

---

## Rule 4 — Role management

### The two roles

There are currently **two roles** defined in `UserRoles` in [backend/src/SharedModule/utils/constants.ts](../../backend/src/SharedModule/utils/constants.ts):

| `roleKey` | Constant | Purpose |
|---|---|---|
| `'superadmin'` | `UserRoles.SUPER_ADMIN` | Full access — all admin operations |
| `'user'` | `UserRoles.USER` | Standard authenticated user |

### Adding a new role — required steps (all must happen together)

1. **Database** — insert a new row into `m_roles` (in the seed or a migration): `role_key`, `role_name`, `status: 'active'`
2. **Backend constant** — add to `UserRoles` in `backend/src/SharedModule/utils/constants.ts`
3. **Frontend constant** — mirror the same key in the frontend roles constant file
4. **Route guards** — update `validateUserRole(...)` calls on every route that should allow the new role
5. **auth.plugin.ts** — the `roleKey` assignment logic currently maps only `superadmin` vs `user`; update it to handle the new role_key

**Never** add a role string in only one place. All 5 steps are required or the role will be silently ignored by middleware.

### Adding role-based access to a new route

Before writing `validateUserRole(...)`, answer:
- Should `SUPER_ADMIN` always have access? (almost always yes)
- Which other roles need access?
- What should happen if a valid session exists but the user has no role assigned (`roleKey` is null)? — currently resolves to `UserRoles.USER`

---

## Rule 5 — User status enforcement

Users have three statuses defined in [backend/src/DatabaseModule/schema/core/enums.schema.ts](../../backend/src/DatabaseModule/schema/core/enums.schema.ts):

| Status | Constant | Behavior |
|---|---|---|
| `'active'` | `UserStatus.ACTIVE` | Normal access |
| `'inactive'` | `UserStatus.INACTIVE` | Blocked at `fastify.authenticate` (401) and at sign-in (`preValidation`) |
| `'banned'` | `UserStatus.BANNED` | Blocked at `fastify.authenticate` (401) and at sign-in (`preValidation`) |

**Both `inactive` and `banned` users are blocked at two points:**
1. Sign-in `preValidation` in `auth.public.routes.ts` — prevents new sessions
2. `fastify.authenticate` in `auth.plugin.ts` — invalidates existing sessions

**Never** check user status only at sign-in and assume existing sessions are clean — `fastify.authenticate` re-checks on every request.

When setting a user inactive or banned, no additional session invalidation step is needed — the next request will be rejected automatically.

---

## Rule 6 — Security constraints

- **Never log session tokens, cookies, or `BETTER_AUTH_SECRET`** — use `req.user.id` for log correlation, never the raw cookie value
- **Never expose `req.user` to the frontend** via a custom endpoint that returns the full internal user object — the `/api/me` route is the defined profile endpoint, return only what it already returns
- **Never bypass `fastify.authenticate`** with a manual `auth.api.getSession()` call inside a route handler that should be protected — the middleware handles this; duplicating it is both wrong and a maintenance hazard
- **`BETTER_AUTH_SECRET`** must be set in production env — the default empty string (`''`) in `BetterAuthConfig.ts` is for local dev only; a missing secret in production means sessions can be forged
- **`trustedOrigins`** in `BetterAuthConfig.ts` must be explicitly set in production — the default `http://localhost:3000` must not reach production
- **CORS** is configured in `corsPlugin` — never add ad-hoc `Access-Control-Allow-Origin` headers in route handlers

---

## Decision tree — "How do I protect a new route?"

```
New backend route needed?
│
├─ No session required (sign-in, public webhook, unauthenticated flow)?
│   └──► Register under /api/public/ in NonRestrictedRoutes/ or authPublicRoutes
│         No preHandler needed.
│
└─ Session required?
    │
    ├─ Any authenticated user (all roles)?
    │   └──► preHandler: [fastify.authenticate]
    │
    └─ Specific role(s) only?
        └──► preHandler: [fastify.authenticate, validateUserRole(UserRoles.SUPER_ADMIN)]
             or validateUserRole([UserRoles.SUPER_ADMIN, UserRoles.USER])
```

```
Frontend: does the user have permission to see this UI?
│
├─ Read session → useSession()
│   data === null after isPending → redirect('/sign-in')
│
└─ Check role → session.data.user.roleKey === UserRoles.SUPER_ADMIN
   import UserRoles from frontend constants — never hardcode the string
```

---

## Pre-merge checklist

- [ ] New authenticated route has `preHandler: [fastify.authenticate]` — never omitted
- [ ] Role-restricted routes use `validateUserRole(UserRoles.X)` — never inline string comparison
- [ ] New public route registered under `/api/public/` prefix in `NonRestrictedRoutes/`
- [ ] Plugin registration order in `app.ts` unchanged
- [ ] New role added to `UserRoles` in `constants.ts` AND mirrored in frontend constants AND `auth.plugin.ts` role mapping updated
- [ ] User status checks rely on `fastify.authenticate` — no manual status checks inside route handlers
- [ ] Frontend uses `useSession()` or `useAuth()` — no raw `fetch` to session endpoints
- [ ] `session.isPending` handled before rendering protected UI — no flash of logged-in state
- [ ] Role string comparisons use `UserRoles.*` constant — no hardcoded `'superadmin'` / `'user'` strings
- [ ] No session tokens, cookies, or secrets written to logs
- [ ] `BETTER_AUTH_SECRET` and `trustedOrigins` confirmed set for production
