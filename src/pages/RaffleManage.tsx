import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  ListOrdered,
  PencilLine,
  Ticket,
  Trophy,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, PrefixInput, Textarea } from "@/components/ui/Form";
import {
  cancelRaffle,
  fetchRaffleAnalytics,
  fetchRaffleForManage,
  fetchRaffleOrdersForHost,
  updateRaffleDetails,
  type RaffleAnalytics,
  type RaffleManageDetail,
  type RaffleOrder,
} from "@/lib/raffles";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

type Tab = "overview" | "edit" | "orders";

const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "edit", label: "Edit", icon: PencilLine },
  { key: "orders", label: "Orders", icon: ListOrdered },
];

export default function RaffleManage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [raffle, setRaffle] = useState<RaffleManageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    fetchRaffleForManage(id, user.id).then((r) => {
      if (!active) return;
      setRaffle(r);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user, id]);

  if (loading) {
    return (
      <AppShell>
        <div className="grid min-h-[50vh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
        </div>
      </AppShell>
    );
  }

  if (!raffle) {
    return (
      <AppShell>
        <Link
          to="/en/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="glass flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-base font-semibold text-white">Raffle not found</p>
          <p className="max-w-sm text-sm text-zinc-500">
            This raffle doesn't exist or isn't one of yours.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link
        to="/en/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-accent-soft">
          <Trophy strokeWidth={1.5} className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tightest text-white sm:text-3xl">
            {raffle.title}
          </h1>
          <p className="text-sm text-zinc-500">
            {raffle.ticketsSoldCount.toLocaleString()} tickets sold
          </p>
        </div>
        <Badge tone={raffle.status === "live" ? "live" : "neutral"} dot={raffle.status === "live"} className="ml-auto">
          {raffle.status[0].toUpperCase() + raffle.status.slice(1)}
        </Badge>
      </div>

      {/* Tab strip */}
      <div className="mb-6 inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`focus-ring inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-300 ${
                active ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <t.icon strokeWidth={1.5} className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab raffleId={raffle.id} />}
      {tab === "edit" && (
        <EditTab
          raffle={raffle}
          onSaved={(updated) => setRaffle(updated)}
          onCancelled={() => navigate("/en/dashboard")}
        />
      )}
      {tab === "orders" && <OrdersTab raffleId={raffle.id} />}
    </AppShell>
  );
}

function OverviewTab({ raffleId }: { raffleId: string }) {
  const [analytics, setAnalytics] = useState<RaffleAnalytics | null>(null);

  useEffect(() => {
    let active = true;
    fetchRaffleAnalytics(raffleId).then((a) => {
      if (active) setAnalytics(a);
    });
    return () => {
      active = false;
    };
  }, [raffleId]);

  const series = analytics?.salesSeries ?? new Array(14).fill(0);
  const hasSales = series.some((v) => v > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Revenue"
          value={analytics?.revenue ?? 0}
          prefix="ETB "
          delta={0}
          icon={Wallet}
          series={series}
        />
        <StatCard
          label="Tickets sold"
          value={analytics?.sold ?? 0}
          delta={0}
          icon={Ticket}
          series={series}
        />
        <StatCard
          label="Capacity"
          value={analytics?.cap ?? analytics?.sold ?? 0}
          delta={0}
          icon={Zap}
          series={series}
        />
      </div>

      <SpotlightCard className="p-6" lift={false}>
        <CardHeader title="Ticket sales" subtitle="Daily volume for this raffle" />
        {hasSales ? (
          <SalesChart series={series} />
        ) : (
          <div className="flex h-44 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-zinc-300">No sales in the last 14 days</p>
          </div>
        )}
      </SpotlightCard>
    </div>
  );
}

