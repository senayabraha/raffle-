import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, PackageOpen } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { RaffleCard } from "@/components/marketplace/RaffleCard";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { fetchPublicRaffles } from "@/lib/raffles";
import {
  marketplaceRaffles,
  categories,
  sortOptions,
  type MarketplaceRaffle,
  type SortKey,
} from "@/data/marketplace";

export default function Marketplace() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("ending");
  const [dbRaffles, setDbRaffles] = useState<MarketplaceRaffle[]>([]);

  // Load live raffles created by real hosts; show them ahead of the demo set.
  useEffect(() => {
    let active = true;
    fetchPublicRaffles().then((rows) => {
      if (active) setDbRaffles(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  const allRaffles = useMemo(
    () => [...dbRaffles, ...marketplaceRaffles],
    [dbRaffles],
  );

  const results = useMemo(() => {
    let list = allRaffles.filter((r) => {
      const matchesCat = category === "All" || r.category === category;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.host.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "ending":
          return +new Date(a.drawDate) - +new Date(b.drawDate);
        case "popular":
          return b.sold - a.sold;
        case "price":
          return a.ticketPrice - b.ticketPrice;
        case "newest":
          return b.id.localeCompare(a.id);
      }
    });
    return list;
  }, [allRaffles, query, category, sort]);

  return (
    <PublicShell>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <Badge tone="accent" dot>
          {allRaffles.filter((r) => r.status === "live").length} live draws right
          now
        </Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tightest text-white sm:text-5xl">
          Browse the <span className="text-gradient">marketplace</span>
        </h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          Discover live prize competitions from trusted hosts. Every draw is
          automated, auditable and escrow-protected.
        </p>
      </motion.div>

      {/* Controls */}
      <div className="sticky top-24 z-20 mb-6">
        <div className="glass-strong flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prizes, hosts, categories…"
              className="focus-ring h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-11 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 transition-colors duration-300 hover:border-white/20 focus:border-accent/50"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3">
            <SlidersHorizontal
              strokeWidth={1.5}
              className="h-[18px] w-[18px] text-zinc-500"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-11 cursor-pointer appearance-none bg-transparent pr-2 text-sm font-medium text-zinc-200 outline-none"
            >
              {sortOptions.map((o) => (
                <option key={o.key} value={o.key} className="bg-obsidian-50 text-zinc-200">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div className="mb-7 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "focus-ring rounded-full border px-3.5 py-1.5 text-sm font-medium tracking-tight transition-all duration-300 ease-premium",
              category === c
                ? "border-accent/50 bg-accent/15 text-white shadow-accent-glow"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-100",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {results.length > 0 ? (
        <motion.div
          layout
          className="grid grid-cols-1 gap-5 pb-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {results.map((r, i) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: Math.min(i * 0.05, 0.4),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <RaffleCard raffle={r} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="glass flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-500">
            <PackageOpen strokeWidth={1.5} className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-white">No raffles found</p>
          <p className="max-w-xs text-sm text-zinc-500">
            Try a different search term or clear your filters to see everything.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
            className="mt-1 text-sm font-medium text-accent-soft transition-colors hover:text-white"
          >
            Clear filters
          </button>
        </div>
      )}
    </PublicShell>
  );
}
