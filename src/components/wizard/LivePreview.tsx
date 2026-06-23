import { ImageIcon, Star, Clock, Flame, Heart } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { type RaffleDraft } from "./types";

/** Mirrors the marketplace RaffleCard so the host sees the listing live. */
export function LivePreview({ draft }: { draft: RaffleDraft }) {
  const cap = draft.unlimited ? null : draft.ticketCap;
  const drawLabel =
    draft.drawType === "soldout"
      ? "When sold out"
      : draft.drawDate
        ? new Date(draft.drawDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })
        : "Set a date";

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Live preview
      </p>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-glass">
        {/* Cover */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/30 via-accent/20 to-indigo-600/30" />
          <ImageIcon
            strokeWidth={1.25}
            className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-white/70"
          />
          <div className="absolute inset-x-3 top-3 flex justify-between">
            <div className="flex gap-1.5">
              {draft.featured && (
                <Badge tone="accent" className="backdrop-blur-md">
                  <Flame className="h-3 w-3" /> Featured
                </Badge>
              )}
              {draft.charityEnabled && (
                <Badge tone="info" className="backdrop-blur-md">
                  <Heart className="h-3 w-3" /> {draft.charityPercent}%
                </Badge>
              )}
            </div>
            <Badge tone="live" dot className="backdrop-blur-md">
              Live
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">
            {draft.category}
          </span>
          <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-[15px] font-semibold leading-snug tracking-tight text-white">
            {draft.title || "Your prize title appears here"}
          </h3>

          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/[0.06] text-[9px] font-bold text-accent-soft">
              JM
            </span>
            <span className="truncate">Jordan M.</span>
            <span className="inline-flex items-center gap-0.5 text-zinc-500">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              4.9
            </span>
          </div>

          <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-[8%] rounded-full bg-accent-gradient" />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500">
            <span>0% sold</span>
            <span className="tabular-nums">0/{cap ? cap.toLocaleString() : "∞"}</span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <div>
              <p className="text-[11px] text-zinc-500">From</p>
              <p className="text-base font-bold tracking-tight text-white">
                {formatCurrency(draft.ticketPrice || 0)}
                <span className="text-xs font-normal text-zinc-500"> /ticket</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock strokeWidth={1.5} className="h-3.5 w-3.5 text-accent-soft" />
              {drawLabel}
            </div>
          </div>
        </div>
      </div>

      {draft.bundlesEnabled && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
          <Flame className="h-3.5 w-3.5 text-accent-soft" />
          Bundle: buy {draft.bundleQty}, get {draft.bundleFree} free
        </p>
      )}
    </div>
  );
}
