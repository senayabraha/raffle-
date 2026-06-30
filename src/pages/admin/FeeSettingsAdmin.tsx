import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import {
  fetchFeeSettings,
  updateFeeSettings,
  type FeeSettings,
} from "@/lib/raffles";

/** The five editable rate fields, in display order. */
const FIELDS: {
  key: keyof Pick<
    FeeSettings,
    | "lottery_tax_rate"
    | "winner_tax_rate"
    | "social_contribution_rate"
    | "platform_fee_rate"
    | "payment_processing_rate"
  >;
  label: string;
  hint?: string;
}[] = [
  { key: "lottery_tax_rate", label: "Lottery Association Tax" },
  { key: "winner_tax_rate", label: "Winner Prize Tax", hint: "of prize value" },
  { key: "social_contribution_rate", label: "Social Contribution" },
  { key: "platform_fee_rate", label: "Platform Fee" },
  { key: "payment_processing_rate", label: "Payment Processing Fee" },
];

type FormState = Record<(typeof FIELDS)[number]["key"], string>;

/** decimal (0.15) → percent string ("15") for display, trimming trailing zeros. */
function toPercentStr(decimal: number): string {
  return String(+(decimal * 100).toFixed(4));
}

export default function FeeSettingsAdmin() {
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [updatedByLabel, setUpdatedByLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function hydrate(data: FeeSettings) {
    setSettings(data);
    setForm({
      lottery_tax_rate: toPercentStr(data.lottery_tax_rate),
      winner_tax_rate: toPercentStr(data.winner_tax_rate),
      social_contribution_rate: toPercentStr(data.social_contribution_rate),
      platform_fee_rate: toPercentStr(data.platform_fee_rate),
      payment_processing_rate: toPercentStr(data.payment_processing_rate),
    });
  }

  async function resolveUpdatedBy(userId: string | null) {
    if (!userId) {
      setUpdatedByLabel(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    setUpdatedByLabel(data?.full_name?.trim() || data?.email || userId);
  }

  useEffect(() => {
    fetchFeeSettings()
      .then((data) => {
        hydrate(data as FeeSettings);
        void resolveUpdatedBy((data as FeeSettings).updated_by);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load fee settings.");
      })
      .finally(() => setLoading(false));
  }, []);

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  // Live "total deducted" preview (excludes the winner prize tax, which is a
  // fixed share of the prize rather than a cut of revenue).
  const totalDeductedPct = form
    ? FIELDS.filter((f) => f.key !== "winner_tax_rate").reduce(
        (sum, f) => sum + (Number(form[f.key]) || 0),
        0,
      )
    : 0;

  const invalidField = form
    ? FIELDS.find((f) => {
        const n = Number(form[f.key]);
        return form[f.key].trim() === "" || Number.isNaN(n) || n < 0 || n > 100;
      })
    : undefined;

  async function handleSave() {
    if (!form || invalidField) {
      if (invalidField) {
        setError(`${invalidField.label} must be a percentage between 0 and 100.`);
      }
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload: Partial<FeeSettings> = {
        lottery_tax_rate: Number(form.lottery_tax_rate) / 100,
        winner_tax_rate: Number(form.winner_tax_rate) / 100,
        social_contribution_rate: Number(form.social_contribution_rate) / 100,
        platform_fee_rate: Number(form.platform_fee_rate) / 100,
        payment_processing_rate: Number(form.payment_processing_rate) / 100,
      };
      const updated = (await updateFeeSettings(payload)) as FeeSettings;
      hydrate(updated);
      void resolveUpdatedBy(updated.updated_by);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update fee settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Platform fees &amp; taxes</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        These rates apply to every raffle's revenue planner and review calculations
        platform-wide.
      </p>

      {/* Warning banner */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-relaxed text-amber-200">
        <AlertTriangle strokeWidth={1.5} className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Changing these rates affects revenue projections for all hosts immediately,
          including raffles already in progress. Existing published raffles are not
          recalculated retroactively — only the planner and review steps for drafts in
          progress.
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader title="Rates" subtitle="Enter each rate as a percentage." />

        {loading || !form ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4">
                <label htmlFor={f.key} className="text-sm font-medium text-ink">
                  {f.label}
                  {f.hint && (
                    <span className="ml-1.5 text-xs font-normal text-ink-subtle">({f.hint})</span>
                  )}
                </label>
                <div className="relative w-32 shrink-0">
                  <input
                    id={f.key}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    max={100}
                    value={form[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="focus-ring h-11 w-full rounded-xl border border-line bg-surface pl-3.5 pr-8 text-right text-sm text-ink transition-colors duration-300 hover:border-line focus:border-accent/50"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-subtle">
                    %
                  </span>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
              <span className="text-sm font-semibold text-ink">
                Total deducted
                <span className="ml-1.5 text-xs font-normal text-ink-subtle">
                  (excl. winner tax)
                </span>
              </span>
              <div className="relative w-32 shrink-0">
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={+totalDeductedPct.toFixed(4)}
                  className="h-11 w-full cursor-default rounded-xl border border-line bg-app/40 pl-3.5 pr-8 text-right text-sm font-semibold text-ink"
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-subtle">
                  %
                </span>
              </div>
            </div>
          </div>
        )}

        {settings?.updated_at && (
          <p className="mt-5 text-xs text-ink-subtle">
            Last updated: {new Date(settings.updated_at).toLocaleString("en-GB")}
            {updatedByLabel ? ` by ${updatedByLabel}` : ""}
          </p>
        )}

        {saved && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-400">
            <Check strokeWidth={2} className="h-4 w-4" />
            Fee settings updated — changes apply to all new and existing draft
            calculations immediately
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={loading || saving || !form || !!invalidField}
          >
            {saving ? (
              <>
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </SpotlightCard>
    </div>
  );
}
