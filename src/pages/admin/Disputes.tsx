import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fetchAdminDisputes, resolveDispute, type AdminDisputeRow } from "@/lib/admin";

export default function Disputes() {
  const [disputes, setDisputes] = useState<AdminDisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminDisputeRow | null>(null);

  function load() {
    setLoading(true);
    fetchAdminDisputes().then((rows) => {
      setDisputes(rows);
      setLoading(false);
    });
  }

  useEffect(load, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Disputes</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Prizes currently disputed by the winning entrant — the resolution queue.
      </p>

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader title={`${disputes.length} open disputes`} />
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <p className="text-sm text-zinc-500">No open disputes right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Raffle</th>
                  <th className="py-2 pr-4">Winner</th>
                  <th className="py-2 pr-4">Ticket</th>
                  <th className="py-2 pr-4">Disputed</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr key={d.winnerId} className="border-t border-white/[0.06] text-zinc-300">
                    <td className="py-3 pr-4 font-medium text-white">{d.raffleTitle}</td>
                    <td className="py-3 pr-4">{d.winnerName}</td>
                    <td className="py-3 pr-4">#{d.ticketNumber ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <Badge tone="warning">
                        {d.disputedAt ? new Date(d.disputedAt).toLocaleDateString() : "—"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(d)}>
                        Resolve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SpotlightCard>

      {selected && (
        <ResolveModal
          dispute={selected}
          onClose={() => setSelected(null)}
          onResolved={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ResolveModal({
  dispute,
  onClose,
  onResolved,
}: {
  dispute: AdminDisputeRow;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [decision, setDecision] = useState<"uphold_entrant" | "uphold_host" | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!decision || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await resolveDispute(dispute.winnerId, decision, reason.trim());
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve dispute.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-lg p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{dispute.raffleTitle}</h2>
            <p className="text-xs text-zinc-500">
              {dispute.winnerName} · ticket #{dispute.ticketNumber ?? "—"}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <button
            onClick={() => setDecision("uphold_host")}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              decision === "uphold_host"
                ? "border-accent/60 bg-accent/10"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            <p className="text-sm font-semibold text-white">Uphold host</p>
            <p className="mt-1 text-xs text-zinc-500">
              Prize is accepted as delivered. Winner moves to "accepted", raffle to "confirmed".
            </p>
          </button>
          <button
            onClick={() => setDecision("uphold_entrant")}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              decision === "uphold_entrant"
                ? "border-accent/60 bg-accent/10"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            <p className="text-sm font-semibold text-white">Uphold entrant</p>
            <p className="mt-1 text-xs text-zinc-500">
              Entrant is compensated, same as the automated guarantee path. Winner moves to
              "compensated", raffle to "revoked", payments to "compensated".
            </p>
          </button>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for this decision (required, recorded in the audit log)"
          rows={3}
          className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus-ring"
        />

        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!decision || !reason.trim() || submitting}
            onClick={submit}
          >
            {submitting ? "Resolving…" : "Resolve dispute"}
          </Button>
        </div>
      </div>
    </div>
  );
}
