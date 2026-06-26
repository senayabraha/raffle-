import { useCallback, useEffect, useState } from "react";
import {
  fetchAllHeroSlides,
  fetchHeroSettings,
  addHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
  updateHeroSettings,
  uploadHeroMedia,
  type HeroSlide,
  type HeroSettings,
} from "@/lib/hero";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";

interface UseHeroAdminResult {
  slides: HeroSlide[];
  settings: HeroSettings | null;
  loading: boolean;
  error: string | null;
  fetchSlides: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  addSlide: (data: Omit<TablesInsert<"hero_slides">, "order">) => Promise<void>;
  updateSlide: (id: string, data: TablesUpdate<"hero_slides">) => Promise<void>;
  deleteSlide: (id: string) => Promise<void>;
  reorderSlides: (orderedIds: string[]) => Promise<void>;
  updateSettings: (data: TablesUpdate<"hero_settings">) => Promise<void>;
  uploadMedia: (file: File) => Promise<string>;
}

/** Admin CRUD for hero slides + settings. Requires the caller to already be authenticated. */
export function useHeroAdmin(): UseHeroAdminResult {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [settings, setSettings] = useState<HeroSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlides = useCallback(async () => {
    try {
      setSlides(await fetchAllHeroSlides());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hero slides.");
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setSettings(await fetchHeroSettings());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hero settings.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAllHeroSlides(), fetchHeroSettings()])
      .then(([slideRows, settingsRow]) => {
        if (!active) return;
        setSlides(slideRows);
        setSettings(settingsRow);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load hero carousel admin data.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function addSlide(data: Omit<TablesInsert<"hero_slides">, "order">) {
    await addHeroSlide(data);
    await fetchSlides();
  }

  async function updateSlide(id: string, data: TablesUpdate<"hero_slides">) {
    await updateHeroSlide(id, data);
    await fetchSlides();
  }

  async function deleteSlide(id: string) {
    await deleteHeroSlide(id);
    await fetchSlides();
  }

  async function reorderSlides(orderedIds: string[]) {
    await reorderHeroSlides(orderedIds);
    await fetchSlides();
  }

  async function updateSettings(data: TablesUpdate<"hero_settings">) {
    const updated = await updateHeroSettings(data);
    setSettings(updated);
  }

  return {
    slides,
    settings,
    loading,
    error,
    fetchSlides,
    fetchSettings,
    addSlide,
    updateSlide,
    deleteSlide,
    reorderSlides,
    updateSettings,
    uploadMedia: uploadHeroMedia,
  };
}
