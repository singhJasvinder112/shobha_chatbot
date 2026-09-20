import { ChatWidget } from '@/components/ChatWidget';
import { ExecutiveSummary } from '@/components/dashboard/ExecutiveSummary';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { getDashboardStats, getProjectSummary } from '@/lib/dashboard-data';

export default function Page() {
  const stats = getDashboardStats();
  const { towers } = getProjectSummary();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#f7f7f8]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <ExecutiveSummary stats={stats} towers={towers} />
      </div>
      <ChatWidget />
    </div>
  );
}
