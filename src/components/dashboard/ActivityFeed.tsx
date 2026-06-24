import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import type { HostActivityItem } from "@/lib/raffles";

const entryLabel: Record<string, string> = {
  paid: "bought a ticket",
  free_bonus: "received a bonus ticket",
};

/** Compact "x minutes ago" formatter. */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActivityFeed({ items }: { items: HostActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-500">
          <Activity strokeWidth={1.5} className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-zinc-300">No recent activity</p>
        <p className="max-w-[14rem] text-xs text-zinc-500">
          Entries on your raffles will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((a, i) => (
        <motion.li
          key={a.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-300 hover:bg-white/[0.03]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-accent-soft">
            <Activity strokeWidth={1.5} className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-zinc-200">
              <span className="text-zinc-400">
                {entryLabel[a.entryType] ?? "new entry"}
              </span>
            </p>
            <p className="truncate text-[11px] text-zinc-500">{a.raffleTitle}</p>
          </div>
          <p className="shrink-0 text-[11px] text-zinc-600">
            {timeAgo(a.createdAt)}
          </p>
        </motion.li>
      ))}
    </ul>
  );
}
