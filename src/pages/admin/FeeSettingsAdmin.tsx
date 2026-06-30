import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Form";
import { supabase } from "@/lib/supabase";
import {
  fetchFeeSettings,
  updateFeeSettings,
  type FeeSettings,
} from "@/lib/raffles";

type RateKey =
  | "lottery_tax_rate"
  | "winner_tax_rate"
  | "social_contribution_rate"
  | "platform_fee_rate"
  | "payment_processing_rate";

type EnabledKey =
  | "lottery_tax_enabled"
  | "winner_tax_enabled"
  | "social_contribution_enabled"
  | "platform_fee_enabled"
  | "payment_processing_enabled";

/** The five editable fee rows, in display order. */
const FIELDS: {
  rateKey: RateKey;
  enabledKey: EnabledKey;
  label: string;
  hint?: string;
  /**
   * Real Ethiopian tax obligations. Turning one of these OFF surfaces an extra
   * legal-acknowledgement warning before the change is saved (Lottery + Winner).
   */
  legalWeight?: boolean;
}[] = [
  {
    rateKey: "lottery_tax_rate",
    enabledKey: "lottery_tax_enabled",
    label: "Lottery Association Tax",
    legalWeight: true,
  },
  {
    rateKey: "winner_tax_rate",
    enabledKey: "winner_tax_enabled",
    label: "Winner Prize Tax",
    hint: "of prize value",
    legalWeight: true,
  },
  {
    rateKey: "social_contribution_rate",
    enabledKey: "social_contribution_enabled",
    label: "Social Contribution",
  },
  {
    rateKey: "platform_fee_rate",
    enabledKey: "platform_fee_enabled",
    label: "Platform Fee",
  },
  {
    rateKey: "payment_processing_rate",
    enabledKey: "payment_processing_enabled",
    label: "Payment Processing Fee",
  },
];

