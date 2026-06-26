import { useEffect, useState } from "react";
import {
  getFeaturedRaffles,
  getFeaturedSettings,
  type FeaturedRaffleCard,
  type FeaturedSettings,
} from "@/lib/featured";

interface UseFeaturedRafflesResult {
  raffles: FeaturedRaffleCard[];
  settings: FeaturedSettings | null;
  loading: boolean;
  error: string | null;
}

/** Public, anon-key read of the homepage's featured raffle carousel feed. */
export function useFeaturedRaffles(): UseFeaturedRafflesResult {
  const [raffles, setRaffles] = useState<FeaturedRaffleCard[]>([]);
  const [settings, setSettings] = useState<FeaturedSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getFeaturedRaffles(), getFeaturedSettings()])
      .then(([rows, settingsRow]) => {
        if (!active) return;
        setRaffles(rows);
        setSettings(settingsRow);
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

  return { raffles, settings, loading, error };
}
