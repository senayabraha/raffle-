import {
  Car,
  Plane,
  Gamepad2,
  Watch,
  Home,
  Banknote,
  Camera,
  Bike,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export type RaffleStatus = "live" | "draw_pending" | "ended";

export interface MarketplaceRaffle {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  hostType: "individual" | "brand" | "charity";
  icon: LucideIcon;
  /** Tailwind gradient classes used for the prize cover. */
  gradient: string;
  host: string;
  hostInitials: string;
  rating: number;
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

// Helper to build ISO dates relative to "today" (the mock's reference date).
function inDays(days: number, hours = 0) {
  const d = new Date("2026-06-23T12:00:00Z");
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export const marketplaceRaffles: MarketplaceRaffle[] = [
  {
    id: "8412",
    slug: "tesla-model-3-performance",
    title: "Brand-New Tesla Model 3 Performance",
    description:
      "Win a brand-new dual-motor Tesla Model 3 Performance in Stealth Grey, fully loaded with Enhanced Autopilot. Taxed, insured for delivery, and yours to drive away.",
    category: "Automotive",
    hostType: "brand",
    icon: Car,
    gradient: "from-rose-500/30 via-accent/20 to-indigo-600/30",
    host: "DriveDreams Co.",
    hostInitials: "DD",
    rating: 4.9,
    status: "live",
    ticketPrice: 9,
    sold: 18420,
    cap: 25000,
    drawDate: inDays(11, 5),
    featured: true,
    charityPercent: 5,
    bundles: [
      { qty: 5, free: 1 },
      { qty: 10, free: 3 },
    ],
  },
  {
    id: "8390",
    slug: "maldives-overwater-villa-escape",
    title: "7-Night Maldives Overwater Villa Escape",
    description:
      "Two guests, seven nights in a private overwater villa with a personal butler, seaplane transfers and all-inclusive dining at a five-star Maldivian resort.",
    category: "Travel",
    hostType: "individual",
    icon: Plane,
    gradient: "from-cyan-400/30 via-sky-500/20 to-blue-600/30",
    host: "Lena Travels",
    hostInitials: "LT",
    rating: 4.8,
    status: "live",
    ticketPrice: 5,
    sold: 9240,
    cap: 12000,
    drawDate: inDays(6, 2),
    featured: true,
    charityPercent: 0,
    bundles: [{ qty: 5, free: 1 }],
  },
  {
    id: "8377",
    slug: "ultimate-gaming-battlestation",
    title: "Ultimate Gaming Battlestation Bundle",
    description:
      "RTX-powered tower, 240Hz OLED ultrawide, mechanical keyboard, studio headset and a height-adjustable desk. The complete setup, delivered and ready to play.",
    category: "Tech",
    hostType: "brand",
    icon: Gamepad2,
    gradient: "from-emerald-400/30 via-teal-500/20 to-cyan-600/30",
    host: "PixelForge",
    hostInitials: "PF",
    rating: 4.7,
    status: "live",
    ticketPrice: 3,
    sold: 14110,
    cap: 15000,
    drawDate: inDays(2, 9),
    featured: false,
    charityPercent: 0,
    bundles: [
      { qty: 10, free: 2 },
      { qty: 25, free: 8 },
    ],
  },
  {
    id: "8351",
    slug: "rolex-submariner-date-41mm",
    title: "Rolex Submariner — Date 41mm",
    description:
      "The iconic Oystersteel Submariner Date with the black Cerachrom bezel. Brand new, full set with box and papers, authenticated and insured.",
    category: "Luxury",
    hostType: "individual",
    icon: Watch,
    gradient: "from-amber-400/30 via-yellow-500/20 to-orange-600/30",
    host: "Horology House",
    hostInitials: "HH",
    rating: 5.0,
    status: "live",
    ticketPrice: 12,
    sold: 6800,
    cap: 8000,
    drawDate: inDays(4, 0),
    featured: false,
    charityPercent: 0,
    bundles: [{ qty: 5, free: 1 }],
  },
  {
    id: "8302",
    slug: "250k-dream-home-deposit",
    title: "£250,000 Dream Home Deposit",
    description:
      "A life-changing tax-free cash prize paid straight to your account — put it toward a deposit, clear the mortgage, or whatever you dream of.",
    category: "Cash",
    hostType: "individual",
    icon: Banknote,
    gradient: "from-fuchsia-500/30 via-accent/20 to-violet-700/30",
    host: "BigWin Draws",
    hostInitials: "BW",
    rating: 4.9,
    status: "live",
    ticketPrice: 20,
    sold: 21300,
    cap: 30000,
    drawDate: inDays(9, 6),
    featured: true,
    charityPercent: 10,
    bundles: [
      { qty: 5, free: 1 },
      { qty: 20, free: 6 },
    ],
  },
  {
    id: "8288",
    slug: "leica-q3-photographer-kit",
    title: "Leica Q3 Photographer's Kit",
    description:
      "The full-frame Leica Q3 with a 60MP sensor, plus a leather strap, two batteries and a premium travel case for the photographer who has taste.",
    category: "Tech",
    hostType: "brand",
    icon: Camera,
    gradient: "from-zinc-300/20 via-slate-400/20 to-zinc-600/30",
    host: "Aperture Club",
    hostInitials: "AC",
    rating: 4.6,
    status: "live",
    ticketPrice: 4,
    sold: 5120,
    cap: 9000,
    drawDate: inDays(14, 1),
    featured: false,
    charityPercent: 0,
    bundles: [{ qty: 5, free: 1 }],
  },
  {
    id: "8270",
    slug: "charity-supercar-track-day",
    title: "Supercar Track Day for Two (Charity)",
    description:
      "Drive a Ferrari, Lamborghini and McLaren around a championship circuit. 100% of proceeds support children's hospices across the UK.",
    category: "Experiences",
    hostType: "charity",
    icon: Bike,
    gradient: "from-red-500/30 via-rose-500/20 to-pink-600/30",
    host: "Brightside Trust",
    hostInitials: "BT",
    rating: 5.0,
    status: "live",
    ticketPrice: 2,
    sold: 3400,
    cap: 20000,
    drawDate: inDays(18, 4),
    featured: false,
    charityPercent: 100,
    bundles: [{ qty: 10, free: 3 }],
  },
  {
    id: "8255",
    slug: "iphone-pro-max-lifetime",
    title: "Latest iPhone Pro Max — Lifetime Upgrades",
    description:
      "Win the newest iPhone Pro Max today and receive the latest model every year, for life. Never queue for an upgrade again.",
    category: "Tech",
    hostType: "brand",
    icon: Smartphone,
    gradient: "from-indigo-400/30 via-violet-500/20 to-purple-700/30",
    host: "EverNew",
    hostInitials: "EN",
    rating: 4.8,
    status: "draw_pending",
    ticketPrice: 6,
    sold: 11000,
    cap: 11000,
    drawDate: inDays(0, -2),
    featured: false,
    charityPercent: 0,
    bundles: [{ qty: 5, free: 1 }],
  },
  {
    id: "8201",
    slug: "lakeside-cabin-getaway",
    title: "Lakeside Cabin Weekend Getaway",
    description:
      "A cosy two-night stay for four at a luxury lakeside cabin with a private hot tub, wood-fired sauna and paddleboards included.",
    category: "Travel",
    hostType: "individual",
    icon: Home,
    gradient: "from-teal-400/30 via-emerald-500/20 to-green-700/30",
    host: "Wildhaven",
    hostInitials: "WH",
    rating: 4.5,
    status: "ended",
    ticketPrice: 3,
    sold: 7000,
    cap: 7000,
    drawDate: inDays(-3, 0),
    featured: false,
    charityPercent: 0,
    bundles: [{ qty: 5, free: 1 }],
  },
];

export function getRaffleBySlug(slug: string) {
  return marketplaceRaffles.find((r) => r.slug === slug);
}
