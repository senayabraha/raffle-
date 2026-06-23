import { motion } from "framer-motion";
import { activity } from "@/data/mock";
import { formatCurrency } from "@/lib/utils";

export function ActivityFeed() {
  return (
    <ul className="space-y-1">
      {activity.map((a, i) => (
        <motion.li
          key={a.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-300 hover:bg-white/[0.03]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-bold text-accent-soft">
            {a.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-zinc-200">
              <span className="font-semibold text-white">{a.name}</span>{" "}
              <span className="text-zinc-400">{a.action}</span>
            </p>
            <p className="truncate text-[11px] text-zinc-500">{a.detail}</p>
          </div>
          <div className="shrink-0 text-right">
            {a.amount != null && (
              <p className="text-sm font-semibold tabular-nums text-emerald-300">
                +{formatCurrency(a.amount)}
              </p>
            )}
            <p className="text-[11px] text-zinc-600">{a.time}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
