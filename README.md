# Raffall — Premium Raffle Marketplace (UI)

A two-sided prize-competition marketplace, built with a deliberately
**ultra-modern, premium, glassmorphic** visual identity (Linear / Apple
inspired). This phase delivers the **global layout** and the **primary host
dashboard view** described in `raffall-clone-plan.md`.

## Stack

| Layer        | Choice                                            |
| ------------ | ------------------------------------------------- |
| Framework    | React 18 + TypeScript + Vite                      |
| Styling      | Tailwind CSS (custom obsidian/violet design system) |
| Motion       | Framer Motion (staggered entrances, chart draws)  |
| Primitives   | Radix UI (installed for accessible building blocks) |
| Icons        | lucide-react (`strokeWidth={1.5}`, 16–20px)       |
| Routing      | React Router v6 with `/en/` locale prefix         |

## Design system

- **No pure black** — base is obsidian `#09090b` with a fixed aurora mesh-gradient backdrop.
- **Single accent** — Electric Violet (`#8b5cf6`), used sparingly on CTAs, active states and highlights.
- **Glassmorphism** — `backdrop-blur`, `bg-white/[0.03]`, hairline `border-white/10`, layered depth.
- **Bento grid** dashboard with `rounded-2xl` surfaces and uniform spacing.
- **Tactility** — `duration-300 ease-premium` transitions, hover lift, and a cursor-tracking
  spotlight glow on cards (`SpotlightCard`).
- **Premium loading** — shimmering skeletons (`.skeleton`) over spinners.
- Reusable utilities live in `src/index.css` (`.glass`, `.text-gradient`, `.skeleton`, `.bg-grid`).

## Routes

| Path             | View                                  |
| ---------------- | ------------------------------------- |
| `/` → `/en`      | Marketing landing (hero, how-it-works) |
| `/en/dashboard`  | Host dashboard — bento grid overview  |

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

## Project structure

```
src/
  components/
    layout/        AppShell, Sidebar, Topbar, MarketingNav
    ui/            Button, Badge, Skeleton, SpotlightCard, AuroraBackground,
                   AnimatedNumber, Sparkline
    dashboard/     StatCard, SalesChart, TrafficDonut, LiveRaffles, ActivityFeed
  pages/           Landing, Dashboard
  data/mock.ts     Mock raffles / activity / stats
  lib/utils.ts     cn(), currency & compact formatters
```

See `raffall-clone-plan.md` for the full platform plan (data model, state
machine, money flow, build phases).
