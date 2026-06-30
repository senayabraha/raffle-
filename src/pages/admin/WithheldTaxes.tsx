import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  fetchWithheldTaxes,
  markTaxRemitted,
  type WithheldTaxRow,
  type WithheldTaxType,
  type WithheldTaxStatus,
} from "@/lib/admin";
import { formatCurrency } from "@/lib/utils";

const TAX_TYPE_LABEL: Record<WithheldTaxType, string> = {
  lottery_tax: "Lottery tax",
  winner_tax: "Winner tax",
  social_contribution: "Social contribution",
};

const STATUS_TONE: Record<WithheldTaxStatus, "info" | "live"> = {
  withheld: "info",
  remitted: "live",
};

function fmtDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-GB") : "—";
}

export default function WithheldTaxes() {
  const [rows, setRows] = useState<WithheldTaxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remitting, setRemitting] = useState<string | null>(null);

  const [taxType, setTaxType] = useState<"all" | WithheldTaxType>("all");
  const [status, setStatus] = useState<"all" | WithheldTaxStatus>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let active = true;
    fetchWithheldTaxes()
      .then((data) => {
        if (active) setRows(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : null;
    // Include the whole "to" day by pushing to its end.
    const toTs = to ? new Date(to).getTime() + 86_399_999 : null;
    return rows.filter((r) => {
      if (taxType !== "all" && r.taxType !== taxType) return false;
      if (status !== "all" && r.status !== status) return false;
      const ts = new Date(r.createdAt).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [rows, taxType, status, from, to]);

  // Summary: amounts still awaiting remittance, broken down by tax type. This is
  // the platform's standing liability — always over the full ledger, ignoring the
  // status filter (which could otherwise hide it entirely).
  const awaiting = useMemo(() => {
    const byType: Record<WithheldTaxType, number> = {
      lottery_tax: 0,
      winner_tax: 0,
      social_contribution: 0,
    };
    let total = 0;
    for (const r of rows) {
      if (r.status !== "withheld") continue;
      byType[r.taxType] += r.amount;
      total += r.amount;
    }
    return { byType, total };
  }, [rows]);

  async function handleRemit(id: string) {
    setRemitting(id);
    setError(null);
    try {
      await markTaxRemitted(id);
      const now = new Date().toISOString();
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "remitted", remittedAt: now } : r,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as remitted.");
    } finally {
      setRemitting(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Withheld taxes</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Taxes withheld by the platform at checkout and at draw time, tracked here
        until they are remitted to the authority.
      </p>

      {/* Awaiting-remittance summary */}
      <SpotlightCard lift={false} className="mt-6 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
          Total currently withheld, awaiting remittance
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-ink">
          ETB {formatCurrency(awaiting.total).replace(/^ETB\s*/, "")}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(Object.keys(TAX_TYPE_LABEL) as WithheldTaxType[]).map((t) => (
            <div key={t} className="rounded-xl border border-line bg-surface p-3">
              <p className="text-xs text-ink-subtle">{TAX_TYPE_LABEL[t]}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                {formatCurrency(awaiting.byType[t])}
              </p>
            </div>
          ))}
        </div>
      </SpotlightCard>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={taxType}
          onChange={(e) => setTaxType(e.target.value as typeof taxType)}
          className="h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus-ring"
        >
          <option value="all">All tax types</option>
          {(Object.keys(TAX_TYPE_LABEL) as WithheldTaxType[]).map((t) => (
            <option key={t} value={t}>
              {TAX_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus-ring"
        >
          <option value="all">All statuses</option>
          <option value="withheld">Withheld</option>
          <option value="remitted">Remitted</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-subtle">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus-ring"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-subtle">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus-ring"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader title={`${filtered.length} ledger entries`} />
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-subtle">
            No withheld taxes match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-subtle">
                  <th className="py-2 pr-4">Raffle</th>
                  <th className="py-2 pr-4">Tax type</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Remitted</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-line text-ink">
                    <td className="py-3 pr-4 font-medium text-ink">{r.raffleTitle}</td>
                    <td className="py-3 pr-4">{TAX_TYPE_LABEL[r.taxType]}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatCurrency(r.amount)}</td>
                    <td className="py-3 pr-4 capitalize">{r.source}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="py-3 pr-4">{fmtDate(r.createdAt)}</td>
                    <td className="py-3 pr-4">{fmtDate(r.remittedAt)}</td>
                    <td className="py-3 pr-4">
                      {r.status === "withheld" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemit(r.id)}
                          disabled={remitting === r.id}
                        >
                          {remitting === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Mark as remitted
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SpotlightCard>
    </div>
  );
}
