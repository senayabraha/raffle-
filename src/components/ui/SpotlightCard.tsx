import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  /** Tailwind size utilities still apply; this just toggles the lift effect. */
  lift?: boolean;
  onClick?: () => void;
}

/**
 * Glass card with a dynamic "mouse-tracking glow" — a soft light follows the
 * cursor across the surface, plus a subtle translate-Y lift on hover.
 */
export function SpotlightCard({
  children,
  className,
  lift = true,
  onClick,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-line bg-surface/70 backdrop-blur-md shadow-glass transition-all duration-300 ease-premium",
        lift && "hover:-translate-y-1 hover:bg-surface",
        className,
      )}
    >
      {/* Cursor-following glow */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, rgba(139,92,246,0.16), transparent 42%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
