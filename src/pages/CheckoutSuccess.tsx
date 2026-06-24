import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Gift, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { getCheckoutStatus, type CheckoutStatus } from "@/lib/checkout";
import { formatCurrency } from "@/lib/utils";

const POLL_MS = 2500;
const MAX_POLLS = 24; // ~1 minute before giving up on the webhook landing

export default function CheckoutSuccess() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const paymentId = params.get("paymentId");
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollsRef = useRef(0);

  useEffect(() => {
    if (!paymentId) {
      setError("Missing payment reference.");
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result = await getCheckoutStatus(paymentId!);
        if (!active) return;
        setStatus(result);
        if (result.status === "pending" && pollsRef.current < MAX_POLLS) {
          pollsRef.current += 1;
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load your receipt.");
      }
    }
    poll();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [paymentId]);

  return (
    <PublicShell>
      <div className="mx-auto max-w-lg py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong p-7 text-center"
        >
          {error ? (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-rose-400/30 bg-rose-400/10 text-rose-300">
                <AlertCircle strokeWidth={1.75} className="h-7 w-7" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tightest text-white">
                Couldn't load your receipt
              </h1>
              <p className="mt-2 text-sm text-zinc-400">{error}</p>
            </>
          ) : !status || status.status === "pending" || status.status === "failed" ? (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-gradient text-white shadow-accent-glow">
                <Loader2 strokeWidth={1.75} className="h-7 w-7 animate-spin" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tightest text-white">
                {status?.status === "failed" ? "Payment didn't go through" : "Confirming your payment…"}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {status?.status === "failed"
                  ? "The payment provider reported this transaction as unsuccessful. No tickets were issued."
                  : "Hang tight — we're confirming this with your payment provider. This usually takes a few seconds."}
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-gradient text-white shadow-accent-glow">
                <Check strokeWidth={2} className="h-7 w-7" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tightest text-white">
                You're in — good luck!
              </h1>
              <p className="mt-2 text-sm text-zinc-400">{status.raffle_title}</p>

              <div className="mt-6 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Tickets</span>
                  <span className="font-medium text-zinc-200">
                    {status.paid}
                    {status.free > 0 ? ` + ${status.free} free` : ""}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Ticket numbers</span>
                  <span className="font-medium text-zinc-200">
                    {status.ticket_numbers.length > 6
                      ? `#${status.ticket_numbers[0]}–#${status.ticket_numbers[status.ticket_numbers.length - 1]}`
                      : status.ticket_numbers.map((n) => `#${n}`).join(", ")}
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/[0.06] pt-2 font-bold text-white">
                  <span>Amount paid</span>
                  <span>{formatCurrency(status.amount, "ETB")}</span>
                </div>
              </div>

              {status.free > 0 && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                  <Gift className="h-3.5 w-3.5" />
                  {status.free} free bonus {status.free === 1 ? "ticket" : "tickets"} included
                </p>
              )}

              <p className="mt-4 text-xs text-zinc-500">
                A confirmation email is on its way to you.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                {user && (
                  <Link to="/en/tickets">
                    <Button variant="primary" size="md" className="w-full">
                      View in My Tickets
                      <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Link to={`/en/raffle/${status.raffle_slug}`}>
                  <Button variant="secondary" size="md" className="w-full">
                    Back to raffle
                  </Button>
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </PublicShell>
  );
}
