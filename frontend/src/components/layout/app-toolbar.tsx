'use client';

import { BellIcon, SearchIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useNavBreadcrumbs } from '@/hooks/use-nav-breadcrumbs';

export function AppToolbar() {
  const breadcrumbs = useNavBreadcrumbs();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-2 h-4" />

      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, idx) =>
            idx < breadcrumbs.length - 1 ? (
              <BreadcrumbItem key={crumb.href}>
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                <BreadcrumbSeparator />
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem key={crumb.href}>
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              </BreadcrumbItem>
            ),
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Search">
          <SearchIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Notifications">
          <BellIcon />
        </Button>
        <ThemeToggle className="size-8" />
      </div>
    </header>
  );
}
