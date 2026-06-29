import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  CalendarClock,
  PackageCheck,
  Globe,
  Lock,
  Rocket,
  Check,
  Sparkles,
  PartyPopper,
  Loader2,
  AlertCircle,
  X,
  Calculator,
  BarChart3,
  Coins,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  createRaffle,
  updateRaffle,
  uploadRaffleImages,
  fetchHostDraft,
  parseBundles,
  parsePlannerState,
  type RaffleDraftRow,
} from "@/lib/raffles";
import { AppShell } from "@/components/layout/AppShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Field,
  Input,
  PrefixInput,
  Textarea,
  Switch,
  Segmented,
} from "@/components/ui/Form";
import { Stepper, StepperBar, type WizardStep } from "@/components/wizard/Stepper";
import { LivePreview } from "@/components/wizard/LivePreview";
import { initialDraft, type RaffleDraft } from "@/components/wizard/types";
import { categories } from "@/data/marketplace";
import { formatCurrency, cn } from "@/lib/utils";
import { useConfirmOnLeave } from "@/lib/useConfirmOnLeave";

const steps: WizardStep[] = [
  { id: 1, title: "Prize details", desc: "What you're giving away" },
  { id: 2, title: "Revenue planner", desc: "Plan your raffle economics" },
  { id: 3, title: "Ticket settings", desc: "Price, cap & bundles" },
  { id: 4, title: "Schedule & visibility", desc: "Draw date & who can see it" },
  { id: 5, title: "Review", desc: "Check & publish" },
];

const prizeCategories = categories.filter((c) => c !== "All");

/**
 * Cost model for running a raffle on the platform. Hosts keep 59.5% of gross
 * revenue after these deductions. Used by the Revenue Planner (Step 2) and the
 * full-sellout projection in Review (Step 5).
 */
const COSTS = {
  lottery_tax: 0.15, // 15% — Lottery Association Tax
  winner_tax: 0.15, // 15% — Paid Winning Tax
  social_contribution: 0.005, // 0.5% — Good Social Cause Tax
  platform_fee: 0.1, // 10% — Platform Fee (incl. 2.5% processing)
};
/**
 * Revenue-based cost rate — the share of GROSS revenue lost to costs that scale
 * with sales: lottery (15%) + social contribution (0.5%) + platform fee (10%).
 * The winner prize tax is deliberately excluded here: it is a fixed 20% of the
 * prize value, not a cut of revenue.
 */
const REVENUE_COST_RATE =
  COSTS.lottery_tax + COSTS.social_contribution + COSTS.platform_fee; // 0.255
/** Share of gross revenue left after the revenue-based costs (74.5%). */
const REVENUE_KEEP_RATE = 1 - REVENUE_COST_RATE; // 0.745
/** Winner prize tax: a fixed 20% of the prize value, independent of revenue. */
const PLANNER_WINNER_TAX = 0.2;

/**
 * Break-even gross revenue — leaves zero profit after every cost:
 *   gross × (1 - REVENUE_COST_RATE) = prize × (1 + PLANNER_WINNER_TAX)
 *   gross × 0.745                   = prize × 1.20
 */
function plannerBreakeven(draft: RaffleDraft) {
  const prize = draft.prizeValue ?? 0;
  return (prize * (1 + PLANNER_WINNER_TAX)) / REVENUE_KEEP_RATE;
}
/**
 * Gross revenue needed to reach the host's desired profit, worked backwards so
 * the profit they enter is the profit they actually keep:
 *   target × (1 - REVENUE_COST_RATE) = prize × (1 + PLANNER_WINNER_TAX) + profit
 */
function plannerTargetRevenue(draft: RaffleDraft) {
  const prize = draft.prizeValue ?? 0;
  return (
    (prize * (1 + PLANNER_WINNER_TAX) + draft.plannerProfitTargetEtb) / REVENUE_KEEP_RATE
  );
}
/** Tickets that must sell at the chosen price to hit the target revenue. */
function plannerTicketCap(draft: RaffleDraft) {
  const price = draft.plannerTicketPrice;
  if (price <= 0) return 0;
  return Math.ceil(plannerTargetRevenue(draft) / price);
}

/** Rounds a raw price up to the nearest "nice" increment for the chip suggestions. */
function roundToNearestNice(price: number): number {
  if (price < 50) return Math.ceil(price / 10) * 10;
  if (price < 200) return Math.ceil(price / 50) * 50;
  if (price < 1000) return Math.ceil(price / 100) * 100;
  if (price < 5000) return Math.ceil(price / 500) * 500;
  return Math.ceil(price / 1000) * 1000;
}

interface PriceChip {
  price: number;
  tickets: number;
}

/**
 * Four suggested ticket prices derived from the target revenue, aiming for a
 * spread of ticket counts (many cheap tickets → fewer expensive ones).
 * De-duplicates by price in case two targets round to the same nice value.
 */
function generateChips(target: number): PriceChip[] {
  if (target <= 0) return [];
  const targetCounts = [5000, 2000, 1000, 500];
  return targetCounts
    .map((count) => {
      const rawPrice = target / count;
      const rounded = roundToNearestNice(rawPrice);
      const actualCount = Math.ceil(target / rounded);
      return { price: rounded, tickets: actualCount };
    })
    .filter((chip, index, arr) => arr.findIndex((c) => c.price === chip.price) === index);
}

