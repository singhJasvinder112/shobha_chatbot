'use client';

import { useState } from 'react';

type NavItem = { label: string; active?: boolean };
type NavSection = { label: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  { label: 'Site Common', items: [{ label: 'Floor Pours' }, { label: 'Structural Tracker' }] },
  {
    label: 'Site POD',
    items: [{ label: 'Data Uploads' }, { label: 'POD Configurator' }, { label: 'Installation' }],
  },
  {
    label: 'Configuration',
    items: [
      { label: 'Floor Clearance' },
      { label: 'POD Demand Planning' },
      { label: 'Platform Configurator' },
      { label: 'POD Installation' },
    ],
  },
  { label: 'Floor Clearance Module', items: [] },
  { label: 'Reports', items: [{ label: 'Site Reports' }, { label: 'POD Delivery Sequence' }] },
  { label: 'Site MEP', items: [] },
  { label: 'POD Factory', items: [] },
  { label: 'MEP Factory', items: [] },
  { label: 'User Management', items: [] },
];

export function Sidebar() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Site Common', 'Site POD']));
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  function toggleSection(label: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function notImplemented(label: string) {
    setComingSoon(label);
    window.setTimeout(() => setComingSoon(null), 1600);
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto bg-[#14151c] text-[#b7b9c6]">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-[#d4af37] text-xs font-bold text-[#14151c]">
          S
        </div>
        <span className="text-sm font-semibold tracking-wide text-white">PRODUCTION TRACKER</span>
      </div>

      <nav className="flex-1 px-2 py-3 text-[13px]">
        <button
          type="button"
          className="mb-1 flex w-full items-center gap-2 rounded-md bg-[#2a2410] px-3 py-2 text-left font-medium text-[#d4af37]"
        >
          <DashboardIcon />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => notImplemented('Projects')}
          className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[#b7b9c6] hover:bg-white/5"
        >
          <ProjectsIcon />
          Projects
        </button>

        {SECTIONS.map(section => {
          const isOpen = openSections.has(section.label);
          return (
            <div key={section.label} className="mt-1">
              <button
                type="button"
                onClick={() => (section.items.length > 0 ? toggleSection(section.label) : notImplemented(section.label))}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-[#8b8da0] uppercase hover:bg-white/5"
              >
                {section.label}
                {section.items.length > 0 && (
                  <ChevronIcon className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                )}
              </button>
              {isOpen && section.items.length > 0 && (
                <div className="ml-2 border-l border-white/10 pl-3">
                  {section.items.map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => notImplemented(item.label)}
                      className="block w-full rounded-md px-3 py-1.5 text-left text-[#b7b9c6] hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {comingSoon && (
        <div className="mx-3 mb-3 rounded-md bg-white/10 px-3 py-2 text-xs text-white/80">
          &ldquo;{comingSoon}&rdquo; is a demo placeholder in this build.
        </div>
      )}
    </aside>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2.5}>
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
