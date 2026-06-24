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
    tint: "bg-emerald-50 text-emerald-600",
  },
  {
    to: "/en/public-raffles/live",
    icon: Compass,
    label: "Discover",
    desc: "Explore exciting events and contests",
    tint: "bg-violet-50 text-violet-600",
  },
  {
    to: "/en/public-raffles/ended",
    icon: Trophy,
    label: "Winners",
    desc: "See recent winners and results",
    tint: "bg-amber-50 text-amber-600",
  },
] as const;

const confetti = [
  { className: "left-10 top-6 h-2 w-2 rotate-12 bg-pink-300" },
  { className: "left-24 top-3 h-2 w-3 -rotate-6 bg-emerald-300" },
  { className: "right-24 top-8 h-2 w-2 rotate-45 bg-amber-300" },
  { className: "right-12 top-16 h-2 w-2 -rotate-12 bg-sky-300" },
  { className: "right-32 bottom-6 h-2 w-3 rotate-6 bg-rose-300" },
  { className: "left-16 bottom-4 h-2 w-2 rotate-12 bg-lime-300" },
];

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
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
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
            className="absolute inset-y-0 left-0 flex w-[75%] max-w-[360px] flex-col gap-4 overflow-y-auto bg-[#f6f7f9] p-4 pb-6 shadow-2xl"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            {/* For Hosts / For Entrants toggle */}
            <div className="flex items-center gap-1.5 rounded-full bg-white p-1.5 shadow-sm">
              <button
                onClick={handleHosts}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition-colors",
                  mode === "hosts" ? "bg-emerald-600 text-white" : "text-zinc-600",
                )}
              >
                <Users strokeWidth={2} className="h-3.5 w-3.5 shrink-0" />
                For Hosts
              </button>
              <button
                onClick={() => setMode("entrants")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition-colors",
                  mode === "entrants" ? "bg-emerald-600 text-white" : "text-zinc-600",
                )}
              >
                <Users strokeWidth={2} className="h-3.5 w-3.5 shrink-0" />
                For Entrants
              </button>
            </div>

            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-800 p-5">
              {confetti.map((c, i) => (
                <span key={i} className={cn("absolute rounded-[2px]", c.className)} />
              ))}
              <PartyPopper strokeWidth={1.75} className="h-6 w-6 text-amber-200" />
              <Trophy
                strokeWidth={1.5}
                className="absolute right-5 top-1/2 h-16 w-16 -translate-y-1/2 text-amber-300/90 drop-shadow-lg"
              />
              <h2 className="mt-3 max-w-[65%] text-xl font-extrabold leading-tight text-white">
                Join. Play. Win.
              </h2>
              <p className="mt-1.5 max-w-[65%] text-sm leading-snug text-emerald-50/90">
                Enter amazing events and stand a chance to win!
              </p>
            </div>

            {/* Sign up / sign in, or account state */}
            {session ? (
              <button
                onClick={handleSignOut}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm transition-colors hover:bg-zinc-50"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900">
                  <LogOut strokeWidth={2} className="h-[18px] w-[18px] text-rose-600" />
                  Sign Out
                </span>
                <ChevronRight strokeWidth={2} className="h-4 w-4 text-zinc-400" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => go("/en/register")}
                  className="flex items-center justify-between gap-1.5 rounded-2xl bg-emerald-600 px-3.5 py-3 text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
                    <UserPlus strokeWidth={2} className="h-[18px] w-[18px] shrink-0" />
                    Sign Up
                  </span>
                  <ChevronRight strokeWidth={2} className="h-4 w-4 shrink-0" />
                </button>
                <button
                  onClick={() => go("/en/login")}
                  className="flex items-center justify-between gap-1.5 rounded-2xl bg-white px-3.5 py-3 text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
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
                  className="flex items-center gap-3.5 rounded-2xl bg-white px-4 py-3.5 shadow-sm transition-colors hover:bg-zinc-50"
                >
                  <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", item.tint)}>
                    <item.icon strokeWidth={1.75} className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-bold leading-tight text-zinc-900">
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
              <div className="flex items-center gap-3.5 rounded-2xl bg-white px-4 py-3.5 shadow-sm opacity-70">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
                  <Gamepad2 strokeWidth={1.75} className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-[15px] font-bold leading-tight text-zinc-900">
                    Games
                    <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600">
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
              className="mt-auto flex items-center gap-3.5 rounded-2xl bg-emerald-50 px-4 py-3.5 transition-colors hover:bg-emerald-100/70"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
                <Headphones strokeWidth={1.75} className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-bold leading-tight text-zinc-900">Help Centre</span>
                <span className="block text-[13px] text-zinc-500">We're here to help you 24/7</span>
              </span>
              <ChevronRight strokeWidth={2} className="h-4 w-4 text-zinc-400" />
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-zinc-700 shadow-sm">
                <MessageSquare strokeWidth={1.75} className="h-4 w-4" />
              </span>
            </Link>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
