import { UserRoles } from '@/SharedModule/utils/constants';

import { auth } from '../../AuthModule/BetterAuthConfig';
import logger from '../../SharedModule/utils/logger';
import { db, pool } from '../connection';

const SEED_ROLES = [
  {
    roleKey: UserRoles.SUPER_ADMIN,
    roleName: 'Super Admin',
    description: 'Full unrestricted platform access. Manages the platform itself.',
  },
  {
    roleKey: UserRoles.USER,
    roleName: 'User',
    description: 'Standard platform user.',
  },
] as const;

export async function runBootstrap(): Promise<void> {
  try {
    logger.info('[Bootstrap] Starting seed check…');
    await seedRoles();
    await seedAdminUser();
    logger.info('[Bootstrap] Seed check complete.');
  } catch (err) {
    logger.error({ err }, '[Bootstrap] Seed failed — server will continue but data may be missing');
  }
}

async function seedRoles(): Promise<void> {
  try {
    for (const r of SEED_ROLES) {
      await db.role.upsert({
        where: { roleKey: r.roleKey },
        update: {},
        create: {
          roleKey: r.roleKey,
          roleName: r.roleName,
          description: r.description,
          status: 'active',
          createdBy: 'system',
          updatedBy: 'system',
        },
      });
    }

    logger.info('[Bootstrap] Roles ready');
  } catch (err) {
    logger.error({ err }, '[Bootstrap] Failed to seed roles');
    throw err;
  }
}

async function seedAdminUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@1234';
  const name = process.env.ADMIN_NAME ?? 'Super Admin';

  try {
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });

    if (existing) {
      await pool.query(
        `UPDATE m_users SET role_id = (SELECT id FROM m_roles WHERE role_key = 'superadmin' LIMIT 1)
         WHERE email = $1 AND role_id IS NULL`,
        [email],
      );
      logger.info(`[Bootstrap] Admin user already exists (${email}) — skipping`);
      return;
    }

    const result = await auth.api.signUpEmail({
      body: { email, password, name },
    });

    if (!result || !result.user) {
      logger.error('[Bootstrap] Better Auth did not return a user — admin creation failed');
      return;
    }

    await pool.query(
      `UPDATE m_users SET role_id = (SELECT id FROM m_roles WHERE role_key = 'superadmin' LIMIT 1)
       WHERE id = $1`,
      [result.user.id],
    );

    logger.info(`[Bootstrap] Default admin created: ${email} (role: superadmin)`);
    logger.warn('[Bootstrap] ⚠  Change the default admin password before going to production!');
  } catch (err) {
    logger.error({ err }, '[Bootstrap] Failed to seed admin user');
    throw err;
  }
}
