import { motion } from "framer-motion";
import { salesSeries as mockSeries } from "@/data/mock";

/** Animated bar chart of daily ticket sales over the last 14 days. */
export function SalesChart({ data }: { data?: number[] }) {
  const series = data ?? mockSeries;
  const max = Math.max(...series, 1);

  return (
    <div className="flex h-44 items-end gap-1.5 sm:gap-2.5">
      {series.map((v, i) => {
        const height = (v / max) * 100;
        const isPeak = v === max;
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${height}%`, opacity: 1 }}
              transition={{
                duration: 0.7,
                delay: i * 0.045,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={
                isPeak
                  ? "w-full rounded-t-md bg-accent-gradient shadow-accent-glow"
                  : "w-full rounded-t-md bg-white/10 transition-colors duration-300 group-hover:bg-accent/50"
              }
            />
            {/* Tooltip */}
            <span className="pointer-events-none absolute -top-7 rounded-md border border-white/10 bg-obsidian/90 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
              {v.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
