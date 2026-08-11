// PM2 process config — Scanner Applications (production)
//
// Single process: Fastify serves the API and the statically exported
// Next.js frontend from the same port (no separate Next.js server).
// Runs as the deploy user (never root).
// Deploy path : /home/<user>/ScannerApplications
//   <DEPLOY_DIR>/index.js     — bundled Fastify backend (tsup)
//   <DEPLOY_DIR>/frontend/    — static Next.js export
// Env file    : /home/<user>/ScannerApplications/.env  (written fresh on every deploy)
// Logs        : /home/<user>/ScannerApplications/logs/
//
// Port:
//   44300 — Fastify (API at /api, frontend at /)

const fs = require('fs');
const path = require('path');

const DEPLOY_DIR = process.env.DEPLOY_DIR || '/home/deploy/ScannerApplications/app';
const LOG_DIR = '/home/deploy/ScannerApplications/logs';
const ENV_FILE = '/home/deploy/ScannerApplications/.env';

// Parse the .env file and return an object of key=value pairs.
// PM2's built-in env_file support is unreliable — we load it ourselves.
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .reduce((acc, line) => {
      const idx = line.indexOf('=');
      if (idx === -1) return acc;
      const key = line.slice(0, idx).trim();
      const val = line
        .slice(idx + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      if (key) acc[key] = val;
      return acc;
    }, {});
}

const envVars = loadEnv(ENV_FILE);

module.exports = {
  apps: [
    {
      name: 'scanner-app',
      script: `${DEPLOY_DIR}/index.js`,
      cwd: DEPLOY_DIR,
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        ...envVars,
        NODE_ENV: 'production',
        PORT: 44300,
      },
      out_file: `${LOG_DIR}/app.out.log`,
      error_file: `${LOG_DIR}/app.err.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      restart_delay: 3000,
      wait_ready: true,
      listen_timeout: 15000,
    },
  ],
};
