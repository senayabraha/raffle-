import { supabase } from "./supabase";
import type { Tables, TablesInsert, TablesUpdate } from "./database.types";

export type HeroSlide = Tables<"hero_slides">;
export type HeroSettings = Tables<"hero_settings">;

const HERO_MEDIA_BUCKET = "hero-media";
const MAX_SLIDES = 5;
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Active slides for the public homepage carousel, in display order. */
export async function fetchPublicHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("*")
    .eq("is_active", true)
    .order("order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** The single hero_settings row (rotation interval, transition direction). */
export async function fetchHeroSettings(): Promise<HeroSettings> {
  const { data, error } = await supabase.from("hero_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

/** All slides, including inactive ones, for the admin manager. */
export async function fetchAllHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("*")
    .order("order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Inserts a new slide after the current last one. Caps the deck at 5 slides. */
export async function addHeroSlide(
  slide: Omit<TablesInsert<"hero_slides">, "order">,
): Promise<HeroSlide> {
  const existing = await fetchAllHeroSlides();
  if (existing.length >= MAX_SLIDES) {
    throw new Error(`Maximum of ${MAX_SLIDES} slides reached.`);
  }
  const nextOrder = existing.reduce((max, s) => Math.max(max, s.order), 0) + 1;

  const { data, error } = await supabase
    .from("hero_slides")
    .insert({ ...slide, order: nextOrder })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateHeroSlide(
  id: string,
  patch: TablesUpdate<"hero_slides">,
): Promise<HeroSlide> {
  const { data, error } = await supabase
    .from("hero_slides")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Deletes a slide row and, if it had media, the file backing it in Storage. */
export async function deleteHeroSlide(id: string): Promise<void> {
  const { data: slide, error: fetchError } = await supabase
    .from("hero_slides")
    .select("media_url")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await supabase.from("hero_slides").delete().eq("id", id);
  if (error) throw error;

  if (slide.media_url) {
    const path = heroMediaPathFromUrl(slide.media_url);
    if (path) await supabase.storage.from(HERO_MEDIA_BUCKET).remove([path]);
  }
}

/** Persists a new slide order. `orderedIds` is the full slide list, top to bottom. */
export async function reorderHeroSlides(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from("hero_slides").update({ order: index + 1 }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function updateHeroSettings(patch: TablesUpdate<"hero_settings">): Promise<HeroSettings> {
  const { data, error } = await supabase
    .from("hero_settings")
    .update(patch)
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Uploads a hero slide's media file and returns its public URL. */
export async function uploadHeroMedia(file: File): Promise<string> {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    throw new Error("Only image or video files are allowed.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large. Maximum size is 50MB.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || (isImage ? "jpg" : "mp4");
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(HERO_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from(HERO_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function heroMediaPathFromUrl(url: string): string | null {
  const marker = `/${HERO_MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}
