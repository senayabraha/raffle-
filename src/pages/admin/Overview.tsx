import { useEffect, useState } from "react";
import { Ticket, BarChart3, Wallet, Users, ShieldAlert, Crown } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { fetchAdminOverview, type AdminOverview as AdminOverviewData } from "@/lib/admin";
import { formatCurrency, formatCompact } from "@/lib/utils";

const cards = [
  { key: "liveRaffleCount", label: "Live raffles", icon: Ticket, format: "count" as const },
  { key: "totalRaffleCount", label: "Total raffles", icon: BarChart3, format: "count" as const },
  { key: "grossVolume", label: "Gross volume", icon: Wallet, format: "currency" as const },
  { key: "platformCommission", label: "Platform commission", icon: Crown, format: "currency" as const },
  { key: "userCount", label: "Registered users", icon: Users, format: "count" as const },
  { key: "hostCount", label: "Hosts", icon: Users, format: "count" as const },
  { key: "disputedCount", label: "Open disputes", icon: ShieldAlert, format: "count" as const },
] satisfies Array<{
  key: keyof AdminOverviewData;
  label: string;
  icon: typeof Ticket;
  format: "count" | "currency";
}>;

export default function Overview() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAdminOverview().then((result) => {
      if (!active) return;
      setData(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Overview</h1>
      <p className="mt-1 text-sm text-ink-subtle">Platform-wide totals across all hosts and raffles.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ key, label, icon: Icon, format }) => (
          <SpotlightCard key={key} className="p-5">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-accent-soft">
              <Icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
            </div>
            <p className="mt-4 text-sm text-ink-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
              {loading
                ? "—"
                : format === "currency"
                  ? formatCurrency(data?.[key] ?? 0)
                  : formatCompact(data?.[key] ?? 0)}
            </p>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
}
