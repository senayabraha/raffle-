import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  ListOrdered,
  Lock,
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
import {
  Field,
  Input,
  PrefixInput,
  Segmented,
  Switch,
  Textarea,
} from "@/components/ui/Form";
import {
  cancelRaffle,
  extendDrawDate,
  fetchRaffleAnalytics,
  fetchRaffleForManage,
  fetchRaffleOrdersForHost,
  parseBundles,
  requestCancellation,
  updateRaffleDetails,
  type RaffleAnalytics,
  type RaffleManageDetail,
  type RaffleOrder,
} from "@/lib/raffles";
import { categories } from "@/data/marketplace";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

type Tab = "overview" | "edit" | "orders";

const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "edit", label: "Edit", icon: PencilLine },
  { key: "orders", label: "Orders", icon: ListOrdered },
];

const prizeCategories = categories.filter((c) => c !== "All");

const conditionOptions = [
  { value: "new" as const, label: "New" },
  { value: "used" as const, label: "Used" },
  { value: "refurbished" as const, label: "Refurbished" },
];

const deliveryOptions = [
  { value: "shipping" as const, label: "Shipping" },
  { value: "pickup" as const, label: "Pickup" },
  { value: "digital" as const, label: "Digital" },
  { value: "cash_equivalent" as const, label: "Cash equivalent" },
];

