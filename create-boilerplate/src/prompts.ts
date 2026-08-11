import * as p from '@clack/prompts';
import pc from 'picocolors';

export type PackageManager = 'pnpm' | 'npm' | 'yarn';
export type DatabaseOrm = 'drizzle' | 'prisma';
export type AiAgentTool = 'claude' | 'cursor' | 'copilot' | 'antigravity';

export interface WizardAnswers {
  projectName: string;
  packageManager: PackageManager;
  includeBackend: boolean;
  includeFrontend: boolean;
  auth: boolean;
  roles: string[];
  adminRoleKey: string;
  redux: boolean;
  exampleDomain: boolean;
  scannerHaptic: boolean;
  database: boolean;
  databaseOrm: DatabaseOrm;
  gitInit: boolean;
  installDeps: boolean;
  aiAgentTools: AiAgentTool[];
}

/** Lowercase, no-separator role key matching the existing style (`superadmin`, `user`). */
export function toRoleKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** UPPER_SNAKE_CASE constant name derived from a role label (e.g. "Editor" -> EDITOR). */
export function toRoleConstantName(label: string): string {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function cancelIfRequested<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Cancelled.');
    process.exit(1);
  }
  return value;
}

export async function runWizard(prefilledName?: string): Promise<WizardAnswers> {
  p.intro(pc.bgCyan(pc.black(' Stackbase ')));

  const projectName = cancelIfRequested(
    prefilledName
      ? prefilledName
      : await p.text({
          message: 'Project name',
          placeholder: 'my-app',
          validate: (value) => {
            if (!value) return 'Project name is required';
            if (!/^[a-z0-9-_]+$/i.test(value)) return 'Use letters, numbers, - or _ only';
            return undefined;
          },
        }),
  );

  const packageManager = cancelIfRequested(
    await p.select({
      message: 'Package manager',
      options: [
        { value: 'pnpm', label: 'pnpm', hint: 'default' },
        { value: 'npm', label: 'npm' },
        { value: 'yarn', label: 'yarn' },
      ],
      initialValue: 'pnpm',
    }),
  ) as PackageManager;

  const includeBackend = cancelIfRequested(
    await p.confirm({ message: 'Include backend?', initialValue: true }),
  );

  const includeFrontend = cancelIfRequested(
    await p.confirm({ message: 'Include frontend?', initialValue: true }),
  );

  if (!includeBackend && !includeFrontend) {
    p.cancel('Select at least one of backend / frontend.');
    process.exit(1);
  }

  const auth =
    includeBackend &&
    cancelIfRequested(
      await p.confirm({
        message: 'Auth module — Better Auth (full)?',
        initialValue: true,
      }),
    );

  let roles: string[] = ['Super Admin', 'User'];
  let adminRoleKey = 'superadmin';

  if (auth) {
    const rolesInput = cancelIfRequested(
      await p.text({
        message: 'Roles — comma-separated list',
        placeholder: 'admin, editor, viewer',
        initialValue: 'Super Admin, User',
        validate: (value) => {
          const parsed = value
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean);
          if (parsed.length === 0) return 'At least one role is required';
          return undefined;
        },
      }),
    ) as string;

    roles = rolesInput
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    adminRoleKey = cancelIfRequested(
      await p.select({
        message: 'Which role is the top/admin role?',
        options: roles.map((r) => ({ value: toRoleKey(r), label: r })),
        initialValue: toRoleKey(roles[0]),
      }),
    ) as string;
  }

  const redux =
    includeFrontend &&
    cancelIfRequested(
      await p.confirm({
        message: 'State management — include Redux Toolkit store scaffold?',
        initialValue: true,
      }),
    );

  const exampleDomain = cancelIfRequested(
    await p.confirm({
      message: 'Include example domain (sample CRUD module) as reference?',
      initialValue: false,
    }),
  );

  const scannerHaptic =
    includeFrontend &&
    cancelIfRequested(
      await p.confirm({
        message: 'Scanner/Haptic module (Android WebView specific)?',
        initialValue: false,
      }),
    );

  const database =
    includeBackend &&
    cancelIfRequested(
      await p.confirm({
        message: 'Database — include Postgres schema + seed?',
        initialValue: true,
      }),
    );

  const databaseOrm = database
    ? (cancelIfRequested(
        await p.select({
          message: 'ORM',
          options: [
            { value: 'drizzle', label: 'Drizzle', hint: 'default' },
            { value: 'prisma', label: 'Prisma' },
          ],
          initialValue: 'drizzle',
        }),
      ) as DatabaseOrm)
    : 'drizzle';

  const wantsAiRules = cancelIfRequested(
    await p.confirm({
      message:
        "Add AI agentic coding skills? (ships architecture guardrail rules so Claude Code, Cursor, GitHub Copilot & Antigravity follow this boilerplate's structure instead of hallucinating changes)",
      initialValue: true,
    }),
  );

  let aiAgentTools: AiAgentTool[] = [];
  if (wantsAiRules) {
    aiAgentTools = cancelIfRequested(
      await p.multiselect({
        message:
          'Which AI coding tools should receive the rules? (space to toggle, enter to confirm)',
        options: [
          { value: 'claude', label: 'Claude Code', hint: '.claude/rules + CLAUDE.md' },
          { value: 'cursor', label: 'Cursor', hint: '.cursor/rules/*.mdc' },
          { value: 'copilot', label: 'GitHub Copilot', hint: '.github/copilot-instructions.md' },
          { value: 'antigravity', label: 'Antigravity', hint: '.agents/rules/*.md' },
        ],
        initialValues: [],
        required: true,
      }),
    ) as AiAgentTool[];
  }

  const gitInit = cancelIfRequested(
    await p.confirm({ message: 'Initialize git repo?', initialValue: true }),
  );

  const installDeps = cancelIfRequested(
    await p.confirm({ message: 'Install dependencies now?', initialValue: true }),
  );

  p.outro(pc.green('Wizard complete — generating project...'));

  return {
    projectName: projectName as string,
    packageManager,
    includeBackend: includeBackend as boolean,
    includeFrontend: includeFrontend as boolean,
    auth: auth as boolean,
    roles,
    adminRoleKey,
    redux: redux as boolean,
    exampleDomain: exampleDomain as boolean,
    scannerHaptic: scannerHaptic as boolean,
    database: database as boolean,
    databaseOrm,
    gitInit: gitInit as boolean,
    installDeps: installDeps as boolean,
    aiAgentTools,
  };
}
