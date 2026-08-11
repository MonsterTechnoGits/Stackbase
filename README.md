# Stackbase

A production-ready fullstack boilerplate — Fastify 5 backend + Next.js 16 / React 19 frontend — with an interactive CLI that scaffolds a new project with exactly the pieces you need.

Built by [Suman Dey](https://sumandey.com).

---

## Quick start — scaffold a new project

The fastest way to use Stackbase is via its CLI. No install needed — `npx` runs it directly:

```bash
npx create-stackbase my-app
cd my-app
npm install
npm run dev
```

This launches an interactive wizard that asks what you need — backend, frontend, auth, roles, Redux, database + ORM (Drizzle or Prisma), AI coding assistant rules (Claude Code, Cursor, Copilot, Antigravity) — and generates a new project containing only what you selected.

You can also pass the project name as an argument and choose your package manager (`pnpm` / `npm` / `yarn`) during the wizard:

```bash
npx create-stackbase my-app
```

or scope the install explicitly:

```bash
npm create stackbase@latest my-app
```

Full CLI internals and wizard reference: [create-boilerplate/WIKI.md](create-boilerplate/WIKI.md).

---

## What you get

- **Backend** — Fastify 5, TypeScript, Drizzle ORM (or Prisma), Better Auth, Postgres, fully schema-typed routes with auto-generated OpenAPI docs
- **Frontend** — Next.js 16 App Router, React 19, TanStack Query, Redux Toolkit, shadcn/ui, Tailwind
- **Auth & roles** — Better Auth wired end-to-end, with a customizable role list (not locked to `admin`/`user`)
- **Typed API client** — backend route schemas generate the frontend's API client automatically; no hand-written fetch calls or duplicated types
- **AI coding assistant rules** — optional generation of architecture guardrails for Claude Code, Cursor, GitHub Copilot, and Antigravity, so agentic tools follow your project's conventions instead of guessing

---

## Working in this monorepo (contributors)

This repo is the source Stackbase itself is built from — the CLI copies from `backend/` and `frontend/` here. If you're contributing to Stackbase (not scaffolding a new project), clone and run it directly:

```bash
git clone https://github.com/MonsterTechnoGits/Stackbase.git
cd Stackbase
pnpm install
pnpm dev
```

**Requirements:** Node ≥ 20, pnpm ≥ 8.

### Common commands

```bash
pnpm dev              # run backend + frontend dev servers concurrently
pnpm generate:openapi # fetch live OpenAPI spec from running backend → openapi.json
pnpm generate:api     # generate:openapi + regenerate frontend/src/api/generated/*
pnpm lint             # lint all workspaces
pnpm prettier         # format all TS/TSX/JSON/MD files
pnpm pre-checks       # full preflight: prettier + lint + build
```

Backend runs on `http://localhost:44300` (Swagger UI at `/api-docs`), frontend on `http://localhost:3000`.

See [CLAUDE.md](CLAUDE.md) for full architecture conventions and [ARCHITECTURE.md](ARCHITECTURE.md) for the repo tree and data flow.

---

## License

ISC
