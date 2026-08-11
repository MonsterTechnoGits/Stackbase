import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { writeAiAgentRules } from './aiRules';
import { loadManifest } from './manifest';
import { toRoleConstantName, toRoleKey } from './prompts';
import { writeShadcnMcpConfig } from './shadcnMcp';

import type { WizardAnswers } from './prompts';

const MARKER_START = /@cli:if\s+(\w+)/;
const MARKER_END = /@cli:endif/;

export interface ScaffoldResult {
  targetDir: string;
  copiedPaths: string[];
}

/** Resolve the boilerplate repo root — parent of this package (../ from create-boilerplate/). */
function resolveRepoRoot(): string {
  // dist/scaffold.js -> ../.. ; src/scaffold.ts (ts-node/tsx) -> ../..
  return join(__dirname, '..', '..');
}

function activeFlags(answers: WizardAnswers): Record<string, boolean> {
  return {
    auth: answers.auth,
    roles: answers.roles.length > 0,
    redux: answers.redux,
    exampleDomain: answers.exampleDomain,
    scannerHaptic: answers.scannerHaptic,
    database: answers.database,
  };
}

/** Build the final list of relative (to repo root) paths to copy, based on selected flags. Database paths are handled separately (see copyDatabaseModule) since Prisma is sourced from a different tree. */
function collectPaths(answers: WizardAnswers): string[] {
  const manifest = loadManifest();
  const paths: string[] = [];

  if (answers.includeBackend && manifest.backend) {
    paths.push(...manifest.backend.base, ...manifest.backend.always);
    if (answers.auth && manifest.auth) paths.push(...manifest.auth.backend);
    if (answers.auth && manifest.roles) paths.push(...manifest.roles.backend);
    if (answers.exampleDomain && manifest.exampleDomain)
      paths.push(...manifest.exampleDomain.backend);
    if (answers.database && answers.databaseOrm === 'drizzle' && manifest.database)
      paths.push(...manifest.database.drizzle.backend);
  }

  if (answers.includeFrontend && manifest.frontend) {
    paths.push(...manifest.frontend.base, ...manifest.frontend.always);
    if (answers.auth && manifest.auth) paths.push(...manifest.auth.frontend);
    if (answers.redux && manifest.redux) paths.push(...manifest.redux.frontend);
    if (answers.exampleDomain && manifest.exampleDomain)
      paths.push(...manifest.exampleDomain.frontend);
    if (answers.scannerHaptic && manifest.scannerHaptic)
      paths.push(...manifest.scannerHaptic.frontend);
  }

  return paths;
}

/** Strip `// @cli:if <flag> ... // @cli:endif` blocks whose flag is not active. Keeps blocks for active flags, removing only the marker lines. */
function filterMarkers(content: string, flags: Record<string, boolean>): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let skipping = false;
  let skipFlag: string | null = null;

  for (const line of lines) {
    const startMatch = line.match(MARKER_START);
    const endMatch = MARKER_END.test(line);

    if (!skipping && startMatch) {
      const flag = startMatch[1];
      if (flags[flag] === false) {
        skipping = true;
        skipFlag = flag;
        continue; // drop the marker line itself
      }
      continue; // active flag — drop marker line, keep content
    }

    if (skipping && endMatch) {
      skipping = false;
      skipFlag = null;
      continue;
    }

    if (skipping) continue; // drop content inside an inactive block

    if (!skipping && endMatch) {
      continue; // drop marker line for an active block's endif
    }

    out.push(line);
  }

  void skipFlag;
  return out.join('\n');
}

const MARKER_FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

function applyMarkerFilterToFile(filePath: string, flags: Record<string, boolean>): void {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  if (!MARKER_FILE_EXTENSIONS.has(ext)) return;

  const content = readFileSync(filePath, 'utf-8');
  if (!content.includes('@cli:')) return;

  const filtered = filterMarkers(content, flags);
  writeFileSync(filePath, filtered, 'utf-8');
}

function walkAndFilter(dir: string, flags: Record<string, boolean>): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkAndFilter(full, flags);
    } else {
      applyMarkerFilterToFile(full, flags);
    }
  }
}

function substituteTokens(filePath: string, projectName: string): void {
  if (!filePath.endsWith('package.json')) return;
  const content = readFileSync(filePath, 'utf-8');

  if (content.includes('__PROJECT_NAME__')) {
    writeFileSync(filePath, content.split('__PROJECT_NAME__').join(projectName), 'utf-8');
    return;
  }

  // Rescope @stackbase/backend and @stackbase/frontend package names to the new project.
  const pkg = JSON.parse(content) as Record<string, unknown>;
  if (typeof pkg.name === 'string' && pkg.name.startsWith('@stackbase/')) {
    const suffix = pkg.name.split('/')[1];
    pkg.name = `${projectName}-${suffix}`;
    writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  }
}

