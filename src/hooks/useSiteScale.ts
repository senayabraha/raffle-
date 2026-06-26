import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const MOBILE_MAX = 767;
const TABLET_MAX = 1279;

type Breakpoint = "mobile" | "tablet" | "desktop";

interface SiteScaleRow {
  scale_mobile: number;
  scale_tablet: number;
  scale_desktop: number;
}

interface UseSiteScaleResult {
  scaleMobile: number;
  scaleTablet: number;
  scaleDesktop: number;
  /** The scale for the current window width — what callers should apply as `zoom`. */
  currentScale: number;
  loading: boolean;
}

function breakpointFor(width: number): Breakpoint {
  if (width <= MOBILE_MAX) return "mobile";
  if (width <= TABLET_MAX) return "tablet";
  return "desktop";
}

/**
 * Public, no-auth fetch of the admin-controlled site display scale
 * (hero_settings.scale_mobile/tablet/desktop). Returns 1.0 while loading so
 * the public/host layouts never flash at the wrong scale on first render.
 */
export function useSiteScale(): UseSiteScaleResult {
  const [scales, setScales] = useState<SiteScaleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    let active = true;
    supabase
      .from("hero_settings")
      .select("scale_mobile, scale_tablet, scale_desktop")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setScales(data);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const scaleMobile = scales?.scale_mobile ?? 1;
  const scaleTablet = scales?.scale_tablet ?? 1;
  const scaleDesktop = scales?.scale_desktop ?? 1;

  const breakpoint = breakpointFor(width);
  const currentScale = loading
    ? 1
    : breakpoint === "mobile"
      ? scaleMobile
      : breakpoint === "tablet"
        ? scaleTablet
        : scaleDesktop;

  return { scaleMobile, scaleTablet, scaleDesktop, currentScale, loading };
}
