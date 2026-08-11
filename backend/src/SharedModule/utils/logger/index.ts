import fs from 'node:fs';
import path from 'node:path';

import pino from 'pino';

// ─── Log directory ─────────────────────────────────────────────────────────────

const getISTDate = (): Date => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + istOffset);
};

const getLogDir = (): string => {
  const now = getISTDate();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dir = path.join('logs', `${year}${month}${day}`, 'ServerLogs');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create log directory ${dir}:`, err);
  }
  return dir;
};

// ─── Transport targets ─────────────────────────────────────────────────────────

const logDir = getLogDir();
const isDev = process.env.NODE_ENV !== 'production';
const level = process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'warn');

const targets: pino.TransportTargetOptions[] = [
  // Combined log — all levels
  {
    target: 'pino-roll',
    level,
    options: {
      file: path.join(logDir, 'combined'),
      extension: '.log',
      frequency: 'daily',
      size: '100m',
      limit: { count: 5 },
    },
  },
  // Error log — errors only
  {
    target: 'pino-roll',
    level: 'error',
    options: {
      file: path.join(logDir, 'error'),
      extension: '.log',
      frequency: 'daily',
      size: '100m',
      limit: { count: 5 },
    },
  },
];

// Pretty-print to console in dev
if (isDev) {
  targets.push({
    target: 'pino-pretty',
    level,
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  });
}

// ─── Logger instance ───────────────────────────────────────────────────────────

export const logger = pino(
  {
    level,
    timestamp: () => `,"time":"${getISTDate().toISOString().replace('T', ' ').substring(0, 19)}"`,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },
  pino.transport({ targets }),
);

export default logger;
