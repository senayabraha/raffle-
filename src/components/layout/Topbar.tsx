import { Link, useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Search, Bell, PlusCircle, LogOut, BellOff, Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { useDashboardDrawer } from "@/lib/dashboardDrawer";

function initialsOf(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function Topbar() {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { open: openDrawer } = useDashboardDrawer();

  const displayName =
    profile?.full_name ?? user?.email?.split("@")[0] ?? "Account";
  const tier = profile?.subscription_tier
    ? `${profile.subscription_tier[0].toUpperCase()}${profile.subscription_tier.slice(1)} host`
    : "Host";

  async function handleSignOut() {
    await signOut();
    navigate("/en");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-obsidian/70 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-5 sm:px-8">
        <button
          onClick={openDrawer}
          aria-label="Open menu"
          className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] lg:hidden"
        >
          <Menu strokeWidth={1.5} className="h-[18px] w-[18px]" />
        </button>

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
          <Link to="/en/dashboard/create" className="hidden sm:inline-flex">
            <Button variant="primary" size="sm">
              <PlusCircle strokeWidth={1.5} className="h-[18px] w-[18px]" />
              New raffle
            </Button>
          </Link>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="focus-ring relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
                <Bell strokeWidth={1.5} className="h-[18px] w-[18px]" />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-obsidian" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={10}
                className="glass-strong z-50 w-72 rounded-xl border border-white/10 p-4 text-sm shadow-glass"
              >
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <BellOff strokeWidth={1.5} className="h-5 w-5 text-zinc-500" />
                  <p className="font-medium text-zinc-200">No notifications yet</p>
                  <p className="text-xs text-zinc-500">
                    We'll let you know about entries, payouts and draws here.
                  </p>
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Profile */}
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-2 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-gradient text-xs font-bold text-white">
              {initialsOf(profile?.full_name, user?.email)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[7rem] truncate text-xs font-semibold capitalize text-white">
                {displayName}
              </span>
              <span className="block text-[10px] text-zinc-500">{tier}</span>
            </span>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="focus-ring ml-0.5 grid h-7 w-7 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-rose-300"
            >
              <LogOut strokeWidth={1.5} className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
