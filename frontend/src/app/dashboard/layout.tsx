import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppToolbar } from '@/components/layout/app-toolbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppToolbar />
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
