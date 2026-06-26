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
];

export default function AdminLayout() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-app">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 backdrop-blur-md lg:flex">
        <div className="px-2 pb-6">
          <p className="text-[15px] font-bold tracking-tight text-ink">Raffall</p>
          <p className="text-[11px] text-ink-subtle">Admin panel</p>
        </div>

        <nav className="flex flex-col gap-1">
          {adminNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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

        <button
          onClick={() => signOut()}
          className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <LogOut strokeWidth={1.5} className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
