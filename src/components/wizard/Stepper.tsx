import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: number;
  title: string;
  desc: string;
}

export function Stepper({
  steps,
  current,
  onJump,
}: {
  steps: WizardStep[];
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={i > current}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-300 ease-premium disabled:cursor-not-allowed",
                active ? "bg-surface-2" : "hover:bg-surface",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold transition-all duration-300",
                  done && "border-transparent bg-accent-gradient text-white",
                  active && "border-accent/60 bg-accent/15 text-accent-soft",
                  !done && !active && "border-line bg-surface text-ink-subtle",
                )}
              >
                {done ? <Check strokeWidth={3} className="h-3.5 w-3.5" /> : s.id}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium tracking-tight transition-colors",
                    active || done ? "text-ink" : "text-ink-subtle",
                  )}
                >
                  {s.title}
                </span>
                <span className="block truncate text-[11px] text-ink-subtle">
                  {s.desc}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact horizontal progress dots for mobile. */
export function StepperBar({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-500",
            i <= current ? "bg-accent-gradient" : "bg-surface-2",
          )}
        />
      ))}
    </div>
  );
}
