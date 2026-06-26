import { useEffect, useState } from "react";
import { getFeaturedRaffles, type FeaturedRaffleCard } from "@/lib/featured";

interface UseFeaturedRafflesResult {
  raffles: FeaturedRaffleCard[];
  loading: boolean;
  error: string | null;
}

/** Public, anon-key read of the homepage's featured raffle carousel feed. */
export function useFeaturedRaffles(): UseFeaturedRafflesResult {
  const [raffles, setRaffles] = useState<FeaturedRaffleCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getFeaturedRaffles()
      .then((rows) => {
        if (!active) return;
        setRaffles(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load featured raffles.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { raffles, loading, error };
}
