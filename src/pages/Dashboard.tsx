import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldCheck,
  Sparkles,
  Clock,
  Trophy,
  Ticket,
  Zap,
  Percent,
  FileText,
  ArrowRight,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { LiveRaffles } from "@/components/dashboard/LiveRaffles";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { useAuth } from "@/lib/auth";
import {
  fetchHostOverview,
  type HostOverview,
  type HostRaffleSummary,
} from "@/lib/raffles";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] },
  }),
};

const todayLabel = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<HostOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchHostOverview(user.id).then((d) => {
      if (!active) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ??
    user?.email?.split("@")[0] ??
    "there";

  const drafts = (data?.raffles ?? []).filter((r) => r.status === "draft");
  const totals = data?.totals;
  const salesSeries = data?.salesSeries ?? new Array(14).fill(0);
  const hasSales = salesSeries.some((v) => v > 0);
  // Brand-new host: loaded, but no raffles yet. Show a focused first-run
  // panel instead of a grid of empty stat cards.
  const isFirstRun = !loading && (data?.raffles.length ?? 0) === 0;

  const stats = [
    {
      key: "revenue",
      label: "Escrowed Revenue",
      value: totals?.revenue ?? 0,
      prefix: "ETB ",
      icon: Trophy,
      decimals: 0,
    },
    {
      key: "tickets",
      label: "Tickets Sold",
      value: totals?.ticketsSold ?? 0,
      icon: Ticket,
      decimals: 0,
    },
    {
      key: "live",
      label: "Live Raffles",
      value: totals?.liveCount ?? 0,
      icon: Zap,
      decimals: 0,
    },
    {
      key: "sell",
      label: "Avg. Sell-through",
      value: totals?.sellThrough ?? 0,
      suffix: "%",
      icon: Percent,
      decimals: 1,
    },
  ];

  return (
    <AppShell>
      {/* Resume unfinished drafts */}
      {!loading && drafts.length > 0 && <ResumeDraftsBanner drafts={drafts} />}

      {/* Greeting header */}
      <motion.div
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="accent" dot>
              Live now
            </Badge>
            <span className="text-xs text-ink-subtle">{todayLabel}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tightest text-ink sm:text-[2.5rem] sm:leading-[1.05]">
            Welcome back,{" "}
            <span className="text-gradient capitalize">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-ink-muted">
            {loading
              ? "Loading your latest numbers…"
              : totals && totals.ticketsSold > 0
                ? `You've sold ${totals.ticketsSold.toLocaleString()} tickets across ${data?.raffles.length} ${data?.raffles.length === 1 ? "raffle" : "raffles"}.`
                : "Create your first raffle to start selling tickets and tracking sales."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-muted">
            <Clock strokeWidth={1.5} className="h-[18px] w-[18px]" />
            Last 14 days
          </span>
          <Link to="/en/dashboard/create">
            <Button variant="primary" size="md">
              <Sparkles strokeWidth={1.5} className="h-[18px] w-[18px]" />
              Create raffle
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ---- First-run onboarding ---- */}
      {isFirstRun && (
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
          <div className="glass-strong relative overflow-hidden rounded-2xl p-8 sm:p-10">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/25 blur-3xl" />
            <div className="relative max-w-lg">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
                <Sparkles strokeWidth={1.75} className="h-6 w-6 text-white" />
              </span>
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink">
                Create your first raffle
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                You don't have any raffles yet. Set a prize, choose how the draw
                ends, and publish — your sales, entrants and escrow will all show
                up here once tickets start moving.
              </p>
              <div className="mt-6">
                <Link to="/en/dashboard/create">
                  <Button variant="primary" size="lg">
                    <Sparkles strokeWidth={1.5} className="h-[18px] w-[18px]" />
                    Create your first raffle
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ---- Bento grid ---- */}
      {!isFirstRun && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Row 1 — stat cards */}
        {stats.map((s, i) => (
          <motion.div
            key={s.key}
            custom={i + 1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <StatCard
              label={s.label}
              value={s.value}
              prefix={s.prefix}
              suffix={s.suffix}
              delta={0}
              icon={s.icon}
              series={salesSeries}
              decimals={s.decimals}
            />
          </motion.div>
        ))}

        {/* Row 2 — sales chart (wide) */}
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="sm:col-span-2 xl:col-span-3"
        >
          <SpotlightCard className="h-full p-6" lift={false}>
            <CardHeader
              title="Ticket sales"
              subtitle="Daily volume across all your raffles"
            />
            {hasSales ? (
              <>
                <SalesChart series={salesSeries} />
                <div className="mt-3 text-right text-[10px] text-ink-subtle">
                  Last 14 days
                </div>
              </>
            ) : (
              <div className="flex h-44 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-medium text-ink">
                  No sales in the last 14 days
                </p>
                <p className="max-w-xs text-xs text-ink-subtle">
                  Ticket sales will chart here once entrants start joining your
                  raffles.
                </p>
              </div>
            )}
          </SpotlightCard>
        </motion.div>

        {/* Guarantee / escrow card */}
        <motion.div
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="sm:col-span-2 xl:col-span-1"
        >
          <div className="glass-strong relative h-full overflow-hidden p-6">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/25 blur-3xl" />
            <div className="relative">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
                <ShieldCheck strokeWidth={1.75} className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-ink">
                እድል<span className="text-accent">44</span> Guarantee
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                You have 7 days after a draw to confirm prize delivery. Miss
                the window and the guarantee pays the winner 75% of gross
                revenue — you forfeit the rest.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-ring" />
                All systems operational
              </div>
            </div>
          </div>
        </motion.div>

        {/* Row 3 — live raffles (wide) + activity feed */}
        <motion.div
          custom={7}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="sm:col-span-2 xl:col-span-2"
        >
          <SpotlightCard className="h-full p-6" lift={false}>
            <CardHeader
              title="Your raffles"
              subtitle="Real-time sales & escrow"
              action={
                <Link to="/en/dashboard/create">
                  <Button variant="ghost" size="sm">
                    New raffle
                  </Button>
                </Link>
              }
            />
            <LiveRaffles raffles={data?.raffles ?? []} />
          </SpotlightCard>
        </motion.div>

        <motion.div
          custom={8}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="sm:col-span-2 xl:col-span-2"
        >
          <SpotlightCard className="h-full p-6" lift={false}>
            <CardHeader
              title="Live activity"
              subtitle="Entries as they happen"
              action={<Badge tone="live" dot>Live</Badge>}
            />
            <ActivityFeed items={data?.activity ?? []} />
          </SpotlightCard>
        </motion.div>
      </div>
      )}
    </AppShell>
  );
}

/**
 * Top-of-dashboard nudge to finish draft raffles. With a single draft, "Resume"
 * jumps straight back into the wizard at the saved step; with several, it expands
 * an inline picker. Dismissal is session-only — it reappears next visit if drafts
 * remain.
 */
function ResumeDraftsBanner({ drafts }: { drafts: HostRaffleSummary[] }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  const count = drafts.length;
  const resumePath = (d: HostRaffleSummary) =>
    `/en/dashboard/create/${d.id}?step=${d.currentStep}`;

  function handleResume() {
    if (count === 1) {
      navigate(resumePath(drafts[0]));
    } else {
      setExpanded((v) => !v);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 overflow-hidden rounded-2xl border border-accent/30 bg-accent/[0.08]"
    >
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/15 text-accent-soft">
          <FileText strokeWidth={1.75} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            You have {count} unfinished {count === 1 ? "raffle" : "raffles"}
          </p>
          <p className="text-xs text-ink-muted">Pick up where you left off.</p>
        </div>
        <Button variant="primary" size="md" onClick={handleResume} className="shrink-0">
          Resume
          <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X strokeWidth={1.75} className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {count > 1 && expanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-accent/20"
          >
            {drafts.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 px-4 py-3 sm:px-5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-accent/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {d.title?.trim() || "Untitled raffle"}
                  </p>
                  <p className="text-xs text-ink-subtle">Step {d.currentStep} of 5</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(resumePath(d))}
                  className="shrink-0"
                >
                  Resume this one
                  <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
