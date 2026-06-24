import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Percent, ShieldCheck, ArrowRight } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Button } from "@/components/ui/Button";

const items = [
  {
    icon: Percent,
    title: "Flat platform commission",
    body:
      "We take a single commission per ticket sold — as low as 8%, capped at 10% — taken out of escrow when the raffle settles. No monthly subscription, no setup fee.",
  },
  {
    icon: ShieldCheck,
    title: "No hidden fees",
    body:
      "What you see at checkout is what's charged. Entrants never pay a platform fee on top of the ticket price.",
  },
];

export default function Pricing() {
  return (
    <PublicShell>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 text-center"
      >
        <h1 className="text-4xl font-bold tracking-tightest text-white sm:text-5xl">
          Simple, <span className="text-gradient">commission-based</span> pricing
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-400">
          No subscriptions, no tiers to pick between. We only make money when your
          raffle does.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <SpotlightCard className="p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent-soft">
                <item.icon strokeWidth={1.5} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>

      <div className="glass-strong relative mt-10 overflow-hidden rounded-3xl px-8 py-14 text-center">
        <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tightest text-white sm:text-4xl">
            Ready to launch your first raffle?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-zinc-400">
            Set your ticket price, draw date and you're live — commission is deducted
            automatically at payout.
          </p>
          <Link to="/en/dashboard" className="mt-8 inline-block">
            <Button variant="primary" size="lg">
              Open your dashboard
              <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
            </Button>
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
