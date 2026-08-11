#!/usr/bin/env node
/**
 * generate-openapi.js
 *
 * Fetches the OpenAPI 3.1 spec from the running Fastify dev server and
 * writes it to <repo-root>/openapi.json.
 *
 * Usage (requires backend dev server to be running on port 44300):
 *   node scripts/generate-openapi.js
 *   pnpm generate:openapi        ← alias in package.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SPEC_URL = process.env.BACKEND_URL
  ? `${process.env.BACKEND_URL}/api-docs/json`
  : 'http://localhost:44300/api-docs/json';

const OUT_FILE = path.resolve(__dirname, '../../openapi.json');

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 1500;

async function fetchWithRetry(url, retriesLeft) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (retriesLeft <= 0) throw err;
    process.stdout.write(`  Waiting for backend (${url}) — ${retriesLeft} retries left…\n`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return fetchWithRetry(url, retriesLeft - 1);
  }
}

async function main() {
  process.stdout.write(`\nFetching OpenAPI spec from ${SPEC_URL}\n`);

  const spec = await fetchWithRetry(SPEC_URL, MAX_RETRIES);

  fs.writeFileSync(OUT_FILE, JSON.stringify(spec, null, 2) + '\n');
  process.stdout.write(`Saved → ${path.relative(process.cwd(), OUT_FILE)}\n\n`);
}

main().catch((err) => {
  process.stderr.write(`\nError: ${err.message}\n`);
  process.stderr.write(
    'Make sure the backend dev server is running (pnpm dev:backend) before generating the spec.\n\n',
  );
  process.exit(1);
});
