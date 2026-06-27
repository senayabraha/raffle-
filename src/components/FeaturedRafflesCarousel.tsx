import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useFeaturedRaffles } from "@/hooks/useFeaturedRaffles";
import type { FeaturedRaffleCard } from "@/lib/featured";
import { formatCurrency, cn } from "@/lib/utils";

// Matches Tailwind's default `md` breakpoint, used to decide which
// cards-per-screen setting (mobile vs desktop) is currently active.
const MD_BREAKPOINT_PX = 768;

// Gap between cards. Applied as a trailing margin on every card (rather than
// flex `gap`) so the two duplicated copies are exactly symmetric — required
// for the autoplay loop's `scrollLeft` wraparound to land precisely on the
// seam between the two copies.
const CARD_GAP_PX = 12;

const CARD_BASE_CLASS = "shrink-0";

const DEFAULT_SCROLL_DURATION_SECONDS = 20;

function formatDrawDate(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RaffleCard({
  raffle,
  cardWidth,
}: {
  raffle: FeaturedRaffleCard;
  cardWidth: number;
}) {
  const pct =
    raffle.total_tickets && raffle.total_tickets > 0
      ? Math.min((raffle.tickets_sold / raffle.total_tickets) * 100, 100)
      : null;

  return (
    <Link
      to={`/en/raffle/${raffle.slug}`}
      draggable={false}
      style={{ flex: `0 0 ${cardWidth}px`, width: cardWidth, marginRight: CARD_GAP_PX }}
      className={cn(
        CARD_BASE_CLASS,
        "snap-start flex flex-col bg-surface shadow-glass transition-transform duration-300 ease-premium hover:scale-[1.02]",
      )}
    >
      <div className="h-[170px] w-full shrink-0 overflow-hidden bg-surface-2 sm:h-[143px]">
        {raffle.prize_image_url ? (
          <img
            src={raffle.prize_image_url}
            alt={raffle.title}
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] font-bold leading-snug tracking-tight text-ink">
          {raffle.title}
        </h3>

        <p className="mt-1.5 text-[11px] text-ink-subtle">
          From{" "}
          <span className="text-sm font-semibold text-ink">
            {formatCurrency(raffle.ticket_price)}
          </span>
        </p>

        {pct !== null && (
          <div className="mt-2.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent-gradient" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-ink-subtle">{Math.round(pct)}% sold</p>
          </div>
        )}

        <p className="mt-2 text-[11px] text-ink-subtle">Draws {formatDrawDate(raffle.draw_date)}</p>

        <div className="mt-auto pt-3">
          <Button variant="primary" size="sm" className="w-full" tabIndex={-1}>
            Enter now
          </Button>
        </div>
      </div>
    </Link>
  );
}

interface FeaturedTrackProps {
  cards: FeaturedRaffleCard[];
  cardWidth: number;
}

// Isolated from the parent's state changes (resize, settings load, etc.) via
// React.memo so that re-renders of FeaturedRafflesCarousel don't remount or
// otherwise touch this element — the only thing that ever mutates the DOM
// node directly is the autoplay rAF loop in the parent, via `ref` (it scrolls
// the *container*, not this track, so this element never needs to re-render
// for autoplay to advance).
const FeaturedTrack = memo(
  forwardRef<HTMLDivElement, FeaturedTrackProps>(function FeaturedTrack(
    { cards, cardWidth },
    ref,
  ) {
    return (
      <div ref={ref} className="flex w-max">
        {cards.map((raffle, i) => (
          <RaffleCard key={`${raffle.id}-${i}`} raffle={raffle} cardWidth={cardWidth} />
        ))}
      </div>
    );
  }),
);

function FeaturedRafflesSkeleton() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <h2 className="text-2xl font-bold tracking-tightest text-ink sm:text-3xl">Featured Raffles</h2>
      <div className="mt-5 flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cn(CARD_BASE_CLASS, "w-[40%] animate-pulse bg-surface-2 sm:w-[260px]")}
          >
            <div className="h-[170px] w-full bg-surface sm:h-[143px]" />
            <div className="space-y-2 p-3.5">
              <div className="h-3.5 w-3/4 rounded bg-surface" />
              <div className="h-3.5 w-1/2 rounded bg-surface" />
              <div className="h-8 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeaturedRafflesCarousel() {
  const { raffles, settings, loading, error } = useFeaturedRaffles();
  const [paused, setPaused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= MD_BREAKPOINT_PX,
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const cards = useMemo(() => [...raffles, ...raffles], [raffles]);

  const scrollDuration = settings?.scroll_duration_seconds ?? DEFAULT_SCROLL_DURATION_SECONDS;

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= MD_BREAKPOINT_PX);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Card width is derived from the visible container's pixel width rather
  // than a CSS percentage, since the track's box is sized to its content
  // (two copies back to back) and the autoplay loop wraps `scrollLeft` at
  // exactly half that width. Re-runs once `loading` flips to false, since
  // the container only mounts once the skeleton is replaced by the real
  // markup. Uses `useLayoutEffect` (not `useEffect`) so the real
  // `clientWidth` is measured and applied before the browser paints —
  // otherwise `cardWidth` briefly resolves to 0 (from the initial
  // `containerWidth` state) and the cards flash in at zero width for a
  // frame on every mount.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateWidth = () => setContainerWidth(container.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, [loading]);

  const cardsPerScreen = isDesktop
    ? settings?.cards_per_screen_desktop ?? 4
    : settings?.cards_per_screen_mobile ?? 2.5;
  const cardWidth = containerWidth > 0 ? containerWidth / cardsPerScreen - CARD_GAP_PX : 0;
  const halfWidth = raffles.length * (cardWidth + CARD_GAP_PX);

  // Autoplay advances the container's native `scrollLeft` (instead of
  // animating a CSS `transform`) so manual touch/mouse dragging and
  // autoplay share one coordinate system. That's the fix for the "stuck/
  // stacked" drag bug: there's no separate transform offset to reconcile
  // against the user's scroll position, so pausing on touch/mouse-down and
  // resuming on release never has to snap anything back — it just stops
  // and restarts this loop from wherever `scrollLeft` already is.
  useEffect(() => {
    const container = containerRef.current;
    if (paused || !container || halfWidth <= 0) return;

    lastTimestampRef.current = null;
    const speedPxPerSec = halfWidth / scrollDuration;

    const step = (timestamp: number) => {
      if (lastTimestampRef.current !== null) {
        const dt = (timestamp - lastTimestampRef.current) / 1000;
        container.scrollLeft += speedPxPerSec * dt;
        // The two halves of the track are pixel-identical duplicates, so
        // wrapping by `halfWidth` at any point is a seamless jump.
        while (container.scrollLeft >= halfWidth) container.scrollLeft -= halfWidth;
      }
      lastTimestampRef.current = timestamp;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [paused, halfWidth, scrollDuration]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  if (loading) return <FeaturedRafflesSkeleton />;
  if (error || raffles.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <h2 className="text-2xl font-bold tracking-tightest text-ink sm:text-3xl">Featured Raffles</h2>

      <div
        ref={containerRef}
        onTouchStart={pause}
        onTouchEnd={resume}
        onMouseDown={pause}
        onMouseUp={resume}
        onMouseLeave={resume}
        // No `touch-action` override: the default lets the browser pick the
        // right scroll target per-gesture — a horizontal drag scrolls this
        // (native `overflow-x: auto`) container, a vertical drag passes
        // through to the page. The previous `touch-action: pan-x` disabled
        // that disambiguation and made every touch on this section eat
        // vertical page scrolling.
        className="mt-5 touch-auto snap-x snap-proximity overflow-x-auto [-webkit-overflow-scrolling:touch]"
      >
        <FeaturedTrack ref={trackRef} cards={cards} cardWidth={cardWidth} />
      </div>
    </section>
  );
}
