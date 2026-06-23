import { cn } from "@/lib/utils";

/** Premium shimmering skeleton block — used in place of spinners. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}
