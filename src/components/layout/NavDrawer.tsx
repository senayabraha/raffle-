import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  PartyPopper,
  Trophy,
  Award,
  Ticket,
  Compass,
  Gamepad2,
  Headphones,
  ChevronRight,
  UserPlus,
  LogIn,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { useDrawer } from "@/lib/drawer";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  {
    to: "/en/tickets",
    icon: Ticket,
    label: "Your Tickets",
    desc: "View and manage your tickets",
    tint: "bg-accent/10 text-accent-soft",
  },
  {
    to: "/en/winnings",
    icon: Award,
    label: "My Winnings",
    desc: "Accept or dispute a prize you've won",
    tint: "bg-amber-500/10 text-amber-300",
  },
  {
    to: "/en/public-raffles/live",
    icon: Compass,
    label: "Discover",
    desc: "Explore exciting events and contests",
    tint: "bg-cyan-500/10 text-cyan-300",
  },
  {
    to: "/en/public-raffles/ended",
    icon: Trophy,
    label: "Winners",
    desc: "See recent winners and results",
    tint: "bg-amber-500/10 text-amber-300",
  },
] as const;

export function NavDrawer() {
  const { isOpen, close } = useDrawer();
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  function go(to: string) {
    close();
    navigate(to);
  }

  async function handleSignOut() {
    close();
    await signOut();
    navigate("/en");
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={close}
            aria-hidden
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-[75%] max-w-[360px] flex-col gap-2.5 overflow-y-auto border-r border-line bg-surface/95 p-3 pb-4 backdrop-blur-xl shadow-soft-lift"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            {/* Host entry — one clear path for anyone who wants to run a raffle */}
            <button
              onClick={() => go("/en/become-a-host")}
              className="flex items-center justify-between rounded-xl border border-accent/20 bg-accent/[0.08] px-3.5 py-2 transition-all duration-300 hover:bg-accent/[0.14]"
            >
              <span className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
                <Sparkles strokeWidth={2} className="h-4 w-4 text-accent-soft" />
                Host a raffle
              </span>
              <ChevronRight strokeWidth={2} className="h-4 w-4 text-ink-subtle" />
            </button>

            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-2xl border border-line bg-accent-gradient p-3.5">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute -bottom-10 left-10 h-20 w-20 rounded-full bg-cyan-300/20 blur-2xl" />
              <PartyPopper strokeWidth={1.75} className="h-5 w-5 text-white/80" />
              <Trophy
                strokeWidth={1.5}
                className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 text-white/25"
              />
              <h2 className="relative mt-1.5 max-w-[65%] text-base font-extrabold tracking-tightest leading-tight text-white">
                Join. Play. Win.
              </h2>
              <p className="relative mt-1 max-w-[65%] text-[12px] leading-snug text-white/80">
                Enter amazing events and stand a chance to win!
              </p>
            </div>

            {/* Sign up / sign in, or account state */}
            {session ? (
              <button
                onClick={handleSignOut}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-2 transition-all duration-300 hover:border-line hover:bg-surface-2"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
                  <LogOut strokeWidth={2} className="h-4 w-4 text-rose-300" />
                  Sign Out
                </span>
                <ChevronRight strokeWidth={2} className="h-4 w-4 text-ink-subtle" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => go("/en/register")}
                  className="flex items-center justify-between gap-1.5 rounded-xl bg-accent-gradient px-3 py-2 text-white shadow-accent-glow transition-all duration-300 hover:brightness-110"
                >
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold">
                    <UserPlus strokeWidth={2} className="h-4 w-4 shrink-0" />
                    Sign Up
                  </span>
                  <ChevronRight strokeWidth={2} className="h-3.5 w-3.5 shrink-0" />
                </button>
                <button
                  onClick={() => go("/en/login")}
                  className="flex items-center justify-between gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-ink transition-all duration-300 hover:border-line hover:bg-surface-2"
                >
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold">
                    <LogIn strokeWidth={2} className="h-4 w-4 shrink-0" />
                    Sign In
                  </span>
                  <ChevronRight strokeWidth={2} className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                </button>
              </div>
            )}

            {/* Nav list */}
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={close}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 transition-all duration-300 hover:border-line hover:bg-surface-2"
                >
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", item.tint)}>
                    <item.icon strokeWidth={1.75} className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-bold tracking-tight leading-tight text-ink">
                      {item.label}
                    </span>
                    <span className="block text-[11px] leading-snug text-ink-subtle">{item.desc}</span>
                  </span>
                  <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md", item.tint)}>
                    <ChevronRight strokeWidth={2} className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}

              {/* Games — no live feature yet, shown as a coming-soon row */}
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 opacity-70">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-300">
                  <Gamepad2 strokeWidth={1.75} className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tracking-tight leading-tight text-ink">
                    Games
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300">
                      Soon
                    </span>
                  </span>
                  <span className="block text-[11px] leading-snug text-ink-subtle">Play fun games and earn rewards</span>
                </span>
              </div>
            </nav>

            {/* Help centre */}
            <Link
              to="/en/support"
              onClick={close}
              className="mt-auto flex items-center gap-2.5 rounded-xl border border-accent/20 bg-accent/[0.08] px-3 py-2 transition-all duration-300 hover:bg-accent/[0.14]"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-gradient text-white shadow-accent-glow">
                <Headphones strokeWidth={1.75} className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-[13px] font-bold tracking-tight leading-tight text-ink">
                  Help Centre
                </span>
                <span className="block text-[11px] leading-snug text-ink-subtle">We're here to help you 24/7</span>
              </span>
              <ChevronRight strokeWidth={2} className="h-3.5 w-3.5 text-ink-subtle" />
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink">
                <MessageSquare strokeWidth={1.75} className="h-3.5 w-3.5" />
              </span>
            </Link>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
