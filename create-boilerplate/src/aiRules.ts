import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AiAgentTool, WizardAnswers } from './prompts';

interface RuleSource {
  /** filename under repo-root .claude/rules/ */
  file: string;
  /** slug used for generated filenames in other tools */
  slug: string;
  /** only include this rule when the flag holds (undefined = always include) */
  include?: (answers: WizardAnswers) => boolean;
  /** glob patterns scoping when this rule is relevant, for tools that support path-scoped rules (Cursor globs, Copilot applyTo) */
  globs: string[];
}

type SelectedRule = { slug: string; body: string; globs: string[] };

const RULE_SOURCES: RuleSource[] = [
  {
    file: 'auth-role-patterns.md',
    slug: 'auth-role-patterns',
    include: (a) => a.includeBackend && a.auth,
    globs: [
      'backend/src/AuthModule/**',
      'backend/src/**/Routes/**',
      'frontend/src/contexts/AuthContext.tsx',
    ],
  },
  {
    file: 'api-integration.md',
    slug: 'api-integration',
    include: (a) => a.includeBackend || a.includeFrontend,
    globs: ['backend/src/**/Routes/**', 'frontend/src/api/**', 'frontend/src/services/**'],
  },
  {
    file: 'ui-architecture.md',
    slug: 'ui-architecture',
    include: (a) => a.includeFrontend,
    globs: ['frontend/src/app/**', 'frontend/src/components/**'],
  },
  {
    file: 'haptic-use.md',
    slug: 'haptic-use',
    include: (a) => a.includeFrontend && a.scannerHaptic,
    globs: [
      'frontend/src/lib/haptic.ts',
      'frontend/src/hooks/use-haptic.ts',
      'frontend/src/components/scanner/**',
    ],
  },
];

function selectedRules(
  repoRoot: string,
  answers: WizardAnswers,
): { slug: string; body: string; globs: string[] }[] {
  const rulesDir = join(repoRoot, '.claude', 'rules');
  return RULE_SOURCES.filter((r) => (r.include ? r.include(answers) : true))
    .map((r) => ({ file: join(rulesDir, r.file), slug: r.slug, globs: r.globs }))
    .filter((r) => existsSync(r.file))
    .map((r) => ({ slug: r.slug, globs: r.globs, body: readFileSync(r.file, 'utf-8').trim() }));
}

function loadArchitectureSummary(repoRoot: string): string {
  const claudeMdPath = join(repoRoot, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) return '';
  return readFileSync(claudeMdPath, 'utf-8').trim();
}

