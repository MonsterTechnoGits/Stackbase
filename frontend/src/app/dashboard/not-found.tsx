'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MotionFade } from '@/components/motion';

export default function DashboardNotFound() {
  return (
    <MotionFade className="flex flex-1 flex-col items-center justify-center gap-6 py-24">
      <p className="text-muted-foreground text-8xl font-bold">404</p>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground text-sm">This page doesn&apos;t exist or was moved.</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </MotionFade>
  );
}
