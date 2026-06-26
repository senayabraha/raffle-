import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
          className="mx-auto mt-6 max-w-3xl text-balance text-5xl font-extrabold tracking-tightest text-ink sm:text-7xl sm:leading-[1.02]"
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
          className="mx-auto mt-6 max-w-xl text-lg text-ink-muted"
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
          <Link to="/en/become-a-host">
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
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-subtle"
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

      {/* ---- CTA ---- */}
      <section id="pricing" className="mx-auto max-w-5xl px-5 py-16">
        <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-14 text-center">
          <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tightest text-ink sm:text-5xl sm:leading-[1.05]">
              Turn your audience into{" "}
              <span className="text-gradient">your next win</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-ink-muted">
              Start free with commission as low as 8%. No setup fees, no
              monthly minimum.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/en/become-a-host" className="inline-block">
                <Button variant="primary" size="lg">
                  Start hosting free
                  <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
                </Button>
              </Link>
              <Link
                to="/en/pricing"
                className="text-sm font-medium text-accent-deep transition-colors hover:text-ink dark:text-accent-soft dark:hover:text-ink"
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
        <div className="mt-6 flex flex-col items-center justify-between gap-4 text-sm text-ink-subtle sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent-gradient">
              <Sparkles strokeWidth={2} className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-ink">Raffall</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-5">
            <Link to="/en/terms" className="transition-colors hover:text-ink">Terms & fees</Link>
            <Link to="/en/privacy" className="transition-colors hover:text-ink">Privacy</Link>
            <Link to="/en/contact" className="transition-colors hover:text-ink">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
