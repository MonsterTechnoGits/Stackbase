#!/usr/bin/env node
/**
 * copy-frontend.js
 * Post-build script — copies non-TS assets from backend/src/ → backend/dist/
 * Includes: .md skill files, .sql migrations, .json snapshots, email templates, etc.
 *
 * Run automatically as the last step of `pnpm build` from the repo root.
 */

const { cpSync, mkdirSync, readdirSync, statSync } = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const backendSrc = path.join(root, 'backend', 'src');
const backendDist = path.join(root, 'backend', 'dist');

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.d.ts']);
const SKIP_DIRS = new Set(['migrations']);

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const nonTsFiles = walkDir(backendSrc).filter((f) => !TS_EXTENSIONS.has(path.extname(f)));

let copied = 0;
for (const file of nonTsFiles) {
  const rel = path.relative(backendSrc, file);
  const dest = path.join(backendDist, rel);
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(file, dest);
  copied++;
}

if (copied > 0) {
  console.log(`[post-build] ✔  Copied ${copied} non-TS asset(s) from backend/src → backend/dist`);
} else {
  console.log(`[post-build] ℹ  No non-TS assets found in backend/src`);
}
