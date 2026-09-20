'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearAuth } from '@/lib/auth';

export function TopBar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <span>Projects</span>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-800">Solis_10082026</span>
      </div>
      <div className="relative flex items-center gap-3">
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 text-sm font-medium text-gray-800">
            System Administrator
            <span className="rounded bg-[#d4af37]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#a9861f]">
              ADMIN
            </span>
          </div>
          <div className="text-xs text-gray-400">admin@podtracker.local</div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Account menu"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d4af37] text-sm font-semibold text-[#14151c] transition-transform hover:scale-105"
        >
          SA
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute top-full right-0 z-50 mt-2 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
