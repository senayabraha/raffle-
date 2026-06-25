import { useEffect, useMemo, useState } from "react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { fetchAdminPayments, type AdminPaymentRow } from "@/lib/admin";
import { formatCurrency } from "@/lib/utils";

const STATUS_TONE: Record<string, "live" | "neutral" | "warning" | "info"> = {
  held: "info",
  released: "live",
  compensated: "warning",
  refunded: "warning",
  failed: "warning",
  pending: "neutral",
};

export default function Payments() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");

  useEffect(() => {
    let active = true;
    fetchAdminPayments().then((rows) => {
      if (!active) return;
      setPayments(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const statuses = useMemo(() => Array.from(new Set(payments.map((p) => p.status))), [payments]);
  const providers = useMemo(() => Array.from(new Set(payments.map((p) => p.provider))), [payments]);

  const filtered = payments.filter((p) => {
    if (status !== "all" && p.status !== status) return false;
    if (provider !== "all" && p.provider !== provider) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Payments</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Most recent 200 payments platform-wide, including guest checkouts.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
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
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus-ring"
        >
          <option value="all">All providers</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader title={`${filtered.length} payments`} />
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
                  <th className="py-2 pr-4">Raffle</th>
                  <th className="py-2 pr-4">Payer</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Commission</th>
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-white/[0.06] text-zinc-300">
                    <td className="py-3 pr-4 font-medium text-white">{p.raffleTitle}</td>
                    <td className="py-3 pr-4">{p.payerName}</td>
                    <td className="py-3 pr-4">
                      {p.amountGross != null ? formatCurrency(p.amountGross) : "—"}
                    </td>
                    <td className="py-3 pr-4">{formatCurrency(p.platformCommission)}</td>
                    <td className="py-3 pr-4 capitalize">{p.provider}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                    </td>
                    <td className="py-3 pr-4">{new Date(p.createdAt).toLocaleDateString()}</td>
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
