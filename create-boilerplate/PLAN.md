# create-boilerplate — CLI scaffolding tool

## Goal

Stop copy-pasting this repo by hand. `npx create-stackbase my-app` runs an
interactive wizard, then generates a new project directory containing only
the selected pieces of this boilerplate.

## Location

Lives at `create-boilerplate/` inside this monorepo, as its own pnpm
workspace package. It needs `backend/` and `frontend/` as its template
source, so co-locating avoids duplicating files or a git submodule. Can be
extracted to a standalone repo later without rework.

## End-to-end flow

```
npx create-stackbase my-app
   ↓
1. Interactive prompt wizard (@clack/prompts)
2. Copies base skeleton + only the selected feature files into ./my-app
3. Strips code for unselected features (route registrations, imports, config)
4. Writes a fresh package.json, .env.example, README for the generated project
5. Optionally: git init + commit, install dependencies
```

## Prompt wizard — questions

| Step | Question | Options |
|---|---|---|
| 1 | Project name | free text → package.json name + folder name |
| 2 | Package manager | pnpm (default) / npm / yarn |
| 3 | Include backend? | yes/no (frontend-only or backend-only projects possible) |
| 4 | Include frontend? | yes/no |
| 5 | Auth module | Better Auth (full, as-is) / none (strip AuthModule + auth UI) |
| 6 | Roles | free-text comma-separated role list (e.g. `admin, editor, viewer`) + which one is the top/admin role — replaces the hardcoded superadmin/user pair |
| 7 | State management | Redux Toolkit store scaffold / skip (Context + React Query only) |
| 8 | Example domain | include sample CRUD module (route+service+section) as reference / omit |
| 9 | UI extras | Sonner toasts, motion.tsx primitives — always included, no prompt |
| 10 | Scanner/Haptic module | include (Android WebView specific) / omit — niche to this project |
| 11 | Database | see [Database / ORM support](#database--orm-support-phased) below |
| 12 | Git init | yes/no |
| 13 | Install dependencies now | yes/no |

### Roles — dynamic list (revised)

Original spec was a binary "keep superadmin/user or collapse to one role."
Revised: user types a free-text comma-separated list of role names, then
picks which one is the top-level/admin role (the one existing route guards
that currently check `UserRoles.SUPER_ADMIN` should map to).

Generation-time changes needed:
- `backend/src/SharedModule/utils/constants.ts` — `UserRoles` object
  generated from the typed list instead of the hardcoded
  `SUPER_ADMIN`/`USER` pair (e.g. `{ ADMIN: 'admin', EDITOR: 'editor', VIEWER: 'viewer' }`,
  keys upper-snake-cased from the user's labels).
- `backend/src/DatabaseModule/seed/bootstrap.ts` — `SEED_ROLES` generated
  from the same list; `seedAdminUser` bootstraps the designated admin role
  key instead of the literal `'superadmin'` string (currently hardcoded in
  two raw SQL strings — both need templating).
- Frontend roles constant (mirror of backend `UserRoles`, referenced in
  `.claude/rules/auth-role-patterns.md` Rule 4) — generate in lockstep.
- Any route file using `validateUserRole(UserRoles.SUPER_ADMIN)` as an
  example/placeholder needs its literal reference swapped to the generated
  admin key, or left as a `// TODO` if genuinely user-specific route logic.

### Database / ORM support (phased)

Current boilerplate: Postgres + Drizzle, tightly wired — `DatabaseModule`
(schema, connection, seed), `drizzle.config.ts`, and the Better Auth Drizzle
adapter in `BetterAuthConfig.ts` all assume this combination. A full
Postgres/MySQL/SQLite/Mongo × Drizzle/Prisma/Mongoose matrix is out of scope
for one pass — Mongo alone requires a non-relational rewrite of the
users/roles schema, and every combination needs its own Better Auth adapter
wiring. Building in phases:

**Phase 1 (this pass):** Postgres only. ORM choice: Drizzle (current, as-is)
or Prisma (new parallel template). Prompt becomes:
1. Database: Postgres (only option for now)
2. ORM: Drizzle / Prisma

Requires building a parallel `DatabaseModule` template for Prisma —
`schema.prisma` mirroring the existing `roles`/`users`/auth tables,
a Prisma client singleton replacing `connection.ts`, a seed script
equivalent to `bootstrap.ts` using Prisma's client instead of Drizzle
queries, and swapping Better Auth's adapter from `drizzleAdapter` to
`prismaAdapter` in `BetterAuthConfig.ts` for generated Prisma projects.
The manifest gains a `database.orm` axis so `scaffold.ts` picks which
`DatabaseModule` template tree to copy.

**Phase 2 (follow-up):** MySQL / SQLite support, staying on Drizzle first
(same schema-definition style, different dialect + driver), then extend to
Prisma once Phase 1 is validated.

**Phase 3 (follow-up):** MongoDB — schema redesign (no relational
roles/users join), Mongoose adapter, separate Better Auth Mongo adapter.
Biggest lift, tackled last.

## Technical approach

- **File selection**: a manifest (`create-boilerplate/manifest.json`) maps
  feature flags → paths to include/exclude. Keeps the boilerplate source
  itself free of scaffolding-specific clutter.
- **Partial file edits**: a handful of "wiring" files (e.g. `app.ts` route
  registration, `providers.tsx` Redux wrapping) use marker comments like
  `// @cli:if auth` that a simple line-filter strips during generation. Only
  used in wiring files, not sprinkled everywhere.
- **Templating**: plain string substitution for tokens like
  `{{PROJECT_NAME}}` — no templating engine needed.
- **Copy mechanism**: Node's `fs.cp`, then marker-filter pass, then token
  substitution.

## Stack

- TypeScript
- `@clack/prompts` — wizard UI
- `commander` — top-level `npx create-stackbase <name>` arg parsing
- `tsup` — build (already used for backend build, consistent tooling)
- `bin` entry in package.json so `npx create-stackbase` resolves correctly

## Structure (planned)

```
create-boilerplate/
  PLAN.md
  bin/cli.js
  src/
    prompts.ts        # wizard questions
    scaffold.ts        # copy + marker-filter + token substitution
    manifest.ts         # feature-flag -> path mapping, typed
  manifest.json
  package.json
  tsconfig.json
```

## Status

Phase 0 (base CLI: wizard, manifest-driven file selection, marker stripping,
git/install) is implemented and working — see `src/`. Two known base-CLI
gaps (haptic dangling import, AuthContext framing) were fixed by folding
those files into the always-included base set.

Next: implement the roles revision (dynamic list + admin-role pick) and
Phase 1 of database/ORM support (Postgres × Drizzle-or-Prisma), plus drop
the UI-extras prompt (now always-on, no question asked).
