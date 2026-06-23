import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Star,
  PencilRuler,
  Share2,
  Trophy,
} from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

const stats = [
  { label: "Paid to hosts", value: 48, prefix: "£", suffix: "M+" },
  { label: "Tickets sold", value: 12, suffix: "M+" },
  { label: "Avg. host rating", value: 4.9, suffix: "★", decimals: 1 },
];

const steps = [
  {
    icon: PencilRuler,
    title: "Create",
    body: "List your prize, set ticket price and draw rules in minutes. No code, no fees up front.",
  },
  {
    icon: Share2,
    title: "Share",
    body: "Get a unique link, QR codes and referral tools. Free tickets reward your fans for sharing.",
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
          <a href="#marketplace">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              Browse raffles
              <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
            </Button>
          </a>
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
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            4.9 on Trustpilot
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck strokeWidth={1.5} className="h-4 w-4 text-emerald-400" />
            Approved by Facebook, Google & Apple
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
            Same-day payouts
          </span>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          custom={5}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4"
        >
          {stats.map((s) => (
            <SpotlightCard key={s.label} className="p-5">
              <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                <AnimatedNumber
                  value={s.value}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  decimals={s.decimals ?? 0}
                />
              </p>
              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">{s.label}</p>
            </SpotlightCard>
          ))}
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
            <Link to="/en/dashboard" className="mt-8 inline-block">
              <Button variant="primary" size="lg">
                Open your dashboard
                <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
              </Button>
            </Link>
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
            <a href="#" className="transition-colors hover:text-white">Terms & fees</a>
            <a href="#" className="transition-colors hover:text-white">Privacy</a>
            <a href="#" className="transition-colors hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
