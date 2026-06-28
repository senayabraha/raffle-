import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps content in a razor-thin accent gradient border. The outer element
 * carries the gradient (via `.gradient-ring`) and a 1px pad; the inner element
 * supplies the solid dark glass surface so only a hairline of gradient shows.
 *
 * The gradient frame is dark-mode only — in light mode it collapses to the
 * standard hairline to keep that theme clean.
 */
export function GradientBorder({
  children,
  className,
  innerClassName,
  radius = "rounded-2xl",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /** Outer + inner share a radius; inner is nudged 1px tighter automatically. */
  radius?: string;
}) {
  return (
    <div
      className={cn(
        "p-px",
        radius,
        "border border-line dark:border-transparent dark:gradient-ring",
        className,
      )}
    >
      <div className={cn("h-full", radius, innerClassName)}>{children}</div>
    </div>
  );
}

/**
 * Soft radial "aurora" glow meant to sit absolutely-positioned behind a focal
 * element (a heading or CTA) to naturally draw the eye. Dark-mode only and
 * non-interactive.
 */
export function AmbientGlow({
  className,
  color = "rgba(139,92,246,0.45)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -z-10 hidden rounded-full blur-3xl dark:block",
        className,
      )}
      style={{
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
    />
  );
}
