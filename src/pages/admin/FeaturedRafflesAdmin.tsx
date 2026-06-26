import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  getAdminFeaturedRaffles,
  searchRaffles,
  addFeaturedRaffle,
  removeFeaturedRaffle,
  reorderFeaturedRaffles,
  type AdminFeaturedRaffle,
  type RaffleSearchResult,
} from "@/lib/featured";

const MAX_FEATURED = 12;

export default function FeaturedRafflesAdmin() {
  const [featured, setFeatured] = useState<AdminFeaturedRaffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminFeaturedRaffle | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RaffleSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load() {
    setLoading(true);
    getAdminFeaturedRaffles()
      .then((rows) => {
        setFeatured(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load featured raffles.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchRaffles(trimmed)
        .then(setResults)
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Failed to search raffles.");
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleReorder(id: string, direction: "up" | "down") {
    const index = featured.findIndex((f) => f.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= featured.length) return;

    const next = [...featured];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setFeatured(next);
    try {
      await reorderFeaturedRaffles(next.map((f) => f.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder featured raffles.");
      load();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await removeFeaturedRaffle(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove featured raffle.");
    }
  }

  async function handleAdd(raffleId: string) {
    try {
      await addFeaturedRaffle(raffleId, featured.length + 1);
      setQuery("");
      setResults([]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add featured raffle.");
    }
  }

  const autoFilledCount = Math.max(0, MAX_FEATURED - featured.length);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Featured Raffles</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Curate which raffles appear in the homepage featured carousel.
      </p>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader
          title={`${featured.length} of ${MAX_FEATURED} slots filled`}
          subtitle={`${autoFilledCount} auto-filled from popular raffles`}
        />

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-sm text-ink-subtle">
            No raffles featured yet. The homepage carousel will fill itself with the most popular live raffles.
          </p>
        ) : (
          <div className="space-y-3">
            {featured.map((row, i) => (
              <div key={row.id} className="flex items-center gap-4 rounded-xl border border-line bg-surface p-3">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {row.prize_image_url && (
                    <img src={row.prize_image_url} alt={row.title} className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{row.title}</p>
                  <Badge tone="accent" className="mt-1">
                    Order {row.display_order}
                  </Badge>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => handleReorder(row.id, "up")}
                    className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={i === featured.length - 1}
                    onClick={() => handleReorder(row.id, "down")}
                    className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SpotlightCard>

      {featured.length < MAX_FEATURED && (
        <SpotlightCard lift={false} className="mt-6 p-5">
          <CardHeader title="Add a raffle" subtitle="Search live raffles by title" />
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search raffle titles…"
              className="h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-subtle focus-ring"
            />
            {query.trim() && (
              <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-glass">
                {searching ? (
                  <div className="p-3 text-sm text-ink-subtle">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="p-3 text-sm text-ink-subtle">No matching raffles.</div>
                ) : (
                  results.map((result) => {
                    const alreadyFeatured = featured.some((f) => f.raffle_id === result.id);
                    return (
                      <button
                        key={result.id}
                        type="button"
                        disabled={alreadyFeatured}
                        onClick={() => handleAdd(result.id)}
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        <span className="truncate">{result.title}</span>
                        {alreadyFeatured && <Badge tone="neutral">Already featured</Badge>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </SpotlightCard>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="glass w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-ink">Remove this raffle?</h2>
            <p className="mt-2 text-sm text-ink-subtle">
              "{deleteTarget.title}" will no longer be curated in the featured carousel.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleDelete}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
