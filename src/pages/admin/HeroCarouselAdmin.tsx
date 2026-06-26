import { useState } from "react";
import { ArrowUp, ArrowDown, Pencil, Trash2, X, Upload } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useHeroAdmin } from "@/hooks/useHeroAdmin";
import type { HeroSlide } from "@/lib/hero";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";

const MAX_SLIDES = 5;

export default function HeroCarouselAdmin() {
  const {
    slides,
    settings,
    loading,
    error,
    addSlide,
    updateSlide,
    deleteSlide,
    reorderSlides,
    updateSettings,
    uploadMedia,
  } = useHeroAdmin();

  const [editing, setEditing] = useState<HeroSlide | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HeroSlide | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleReorder(id: string, direction: "up" | "down") {
    const index = slides.findIndex((s) => s.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= slides.length) return;

    const next = [...slides];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    try {
      await reorderSlides(next.map((s) => s.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reorder slides.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSlide(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete slide.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Hero Carousel</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Manage the homepage hero slides, their order, and rotation settings.
      </p>

      {(error || actionError) && (
        <p className="mt-4 text-sm text-rose-400">{error ?? actionError}</p>
      )}

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader
          title="Transition direction"
          subtitle="Controls how slides animate between each other"
        />
        {loading || !settings ? (
          <div className="h-10 w-48 animate-pulse rounded-lg bg-surface" />
        ) : (
          <div className="flex gap-3">
            {(["horizontal", "vertical"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => updateSettings({ transition_direction: dir })}
                className={`h-10 rounded-xl border px-4 text-sm font-medium capitalize transition-colors ${
                  settings.transition_direction === dir
                    ? "border-accent/40 bg-accent/10 text-accent-deep dark:text-accent-soft"
                    : "border-line bg-surface text-ink-muted hover:bg-surface-2"
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
        )}
      </SpotlightCard>

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader
          title={`${slides.length} of ${MAX_SLIDES} slides`}
          action={
            <span title={slides.length >= MAX_SLIDES ? "Maximum 5 slides reached" : undefined}>
              <Button size="sm" disabled={slides.length >= MAX_SLIDES} onClick={() => setEditing("new")}>
                Add Slide
              </Button>
            </span>
          }
        />

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : slides.length === 0 ? (
          <p className="text-sm text-ink-subtle">No slides yet. Add one to populate the homepage hero.</p>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className="flex items-center gap-4 rounded-xl border border-line bg-surface p-3"
              >
                <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {slide.media_url && slide.media_type === "video" ? (
                    <video src={slide.media_url} autoPlay muted loop playsInline className="h-full w-full object-cover" />
                  ) : slide.media_url ? (
                    <img src={slide.media_url} alt={slide.headline} className="h-full w-full object-cover" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{slide.headline}</p>
                  <Badge tone={slide.is_active ? "live" : "neutral"} className="mt-1">
                    {slide.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => handleReorder(slide.id, "up")}
                    className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={i === slides.length - 1}
                    onClick={() => handleReorder(slide.id, "down")}
                    className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(slide)}
                    className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(slide)}
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

      {editing && (
        <SlideEditorModal
          slide={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing === "new") {
              await addSlide(data);
            } else {
              await updateSlide(editing.id, data);
            }
            setEditing(null);
          }}
          uploadMedia={uploadMedia}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="glass w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-ink">Delete this slide?</h2>
            <p className="mt-2 text-sm text-ink-subtle">
              "{deleteTarget.headline}" and its media will be permanently removed.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlideEditorModal({
  slide,
  onClose,
  onSave,
  uploadMedia,
}: {
  slide: HeroSlide | null;
  onClose: () => void;
  onSave: (data: Omit<TablesInsert<"hero_slides">, "order"> & TablesUpdate<"hero_slides">) => Promise<void>;
  uploadMedia: (file: File) => Promise<string>;
}) {
  const [headline, setHeadline] = useState(slide?.headline ?? "");
  const [subCopy, setSubCopy] = useState(slide?.sub_copy ?? "");
  const [mediaType, setMediaType] = useState<"image" | "video">(
    slide?.media_type === "video" ? "video" : "image",
  );
  const [mediaUrl, setMediaUrl] = useState(slide?.media_url ?? "");
  const [isActive, setIsActive] = useState(slide?.is_active ?? true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadMedia(file);
      setMediaUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload media.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!headline.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        headline: headline.trim(),
        sub_copy: subCopy.trim() || null,
        media_type: mediaUrl ? mediaType : null,
        media_url: mediaUrl || null,
        is_active: isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save slide.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">{slide ? "Edit slide" : "New slide"}</h2>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-ink">Headline</label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus-ring"
              placeholder="Win the prize of a lifetime"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink">Sub copy</label>
            <textarea
              value={subCopy}
              onChange={(e) => setSubCopy(e.target.value)}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus-ring"
              placeholder="Optional supporting line"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink">Media type</label>
            <div className="mt-1.5 flex gap-3">
              {(["image", "video"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMediaType(type)}
                  className={`h-9 rounded-xl border px-3.5 text-sm font-medium capitalize transition-colors ${
                    mediaType === type
                      ? "border-accent/40 bg-accent/10 text-accent-deep dark:text-accent-soft"
                      : "border-line bg-surface text-ink-muted hover:bg-surface-2"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-ink">Media file</label>
            {mediaUrl && (
              <div className="mt-1.5 h-32 w-full overflow-hidden rounded-xl bg-surface-2">
                {mediaType === "video" ? (
                  <video src={mediaUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
                ) : (
                  <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            )}
            <label className="mt-2 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface text-sm font-medium text-ink-muted hover:bg-surface-2">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : mediaUrl ? "Replace media" : "Upload media"}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-accent"
            />
            Active
          </label>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" disabled={!headline.trim() || submitting || uploading} onClick={handleSave}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
