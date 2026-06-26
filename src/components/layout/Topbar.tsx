import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, PlusCircle, LogOut, BellOff, Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { useDashboardDrawer } from "@/lib/dashboardDrawer";
import {
  fetchNotifications,
  markNotificationsRead,
  type AppNotification,
} from "@/lib/raffles";

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchNotifications(user.id).then((rows) => {
      if (active) setNotifications(rows);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);

  function handleOpenChange(open: boolean) {
    if (!open && unreadIds.length > 0) {
      markNotificationsRead(unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    }
  }

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
    <header className="sticky top-0 z-30 border-b border-line bg-app/70 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-5 sm:px-8">
        <button
          onClick={openDrawer}
          aria-label="Open menu"
          className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink transition-all duration-300 hover:border-line hover:bg-surface-2 lg:hidden"
        >
          <Menu strokeWidth={1.5} className="h-[18px] w-[18px]" />
        </button>

        {/* Spacer keeps the actions right-aligned now that search is gone. */}
        <div className="hidden flex-1 md:block" />

        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
          <Link to="/en/dashboard/create" className="hidden sm:inline-flex">
            <Button variant="primary" size="sm">
              <PlusCircle strokeWidth={1.5} className="h-[18px] w-[18px]" />
              New raffle
            </Button>
          </Link>

          <DropdownMenu.Root onOpenChange={handleOpenChange}>
            <DropdownMenu.Trigger asChild>
              <button className="focus-ring relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink transition-all duration-300 hover:border-line hover:bg-surface-2">
                <Bell strokeWidth={1.5} className="h-[18px] w-[18px]" />
                {unreadIds.length > 0 && (
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-app" />
                )}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={10}
                className="glass-strong z-50 w-80 rounded-xl border border-line p-2 text-sm shadow-glass"
              >
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <BellOff strokeWidth={1.5} className="h-5 w-5 text-ink-subtle" />
                    <p className="font-medium text-ink">No notifications yet</p>
                    <p className="text-xs text-ink-subtle">
                      We'll let you know about entries, payouts and draws here.
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-96 space-y-1 overflow-y-auto">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`rounded-lg p-2.5 ${n.readAt ? "" : "bg-surface"}`}
                      >
                        <p className="text-xs font-semibold text-ink">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-ink-subtle">{n.body}</p>}
                        <p className="mt-1 text-[10px] text-ink-subtle">{timeAgo(n.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Profile */}
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-2 transition-all duration-300 hover:border-line hover:bg-surface-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-gradient text-xs font-bold text-white">
              {initialsOf(profile?.full_name, user?.email)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[7rem] truncate text-xs font-semibold capitalize text-ink">
                {displayName}
              </span>
              <span className="block text-[10px] text-ink-subtle">{tier}</span>
            </span>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="focus-ring ml-0.5 grid h-7 w-7 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-rose-300"
            >
              <LogOut strokeWidth={1.5} className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
