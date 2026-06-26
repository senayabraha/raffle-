import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, PackageOpen } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { RaffleCard } from "@/components/marketplace/RaffleCard";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { fetchPublicRaffles } from "@/lib/raffles";
import {
  categories,
  sortOptions,
  type MarketplaceRaffle,
  type SortKey,
} from "@/data/marketplace";

const isSortKey = (v: string | null): v is SortKey =>
  !!v && sortOptions.some((o) => o.key === v);

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("cat") ?? "All";
  const sortParam = searchParams.get("sort");
  const sort: SortKey = isSortKey(sortParam) ? sortParam : "ending";
  const [allRaffles, setAllRaffles] = useState<MarketplaceRaffle[]>([]);
  const [loading, setLoading] = useState(true);

  function setQuery(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next) params.set("q", next);
        else params.delete("q");
        return params;
      },
      { replace: true },
    );
  }

  function setCategory(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next !== "All") params.set("cat", next);
        else params.delete("cat");
        return params;
      },
      { replace: true },
    );
  }

  function setSort(next: SortKey) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next !== "ending") params.set("sort", next);
        else params.delete("sort");
        return params;
      },
      { replace: true },
    );
  }

  // Load live, public raffles created by real hosts.
  useEffect(() => {
    let active = true;
    fetchPublicRaffles().then((rows) => {
      if (!active) return;
      setAllRaffles(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

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
        <h1 className="mt-4 text-4xl font-bold tracking-tightest text-ink sm:text-5xl">
          Browse the <span className="text-gradient">marketplace</span>
        </h1>
        <p className="mt-3 max-w-xl text-ink-muted">
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
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prizes, hosts, categories…"
              className="focus-ring h-11 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-sm text-ink placeholder:text-ink-subtle transition-colors duration-300 hover:border-line focus:border-accent/50"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3">
            <SlidersHorizontal
              strokeWidth={1.5}
              className="h-[18px] w-[18px] text-ink-subtle"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-11 cursor-pointer appearance-none bg-transparent pr-2 text-sm font-medium text-ink outline-none"
            >
              {sortOptions.map((o) => (
                <option key={o.key} value={o.key} className="bg-surface text-ink">
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
                ? "border-accent/50 bg-accent/15 text-ink shadow-accent-glow"
                : "border-line bg-surface text-ink-muted hover:border-line hover:text-ink",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass h-72 animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
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
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface text-ink-subtle">
            <PackageOpen strokeWidth={1.5} className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-ink">
            {query || category !== "All"
              ? "No raffles found"
              : "No live raffles yet"}
          </p>
          <p className="max-w-xs text-sm text-ink-subtle">
            {query || category !== "All"
              ? "Try a different search term or clear your filters to see everything."
              : "Check back soon — new prize competitions appear here as hosts launch them."}
          </p>
          {(query || category !== "All") && (
            <button
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
              className="mt-1 text-sm font-medium text-accent-soft transition-colors hover:text-ink"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </PublicShell>
  );
}
