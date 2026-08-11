import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ResetPasswordView } from '@/sections/auth/reset-password-view';

export const metadata: Metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  );
}
