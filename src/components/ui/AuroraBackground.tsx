/**
 * Soft, blurred mesh gradient "aurora" that lives behind the entire app
 * to create a sense of depth. Pure CSS — no canvas, no JS per frame.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Violet bloom — top left */}
      <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-accent/25 blur-[120px] animate-aurora" />
      {/* Cyan bloom — bottom right */}
      <div className="absolute -bottom-48 right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-cyan-500/15 blur-[130px] animate-aurora [animation-delay:-6s]" />
      {/* Fuchsia accent — center drift */}
      <div className="absolute left-1/2 top-1/3 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-fuchsia-600/12 blur-[140px] animate-aurora [animation-delay:-12s]" />
      {/* Faint grid texture */}
      <div className="absolute inset-0 bg-grid opacity-60" />
      {/* Top fade to keep header crisp */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-obsidian to-transparent" />
    </div>
  );
}