/** Strip the Claude-Code-specific title/intro lines so the shared body reads tool-agnostically. */
function toolAgnosticArchitecture(architecture: string): string {
  return architecture
    .replace(/^# CLAUDE\.md\s*\n+/, '# Project Architecture\n\n')
    .replace(
      /^This file provides guidance to Claude Code \(claude\.ai\/code\) when working with code in this repository\.\s*\n+/m,
      'These are mandatory architecture guardrails for AI coding assistants working in this repository.\n\n',
    );
}

/** Claude Code: native format already — copy root CLAUDE.md + filtered .claude/rules/*.md as-is. */
function writeClaudeCode(
  repoRoot: string,
  targetDir: string,
  answers: WizardAnswers,
  rules: SelectedRule[],
): void {
  const architecture = loadArchitectureSummary(repoRoot);
  if (architecture) {
    writeFileSync(join(targetDir, 'CLAUDE.md'), architecture + '\n', 'utf-8');
  }
  if (rules.length === 0) return;
  const rulesDir = join(targetDir, '.claude', 'rules');
  mkdirSync(rulesDir, { recursive: true });
  for (const rule of rules) {
    const src = join(repoRoot, '.claude', 'rules', `${rule.slug}.md`);
    writeFileSync(join(rulesDir, `${rule.slug}.md`), readFileSync(src, 'utf-8'), 'utf-8');
  }
}

/**
 * Cursor: one .mdc file per rule under .cursor/rules/ (confirmed format: YAML frontmatter with
 * `description`, `globs`, `alwaysApply`). Cursor's own guidance caps `alwaysApply: true` content
 * at roughly 200 words since it's injected into every request — our domain rule files run
 * 300-500 lines, so only the short architecture overview is alwaysApply. The domain-specific
 * rules (auth, api-integration, ui-architecture, haptic) are attached by `globs` instead, so
 * they load only when Cursor is actually working in the relevant path.
 */
function writeCursor(targetDir: string, architecture: string, rules: SelectedRule[]): void {
  const rulesDir = join(targetDir, '.cursor', 'rules');
  mkdirSync(rulesDir, { recursive: true });

  if (architecture) {
    const mdc = [
      '---',
      'description: Project architecture overview — read before making structural changes.',
      'alwaysApply: true',
      '---',
      '',
      architecture,
      '',
    ].join('\n');
    writeFileSync(join(rulesDir, '00-architecture.mdc'), mdc, 'utf-8');
  }

  for (const rule of rules) {
    const mdc = [
      '---',
      `description: Mandatory ${rule.slug.replace(/-/g, ' ')} rules — do not deviate.`,
      `globs: ${JSON.stringify(rule.globs)}`,
      'alwaysApply: false',
      '---',
      '',
      rule.body,
      '',
    ].join('\n');
    writeFileSync(join(rulesDir, `${rule.slug}.mdc`), mdc, 'utf-8');
  }
}

/**
 * GitHub Copilot has two layers (confirmed against code.visualstudio.com/docs/agent-customization
 * and GitHub Docs): `.github/copilot-instructions.md` is repo-wide and always injected into every
 * request, while `.github/instructions/*.instructions.md` files carry an `applyTo` glob in their
 * frontmatter and only load when Copilot is working in matching files. Domain rules (auth,
 * api-integration, ui-architecture, haptic) are large and path-specific, so they go in the
 * path-scoped layer; only the short architecture overview goes in the always-on file — dumping
 * everything into copilot-instructions.md would inject irrelevant rules into every single request.
 */
function writeCopilot(targetDir: string, architecture: string, rules: SelectedRule[]): void {
  const githubDir = join(targetDir, '.github');
  const instructionsDir = join(githubDir, 'instructions');
  mkdirSync(instructionsDir, { recursive: true });

  const alwaysOn: string[] = [
    '# Copilot Instructions',
    '',
    'These are mandatory project architecture rules. They override default Copilot behavior. Do not restructure, rename, or move files/folders outside of what a task explicitly requires — follow the existing patterns exactly.',
    '',
    'Path-specific rules (auth, API integration, UI architecture, haptics) live in `.github/instructions/*.instructions.md` and load automatically when you touch matching files — read the relevant one before editing that area.',
    '',
  ];
  if (architecture) alwaysOn.push(architecture, '');
  writeFileSync(join(githubDir, 'copilot-instructions.md'), alwaysOn.join('\n'), 'utf-8');

  for (const rule of rules) {
    const content = ['---', `applyTo: "${rule.globs.join(',')}"`, '---', '', rule.body, ''].join(
      '\n',
    );
    writeFileSync(join(instructionsDir, `${rule.slug}.instructions.md`), content, 'utf-8');
  }
}

/**
 * Antigravity: workspace rules live in `.agents/rules/` (confirmed against antigravity.google/docs
 * and community examples; `.agent/rules` is the older, still-supported path — we write the current
 * one). Rule files are plain Markdown with NO frontmatter — the always-on / manual / model-decision
 * trigger is a per-rule setting in the Antigravity UI, not something encodable in the file itself.
 * Do not invent YAML keys here; it would render as literal text inside the agent's context.
 */
function writeAntigravity(targetDir: string, architecture: string, rules: SelectedRule[]): void {
  const rulesDir = join(targetDir, '.agents', 'rules');
  mkdirSync(rulesDir, { recursive: true });

  if (architecture) {
    writeFileSync(join(rulesDir, '00-architecture.md'), architecture + '\n', 'utf-8');
  }

  for (const rule of rules) {
    writeFileSync(join(rulesDir, `${rule.slug}.md`), rule.body + '\n', 'utf-8');
  }
}

/**
 * Ship architecture-guardrail rules to every AI coding tool the user selected, so agentic
 * assistants (Claude Code, Cursor, GitHub Copilot, Antigravity) don't hallucinate structural
 * changes in the generated project. Content is sourced once from the boilerplate repo's own
 * root CLAUDE.md + .claude/rules/*.md and re-emitted per tool's native rules format.
 */
export function writeAiAgentRules(
  repoRoot: string,
  targetDir: string,
  answers: WizardAnswers,
): void {
  const tools = new Set<AiAgentTool>(answers.aiAgentTools);
  if (tools.size === 0) return;

  const rules = selectedRules(repoRoot, answers);
  const architecture = toolAgnosticArchitecture(loadArchitectureSummary(repoRoot));

  if (tools.has('claude')) writeClaudeCode(repoRoot, targetDir, answers, rules);
  if (tools.has('cursor')) writeCursor(targetDir, architecture, rules);
  if (tools.has('copilot')) writeCopilot(targetDir, architecture, rules);
  if (tools.has('antigravity')) writeAntigravity(targetDir, architecture, rules);
}
