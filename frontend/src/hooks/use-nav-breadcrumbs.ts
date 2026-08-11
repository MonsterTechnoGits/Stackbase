'use client';

import { usePathname } from 'next/navigation';
import { NAV_GROUPS } from '@/lib/constants/nav';

type Breadcrumb = { label: string; href: string };

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function useNavBreadcrumbs(): Breadcrumb[] {
  const pathname = usePathname();

  // Find the deepest matching nav item
  const match = ALL_NAV_ITEMS.filter((item) => pathname.startsWith(item.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];

  if (!match) {
    return [{ label: 'Home', href: '/dashboard' }];
  }

  if (match.href === '/dashboard') {
    return [{ label: 'Dashboard', href: '/dashboard' }];
  }

  return [
    { label: 'Dashboard', href: '/dashboard' },
    { label: match.title, href: match.href },
  ];
}
