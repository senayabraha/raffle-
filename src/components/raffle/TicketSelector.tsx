import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Minus,
  Plus,
  Check,
  Ticket,
  ShieldCheck,
  Gift,
  Loader2,
  AlertCircle,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { type MarketplaceRaffle } from "@/data/marketplace";
import { useAuth } from "@/lib/auth";
import { startCheckout, type PaymentProvider } from "@/lib/checkout";
import { formatCurrency, cn } from "@/lib/utils";

const quickPicks = [1, 5, 10, 25];

/** Returns bonus free tickets for a paid quantity, using the best bundle. */
function freeTicketsFor(qty: number, bundles: MarketplaceRaffle["bundles"]) {
  let free = 0;
  for (const b of bundles) {
    if (qty >= b.qty) free = Math.max(free, Math.floor(qty / b.qty) * b.free);
  }
  return free;
}

const providers: { id: PaymentProvider; label: string; available: boolean }[] = [
  { id: "chapa", label: "Chapa", available: true },
  { id: "telebirr", label: "Telebirr", available: false },
];

export function TicketSelector({ raffle }: { raffle: MarketplaceRaffle }) {
  const { profile, user } = useAuth();
  const [step, setStep] = useState<"select" | "contact">("select");
  const [qty, setQty] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(profile?.email ?? user?.email ?? "");
  const [city, setCity] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("chapa");

  const free = useMemo(
    () => freeTicketsFor(qty, raffle.bundles),
    [qty, raffle.bundles],
  );

  const subtotal = qty * raffle.ticketPrice;
  const total = subtotal;

  async function submitCheckout() {
    setError(null);
    if (!fullName.trim() || !phone.trim() || !email.trim() || !city.trim()) {
      setError("Please fill in your full name, phone, email and city.");
      return;
    }
    setLoading(true);
    try {
      const { checkoutUrl } = await startCheckout({
        raffleId: raffle.id,
        raffleSlug: raffle.slug,
        qty,
        provider,
        fullName,
        phone,
        email,
        city,
      });
      window.location.href = checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setLoading(false);
    }
  }

  const closed = raffle.status !== "live";

  return (
    <div className="glass-strong p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs text-zinc-500">Ticket price</p>
          <p className="text-2xl font-bold tracking-tight text-white">
            {formatCurrency(raffle.ticketPrice, "ETB")}
          </p>
        </div>
        {raffle.bundles.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-soft">
            <Gift className="h-3.5 w-3.5" />
            Buy {raffle.bundles[0].qty} get {raffle.bundles[0].free} free
          </span>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === "select" ? (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Quantity stepper */}
            <div className="mt-5">
              <label className="text-xs font-medium text-zinc-400">Quantity</label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={closed}
                  className="focus-ring grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] active:scale-95 disabled:opacity-40"
                >
                  <Minus strokeWidth={1.5} className="h-[18px] w-[18px]" />
                </button>
                <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-lg font-bold tabular-nums text-white">
                  {qty}
                </div>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  disabled={closed}
                  className="focus-ring grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] active:scale-95 disabled:opacity-40"
                >
                  <Plus strokeWidth={1.5} className="h-[18px] w-[18px]" />
                </button>
              </div>

              {/* Quick picks */}
              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {quickPicks.map((n) => (
                  <button
                    key={n}
                    onClick={() => setQty(n)}
                    disabled={closed}
                    className={cn(
                      "focus-ring rounded-lg border py-1.5 text-sm font-medium transition-all duration-300 disabled:opacity-40",
                      qty === n
                        ? "border-accent/50 bg-accent/15 text-white"
                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-100",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {free > 0 && (
                <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                  <Gift className="h-3.5 w-3.5" />
                  +{free} free bonus {free === 1 ? "ticket" : "tickets"} included
                </p>
              )}
            </div>

            {/* Totals */}
            <div className="mt-5 space-y-1.5 border-t border-white/[0.06] pt-4 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>
                  {qty} {qty === 1 ? "ticket" : "tickets"}
                </span>
                <span className="tabular-nums">{formatCurrency(subtotal, "ETB")}</span>
              </div>
              <div className="flex items-center justify-between pt-1 text-base font-bold text-white">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(total, "ETB")}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => setStep("contact")}
              disabled={closed}
              className="mt-4 w-full"
            >
              <Ticket strokeWidth={1.5} className="h-5 w-5" />
              {closed ? "Entries closed" : `Enter raffle · ${formatCurrency(total, "ETB")}`}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="contact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-5"
          >
            <button
              onClick={() => setStep("select")}
              disabled={loading}
              className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-white disabled:opacity-40"
            >
              <ArrowLeft strokeWidth={1.5} className="h-3.5 w-3.5" />
              Back
            </button>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm">
              <span className="text-zinc-400">
                {qty} {qty === 1 ? "ticket" : "tickets"}
                {free > 0 ? ` + ${free} free` : ""}
              </span>
              <span className="font-bold tabular-nums text-white">
                {formatCurrency(total, "ETB")}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <Field icon={User} placeholder="Full name" value={fullName} onChange={setFullName} disabled={loading} />
              <Field icon={Phone} placeholder="Phone number" value={phone} onChange={setPhone} disabled={loading} type="tel" />
              <Field icon={Mail} placeholder="Email address" value={email} onChange={setEmail} disabled={loading} type="email" />
              <Field icon={MapPin} placeholder="City" value={city} onChange={setCity} disabled={loading} />
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-zinc-400">Pay with</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => p.available && setProvider(p.id)}
                    disabled={loading || !p.available}
                    className={cn(
                      "focus-ring relative rounded-xl border py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-40",
                      provider === p.id
                        ? "border-accent/50 bg-accent/15 text-white"
                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-100",
                    )}
                  >
                    {p.label}
                    {!p.available && (
                      <span className="absolute -top-2 right-2 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-zinc-400">
                        Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">
                <AlertCircle strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={submitCheckout}
              disabled={loading}
              className="mt-4 w-full"
            >
              <AnimatePresence mode="wait" initial={false}>
                {loading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="inline-flex items-center gap-2"
                  >
                    <Loader2 className="h-5 w-5 animate-spin" /> Redirecting to payment…
                  </motion.span>
                ) : (
                  <motion.span
                    key="pay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="inline-flex items-center gap-2"
                  >
                    <Check strokeWidth={2} className="h-5 w-5" />
                    Continue to {providers.find((p) => p.id === provider)?.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
        <ShieldCheck strokeWidth={1.5} className="h-3.5 w-3.5 text-emerald-400" />
        Protected by the Raffall Guarantee · Free postal entry available
      </p>
    </div>
  );
}

function Field({
  icon: Icon,
  placeholder,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  icon: typeof User;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  type?: string;
}) {
  return (
    <div className="relative">
      <Icon
        strokeWidth={1.5}
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
      />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="focus-ring h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-500 transition-colors duration-300 hover:border-white/20 focus:border-accent/50 disabled:opacity-40"
      />
    </div>
  );
}
