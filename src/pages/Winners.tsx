import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Badge } from "@/components/ui/Badge";
import { fetchPublicWinners, type PublicWinner } from "@/lib/raffles";
import { formatCurrency } from "@/lib/utils";

export default function Winners() {
  const [winners, setWinners] = useState<PublicWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchPublicWinners().then((rows) => {
      if (!active) return;
      setWinners(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PublicShell>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <Badge tone="accent" dot>
          {winners.length} past {winners.length === 1 ? "winner" : "winners"}
        </Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tightest text-ink sm:text-5xl">
          Recent <span className="text-gradient">winners</span>
        </h1>
        <p className="mt-3 max-w-xl text-ink-muted">
          Every draw is automated and auditable. Here's who's won so far.
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass h-24 animate-pulse" />
          ))}
        </div>
      ) : winners.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2">
          {winners.map((w) => (
            <Link
              key={w.id}
              to={`/en/raffle/${w.raffleSlug}`}
              className="glass focus-ring flex items-center gap-4 rounded-2xl p-5 transition-colors duration-300 hover:border-line"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-gradient text-sm font-bold text-white">
                {w.winnerInitials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{w.winnerName}</p>
                <p className="truncate text-xs text-ink-subtle">
                  Won "{w.raffleTitle}"
                  {w.ticketNumber ? ` · ticket #${w.ticketNumber}` : ""}
                </p>
              </div>
              <Badge tone="neutral">{formatCurrency(w.ticketPrice)}</Badge>
            </Link>
          ))}
        </div>
      ) : (
        <div className="glass flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface text-ink-subtle">
            <Trophy strokeWidth={1.5} className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-ink">No winners yet</p>
          <p className="max-w-xs text-sm text-ink-subtle">
            Once a raffle's draw completes, the winner will appear here.
          </p>
        </div>
      )}
    </PublicShell>
  );
}
