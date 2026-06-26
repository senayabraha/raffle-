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
  /** Uploaded prize photo URL, if the host added one (first of `images`). */
  image: string | null;
  /** Full ordered gallery of uploaded prize photos. */
  images: string[];
  /** Prize retail value in ETB, if the host disclosed one. */
  prizeValue: number | null;
  host: string;
  hostInitials: string;
  status: RaffleStatus;
  ticketPrice: number;
  sold: number;
  cap: number;
  /** ISO date string for the draw. */
  drawDate: string;
  bundles: { qty: number; free: number }[];
  /** Standing flag layered on top of `status` — see admin suspension migration. */
  suspensionStatus: "active" | "temporary" | "permanent";
  suspendedUntil: string | null;
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

