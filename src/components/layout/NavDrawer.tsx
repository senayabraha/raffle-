import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  PartyPopper,
  Trophy,
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

type Mode = "hosts" | "entrants";

const navItems = [
  {
    to: "/en/tickets",
    icon: Ticket,
    label: "Your Tickets",
    desc: "View and manage your tickets",
    tint: "bg-accent/10 text-accent-soft",
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
  const [mode, setMode] = useState<Mode>("entrants");

  function go(to: string) {
    close();
    navigate(to);
  }

  function handleHosts() {
    setMode("hosts");
    go(session ? "/en/dashboard" : "/en/host/login");
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
            className="absolute inset-y-0 left-0 flex w-[75%] max-w-[360px] flex-col gap-4 overflow-y-auto border-r border-white/10 bg-obsidian-100/95 p-4 pb-6 backdrop-blur-xl shadow-soft-lift"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            {/* For Hosts / For Entrants toggle */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] p-1.5">
              <button
                onClick={handleHosts}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition-all duration-300",
                  mode === "hosts"
                    ? "bg-accent-gradient text-white shadow-accent-glow"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                <Users strokeWidth={2} className="h-3.5 w-3.5 shrink-0" />
                For Hosts
              </button>
              <button
                onClick={() => setMode("entrants")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition-all duration-300",
                  mode === "entrants"
                    ? "bg-accent-gradient text-white shadow-accent-glow"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                <Users strokeWidth={2} className="h-3.5 w-3.5 shrink-0" />
                For Entrants
              </button>
            </div>

            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-accent-gradient p-5">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute -bottom-10 left-10 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl" />
              <PartyPopper strokeWidth={1.75} className="h-6 w-6 text-white/80" />
              <Trophy
                strokeWidth={1.5}
                className="absolute right-5 top-1/2 h-16 w-16 -translate-y-1/2 text-white/25"
              />
              <h2 className="relative mt-3 max-w-[65%] text-xl font-extrabold tracking-tightest leading-tight text-white">
                Join. Play. Win.
              </h2>
              <p className="relative mt-1.5 max-w-[65%] text-sm leading-snug text-white/80">
                Enter amazing events and stand a chance to win!
              </p>
            </div>

            {/* Sign up / sign in, or account state */}
            {session ? (
              <button
                onClick={handleSignOut}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-white">
                  <LogOut strokeWidth={2} className="h-[18px] w-[18px] text-rose-300" />
                  Sign Out
                </span>
                <ChevronRight strokeWidth={2} className="h-4 w-4 text-zinc-500" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => go("/en/register")}
                  className="flex items-center justify-between gap-1.5 rounded-2xl bg-accent-gradient px-3.5 py-3 text-white shadow-accent-glow transition-all duration-300 hover:brightness-110"
                >
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
                    <UserPlus strokeWidth={2} className="h-[18px] w-[18px] shrink-0" />
                    Sign Up
                  </span>
                  <ChevronRight strokeWidth={2} className="h-4 w-4 shrink-0" />
                </button>
                <button
                  onClick={() => go("/en/login")}
                  className="flex items-center justify-between gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-white transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
                    <LogIn strokeWidth={2} className="h-[18px] w-[18px] shrink-0" />
                    Sign In
                  </span>
                  <ChevronRight strokeWidth={2} className="h-4 w-4 shrink-0 text-zinc-400" />
                </button>
              </div>
            )}

            {/* Nav list */}
            <nav className="flex flex-col gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={close}
                  className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", item.tint)}>
                    <item.icon strokeWidth={1.75} className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-bold tracking-tight leading-tight text-white">
                      {item.label}
                    </span>
                    <span className="block text-[13px] text-zinc-500">{item.desc}</span>
                  </span>
                  <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", item.tint)}>
                    <ChevronRight strokeWidth={2} className="h-4 w-4" />
                  </span>
                </Link>
              ))}

              {/* Games — no live feature yet, shown as a coming-soon row */}
              <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 opacity-70">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300">
                  <Gamepad2 strokeWidth={1.75} className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-[15px] font-bold tracking-tight leading-tight text-white">
                    Games
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                      Soon
                    </span>
                  </span>
                  <span className="block text-[13px] text-zinc-500">Play fun games and earn rewards</span>
                </span>
              </div>
            </nav>

            {/* Help centre */}
            <Link
              to="/en/support"
              onClick={close}
              className="mt-auto flex items-center gap-3.5 rounded-2xl border border-accent/20 bg-accent/[0.08] px-4 py-3.5 transition-all duration-300 hover:bg-accent/[0.14]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-gradient text-white shadow-accent-glow">
                <Headphones strokeWidth={1.75} className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-bold tracking-tight leading-tight text-white">
                  Help Centre
                </span>
                <span className="block text-[13px] text-zinc-500">We're here to help you 24/7</span>
              </span>
              <ChevronRight strokeWidth={2} className="h-4 w-4 text-zinc-500" />
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-300">
                <MessageSquare strokeWidth={1.75} className="h-4 w-4" />
              </span>
            </Link>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
