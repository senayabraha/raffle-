import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  createRaffle,
  updateRaffle,
  uploadRaffleImages,
  fetchHostDraft,
  parseBundles,
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
  { id: 2, title: "Ticket settings", desc: "Price, cap & bundles" },
  { id: 3, title: "Draw settings", desc: "When the winner is picked" },
  { id: 4, title: "Visibility", desc: "Public or private" },
  { id: 5, title: "Review", desc: "Check & publish" },
];

const prizeCategories = categories.filter((c) => c !== "All");

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
      if (!draft.unlimited && draft.ticketCap < 1) {
        errors.ticketCap = "Set a ticket cap of at least 1.";
      }
      if (draft.bundlesEnabled && draft.bundleFree >= draft.bundleQty) {
        errors.bundle =
          "Free tickets must be fewer than the buy quantity, or every ticket ends up free.";
      }
      break;
    case 2:
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
  return {
    title: row.title,
    description: row.description ?? "",
    category: row.category ?? initialDraft.category,
    prizeValue: row.prize_value,
    condition: row.condition ?? initialDraft.condition,
    deliveryMethod: row.delivery_method ?? initialDraft.deliveryMethod,
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

export default function CreateRaffle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId: string }>();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<RaffleDraft>(initialDraft);
  const [raffleId, setRaffleId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(!!draftId);
  const [published, setPublished] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dir, setDir] = useState(1);
  const [images, setImages] = useState<ImageItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!draftId || !user) return;
    let active = true;
    fetchHostDraft(draftId, user.id).then((row) => {
      if (!active) return;
      if (row) {
        setRaffleId(row.id);
        setDraft(draftFromRow(row));
        setImages((row.image_urls ?? []).map((url) => ({ kind: "existing", url })));
      } else {
        setError("That draft could not be found.");
      }
      setLoadingDraft(false);
    });
    return () => {
      active = false;
    };
  }, [draftId, user]);

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
      const { slug } = raffleId
        ? await updateRaffle(raffleId, draft, imageUrls, "live")
        : await createRaffle(draft, user.id, imageUrls, "live");
      setPublishedSlug(slug);
      setPublished(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish your raffle.");
    } finally {
      setPublishing(false);
    }
  }

  async function saveDraft() {
    if (!user) {
      setError("Your session expired — please log in again.");
      return;
    }
    setError(null);
    setSavingDraft(true);
    try {
      const imageUrls = await resolveImageUrls(user.id);
      const { id } = raffleId
        ? await updateRaffle(raffleId, draft, imageUrls, "draft")
        : await createRaffle(draft, user.id, imageUrls, "draft");
      setRaffleId(id);
      navigate("/en/dashboard");
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
    setDir(1);
    setStep((s) => Math.min(s + 1, steps.length - 1));
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
                {isLast && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={saveDraft}
                    disabled={publishing || savingDraft}
                  >
                    {savingDraft ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                    ) : (
                      "Save as draft"
                    )}
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="md"
                  onClick={next}
                  disabled={!canAdvance || publishing || savingDraft}
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
  { title: "Set your ticket pricing", sub: "Choose a price, a cap, and optional bundle deals." },
  { title: "Decide how the draw ends", sub: "On a fixed date or automatically when sold out." },
  { title: "Choose who can see it", sub: "List on the public marketplace or share privately." },
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
              onChange={(e) =>
                set({ prizeValue: e.target.value === "" ? null : Number(e.target.value) })
              }
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
            <>
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
              {!errors.bundle && (
                <p className="text-xs text-ink-subtle">
                  Effective price per ticket with this bundle:{" "}
                  <span className="font-medium text-ink">
                    {formatCurrency(effectivePricePerTicket(draft))}
                  </span>
                </p>
              )}
            </>
          )}
        </>
      );

    case 2:
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
            The draw uses an automated, auditable RNG. Neither you nor Raffall can
            influence the outcome.
          </p>
        </>
      );

    case 3:
      return (
        <Field label="Visibility">
          <Segmented
            value={draft.visibility}
            onChange={(v) => set({ visibility: v })}
            options={[
              {
                value: "public",
                label: "Public marketplace",
                icon: Globe,
                hint: "Discoverable by everyone browsing Raffall",
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
      );

    case 4:
      return <ReviewStep draft={draft} />;

    default:
      return null;
  }
}

/* ---------------- Review ---------------- */
function ReviewStep({ draft }: { draft: RaffleDraft }) {
  // Premium tier: 10% platform commission
  const commission = 0.1;
  const price = draft.ticketPrice || 0;
  const platformCut = price * commission;
  const hostNet = Math.max(price - platformCut, 0);

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
          <Row label="Platform commission (10%)" value={`−${formatCurrency(platformCut)}`} muted />
          <div className="mt-1 flex items-center justify-between border-t border-line pt-2 font-bold text-ink">
            <span>You earn (held in escrow)</span>
            <span className="tabular-nums text-emerald-300">{formatCurrency(hostNet)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-ink-muted" : "text-ink"}>{label}</span>
      <span className={cn("tabular-nums", muted ? "text-ink-muted" : "text-ink")}>{value}</span>
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
