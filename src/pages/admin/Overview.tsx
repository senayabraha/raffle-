import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ticket,
  BarChart3,
  Wallet,
  Users,
  ShieldAlert,
  Crown,
  ChevronRight,
  Image,
  Star,
  Activity,
  Trophy,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Button } from "@/components/ui/Button";
import {
  fetchAdminOverview,
  fetchRecentActivity,
  type AdminOverview as AdminOverviewData,
  type AdminActivityRow,
} from "@/lib/admin";
import { fetchHeroSettings, updateHeroSettings } from "@/lib/hero";
import { formatCurrency, formatCompact, formatRelativeTime } from "@/lib/utils";

const SCALE_MIN = 0.65;
const SCALE_MAX = 1.0;
const SCALE_STEP = 0.01;

interface SiteScaleValues {
  scale_mobile: number;
  scale_tablet: number;
  scale_desktop: number;
}

const SCALE_SLIDERS: { field: keyof SiteScaleValues; label: string }[] = [
  { field: "scale_mobile", label: "Mobile (phones)" },
  { field: "scale_tablet", label: "Tablet (iPad)" },
  { field: "scale_desktop", label: "Desktop" },
];

function SiteScaleSettings() {
  const [values, setValues] = useState<SiteScaleValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchHeroSettings()
      .then((settings) => {
        setValues({
          scale_mobile: settings.scale_mobile,
          scale_tablet: settings.scale_tablet,
          scale_desktop: settings.scale_desktop,
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load site scale settings.");
      });
  }, []);

  function handleSlider(field: keyof SiteScaleValues, value: number) {
    setValues((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function handleSave() {
    if (!values) return;
    setSaving(true);
    setError(null);
    try {
      await updateHeroSettings(values);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save site scale settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SpotlightCard lift={false} className="mt-6 p-5">
      <CardHeader
        title="Site Display Scale"
        subtitle="Controls how zoomed in the public site appears to visitors. Does not affect the admin panel."
      />

      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

      {!values ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {SCALE_SLIDERS.map(({ field, label }) => (
            <div key={field}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{label}</p>
                <span className="text-sm text-ink-subtle">{Math.round(values[field] * 100)}%</span>
              </div>
              <input
                type="range"
                min={SCALE_MIN}
                max={SCALE_MAX}
                step={SCALE_STEP}
                value={values[field]}
                onChange={(e) => handleSlider(field, Number(e.target.value))}
                className="mt-2 w-full accent-accent"
              />
            </div>
          ))}

          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {saved && <span className="text-sm text-emerald-400">Saved</span>}
          </div>

          <p className="text-xs text-ink-subtle">Changes apply immediately for all visitors after saving.</p>
        </div>
      )}
    </SpotlightCard>
  );
}

const cards = [
  {
    key: "liveRaffleCount",
    label: "Live raffles",
    icon: Ticket,
    format: "count" as const,
    to: "/en/admin/raffles?filter=live",
  },
  {
    key: "totalRaffleCount",
    label: "Total raffles",
    icon: BarChart3,
    format: "count" as const,
    to: "/en/admin/raffles",
  },
  { key: "grossVolume", label: "Gross volume", icon: Wallet, format: "currency" as const, to: null },
  {
    key: "platformCommission",
    label: "Platform commission",
    icon: Crown,
    format: "currency" as const,
    to: null,
  },
  {
    key: "userCount",
    label: "Registered users",
    icon: Users,
    format: "count" as const,
    to: "/en/admin/users",
  },
  { key: "hostCount", label: "Hosts", icon: Users, format: "count" as const, to: "/en/admin/users?filter=hosts" },
  {
    key: "disputedCount",
    label: "Open disputes",
    icon: ShieldAlert,
    format: "count" as const,
    to: "/en/admin/disputes",
  },
] satisfies Array<{
  key: keyof AdminOverviewData;
  label: string;
  icon: typeof Ticket;
  format: "count" | "currency";
  to: string | null;
}>;

const quickActions = [
  { label: "Manage Hero Carousel", icon: Image, to: "/en/admin/hero" },
  { label: "Manage Featured Raffles", icon: Star, to: "/en/admin/featured" },
];

const ACTIVITY_ICON: Record<string, typeof Ticket> = {
  set_raffle_status: Ticket,
  resolve_dispute: ShieldAlert,
};

function activityIcon(action: string) {
  if (action.includes("dispute")) return ShieldAlert;
  if (action.includes("draw")) return Trophy;
  if (action.includes("raffle")) return Ticket;
  return ACTIVITY_ICON[action] ?? Activity;
}

function activityDescription(row: AdminActivityRow): string {
  const target = row.targetTable === "raffles" ? "a raffle" : row.targetTable === "winners" ? "a dispute" : "a user";
  const verb = row.action.replace(/_/g, " ");
  return `${row.actorName} ${verb} for ${target}${row.reason ? ` — ${row.reason}` : ""}`;
}

export default function Overview() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [activity, setActivity] = useState<AdminActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAdminOverview().then((result) => {
      if (!active) return;
      setData(result);
      setLoading(false);
    });
    fetchRecentActivity().then((rows) => {
      if (!active) return;
      setActivity(rows);
      setActivityLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Overview</h1>
      <p className="mt-1 text-sm text-ink-subtle">Platform-wide totals across all hosts and raffles.</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {cards.map(({ key, label, icon: Icon, format, to }) => {
          const tappable = to !== null;
          return (
            <SpotlightCard
              key={key}
              className={tappable ? "cursor-pointer p-5" : "p-5"}
              onClick={tappable ? () => navigate(to) : undefined}
            >
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-accent-soft">
                  <Icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
                </div>
                {tappable && <ChevronRight strokeWidth={1.5} className="h-4 w-4 text-ink-subtle" />}
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
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight text-ink">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {quickActions.map(({ label, icon: Icon, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-all duration-300 ease-premium hover:border-accent/40 hover:text-accent-soft"
            >
              <Icon strokeWidth={1.5} className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <SiteScaleSettings />

      <div className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight text-ink">Recent activity</h2>
        <SpotlightCard lift={false} className="mt-3 p-5">
          {activityLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-ink-subtle">No recent activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((row) => {
                const Icon = activityIcon(row.action);
                return (
                  <li key={row.id} className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-line bg-surface text-accent-soft">
                      <Icon strokeWidth={1.5} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{activityDescription(row)}</p>
                      <p className="mt-0.5 text-xs text-ink-subtle">{formatRelativeTime(row.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}