/** Field-level validation errors for the active step. Empty object = step can advance. */
function stepErrors(step: number, draft: RaffleDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  switch (step) {
    case 0:
      if (draft.title.trim().length <= 2) {
        errors.title = "Give your prize a title (3+ characters).";
      }
      break;
    case 1:
      if (!draft.prizeValue || draft.prizeValue <= 0) {
        errors.plannerPrize = "Enter your prize value to plan your raffle.";
      }
      if (draft.plannerTicketPrice <= 0) {
        errors.plannerTicketPrice = "Set a ticket price to continue.";
      } else if (plannerTicketCap(draft) <= 0) {
        errors.plannerTicketCap = "We couldn't work out how many tickets to sell.";
      }
      break;
    case 2:
      if (!draft.unlimited && draft.ticketCap < 1) {
        errors.ticketCap = "Set a ticket cap of at least 1.";
      }
      if (draft.bundlesEnabled && draft.bundleFree >= draft.bundleQty) {
        errors.bundle =
          "Free tickets must be fewer than the buy quantity, or every ticket ends up free.";
      }
      break;
    case 3:
      if (draft.drawType === "date") {
        if (!draft.drawDate) {
          errors.drawDate = "Pick a draw date.";
        } else if (new Date(draft.drawDate).getTime() <= Date.now()) {
          errors.drawDate = "Draw date must be in the future.";
        }
      }
      if (!draft.unlimited && draft.minTicketTarget > draft.ticketCap) {
        errors.minTicketTarget =
          "Can't exceed your ticket cap — the raffle would always be cancelled.";
      }
      break;
  }
  return errors;
}

/** Average revenue per ticket once bundle freebies are factored in. */
function effectivePricePerTicket(draft: RaffleDraft) {
  if (!draft.bundlesEnabled) return draft.ticketPrice;
  const totalTickets = draft.bundleQty + draft.bundleFree;
  if (totalTickets <= 0) return draft.ticketPrice;
  return (draft.bundleQty * draft.ticketPrice) / totalTickets;
}

/** Rehydrates a saved draft row from the DB into wizard form state. */
function draftFromRow(row: RaffleDraftRow): RaffleDraft {
  const bundle = parseBundles(row.bundle_rules)[0];
  const planner = parsePlannerState(row.planner_state);
  return {
    title: row.title,
    description: row.description ?? "",
    category: row.category ?? initialDraft.category,
    prizeValue: row.prize_value,
    condition: row.condition ?? initialDraft.condition,
    deliveryMethod: row.delivery_method ?? initialDraft.deliveryMethod,
    plannerPrizeValue: planner?.prize_value ?? row.prize_value,
    plannerProfitTargetPct: planner?.profit_target_pct ?? initialDraft.plannerProfitTargetPct,
    plannerProfitTargetEtb: planner?.profit_target_etb ?? initialDraft.plannerProfitTargetEtb,
    plannerTicketPrice: planner?.ticket_price ?? initialDraft.plannerTicketPrice,
    plannerTicketCap: planner?.ticket_cap ?? initialDraft.plannerTicketCap,
    ticketPrice: Number(row.ticket_price),
    unlimited: row.ticket_cap == null,
    ticketCap: row.ticket_cap ?? initialDraft.ticketCap,
    bundlesEnabled: !!bundle,
    bundleQty: bundle?.qty ?? initialDraft.bundleQty,
    bundleFree: bundle?.free ?? initialDraft.bundleFree,
    drawType: row.draw_type,
    drawDate: row.draw_date ? toLocalDatetimeInput(row.draw_date) : "",
    minTicketTarget: row.min_ticket_target ?? initialDraft.minTicketTarget,
    visibility: row.visibility,
  };
}

/** Formats an ISO timestamp for an <input type="datetime-local"> value. */
function toLocalDatetimeInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A prize photo that's either already uploaded (resumed draft) or staged locally (new). */
type ImageItem =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; preview: string };

/** Parses a 1-indexed `?step=` param into a 0-indexed wizard index, clamped to range. */
function resumeStepIndex(raw: string | null): number {
  const n = parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1 || n > steps.length) return 0;
  return n - 1;
}

