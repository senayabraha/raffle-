import { motion } from "framer-motion";
import { trafficSources } from "@/data/mock";

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

interface Slice {
  label: string;
  value: number;
  tone: string;
}

/** Donut chart of a breakdown (traffic sources / entry types) with draw-in. */
export function TrafficDonut({
  data,
  centerValue,
  centerLabel = "visits",
}: {
  data?: Slice[];
  centerValue?: string;
  centerLabel?: string;
}) {
  const slices = data ?? trafficSources;
  let offset = 0;

  if (slices.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-full border-[6px] border-white/[0.06]" />
        <p className="mt-3 text-xs text-zinc-500">No entries yet</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
          />
          {slices.map((s) => {
            const len = (s.value / 100) * CIRC;
            const seg = (
              <motion.circle
                key={s.label}
                cx="64"
                cy="64"
                r={RADIUS}
                fill="none"
                stroke={s.tone}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${len} ${CIRC - len}`}
                initial={{ strokeDashoffset: -CIRC }}
                animate={{ strokeDashoffset: -offset }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
            );
            offset += len;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tracking-tight text-white">
            {centerValue ?? "49.7k"}
          </span>
          <span className="text-[10px] text-zinc-500">{centerLabel}</span>
        </div>
      </div>

      <ul className="flex-1 space-y-2.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.tone }}
            />
            <span className="flex-1 text-zinc-400">{s.label}</span>
            <span className="font-semibold tabular-nums text-white">{s.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
