import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { HostRaffleSummary } from "@/lib/raffles";
import { formatCurrency, formatCompact, cn } from "@/lib/utils";

const statusMeta: Record<
  HostRaffleSummary["status"],
  { tone: "live" | "warning" | "neutral"; label: string; dot: boolean }
> = {
  live: { tone: "live", label: "Live", dot: true },
  draft: { tone: "warning", label: "Draft", dot: false },
  ended: { tone: "neutral", label: "Ended", dot: false },
  cancelled: { tone: "neutral", label: "Cancelled", dot: false },
};

export function LiveRaffles({ raffles }: { raffles: HostRaffleSummary[] }) {
  if (raffles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink-subtle">
          <Ticket strokeWidth={1.5} className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-ink">No raffles yet</p>
        <p className="max-w-[14rem] text-xs text-ink-subtle">
          Create your first raffle to start tracking live sales and escrow here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {raffles.map((r, i) => {
        const meta = statusMeta[r.status];
        const pct = Math.min((r.sold / r.cap) * 100, 100);
        const Icon = r.icon;
        return (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              to={
                r.status === "draft"
                  ? `/en/dashboard/create/${r.id}`
                  : r.status === "ended"
                    ? `/en/dashboard/ended/${r.id}`
                    : `/en/dashboard/raffles/${r.id}`
              }
              className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-3 transition-all duration-300 ease-premium hover:border-line hover:bg-surface"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-accent-soft">
                <Icon strokeWidth={1.5} className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold tracking-tight text-ink">
                    {r.title}
                  </p>
                  <Badge tone={meta.tone} dot={meta.dot} className="shrink-0">
                    {meta.label}
                  </Badge>
                </div>

                {/* Progress */}
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        pct >= 100 ? "bg-emerald-400" : "bg-accent-gradient",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-ink-subtle">
                    {formatCompact(r.sold)}/{formatCompact(r.cap)}
                  </span>
                </div>
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-sm font-semibold tabular-nums text-ink">
                  {formatCurrency(r.revenue)}
                </p>
                <p className="text-[11px] text-ink-subtle">escrowed</p>
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
  );
}
