import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Sparkline } from "@/components/ui/Sparkline";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta: number;
  icon: LucideIcon;
  series: number[];
  decimals?: number;
}

export function StatCard({
  label,
  value,
  prefix,
  suffix,
  delta,
  icon: Icon,
  series,
  decimals = 0,
}: StatCardProps) {
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <SpotlightCard className="p-5">
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-accent-soft">
          <Icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
            trend === "up" && "bg-emerald-400/10 text-emerald-300",
            trend === "down" && "bg-rose-400/10 text-rose-300",
            trend === "flat" && "bg-white/5 text-zinc-400",
          )}
        >
          <TrendIcon className="h-3 w-3" />
          {trend === "flat" ? "—" : `${Math.abs(delta)}%`}
        </span>
      </div>

      <p className="mt-4 text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-white">
        <AnimatedNumber
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
        />
      </p>

      <Sparkline data={series} className="mt-3 h-8 w-full" />
    </SpotlightCard>
  );
}
