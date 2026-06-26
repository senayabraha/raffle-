import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  CreditCard,
  Users,
  ShieldAlert,
  LogOut,
  TrendingUp,
  Image,
  Star,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const adminNav = [
  { to: "/en/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/en/admin/raffles", label: "Raffles", icon: Ticket },
  { to: "/en/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/en/admin/users", label: "Users", icon: Users },
  { to: "/en/admin/disputes", label: "Disputes", icon: ShieldAlert },
  { to: "/en/admin/hosts", label: "Host risk", icon: TrendingUp },
  { to: "/en/admin/hero", label: "Hero Carousel", icon: Image },
  { to: "/en/admin/featured", label: "Featured Raffles", icon: Star },
];

function adminInitials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "A";
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }
  return source[0]!.toUpperCase();
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {adminNav.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium tracking-tight transition-all duration-300 ease-premium",
              isActive
                ? "bg-surface-2 text-ink"
                : "text-ink-muted hover:bg-surface hover:text-ink",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent-gradient transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                )}
              />
              <Icon
                strokeWidth={1.5}
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  isActive ? "text-accent-soft" : "text-ink-subtle group-hover:text-ink",
                )}
              />
              <span className="flex-1">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter({ onSignOut }: { onSignOut: () => void }) {
  const { profile, user } = useAuth();
  const email = profile?.email ?? user?.email ?? null;
  const initials = adminInitials(profile?.full_name ?? null, email);

  return (
    <div className="mt-auto border-t border-line pt-4">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-gradient text-xs font-bold text-white">
          {initials}
        </span>
        <p className="min-w-0 flex-1 truncate text-xs text-ink-subtle">{email ?? "Admin"}</p>
      </div>
      <button
        onClick={onSignOut}
        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <LogOut strokeWidth={1.5} className="h-[18px] w-[18px]" />
        Sign out
      </button>
    </div>
  );
}

export default function AdminLayout() {
  const { signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-app">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 backdrop-blur-md lg:flex">
        <div className="px-2 pb-6">
          <p className="text-[15px] font-bold tracking-tight text-ink">Raffall</p>
          <p className="text-[11px] text-ink-subtle">Admin panel</p>
        </div>
        <SidebarNav />
        <SidebarFooter onSignOut={() => signOut()} />
      </aside>

      {/* Mobile drawer + backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface px-4 py-5 backdrop-blur-md transition-transform duration-300 ease-premium lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2 pb-6">
          <div>
            <p className="text-[15px] font-bold tracking-tight text-ink">Raffall</p>
            <p className="text-[11px] text-ink-subtle">Admin panel</p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <X strokeWidth={1.5} className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav onNavigate={() => setDrawerOpen(false)} />
        <SidebarFooter
          onSignOut={() => {
            setDrawerOpen(false);
            signOut();
          }}
        />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="mb-4 grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-muted hover:text-ink lg:hidden"
        >
          <Menu strokeWidth={1.5} className="h-5 w-5" />
        </button>
        <Outlet />
      </main>
    </div>
  );
}
