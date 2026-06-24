import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  CalendarClock,
  PackageCheck,
  Globe,
  Lock,
  Megaphone,
  Rocket,
  Check,
  Sparkles,
  PartyPopper,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createRaffle, uploadRaffleImage } from "@/lib/raffles";
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

const steps: WizardStep[] = [
  { id: 1, title: "Prize details", desc: "What you're giving away" },
  { id: 2, title: "Ticket settings", desc: "Price, cap & bundles" },
  { id: 3, title: "Draw settings", desc: "When the winner is picked" },
  { id: 4, title: "Boost", desc: "Featured listing" },
  { id: 5, title: "Visibility", desc: "Public or private" },
  { id: 6, title: "Review", desc: "Check & publish" },
];

const prizeCategories = categories.filter((c) => c !== "All");

export default function CreateRaffle() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<RaffleDraft>(initialDraft);
  const [published, setPublished] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dir, setDir] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<RaffleDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  function addImages(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  const canAdvance = step !== 0 || draft.title.trim().length > 2;
  const isLast = step === steps.length - 1;

  async function publish() {
    if (!user) {
      setError("Your session expired — please log in again.");
      return;
    }
    setError(null);
    setPublishing(true);
    try {
      const imageUrl = imageFile ? await uploadRaffleImage(imageFile, user.id) : null;
      const { slug } = await createRaffle(draft, user.id, imageUrl);
      setPublishedSlug(slug);
      setPublished(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish your raffle.");
    } finally {
      setPublishing(false);
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

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-7">
        <Link
          to="/en/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tightest text-white sm:text-4xl">
          Create a <span className="text-gradient">raffle</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Set up your prize competition in a few steps — you can edit anything
          before it goes live.
        </p>
      </div>

      {/* Mobile progress */}
      <div className="mb-6 lg:hidden">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium text-white">{steps[step].title}</span>
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
                    imagePreview={imagePreview}
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
            <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-5">
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
              <span className="hidden text-xs text-zinc-500 sm:block">
                Step {step + 1} of {steps.length}
              </span>
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
          </SpotlightCard>
        </div>

        {/* Live preview */}
        <aside className="lg:col-span-4">
          <div className="sticky top-24">
            <LivePreview draft={draft} imagePreview={imagePreview} />
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
      <h2 className="mt-3 text-xl font-bold tracking-tight text-white">
        {headings[index].title}
      </h2>
      <p className="mt-1 text-sm text-zinc-400">{headings[index].sub}</p>
    </div>
  );
}

const headings = [
  { title: "Tell us about the prize", sub: "A clear title and great description sell tickets." },
  { title: "Set your ticket pricing", sub: "Choose a price, a cap, and optional bundle deals." },
  { title: "Decide how the draw ends", sub: "On a fixed date or automatically when sold out." },
  { title: "Boost your raffle", sub: "Optionally feature it at the top of the marketplace." },
  { title: "Choose who can see it", sub: "List on the public marketplace or share privately." },
  { title: "Review & publish", sub: "Everything look good? Send it live." },
];

/* ---------------- Step bodies ---------------- */
function StepBody({
  step,
  draft,
  set,
  imagePreview,
  fileInputRef,
  onAddImages,
  onRemoveImage,
}: {
  step: number;
  draft: RaffleDraft;
  set: (p: Partial<RaffleDraft>) => void;
  imagePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onAddImages: (files: FileList | null) => void;
  onRemoveImage: () => void;
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
                      ? "border-accent/50 bg-accent/15 text-white shadow-accent-glow"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-100",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Prize cover photo" hint={imagePreview ? "1/1" : "0/1"}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                onAddImages(e.target.files);
                e.target.value = "";
              }}
            />
            {!imagePreview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="focus-ring group flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center transition-all duration-300 hover:border-accent/40 hover:bg-white/[0.04]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-accent-soft transition-transform duration-300 group-hover:-translate-y-0.5">
                  <UploadCloud strokeWidth={1.5} className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-zinc-200">Click to upload</span>
                <span className="text-xs text-zinc-500">PNG or JPG, up to 8MB</span>
              </button>
            )}

            {imagePreview && (
              <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-white/10">
                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={onRemoveImage}
                  aria-label="Remove image"
                  className="focus-ring absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-obsidian/80 text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X strokeWidth={2} className="h-4 w-4" />
                </button>
              </div>
            )}
          </Field>
        </>
      );

    case 1:
      return (
        <>
          <Field label="Ticket price" hint="GBP">
            <PrefixInput
              prefix="£"
              type="number"
              min={0.5}
              step={0.5}
              value={draft.ticketPrice}
              onChange={(e) => set({ ticketPrice: Number(e.target.value) })}
            />
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">Unlimited tickets</p>
              <p className="text-xs text-zinc-500">No cap — sell as many as you can</p>
            </div>
            <Switch checked={draft.unlimited} onChange={(v) => set({ unlimited: v })} />
          </div>

          {!draft.unlimited && (
            <Field label="Ticket cap">
              <Input
                type="number"
                min={1}
                value={draft.ticketCap}
                onChange={(e) => set({ ticketCap: Number(e.target.value) })}
              />
            </Field>
          )}

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">Bundle deal</p>
              <p className="text-xs text-zinc-500">Reward bulk buyers with free tickets</p>
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
              <Field label="Free tickets">
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
            <Field label="Draw date & time">
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
          >
            <Input
              type="number"
              min={0}
              value={draft.minTicketTarget}
              onChange={(e) => set({ minTicketTarget: Number(e.target.value) })}
            />
          </Field>
          <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs leading-relaxed text-zinc-400">
            <Check strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            The draw uses an automated, auditable RNG. Neither you nor Raffall can
            influence the outcome.
          </p>
        </>
      );

    case 3:
      return (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-accent-soft">
              <Megaphone strokeWidth={1.5} className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-200">Featured listing</p>
              <p className="text-xs text-zinc-500">Top of the marketplace · +£29</p>
            </div>
          </div>
          <Switch checked={draft.featured} onChange={(v) => set({ featured: v })} />
        </div>
      );

    case 4:
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

    case 5:
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

  const rows: [string, string][] = [
    ["Prize", draft.title || "Untitled"],
    ["Category", draft.category],
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
    ["Featured", draft.featured ? "Yes (+£29)" : "No"],
    ["Visibility", draft.visibility === "public" ? "Public marketplace" : "Private link"],
  ];

  return (
    <>
      <dl className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-xs text-zinc-500">{k}</dt>
            <dd className="truncate text-sm font-medium text-zinc-200">{v}</dd>
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
          <Row label="Platform commission (10%)" value={`−${formatCurrency(platformCut)}`} muted />
          <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2 font-bold text-white">
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
      <span className={muted ? "text-zinc-400" : "text-zinc-300"}>{label}</span>
      <span className={cn("tabular-nums", muted ? "text-zinc-400" : "text-white")}>{value}</span>
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
          <h1 className="mt-7 text-3xl font-bold tracking-tightest text-white sm:text-4xl">
            You're <span className="text-gradient">live!</span>
          </h1>
          <p className="mt-3 text-zinc-400">
            <span className="font-medium text-zinc-200">
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
