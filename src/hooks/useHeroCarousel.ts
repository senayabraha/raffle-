import { useEffect, useState } from "react";
import { fetchPublicHeroSlides, fetchHeroSettings, type HeroSlide, type HeroSettings } from "@/lib/hero";

interface UseHeroCarouselResult {
  slides: HeroSlide[];
  settings: HeroSettings | null;
  loading: boolean;
  error: string | null;
}

/** Public, anon-key read of the active hero slides and rotation settings. */
export function useHeroCarousel(): UseHeroCarouselResult {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [settings, setSettings] = useState<HeroSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchPublicHeroSlides(), fetchHeroSettings()])
      .then(([slideRows, settingsRow]) => {
        if (!active) return;
        setSlides(slideRows);
        setSettings(settingsRow);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load hero carousel.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { slides, settings, loading, error };
}
