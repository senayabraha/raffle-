import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Award, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { fetchHostEndedRaffles, type EndedRaffleSummary } from "@/lib/raffles";
import { formatCurrency } from "@/lib/utils";

const prizeStatusMeta: Record<
  EndedRaffleSummary["prizeStatus"],
  { tone: "live" | "warning" | "neutral"; label: string }
> = {
  pending: { tone: "warning", label: "Awaiting confirmation" },
  confirmed: { tone: "live", label: "Confirmed" },
  disputed: { tone: "neutral", label: "Disputed" },
};

export default function EndedRafflesList() {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<EndedRaffleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchHostEndedRaffles(user.id).then((rows) => {
      if (!active) return;
      setRaffles(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return (
      <AppShell>
        <div className="grid min-h-[50vh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link
        to="/en/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-accent-soft">
          <Trophy strokeWidth={1.5} className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tightest text-ink sm:text-3xl">
            Ended raffles
          </h1>
          <p className="text-sm text-ink-subtle">
            Completed draws across all of your raffles.
          </p>
        </div>
      </div>

      {raffles.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface text-ink-subtle">
            <Award strokeWidth={1.5} className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-ink">No completed draws yet</p>
          <p className="max-w-sm text-sm text-ink-subtle">
            When one of your raffles ends and a winner is drawn, it'll show up
            here so you can confirm delivery.
          </p>
          <Link to="/en/dashboard/create" className="mt-1">
            <Button variant="primary" size="md">
              Create a raffle
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {raffles.map((r, i) => {
            const meta = prizeStatusMeta[r.prizeStatus];
            const gross = r.sold * r.ticketPrice;
            const drawnAt = r.drawDate
              ? new Date(r.drawDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—";
            return (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={`/en/dashboard/ended/${r.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-3 transition-all duration-300 ease-premium hover:border-line hover:bg-surface"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-accent-soft">
                    <Trophy strokeWidth={1.5} className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold tracking-tight text-ink">
                        {r.title}
                      </p>
                      <Badge tone={meta.tone} className="shrink-0">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-subtle">
                      Drawn {drawnAt} · {r.winner?.name ?? "Winner pending"}
                    </p>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-sm font-semibold tabular-nums text-ink">
                      {formatCurrency(gross)}
                    </p>
                    <p className="text-[11px] text-ink-subtle">gross sales</p>
                  </div>

                  <ArrowUpRight
                    strokeWidth={1.5}
                    className="h-4 w-4 shrink-0 text-ink-subtle transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-soft"
                  />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
