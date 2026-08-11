# create-stackbase

Interactive CLI that scaffolds a new fullstack project from [Stackbase](https://stackbase.sumandey.com) — a production-ready Fastify 5 + Next.js 16 / React 19 boilerplate. No install needed, run it with `npx`.

```bash
npx create-stackbase my-app
cd my-app
npm install
npm run dev
```

An interactive wizard asks what you need, then generates a project containing only the selected pieces — no dead code, no commented-out routes, no stripping things out by hand afterward.

---

## What you get

- **Backend** — Fastify 5, TypeScript, Drizzle ORM (or Prisma), Better Auth, Postgres, fully schema-typed routes with auto-generated OpenAPI docs
- **Frontend** — Next.js 16 App Router, React 19, TanStack Query, Redux Toolkit, shadcn/ui, Tailwind
- **Auth & roles** — Better Auth wired end-to-end, with a customizable role list (not locked to `admin`/`user`)
- **Typed API client** — backend route schemas generate the frontend's API client automatically; no hand-written fetch calls or duplicated types
- **AI coding assistant rules** — optional architecture guardrails generated for Claude Code, Cursor, GitHub Copilot, and Antigravity, so agentic tools follow your project's conventions instead of guessing

## The wizard

Run `npx create-stackbase [project-name]` and answer a short set of prompts:

| Prompt | Options |
|---|---|
| Package manager | pnpm / npm / yarn |
| Include backend? | yes / no |
| Include frontend? | yes / no |
| Auth module | Better Auth (full) / skip |
| Roles | free-text comma-separated list + pick the admin role |
| State management | Redux Toolkit / skip |
| Database | Postgres + Drizzle / Postgres + Prisma / skip |
| AI coding tools | Claude Code, Cursor, GitHub Copilot, Antigravity (any combination) |
| Git init | yes / no |
| Install dependencies now | yes / no |

At least one of backend/frontend is required. Everything else is optional and shapes exactly what gets copied into your new project.

## Usage

```bash
# scaffold into ./my-app, name prompted if omitted
npx create-stackbase my-app

# or via npm's create shorthand
npm create stackbase@latest my-app
```

## Links

- Full CLI internals, manifest reference, and extension guide: [WIKI.md](https://github.com/MonsterTechnoGits/Stackbase/blob/main/create-boilerplate/WIKI.md)
- Source repository: [github.com/MonsterTechnoGits/Stackbase](https://github.com/MonsterTechnoGits/Stackbase)
- Issues / feature requests: [GitHub Issues](https://github.com/MonsterTechnoGits/Stackbase/issues)

## License

ISC — [Suman Dey](https://sumandey.com)