function EditTab({
  raffle,
  onSaved,
  onCancelled,
}: {
  raffle: RaffleManageDetail;
  onSaved: (r: RaffleManageDetail) => void;
  onCancelled: () => void;
}) {
  const [description, setDescription] = useState(raffle.description ?? "");
  const [prizeValue, setPrizeValue] = useState(raffle.prizeValue?.toString() ?? "");
  const [ticketPrice, setTicketPrice] = useState(raffle.ticketPrice.toString());
  const [ticketCap, setTicketCap] = useState(raffle.ticketCap?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = raffle.ticketsSoldCount > 0;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateRaffleDetails(raffle.id, {
        description: description || null,
        imageUrls: raffle.imageUrls,
        prizeValue: prizeValue ? Number(prizeValue) : null,
        ticketPrice: locked ? raffle.ticketPrice : Number(ticketPrice),
        ticketCap: locked ? raffle.ticketCap : ticketCap ? Number(ticketCap) : null,
      });
      onSaved({
        ...raffle,
        description: description || null,
        prizeValue: prizeValue ? Number(prizeValue) : null,
        ticketPrice: locked ? raffle.ticketPrice : Number(ticketPrice),
        ticketCap: locked ? raffle.ticketCap : ticketCap ? Number(ticketCap) : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel this raffle? This can't be undone.")) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelRaffle(raffle.id);
      onCancelled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't cancel this raffle.");
      setCancelling(false);
    }
  }

  return (
    <SpotlightCard className="space-y-5 p-6" lift={false}>
      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell entrants about the prize…"
        />
      </Field>

      <Field label="Prize value (optional)" hint="Shown to entrants as a trust signal">
        <PrefixInput
          prefix="ETB"
          type="number"
          min={0}
          value={prizeValue}
          onChange={(e) => setPrizeValue(e.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Ticket price"
          hint={locked ? "Locked — tickets have sold" : undefined}
        >
          <PrefixInput
            prefix="ETB"
            type="number"
            min={0}
            disabled={locked}
            value={locked ? raffle.ticketPrice : ticketPrice}
            onChange={(e) => setTicketPrice(e.target.value)}
          />
        </Field>
        <Field
          label="Ticket cap"
          hint={locked ? "Locked — tickets have sold" : "Leave blank for unlimited"}
        >
          <Input
            type="number"
            min={raffle.ticketsSoldCount}
            disabled={locked}
            value={locked ? (raffle.ticketCap ?? "") : ticketCap}
            onChange={(e) => setTicketCap(e.target.value)}
          />
        </Field>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <Button variant="primary" size="md" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>

        {raffle.status === "live" && raffle.ticketsSoldCount === 0 && (
          <Button
            variant="ghost"
            size="md"
            onClick={handleCancel}
            disabled={cancelling}
            className="text-rose-300 hover:text-rose-200"
          >
            <XCircle strokeWidth={1.5} className="h-4 w-4" />
            {cancelling ? "Cancelling…" : "Cancel raffle"}
          </Button>
        )}
      </div>
    </SpotlightCard>
  );
}

function OrdersTab({ raffleId }: { raffleId: string }) {
  const [orders, setOrders] = useState<RaffleOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchRaffleOrdersForHost(raffleId).then((rows) => {
      if (!active) return;
      setOrders(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [raffleId]);

  if (loading) {
    return (
      <div className="grid min-h-[30vh] place-items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-zinc-300">No orders yet</p>
        <p className="max-w-sm text-xs text-zinc-500">
          Entrant orders and contact details will show up here once tickets sell.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-4 py-3">Entrant</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Tickets</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {orders.map((o) => (
            <tr key={o.paymentId}>
              <td className="px-4 py-3 text-zinc-200">{o.contact?.fullName ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-400">
                {o.contact ? (
                  <>
                    <div>{o.contact.phone}</div>
                    <div className="text-xs text-zinc-500">{o.contact.email}</div>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 tabular-nums text-zinc-300">
                {o.ticketNumbers.length}
              </td>
              <td className="px-4 py-3 tabular-nums text-zinc-300">
                {o.amountGross != null ? formatCurrency(o.amountGross) : "—"}
              </td>
              <td className="px-4 py-3">
                <Badge tone={o.status === "held" || o.status === "released" ? "live" : "neutral"}>
                  {o.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
