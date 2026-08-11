# UI Architecture Rules

These rules are **mandatory** for all frontend work in `frontend/src`. They override default behavior. Follow them exactly — violations are not judgment calls.

---

## STOP — Read this before writing any JSX

Before writing a single line of JSX or HTML, answer these questions in order:

1. **Does `components/ui/` already have a component for this element?**
   - `<button>` → use `Button`
   - `<input>` → use `Input`
   - `<select>` / dropdown → use `Select` or `Combobox`
   - modal / overlay → use `Dialog` or `Sheet`
   - table → use `Table`
   - card / container → use `Card`
   - badge / status chip → use `Badge`
   - loading → use `Skeleton` or `Spinner`
   - empty state → use `Empty`
   - form field wrapper → use `Field`
   - toast / alert → use `Alert` or Sonner via `ToastContext`
   - **If yes → use it. Full stop. Do not hand-roll it.**

2. **Does a feature-level component in `components/` already do this job (>70% overlap)?**
   - **If yes → reuse or extend it. Do not create a duplicate.**

3. **Is the new component needed in more than one place?**
   - **If yes → create it in `components/` (or `components/ui/` if it's a primitive), then import it into the page.**
   - **If no → still create it as a component; pages must not contain inline markup.**

**There is no step 4 where you write raw HTML directly in a page. That step does not exist.**

---

## Rule 1 — Pages are composers only

A page file (`app/**/page.tsx`) must contain **only**:
- Imports
- Data fetching / query hooks
- State that drives which components render
- JSX that composes named components

A page must **never** contain:
- Raw `<button>`, `<input>`, `<form>`, `<table>`, `<select>`, `<textarea>`, `<div>` blocks with inline Tailwind styling
- Business logic or formatting functions (those go in `hooks/` or `lib/`)
- Inline option arrays / enum values (those go in `lib/constants/`)

**Violation example — never do this:**
```tsx
// ❌ raw HTML with styling inline in a page
export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow">
      <button className="bg-blue-500 text-white px-4 py-2 rounded">Submit</button>
    </div>
  );
}
```

**Correct pattern:**
```tsx
// ✅ page composes named components
export default function Page() {
  return <FeatureSection />;
}
```

---

## Rule 2 — Reusable components are style-agnostic

Feature-level components in `components/` must **not** hardcode visual styles. They accept layout props and pass styling decisions to the parent or to `components/ui/` variants.

- No hardcoded `bg-*`, `text-*`, `border-*`, `shadow-*`, `rounded-*`, `font-*` inside a feature component.
- No inline `style={{}}` for colors, fonts, or spacing.
- Layout-only classes (`flex`, `gap-*`, `w-full`, `grid-cols-*`, `p-*` for internal spacing) are fine.
- If a new visual variant is needed, add it as a `variant` prop to the `components/ui/` primitive via `cva` — not as a className passed from outside.

**Exception:** `components/ui/` primitives use `cva` to define variants. Their variant classes live inside the component definition — that is the styling system, not a violation.

---

## Rule 3 — Never modify an existing component without a reason

Before touching an existing component ask: "Can I achieve this by passing different props?"
- If yes → pass props. Do not rewrite the component.
- If a new variant or prop is genuinely needed → extend it minimally (add one `variant` or one optional prop).
- If the component needs a structural rewrite → raise it explicitly before doing it; never silently restructure a shared component.

**Never duplicate** a component. If you find yourself copying a component to make a small change, that is a signal to add a prop, not to copy.

---

## Rule 4 — No file over 500 lines

This is a hard ceiling, not a suggestion. When a file approaches 400 lines, split it:

| What to extract | Where it goes |
|---|---|
| Data fetching + state | `hooks/use<Feature>.ts` |
| Pure rendering section | Co-located `<Feature><Section>.tsx` |
| Helper / formatting functions | `lib/<domain>.utils.ts` |
| Enum / option arrays | `lib/constants/<domain>.ts` |

---

## Rule 5 — Animation via `motion.tsx` only

All animation uses primitives from `components/motion.tsx` (`MotionFade`, `MotionStagger`, `MotionStaggerItem`, `fadeInUp`, `fadeIn`, `scaleIn`).

- Never write a bare `motion.div` with custom `variants`/`animate` inline in a page or feature component.
- If a new pattern is needed in more than one place, add it to `motion.tsx` first.
- Animate only `transform` / `opacity`. Never animate `width`, `height`, `top`, `left`, `margin`.
- Every tappable element: `whileTap={{ scale: 0.96 }}` + spring (`type: "spring", stiffness: 400, damping: 17`) + `whileHover={{ scale: 1.02 }}`.
- Wrap decorative animations with `useReducedMotion()`.

---

## Rule 6 — Enums and option lists live in `lib/constants/`

Never write an array of options or a set of status/role values inline in JSX.

```tsx
// ❌
<Select options={['admin', 'user', 'viewer']} />

// ✅
import { USER_ROLES } from '@/lib/constants/enums';
<Select options={USER_ROLES} />
```

Single source of truth: `lib/constants/<domain>.ts`, exported as `as const` with derived TypeScript types. Every consumer imports from there.

---

## Rule 7 — Sections architecture

`sections/` is the layer between pages (`app/`) and reusable components (`components/`). Every domain feature lives here. Understanding where each piece belongs prevents logic from bleeding into the wrong layer.

### The three-layer split

```
app/**/page.tsx          ← Next.js routing only: metadata, layout composition, session guards
      ↓ imports from
sections/<domain>/       ← All feature UI and local state for one domain
      ↓ imports from
components/ui/           ← Stateless primitives (Button, Card, Table, etc.)
components/              ← Shared feature components used across multiple domains
```

**Layer responsibilities:**

| Layer | Allowed | Not allowed |
|---|---|---|
| `app/**/page.tsx` | `export const metadata`, session/auth guards, importing one section view, layout wrappers (`flex`, `gap-*`) | Inline markup, business logic, data fetching hooks, raw HTML elements |
| `sections/<domain>/` | Data fetching hooks, local state, domain business logic, JSX composing `components/ui/` primitives | Raw HTML elements, inline Tailwind theme classes (`bg-*`, `text-*`), logic shared with another domain |
| `components/ui/` | Stateless primitives with `cva` variants | Domain-specific logic, data fetching, session reads |
| `components/` | Feature components shared across 2+ domains | Single-domain logic that belongs in `sections/` |

### Naming conventions

Section files are named `<domain>-<descriptor>-view.tsx` or `<domain>-<descriptor>.tsx`:

```
sections/
  auth/
    sign-in-view.tsx          ← full-page view, imported directly by the page
    forgot-password-view.tsx
  dashboard/
    dashboard-stats.tsx       ← section component, page composes multiple of these
    dashboard-getting-started.tsx
  profile/
    profile-view.tsx
```

- `*-view.tsx` — the root component a page imports directly; one per page
- `*-<section>.tsx` — a logical sub-section within a domain; a view composes these

### When to split a section into sub-sections

Split when **any** of these are true:
- The view file exceeds **400 lines** (hard ceiling is 500 — split before you hit it)
- A sub-section has its own independent data fetching or local state
- A sub-section is reused in more than one view within the same domain

Split strategy:
```
sections/profile/
  profile-view.tsx              ← imports the sub-sections below
  profile-personal-info.tsx     ← extracted sub-section
  profile-change-password.tsx   ← extracted sub-section
  profile-danger-zone.tsx       ← extracted sub-section
```

Sub-sections stay co-located in the same domain folder — do not move them to `components/` unless they are genuinely used in another domain.

### What goes in `components/` vs `sections/`

```
Used in only 1 domain?  ──► sections/<domain>/
Used in 2+ domains?     ──► components/<name>.tsx  (or components/ui/ if it's a primitive)
```

**Violation examples — never do this:**
```tsx
// ❌ inline markup in a page
export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">...</div>
    </div>
  );
}

// ❌ data fetching directly in a page (goes in the section)
export default function ProfilePage() {
  const { data } = useGetProfile();
  return <div>{data?.name}</div>;
}

// ❌ section component placed in components/ when only one domain uses it
// components/dashboard-stats.tsx  ← wrong location if only dashboard uses it
```

**Correct pattern:**
```tsx
// ✅ page is routing + metadata only
export const metadata: Metadata = { title: 'Profile' };
export default function ProfilePage() {
  return <ProfileView />;   // one import, no logic
}

// ✅ section owns its data fetching and state
// sections/profile/profile-view.tsx
export function ProfileView() {
  const { data, isLoading } = useGetProfile();
  if (isLoading) return <ProfileViewSkeleton />;
  return <ProfilePersonalInfo data={data} />;
}
```

---

## Rule 9 — No prop drilling — state ownership and composition over passing

Prop drilling — threading a value through 2+ intermediate components that don't use it themselves — is a hard violation. It creates invisible coupling, makes refactoring fragile, and signals that state is owned in the wrong place.

### Global client state — use Redux Toolkit

This project uses **Redux Toolkit (RTK)** for client-side global state. This is a boilerplate that will scale into larger projects — RTK provides the predictability, DevTools, and team-scale structure needed as the app grows.

**Why Redux Toolkit over alternatives:**
- Single, predictable store — one source of truth for all global client state, easy to debug across large teams
- Redux DevTools — time-travel debugging, action replay, state snapshots
- `createSlice` eliminates old Redux boilerplate (no hand-written action creators or switch statements)
- RTK Query (optional) integrates with the store if REST caching ever needs to move off React Query
- Industry standard at scale — senior engineers joining the project will know it immediately

**Install (if not already present):**
```bash
pnpm --filter @stackbase/frontend add @reduxjs/toolkit react-redux
```

**Store conventions — `frontend/src/store/`:**
```
store/
  index.ts              ← configureStore, RootState, AppDispatch exports
  hooks.ts              ← typed useAppDispatch / useAppSelector hooks
  slices/
    ui.slice.ts         ← global UI state (modals, sidebars, banners)
    <domain>.slice.ts   ← one slice per domain as the app grows
```

**Slice pattern:**
```ts
// store/slices/ui.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  isScannerOpen: boolean
}

const initialState: UIState = { isScannerOpen: false }

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openScanner: (state) => { state.isScannerOpen = true },
    closeScanner: (state) => { state.isScannerOpen = false },
  },
})

export const { openScanner, closeScanner } = uiSlice.actions
export default uiSlice.reducer
```

**Typed hooks (always use these — never raw `useSelector`/`useDispatch`):**
```ts
// store/hooks.ts
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './index'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
```

**In components:**
```ts
const isScannerOpen = useAppSelector((state) => state.ui.isScannerOpen)
const dispatch = useAppDispatch()
dispatch(openScanner())
```

### Where state lives — decision table

| State type | Correct home | Tool |
|---|---|---|
| Server data (fetched from API) | `services/<Domain>Service.ts` custom hook | React Query (`useQuery` / `useMutation`) |
| Global client UI state shared across distant components | `store/slices/<domain>.slice.ts` | **Redux Toolkit** |
| App-wide singleton state (auth session, theme) | `contexts/<Name>Context.tsx` + exported hook | Context API — already wired, don't replace |
| Form field values and validation | Inside the section/view that owns the form | `react-hook-form` |
| Local toggle / transient UI state (open/closed, show/hide) | The component that renders the toggled element | `useState` — **only if it stays local** |
| Enum / config values shared across components | `lib/constants/<domain>.ts` | `as const` export — not state at all |

**When to reach for Redux vs other tools:**

| Signal | Use |
|---|---|
| State is needed by 2+ unrelated components across different domains | Redux slice |
| State change must be logged, debugged, or replayed via DevTools | Redux slice |
| State is app-wide UI (open modals, active filters, selected rows) | Redux slice |
| State is auth session or theme (already in Context) | Context — do not migrate to Redux |
| State is server data | React Query — never put API responses in Redux |
| State is local to one component | `useState` — do not reach for Redux |

### The three questions before adding any state or prop

1. **Is this server data?** → Use a React Query hook in `services/`. Never lift it into component state.
2. **Is this needed by 2+ sibling or distant components?** → Put it in a context with a named hook. Do not prop-drill through a common ancestor.
3. **Is this purely local toggle state (show/hide, open/closed)?** → `useState` inside the component that owns the UI. Do not lift it unless something else genuinely needs it.

If none of the three applies, reconsider whether state is needed at all — many derived values are just computed from existing data.

### Prop rules

- A prop that is only passed **through** a component (the component never reads it, only forwards it) is prop drilling. Eliminate it.
- Props are for **configuration of a component's own rendering** — not for carrying state across the tree.
- Maximum meaningful prop depth: **1 level**. A section passes props to its direct child components only. Those children do not pass them further down.
- If a child needs data the parent fetched, ask: should the child call the same React Query hook directly? (Answer is almost always yes — React Query deduplicates identical queries automatically.)

### Context rules

- Create a context when shared state is needed by **≥2 components** that do not have a direct parent-child relationship.
- Every context must export a named hook (`useXyz`) — components import the hook, never the raw context object.
- Contexts live in `contexts/<Name>Context.tsx` — never inline a `createContext` call inside a component file.
- Do not create a context for state that only one component uses — that is `useState`.
- Do not create a context for server data — that is React Query.

### `useState` discipline

- `useState` is for **transient, local UI state only**: toggle open/closed, controlled input while typing, animation trigger.
- If a `useState` value is read by anything outside its own component → move it up to a context or into React Query.
- Never lift state "just in case" a parent might need it later. Only lift when a second consumer actually exists.
- Avoid `useEffect` + `useState` pairs that mirror server data into local state — that is a React Query anti-pattern. Use `select` or derived values from the query result instead.

**Violation examples — never do this:**
```tsx
// ❌ prop drilled through an intermediate component
function ParentSection() {
  const [userId, setUserId] = useState('');
  return <MiddleComponent userId={userId} />;  // MiddleComponent doesn't use userId itself
}
function MiddleComponent({ userId }) {
  return <DeepChild userId={userId} />;        // ← prop drilling
}

// ❌ server data duplicated into local state
const { data } = useGetUser();
const [user, setUser] = useState(data);       // ← anti-pattern; stale clone

// ❌ context created for a single consumer
const MyButtonContext = createContext();       // only one component reads it → useState instead

// ❌ state lifted prematurely before a second consumer exists
function Page() {
  const [open, setOpen] = useState(false);    // only used inside <Modal> — lift is premature
  return <Modal open={open} setOpen={setOpen} />;
}
```

**Correct patterns:**
```tsx
// ✅ each sub-section fetches its own data — no prop drilling
function DashboardView() {
  return (
    <>
      <DashboardStats />          {/* calls useGetStats() internally */}
      <DashboardActivity />       {/* calls useGetActivity() internally */}
    </>
  );
}

// ✅ shared UI state in a context with a named hook
const { isOpen, toggle } = useSidebar();    // from SidebarContext

// ✅ local toggle stays local
function FilterSheet() {
  const [open, setOpen] = useState(false);  // only FilterSheet cares
  return <Sheet open={open} onOpenChange={setOpen}>...</Sheet>;
}

// ✅ derived value — no state needed
const isAdmin = session.data?.user?.roleKey === UserRoles.SUPER_ADMIN;  // computed, not stored
```

---

## Rule 10 — `components/ui/` is a closed, approved set — never add to it without explicit approval — never add to it without explicit approval

`components/ui/` contains **core primitive components** (Button, Input, Card, Table, Badge, etc.). These are the design-system foundation. They must not be modified for feature-specific needs, and no new component may be added to this folder without explicit approval.

### What this means in practice

| Situation | Correct action |
|---|---|
| You need a new primitive variant | Add a `variant` prop via `cva` to the **existing** `components/ui/` component — do not create a sibling file |
| You need a new feature-level component | Place it in `components/<feature-name>/` — **never** in `components/ui/` |
| You need a shared sub-component (e.g. a toolbar item) | Place it in `components/toolbar/` (or the relevant feature folder) — **never** in `components/ui/` |
| A `components/ui/` component "almost" does what you need | Pass different props or add one minimal prop — do not copy it, wrap it with overriding styles, or recreate it |

### Component placement hierarchy

New components belong in `components/<domain>/` organized by feature responsibility:

```
components/
  toolbar/          ← toolbar-related shared components
  scanner/          ← scanner-related shared components
  layout/           ← structural layout pieces (sidebar, header, shell)
  <domain>/         ← any other shared feature grouping
```

- Match the folder name to the feature the component serves
- If a component is used across multiple domains, pick the domain it most belongs to — or create a new folder name that describes the abstraction
- Never flatten everything into `components/` root — every new shared component gets its own domain subfolder

### Hard rules

- **Never add a new file to `components/ui/`** without explicit written approval — not even "it's basically a primitive"
- **Never modify a `components/ui/` file** to accommodate a feature-specific edge case — add a prop or variant only; if even that feels wrong, the component belongs outside `ui/`
- **Never override `components/ui/` styles** by wrapping with a `className` that fights the component's own variants — if the visual result is wrong, the variant is wrong, fix the variant inside `ui/`
- **Never copy a `components/ui/` component** and paste it elsewhere to make a slight modification — add a prop

**Violation examples — never do this:**
```
// ❌ new feature component placed in ui/
components/ui/toolbar-search.tsx

// ❌ ui/ component copied and modified
components/ui/big-button.tsx   ← copy of Button with hardcoded size

// ❌ feature component at components/ root with no folder
components/toolbar-search.tsx  ← should be components/toolbar/toolbar-search.tsx
```

**Correct pattern:**
```
// ✅ new shared toolbar component
components/toolbar/toolbar-search.tsx
components/toolbar/toolbar-filter.tsx

// ✅ new shared scanner component
components/scanner/scanner-result-card.tsx

// ✅ new variant needed → extend inside the existing ui/ file
// components/ui/button.tsx — add size: 'xl' to the cva variants
```

---

## Rule 8 — Next.js 16 conventions

- Request interception: `src/proxy.ts`, export named `proxy` — not `middleware.ts`.
- `turbopack.root` in `next.config.*` if you see a workspace root warning — do not delete lockfiles.
- Do not assume Next.js API shapes from memory — check `node_modules/next/dist/docs/` first.

---

## Decision tree — "Where does this code go?"

```
Writing UI code?
│
├─ Is it a primitive element (button, input, card, table, badge, etc.)?
│   └─ Exists in components/ui/?  ──YES──► Use it. Never hand-roll.
│                                  ──NO───► Add it to components/ui/ with cva variants.
│
├─ Is it feature UI for a specific domain (dashboard, profile, auth, etc.)?
│   └─ Used in only 1 domain?  ──► sections/<domain>/<name>.tsx
│      Used in 2+ domains?     ──► components/<name>.tsx
│
├─ Is it a shared feature component (sidebar, toolbar, layout piece)?
│   └──► components/<name>.tsx  (or components/layout/ if it's structural)
│
└─ Does it belong in a page file (app/**/page.tsx)?
    └──► Only: metadata export, session guard, one section view import.
         Nothing else lives in a page file.
```

**In no case does feature markup live inline in a page file.**

---

## Pre-merge checklist

- [ ] No raw HTML interactive elements in page files — every element is a named component import
- [ ] Pages contain only: metadata, session guard, one section view import — no logic, no markup
- [ ] Feature UI for a single domain lives in `sections/<domain>/` — not in `components/` or inline in pages
- [ ] Feature UI used in 2+ domains lives in `components/` — not duplicated per domain
- [ ] Section files split into sub-sections before reaching 500 lines; sub-sections co-located in the same domain folder
- [ ] No feature component contains `bg-*`, `text-*`, `border-*`, `shadow-*`, `rounded-*`, `font-*` hardcoded
- [ ] No inline `style={{}}` for colors / fonts / spacing outside of `components/ui/` cva definitions
- [ ] No prop drilling — no prop passed through an intermediate component that doesn't use it
- [ ] Server data fetched via React Query hooks in `services/` — never put API responses in Redux or `useState`
- [ ] Global cross-domain client UI state lives in `store/slices/<domain>.slice.ts` (Redux Toolkit) — not prop-drilled or duplicated in multiple `useState` calls
- [ ] Components use typed `useAppSelector` / `useAppDispatch` from `store/hooks.ts` — never raw `useSelector` / `useDispatch`
- [ ] Auth session and theme remain in Context (already wired) — not migrated to Redux
- [ ] `useState` used only for local transient UI state — lifted only when a second consumer actually exists
- [ ] No `useEffect` + `useState` pair that shadows React Query data
- [ ] No new file added to `components/ui/` without explicit approval — new components go in `components/<domain>/` with proper folder hierarchy
- [ ] No `components/ui/` file copied, modified for feature-specific use, or had its styles overridden externally
- [ ] No existing component rewritten or duplicated without explicit justification
- [ ] No file over 500 lines
- [ ] All animation via `components/motion.tsx` primitives; only `transform`/`opacity` animated; `prefers-reduced-motion` respected; tappable elements have spring `whileTap`/`whileHover`
- [ ] All enum/option arrays sourced from `lib/constants/` — none inline in JSX
- [ ] Request interception uses `src/proxy.ts` with exported `proxy` function
