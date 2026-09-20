export function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <span>Projects</span>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-800">Solis_10082026</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 text-sm font-medium text-gray-800">
            System Administrator
            <span className="rounded bg-[#d4af37]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#a9861f]">
              ADMIN
            </span>
          </div>
          <div className="text-xs text-gray-400">admin@podtracker.local</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d4af37] text-sm font-semibold text-[#14151c]">
          SA
        </div>
      </div>
    </header>
  );
}
