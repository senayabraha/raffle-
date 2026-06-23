import { Search, Bell, PlusCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-obsidian/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-5 sm:px-8">
        {/* Search */}
        <div className="relative hidden flex-1 max-w-md md:block">
          <Search
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            placeholder="Search raffles, entrants, payouts…"
            className="focus-ring h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-11 pr-16 text-sm text-zinc-200 placeholder:text-zinc-500 transition-colors duration-300 hover:border-white/20 focus:border-accent/50"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
            ⌘K
          </kbd>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
          <Button variant="primary" size="sm" className="hidden sm:inline-flex">
            <PlusCircle strokeWidth={1.5} className="h-[18px] w-[18px]" />
            New raffle
          </Button>

          <button className="focus-ring relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
            <Bell strokeWidth={1.5} className="h-[18px] w-[18px]" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-obsidian" />
          </button>

          {/* Profile */}
          <button className="focus-ring flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-2.5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-gradient text-xs font-bold text-white">
              JM
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-xs font-semibold text-white">Jordan M.</span>
              <span className="block text-[10px] text-zinc-500">Premium host</span>
            </span>
            <ChevronDown strokeWidth={1.5} className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
