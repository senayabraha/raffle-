import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Star } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FeaturedRafflesCarousel } from "@/components/FeaturedRafflesCarousel";
import { cn } from "@/lib/utils";
import {
  getAdminFeaturedRaffles,
  getAdminFeaturedFeed,
  searchRaffles,
  addFeaturedRaffle,
  removeFeaturedRaffle,
  reorderFeaturedRaffles,
  getFeaturedSettings,
  updateFeaturedSettings,
  type AdminFeaturedRaffle,
  type FeaturedFeedCard,
  type RaffleSearchResult,
  type FeaturedSettings,
} from "@/lib/featured";

const MAX_FEATURED = 12;
const MOBILE_OPTIONS = [1, 1.5, 2, 2.5, 3];
const DESKTOP_OPTIONS = [1, 1.5, 2, 2.5, 3, 4, 5];

function DisplaySettings({ onSaved }: { onSaved: () => void }) {
  const [settings, setSettings] = useState<FeaturedSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<"mobile" | "desktop" | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getFeaturedSettings()
      .then(setSettings)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load display settings.");
      });
  }, []);

  function flashSaved(field: "mobile" | "desktop") {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedField(field);
    savedTimerRef.current = setTimeout(() => setSavedField(null), 1500);
  }

  async function handleChange(field: "cards_per_screen_mobile" | "cards_per_screen_desktop", value: number) {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, [field]: value });
    try {
      await updateFeaturedSettings({ [field]: value });
      flashSaved(field === "cards_per_screen_mobile" ? "mobile" : "desktop");
      onSaved();
    } catch (err) {
      setSettings(previous);
      setError(err instanceof Error ? err.message : "Failed to update display settings.");
    }
  }

  return (
    <SpotlightCard lift={false} className="mt-6 p-5">
      <CardHeader title="Display Settings" subtitle="Control how many cards are visible at once" />

      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

      {!settings ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Mobile — cards visible at once</p>
              {savedField === "mobile" && <span className="text-xs text-emerald-400">Saved</span>}
            </div>
            <div className="mt-2 flex gap-1.5 rounded-xl border border-line bg-surface p-1">
              {MOBILE_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChange("cards_per_screen_mobile", value)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
                    settings.cards_per_screen_mobile === value
                      ? "bg-accent-gradient text-white"
                      : "text-ink-subtle hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Desktop — cards visible at once</p>
              {savedField === "desktop" && <span className="text-xs text-emerald-400">Saved</span>}
            </div>
            <div className="mt-2 flex gap-1.5 rounded-xl border border-line bg-surface p-1">
              {DESKTOP_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChange("cards_per_screen_desktop", value)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
                    settings.cards_per_screen_desktop === value
                      ? "bg-accent-gradient text-white"
                      : "text-ink-subtle hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </SpotlightCard>
  );
}

export default function FeaturedRafflesAdmin() {
  const [featured, setFeatured] = useState<AdminFeaturedRaffle[]>([]);
  const [feed, setFeed] = useState<FeaturedFeedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminFeaturedRaffle | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RaffleSearchResult[]>([]);
  const [searching, setSearching] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load() {
    setLoading(true);
    Promise.all([getAdminFeaturedRaffles(), getAdminFeaturedFeed()])
      .then(([rows, feedRows]) => {
        setFeatured(rows);
        setFeed(feedRows);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load featured raffles.");
      })
      .finally(() => setLoading(false));
    setPreviewKey((k) => k + 1);
  }

  useEffect(load, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchRaffles(query.trim())
        .then(setResults)
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Failed to load live raffles.");
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
      load();
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
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add featured raffle.");
    }
  }

  const autoFilled = feed.filter((card) => card.source === "auto");
  const autoFilledCount = Math.max(0, MAX_FEATURED - featured.length);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Featured Raffles</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Curate which raffles appear in the homepage featured carousel.
      </p>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      <DisplaySettings onSaved={() => setPreviewKey((k) => k + 1)} />

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
            No raffles featured yet. The homepage carousel will fill itself with the most popular live raffles
            (shown below).
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

      {!loading && autoFilled.length > 0 && (
        <SpotlightCard lift={false} className="mt-6 p-5">
          <CardHeader
            title="Auto-filled slots"
            subtitle="Currently showing on the homepage to fill the remaining slots, most popular first. Pin one to lock its position."
          />
          <div className="space-y-3">
            {autoFilled.map((card) => (
              <div key={card.id} className="flex items-center gap-4 rounded-xl border border-line bg-surface p-3">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {card.prize_image_url && (
                    <img src={card.prize_image_url} alt={card.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{card.title}</p>
                  <Badge tone="neutral" className="mt-1">
                    Auto-filled
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => handleAdd(card.raffle_id)}
                  disabled={featured.length >= MAX_FEATURED}
                >
                  <Star className="h-4 w-4" />
                  Pin
                </Button>
              </div>
            ))}
          </div>
        </SpotlightCard>
      )}

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader title="Live raffles" subtitle="Every currently live raffle. Pin any of them to the featured carousel." />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by title…"
          className="h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-subtle focus-ring"
        />
        <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {searching ? (
            <div className="p-3 text-sm text-ink-subtle">Loading…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-ink-subtle">
              {query.trim() ? "No matching live raffles." : "No currently live raffles."}
            </div>
          ) : (
            results.map((result) => {
              const alreadyFeatured = featured.some((f) => f.raffle_id === result.id);
              return (
                <div
                  key={result.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-sm text-ink hover:bg-surface-2"
                >
                  <span className="truncate">{result.title}</span>
                  {alreadyFeatured ? (
                    <Badge tone="accent" className="shrink-0">
                      Featured
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      disabled={featured.length >= MAX_FEATURED}
                      onClick={() => handleAdd(result.id)}
                    >
                      Add
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SpotlightCard>

      <SpotlightCard lift={false} className="mt-6 overflow-hidden p-0">
        <div className="p-5 pb-0">
          <CardHeader
            title="Live preview"
            subtitle="Exactly what visitors see on the homepage right now — updates as you make changes above."
          />
        </div>
        <div className="-mx-0 bg-app">
          <FeaturedRafflesCarousel key={previewKey} />
        </div>
      </SpotlightCard>

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
