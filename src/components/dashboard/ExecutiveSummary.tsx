'use client';

import { useState } from 'react';
import type { DashboardStats, TowerFilter } from '@/lib/dashboard-data';

const TABS = ['1. Executive Summary', '2. Rolling Plan', '3. Factory Performance', '4. Project Comparison'];

export function ExecutiveSummary({
  stats,
  towers,
}: {
  stats: Record<TowerFilter, DashboardStats>;
  towers: { id: string; name: string }[];
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [towerFilter, setTowerFilter] = useState<TowerFilter>('ALL');
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  const s = stats[towerFilter];

  function handleTabClick(index: number) {
    if (index === 0) {
      setActiveTab(0);
      return;
    }
    setComingSoon(TABS[index]);
    window.setTimeout(() => setComingSoon(null), 1600);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f7f8] px-6 py-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">POD Dashboard</h1>
          <p className="text-sm text-gray-500">Production overview across all projects</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setComingSoon('Download Excel');
            window.setTimeout(() => setComingSoon(null), 1600);
          }}
          className="flex items-center gap-1.5 rounded-md border border-[#d4af37] px-3 py-1.5 text-sm font-medium text-[#a9861f] hover:bg-[#d4af37]/10"
        >
          <DownloadIcon /> Download Excel
        </button>
      </div>

      {comingSoon && (
        <div className="mb-4 rounded-md bg-gray-800 px-3 py-2 text-xs text-white/90">
          &ldquo;{comingSoon}&rdquo; is a demo placeholder in this build.
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-5">
        <Field label="SOU">
          <StaticSelect value="All SOUs" />
        </Field>
        <Field label="Project">
          <StaticSelect value="Solis_10082026" />
        </Field>
        <Field label="Tower">
          <select
            value={towerFilter}
            onChange={e => setTowerFilter(e.target.value as TowerFilter)}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700"
          >
            <option value="ALL">All Towers</option>
            {towers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input type="date" disabled className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-400" />
        </Field>
        <Field label="To">
          <input type="date" disabled className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-400" />
        </Field>
      </div>

      <div className="mb-4 flex gap-6 border-b border-gray-200">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabClick(i)}
            className={`border-b-2 pb-2 text-sm font-medium ${
              activeTab === i ? 'border-[#d4af37] text-[#a9861f]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="% Installed" value={`${s.percentInstalled}%`} color="text-[#d4af37]" bg="bg-[#fdf6e3]" />
        <KpiCard label="Total Pods" value={s.totalPods} color="text-orange-500" bg="bg-orange-50" />
        <KpiCard label="Towers" value={towerFilter === 'ALL' ? towers.length : 1} color="text-purple-600" bg="bg-purple-50" />
        <KpiCard label="Forecast" value={s.forecast} color="text-sky-600" bg="bg-sky-50" />
        <KpiCard label="Delivered" value={s.delivered} color="text-teal-600" bg="bg-teal-50" />
        <KpiCard label="Installed" value={s.installed} color="text-indigo-600" bg="bg-indigo-50" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Executive Summary</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          <SummaryStat label="Total Pods" value={s.totalPods} />
          <SummaryStat label="Planned" value={s.planned} />
          <SummaryStat label="Forecast" value={s.forecast} />
          <SummaryStat label="Total Produced" value={s.delivered} />
          <SummaryStat label="Produced Against Planned" value={`${s.percentInstalled}%`} />
          <SummaryStat label="Delivered" value={s.delivered} />
          <SummaryStat label="Installed" value={s.installed} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function StaticSelect({ value }: { value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-500">
      {value}
      <ChevronDown />
    </div>
  );
}

function KpiCard({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className={`rounded-lg border border-gray-200 ${bg} p-3`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-gray-500 uppercase">{label}</div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-gray-400" stroke="currentColor" strokeWidth={2}>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
