'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BoxIcon, ChevronsUpDownIcon, LogOutIcon, UserIcon } from 'lucide-react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { IconBox } from '@/components/common/icon-box';
import { NAV_GROUPS } from '@/lib/constants/nav';
import { cn } from '@/lib/utils';
import { useHaptic, HapticFeedbackType } from '@/hooks/use-haptic';
import { useSignOut } from '@/services/AuthService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const { haptic } = useHaptic();
  const signOut = useSignOut();
  const user = session.data?.user;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <IconBox variant="solid" size="sm" className="aspect-square">
                  <BoxIcon className="size-4" />
                </IconBox>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Suman Dey</span>
                  <span className="text-xs">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      onClick={() => haptic(HapticFeedbackType.LIGHT)}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar size="sm">
                    <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? 'User'} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col gap-0.5 text-left leading-none">
                    <span className="truncate font-medium text-sm">{user?.name ?? 'User'}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="top" align="end" sideOffset={4}>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{user?.name ?? 'User'}</span>
                    <span className="text-xs">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild onClick={() => haptic(HapticFeedbackType.LIGHT)}>
                  <Link href="/dashboard/profile">
                    <UserIcon className="size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    haptic(HapticFeedbackType.WARNING);
                    signOut.mutate();
                  }}
                >
                  <LogOutIcon className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
