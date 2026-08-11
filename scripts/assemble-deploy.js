#!/usr/bin/env node
/**
 * assemble-deploy.js
 * Mirrors the CI "Assemble deploy layout" + "Pack artifact" steps
 * (.github/workflows/deploy.yml) locally, producing the same flat folder
 * PM2 expects on the server:
 *
 *   deploy/index.js                ← bundled backend (backend/dist/index.js)
 *   deploy/frontend/               ← static frontend export (frontend/out)
 *   deploy/ecosystem.config.js     ← ci/pm2/ecosystem.config.js
 *   deploy/production.base         ← ci/env/production.base
 *
 * Run automatically as the last step of `pnpm build` from the repo root.
 */

const { cpSync, mkdirSync, rmSync, existsSync } = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const deployDir = path.join(root, 'deploy');

rmSync(deployDir, { recursive: true, force: true });
mkdirSync(deployDir, { recursive: true });

const backendBundle = path.join(root, 'backend', 'dist', 'index.js');
const frontendOut = path.join(root, 'frontend', 'out');

if (!existsSync(backendBundle)) {
  console.error(
    `[assemble-deploy] ✖  Missing ${path.relative(root, backendBundle)} — run the backend build first`,
  );
  process.exit(1);
}
if (!existsSync(frontendOut)) {
  console.error(
    `[assemble-deploy] ✖  Missing ${path.relative(root, frontendOut)} — run the frontend build first`,
  );
  process.exit(1);
}

cpSync(backendBundle, path.join(deployDir, 'index.js'));
cpSync(frontendOut, path.join(deployDir, 'frontend'), { recursive: true });
cpSync(
  path.join(root, 'ci', 'pm2', 'ecosystem.config.js'),
  path.join(deployDir, 'ecosystem.config.js'),
);
cpSync(path.join(root, 'ci', 'env', 'production.base'), path.join(deployDir, 'production.base'));

console.log(`[assemble-deploy] ✔  Deploy layout assembled at ${path.relative(root, deployDir)}/`);
