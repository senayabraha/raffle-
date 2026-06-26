/**
 * Soft mesh gradient "aurora" that lives behind the entire app to create a
 * sense of depth. Pure CSS — no canvas, no JS per frame.
 *
 * The blobs are rendered as radial-gradients rather than `blur()`-filtered
 * solid shapes: a `filter: blur(120px+)` surface forces the compositor to
 * rasterize the full blur kernel every paint, which is especially costly on
 * WebKit and made every page feel sluggish since this sits behind all
 * scrollable content. A radial-gradient fades out natively with no filter
 * pass, giving the same soft glow for near-zero compositing cost.
 *
 * The blobs are static by default: the drift only runs when the user hasn't
 * asked for reduced motion, via the `motion-safe:` variant.
 *
 * Light mode stays pure white (no blobs/grid) — the glow is a dark-mode-only
 * effect, hidden via `dark:block`.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden dark:block"
    >
      {/* Violet bloom — top left */}
      <div
        className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full motion-safe:animate-aurora"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.12) 45%, transparent 75%)",
        }}
      />
      {/* Cyan bloom — bottom right */}
      <div
        className="absolute -bottom-48 right-[-10rem] h-[32rem] w-[32rem] rounded-full motion-safe:animate-aurora [animation-delay:-6s]"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0.08) 45%, transparent 75%)",
        }}
      />
      {/* Fuchsia accent — center drift */}
      <div
        className="absolute left-1/2 top-1/3 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full motion-safe:animate-aurora [animation-delay:-12s]"
        style={{
          background:
            "radial-gradient(circle, rgba(192,38,211,0.18) 0%, rgba(192,38,211,0.06) 45%, transparent 75%)",
        }}
      />
      {/* Faint grid texture */}
      <div className="absolute inset-0 bg-grid opacity-60" />
      {/* Top fade to keep header crisp */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-app to-transparent" />
    </div>
  );
}
