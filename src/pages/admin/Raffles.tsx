import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  fetchAdminRaffles,
  fetchAdminDrawAudit,
  setRaffleStatus,
  suspendRaffle,
  unsuspendRaffle,
  extendRaffleDraw,
  type AdminRaffleRow,
  type AdminDrawAuditRow,
  type SuspensionStatus,
} from "@/lib/admin";
import { formatCurrency } from "@/lib/utils";

const STATUS_TONE: Record<string, "live" | "neutral" | "warning" | "info"> = {
  live: "live",
  draft: "neutral",
  cancelled: "warning",
  ended: "info",
};

const SUSPENSION_TONE: Record<SuspensionStatus, "live" | "warning" | "info"> = {
  active: "live",
  temporary: "warning",
  permanent: "info",
};

const SUSPENSION_LABEL: Record<SuspensionStatus, string> = {
  active: "Active",
  temporary: "Temporarily suspended",
  permanent: "Permanently suspended",
};

export default function Raffles() {
  const [searchParams] = useSearchParams();
  const [raffles, setRaffles] = useState<AdminRaffleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>(() =>
    searchParams.get("filter") === "live" ? "live" : "all",
  );
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
    if (status === "suspended") {
      if (r.suspensionStatus === "active") return false;
    } else if (status !== "all" && r.status !== status) {
      return false;
    }
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
          <option value="suspended">Suspended</option>
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
                  <th className="py-2 pr-4">Suspension</th>
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
                      <Badge tone={SUSPENSION_TONE[r.suspensionStatus]}>
                        {SUSPENSION_LABEL[r.suspensionStatus]}
                      </Badge>
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

type PanelKind = "moderate-draft" | "moderate-cancelled" | "suspend" | "unsuspend" | "extend" | null;

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
  const [panel, setPanel] = useState<PanelKind>(null);
  const [reason, setReason] = useState("");
  const [suspendType, setSuspendType] = useState<"temporary" | "permanent">("temporary");
  const [suspendUntil, setSuspendUntil] = useState("");
  const [extendDate, setExtendDate] = useState("");
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
  const isSuspended = raffle.suspensionStatus !== "active";

  function openPanel(next: PanelKind) {
    setPanel(next);
    setReason("");
    setError(null);
    setSuspendType("temporary");
    setSuspendUntil("");
    setExtendDate("");
  }

  async function submit() {
    if (!reason.trim()) return;
    if (panel === "suspend" && suspendType === "temporary" && !suspendUntil) return;
    if (panel === "extend" && !extendDate) return;
    setSubmitting(true);
    setError(null);
    try {
      if (panel === "moderate-draft" || panel === "moderate-cancelled") {
        await setRaffleStatus(raffle.id, panel === "moderate-draft" ? "draft" : "cancelled", reason.trim());
      } else if (panel === "suspend") {
        await suspendRaffle(
          raffle.id,
          suspendType,
          reason.trim(),
          suspendType === "temporary" ? new Date(suspendUntil).toISOString() : undefined,
        );
      } else if (panel === "unsuspend") {
        await unsuspendRaffle(raffle.id, reason.trim());
      } else if (panel === "extend") {
        await extendRaffleDraw(raffle.id, new Date(extendDate).toISOString(), reason.trim());
      }
      onModerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
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

        <div className="mt-4">
          <a
            href={`/en/raffles/${raffle.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent hover:underline"
          >
            View public page →
          </a>
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

        <div className="mt-6 border-t border-line pt-5">
          <p className="text-sm font-semibold text-ink">Suspension</p>
          <p className="mt-1 text-xs text-ink-subtle">
            {isSuspended
              ? `${SUSPENSION_LABEL[raffle.suspensionStatus]}${
                  raffle.suspendedUntil ? ` until ${new Date(raffle.suspendedUntil).toLocaleString()}` : ""
                }`
              : "Suspending a raffle hides it from ticket purchases without changing its lifecycle status."}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {isSuspended ? (
              <Button
                size="sm"
                variant={panel === "unsuspend" ? "primary" : "outline"}
                onClick={() => openPanel(panel === "unsuspend" ? null : "unsuspend")}
              >
                Unsuspend
              </Button>
            ) : (
              <Button
                size="sm"
                variant={panel === "suspend" ? "primary" : "outline"}
                onClick={() => openPanel(panel === "suspend" ? null : "suspend")}
              >
                Suspend
              </Button>
            )}
            {raffle.status === "live" && (
              <Button
                size="sm"
                variant={panel === "extend" ? "primary" : "outline"}
                onClick={() => openPanel(panel === "extend" ? null : "extend")}
              >
                Extend draw date
              </Button>
            )}
          </div>

          {panel === "suspend" && (
            <div className="mt-3 flex gap-3">
              <Button
                size="sm"
                variant={suspendType === "temporary" ? "primary" : "outline"}
                onClick={() => setSuspendType("temporary")}
              >
                Temporary
              </Button>
              <Button
                size="sm"
                variant={suspendType === "permanent" ? "primary" : "outline"}
                onClick={() => setSuspendType("permanent")}
              >
                Permanent
              </Button>
            </div>
          )}
          {panel === "suspend" && suspendType === "temporary" && (
            <input
              type="datetime-local"
              value={suspendUntil}
              onChange={(e) => setSuspendUntil(e.target.value)}
              className="mt-3 h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink focus-ring"
            />
          )}
          {panel === "extend" && (
            <input
              type="datetime-local"
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
              className="mt-3 h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink focus-ring"
            />
          )}

          {(panel === "suspend" || panel === "unsuspend" || panel === "extend") && (
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
                <Button variant="ghost" size="sm" onClick={() => openPanel(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !reason.trim() ||
                    submitting ||
                    (panel === "suspend" && suspendType === "temporary" && !suspendUntil) ||
                    (panel === "extend" && !extendDate)
                  }
                  onClick={submit}
                >
                  {submitting ? "Saving…" : "Confirm"}
                </Button>
              </div>
            </>
          )}
        </div>

        {canModerate && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-sm font-semibold text-ink">Moderate this raffle</p>
            <div className="mt-3 flex gap-3">
              <Button
                size="sm"
                variant={panel === "moderate-draft" ? "primary" : "outline"}
                onClick={() => openPanel(panel === "moderate-draft" ? null : "moderate-draft")}
              >
                Unpublish
              </Button>
              <Button
                size="sm"
                variant={panel === "moderate-cancelled" ? "primary" : "outline"}
                onClick={() => openPanel(panel === "moderate-cancelled" ? null : "moderate-cancelled")}
              >
                Force cancel
              </Button>
            </div>
            {(panel === "moderate-draft" || panel === "moderate-cancelled") && (
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
                  <Button variant="ghost" size="sm" onClick={() => openPanel(null)}>
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
