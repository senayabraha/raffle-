import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useHeroCarousel } from "@/hooks/useHeroCarousel";
import type { HeroSlide } from "@/lib/hero";
import { cn } from "@/lib/utils";

const FALLBACK_TEXT_HEIGHT = 120;

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const PREMIUM_EASE = [0.16, 1, 0.3, 1] as const;

const ctaButtons = (
  <>
    <Link to="/en/become-a-host">
      <Button variant="primary" size="lg" className="w-auto">
        <Sparkles strokeWidth={1.5} className="h-5 w-5" />
        Start hosting
      </Button>
    </Link>
    <Link to="/en/public-raffles/live">
      <Button variant="secondary" size="lg" className="w-auto">
        Browse raffles
        <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
      </Button>
    </Link>
  </>
);

/** The original static hero, used when there are no active CMS slides. */
function HeroFallback() {
  return (
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
        className="mt-9 flex flex-row items-center justify-center gap-3"
      >
        {ctaButtons}
      </motion.div>

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
  );
}

function HeroSkeleton() {
  return (
    <section className="relative mx-auto max-w-5xl px-5 pt-36 pb-20 sm:pt-44">
      <div className="mx-auto h-[420px] w-full max-w-3xl animate-pulse rounded-3xl bg-surface-2" />
    </section>
  );
}

/** Headline + sub-copy + CTA row for a single slide, shared by the visible block and the offscreen measurement probes. */
function SlideText({ slide }: { slide: HeroSlide }) {
  return (
    <>
      <div>
        {slide.headline && (
          <h1 className="text-balance text-3xl font-extrabold tracking-tightest text-ink sm:text-5xl sm:leading-[1.05]">
            {slide.headline}
          </h1>
        )}
        {slide.sub_copy && (
          <p
            className={cn(
              "mx-auto max-w-xl text-base text-ink-muted sm:text-lg",
              slide.headline ? "mt-4" : "mt-0",
            )}
          >
            {slide.sub_copy}
          </p>
        )}
      </div>
      <div className="mt-auto flex w-full flex-row gap-3 pt-6">
        <Link to="/en/become-a-host" className="w-1/2">
          <Button variant="primary" size="lg" className="w-full">
            <Sparkles strokeWidth={1.5} className="h-5 w-5" />
            Start hosting
          </Button>
        </Link>
        <Link to="/en/public-raffles/live" className="w-1/2">
          <Button variant="secondary" size="lg" className="w-full">
            Browse raffles
            <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
          </Button>
        </Link>
      </div>
    </>
  );
}

export function HeroCarousel() {
  const { slides, settings, loading, error } = useHeroCarousel();
  const [activeIndex, setActiveIndex] = useState(0);
  const [textHeight, setTextHeight] = useState<number | null>(null);
  const [measuring, setMeasuring] = useState(true);
  const probeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const direction = settings?.transition_direction === "vertical" ? "vertical" : "horizontal";
  const intervalMs = settings?.rotation_interval_ms ?? 1500;

  // Re-measure whenever the slide content or viewport changes.
  useLayoutEffect(() => {
    if (loading || slides.length === 0) return;
    setMeasuring(true);
  }, [slides, loading]);

  useLayoutEffect(() => {
    if (!measuring) return;
    const heights = probeRefs.current.map((el) => el?.scrollHeight ?? 0);
    const max = Math.max(...heights, 0);
    if (max > 0) setTextHeight(max);
    setMeasuring(false);
  }, [measuring]);

  useEffect(() => {
    if (loading || slides.length === 0) return;
    const handleResize = () => setMeasuring(true);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [loading, slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  if (loading) return <HeroSkeleton />;
  if (error || slides.length === 0) return <HeroFallback />;

  const slide = slides[activeIndex];
  const offset = direction === "vertical" ? { y: 40 } : { x: 60 };
  const exitOffset = direction === "vertical" ? { y: -40 } : { x: -60 };

  const goPrev = () => setActiveIndex((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % slides.length);

  return (
    <section className="relative mx-auto max-w-5xl pt-[74px] pb-0">
      <div className="relative mx-4 aspect-video overflow-hidden shadow-lg sm:mx-auto sm:max-w-4xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, ...offset }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...exitOffset }}
            transition={{ duration: 0.6, ease: PREMIUM_EASE }}
            className="absolute inset-0"
          >
            {slide.media_type === "video" && slide.media_url ? (
              <video
                src={slide.media_url}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : slide.media_url ? (
              <img
                src={slide.media_url}
                alt={slide.headline ?? ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <AuroraBackground />
            )}
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={goPrev}
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl leading-none text-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={goNext}
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl leading-none text-white"
            >
              ›
            </button>

            <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center gap-1.5 bg-black/30 px-2 py-1.5 backdrop-blur-sm">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div
        className="mx-auto mt-6 flex max-w-xl flex-col items-center px-5 text-center"
        style={{ height: textHeight ?? FALLBACK_TEXT_HEIGHT }}
      >
        <SlideText slide={slide} />
      </div>

      {measuring && (
        <div
          className="pointer-events-none absolute left-0 top-0 w-full opacity-0"
          style={{ visibility: "hidden", zIndex: -1 }}
          aria-hidden="true"
        >
          {slides.map((s, i) => (
            <div
              key={s.id}
              ref={(el) => {
                probeRefs.current[i] = el;
              }}
              className="mx-auto flex max-w-xl flex-col items-center px-5 text-center"
            >
              <SlideText slide={s} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