function walkAndSubstitute(dir: string, projectName: string): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkAndSubstitute(full, projectName);
    } else {
      substituteTokens(full, projectName);
    }
  }
}

function copyPath(repoRoot: string, relPath: string, targetDir: string): boolean {
  const src = join(repoRoot, relPath);
  if (!existsSync(src)) return false;
  const dest = join(targetDir, relPath);
  mkdirSync(join(dest, '..'), { recursive: true });
  cpSync(src, dest, { recursive: true });
  return true;
}

interface RoleEntry {
  label: string;
  constantName: string;
  roleKey: string;
}

function buildRoleEntries(answers: WizardAnswers): RoleEntry[] {
  return answers.roles.map((label) => ({
    label,
    constantName: toRoleConstantName(label),
    roleKey: toRoleKey(label),
  }));
}

/**
 * Regenerate the `UserRoles` object body (`{ SUPER_ADMIN: 'superadmin', USER: 'user' }`) from
 * the wizard's role list. Matches the literal object the standalone boilerplate ships with, so
 * this only fires a rewrite when the user actually customized the role list.
 */
function rewriteUserRolesConstant(content: string, roles: RoleEntry[]): string {
  const body = roles.map((r) => `  ${r.constantName}: '${r.roleKey}',`).join('\n');
  return content.replace(
    /export const UserRoles = \{[\s\S]*?\} as const;/,
    `export const UserRoles = {\n${body}\n} as const;`,
  );
}

/** Same rewrite for the frontend mirror of `UserRoles`. */
function rewriteFrontendUserRolesConstant(content: string, roles: RoleEntry[]): string {
  return rewriteUserRolesConstant(content, roles);
}

/** Rewrite bootstrap.ts's SEED_ROLES array + the two hardcoded 'superadmin' SQL literals to reference the generated admin role key. */
function rewriteBootstrapRoles(content: string, roles: RoleEntry[], adminRoleKey: string): string {
  const adminEntry = roles.find((r) => r.roleKey === adminRoleKey) ?? roles[0];
  const seedRolesBody = roles
    .map(
      (r) =>
        `  {\n    roleKey: UserRoles.${r.constantName},\n    roleName: '${r.label}',\n    description: '${
          r.roleKey === adminEntry.roleKey
            ? 'Full unrestricted platform access. Manages the platform itself.'
            : `Standard platform ${r.label.toLowerCase()}.`
        }',\n  },`,
    )
    .join('\n');

  let out = content.replace(
    /const SEED_ROLES = \[[\s\S]*?\] as const;/,
    `const SEED_ROLES = [\n${seedRolesBody}\n] as const;`,
  );

  out = out.split(`role_key = 'superadmin'`).join(`role_key = '${adminEntry.roleKey}'`);
  out = out.replace(
    /Default admin created: \$\{email\} \(role: superadmin\)/,
    `Default admin created: \${email} (role: ${adminEntry.roleKey})`,
  );

  return out;
}

/** Apply the roles content-rewrite to the copied constants.ts / bootstrap.ts / frontend mirror, only when the user typed a custom role list. */
function applyRolesRewrite(targetDir: string, answers: WizardAnswers): void {
  const roles = buildRoleEntries(answers);
  const adminRoleKey = answers.adminRoleKey;

  const constantsPath = join(targetDir, 'backend/src/SharedModule/utils/constants.ts');
  if (existsSync(constantsPath)) {
    const content = readFileSync(constantsPath, 'utf-8');
    writeFileSync(constantsPath, rewriteUserRolesConstant(content, roles), 'utf-8');
  }

  const bootstrapPath = join(targetDir, 'backend/src/DatabaseModule/seed/bootstrap.ts');
  if (existsSync(bootstrapPath)) {
    const content = readFileSync(bootstrapPath, 'utf-8');
    writeFileSync(bootstrapPath, rewriteBootstrapRoles(content, roles, adminRoleKey), 'utf-8');
  }

  const prismaSeedPath = join(targetDir, 'backend/src/DatabaseModule/seed/seed.ts');
  if (existsSync(prismaSeedPath)) {
    const content = readFileSync(prismaSeedPath, 'utf-8');
    writeFileSync(prismaSeedPath, rewriteBootstrapRoles(content, roles, adminRoleKey), 'utf-8');
  }

  const frontendRolesPath = join(targetDir, 'frontend/src/lib/constants/roles.ts');
  if (existsSync(frontendRolesPath)) {
    const content = readFileSync(frontendRolesPath, 'utf-8');
    writeFileSync(frontendRolesPath, rewriteFrontendUserRolesConstant(content, roles), 'utf-8');
  }
}

