import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "GBP") {
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
