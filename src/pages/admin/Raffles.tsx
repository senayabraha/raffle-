import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  fetchAdminRaffles,
  fetchAdminDrawAudit,
  setRaffleStatus,
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

  function load() {
    setLoading(true);
    fetchAdminRaffles().then((rows) => {
      setRaffles(rows);
      setLoading(false);
    });
  }

  useEffect(load, []);

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
      <h1 className="text-2xl font-bold tracking-tight text-ink">Raffles</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Every raffle on the platform, regardless of host or visibility.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or host email"
          className="h-10 min-w-[240px] flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-subtle focus-ring"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus-ring"
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
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-subtle">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Host</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Sold</th>
                  <th className="py-2 pr-4">Draw date</th>
                  <th className="py-2 pr-4">Free route</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-t border-line text-ink transition-colors hover:bg-surface"
                  >
                    <td className="py-3 pr-4 font-medium text-ink">{r.title}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <p>{r.hostName}</p>
                      <p className="text-xs text-ink-subtle">{r.hostEmail ?? "—"}</p>
                    </td>
                    <td className="py-3 pr-4">{formatCurrency(r.ticketPrice)}</td>
                    <td className="py-3 pr-4">{r.ticketsSold}</td>
                    <td className="py-3 pr-4">
                      {r.drawDate ? new Date(r.drawDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {r.hasFreeEntryRoute ? (
                        <Badge tone="live">Has free route</Badge>
                      ) : r.status === "live" ? (
                        <Badge tone="warning">No free route</Badge>
                      ) : (
                        <Badge tone="neutral">—</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SpotlightCard>

      {selected && (
        <RaffleDetailModal
          raffle={selected}
          onClose={() => setSelected(null)}
          onModerated={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function RaffleDetailModal({
  raffle,
  onClose,
  onModerated,
}: {
  raffle: AdminRaffleRow;
  onClose: () => void;
  onModerated: () => void;
}) {
  const [rows, setRows] = useState<AdminDrawAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"draft" | "cancelled" | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canModerate = raffle.status === "live" && !loading && rows.length === 0;

  async function submit() {
    if (!action || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await setRaffleStatus(raffle.id, action, reason.trim());
      onModerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to moderate raffle.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{raffle.title}</h2>
            <p className="text-xs text-ink-subtle">Draw audit trail</p>
          </div>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="h-20 animate-pulse rounded-lg bg-surface" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-ink-subtle">No draw has run for this raffle yet.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="rounded-xl border border-line bg-surface p-4 text-sm">
                  <div className="flex items-center justify-between text-xs text-ink-subtle">
                    <span>{new Date(row.createdAt).toLocaleString()}</span>
                    <span>{row.method}</span>
                  </div>
                  <p className="mt-2 text-ink">
                    Drawn ticket #{row.drawnTicketNumber ?? "—"} of {row.entries} entries
                  </p>
                  <p className="mt-1 break-all text-xs text-ink-subtle">Seed: {row.seed}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {canModerate && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-sm font-semibold text-ink">Moderate this raffle</p>
            <div className="mt-3 flex gap-3">
              <Button
                size="sm"
                variant={action === "draft" ? "primary" : "outline"}
                onClick={() => setAction("draft")}
              >
                Unpublish
              </Button>
              <Button
                size="sm"
                variant={action === "cancelled" ? "primary" : "outline"}
                onClick={() => setAction("cancelled")}
              >
                Force cancel
              </Button>
            </div>
            {action && (
              <>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (required, recorded in the audit log)"
                  rows={2}
                  className="mt-3 w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus-ring"
                />
                {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
                <div className="mt-3 flex justify-end gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setAction(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" disabled={!reason.trim() || submitting} onClick={submit}>
                    {submitting ? "Saving…" : "Confirm"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
