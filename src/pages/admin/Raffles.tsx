import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import {
  fetchAdminRaffles,
  fetchAdminDrawAudit,
  type AdminRaffleRow,
  type AdminDrawAuditRow,
} from "@/lib/admin";
import { formatCurrency } from "@/lib/utils";

const STATUS_TONE: Record<string, "live" | "neutral" | "warning" | "info"> = {
  live: "live",
  draft: "neutral",
  cancelled: "warning",
  ended: "info",
};

export default function Raffles() {
  const [raffles, setRaffles] = useState<AdminRaffleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminRaffleRow | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminRaffles().then((rows) => {
      if (!active) return;
      setRaffles(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const statuses = useMemo(
    () => Array.from(new Set(raffles.map((r) => r.status))),
    [raffles],
  );

  const filtered = raffles.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.hostEmail?.toLowerCase().includes(q) ||
      r.hostName.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Raffles</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Every raffle on the platform, regardless of host or visibility.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or host email"
          className="h-10 min-w-[240px] flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-zinc-500 focus-ring"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus-ring"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader title={`${filtered.length} raffles`} />
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Host</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Sold</th>
                  <th className="py-2 pr-4">Draw date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-t border-white/[0.06] text-zinc-300 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="py-3 pr-4 font-medium text-white">{r.title}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <p>{r.hostName}</p>
                      <p className="text-xs text-zinc-500">{r.hostEmail ?? "—"}</p>
                    </td>
                    <td className="py-3 pr-4">{formatCurrency(r.ticketPrice)}</td>
                    <td className="py-3 pr-4">{r.ticketsSold}</td>
                    <td className="py-3 pr-4">
                      {r.drawDate ? new Date(r.drawDate).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SpotlightCard>

      {selected && (
        <DrawAuditModal raffle={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function DrawAuditModal({
  raffle,
  onClose,
}: {
  raffle: AdminRaffleRow;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<AdminDrawAuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAdminDrawAudit(raffle.id).then((data) => {
      if (!active) return;
      setRows(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [raffle.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[80vh] w-full max-w-2xl overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{raffle.title}</h2>
            <p className="text-xs text-zinc-500">Draw audit trail</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="h-20 animate-pulse rounded-lg bg-white/[0.03]" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-zinc-500">No draw has run for this raffle yet.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{new Date(row.createdAt).toLocaleString()}</span>
                    <span>{row.method}</span>
                  </div>
                  <p className="mt-2 text-zinc-300">
                    Drawn ticket #{row.drawnTicketNumber ?? "—"} of {row.entries} entries
                  </p>
                  <p className="mt-1 break-all text-xs text-zinc-500">Seed: {row.seed}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
