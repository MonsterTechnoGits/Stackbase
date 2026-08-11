import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/DatabaseModule/schema/index.ts',
  out: './src/DatabaseModule/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
