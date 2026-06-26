import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Button } from "@/components/ui/Button";
import { HeroCarousel } from "@/components/HeroCarousel";
import { FeaturedRafflesCarousel } from "@/components/FeaturedRafflesCarousel";
import { HowItWorks } from "@/components/HowItWorks";
import { useSiteScale } from "@/hooks/useSiteScale";

export default function Landing() {
  const { currentScale } = useSiteScale();

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ zoom: currentScale }}>
      <AuroraBackground />
      <MarketingNav />

      {/* ---- Hero ---- */}
      <HeroCarousel />

      {/* ---- Featured raffles ---- */}
      <FeaturedRafflesCarousel />

      {/* ---- How it works ---- */}
      <HowItWorks />

      {/* ---- CTA ---- */}
      <section id="pricing" className="mx-auto max-w-5xl px-5 py-8">
        <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-10 text-center">
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
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
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
      <footer className="mx-auto max-w-5xl px-5 py-5">
        <div className="h-px divider-faded" />
        <div className="mt-4 flex flex-col items-center justify-between gap-4 text-sm text-ink-subtle sm:flex-row">
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
