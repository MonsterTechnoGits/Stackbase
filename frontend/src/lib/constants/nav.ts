import {
  LayoutDashboardIcon,
  UsersIcon,
  ShieldIcon,
  SettingsIcon,
  FileTextIcon,
  ActivityIcon,
  KeyIcon,
  DatabaseIcon,
} from 'lucide-react';

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboardIcon },
      { title: 'Activity', href: '/dashboard/activity', icon: ActivityIcon },
    ],
  },
  {
    label: 'Management',
    items: [
      { title: 'Users', href: '/dashboard/users', icon: UsersIcon },
      { title: 'Roles & Permissions', href: '/dashboard/roles', icon: ShieldIcon },
      { title: 'API Keys', href: '/dashboard/api-keys', icon: KeyIcon },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Logs', href: '/dashboard/logs', icon: FileTextIcon },
      { title: 'Database', href: '/dashboard/database', icon: DatabaseIcon },
      { title: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
    ],
  },
] as const;
