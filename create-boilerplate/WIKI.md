# create-stackbase — Wiki

Interactive CLI that scaffolds a new project from Stackbase (Fastify 5 + Next.js 16). Lives at `create-boilerplate/` inside this monorepo as its own pnpm workspace package, using `backend/` and `frontend/` as its template source.

- Package name: `create-stackbase`
- Bin: `create-stackbase` → `dist/cli.js`
- Source: [src/cli.ts](src/cli.ts), [src/prompts.ts](src/prompts.ts), [src/scaffold.ts](src/scaffold.ts), [src/aiRules.ts](src/aiRules.ts), [src/shadcnMcp.ts](src/shadcnMcp.ts), [src/manifest.ts](src/manifest.ts)
- Config: [manifest.json](manifest.json)

---

## Table of contents

1. [Quick start](#quick-start)
2. [End-to-end flow](#end-to-end-flow)
3. [Wizard reference](#wizard-reference)
4. [Architecture](#architecture)
5. [The manifest — how file selection works](#the-manifest--how-file-selection-works)
6. [Marker stripping (`@cli:if`)](#marker-stripping-cliif)
7. [Token substitution](#token-substitution)
8. [Roles rewrite](#roles-rewrite)
9. [Database / ORM handling](#database--orm-handling)
10. [AI agent rules generation](#ai-agent-rules-generation)
11. [shadcn/ui MCP config](#shadcnui-mcp-config)
12. [Generated project output](#generated-project-output)
13. [Extending the CLI](#extending-the-cli)
14. [Known gaps / placeholders](#known-gaps--placeholders)

---

## Quick start

```bash
npx create-stackbase my-app
# or, inside this monorepo during development:
pnpm --filter create-stackbase dev my-app
```

This runs the wizard, generates `./my-app`, and (based on your answers) runs `git init` + installs dependencies.

Local development commands (from `create-boilerplate/package.json`):

```bash
pnpm dev          # tsx src/cli.ts — run the CLI from source
pnpm build        # prettier + lint:fix + lint + tsc --noEmit + tsup → dist/cli.js
pnpm lint         # eslint src --ext .ts
pnpm lint:fix
pnpm prettier
```

---

## End-to-end flow

```
npx create-stackbase my-app
   │
   ├─ 1. runWizard()        prompts.ts   — interactive Q&A via @clack/prompts
   ├─ 2. scaffold()         scaffold.ts  — copy selected paths, filter markers,
   │                                        substitute tokens, rewrite roles,
   │                                        write package.json/README, emit AI
   │                                        agent rules + shadcn MCP config
   ├─ 3. git init + commit   (optional, cli.ts)
   └─ 4. install deps        (optional, cli.ts — pnpm/npm/yarn install)
```

Entry point: [src/cli.ts](src/cli.ts). It parses the optional `[project-name]` positional arg via `commander`, calls `runWizard`, then `scaffold`, then handles the two post-scaffold side effects (git, install).

---

## Wizard reference

Defined in [src/prompts.ts](src/prompts.ts) `runWizard()`. Questions run in this order; some are skipped based on earlier answers.

| # | Prompt | Type | Depends on | Notes |
|---|---|---|---|---|
| 1 | Project name | text | — | validated `^[a-z0-9-_]+$/i`; skipped if passed as CLI arg |
| 2 | Package manager | select | — | `pnpm` (default) / `npm` / `yarn` |
| 3 | Include backend? | confirm | — | default `true` |
| 4 | Include frontend? | confirm | — | default `true`; at least one of backend/frontend required |
| 5 | Auth module — Better Auth (full)? | confirm | `includeBackend` | skipped (`false`) if no backend |
| 6 | Roles — comma-separated list | text | `auth` | default `"Super Admin, User"`; only asked if auth enabled |
| 7 | Which role is the top/admin role? | select | `auth` | options built from parsed role list |
| 8 | State management — Redux Toolkit? | confirm | `includeFrontend` | default `true` |
| 9 | Include example domain (sample CRUD)? | confirm | — | default `false` — currently a no-op (see [Known gaps](#known-gaps--placeholders)) |
| 10 | Scanner/Haptic module? | confirm | `includeFrontend` | default `false` — Android WebView specific; currently a no-op flag (haptic lib/hook ship in base regardless) |
| 11 | Database — Postgres schema + seed? | confirm | `includeBackend` | default `true` |
| 12 | ORM | select | `database` | `drizzle` (default) / `prisma` |
| 13 | Add AI agentic coding skills? | confirm | — | default `true` |
| 14 | Which AI coding tools? | multiselect | step 13 | `claude` / `cursor` / `copilot` / `antigravity` — required if step 13 is yes |
| 15 | Initialize git repo? | confirm | — | default `true` |
| 16 | Install dependencies now? | confirm | — | default `true` |

All answers are collected into a single `WizardAnswers` object (see type in [src/prompts.ts:8-24](src/prompts.ts)) and passed to `scaffold()`.

Two helper exports used both by the wizard and by scaffold-time rewrites:
- `toRoleKey(label)` → lowercase, no-separator key (`"Super Admin"` → `"superadmin"`)
- `toRoleConstantName(label)` → `UPPER_SNAKE_CASE` (`"Super Admin"` → `"SUPER_ADMIN"`)

---

## Architecture

```
create-boilerplate/
  manifest.json         feature flag → relative path mapping (source of truth for file selection)
  templates/prisma/      parallel DatabaseModule tree used only when ORM = Prisma
  src/
    cli.ts               commander entry point; wizard → scaffold → git/install
    prompts.ts            wizard Q&A, WizardAnswers type, role helpers
    manifest.ts            loads/types manifest.json
    scaffold.ts            copy engine: path selection, marker filter, token
                            substitution, roles rewrite, Prisma swap,
                            package.json/README generation
    aiRules.ts              emits CLAUDE.md/.claude/.cursor/.github/.agents
                            rules into the generated project per selected tool
    shadcnMcp.ts             writes shadcn/ui MCP server config for generated
                            project's editor tooling
```

`scaffold()` resolves the **repo root** as two directories up from the compiled/`src` file (`create-boilerplate/../..`), since it needs `backend/` and `frontend/` as template sources — this only works because `create-boilerplate/` is co-located inside the monorepo it templates from.

---

## The manifest — how file selection works

[manifest.json](manifest.json) is the single source of truth mapping each feature flag to the repo-relative paths that should be copied when that flag is active. `collectPaths()` in [scaffold.ts](src/scaffold.ts) reads it via `loadManifest()` ([src/manifest.ts](src/manifest.ts)) and builds the final path list:

```
backend.base + backend.always                     always copied if includeBackend
  + auth.backend                                    if auth
  + roles.backend                                    if auth (roles ships with auth)
  + exampleDomain.backend                             if exampleDomain
  + database.drizzle.backend                           if database && ORM=drizzle

frontend.base + frontend.always                    always copied if includeFrontend
  + auth.frontend                                    if auth
  + redux.frontend                                    if redux
  + exampleDomain.frontend                             if exampleDomain
  + scannerHaptic.frontend                              if scannerHaptic
```

Notes baked into the manifest itself:
- `auth.note`: `frontend/src/contexts/AuthContext.tsx` and `services/AuthService.ts` always ship in `frontend.base` regardless of the `auth` flag — `Providers.tsx` wraps `AuthProvider` unconditionally and the dashboard layout/session guards depend on it structurally. The `auth` flag only controls whether sign-in/sign-up UI and the backend `AuthModule` are included.
- `exampleDomain` and `scannerHaptic` currently map to **empty arrays** — no source files exist yet for either; the flags are wired end-to-end (prompt → manifest → aiRules globs) but are no-ops until reference content is added.
- Prisma database paths are **not** in the manifest — see [Database / ORM handling](#database--orm-handling).

Each selected path is copied via `copyPath()` using `fs.cpSync(..., { recursive: true })`, preserving directory structure 1:1 into the target project.

---

## Marker stripping (`@cli:if`)

Some "wiring" files contain both always-needed code and code that only makes sense when a feature is active (e.g. a route registration, a provider wrap). Rather than maintaining separate file variants, these use inline markers:

```ts
// @cli:if auth
fastify.register(authRoutes, { prefix: '/api' });
// @cli:endif
```

`filterMarkers()` in [scaffold.ts](src/scaffold.ts):
- Scans `.ts`/`.tsx`/`.js`/`.jsx` files (only files containing the literal string `@cli:`) after copy
- For each `@cli:if <flag>` block: if `flags[flag] === false`, drops the marker lines **and** everything between them; if the flag is true (or unset in the flags map), keeps the content but still strips the marker comment lines
- Active flags come from `activeFlags(answers)`: `auth`, `roles`, `redux`, `exampleDomain`, `scannerHaptic`, `database`

This runs via `walkAndFilter()`, recursively, over the copied `backend/` and `frontend/` trees — after copy, before token substitution.

---

## Token substitution

`substituteTokens()` / `walkAndSubstitute()` in [scaffold.ts](src/scaffold.ts) operate only on `package.json` files in the copied tree:

1. If the file contains the literal token `__PROJECT_NAME__`, replace every occurrence with the answered project name.
2. Otherwise, if `pkg.name` starts with `@stackbase/` (e.g. `@stackbase/backend`), rescope it to `<project-name>-<suffix>` (e.g. `my-app-backend`). This keeps generated sub-package names in sync with the user's chosen project name without needing a literal token in every template file.

No general templating engine is used — deliberately, per [PLAN.md](PLAN.md).

---

## Roles rewrite

If `auth` is enabled, `applyRolesRewrite()` regenerates every place the boilerplate hardcodes the `superadmin`/`user` role pair, driven by the wizard's free-text role list + chosen admin role:

| File | Rewrite |
|---|---|
| `backend/src/SharedModule/utils/constants.ts` | `UserRoles` object body regenerated from typed roles (`rewriteUserRolesConstant`) |
| `backend/src/DatabaseModule/seed/bootstrap.ts` | `SEED_ROLES` array regenerated + both hardcoded `'superadmin'` SQL literals swapped to the chosen admin role key + the "Default admin created" log line (`rewriteBootstrapRoles`) |
| `backend/src/DatabaseModule/seed/seed.ts` (Prisma) | same `rewriteBootstrapRoles` logic, applied after the Prisma template copy |
| `frontend/src/lib/constants/roles.ts` | frontend mirror rewritten with the identical role body (`rewriteFrontendUserRolesConstant`) |

Each rewrite only touches the file if it exists in the copied output (so, e.g., a frontend-only project skips the backend files silently).

The admin role's seed description is set to `'Full unrestricted platform access. Manages the platform itself.'`; every other role gets `'Standard platform <role label lowercased>.'`.

---

## Database / ORM handling

**Drizzle** (default) is copied normally through the manifest (`database.drizzle.backend` → `backend/src/DatabaseModule`, `backend/drizzle.config.ts`) — no special-casing needed since it's the boilerplate's native ORM.

**Prisma** is handled entirely outside the manifest, via `copyPrismaDatabase()` and `mergePrismaPackageJson()` in [scaffold.ts](src/scaffold.ts), sourcing from [templates/prisma/](templates/prisma/):

1. Copy `templates/prisma/schema.prisma` → `backend/prisma/schema.prisma`
2. Copy `templates/prisma/connection.ts` → `backend/src/DatabaseModule/connection.ts`
3. Copy `templates/prisma/seed.ts` → `backend/src/DatabaseModule/seed/seed.ts`
4. Overwrite `backend/src/AuthModule/BetterAuthConfig.ts` with `templates/prisma/BetterAuthConfig.ts` (swaps the Better Auth Drizzle adapter for the Prisma adapter)
5. Rewrite `backend/src/index.ts`'s bootstrap import from `@/DatabaseModule/seed/bootstrap` → `@/DatabaseModule/seed/seed`
6. Merge `templates/prisma/package.json.partial.json` into `backend/package.json`: strips `drizzle-orm`/`drizzle-kit` and the `migration:*` Drizzle scripts, adds Prisma's dependencies/devDependencies/scripts

This all runs **after** the manifest-driven copy and marker/token passes for the Drizzle path, overwriting what was already copied.

Per [PLAN.md](PLAN.md), this is Phase 1 (Postgres only, Drizzle-or-Prisma). MySQL/SQLite (Phase 2) and MongoDB (Phase 3) are explicitly out of scope for now.

---

## AI agent rules generation

If the wizard's AI-tools step selects any tools, `writeAiAgentRules()` in [src/aiRules.ts](src/aiRules.ts) ships this repo's own architecture guardrails into the generated project, translated per tool's native rules format, so agentic coding assistants don't hallucinate structural changes.

**Source of truth**: this repo's root `CLAUDE.md` + `.claude/rules/*.md`. Each rule has a scoping predicate and glob patterns:

| Rule file | Included when | Globs |
|---|---|---|
| `auth-role-patterns.md` | `includeBackend && auth` | `AuthModule/**`, `**/Routes/**`, `AuthContext.tsx` |
| `api-integration.md` | `includeBackend \|\| includeFrontend` | `**/Routes/**`, `api/**`, `services/**` |
| `ui-architecture.md` | `includeFrontend` | `app/**`, `components/**` |
| `haptic-use.md` | `includeFrontend && scannerHaptic` | `haptic.ts`, `use-haptic.ts`, `components/scanner/**` |

Per selected tool:

| Tool | Output | Format notes |
|---|---|---|
| Claude Code | `CLAUDE.md` + `.claude/rules/*.md` | Native format — copied as-is |
| Cursor | `.cursor/rules/00-architecture.mdc` (always-on) + `.cursor/rules/<slug>.mdc` (glob-scoped) | YAML frontmatter (`description`, `globs`, `alwaysApply`); domain rules run 300-500 lines so only the short architecture overview is `alwaysApply: true` — Cursor caps always-on content around ~200 words |
| GitHub Copilot | `.github/copilot-instructions.md` (repo-wide, always injected) + `.github/instructions/<slug>.instructions.md` (path-scoped via `applyTo`) | Confirmed against VS Code + GitHub docs for the two-layer model |
| Antigravity | `.agents/rules/00-architecture.md` + `.agents/rules/<slug>.md` | Plain Markdown, **no frontmatter** — always-on/manual/model-decision trigger is a per-rule UI setting in Antigravity, not file-encodable |

The architecture summary is passed through `toolAgnosticArchitecture()` first, which strips the Claude-Code-specific title/intro line so non-Claude tools don't see "This file provides guidance to Claude Code" framing.

---

## shadcn/ui MCP config

[src/shadcnMcp.ts](src/shadcnMcp.ts) — `writeShadcnMcpConfig()` wires the shadcn/ui MCP server into the generated project's editor tooling when frontend + at least one AI tool is selected, so Claude Code / Cursor / Copilot (VS Code) get component search/examples out of the box. Called unconditionally at the end of `scaffold()`; it no-ops internally when preconditions aren't met.

---

## Generated project output

After `scaffold()` runs, the target directory contains:

- Selected `backend/` and `frontend/` subtrees (manifest-driven)
- A freshly written root `package.json` (`writeRootPackageJson`) — `dev`/`build`/`lint` scripts wired to whichever of backend/frontend were included, using `concurrently` if both are present
- `pnpm-workspace.yaml` (pnpm only) listing the included workspace packages
- A freshly written `README.md` (`writeReadme`) summarizing what was included and how to get started
- AI agent rule files per selected tool (see above)
- shadcn MCP config (if applicable)

`scaffold()` refuses to run into a non-empty existing directory (`ScaffoldResult` throws before any writes if `targetDir` exists and isn't empty).

---

## Extending the CLI

**Add a new feature flag:**
1. Add the paths to `manifest.json` under a new key (backend/frontend arrays)
2. Add a prompt in `runWizard()` (`prompts.ts`) and a field on `WizardAnswers`
3. Wire the flag into `collectPaths()` and, if it needs marker-stripping, into `activeFlags()` — both in `scaffold.ts`
4. If the feature needs a dedicated AI-rules doc, add a `RuleSource` entry in `aiRules.ts` with an `include` predicate and globs
5. Update `writeReadme()` if the feature should appear in the generated README's "Included" list

**Add a new ORM/database combination:** follow the Prisma pattern — a parallel template tree under `templates/<name>/`, a dedicated copy function in `scaffold.ts`, and a package.json partial-merge if dependencies differ from the default.

**Add a new AI coding tool:** add to the `AiAgentTool` union in `prompts.ts`, add its option to the multiselect, and add a `write<Tool>()` function in `aiRules.ts` following that tool's native rules format — call it from `writeAiAgentRules()`.

---

## Known gaps / placeholders

Per `manifest.json` notes and [PLAN.md](PLAN.md) status:

- **`exampleDomain`** — prompted, wired through manifest/markers, but has zero source files. No-op until a sample CRUD module (route + service + section) is added to the boilerplate as reference content.
- **`scannerHaptic`** — prompted, but the haptic hook/lib now ship in `frontend.base` unconditionally (used generically by `app-sidebar`). No Zebra/DataWedge scanner component exists yet in this boilerplate, so the flag is currently a no-op placeholder.
- **Database matrix** — only Postgres is supported; ORM choice is Drizzle or Prisma. MySQL/SQLite (Phase 2) and MongoDB (Phase 3) are not yet implemented.
