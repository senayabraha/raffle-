import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, Gift, Clock, Trophy, ArrowRight, Sparkles } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CountdownInline } from "@/components/ui/Countdown";
import { useAuth } from "@/lib/auth";
import { fetchMyTickets, type MyTicketGroup } from "@/lib/raffles";
import { formatCurrency } from "@/lib/utils";

export default function MyTickets() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<MyTicketGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchMyTickets(user.id).then((g) => {
      if (!active) return;
      setGroups(g);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const totalTickets = groups.reduce((n, g) => n + g.count, 0);

  return (
    <PublicShell>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <Badge tone="accent">
          {totalTickets} {totalTickets === 1 ? "ticket" : "tickets"} across{" "}
          {groups.length} {groups.length === 1 ? "raffle" : "raffles"}
        </Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tightest text-white sm:text-5xl">
          My <span className="text-gradient">tickets</span>
        </h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          Every entry you've made, with live draw countdowns. Good luck!
        </p>
      </motion.div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass h-44 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-500">
            <Ticket strokeWidth={1.5} className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-white">No tickets yet</p>
          <p className="max-w-xs text-sm text-zinc-500">
            Browse the marketplace and enter your first raffle to see it here.
          </p>
          <Link to="/en/public-raffles/live" className="mt-1">
            <Button variant="primary" size="md">
              <Sparkles strokeWidth={1.5} className="h-[18px] w-[18px]" />
              Browse raffles
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {groups.map((g, i) => (
            <motion.div
              key={g.raffleId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard className="h-full p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                      {g.category}
                    </span>
                    <Link
                      to={`/en/raffle/${g.slug}`}
                      className="mt-1 block text-[15px] font-semibold leading-snug tracking-tight text-white transition-colors hover:text-accent-soft"
                    >
                      {g.title}
                    </Link>
                  </div>
                  {g.status === "ended" ? (
                    <Badge tone="neutral">Ended</Badge>
                  ) : (
                    <Badge tone="live" dot>
                      Live
                    </Badge>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent-gradient text-white shadow-accent-glow">
                    <span className="text-lg font-bold leading-none">{g.count}</span>
                    <span className="text-[9px] uppercase tracking-wide opacity-80">
                      {g.count === 1 ? "ticket" : "tickets"}
                    </span>
                  </div>
                  <div className="min-w-0 text-sm text-zinc-400">
                    <p>
                      Numbers{" "}
                      <span className="font-medium text-zinc-200">
                        {g.numbers.slice(0, 6).map((n) => `#${n}`).join(", ")}
                        {g.numbers.length > 6 ? ` +${g.numbers.length - 6} more` : ""}
                      </span>
                    </p>
                    {g.freeCount > 0 && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-300">
                        <Gift className="h-3.5 w-3.5" />
                        {g.freeCount} free bonus included
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-zinc-400">
                    {g.status === "ended" ? (
                      <>
                        <Trophy strokeWidth={1.5} className="h-4 w-4 text-amber-400" />
                        Draw complete
                      </>
                    ) : (
                      <>
                        <Clock strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
                        Draws in{" "}
                        {g.drawDate ? (
                          <CountdownInline drawDate={g.drawDate} className="text-zinc-200" />
                        ) : (
                          "soon"
                        )}
                      </>
                    )}
                  </span>
                  <Link
                    to={`/en/raffle/${g.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-accent-soft transition-colors hover:text-white"
                  >
                    View
                    <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <p className="mt-2 text-[11px] text-zinc-600">
                  {formatCurrency(g.ticketPrice)} per ticket
                </p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      )}
    </PublicShell>
  );
}
