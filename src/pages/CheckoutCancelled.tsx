import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/Button";

export default function CheckoutCancelled() {
  const [params] = useSearchParams();
  const raffleSlug = params.get("raffleSlug");

  return (
    <PublicShell>
      <div className="mx-auto max-w-lg py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong p-7 text-center"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400">
            <XCircle strokeWidth={1.75} className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tightest text-white">
            Checkout cancelled
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            No payment was taken and no tickets were issued. You can try again whenever you're ready.
          </p>
          <Link to={raffleSlug ? `/en/raffle/${raffleSlug}` : "/en/public-raffles/live"} className="mt-6 inline-block">
            <Button variant="primary" size="md">
              Back to raffle
            </Button>
          </Link>
        </motion.div>
      </div>
    </PublicShell>
  );
}