type FormState = {
  rates: Record<RateKey, string>;
  enabled: Record<EnabledKey, boolean>;
};

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
  // When set, the legal-acknowledgement warning is shown with these field labels
  // before the save proceeds (Lottery/Winner tax being turned OFF).
  const [legalWarning, setLegalWarning] = useState<string[] | null>(null);

  function hydrate(data: FeeSettings) {
    setSettings(data);
    setForm({
      rates: {
        lottery_tax_rate: toPercentStr(data.lottery_tax_rate),
        winner_tax_rate: toPercentStr(data.winner_tax_rate),
        social_contribution_rate: toPercentStr(data.social_contribution_rate),
        platform_fee_rate: toPercentStr(data.platform_fee_rate),
        payment_processing_rate: toPercentStr(data.payment_processing_rate),
      },
      enabled: {
        lottery_tax_enabled: data.lottery_tax_enabled,
        winner_tax_enabled: data.winner_tax_enabled,
        social_contribution_enabled: data.social_contribution_enabled,
        platform_fee_enabled: data.platform_fee_enabled,
        payment_processing_enabled: data.payment_processing_enabled,
      },
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

  function setRate(key: RateKey, value: string) {
    setForm((prev) =>
      prev ? { ...prev, rates: { ...prev.rates, [key]: value } } : prev,
    );
    setSaved(false);
  }

  // Toggling a fee OFF disables its rate input but keeps the held value in form
  // state, so toggling back ON restores it intact (never reset to 0 or blank).
  function setEnabled(key: EnabledKey, value: boolean) {
    setForm((prev) =>
      prev ? { ...prev, enabled: { ...prev.enabled, [key]: value } } : prev,
    );
    setSaved(false);
  }

  // Live "total deducted" preview (excludes the winner prize tax, which is a
  // fixed share of the prize rather than a cut of revenue) — and only counts
  // fees that are currently enabled.
  const totalDeductedPct = form
    ? FIELDS.filter(
        (f) => f.rateKey !== "winner_tax_rate" && form.enabled[f.enabledKey],
      ).reduce((sum, f) => sum + (Number(form.rates[f.rateKey]) || 0), 0)
    : 0;

  // Only enabled fees gate the Save button — a disabled fee keeps a retained
  // value that isn't applied to any calculation, so it never blocks saving.
  const invalidField = form
    ? FIELDS.find((f) => {
        if (!form.enabled[f.enabledKey]) return false;
        const raw = form.rates[f.rateKey];
        const n = Number(raw);
        return raw.trim() === "" || Number.isNaN(n) || n < 0 || n > 100;
      })
    : undefined;

  /** Toggles being turned OFF that carry a real legal tax obligation. */
  function legalTogglesGoingOff(f: FormState, current: FeeSettings): string[] {
    return FIELDS.filter(
      (field) =>
        field.legalWeight &&
        current[field.enabledKey] &&
        !f.enabled[field.enabledKey],
    ).map((field) => field.label);
  }

  function handleSaveClick() {
    if (!form || invalidField || !settings) {
      if (invalidField) {
        setError(`${invalidField.label} must be a percentage between 0 and 100.`);
      }
      return;
    }
    const legalOff = legalTogglesGoingOff(form, settings);
    if (legalOff.length > 0) {
      // Surface the legal-obligation acknowledgement before saving.
      setLegalWarning(legalOff);
      return;
    }
    void performSave();
  }

  async function performSave() {
    if (!form || invalidField) return;
    setLegalWarning(null);
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload: Partial<FeeSettings> = {
        lottery_tax_rate: Number(form.rates.lottery_tax_rate) / 100,
        winner_tax_rate: Number(form.rates.winner_tax_rate) / 100,
        social_contribution_rate: Number(form.rates.social_contribution_rate) / 100,
        platform_fee_rate: Number(form.rates.platform_fee_rate) / 100,
        payment_processing_rate: Number(form.rates.payment_processing_rate) / 100,
        lottery_tax_enabled: form.enabled.lottery_tax_enabled,
        winner_tax_enabled: form.enabled.winner_tax_enabled,
        social_contribution_enabled: form.enabled.social_contribution_enabled,
        platform_fee_enabled: form.enabled.platform_fee_enabled,
        payment_processing_enabled: form.enabled.payment_processing_enabled,
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
          Changing these rates or toggles affects revenue projections for all hosts
          immediately, including raffles already in progress. Existing published raffles
          are not recalculated retroactively — only the planner and review steps for
          drafts in progress. A fee toggled off is removed from those breakdowns and
          calculations entirely.
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader
          title="Rates"
          subtitle="Enter each rate as a percentage. Toggle a fee off to exclude it from all breakdowns."
        />

        {loading || !form ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {FIELDS.map((f) => {
              const on = form.enabled[f.enabledKey];
              return (
                <div
                  key={f.rateKey}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor={f.rateKey} className="text-sm font-medium text-ink">
                      {f.label}
                      {f.hint && (
                        <span className="ml-1.5 text-xs font-normal text-ink-subtle">
                          ({f.hint})
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={
                          on
                            ? "text-xs font-semibold text-emerald-400"
                            : "text-xs font-semibold text-ink-subtle"
                        }
                      >
                        {on ? "ON" : "OFF"}
                      </span>
                      <Switch
                        checked={on}
                        onChange={(v) => setEnabled(f.enabledKey, v)}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs font-medium text-ink-subtle">Rate</span>
                    <div className="relative w-32 shrink-0">
                      <input
                        id={f.rateKey}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={100}
                        disabled={!on}
                        value={form.rates[f.rateKey]}
                        onChange={(e) => setRate(f.rateKey, e.target.value)}
                        className="focus-ring h-11 w-full rounded-xl border border-line bg-surface pl-3.5 pr-8 text-right text-sm text-ink transition-colors duration-300 hover:border-line focus:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-subtle">
                        %
                      </span>
                    </div>
                    {!on && (
                      <span className="text-xs text-ink-subtle">
                        Excluded from all breakdowns
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

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
            onClick={handleSaveClick}
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

      {legalWarning && (
        <LegalWarningDialog
          labels={legalWarning}
          onCancel={() => setLegalWarning(null)}
          onContinue={() => void performSave()}
        />
      )}
    </div>
  );
}

/**
 * Shown when an admin turns OFF a fee that maps to a real Ethiopian tax
 * obligation (Lottery Association Tax or Winner Prize Tax). Disabling the toggle
 * only changes what the app displays — it does not waive any legal liability.
 */
function LegalWarningDialog({
  labels,
  onCancel,
  onContinue,
}: {
  labels: string[];
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div onClick={(e) => e.stopPropagation()} className="glass w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <AlertTriangle strokeWidth={1.5} className="h-5 w-5 text-amber-400" />
            This is a real Ethiopian tax obligation
          </h2>
          <button onClick={onCancel} className="text-ink-subtle hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          You're turning off{" "}
          <span className="font-medium text-ink">{labels.join(" and ")}</span>. Turning
          this off only changes what the app displays. It does NOT exempt hosts or
          winners from their actual legal tax obligations to the Ethiopian government.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onContinue}>
            I understand, continue
          </Button>
        </div>
      </div>
    </div>
  );
}
