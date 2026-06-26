import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight transition-colors",
  {
    variants: {
      tone: {
        live: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
        accent: "border-accent/30 bg-accent/10 text-accent-deep dark:text-accent-soft",
        neutral: "border-line bg-surface-2 text-ink-muted",
        warning: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
        info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
