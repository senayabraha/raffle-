import {
  Trophy,
  Car,
  Plane,
  Gamepad2,
  Watch,
  Home,
  type LucideIcon,
} from "lucide-react";

export interface RaffleRow {
  id: string;
  title: string;
  category: string;
  icon: LucideIcon;
  status: "live" | "draw_pending" | "ended";
  ticketPrice: number;
  sold: number;
  cap: number;
  drawDate: string;
  revenue: number;
  conversion: number;
}

export const raffles: RaffleRow[] = [
  {
    id: "rf_8412",
    title: "Brand-New Tesla Model 3 Performance",
    category: "Automotive",
    icon: Car,
    status: "live",
    ticketPrice: 9,
    sold: 18420,
    cap: 25000,
    drawDate: "2026-07-04",
    revenue: 165780,
    conversion: 7.4,
  },
  {
    id: "rf_8390",
    title: "7-Night Maldives Overwater Villa Escape",
    category: "Travel",
    icon: Plane,
    status: "live",
    ticketPrice: 5,
    sold: 9240,
    cap: 12000,
    drawDate: "2026-06-29",
    revenue: 46200,
    conversion: 6.1,
  },
  {
    id: "rf_8377",
    title: "Ultimate Gaming Battlestation Bundle",
    category: "Tech",
    icon: Gamepad2,
    status: "live",
    ticketPrice: 3,
    sold: 14110,
    cap: 15000,
    drawDate: "2026-06-25",
    revenue: 42330,
    conversion: 9.2,
  },
  {
    id: "rf_8351",
    title: "Rolex Submariner — Date 41mm",
    category: "Luxury",
    icon: Watch,
    status: "draw_pending",
    ticketPrice: 12,
    sold: 8000,
    cap: 8000,
    drawDate: "2026-06-23",
    revenue: 96000,
    conversion: 11.3,
  },
  {
    id: "rf_8302",
    title: "£250,000 Dream Home Deposit",
    category: "Property",
    icon: Home,
    status: "ended",
    ticketPrice: 20,
    sold: 30000,
    cap: 30000,
    drawDate: "2026-06-15",
    revenue: 600000,
    conversion: 13.8,
  },
];

export interface ActivityItem {
  id: string;
  name: string;
  initials: string;
  action: string;
  detail: string;
  time: string;
  amount?: number;
}

export const activity: ActivityItem[] = [
  { id: "a1", name: "Amelia R.", initials: "AR", action: "bought", detail: "25 tickets · Tesla Model 3", time: "just now", amount: 225 },
  { id: "a2", name: "Daniel K.", initials: "DK", action: "shared", detail: "earned 1 free ticket", time: "1m ago" },
  { id: "a3", name: "Priya S.", initials: "PS", action: "bought", detail: "10 tickets · Maldives Escape", time: "3m ago", amount: 50 },
  { id: "a4", name: "Marcus T.", initials: "MT", action: "used promo", detail: "LAUNCH20 · Gaming Bundle", time: "6m ago", amount: 24 },
  { id: "a5", name: "Sofia L.", initials: "SL", action: "bought", detail: "5 tickets · Rolex Submariner", time: "9m ago", amount: 60 },
];

// 14-day sales sparkline data (tickets sold per day)
export const salesSeries = [
  120, 180, 150, 240, 300, 280, 360, 420, 390, 520, 610, 580, 720, 860,
];

export const trafficSources = [
  { label: "Direct", value: 38, tone: "#8b5cf6" },
  { label: "Social", value: 29, tone: "#22d3ee" },
  { label: "Affiliate", value: 21, tone: "#f472b6" },
  { label: "Email", value: 12, tone: "#34d399" },
];

export const topStats = [
  { key: "revenue", label: "Escrowed Revenue", value: 254310, prefix: "£", delta: 12.4, icon: Trophy },
  { key: "tickets", label: "Tickets Sold (30d)", value: 49770, delta: 8.1, icon: Gamepad2 },
  { key: "live", label: "Live Raffles", value: 3, delta: 0, icon: Plane },
  { key: "conversion", label: "Avg. Conversion", value: 8.4, suffix: "%", delta: 2.3, icon: Watch },
];
