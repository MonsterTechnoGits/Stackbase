import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as globalSchema from '@/DatabaseModule/schema';

const mergedSchema = {
  ...globalSchema,
};

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

export const db = drizzle(pool, { schema: mergedSchema });
export { pool };

export async function checkDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
