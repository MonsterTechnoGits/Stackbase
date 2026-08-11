# API Integration Rules

These rules are **mandatory** for every backend route and its frontend integration. They override default behavior. Follow them exactly — violations are not judgment calls.

---

## STOP — Read this before writing any API code

Before writing a single line of API-related code, answer these questions in order:

1. **Is this a Better Auth native operation?** (sign-in, sign-out, get-session, updateUser, changePassword, requestPasswordReset, resetPassword)
   - **If yes → use `authClient` from `@/contexts/AuthContext`. Stop. Do not create a backend route. Do not write a service using the generated SDK.**
   - See the [Better Auth reference table](#6--better-auth-endpoint-reference) for the exact call.

2. **Is the frontend endpoint already in `api/generated/`?**
   - **If yes → write the service hook in `services/<Domain>Service.ts` and you're done. Do not write `fetch`, do not hand-write types.**

3. **Does the backend route exist but `api/generated/` is stale?**
   - **If yes → run `pnpm generate:api` (backend must be running). Do not write anything by hand while waiting.**

4. **Is this a genuinely new backend endpoint?**
   - **If yes → follow Rules 1–3 in order: write the route schema first, verify it in `/api-docs`, then regenerate, then write the service hook.**

**There is no step 5 where you write `fetch('/api/...')` or hand-type a request/response interface. That step does not exist.**

---

## Rule 1 — Every backend route MUST have a `schema` block

A route without a `schema` is invisible to the OpenAPI spec and breaks the entire frontend pipeline silently.

Every `fastify.get/post/put/patch/delete` call must include a `schema` object covering:

| Field | Required when |
|---|---|
| `tags` | Always — must reference a tag registered in `swagger.plugin.ts` |
| `summary` | Always |
| `body` | Route accepts a request body |
| `querystring` | Route accepts query params |
| `params` | Route has path params (`:id`, etc.) |
| `response[200]` | Always |
| `response[4xx/5xx]` | Every error path the handler can return |

**Schema format rules:**
- Write plain JSON Schema objects: `{ type: 'object', properties: {...} } as const`
- **Never** use `zod-to-json-schema` — incompatible with this project's Zod version (causes TS2345)
- Use `zod` only for runtime `.parse()` inside the handler body — it has no role in the `schema` block
- Reuse a shared `const apiErrorResponse` object for error shapes — never redefine `{status, message, code}` per route
- New error codes go in [backend/src/SharedModule/utils/errorcode.ts](../../backend/src/SharedModule/utils/errorcode.ts) (`Err` object) — never inline magic numbers

**New domain checklist (do this before writing the route):**
1. Add the new tag to [backend/src/SharedModule/Plugins/swagger.plugin.ts](../../backend/src/SharedModule/Plugins/swagger.plugin.ts)
2. Then write the route with `tags: ['YourNewTag']`

**Violation example — never do this:**
```ts
// ❌ bare handler, no schema — invisible to OpenAPI
fastify.post('/items', async (req, reply) => {
  return reply.send({ ok: true });
});
```

**Correct pattern:**
```ts
// ✅ full schema block
fastify.post('/items', {
  schema: {
    tags: ['Items'],
    summary: 'Create an item',
    body: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    } as const,
    response: {
      201: { type: 'object', properties: { id: { type: 'string' } } } as const,
      400: apiErrorResponse,
      500: apiErrorResponse,
    },
  },
}, async (req, reply) => { ... });
```

---

## Rule 2 — Verify in `/api-docs` before touching the frontend

After writing or changing a route schema:

1. Ensure the backend dev server is running (`pnpm --filter @stackbase/backend dev`)
2. Open `http://localhost:44300/api-docs`
3. Confirm the route appears under the correct tag with a fully populated request/response schema — not just `200: {}`
4. **Only then** proceed to regenerate

If the route does not appear or the schema is wrong, fix the backend. Do not proceed to generation with a broken schema.

---

## Rule 3 — Regenerate after every schema change

Any schema change — new endpoint, changed body/response shape, new status code, renamed tag — requires regeneration:

```bash
pnpm generate:api   # backend must be running on port 44300
```

This fetches the live spec → writes `openapi.json` → fully rewrites `frontend/src/api/generated/`.

- **Never hand-edit anything inside `frontend/src/api/generated/`** — it is overwritten on every run
- If something looks wrong in `generated/`, fix the backend route schema and regenerate — do not patch the generated file
- Config: [frontend/openapi-ts.config.ts](../../frontend/openapi-ts.config.ts)

---

## Rule 4 — Frontend data flows through exactly four layers. No layer may be skipped.

```
backend route schema
       ↓
  openapi.json          ← pnpm generate:api writes this
       ↓
api/generated/          ← Layer 1: never import from here in pages/components
       ↓
api/client.ts           ← Layer 2: only place that sets baseUrl + credentials
       ↓
services/<Domain>Service.ts   ← Layer 3: only place that calls generated SDK or authClient
       ↓
pages / components      ← Layer 4: call only hooks from services/
```

### Layer 1 — `frontend/src/api/generated/` (read-only, never import directly)

| File | Contains |
|---|---|
| `types.gen.ts` | All request/response TypeScript types |
| `sdk.gen.ts` | Typed SDK functions (one per route) |
| `@tanstack/react-query.gen.ts` | `*Options` and `*Mutation` factory functions |
| `client.gen.ts` | Raw generated client instance |

**Never import from this directory in pages or components.**

### Layer 2 — `frontend/src/api/client.ts` (configuration only)

The **only** file that configures `baseUrl` and `credentials`:

```ts
import { client } from '@/api/generated/client.gen';
client.setConfig({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:44300',
  credentials: 'include',
});
```

Every service file that uses the generated SDK must import this as a side-effect:
```ts
import '@/api/client';
```

Never construct a separate `fetch` or `axios` instance anywhere else in the codebase.

### Layer 3 — `frontend/src/services/<Domain>Service.ts` (the only call site)

One file per backend domain. The **only** layer allowed to call generated SDK functions or `authClient`.

**For custom backend routes (generated SDK):**
```ts
import '@/api/client'; // side-effect: must be first
import { getApiItemsOptions, getApiItemsQueryKey } from '@/api/generated/@tanstack/react-query.gen';

export function useGetItems() {
  return useQuery(getApiItemsOptions());
}

export function useCreateItem() {
  return useMutation({
    ...postApiItemsMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getApiItemsQueryKey() });
      toast.success('Item created');
    },
    onError: (err) => toast.error(err.message),
  });
}
```

**For Better Auth operations:**
```ts
import { authClient } from '@/contexts/AuthContext';

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (payload) => {
      const result = await authClient.updateUser(payload);
      if (result.error) throw new Error(result.error.message); // always check .error
      return result.data;
    },
    onSuccess: () => toast.success('Profile updated'),
    onError: (err) => toast.error(err.message),
  });
}
```

**Service layer rules:**
- Query cache invalidation uses the **generated** query-key function — never a hand-written `['items']` array
- All `toast.success` / `toast.error` calls go here — not in pages or components
- `authClient` always returns `{ data, error }` — always check `.error` and throw, or React Query's `onError` will never fire
- One service file per domain — do not scatter service hooks across multiple files for the same domain

### Layer 4 — Pages / Components (consumers only)

Pages and components call only `useXyz()` hooks exported from `services/`.

**Violation examples — never do this in a page or component:**
```ts
// ❌ direct fetch
const res = await fetch('/api/items');

// ❌ importing from generated directly
import { getApiItems } from '@/api/generated/sdk.gen';

// ❌ hand-written type mirroring the backend
interface Item { id: string; name: string; }

// ❌ authClient in a component (unless it's an auth view with no service hook)
import { authClient } from '@/contexts/AuthContext';
```

**Correct pattern:**
```ts
// ✅ page calls only the service hook
import { useGetItems } from '@/services/ItemsService';

export default function ItemsPage() {
  const { data, isLoading } = useGetItems();
  ...
}
```

---

## Rule 5 — React Query patterns

### QueryClient — one instance, never duplicated

The single `QueryClient` instance lives in [frontend/src/components/providers.tsx](../../frontend/src/components/providers.tsx) inside `Providers`. It is already configured with global defaults:

```ts
new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
})
```

- **Never** create a `new QueryClient()` anywhere else in the codebase — not in a service file, not in a component, not in a test utility
- **Never** call `useQueryClient()` outside of `services/` — if a component needs to trigger an invalidation, it calls a mutation hook from `services/` which handles it internally
- The provider tree order is fixed: `QueryClientProvider` wraps `AuthProvider` — do not reorder

### Cache invalidation — decision table

| Scenario | Pattern |
|---|---|
| Mutation changes data another query reads | `queryClient.invalidateQueries({ queryKey: getFooQueryKey() })` in `onSuccess` |
| User needs to see the absolute latest (e.g. after manual refresh action) | `queryClient.invalidateQueries(...)` — forces a background refetch |
| Optimistic update for instant UI feedback | `onMutate` + `onError` rollback + `onSettled` invalidation — only when latency is noticeable |
| Data that never changes (enums, config) | Set `staleTime: Infinity` in the query options |

Always use the **generated** query-key function for invalidation — never a hand-written array:

```ts
// ❌ hand-written key — breaks if the generated key shape changes
queryClient.invalidateQueries({ queryKey: ['api', 'items'] });

// ✅ generated key — always in sync with the route
queryClient.invalidateQueries({ queryKey: getApiItemsQueryKey() });
```

### Loading and empty state — mandatory patterns

Never leave loading or empty states as raw `null`, `undefined` checks, or unstyled conditional renders.

| State | Component to use | Where it comes from |
|---|---|---|
| Data is loading | `<Skeleton />` — match the shape of the content it replaces | `components/ui/skeleton.tsx` |
| Query returned empty array / no data | `<Empty />` — always with a descriptive message | `components/ui/empty.tsx` |
| Query errored | Surface via `toast.error` in the service `onError` — already handled there | `services/<Domain>Service.ts` |

**Violation examples — never do this:**
```tsx
// ❌ raw null check with no loading state
if (!data) return null;

// ❌ unstyled loading text
if (isLoading) return <p>Loading...</p>;

// ❌ empty state inline in JSX
if (data.length === 0) return <div>No items found</div>;
```

**Correct pattern:**
```tsx
// ✅
if (isLoading) return <ItemsPageSkeleton />;   // Skeleton that matches the layout
if (!data?.length) return <Empty><p>No items yet</p></Empty>;
return <ItemsList items={data} />;
```

The `Skeleton` component should mirror the real content's layout (same number of rows/cards, same approximate dimensions) — not a generic spinner unless the content shape is truly unknown.

### Shared query keys

If a query key is needed in more than one service file, export it from the service that owns that domain:

```ts
// ItemsService.ts — owns the items domain
export { getApiItemsQueryKey } from '@/api/generated/@tanstack/react-query.gen';
```

Other services import from the owning service file, not directly from `api/generated/`. This keeps `api/generated/` imports confined to service files.

---

## Rule 6 — No hardcoded API path strings

A literal path string (`'/api/items'`, `'/api/users/:id'`) must appear in exactly one place: the backend route registration. The generated client carries it forward automatically.

If you need to call an endpoint and it is not in `api/generated/`:
1. Check that the backend route has a `schema` block and is visible in `/api-docs`
2. Run `pnpm generate:api`
3. Then write the service hook

Do not work around missing generation with a manual `fetch`.

---

## Rule 7 — Better Auth endpoint reference

These operations are handled by `authClient` — **never** create custom backend routes for them:

| Operation | Call |
|---|---|
| Sign in | `authClient.signIn.email({ email, password })` |
| Sign out | `authClient.signOut()` |
| Get session | `authClient.useSession()` (hook) |
| Update profile name | `authClient.updateUser({ name })` |
| Change password | `authClient.changePassword({ currentPassword, newPassword })` |
| Request password reset | `authClient.requestPasswordReset({ email, redirectTo })` |
| Reset password | `authClient.resetPassword({ newPassword, token })` |

Password reset email delivery is configured in [backend/src/AuthModule/BetterAuthConfig.ts](../../backend/src/AuthModule/BetterAuthConfig.ts) — currently logs the link. Replace with real email delivery (Resend, Nodemailer, etc.) when SMTP is available.

---

## Decision tree — "How do I add a new API call?"

```
New API call needed?
│
├─ Better Auth operation? (sign-in, sign-out, session, updateUser, changePassword, etc.)
│   └──YES──► Call authClient in services/<Domain>Service.ts. Done.
│
├─ Endpoint already in api/generated/?
│   └──YES──► Write service hook in services/<Domain>Service.ts. Done.
│
├─ Backend route exists but generated/ is stale?
│   └──YES──► pnpm generate:api → write service hook. Done.
│
└─ Brand new endpoint?
    1. Add tag to swagger.plugin.ts (if new domain)
    2. Write route with full schema block
    3. Verify in /api-docs
    4. pnpm generate:api
    5. Write service hook in services/<Domain>Service.ts
    6. Import useXyz() in the page/component
```

---

## Pre-merge checklist

- [ ] Every new/changed route has a `schema` with `tags`, applicable `body`/`params`/`querystring`, and a `response` entry for every status code
- [ ] Tag registered in `swagger.plugin.ts` before the route references it
- [ ] New error codes added to `errorcode.ts` — none inlined as magic numbers
- [ ] Route visible with correct full schema in `/api-docs` (not just `200: {}`)
- [ ] `pnpm generate:api` run after every schema change (backend running on port 44300)
- [ ] Nothing hand-edited inside `frontend/src/api/generated/`
- [ ] No hand-written types that duplicate a generated request/response shape
- [ ] Service files have `import '@/api/client'` as the first import
- [ ] Query cache invalidated via generated query-key functions — no hand-written key arrays
- [ ] No `new QueryClient()` outside `components/providers.tsx`
- [ ] Loading states use `<Skeleton />` matching content layout — no `return null` or raw `<p>Loading...</p>`
- [ ] Empty states use `<Empty />` — no inline `<div>No items found</div>`
- [ ] Shared query keys re-exported from the owning service file, not imported directly from `api/generated/` in multiple places
- [ ] All `toast.success` / `toast.error` calls in `services/` — not in pages/components
- [ ] `authClient` results always checked for `.error` before returning from `mutationFn`
- [ ] Pages and components import only from `services/` — no direct `api/generated/` imports
- [ ] No literal API path strings outside the backend route file
