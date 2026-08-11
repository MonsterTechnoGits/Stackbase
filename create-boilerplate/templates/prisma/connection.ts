import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Raw pg Pool kept alongside Prisma — several call sites (auth.plugin.ts, profile.routes.ts,
// auth.public.routes.ts) run hand-written SQL against m_users/m_roles directly and are ORM-agnostic.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 600_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = new PrismaClient();
export { pool };

export async function checkDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
