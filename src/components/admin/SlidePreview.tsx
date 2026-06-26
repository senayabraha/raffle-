import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SlidePreviewProps {
  headline: string;
  subCopy: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  imageZoom: number;
}

/** Self-contained, read-only mirror of the public HeroCarousel slide layout for the admin form. */
export function SlidePreview({ headline, subCopy, mediaType, mediaUrl, imageZoom }: SlidePreviewProps) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold tracking-tight text-ink">Preview</h3>
      <p className="mt-0.5 text-xs text-ink-subtle">This is how your slide will appear on the homepage</p>

      <div className="mt-4 rounded-2xl border border-line bg-surface-2/40 p-4">
        <div className="relative mx-auto aspect-video w-full max-w-sm overflow-hidden rounded-2xl shadow-lg">
          {mediaUrl ? (
            mediaType === "video" ? (
              <video
                src={mediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={mediaUrl}
                  alt=""
                  style={{ transform: `scale(${imageZoom})`, transformOrigin: "center" }}
                  className="h-full w-full object-cover"
                />
              </div>
            )
          ) : (
            <div className="absolute inset-0 bg-surface-2" />
          )}

          <span className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl leading-none text-white">
            ‹
          </span>
          <span className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl leading-none text-white">
            ›
          </span>

          <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center gap-1.5 bg-black/30 px-2 py-1.5 backdrop-blur-sm">
            <span className={cn("h-1.5 w-6 rounded-full bg-white")} />
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-sm text-center">
          {headline && (
            <h1 className="text-balance text-lg font-extrabold tracking-tightest text-ink">{headline}</h1>
          )}
          {subCopy && (
            <p className={cn("mx-auto text-sm text-ink-muted", headline ? "mt-2" : "mt-0")}>{subCopy}</p>
          )}
          <div className="mt-3 flex flex-row gap-2">
            <Button variant="primary" size="sm" className="w-1/2">
              <Sparkles strokeWidth={1.5} className="h-4 w-4" />
              Start hosting free
            </Button>
            <Button variant="secondary" size="sm" className="w-1/2">
              Browse raffles
              <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
