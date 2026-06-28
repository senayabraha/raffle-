import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  fetchCancellationRequests,
  resolveCancellationRequest,
  type AdminCancellationRow,
} from "@/lib/admin";

export default function Cancellations() {
  const [requests, setRequests] = useState<AdminCancellationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminCancellationRow | null>(null);

  function load() {
    setLoading(true);
    fetchCancellationRequests().then((rows) => {
      setRequests(rows);
      setLoading(false);
    });
  }

  useEffect(load, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Cancellations</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Hosts requesting to cancel a live raffle that already has entries — the
        review queue. Approving cancels the raffle and refunds held payments.
      </p>

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader title={`${requests.length} pending requests`} />
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-ink-subtle">No pending cancellation requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-subtle">
                  <th className="py-2 pr-4">Raffle</th>
                  <th className="py-2 pr-4">Host</th>
                  <th className="py-2 pr-4">Tickets sold</th>
                  <th className="py-2 pr-4">Requested</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-line text-ink">
                    <td className="py-3 pr-4 font-medium text-ink">{r.raffleTitle}</td>
                    <td className="py-3 pr-4">{r.hostName}</td>
                    <td className="py-3 pr-4 tabular-nums">{r.ticketsSold.toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <Badge tone="warning">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                        Review
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
        <ReviewModal
          request={selected}
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

function ReviewModal({
  request,
  onClose,
  onResolved,
}: {
  request: AdminCancellationRow;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!decision) return;
    setSubmitting(true);
    setError(null);
    try {
      await resolveCancellationRequest(request.id, decision, note.trim());
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass w-full max-w-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{request.raffleTitle}</h2>
            <p className="text-xs text-ink-subtle">
              {request.hostName} · {request.ticketsSold.toLocaleString()} tickets sold
            </p>
          </div>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-wider text-ink-subtle">Host's reason</p>
          <p className="mt-1 text-sm text-ink">{request.reason}</p>
        </div>

        <div className="mt-5 space-y-3">
          <button
            onClick={() => setDecision("approve")}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              decision === "approve"
                ? "border-accent/60 bg-accent/10"
                : "border-line bg-surface hover:border-line"
            }`}
          >
            <p className="text-sm font-semibold text-ink">Approve cancellation</p>
            <p className="mt-1 text-xs text-ink-subtle">
              Raffle moves to "cancelled" and all held payments are refunded. The host is notified.
            </p>
          </button>
          <button
            onClick={() => setDecision("reject")}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              decision === "reject"
                ? "border-accent/60 bg-accent/10"
                : "border-line bg-surface hover:border-line"
            }`}
          >
            <p className="text-sm font-semibold text-ink">Decline request</p>
            <p className="mt-1 text-xs text-ink-subtle">
              The raffle stays live. The host is notified, with your note if provided.
            </p>
          </button>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note for the host (optional, recorded in the audit log)"
          rows={3}
          className="mt-4 w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus-ring"
        />

        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!decision || submitting} onClick={submit}>
            {submitting ? "Resolving…" : "Resolve request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
