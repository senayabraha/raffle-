import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useFeaturedRaffles } from "@/hooks/useFeaturedRaffles";
import type { FeaturedRaffleCard } from "@/lib/featured";
import { formatCurrency, cn } from "@/lib/utils";

const CARD_WIDTH_CLASS = "w-[40%] shrink-0 sm:w-[260px]";

function formatDrawDate(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RaffleCard({ raffle, snap }: { raffle: FeaturedRaffleCard; snap: boolean }) {
  const pct =
    raffle.total_tickets && raffle.total_tickets > 0
      ? Math.min((raffle.tickets_sold / raffle.total_tickets) * 100, 100)
      : null;

  return (
    <Link
      to={`/en/raffle/${raffle.slug}`}
      draggable={false}
      className={cn(
        CARD_WIDTH_CLASS,
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

function FeaturedRafflesSkeleton() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <h2 className="text-2xl font-bold tracking-tightest text-ink sm:text-3xl">Featured Raffles</h2>
      <div className="mt-5 flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={cn(CARD_WIDTH_CLASS, "animate-pulse bg-surface-2")}>
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
  const { raffles, loading, error } = useFeaturedRaffles();
  const [manual, setManual] = useState(false);
  const manualRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startScroll: 0, dragging: false, moved: false });

  const switchToManual = useCallback(() => {
    if (manualRef.current) return;
    manualRef.current = true;

    const track = trackRef.current;
    const container = containerRef.current;
    if (track && container) {
      const computed = window.getComputedStyle(track).transform;
      let translateX = 0;
      const match = computed && computed !== "none" ? /matrix\(([^)]+)\)/.exec(computed) : null;
      if (match) {
        const parts = match[1].split(",").map(Number);
        translateX = parts[4] ?? 0;
      }
      track.style.animation = "none";
      track.style.transform = "none";
      container.scrollLeft = Math.max(0, -translateX);
    }
    setManual(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = containerRef.current;
    if (!container || !dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    container.scrollLeft = dragRef.current.startScroll - dx;
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      switchToManual();
      const container = containerRef.current;
      if (!container) return;
      dragRef.current = { startX: e.clientX, startScroll: container.scrollLeft, dragging: true, moved: false };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [switchToManual, handleMouseMove, handleMouseUp],
  );

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      dragRef.current.moved = false;
    }
  }, []);

  if (loading) return <FeaturedRafflesSkeleton />;
  if (error || raffles.length === 0) return null;

  const cards = [...raffles, ...raffles];

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <h2 className="text-2xl font-bold tracking-tightest text-ink sm:text-3xl">Featured Raffles</h2>

      <div
        ref={containerRef}
        onTouchStart={switchToManual}
        onMouseDown={handleMouseDown}
        onClickCapture={handleClickCapture}
        className={cn("mt-5", manual ? "snap-x snap-mandatory overflow-x-scroll" : "overflow-x-hidden")}
      >
        <div ref={trackRef} className={cn("flex gap-3", !manual && "animate-featured-slide")}>
          {cards.map((raffle, i) => (
            <RaffleCard key={`${raffle.id}-${i}`} raffle={raffle} snap={manual} />
          ))}
        </div>
      </div>
    </section>
  );
}
