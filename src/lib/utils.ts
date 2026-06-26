import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "ETB") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

export function formatRelativeTime(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  for (const [unit, ms] of RELATIVE_TIME_UNITS) {
    if (Math.abs(diffMs) >= ms) {
      return relativeTimeFormatter.format(Math.round(diffMs / ms), unit);
    }
  }
  return relativeTimeFormatter.format(Math.round(diffMs / 60_000), "minute");
}

/**
 * Only ever follow a `redirectTo` if it's a same-app relative path, never a
 * scheme-relative or absolute URL — otherwise a crafted login link could
 * bounce a freshly authenticated session off to an arbitrary host.
 */
export function safeRedirectPath(redirectTo: string | null, fallback: string) {
  if (!redirectTo) return fallback;
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) return fallback;
  return redirectTo;
}
