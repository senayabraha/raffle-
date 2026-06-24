import { type LucideIcon } from "lucide-react";

export type RaffleStatus = "live" | "draw_pending" | "ended";

export interface MarketplaceRaffle {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: LucideIcon;
  /** Tailwind gradient classes used for the prize cover. */
  gradient: string;
  host: string;
  hostInitials: string;
  status: RaffleStatus;
  ticketPrice: number;
  sold: number;
  cap: number;
  /** ISO date string for the draw. */
  drawDate: string;
  featured: boolean;
  charityPercent: number;
  bundles: { qty: number; free: number }[];
}

export const categories = [
  "All",
  "Automotive",
  "Travel",
  "Tech",
  "Luxury",
  "Property",
  "Cash",
  "Experiences",
] as const;

export type SortKey = "ending" | "popular" | "newest" | "price";

export const sortOptions: { key: SortKey; label: string }[] = [
  { key: "ending", label: "Ending soon" },
  { key: "popular", label: "Most popular" },
  { key: "newest", label: "Newest" },
  { key: "price", label: "Lowest price" },
];

