import { Link } from "react-router-dom";
import { Clock, Flame, Heart } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/Badge";
import { CountdownInline } from "@/components/ui/Countdown";
import { type MarketplaceRaffle } from "@/data/marketplace";
import { formatCurrency, formatCompact, cn } from "@/lib/utils";

export function RaffleCard({ raffle }: { raffle: MarketplaceRaffle }) {
  const pct = Math.min((raffle.sold / raffle.cap) * 100, 100);
  const Icon = raffle.icon;
  const almostGone = pct >= 85 && raffle.status === "live";

  return (
    <Link to={`/en/raffle/${raffle.slug}`} className="block focus-ring rounded-2xl">
      <SpotlightCard className="flex h-full flex-col">
        {/* Cover */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl">
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br transition-transform duration-500 ease-premium group-hover:scale-[1.04]",
              raffle.gradient,
            )}
          />
          <div className="absolute inset-0 bg-obsidian/20" />
          <Icon
            strokeWidth={1.25}
            className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/80 drop-shadow-lg transition-transform duration-500 ease-premium group-hover:scale-110"
          />

          {/* Top badges */}
          <div className="absolute inset-x-3 top-3 flex items-start justify-between">
            <div className="flex gap-1.5">
              {raffle.featured && (
                <Badge tone="accent" className="backdrop-blur-md">
                  <Flame className="h-3 w-3" /> Featured
                </Badge>
              )}
              {raffle.charityPercent > 0 && (
                <Badge tone="info" className="backdrop-blur-md">
                  <Heart className="h-3 w-3" /> {raffle.charityPercent}% charity
                </Badge>
              )}
            </div>
            {raffle.status === "live" ? (
              <Badge tone="live" dot className="backdrop-blur-md">
                Live
              </Badge>
            ) : raffle.status === "draw_pending" ? (
              <Badge tone="warning" className="backdrop-blur-md">
                Drawing
              </Badge>
            ) : (
              <Badge tone="neutral" className="backdrop-blur-md">
                Ended
              </Badge>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">
            {raffle.category}
          </span>
          <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-white">
            {raffle.title}
          </h3>

          {/* Host */}
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/[0.06] text-[9px] font-bold text-accent-soft">
              {raffle.hostInitials}
            </span>
            <span className="truncate">{raffle.host}</span>
          </div>

          {/* Progress */}
          <div className="mt-3.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  almostGone ? "bg-gradient-to-r from-amber-400 to-rose-500" : "bg-accent-gradient",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500">
              <span className={cn(almostGone && "font-medium text-amber-300")}>
                {almostGone ? "Almost gone" : `${Math.round(pct)}% sold`}
              </span>
              <span className="tabular-nums">
                {formatCompact(raffle.sold)}/{formatCompact(raffle.cap)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <div>
              <p className="text-[11px] text-zinc-500">From</p>
              <p className="text-base font-bold tracking-tight text-white">
                {formatCurrency(raffle.ticketPrice)}
                <span className="text-xs font-normal text-zinc-500"> /ticket</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock strokeWidth={1.5} className="h-3.5 w-3.5 text-accent-soft" />
              <CountdownInline drawDate={raffle.drawDate} />
            </div>
          </div>
        </div>
      </SpotlightCard>
    </Link>
  );
}