export default function CreateRaffle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId: string }>();
  const [searchParams] = useSearchParams();
  // Resume position comes from the dashboard's "Resume" link (?step=). Out-of-range
  // or missing values fall back to step 1.
  const [step, setStep] = useState(() =>
    draftId ? resumeStepIndex(searchParams.get("step")) : 0,
  );
  const [draft, setDraft] = useState<RaffleDraft>(initialDraft);
  const [raffleId, setRaffleId] = useState<string | null>(null);
  // Source-of-truth id for serialized saves: kept in sync with `raffleId` but
  // readable synchronously so fire-and-forget autosaves never create duplicate
  // draft rows before React commits the id from the first save.
  const raffleIdRef = useRef<string | null>(null);
  // Serialises saves into a single chain so concurrent autosaves don't race
  // (double image uploads, duplicate inserts).
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const [loadingDraft, setLoadingDraft] = useState(!!draftId);
  const [published, setPublished] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dir, setDir] = useState(1);
  const [images, setImages] = useState<ImageItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Lightweight inline toast (no toast lib in the project).
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  // "Resuming your draft" label, shown briefly after a draft loads from a link.
  const [showResuming, setShowResuming] = useState(false);

  function showToast(message: string, ms = 2000) {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (!draftId || !user) return;
    let active = true;
    fetchHostDraft(draftId, user.id).then((row) => {
      if (!active) return;
      if (row) {
        setRaffleId(row.id);
        raffleIdRef.current = row.id;
        setDraft(draftFromRow(row));
        setImages((row.image_urls ?? []).map((url) => ({ kind: "existing", url })));
        // Brief "Resuming your draft" affordance under the step indicator.
        setShowResuming(true);
        window.setTimeout(() => {
          if (active) setShowResuming(false);
        }, 3000);
      } else {
        // Draft deleted/expired — start fresh and tell the host why.
        navigate("/en/dashboard/create", { replace: true });
        showToast("Draft not found — starting fresh");
      }
      setLoadingDraft(false);
    });
    return () => {
      active = false;
    };
  }, [draftId, user, navigate]);

  // Mirror of `images` readable synchronously inside the serialized save chain,
  // so two queued saves never both try to upload the same staged files.
  const imagesRef = useRef<ImageItem[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const set = (patch: Partial<RaffleDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const MAX_IMAGES = 6;
  const imagePreviews = images.map((i) => (i.kind === "existing" ? i.url : i.preview));

  function addImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return;
    const incoming = Array.from(files)
      .slice(0, room)
      .map((file): ImageItem => ({ kind: "new", file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...incoming]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const item = prev[index];
      if (item.kind === "new") URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  /** Uploads any newly-added photos and merges them with already-uploaded URLs, preserving order. */
  async function resolveImageUrls(hostId: string): Promise<string[]> {
    const newFiles = images.filter((i) => i.kind === "new").map((i) => i.file);
    const newUrls = newFiles.length ? await uploadRaffleImages(newFiles, hostId) : [];
    let next = 0;
    return images.map((i) => (i.kind === "existing" ? i.url : newUrls[next++]));
  }

  const errors = stepErrors(step, draft);
  const canAdvance = Object.keys(errors).length === 0;
  const isLast = step === steps.length - 1;
  const hasProgress = step > 0 || draft.title.trim().length > 0;

  useConfirmOnLeave(
    hasProgress && !published,
    "Discard this raffle and leave? Your progress won't be saved.",
  );

  function exitToDashboard() {
    if (
      hasProgress &&
      !published &&
      !window.confirm("Discard this raffle and go back to the dashboard?")
    ) {
      return;
    }
    navigate("/en/dashboard");
  }

  async function publish() {
    if (!user) {
      setError("Your session expired — please log in again.");
      return;
    }
    setError(null);
    setPublishing(true);
    try {
      const imageUrls = await resolveImageUrls(user.id);
      const existingId = raffleIdRef.current ?? raffleId;
      const { slug } = existingId
        ? await updateRaffle(existingId, draft, imageUrls, "live")
        : await createRaffle(draft, user.id, imageUrls, "live");
      setPublishedSlug(slug);
      setPublished(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish your raffle.");
    } finally {
      setPublishing(false);
    }
  }

  /**
   * Persists the current draft (create-or-update) at the given 0-indexed wizard
   * step. Serialised through `saveChainRef` so overlapping calls — a manual save
   * racing a background autosave — can't double-upload images or insert duplicate
   * draft rows. The first create stores its id in `raffleIdRef` so every later
   * save updates that same record. Returns the raffle id.
   */
  function saveDraft(stepIndex: number): Promise<string> {
    const run = saveChainRef.current.then(async () => {
      if (!user) throw new Error("Your session expired — please log in again.");
      // Upload any staged photos using the synchronous mirror, then mark them
      // stored so the next queued save sees "existing" and skips re-uploading.
      const current = imagesRef.current;
      const newFiles = current.filter((i) => i.kind === "new").map((i) => i.file);
      const newUrls = newFiles.length ? await uploadRaffleImages(newFiles, user.id) : [];
      let n = 0;
      const imageUrls = current.map((i) => (i.kind === "existing" ? i.url : newUrls[n++]));
      const storedImages: ImageItem[] = imageUrls.map((url) => ({ kind: "existing", url }));
      imagesRef.current = storedImages;
      setImages(storedImages);

      const currentStep = Math.min(Math.max(stepIndex + 1, 1), steps.length);
      const existingId = raffleIdRef.current;
      const { id } = existingId
        ? await updateRaffle(existingId, draft, imageUrls, "draft", currentStep)
        : await createRaffle(draft, user.id, imageUrls, "draft", currentStep);
      raffleIdRef.current = id;
      setRaffleId(id);
      return id;
    });
    // Keep the chain alive even if this link rejects, so later saves still run.
    saveChainRef.current = run.catch(() => undefined);
    return run;
  }

  /** "Save as draft" button. Toasts on steps 1–4; saves then exits on the last step. */
  async function handleSaveDraftClick() {
    if (!user) {
      setError("Your session expired — please log in again.");
      return;
    }
    setError(null);
    setSavingDraft(true);
    try {
      await saveDraft(step);
      if (isLast) {
        navigate("/en/dashboard");
      } else {
        showToast("Draft saved");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your draft.");
    } finally {
      setSavingDraft(false);
    }
  }

  function next() {
    if (isLast) {
      void publish();
      return;
    }
    const leavingStep = step;
    // Leaving the Revenue Planner: lock its output into the ticket-settings step.
    if (step === 1) {
      const cap = plannerTicketCap(draft);
      set({
        ticketPrice: draft.plannerTicketPrice,
        ticketCap: cap,
        plannerTicketCap: cap,
        unlimited: false,
      });
    }
    // Advance immediately — the UI must never wait on the network.
    setDir(1);
    setStep((s) => Math.min(s + 1, steps.length - 1));
    // Then autosave silently in the background. Fire-and-forget: no await, no
    // toast, no UI block, and failures stay hidden from the host.
    if (user) {
      saveDraft(leavingStep).catch((err) => {
        console.warn("Autosave failed silently:", err);
      });
    }
  }
  function back() {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  if (published) return <PublishedScreen draft={draft} slug={publishedSlug} />;

  if (loadingDraft) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-7">
        <button
          onClick={exitToDashboard}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
          Back to dashboard
        </button>
        <h1 className="text-3xl font-bold tracking-tightest text-ink sm:text-4xl">
          Create a <span className="text-gradient">raffle</span>
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Set up your prize competition in a few steps — you can edit anything
          before it goes live.
        </p>
        <AnimatePresence>
          {showResuming && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent-soft"
            >
              <Sparkles strokeWidth={1.5} className="h-3.5 w-3.5" />
              Resuming your draft
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile progress */}
      <div className="mb-6 lg:hidden">
        <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
          <span className="font-medium text-ink">{steps[step].title}</span>
          <span>
            Step {step + 1} of {steps.length}
          </span>
        </div>
        <StepperBar total={steps.length} current={step} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Stepper */}
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="glass sticky top-24 p-3">
            <Stepper steps={steps} current={step} onJump={setStep} />
          </div>
        </aside>

        {/* Form */}
        <div className="lg:col-span-5">
          <SpotlightCard className="p-6 sm:p-7" lift={false}>
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -24 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <StepHeader index={step} />
                <div className="mt-6 space-y-6">
                  <StepBody
                    step={step}
                    draft={draft}
                    set={set}
                    errors={errors}
                    imagePreviews={imagePreviews}
                    maxImages={MAX_IMAGES}
                    fileInputRef={fileInputRef}
                    onAddImages={addImages}
                    onRemoveImage={removeImage}
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
                <AlertCircle strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Nav */}
            <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
              <Button
                variant="ghost"
                size="md"
                onClick={back}
                disabled={step === 0 || publishing}
                className={cn(step === 0 && "invisible")}
              >
                <ArrowLeft strokeWidth={1.5} className="h-[18px] w-[18px]" />
                Back
              </Button>
              <span className="hidden text-xs text-ink-subtle sm:block">
                Step {step + 1} of {steps.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleSaveDraftClick}
                  disabled={publishing || savingDraft}
                >
                  {savingDraft ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    "Save as draft"
                  )}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={next}
                  disabled={!canAdvance || publishing}
                >
                  {publishing ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                      Publishing…
                    </>
                  ) : isLast ? (
                    <>
                      <Rocket strokeWidth={1.5} className="h-[18px] w-[18px]" />
                      Publish raffle
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Live preview */}
        <aside className="lg:col-span-4">
          <div className="sticky top-24">
            <LivePreview draft={draft} imagePreview={imagePreviews[0] ?? null} />
          </div>
        </aside>
      </div>

      {/* Inline toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-lg backdrop-blur-md">
              <Check strokeWidth={2} className="h-4 w-4 text-emerald-400" />
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

/* ---------------- Step header ---------------- */
function StepHeader({ index }: { index: number }) {
  return (
    <div>
      <Badge tone="accent">
        Step {index + 1} · {steps[index].title}
      </Badge>
      <h2 className="mt-3 text-xl font-bold tracking-tight text-ink">
        {headings[index].title}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{headings[index].sub}</p>
    </div>
  );
}

const headings = [
  { title: "Tell us about the prize", sub: "A clear title and great description sell tickets." },
  {
    title: "Plan your revenue",
    sub: "See the full economics before you set your ticket price and cap.",
  },
  { title: "Set your ticket pricing", sub: "Pre-filled from your plan — tweak anything you like." },
  {
    title: "Schedule & visibility",
    sub: "Pick when the draw ends and who can see your raffle.",
  },
  { title: "Review & publish", sub: "Everything look good? Send it live." },
];

/* ---------------- Step bodies ---------------- */
function StepBody({
  step,
  draft,
  set,
  errors,
  imagePreviews,
  maxImages,
  fileInputRef,
  onAddImages,
  onRemoveImage,
}: {
  step: number;
  draft: RaffleDraft;
  set: (p: Partial<RaffleDraft>) => void;
  errors: Record<string, string>;
  imagePreviews: string[];
  maxImages: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onAddImages: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
}) {
  switch (step) {
    case 0:
      return (
        <>
          <Field label="Prize title" hint={`${draft.title.length}/80`}>
            <Input
              value={draft.title}
              maxLength={80}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Brand-New Tesla Model 3 Performance"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Describe the prize, its condition, and what the winner receives…"
            />
          </Field>
          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {prizeCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set({ category: c })}
                  className={cn(
                    "focus-ring rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-300",
                    draft.category === c
                      ? "border-accent/50 bg-accent/15 text-ink shadow-accent-glow"
                      : "border-line bg-surface text-ink-muted hover:border-line hover:text-ink",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label="Prize photos"
            hint={`${imagePreviews.length}/${maxImages}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              multiple
              className="hidden"
              onChange={(e) => {
                onAddImages(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="grid grid-cols-3 gap-2">
              {imagePreviews.map((src, i) => (
                <div
                  key={src}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-line"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded-full bg-app/80 px-1.5 py-0.5 text-[10px] font-medium text-ink">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveImage(i)}
                    aria-label="Remove image"
                    className="focus-ring absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-app/80 text-ink opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X strokeWidth={2} className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {imagePreviews.length < maxImages && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="focus-ring group flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line bg-surface text-center transition-all duration-300 hover:border-accent/40 hover:bg-surface"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-accent-soft transition-transform duration-300 group-hover:-translate-y-0.5">
                    <UploadCloud strokeWidth={1.5} className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-medium text-ink">Add photo</span>
                </button>
              )}
            </div>
            <p className="text-xs text-ink-subtle">
              First photo is the cover. PNG or JPG, up to 8MB each.
            </p>
          </Field>

          <Field label="Prize value" hint="ETB · optional">
            <PrefixInput
              prefix="ETB"
              type="number"
              min={0}
              step={1}
              value={draft.prizeValue ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                set({ prizeValue: v, plannerPrizeValue: v });
              }}
              placeholder="Retail value entrants can verify"
            />
          </Field>

          <Field label="Condition">
            <Segmented
              value={draft.condition}
              onChange={(v) => set({ condition: v })}
              options={[
                { value: "new", label: "New" },
                { value: "refurbished", label: "Refurbished" },
                { value: "used", label: "Used" },
              ]}
            />
          </Field>

          <Field label="Delivery method">
            <Segmented
              value={draft.deliveryMethod}
              onChange={(v) => set({ deliveryMethod: v })}
              options={[
                { value: "shipping", label: "Shipping", hint: "Mailed to the winner" },
                { value: "pickup", label: "Local pickup", hint: "Winner collects it" },
                { value: "digital", label: "Digital delivery", hint: "Code or file sent online" },
                {
                  value: "cash_equivalent",
                  label: "Cash equivalent",
                  hint: "Winner can take the cash value instead",
                },
              ]}
            />
          </Field>
        </>
      );

    case 1:
      return <RevenuePlannerStep draft={draft} set={set} errors={errors} />;

    case 2:
      return (
        <>
          <Field label="Ticket price" hint="ETB">
            <PrefixInput
              prefix="ETB"
              type="number"
              min={0.5}
              step={0.5}
              value={draft.ticketPrice}
              onChange={(e) => set({ ticketPrice: Number(e.target.value) })}
            />
            {draft.plannerTicketPrice > 0 && (
              <PlanBadge>{formatCurrency(draft.plannerTicketPrice)} · from your plan</PlanBadge>
            )}
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-ink">Unlimited tickets</p>
              <p className="text-xs text-ink-subtle">No cap — sell as many as you can</p>
            </div>
            <Switch checked={draft.unlimited} onChange={(v) => set({ unlimited: v })} />
          </div>

          {!draft.unlimited && (
            <Field label="Ticket cap" error={errors.ticketCap}>
              <Input
                type="number"
                min={1}
                value={draft.ticketCap}
                onChange={(e) => set({ ticketCap: Number(e.target.value) })}
              />
              {draft.plannerTicketCap > 0 && (
                <PlanBadge>
                  {draft.plannerTicketCap.toLocaleString()} tickets · from your plan
                </PlanBadge>
              )}
            </Field>
          )}

          <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-ink">Bundle deal</p>
              <p className="text-xs text-ink-subtle">Reward bulk buyers with free tickets</p>
            </div>
            <Switch
              checked={draft.bundlesEnabled}
              onChange={(v) => set({ bundlesEnabled: v })}
            />
          </div>

          {draft.bundlesEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Buy quantity">
                <Input
                  type="number"
                  min={2}
                  value={draft.bundleQty}
                  onChange={(e) => set({ bundleQty: Number(e.target.value) })}
                />
              </Field>
              <Field label="Free tickets" error={errors.bundle}>
                <Input
                  type="number"
                  min={1}
                  value={draft.bundleFree}
                  onChange={(e) => set({ bundleFree: Number(e.target.value) })}
                />
              </Field>
            </div>
          )}
        </>
      );

    case 3:
      return (
        <>
          <Field label="Draw type">
            <Segmented
              value={draft.drawType}
              onChange={(v) => set({ drawType: v })}
              options={[
                {
                  value: "date",
                  label: "Fixed date",
                  icon: CalendarClock,
                  hint: "Draw fires automatically at a set time",
                },
                {
                  value: "soldout",
                  label: "When sold out",
                  icon: PackageCheck,
                  hint: "Draw fires as soon as the cap is reached",
                },
              ]}
            />
          </Field>

          {draft.drawType === "date" && (
            <Field label="Draw date & time" error={errors.drawDate}>
              <Input
                type="datetime-local"
                value={draft.drawDate}
                onChange={(e) => set({ drawDate: e.target.value })}
                className="[color-scheme:dark]"
              />
            </Field>
          )}

          <Field
            label="Minimum ticket target"
            hint="Refund if not met"
            error={errors.minTicketTarget}
          >
            <Input
              type="number"
              min={0}
              value={draft.minTicketTarget}
              onChange={(e) => set({ minTicketTarget: Number(e.target.value) })}
            />
          </Field>
          <p className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-ink-muted">
            <Check strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            The draw uses an automated, auditable RNG. Neither you nor እድል<span className="text-accent">44</span> can
            influence the outcome.
          </p>

          <div className="border-t border-line pt-6">
            <Field label="Visibility">
              <Segmented
                value={draft.visibility}
                onChange={(v) => set({ visibility: v })}
                options={[
                  {
                    value: "public",
                    label: "Public marketplace",
                    icon: Globe,
                    hint: "Discoverable by everyone browsing እድል44",
                  },
                  {
                    value: "private",
                    label: "Private link only",
                    icon: Lock,
                    hint: "Only people with your link can enter",
                  },
                ]}
              />
            </Field>
          </div>
        </>
      );

    case 4:
      return <ReviewStep draft={draft} />;

    default:
      return null;
  }
}

/* ---------------- Review ---------------- */
function ReviewStep({ draft }: { draft: RaffleDraft }) {
  const price = draft.ticketPrice || 0;
  const cap = draft.unlimited ? 0 : draft.ticketCap;
  const gross = price * cap;
  const lottery = gross * COSTS.lottery_tax;
  const winner = gross * COSTS.winner_tax;
  const social = gross * COSTS.social_contribution;
  const platform = gross * COSTS.platform_fee;
  const prize = draft.prizeValue ?? 0;
  const profit = gross - lottery - winner - social - platform - prize;

  const conditionLabels: Record<RaffleDraft["condition"], string> = {
    new: "New",
    refurbished: "Refurbished",
    used: "Used",
  };
  const deliveryLabels: Record<RaffleDraft["deliveryMethod"], string> = {
    shipping: "Shipping",
    pickup: "Local pickup",
    digital: "Digital delivery",
    cash_equivalent: "Cash equivalent",
  };

  const rows: [string, string][] = [
    ["Prize", draft.title || "Untitled"],
    ["Category", draft.category],
    ["Prize value", draft.prizeValue ? formatCurrency(draft.prizeValue) : "Not disclosed"],
    ["Condition", conditionLabels[draft.condition]],
    ["Delivery", deliveryLabels[draft.deliveryMethod]],
    ["Ticket price", formatCurrency(price)],
    ["Tickets", draft.unlimited ? "Unlimited" : draft.ticketCap.toLocaleString()],
    [
      "Bundle",
      draft.bundlesEnabled ? `Buy ${draft.bundleQty}, get ${draft.bundleFree} free` : "None",
    ],
    [
      "Draw",
      draft.drawType === "soldout"
        ? "When sold out"
        : draft.drawDate
          ? new Date(draft.drawDate).toLocaleString("en-GB")
          : "No date set",
    ],
    ["Visibility", draft.visibility === "public" ? "Public marketplace" : "Private link"],
  ];

  return (
    <>
      <dl className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-line bg-surface">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-xs text-ink-subtle">{k}</dt>
            <dd className="truncate text-sm font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Per-ticket breakdown */}
      <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent-soft">
          Per-ticket breakdown
        </p>
        <div className="space-y-1.5 text-sm">
          <Row label="Ticket price" value={formatCurrency(price)} />
          {draft.bundlesEnabled && (
            <Row
              label="Effective price after bundle"
              value={formatCurrency(effectivePricePerTicket(draft))}
              muted
            />
          )}
        </div>
      </div>

      {/* Full sellout projection */}
      <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent-soft">
          Full sellout projection
        </p>
        {draft.unlimited ? (
          <p className="text-sm text-ink-muted">
            Set a ticket cap to see your projected profit.
          </p>
        ) : (
          <div className="space-y-1.5 text-sm">
            <Row label="Gross revenue" value={formatCurrency(gross)} />
            <Row label="Lottery Association Tax (15%)" value={`−${formatCurrency(lottery)}`} negative />
            <Row label="Winner Prize Tax (15%)" value={`−${formatCurrency(winner)}`} negative />
            <Row label="Social Contribution (0.5%)" value={`−${formatCurrency(social)}`} negative />
            <Row label="Platform Fee (10%)" value={`−${formatCurrency(platform)}`} negative />
            <Row label="Prize value" value={`−${formatCurrency(prize)}`} negative />
            <div className="mt-1 flex items-center justify-between border-t border-line pt-2 font-bold text-ink">
              <span>Your estimated profit</span>
              <span className="tabular-nums text-emerald-300">{formatCurrency(profit)}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Row({
  label,
  value,
  muted,
  negative,
}: {
  label: string;
  value: string;
  muted?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted || negative ? "text-ink-muted" : "text-ink"}>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          negative ? "text-rose-300" : muted ? "text-ink-muted" : "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Read-only "from your plan" context chip shown under pre-filled Step 3 fields. */
function PlanBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent-soft">
      <Sparkles strokeWidth={1.5} className="h-3 w-3" />
      {children}
    </span>
  );
}

/* ---------------- Revenue planner (Step 2) ---------------- */
/** Animated wrapper that fades + slides a planner stage in once its data is ready. */
function PlannerStage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3"
    >
      {children}
    </motion.div>
  );
}

function PlannerLine({
  label,
  sub,
  pct,
  value,
  strong,
  negative,
  profit,
}: {
  label: string;
  sub?: string;
  pct?: string;
  value: string;
  strong?: boolean;
  negative?: boolean;
  profit?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex-1">
        <span className={cn(strong ? "font-semibold text-ink" : "text-ink-muted")}>{label}</span>
        {sub && <span className="block text-[11px] text-ink-subtle">{sub}</span>}
      </span>
      {pct && <span className="w-14 text-right text-xs text-ink-subtle tabular-nums">{pct}</span>}
      <span
        className={cn(
          "w-28 text-right tabular-nums",
          profit
            ? "font-bold text-emerald-300"
            : negative
              ? "text-rose-300"
              : strong
                ? "font-semibold text-ink"
                : "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Numeric input for the planner with a left currency/unit adornment that sits
 * outside the value area (so "ETB" never overlaps the typed number) and clean
 * empty-state handling: an empty field reports `null` and a `null`/empty value
 * renders as a blank field, so Backspace/Delete can fully clear it. The value
 * stored in state is always a clean number — the prefix is never part of it.
 */
function PlannerNumberInput({
  prefix,
  value,
  onValueChange,
  large,
  placeholder,
  max,
}: {
  prefix: string;
  value: number | null;
  onValueChange: (v: number | null) => void;
  large?: boolean;
  placeholder?: string;
  max?: number;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 select-none text-sm font-medium text-ink-subtle">
        {prefix}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        value={value === null ? "" : value}
        onChange={(e) => onValueChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder={placeholder}
        className={cn(
          "focus-ring w-full rounded-xl border border-line bg-surface pr-3.5 text-ink placeholder:text-ink-subtle transition-colors duration-300 hover:border-line focus:border-accent/50",
          prefix.length > 1 ? "pl-12" : "pl-9",
          large ? "h-14 text-lg" : "h-11 text-sm",
        )}
      />
    </div>
  );
}

function RevenuePlannerStep({
  draft,
  set,
  errors,
}: {
  draft: RaffleDraft;
  set: (p: Partial<RaffleDraft>) => void;
  errors: Record<string, string>;
}) {
  const prizeValue = draft.prizeValue ?? 0;
  const hasPrize = prizeValue > 0;
  const breakeven = plannerBreakeven(draft);
  const targetRevenue = plannerTargetRevenue(draft);
  const ticketPrice = draft.plannerTicketPrice;
  const ticketCap = plannerTicketCap(draft);

  // Winner prize tax is a fixed 20% of the prize — it does not scale with sales.
  const winnerTaxEtb = prizeValue * PLANNER_WINNER_TAX;
  // Revenue-based costs scale with gross revenue; total costs add the fixed tax.
  const totalCostsAtTarget = targetRevenue * REVENUE_COST_RATE + winnerTaxEtb;

  // Stage 4 unlocks once the host engages with profit (a value, an explicit 0%,
  // or a resumed draft that already had a price).
  const [profitTouched, setProfitTouched] = useState(
    draft.plannerProfitTargetEtb > 0 || draft.plannerTicketPrice > 0,
  );
  const showPricing = hasPrize && (draft.plannerProfitTargetEtb > 0 || profitTouched);

  const setPrize = (v: number | null) => {
    const pv = v ?? 0;
    const be = (pv * (1 + PLANNER_WINNER_TAX)) / REVENUE_KEEP_RATE;
    set({
      prizeValue: v,
      plannerPrizeValue: v,
      // Keep the same profit % intent when the prize value changes.
      plannerProfitTargetEtb: (be * draft.plannerProfitTargetPct) / 100,
    });
  };
  const setProfitPct = (pct: number) => {
    const clamped = Math.max(0, Math.min(500, pct));
    setProfitTouched(true);
    set({
      plannerProfitTargetPct: clamped,
      plannerProfitTargetEtb: (breakeven * clamped) / 100,
    });
  };
  const setProfitEtb = (etb: number) => {
    const v = Math.max(0, etb);
    setProfitTouched(true);
    set({
      plannerProfitTargetEtb: v,
      plannerProfitTargetPct: breakeven > 0 ? (v / breakeven) * 100 : 0,
    });
  };
  const setTicketPrice = (price: number) => {
    const cap = price > 0 ? Math.ceil(targetRevenue / price) : 0;
    set({ plannerTicketPrice: price, plannerTicketCap: cap });
  };

  // Cost lines for the chosen gross revenue (target).
  const costLine = (rate: number) => formatCurrency(targetRevenue * rate);

  return (
    <div className="space-y-6">
      {/* STAGE 1 — Prize value */}
      <Field label="What is your prize worth?" error={errors.plannerPrize}>
        <PlannerNumberInput
          prefix="ETB"
          value={draft.prizeValue}
          onValueChange={setPrize}
          placeholder="e.g. 1,000,000"
          large
        />
      </Field>

      {!hasPrize && (
        <div className="rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-ink-subtle">
          Enter your prize value to see projections.
        </div>
      )}

      {/* STAGE 2 — Cost breakdown */}
      {hasPrize && (
        <PlannerStage>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Coins strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
              Here's what it costs to run this raffle
            </p>
            <div className="space-y-1.5">
              <PlannerLine
                label="Lottery Association Tax"
                pct="15%"
                value={formatCurrency(breakeven * COSTS.lottery_tax)}
                negative
              />
              <PlannerLine
                label="Winner Prize Tax"
                sub="20% of prize value"
                value={formatCurrency(winnerTaxEtb)}
                negative
              />
              <PlannerLine
                label="Social Contribution"
                pct="0.5%"
                value={formatCurrency(breakeven * COSTS.social_contribution)}
                negative
              />
              <PlannerLine
                label="Platform Fee"
                pct="10%"
                value={formatCurrency(breakeven * COSTS.platform_fee)}
                negative
              />
              <div className="border-t border-line pt-1.5">
                <PlannerLine
                  label="Total costs"
                  sub="at your break-even revenue"
                  value={formatCurrency(breakeven * REVENUE_COST_RATE + winnerTaxEtb)}
                  strong
                  negative
                />
              </div>
            </div>
            <p className="mt-3 rounded-lg border border-line bg-app/40 p-3 text-xs leading-relaxed text-ink-muted">
              The winner prize tax is a fixed 20% of the prize; the other costs are
              25.5% of sales. To break even you need to generate at least{" "}
              <span className="font-semibold text-ink">{formatCurrency(breakeven)}</span>.
            </p>
          </div>
        </PlannerStage>
      )}

      {/* STAGE 3 — Profit target */}
      {hasPrize && (
        <PlannerStage>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <BarChart3 strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
              How much do you want to profit?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Profit %">
                <PlannerNumberInput
                  prefix="%"
                  max={500}
                  value={
                    draft.plannerProfitTargetPct > 0
                      ? Math.round(draft.plannerProfitTargetPct * 10) / 10
                      : null
                  }
                  onValueChange={(v) => setProfitPct(v ?? 0)}
                  placeholder="0"
                />
              </Field>
              <Field label="Profit ETB">
                <PlannerNumberInput
                  prefix="ETB"
                  value={
                    draft.plannerProfitTargetEtb > 0
                      ? Math.round(draft.plannerProfitTargetEtb)
                      : null
                  }
                  onValueChange={(v) => setProfitEtb(v ?? 0)}
                  placeholder="0"
                />
              </Field>
            </div>
            {!showPricing && (
              <button
                type="button"
                onClick={() => setProfitPct(0)}
                className="focus-ring mt-3 text-xs font-medium text-accent-soft hover:text-ink"
              >
                I just want to break even (0% profit) →
              </button>
            )}
            <p className="mt-3 rounded-lg border border-line bg-app/40 p-3 text-xs leading-relaxed text-ink-muted">
              You need to generate{" "}
              <span className="font-semibold text-ink">{formatCurrency(targetRevenue)}</span>.
            </p>
          </div>
        </PlannerStage>
      )}

      {/* STAGE 4 — Ticket price selector */}
      {showPricing && (
        <PlannerStage>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Ticket strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
              Set your ticket price
            </p>
            <PlannerNumberInput
              prefix="ETB"
              value={ticketPrice > 0 ? ticketPrice : null}
              onValueChange={(v) => setTicketPrice(v ?? 0)}
              placeholder="Type a ticket price"
              large
            />
            {errors.plannerTicketPrice && (
              <p className="mt-1.5 text-xs text-rose-300">{errors.plannerTicketPrice}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {generateChips(targetRevenue).map((chip) => {
                const active = chip.price === ticketPrice;
                return (
                  <button
                    key={chip.price}
                    type="button"
                    onClick={() => setTicketPrice(chip.price)}
                    className={cn(
                      "focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300",
                      active
                        ? "border-accent/50 bg-accent/15 text-ink shadow-accent-glow"
                        : "border-line bg-surface text-ink-muted hover:border-accent/40 hover:text-ink",
                    )}
                  >
                    {formatCurrency(chip.price)} → {chip.tickets.toLocaleString()} tickets
                  </button>
                );
              })}
            </div>
          </div>

          {ticketPrice > 0 && (
            <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <Calculator strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
                Your raffle projection
              </p>
              <div className="space-y-1.5">
                <PlannerLine label="Ticket price" value={formatCurrency(ticketPrice)} />
                <PlannerLine
                  label="Tickets to sell"
                  value={`${ticketCap.toLocaleString()}`}
                />
                <PlannerLine label="Gross revenue" value={formatCurrency(targetRevenue)} strong />
                <div className="space-y-1.5 border-t border-line pt-1.5">
                  <PlannerLine
                    label="Lottery Association Tax (15%)"
                    value={`−${costLine(COSTS.lottery_tax)}`}
                    negative
                  />
                  <PlannerLine
                    label="Winner Prize Tax"
                    sub="20% of prize value"
                    value={`−${formatCurrency(winnerTaxEtb)}`}
                    negative
                  />
                  <PlannerLine
                    label="Social Contribution (0.5%)"
                    value={`−${costLine(COSTS.social_contribution)}`}
                    negative
                  />
                  <PlannerLine
                    label="Platform Fee (10%)"
                    value={`−${costLine(COSTS.platform_fee)}`}
                    negative
                  />
                  <PlannerLine
                    label="Total costs"
                    value={`−${formatCurrency(totalCostsAtTarget)}`}
                    negative
                    strong
                  />
                </div>
                <PlannerLine
                  label="Prize value"
                  value={`−${formatCurrency(prizeValue)}`}
                  negative
                />
                <div className="border-t border-line pt-1.5">
                  <PlannerLine
                    label="Your profit"
                    value={formatCurrency(draft.plannerProfitTargetEtb)}
                    profit
                  />
                </div>
              </div>
            </div>
          )}
        </PlannerStage>
      )}
    </div>
  );
}

/* ---------------- Published success ---------------- */
function PublishedScreen({ draft, slug }: { draft: RaffleDraft; slug: string | null }) {
  const marketplaceTarget = slug ? `/en/raffle/${slug}` : "/en/public-raffles/live";
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="grid h-20 w-20 place-items-center rounded-3xl bg-accent-gradient shadow-accent-glow"
        >
          <PartyPopper strokeWidth={1.5} className="h-9 w-9 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="mt-7 text-3xl font-bold tracking-tightest text-ink sm:text-4xl">
            You're <span className="text-gradient">live!</span>
          </h1>
          <p className="mt-3 text-ink-muted">
            <span className="font-medium text-ink">
              {draft.title || "Your raffle"}
            </span>{" "}
            is now {draft.visibility === "public" ? "on the marketplace" : "ready to share"}.
            Time to drive some ticket sales.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={marketplaceTarget}>
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                <Sparkles strokeWidth={1.5} className="h-5 w-5" />
                View your raffle
              </Button>
            </Link>
            <Link to="/en/dashboard">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Go to dashboard
                <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
