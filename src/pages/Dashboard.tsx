import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, Sparkles, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TrafficDonut } from "@/components/dashboard/TrafficDonut";
import { LiveRaffles } from "@/components/dashboard/LiveRaffles";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { topStats, salesSeries } from "@/data/mock";

// Per-stat sparkline variants derived from the base series
const sparkVariants = [
  salesSeries,
  salesSeries.map((v) => v * 0.8 + 60),
  [1, 2, 2, 3, 3, 3, 3],
  salesSeries.map((v) => (v % 100) / 12 + 4),
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Dashboard() {
  return (
    <AppShell>
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
            <span className="text-xs text-zinc-500">Monday, 23 June</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tightest text-white sm:text-[2.5rem] sm:leading-[1.05]">
            Welcome back,{" "}
            <span className="text-gradient">Jordan</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-zinc-400">
            Your raffles sold{" "}
            <span className="font-semibold text-zinc-200">2,140 tickets</span>{" "}
            in the last 24 hours. Everything is on track.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md">
            <Clock strokeWidth={1.5} className="h-[18px] w-[18px]" />
            Last 14 days
          </Button>
          <Button variant="primary" size="md">
            <Sparkles strokeWidth={1.5} className="h-[18px] w-[18px]" />
            Create raffle
          </Button>
        </div>
      </motion.div>

      {/* ---- Bento grid ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Row 1 — stat cards */}
        {topStats.map((s, i) => (
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
              delta={s.delta}
              icon={s.icon}
              series={sparkVariants[i]}
              decimals={s.suffix === "%" ? 1 : 0}
            />
          </motion.div>
        ))}

        {/* Row 2 — sales chart (wide) + traffic donut */}
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
              subtitle="Daily volume across all live raffles"
              action={
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +24.6%
                </span>
              }
            />
            <SalesChart />
            <div className="mt-3 flex justify-between text-[10px] text-zinc-600">
              <span>Jun 10</span>
              <span>Jun 16</span>
              <span>Jun 23</span>
            </div>
          </SpotlightCard>
        </motion.div>

        <motion.div
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="sm:col-span-2 xl:col-span-1"
        >
          <SpotlightCard className="h-full p-6" lift={false}>
            <CardHeader title="Traffic sources" subtitle="Where entrants come from" />
            <TrafficDonut />
          </SpotlightCard>
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
              title="Your live raffles"
              subtitle="Real-time sales & escrow"
              action={
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              }
            />
            <LiveRaffles />
          </SpotlightCard>
        </motion.div>

        <motion.div
          custom={8}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="sm:col-span-2 xl:col-span-1"
        >
          <SpotlightCard className="h-full p-6" lift={false}>
            <CardHeader
              title="Live activity"
              subtitle="Entries as they happen"
              action={<Badge tone="live" dot>Live</Badge>}
            />
            <ActivityFeed />
          </SpotlightCard>
        </motion.div>

        {/* Guarantee / escrow card */}
        <motion.div
          custom={9}
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
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-white">
                Raffall Guarantee
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                Funds are held in escrow until the winner confirms receipt. Draws
                are automated and fully auditable.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-ring" />
                All systems operational
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
