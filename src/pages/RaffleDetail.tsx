import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star,
  ShieldCheck,
  Users,
  Trophy,
  ArrowLeft,
  Share2,
  Twitter,
  Facebook,
  Send,
  Link2,
  Heart,
  Gift,
} from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/Badge";
import { CountdownPills } from "@/components/ui/Countdown";
import { TicketSelector } from "@/components/raffle/TicketSelector";
import { getRaffleBySlug } from "@/data/marketplace";
import { formatCompact, cn } from "@/lib/utils";

const entrants = [
  { initials: "AR", name: "Amelia R.", tickets: 25, time: "2m ago" },
  { initials: "DK", name: "Daniel K.", tickets: 5, time: "8m ago" },
  { initials: "PS", name: "Priya S.", tickets: 10, time: "14m ago" },
  { initials: "MT", name: "Marcus T.", tickets: 3, time: "21m ago" },
  { initials: "SL", name: "Sofia L.", tickets: 50, time: "33m ago" },
  { initials: "JW", name: "James W.", tickets: 2, time: "47m ago" },
];

const shareLinks = [
  { icon: Twitter, label: "X" },
  { icon: Facebook, label: "Facebook" },
  { icon: Send, label: "Telegram" },
  { icon: Link2, label: "Copy link" },
];

export default function RaffleDetail() {
  const { slug } = useParams();
  const raffle = slug ? getRaffleBySlug(slug) : undefined;

  if (!raffle) return <Navigate to="/en/public-raffles/live" replace />;

  const pct = Math.min((raffle.sold / raffle.cap) * 100, 100);
  const Icon = raffle.icon;

  return (
    <PublicShell>
      <Link
        to="/en/public-raffles/live"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
        Back to marketplace
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---- Left: prize details ---- */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 lg:col-span-2"
        >
          {/* Cover */}
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-white/10">
            <div className={cn("absolute inset-0 bg-gradient-to-br", raffle.gradient)} />
            <div className="absolute inset-0 bg-obsidian/20" />
            <Icon
              strokeWidth={1}
              className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 text-white/80 drop-shadow-xl"
            />
            <div className="absolute inset-x-4 top-4 flex gap-1.5">
              {raffle.featured && (
                <Badge tone="accent" className="backdrop-blur-md">
                  Featured
                </Badge>
              )}
              {raffle.charityPercent > 0 && (
                <Badge tone="info" className="backdrop-blur-md">
                  <Heart className="h-3 w-3" /> {raffle.charityPercent}% to charity
                </Badge>
              )}
            </div>
          </div>

          {/* Title + host */}
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              {raffle.category}
            </span>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tightest text-white sm:text-4xl">
              {raffle.title}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-gradient text-xs font-bold text-white">
                {raffle.hostInitials}
              </span>
              <div className="text-sm">
                <p className="font-semibold text-white">{raffle.host}</p>
                <p className="inline-flex items-center gap-1 text-xs text-zinc-500">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {raffle.rating.toFixed(1)} · Verified {raffle.hostType} host
                </p>
              </div>
            </div>
          </div>

          {/* About */}
          <SpotlightCard className="p-6" lift={false}>
            <h2 className="text-[15px] font-semibold tracking-tight text-white">
              About this prize
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {raffle.description}
            </p>
            {raffle.bundles.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {raffle.bundles.map((b) => (
                  <span
                    key={b.qty}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300"
                  >
                    <Gift className="h-3.5 w-3.5 text-accent-soft" />
                    Buy {b.qty}, get {b.free} free
                  </span>
                ))}
              </div>
            )}
          </SpotlightCard>

          {/* Live entrants */}
          <SpotlightCard className="p-6" lift={false}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
                <Users strokeWidth={1.5} className="h-[18px] w-[18px] text-accent-soft" />
                Recent entrants
              </h2>
              <Badge tone="live" dot>
                Live
              </Badge>
            </div>
            <ul className="space-y-1">
              {entrants.map((e, i) => (
                <motion.li
                  key={e.initials}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-300 hover:bg-white/[0.03]"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-bold text-accent-soft">
                    {e.initials}
                  </span>
                  <span className="flex-1 text-sm text-zinc-200">{e.name}</span>
                  <span className="text-xs text-zinc-400">
                    {e.tickets} {e.tickets === 1 ? "ticket" : "tickets"}
                  </span>
                  <span className="w-16 text-right text-[11px] text-zinc-600">
                    {e.time}
                  </span>
                </motion.li>
              ))}
            </ul>
          </SpotlightCard>
        </motion.div>

        {/* ---- Right: sticky purchase panel ---- */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-1"
        >
          <div className="space-y-4 lg:sticky lg:top-28">
            {/* Countdown + progress */}
            <div className="glass-strong p-5">
              <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Trophy strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
                Draw {raffle.status === "ended" ? "closed" : "in"}
              </p>
              <CountdownPills drawDate={raffle.drawDate} />

              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-accent-gradient"
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-zinc-400">
                  <span>
                    <span className="font-semibold text-white tabular-nums">
                      {formatCompact(raffle.sold)}
                    </span>{" "}
                    sold
                  </span>
                  <span className="tabular-nums">
                    {formatCompact(raffle.cap - raffle.sold)} remaining
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket selector */}
            <TicketSelector raffle={raffle} />

            {/* Share */}
            <div className="glass p-5">
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-white">
                <Share2 strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
                Share &amp; earn a free ticket
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Get 1 bonus entry when a friend joins via your link.
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {shareLinks.map((s) => (
                  <button
                    key={s.label}
                    title={s.label}
                    className="focus-ring grid h-11 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent-soft active:scale-95"
                  >
                    <s.icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
                  </button>
                ))}
              </div>
            </div>

            {/* Guarantee */}
            <div className="glass flex items-start gap-3 p-4">
              <ShieldCheck strokeWidth={1.5} className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-200">Raffall Guarantee:</span>{" "}
                if the host fails to deliver, you receive 75% of ticket revenue
                back, paid by the platform.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </PublicShell>
  );
}
