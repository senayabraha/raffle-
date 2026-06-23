import { useCountdown } from "@/lib/useCountdown";
import { cn } from "@/lib/utils";

/** Large pill-style countdown used on the raffle detail page. */
export function CountdownPills({ drawDate }: { drawDate: string }) {
  const c = useCountdown(drawDate);
  const units = [
    { label: "Days", value: c.days },
    { label: "Hours", value: c.hours },
    { label: "Mins", value: c.minutes },
    { label: "Secs", value: c.seconds },
  ];

  if (c.done) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-300">
        Draw closed — winner being selected
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {units.map((u) => (
        <div
          key={u.label}
          className="glass flex flex-col items-center justify-center py-3"
        >
          <span className="text-2xl font-bold tabular-nums tracking-tight text-white sm:text-3xl">
            {String(u.value).padStart(2, "0")}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Compact one-line "ends in" used on cards. */
export function CountdownInline({
  drawDate,
  className,
}: {
  drawDate: string;
  className?: string;
}) {
  const c = useCountdown(drawDate);
  if (c.done) return <span className={cn(className)}>Drawing now</span>;
  const text =
    c.days > 0
      ? `${c.days}d ${c.hours}h`
      : c.hours > 0
        ? `${c.hours}h ${c.minutes}m`
        : `${c.minutes}m ${String(c.seconds).padStart(2, "0")}s`;
  return <span className={cn("tabular-nums", className)}>{text}</span>;
}