/**
 * Copy the DatabaseModule for the selected ORM. Drizzle copies the existing backend tree
 * (handled by collectPaths/copyPath already). Prisma copies the parallel template tree from
 * create-boilerplate/templates/prisma/ into the same backend/src/DatabaseModule location, and
 * swaps BetterAuthConfig.ts's Drizzle adapter for Prisma's via content rewrite.
 */
function copyPrismaDatabase(repoRoot: string, targetDir: string): void {
  const templateDir = join(repoRoot, 'create-boilerplate', 'templates', 'prisma');
  const destDbModule = join(targetDir, 'backend', 'src', 'DatabaseModule');
  const destPrismaDir = join(targetDir, 'backend', 'prisma');

  mkdirSync(destDbModule, { recursive: true });
  mkdirSync(destPrismaDir, { recursive: true });

  cpSync(join(templateDir, 'schema.prisma'), join(destPrismaDir, 'schema.prisma'));
  cpSync(join(templateDir, 'connection.ts'), join(destDbModule, 'connection.ts'));

  mkdirSync(join(destDbModule, 'seed'), { recursive: true });
  cpSync(join(templateDir, 'seed.ts'), join(destDbModule, 'seed', 'seed.ts'));

  const authConfigPath = join(targetDir, 'backend', 'src', 'AuthModule', 'BetterAuthConfig.ts');
  const prismaAuthConfigPath = join(templateDir, 'BetterAuthConfig.ts');
  if (existsSync(authConfigPath) && existsSync(prismaAuthConfigPath)) {
    cpSync(prismaAuthConfigPath, authConfigPath);
  }

  const bootstrapImportPath = join(targetDir, 'backend', 'src', 'index.ts');
  if (existsSync(bootstrapImportPath)) {
    const content = readFileSync(bootstrapImportPath, 'utf-8');
    writeFileSync(
      bootstrapImportPath,
      content.replace(`@/DatabaseModule/seed/bootstrap`, `@/DatabaseModule/seed/seed`),
      'utf-8',
    );
  }
}