/** Converts an ISO timestamp to the `YYYY-MM-DDTHH:mm` shape a datetime-local input wants. */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function formatDrawDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function drawTypeLabel(type: RaffleManageDetail["drawType"]): string {
  switch (type) {
    case "soldout":
      return "When sold out";
    case "hybrid":
      return "On a date or when sold out";
    default:
      return "On a date";
  }
}

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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        </div>
      </AppShell>
    );
  }

  if (!raffle) {
    return (
      <AppShell>
        <Link
          to="/en/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="glass flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-base font-semibold text-ink">Raffle not found</p>
          <p className="max-w-sm text-sm text-ink-subtle">
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
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-accent-soft">
          <Trophy strokeWidth={1.5} className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tightest text-ink sm:text-3xl">
            {raffle.title}
          </h1>
          <p className="text-sm text-ink-subtle">
            {raffle.ticketsSoldCount.toLocaleString()} tickets sold
          </p>
        </div>
        <Badge tone={raffle.status === "live" ? "live" : "neutral"} dot={raffle.status === "live"} className="ml-auto">
          {raffle.status[0].toUpperCase() + raffle.status.slice(1)}
        </Badge>
      </div>

      {/* Tab strip */}
      <div className="mb-6 inline-flex rounded-xl border border-line bg-surface p-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`focus-ring inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-300 ${
                active ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"
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
            <p className="text-sm font-medium text-ink">No sales in the last 14 days</p>
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
  const locked = raffle.ticketsSoldCount > 0;
  return locked ? (
    <LockedEditTab raffle={raffle} onSaved={onSaved} />
  ) : (
    <FullEditForm raffle={raffle} onSaved={onSaved} onCancelled={onCancelled} />
  );
}

/* ---------- State A: no tickets sold — full editable form ---------- */
function FullEditForm({
  raffle,
  onSaved,
  onCancelled,
}: {
  raffle: RaffleManageDetail;
  onSaved: (r: RaffleManageDetail) => void;
  onCancelled: () => void;
}) {
  const initialBundle = parseBundles(raffle.bundleRules)[0];

  const [title, setTitle] = useState(raffle.title);
  const [description, setDescription] = useState(raffle.description ?? "");
  const [category, setCategory] = useState(raffle.category ?? prizeCategories[0]);
  const [prizeValue, setPrizeValue] = useState(raffle.prizeValue?.toString() ?? "");
  const [condition, setCondition] = useState<NonNullable<RaffleManageDetail["condition"]>>(
    raffle.condition ?? "new",
  );
  const [deliveryMethod, setDeliveryMethod] = useState<
    NonNullable<RaffleManageDetail["deliveryMethod"]>
  >(raffle.deliveryMethod ?? "shipping");
  const [ticketPrice, setTicketPrice] = useState(raffle.ticketPrice.toString());
  const [unlimited, setUnlimited] = useState(raffle.ticketCap == null);
  const [ticketCap, setTicketCap] = useState(raffle.ticketCap?.toString() ?? "");
  const [bundlesEnabled, setBundlesEnabled] = useState(initialBundle != null);
  const [bundleQty, setBundleQty] = useState((initialBundle?.qty ?? 5).toString());
  const [bundleFree, setBundleFree] = useState((initialBundle?.free ?? 1).toString());
  const [drawType, setDrawType] = useState<"date" | "soldout">(
    raffle.drawType === "soldout" ? "soldout" : "date",
  );
  const [drawDate, setDrawDate] = useState(toDatetimeLocal(raffle.drawDate));
  const [minTicketTarget, setMinTicketTarget] = useState(
    raffle.minTicketTarget?.toString() ?? "",
  );
  const [visibility, setVisibility] = useState<"public" | "private">(raffle.visibility);

  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function validate(): string | null {
    if (title.trim().length < 3) return "Give your prize a title (3+ characters).";
    if (bundlesEnabled && Number(bundleFree) >= Number(bundleQty)) {
      return "Bundle free tickets must be fewer than the quantity bought.";
    }
    if (drawType === "date") {
      if (!drawDate) return "Pick a draw date.";
      if (new Date(drawDate).getTime() <= Date.now()) {
        return "The draw date must be in the future.";
      }
    }
    return null;
  }

  async function save() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);

    const nextBundleRules = bundlesEnabled
      ? [{ buy: Number(bundleQty), free: Number(bundleFree) }]
      : [];
    const nextDrawDate =
      drawType === "date" && drawDate ? new Date(drawDate).toISOString() : null;
    const nextTicketCap = unlimited ? null : ticketCap ? Number(ticketCap) : null;
    const nextPrizeValue = prizeValue ? Number(prizeValue) : null;
    const nextMinTarget = minTicketTarget ? Number(minTicketTarget) : null;

    try {
      await updateRaffleDetails(raffle.id, {
        title: title.trim(),
        description: description || null,
        category,
        prizeValue: nextPrizeValue,
        ticketPrice: Number(ticketPrice),
        ticketCap: nextTicketCap,
        bundleRules: nextBundleRules,
        drawType,
        drawDate: nextDrawDate,
        minTicketTarget: nextMinTarget,
        visibility,
        condition,
        deliveryMethod,
        imageUrls: raffle.imageUrls,
      });
      onSaved({
        ...raffle,
        title: title.trim(),
        description: description || null,
        category,
        prizeValue: nextPrizeValue,
        ticketPrice: Number(ticketPrice),
        ticketCap: nextTicketCap,
        bundleRules: nextBundleRules,
        drawType,
        drawDate: nextDrawDate,
        minTicketTarget: nextMinTarget,
        visibility,
        condition,
        deliveryMethod,
      });
      setSaved(true);
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
    <SpotlightCard className="space-y-8 p-6" lift={false}>
      {/* Prize details */}
      <section className="space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
          Prize details
        </h2>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell entrants about the prize…"
          />
        </Field>
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="focus-ring h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink transition-colors duration-300 hover:border-line focus:border-accent/50"
          >
            {prizeCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
        <Field label="Condition">
          <Segmented options={conditionOptions} value={condition} onChange={setCondition} />
        </Field>
        <Field label="Delivery method">
          <Segmented
            options={deliveryOptions}
            value={deliveryMethod}
            onChange={setDeliveryMethod}
          />
        </Field>
      </section>

      {/* Ticket settings */}
      <section className="space-y-5 border-t border-line pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
          Ticket settings
        </h2>
        <Field label="Ticket price">
          <PrefixInput
            prefix="ETB"
            type="number"
            min={0}
            value={ticketPrice}
            onChange={(e) => setTicketPrice(e.target.value)}
          />
        </Field>
        <Field
          label="Ticket cap"
          hint={unlimited ? "Unlimited tickets" : "Leave blank for unlimited"}
        >
          <div className="space-y-3">
            <Input
              type="number"
              min={1}
              disabled={unlimited}
              value={unlimited ? "" : ticketCap}
              onChange={(e) => setTicketCap(e.target.value)}
              placeholder={unlimited ? "Unlimited" : undefined}
            />
            <label className="flex items-center gap-3 text-sm text-ink-muted">
              <Switch checked={unlimited} onChange={setUnlimited} />
              Unlimited tickets
            </label>
          </div>
        </Field>
        <Field label="Bundle deal">
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-ink-muted">
              <Switch checked={bundlesEnabled} onChange={setBundlesEnabled} />
              Offer a “buy X, get Y free” bundle
            </label>
            {bundlesEnabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Buy">
                  <Input
                    type="number"
                    min={1}
                    value={bundleQty}
                    onChange={(e) => setBundleQty(e.target.value)}
                  />
                </Field>
                <Field label="Get free">
                  <Input
                    type="number"
                    min={1}
                    value={bundleFree}
                    onChange={(e) => setBundleFree(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
        </Field>
      </section>

      {/* Draw settings */}
      <section className="space-y-5 border-t border-line pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
          Draw settings
        </h2>
        <Field label="Draw type">
          <Segmented
            options={[
              { value: "date", label: "On a date" },
              { value: "soldout", label: "When sold out" },
            ]}
            value={drawType}
            onChange={setDrawType}
          />
        </Field>
        {drawType === "date" && (
          <Field label="Draw date">
            <Input
              type="datetime-local"
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
            />
          </Field>
        )}
        <Field
          label="Minimum ticket target"
          hint="Draw cancels automatically if this isn’t reached"
        >
          <Input
            type="number"
            min={0}
            value={minTicketTarget}
            onChange={(e) => setMinTicketTarget(e.target.value)}
          />
        </Field>
      </section>

      {/* Visibility */}
      <section className="space-y-5 border-t border-line pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
          Visibility
        </h2>
        <Field label="Who can see this raffle">
          <Segmented
            options={[
              { value: "public", label: "Public marketplace" },
              { value: "private", label: "Private link only" },
            ]}
            value={visibility}
            onChange={setVisibility}
          />
        </Field>
      </section>

      {error && <p className="text-sm text-rose-300">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-300">Changes saved.</p>}

      <div className="flex items-center justify-between gap-3 border-t border-line pt-6">
        <Button variant="primary" size="md" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>

        {raffle.status === "live" && (
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

/* ---------- State B: tickets sold — locked summary + extension + cancel request ---------- */
function LockedEditTab({
  raffle,
  onSaved,
}: {
  raffle: RaffleManageDetail;
  onSaved: (r: RaffleManageDetail) => void;
}) {
  return (
    <SpotlightCard className="space-y-6 p-6" lift={false}>
      <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <Lock strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div>
          <p className="text-sm font-semibold text-amber-200">
            Locked — tickets have sold
          </p>
          <p className="mt-0.5 text-xs text-amber-200/70">
            To protect entrants, the raffle's core terms can no longer be changed.
          </p>
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <LockedRow label="Ticket price" value={formatCurrency(raffle.ticketPrice)} />
        <LockedRow
          label="Ticket cap"
          value={raffle.ticketCap != null ? raffle.ticketCap.toLocaleString() : "Unlimited"}
        />
        <LockedRow label="Draw type" value={drawTypeLabel(raffle.drawType)} />
        <LockedRow label="Draw date" value={formatDrawDate(raffle.drawDate)} />
      </dl>

      {raffle.drawType === "date" && (
        <DrawDateExtension raffle={raffle} onSaved={onSaved} />
      )}

      <CancellationRequest raffle={raffle} onSaved={onSaved} />
    </SpotlightCard>
  );
}

function LockedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-ink-subtle">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function DrawDateExtension({
  raffle,
  onSaved,
}: {
  raffle: RaffleManageDetail;
  onSaved: (r: RaffleManageDetail) => void;
}) {
  const [newDate, setNewDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const remaining = 2 - raffle.drawDateExtensionCount;
  const exhausted = raffle.drawDateExtensionCount >= 2;

  function validate(): string | null {
    if (!newDate) return "Pick a new draw date.";
    const proposed = new Date(newDate).getTime();
    if (proposed <= Date.now()) return "The new date must be in the future.";
    if (!raffle.drawDate) return null;
    const current = new Date(raffle.drawDate).getTime();
    if (proposed <= current) return "The new date must be after the current draw date.";
    if (proposed > current + 15 * 86_400_000) {
      return "Each extension is capped at 15 days beyond the current draw date.";
    }
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await extendDrawDate(raffle.id, newDate);
      onSaved({
        ...raffle,
        drawDate: result.drawDate,
        drawDateExtensionCount: result.extensionCount,
      });
      setSuccess("Draw date extended.");
      setNewDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't extend the draw date.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4 border-t border-line pt-6">
      <div className="flex items-center gap-2">
        <CalendarClock strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
        <h2 className="text-sm font-semibold text-ink">Extend draw date</h2>
      </div>

      <p className="text-sm text-ink-muted">
        Current draw date:{" "}
        <span className="font-medium text-ink">{formatDrawDate(raffle.drawDate)}</span>
      </p>

      {exhausted ? (
        <p className="text-sm text-ink-subtle">No extensions remaining</p>
      ) : (
        <>
          <p className="text-xs text-ink-subtle">
            {raffle.drawDateExtensionCount} of 2 extensions used
            {remaining === 1 ? " · 1 left" : " · 2 left"}
          </p>
          <Field
            label="New draw date"
            hint="Up to 15 days beyond the current date"
          >
            <Input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {success && <p className="text-sm text-emerald-300">{success}</p>}
          <Button variant="primary" size="md" onClick={submit} disabled={submitting}>
            {submitting ? "Extending…" : "Extend draw date"}
          </Button>
        </>
      )}
    </section>
  );
}

function CancellationRequest({
  raffle,
  onSaved,
}: {
  raffle: RaffleManageDetail;
  onSaved: (r: RaffleManageDetail) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < 20) {
      setError("Please give a reason of at least 20 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestCancellation(raffle.id, reason.trim());
      onSaved({ ...raffle, hasPendingCancelRequest: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't submit the cancellation request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4 border-t border-line pt-6">
      {raffle.hasPendingCancelRequest ? (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-ink-muted">
            Cancellation request pending — an admin will review it shortly.
          </p>
        </div>
      ) : open ? (
        <div className="space-y-3">
          <Field
            label="Reason for cancellation"
            hint="Minimum 20 characters"
          >
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this raffle needs to be cancelled…"
            />
          </Field>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={submit}
              disabled={submitting}
              className="bg-rose-500/90 shadow-none hover:brightness-110"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              disabled={submitting}
            >
              Back
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="md"
          onClick={() => setOpen(true)}
          className="text-rose-300 hover:text-rose-200"
        >
          <XCircle strokeWidth={1.5} className="h-4 w-4" />
          Request cancellation
        </Button>
      )}
    </section>
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-ink">No orders yet</p>
        <p className="max-w-sm text-xs text-ink-subtle">
          Entrant orders will show up here once tickets sell.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-subtle">
          <tr>
            <th className="px-4 py-3">Entrant</th>
            <th className="px-4 py-3">Tickets</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {orders.map((o) => (
            <tr key={o.paymentId}>
              <td className="px-4 py-3 text-ink">{o.contact?.fullName ?? "—"}</td>
              <td className="px-4 py-3 tabular-nums text-ink">
                {o.ticketNumbers.length}
              </td>
              <td className="px-4 py-3 tabular-nums text-ink">
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
