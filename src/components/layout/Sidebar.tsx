import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Globe,
  Settings,
  LifeBuoy,
  Sparkles,
  Trophy,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMode } from "@/lib/mode";

const primaryNav = [
  { to: "/en/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/en/dashboard/create", label: "Create Raffle", icon: PlusCircle },
  { to: "/en/dashboard/ended", label: "Ended Raffles", icon: Trophy },
];

const secondaryNav = [
  { to: "/en/public-raffles/live", label: "Marketplace", icon: Globe },
  { to: "/en/account", label: "Settings", icon: Settings },
  { to: "/en/support", label: "Support", icon: LifeBuoy },
];

export { primaryNav, secondaryNav };

export function NavItem({
  to,
  label,
  icon: Icon,
  end,
  badge,
}: {
  to: string;
  label: string;
  icon: typeof Ticket;
  end?: boolean;
  badge?: string;
}) {
  return (
    <NavLink
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
          {/* Active accent rail */}
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
          {badge && (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-soft">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { canEnter, setMode, switching } = useMode();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 backdrop-blur-md lg:flex">
      {/* Brand */}
      <Link to="/en/dashboard" className="flex items-center gap-2.5 px-2 pb-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-gradient text-white shadow-accent-glow">
          <Sparkles strokeWidth={2} className="h-[18px] w-[18px]" />
        </span>
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight text-ink">እድል<span className="text-accent">44</span></p>
          <p className="text-[11px] text-ink-subtle">Host Studio</p>
        </div>
      </Link>

      {/* Primary nav */}
      <nav className="flex flex-col gap-1">
        {primaryNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="my-5 h-px divider-faded" />

      <nav className="flex flex-col gap-1">
        {secondaryNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        {/* Mode switch: only an account that can also enter raffles sees this. */}
        {canEnter && (
          <button
            type="button"
            onClick={() => setMode("entrant")}
            disabled={switching}
            className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium tracking-tight text-ink-muted transition-all duration-300 ease-premium hover:bg-surface hover:text-ink disabled:opacity-50"
          >
            <ArrowLeftRight
              strokeWidth={1.5}
              className="h-[18px] w-[18px] shrink-0 text-ink-subtle transition-colors group-hover:text-ink"
            />
            <span className="flex-1 text-left">Switch to entering</span>
          </button>
        )}
      </nav>

      {/* Pricing card */}
      <div className="mt-auto">
        <div className="glass relative overflow-hidden p-4">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/30 blur-2xl" />
          <p className="text-sm font-semibold tracking-tight text-ink">
            Commission, not subscriptions
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            No monthly fees — we only earn when your raffle does.
          </p>
          <Link
            to="/en/pricing"
            className="mt-3 block w-full rounded-lg bg-accent-gradient px-3 py-2 text-center text-xs font-semibold text-white shadow-accent-glow transition-all duration-300 hover:brightness-110 active:scale-[0.97]"
          >
            See pricing
          </Link>
        </div>
      </div>
    </aside>
  );
}
