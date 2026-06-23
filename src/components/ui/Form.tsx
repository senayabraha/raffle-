import { forwardRef, type ReactNode } from "react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Field wrapper ---------- */
export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-200">
          {label}
        </label>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ---------- Input ---------- */
const baseInput =
  "focus-ring h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm text-zinc-200 placeholder:text-zinc-500 transition-colors duration-300 hover:border-white/20 focus:border-accent/50";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(baseInput, className)} {...props} />
  ),
);
Input.displayName = "Input";

/** Input with a leading currency/unit adornment. */
export function PrefixInput({
  prefix,
  className,
  ...props
}: { prefix: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500">
        {prefix}
      </span>
      <input className={cn(baseInput, "pl-8", className)} {...props} />
    </div>
  );
}

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "focus-ring min-h-[110px] w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-sm text-zinc-200 placeholder:text-zinc-500 transition-colors duration-300 hover:border-white/20 focus:border-accent/50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/* ---------- Switch ---------- */
export function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ease-premium",
        checked ? "bg-accent shadow-accent-glow" : "bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-premium",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

/* ---------- Segmented control ---------- */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  hint?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "focus-ring group relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-300 ease-premium",
              active
                ? "border-accent/50 bg-accent/10 shadow-accent-glow"
                : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
            )}
          >
            {o.icon && (
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors",
                  active
                    ? "border-accent/40 bg-accent/15 text-accent-soft"
                    : "border-white/10 bg-white/[0.04] text-zinc-400",
                )}
              >
                <o.icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
              </span>
            )}
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
                {o.label}
                {active && <Check strokeWidth={2.5} className="h-3.5 w-3.5 text-accent-soft" />}
              </span>
              {o.hint && (
                <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                  {o.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