function mergePrismaPackageJson(repoRoot: string, targetDir: string): void {
  const templateDir = join(repoRoot, 'create-boilerplate', 'templates', 'prisma');
  const partialPath = join(templateDir, 'package.json.partial.json');
  const backendPkgPath = join(targetDir, 'backend', 'package.json');
  if (!existsSync(partialPath) || !existsSync(backendPkgPath)) return;

  const partial = JSON.parse(readFileSync(partialPath, 'utf-8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  const pkg = JSON.parse(readFileSync(backendPkgPath, 'utf-8')) as Record<string, unknown> & {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  delete pkg.scripts?.['migration:generate'];
  delete pkg.scripts?.['migration:push'];
  delete pkg.scripts?.['migration:studio'];
  delete pkg.dependencies?.['drizzle-orm'];
  delete pkg.devDependencies?.['drizzle-kit'];

  pkg.dependencies = { ...pkg.dependencies, ...partial.dependencies };
  pkg.devDependencies = { ...pkg.devDependencies, ...partial.devDependencies };
  pkg.scripts = { ...pkg.scripts, ...partial.scripts };

  writeFileSync(backendPkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

function writeRootPackageJson(targetDir: string, answers: WizardAnswers): void {
  const scripts: Record<string, string> = {};
  const filters: string[] = [];
  if (answers.includeBackend) filters.push('backend');
  if (answers.includeFrontend) filters.push('frontend');

  const backendPkg = `${answers.projectName}-backend`;
  const frontendPkg = `${answers.projectName}-frontend`;

  if (answers.includeBackend && answers.includeFrontend) {
    scripts.dev =
      'concurrently --names "BACKEND,FRONTEND" --prefix-colors "blue.bold,magenta.bold" --kill-others-on-fail "pnpm dev:backend" "pnpm dev:frontend"';
    scripts['dev:backend'] = `pnpm --filter ${backendPkg} run dev`;
    scripts['dev:frontend'] = `pnpm --filter ${frontendPkg} run dev`;
    scripts.build = `pnpm --filter ${backendPkg} run build && pnpm --filter ${frontendPkg} run build`;
  } else if (answers.includeBackend) {
    scripts.dev = `pnpm --filter ${backendPkg} run dev`;
    scripts.build = `pnpm --filter ${backendPkg} run build`;
  } else if (answers.includeFrontend) {
    scripts.dev = `pnpm --filter ${frontendPkg} run dev`;
    scripts.build = `pnpm --filter ${frontendPkg} run build`;
  }
  scripts.lint = 'pnpm -r run lint';

  const pkg: Record<string, unknown> = {
    name: answers.projectName,
    version: '1.0.0',
    private: true,
    scripts,
  };
  if (answers.includeBackend && answers.includeFrontend) {
    pkg.devDependencies = { concurrently: '^9.2.1' };
  }

  writeFileSync(join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

  if (answers.packageManager === 'pnpm') {
    const workspacePackages = filters.map((f) => `  - '${f}'`).join('\n');
    writeFileSync(
      join(targetDir, 'pnpm-workspace.yaml'),
      `packages:\n${workspacePackages}\n`,
      'utf-8',
    );
  }
}

function writeReadme(targetDir: string, answers: WizardAnswers): void {
  const included: string[] = [];
  if (answers.includeBackend) included.push('Backend (Fastify 5)');
  if (answers.includeFrontend) included.push('Frontend (Next.js 16 / React 19)');
  if (answers.auth) included.push(`Auth module (Better Auth), roles: ${answers.roles.join(', ')}`);
  if (answers.redux) included.push('Redux Toolkit store scaffold');
  if (answers.exampleDomain) included.push('Example domain module');
  included.push('UI extras (Sonner toasts, motion.tsx)');
  if (answers.scannerHaptic) included.push('Scanner/Haptic module');
  if (answers.database)
    included.push(
      `Database (Postgres + ${answers.databaseOrm === 'prisma' ? 'Prisma' : 'Drizzle'})`,
    );
  if (answers.aiAgentTools.length > 0) {
    const toolLabels: Record<string, string> = {
      claude: 'Claude Code',
      cursor: 'Cursor',
      copilot: 'GitHub Copilot',
      antigravity: 'Antigravity',
    };
    included.push(
      `AI agentic coding rules for: ${answers.aiAgentTools.map((t) => toolLabels[t]).join(', ')}`,
    );
    if (answers.includeFrontend) {
      included.push('shadcn/ui MCP server wired for Claude Code / Cursor / Copilot (VS Code)');
    }
  }

  const lines = [
    `# ${answers.projectName}`,
    '',
    'Generated with `create-stackbase` — Stackbase.',
    '',
    '## Included',
    '',
    ...included.map((i) => `- ${i}`),
    '',
    '## Getting started',
    '',
    '```bash',
    `${answers.packageManager} install`,
    `${answers.packageManager} run dev`,
    '```',
    '',
  ];

  writeFileSync(join(targetDir, 'README.md'), lines.join('\n'), 'utf-8');
}

export function scaffold(answers: WizardAnswers, targetDirOverride?: string): ScaffoldResult {
  const repoRoot = resolveRepoRoot();
  const targetDir = targetDirOverride ?? join(process.cwd(), answers.projectName);

  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    throw new Error(`Target directory "${targetDir}" already exists and is not empty.`);
  }
  mkdirSync(targetDir, { recursive: true });

  const relPaths = collectPaths(answers);
  const copiedPaths: string[] = [];
  for (const relPath of relPaths) {
    if (copyPath(repoRoot, relPath, targetDir)) copiedPaths.push(relPath);
  }

  if (answers.includeBackend && answers.database && answers.databaseOrm === 'prisma') {
    copyPrismaDatabase(repoRoot, targetDir);
    mergePrismaPackageJson(repoRoot, targetDir);
    copiedPaths.push('backend/prisma', 'backend/src/DatabaseModule (prisma)');
  }

  const flags = activeFlags(answers);
  if (answers.includeBackend) walkAndFilter(join(targetDir, 'backend'), flags);
  if (answers.includeFrontend) walkAndFilter(join(targetDir, 'frontend'), flags);

  if (answers.includeBackend) walkAndSubstitute(join(targetDir, 'backend'), answers.projectName);
  if (answers.includeFrontend) walkAndSubstitute(join(targetDir, 'frontend'), answers.projectName);

  if (answers.auth) applyRolesRewrite(targetDir, answers);

  writeRootPackageJson(targetDir, answers);
  writeReadme(targetDir, answers);
  writeAiAgentRules(repoRoot, targetDir, answers);
  writeShadcnMcpConfig(targetDir, answers);

  return { targetDir, copiedPaths };
}
