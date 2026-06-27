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
// for the `translateX(-50%)` loop animation to land precisely on the seam.
const CARD_GAP_PX = 12;

const CARD_BASE_CLASS = "shrink-0";

const DEFAULT_SCROLL_DURATION_SECONDS = 20;

// Rendered once, outside the animated track, so the keyframes and the
// track's animation-name/timing-function/iteration-count never change
// across re-renders — only `animation-play-state` (pause/resume) and
// `animation-duration` (admin speed setting) are ever touched, and both
// are applied imperatively via refs rather than through React state, so a
// parent re-render can never restart the animation from 0%.
const FEATURED_TRACK_KEYFRAMES = `
@keyframes featured-slide {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.featured-track-anim {
  animation-name: featured-slide;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-duration: ${DEFAULT_SCROLL_DURATION_SECONDS}s;
}
`;

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
  snap,
  cardWidth,
}: {
  raffle: FeaturedRaffleCard;
  snap: boolean;
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
        "flex flex-col bg-surface shadow-glass transition-transform duration-300 ease-premium hover:scale-[1.02]",
        snap && "snap-start",
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
  snap: boolean;
}

// Isolated from the parent's state changes (resize, settings load, etc.) via
// React.memo so that re-renders of FeaturedRafflesCarousel don't remount or
// otherwise touch this element — the only thing that ever mutates the DOM
// node directly is the pause/resume/speed logic in the parent, via `ref`.
const FeaturedTrack = memo(
  forwardRef<HTMLDivElement, FeaturedTrackProps>(function FeaturedTrack(
    { cards, cardWidth, snap },
    ref,
  ) {
    return (
      <div ref={ref} className="featured-track-anim flex w-max">
        {cards.map((raffle, i) => (
          <RaffleCard key={`${raffle.id}-${i}`} raffle={raffle} snap={snap} cardWidth={cardWidth} />
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

  const cards = useMemo(() => [...raffles, ...raffles], [raffles]);

  // Settings load after mount (or change via the admin panel's preview), so
  // the duration is applied imperatively to the track's `style` rather than
  // through a prop — that keeps `animation-name` stable on the memoized
  // track and only ever updates the duration, never resetting the loop.
  const scrollDuration = settings?.scroll_duration_seconds ?? DEFAULT_SCROLL_DURATION_SECONDS;
  useEffect(() => {
    const track = trackRef.current;
    if (track) track.style.animationDuration = `${scrollDuration}s`;
  }, [scrollDuration]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= MD_BREAKPOINT_PX);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Card width is derived from the visible container's pixel width rather
  // than a CSS percentage: the track's box is sized to its content (two
  // copies back to back) so `translateX(-50%)` lands exactly on the seam,
  // which means percentage-based card widths can no longer resolve against
  // the visible viewport. Re-runs once `loading` flips to false, since the
  // container only mounts once the skeleton is replaced by the real markup.
  // Uses `useLayoutEffect` (not `useEffect`) so the real `clientWidth` is
  // measured and applied before the browser paints — otherwise `cardWidth`
  // briefly resolves to 0 (from the initial `containerWidth` state) and the
  // cards flash in at zero width for a frame on every mount.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateWidth = () => setContainerWidth(container.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, [loading]);

  // Pausing/resuming only ever toggles `animation-play-state` — the
  // carousel always keeps auto-scrolling once the user lets go, no matter
  // how they interacted with it while held.
  const pause = useCallback(() => {
    const track = trackRef.current;
    if (track) track.style.animationPlayState = "paused";
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (container) container.scrollLeft = 0;
    if (track) {
      // Force a synchronous layout recalculation before flipping back to
      // "running" — without this the browser doesn't always kick a
      // paused CSS animation back into motion on release.
      track.getBoundingClientRect();
      track.style.animationPlayState = "running";
    }
    setPaused(false);
  }, []);

  if (loading) return <FeaturedRafflesSkeleton />;
  if (error || raffles.length === 0) return null;

  const cardsPerScreen = isDesktop
    ? settings?.cards_per_screen_desktop ?? 4
    : settings?.cards_per_screen_mobile ?? 2.5;
  const cardWidth = containerWidth > 0 ? containerWidth / cardsPerScreen - CARD_GAP_PX : 0;

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <style>{FEATURED_TRACK_KEYFRAMES}</style>
      <h2 className="text-2xl font-bold tracking-tightest text-ink sm:text-3xl">Featured Raffles</h2>

      <div
        ref={containerRef}
        onTouchStart={pause}
        onTouchEnd={resume}
        onMouseDown={pause}
        onMouseUp={resume}
        onMouseLeave={resume}
        className={cn("mt-5", paused ? "snap-x snap-mandatory overflow-x-auto" : "overflow-x-hidden")}
      >
        <FeaturedTrack ref={trackRef} cards={cards} cardWidth={cardWidth} snap={paused} />
      </div>
    </section>
  );
}
