import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AiAgentTool, WizardAnswers } from './prompts';

/**
 * Wires the official shadcn MCP server (`npx shadcn@latest mcp`) into each selected AI tool, so
 * the assistant can search/view/install real shadcn registry components instead of hand-rolling
 * or hallucinating them — directly enforces ui-architecture.md Rule 10 (never hand-roll a
 * components/ui/ primitive; install via the CLI).
 *
 * Config shapes verified against https://ui.shadcn.com/docs/mcp (the same output `shadcn mcp
 * init --client <x>` generates):
 *   - Claude Code: .mcp.json           { "mcpServers": { "shadcn": { command, args } } }
 *   - Cursor:      .cursor/mcp.json    { "mcpServers": { "shadcn": { command, args } } }
 *   - VS Code / GitHub Copilot: .vscode/mcp.json  { "servers": { "shadcn": { command, args } } }
 *     (VS Code uses the top-level key "servers", not "mcpServers" — do not conflate the two)
 *
 * Antigravity has no official `--client` target for `shadcn mcp init` (only claude/cursor/vscode/
 * codex exist), so its MCP config shape is unverified. Rather than guess, Antigravity instead
 * gets a plain-markdown fallback rule (see writeAntigravityShadcnFallback) telling the agent to
 * use the shadcn CLI directly — consistent with how its other rules ship (no frontmatter, plain
 * .agents/rules/*.md, per aiRules.ts).
 */
const SHADCN_MCP_SERVER = {
  command: 'npx',
  args: ['shadcn@latest', 'mcp'],
};

function writeJson(filePath: string, content: unknown): void {
  mkdirSync(join(filePath, '..'), { recursive: true });
  writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
}

function writeClaudeMcp(targetDir: string): void {
  const path = join(targetDir, '.mcp.json');
  if (existsSync(path)) return; // never clobber a config the scaffold didn't create
  writeJson(path, { mcpServers: { shadcn: SHADCN_MCP_SERVER } });
}

function writeCursorMcp(targetDir: string): void {
  const path = join(targetDir, '.cursor', 'mcp.json');
  if (existsSync(path)) return;
  writeJson(path, { mcpServers: { shadcn: SHADCN_MCP_SERVER } });
}

function writeVsCodeMcp(targetDir: string): void {
  const path = join(targetDir, '.vscode', 'mcp.json');
  if (existsSync(path)) return;
  writeJson(path, { servers: { shadcn: SHADCN_MCP_SERVER } });
}

/** Plain markdown, no frontmatter — matches the format Antigravity's own rules already use. */
function writeAntigravityShadcnFallback(targetDir: string): void {
  const rulesDir = join(targetDir, '.agents', 'rules');
  const path = join(rulesDir, 'shadcn-cli-usage.md');
  if (existsSync(path)) return;
  mkdirSync(rulesDir, { recursive: true });
  const body = [
    '# shadcn/ui Component Usage',
    '',
    'This project has no shadcn MCP integration configured for Antigravity (no official MCP client target exists for it yet). Follow these rules manually when adding UI primitives:',
    '',
    "- Install every new primitive via the CLI: `npx shadcn@latest add <component>` — never hand-write or copy-paste a component's source.",
    "- Check `components/ui/` first — most primitives (button, input, select, dialog, table, badge, etc.) likely already exist there. Reuse, don't reinstall.",
    "- New variants go through the existing component's `cva` config — do not fork or duplicate a `components/ui/` file.",
    '- Respect the aliases in `components.json` (`@/components/ui`, `@/lib/utils`) — never use relative imports for these.',
    '',
  ].join('\n');
  writeFileSync(path, body, 'utf-8');
}

export function writeShadcnMcpConfig(targetDir: string, answers: WizardAnswers): void {
  if (!answers.includeFrontend) return; // shadcn/ui only applies to the frontend package

  const tools = new Set<AiAgentTool>(answers.aiAgentTools);
  if (tools.size === 0) return;

  if (tools.has('claude')) writeClaudeMcp(targetDir);
  if (tools.has('cursor')) writeCursorMcp(targetDir);
  if (tools.has('copilot')) writeVsCodeMcp(targetDir);
  if (tools.has('antigravity')) writeAntigravityShadcnFallback(targetDir);
}
