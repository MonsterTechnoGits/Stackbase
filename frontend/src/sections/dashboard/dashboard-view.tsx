'use client';

import { Badge } from '@/components/ui/badge';
import { DashboardStats } from '@/sections/dashboard/dashboard-stats';
import { DashboardGettingStarted } from '@/sections/dashboard/dashboard-getting-started';
import { PageHeader } from '@/components/layout/page-header';

export function DashboardView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Welcome to Stackbase — configure it to get started."
        action={<Badge variant="secondary">stackbase.sumandey.com</Badge>}
      />
      <DashboardStats />
      <DashboardGettingStarted />
    </div>
  );
}
