import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold tracking-tight transition-all duration-300 ease-premium focus-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-gradient text-white shadow-accent-glow hover:brightness-110 hover:shadow-[0_10px_40px_-6px_rgba(139,92,246,0.6)]",
        secondary:
          "border border-white/10 bg-white/[0.04] text-white backdrop-blur-md hover:bg-white/[0.08] hover:border-white/20",
        ghost: "text-zinc-300 hover:bg-white/[0.06] hover:text-white",
        outline:
          "border border-accent/40 text-accent-soft hover:bg-accent/10 hover:border-accent/70",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-[0.95rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
