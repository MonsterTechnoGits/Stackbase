#!/usr/bin/env node
/**
 * Copies backend/ and frontend/ source (no node_modules/dist/.next) from the
 * monorepo root into create-boilerplate/vendor/, so the published npm package
 * carries its own template source instead of reaching out to sibling folders
 * that only exist inside this monorepo checkout.
 */
const { cpSync, rmSync, existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const repoRoot = join(__dirname, '..', '..');
const packageRoot = join(__dirname, '..');
const vendorDir = join(packageRoot, 'vendor');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.turbo', 'logs', 'out']);
const SKIP_FILES = new Set(['.env', '.env.local', '.env.development', 'tsconfig.tsbuildinfo']);

function copyFiltered(src, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, {
    recursive: true,
    filter: (source) => {
      const base = source.split('/').pop();
      return !SKIP_DIRS.has(base) && !SKIP_FILES.has(base);
    },
  });
}

rmSync(vendorDir, { recursive: true, force: true });
mkdirSync(vendorDir, { recursive: true });

copyFiltered(join(repoRoot, 'backend'), join(vendorDir, 'backend'));
copyFiltered(join(repoRoot, 'frontend'), join(vendorDir, 'frontend'));

// aiRules.ts reads CLAUDE.md + .claude/rules/*.md from repoRoot to emit AI agent rules
// into generated projects — vendor those too so the published package is self-contained.
const claudeMd = join(repoRoot, 'CLAUDE.md');
if (existsSync(claudeMd)) cpSync(claudeMd, join(vendorDir, 'CLAUDE.md'));

const claudeRulesDir = join(repoRoot, '.claude', 'rules');
if (existsSync(claudeRulesDir)) copyFiltered(claudeRulesDir, join(vendorDir, '.claude', 'rules'));

console.log(
  '✔ vendored backend/, frontend/, CLAUDE.md, .claude/rules/ into create-boilerplate/vendor/',
);
