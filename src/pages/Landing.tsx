import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  PencilRuler,
  Share2,
  Trophy,
} from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const steps = [
  {
    icon: PencilRuler,
    title: "Create",
    body: "List your prize, set ticket price and draw rules in minutes. No code, no fees up front.",
  },
  {
    icon: Share2,
    title: "Share",
    body: "Get a unique link and a scannable QR code to share anywhere — online or in print.",
  },
  {
    icon: Trophy,
    title: "Draw",
    body: "An automated, auditable RNG picks the winner. You can't influence it — and neither can we.",
  },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <AuroraBackground />
      <MarketingNav />

      {/* ---- Hero ---- */}
      <section className="relative mx-auto max-w-5xl px-5 pt-36 pb-20 text-center sm:pt-44">
        <motion.div custom={0} variants={fade} initial="hidden" animate="show">
          <Badge tone="accent" dot className="mx-auto">
            Escrow-protected · Fully automated draws
          </Badge>
        </motion.div>

        <motion.h1
          custom={1}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mt-6 max-w-3xl text-balance text-5xl font-extrabold tracking-tightest text-white sm:text-7xl sm:leading-[1.02]"
        >
          Host raffles that{" "}
          <span className="text-gradient">give back</span> and earn from your
          audience
        </motion.h1>

        <motion.p
          custom={2}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mt-6 max-w-xl text-lg text-zinc-400"
        >
          The premium marketplace for prize competitions. List a prize, sell
          tickets, and run a transparent draw — with funds held safely in escrow
          until your winner confirms.
        </motion.p>

        <motion.div
          custom={3}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link to="/en/dashboard">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              <Sparkles strokeWidth={1.5} className="h-5 w-5" />
              Start hosting free
            </Button>
          </Link>
          <Link to="/en/public-raffles/live">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              Browse raffles
              <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
            </Button>
          </Link>
        </motion.div>

        {/* Trust row */}
        <motion.div
          custom={4}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck strokeWidth={1.5} className="h-4 w-4 text-emerald-400" />
            Funds held in escrow until your winner confirms
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
            Automated, auditable draws
          </span>
        </motion.div>
      </section>

      {/* ---- How it works ---- */}
      <section id="how" className="mx-auto max-w-5xl px-5 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tightest text-white sm:text-4xl">
            Live in three steps
          </h2>
          <p className="mt-3 text-zinc-400">
            From idea to a fully-running, fair draw — without the busywork.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              custom={i}
              variants={fade}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
            >
              <SpotlightCard className="h-full p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-accent-soft">
                    <step.icon strokeWidth={1.5} className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {step.body}
                </p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section id="pricing" className="mx-auto max-w-5xl px-5 py-16">
        <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-14 text-center">
          <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tightest text-white sm:text-5xl sm:leading-[1.05]">
              Turn your audience into{" "}
              <span className="text-gradient">your next win</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-zinc-400">
              Start free with commission as low as 8%. No setup fees, no
              monthly minimum.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/en/dashboard" className="inline-block">
                <Button variant="primary" size="lg">
                  Open your dashboard
                  <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
                </Button>
              </Link>
              <Link
                to="/en/pricing"
                className="text-sm font-medium text-accent-soft transition-colors hover:text-white"
              >
                See how commission works →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="mx-auto max-w-5xl px-5 py-10">
        <div className="h-px divider-faded" />
        <div className="mt-6 flex flex-col items-center justify-between gap-4 text-sm text-zinc-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent-gradient">
              <Sparkles strokeWidth={2} className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-zinc-300">Raffall</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-5">
            <Link to="/en/terms" className="transition-colors hover:text-white">Terms & fees</Link>
            <Link to="/en/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link to="/en/contact" className="transition-colors hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
