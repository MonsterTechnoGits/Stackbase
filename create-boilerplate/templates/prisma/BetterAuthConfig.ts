import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { db } from '@/DatabaseModule/connection';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // Log the reset link — replace with real email delivery (Resend, Nodemailer, etc.)
      // when SMTP is configured. The link is valid for 1 hour by default.
      console.log(`[Password Reset] user=${user.email} url=${url}`);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minute cache
    },
  },
  secret: process.env.BETTER_AUTH_SECRET ?? '',
  baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:44300`,
  basePath: '/api/public/auth',
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000').split(','),
});

export type Auth = typeof auth;
