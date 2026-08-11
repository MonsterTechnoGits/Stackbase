'use client';

import { ActivityIcon, KeyIcon, ShieldIcon, UsersIcon } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MotionStagger, MotionStaggerItem } from '@/components/motion';

const STAT_CARDS = [
  { title: 'Total Users', value: '—', description: 'Registered accounts', icon: UsersIcon },
  { title: 'Active Roles', value: '—', description: 'Configured roles', icon: ShieldIcon },
  { title: 'API Keys', value: '—', description: 'Issued keys', icon: KeyIcon },
  { title: 'Recent Events', value: '—', description: 'Last 24 hours', icon: ActivityIcon },
] as const;

export function DashboardStats() {
  return (
    <MotionStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STAT_CARDS.map(({ title, value, description, icon: Icon }) => (
        <MotionStaggerItem key={title}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
              <CardDescription>{description}</CardDescription>
            </CardContent>
          </Card>
        </MotionStaggerItem>
      ))}
    </MotionStagger>
  );
}
