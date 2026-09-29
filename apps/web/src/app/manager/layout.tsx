import { requireManager } from '@/lib/auth';
import { ManagerSidebar } from '@/components/manager/sidebar';
import { Topbar } from '@/components/admin/topbar';
import { Toaster } from '@/components/ui/toast';

export const dynamic = 'force-dynamic';

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireManager();

  return (
    <div className="flex min-h-screen bg-paper-sunken">
      <ManagerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={user.email} />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
