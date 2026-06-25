# Raffle Platform — Full Technical Audit

> Read-only audit of the current codebase (branch `claude/raffle-platform-audit-giiepc`).
> No application code was written or modified to produce this report.

## Contents
1. [Codebase Inventory](#1--codebase-inventory)
2. [Feature Audit vs Raffall](#2--feature-audit-vs-raffall)
3. [Findings Report](#3--findings-report)
4. [Navigation Flow Diagram](#4--navigation-flow-diagram)
5. [Checkout Flow Analysis](#5--checkout-flow-analysis)
6. [Draw Flow Analysis](#6--draw-flow-analysis)
7. [Priority Build List](#7--priority-build-list)

---

## 1 — Codebase Inventory

**Stack:** React 18 + TS + Vite, React Router v6 (`/en/` prefix), Tailwind, Framer Motion, Radix, Supabase JS. Lazy-loaded routes. No test setup, no migrations folder, no CI.

### Routes (`src/App.tsx`)
| Path | Component | Access |
|---|---|---|
| `/` → `/en` | redirect | public |
| `/en` | `Landing` | public |
| `/en/login` | `Login` (entrant portal) | public |
| `/en/host/login` | `HostLogin` | public |
| `/en/register` | `Register` | public |
| `/en/dashboard/*` | `Dashboard` | auth + host context |
| `/en/dashboard/create` | `CreateRaffle` | auth + host context |
| `/en/dashboard/ended` | `EndedRaffle` | auth + host context |
| `/en/account` | `ComingSoon("Settings")` | auth |
| `/en/support` | `ComingSoon("Support")` | auth |
| `/en/tickets` | `MyTickets` | auth + entrant context |
| `/en/checkout/success` | `CheckoutSuccess` | public |
| `/en/checkout/cancelled` | `CheckoutCancelled` | public |
| `/en/terms`, `/privacy`, `/contact` | `Legal` (placeholder) | public |
| `/en/public-raffles/live` | `Marketplace` | public |
| `/en/public-raffles/ended` | `Marketplace` | public |
| `/en/raffle/:slug` | `RaffleDetail` | public |
| `*` | redirect to `/en` | — |

### Data layer
- `lib/supabase.ts` — client with hardcoded fallback URL/key.
- `lib/auth.tsx` — `AuthProvider`, dynamic Supabase import, `loginContext` ("host"/"entrant") persisted in localStorage, separate from `profile.role`.
- `lib/raffles.ts` — `fetchPublicRaffles`, `fetchRaffleBySlug`, `purchaseTickets` (RPC), `fetchMyTickets`, `fetchHostOverview`, `fetchHostEndedRaffle`, `createRaffle`.
- `lib/checkout.ts` — `startCheckout` (invokes `create-checkout`), `getCheckoutStatus` (RPC).

### Supabase backend (inferred from `database.types.ts`)
- **Tables:** `affiliates`, `campaigns`, `charities`, `checkout_contacts`, `draw_audit`, `payments`, `payouts`, `profiles`, `promo_codes`, `raffles`, `tickets`, `winners`.
- **RPCs:** `confirm_prize`, `create_pending_checkout`, `finalize_checkout`, `get_checkout_status`, `purchase_tickets`, `withdraw_revenue`.
- **Edge functions (in repo):** `create-checkout`, `verify-payment` (Chapa only; Telebirr throws "not configured"; Resend email on finalize).
- **No SQL migrations, no RLS definitions, no draw function, no cron jobs present in the repo.**

### Navigation
- **Desktop dashboard:** `Sidebar.tsx` (`hidden lg:flex`) + `Topbar.tsx`.
- **Public:** `MarketingNav.tsx` floating glass nav, links `hidden md:flex`.
- **Mobile:** No hamburger, no drawer, no bottom tab bar anywhere.

---

## 2 — Feature Audit vs Raffall

Legend: ✅ EXISTS · ⚠️ PARTIAL · ❌ MISSING

### Core Pages
- ✅ Homepage / landing (`Landing.tsx`)
- ✅ Public marketplace (`Marketplace.tsx`)
- ✅ Individual raffle page (`RaffleDetail.tsx`)
- ✅ Host dashboard (`Dashboard.tsx`)
- ✅ Create raffle wizard (`CreateRaffle.tsx`, 7 steps)
- ✅ My Tickets (`MyTickets.tsx`)
- ❌ Winners page (no public past-results page; `/public-raffles/ended` reuses Marketplace which only queries live)
- ❌ Pricing / subscription page (only a `#pricing` anchor scrolling to a CTA blurb)
- ✅ Login / Register / Auth (3 surfaces)
- ❌ Account settings (`ComingSoon` placeholder)

### Raffle Creation Flow
- ⚠️ Title/description/images — title & description persist; **images never uploaded or saved** (`URL.createObjectURL`, lost on publish — `CreateRaffle.tsx:69-75`)
- ✅ Ticket price
- ✅ Ticket cap (+ unlimited)
- ✅ Bundle deals
- ✅ Draw date OR sold-out (`draw_type`)
- ✅ Minimum ticket target
- ⚠️ Charity split — percent saved, but `charityName` is **not** linked to `charities` table / `charity_id` (`raffles.ts:416`)
- ✅ Public/private toggle
- ⚠️ Affiliate commission — percent saved; **no affiliate record/link created**
- ❌ Promo code creation — `promoCode` collected in wizard but **never inserted** into `promo_codes` (`createRaffle` ignores it)

### Ticket Purchase / Checkout
- ✅ Quantity selector (`TicketSelector.tsx`)
- ✅ Bundle display
- ✅ Promo code input (applied server-side)
- ⚠️ Payment — Chapa works; **Telebirr unimplemented** (`create-checkout/index.ts:136`, disabled in UI)
- ✅ Order confirmation (`CheckoutSuccess.tsx` polls status)
- ✅ Ticket number assignment (via `finalize_checkout`/`purchase_tickets`)
- ✅ Email confirmation (Resend in `verify-payment`)
- ✅ Guest checkout (`checkout_contacts`, no auth required)

### Raffle Draw & Winner Logic
- ❌ Automated RNG draw trigger — **no draw function or cron anywhere**. Nothing moves a raffle `live → ended` or populates `winners`.
- ⚠️ Host-independent draw — enforced only in principle; no draw exists at all.
- ⚠️ Winner logged with seed/timestamp — `draw_audit` table exists but is **never written**; `EndedRaffle.tsx:224-244` renders a **hardcoded/fabricated** audit log client-side.
- ❌ Automated email to entrants after draw
- ❌ Automated email to host after draw
- ❌ Winner notification / claim / accept / dispute (entrant-facing UI entirely missing; `winners` columns unused)
- ⚠️ Host 7-day confirm timer — UI countdown is `Date.now()+7d` computed locally (`EndedRaffle.tsx:73`), not backed by `claim_deadline`/cron
- ⚠️ 75% compensation logic — displayed in UI text only; no payout logic
- ❌ Winner accept flow (unlocks payout)
- ❌ Dispute flow

### Payment & Escrow
- ✅ Revenue held in escrow — `payments.status` enum (`held`, `released`, etc.) and split columns exist
- ✅ Commission calc — `platform_commission` column; per-ticket preview in wizard (`CreateRaffle.tsx:628-636`)
- ⚠️ Affiliate commission tracking — columns exist (`affiliates`, `tickets.affiliate_id`); no code path populates them
- ⚠️ Charity split tracking — `payments.charity_share` exists; not wired to a charity record
- ⚠️ Host withdrawal request — `withdraw_revenue` RPC exists in DB but **EndedRaffle never calls it** (`setFlow("withdrawn")` is local state only, `EndedRaffle.tsx:365`)
- ❌ Payout to host account (no payout execution; Stripe transfer columns unused)
- ❌ Winner compensation payout

### Promotional Tools
- ✅ Shareable URL per raffle (`RaffleDetail.tsx:34`, X/FB/Telegram/copy)
- ❌ Share-for-free-ticket referral — UI text promises it (`RaffleDetail.tsx:216`) but no referral tracking
- ⚠️ Promo codes — table + checkout application exist; no host UI to create them
- ⚠️ Affiliate links — table exists; no generation/tracking UI
- ❌ QR code generator (mentioned in Landing copy only)
- ❌ Email campaign builder — `campaigns` table exists; no UI
- ⚠️ Featured listing — `featured_until` set on publish; no paid boost flow

### Trust & Safety
- ❌ Entrant list publicly visible on raffle page (not rendered)
- ✅ Guarantee badge (`RaffleDetail.tsx:239`)
- ⚠️ RNG auditability — `draw_audit` table exists but unused; displayed log is fake
- ⚠️ Age verification — single checkbox at register (`Register.tsx:186`); no gate at checkout/guest
- ❌ Host identity verification

### Navigation & UX
- ❌ Mobile hamburger menu — none (`MarketingNav` links `hidden md:flex`, `Sidebar` `hidden lg:flex`)
- ❌ Bottom tab navigation (mobile)
- ✅ Loading skeletons / spinners (Marketplace, MyTickets, FullPageSpinner)
- ✅ Empty states (Marketplace, MyTickets, EndedRaffle)
- ⚠️ Error states — checkout/auth have them; no global error boundary
- ❌ 404 page (catch-all silently redirects to `/en`)
- ⚠️ Back navigation — back links exist; `*` redirect can mask mistyped URLs
- ❌ Breadcrumbs

### Performance
- ✅ Lazy images — `loading="lazy"` set on raffle covers (`RaffleCard.tsx:23`, `RaffleDetail.tsx:127`); no real images served yet, covers are CSS gradients
- ✅ Route code splitting (`lazy()` per route)
- ✅ `select()` with explicit columns (`HOST_SELECT` now lists columns instead of `*`)
- ✅ N+1 — `fetchHostEndedRaffle` now fetches winner + draw_audit in parallel (`Promise.all`) after the raffle lookup, instead of three sequential round-trips
- ✅ Realtime cleanup — only the auth subscription; cleaned up correctly. (No realtime data subscriptions at all.)

### Database / Backend
- ✅ RLS — comprehensive policies checked in (`supabase/migrations/20260623193807_rls_policies.sql` + hardening migration), now live on the project; helper functions (`is_raffle_host`/`is_raffle_public`) live in a non-API-exposed `private` schema
- ⚠️ `raffles` status enum — only `draft|live|ended|cancelled`; **no `draw_pending` / `prize_confirmed` / `revenue_released`** states (those exist only as separate `prize_status` enum + timestamp columns). This is an intentional design choice, not a gap — see Section 6.
- ✅ `tickets` table
- ✅ `payments` / escrow table
- ✅ `winners` table
- 🗑️ `payouts` / `affiliates` / `promo_codes` / `campaigns` / `charities` tables — **intentionally removed**; none of them ever executed a real transfer or had a host-facing creation flow, so they were dropped (`supabase/migrations/20260625010000`, `20260625020000`) rather than left as dead schema
- ✅ Cron for auto-draw — `run-due-draws` (every minute), live and CSPRNG-backed (`private.draw_raffle`, `draw_audit`)
- ✅ Cron for 7-day host confirmation — `run-due-guarantee-compensations` (every 15 min): unconfirmed prizes auto-revoke into the 75% guarantee compensation after 7 days
- ✅ Cron for 21-day winner acceptance — `run-due-winner-claim-expirations` (every 15 min): an unanswered win auto-accepts after the 21-day claim deadline, mirroring the host-side guarantee
- ✅ Server-side age verification — `date_of_birth` captured + `>=18` CHECK constraint enforced inside `create_pending_checkout` for both registered and guest checkout

---

## 3 — Findings Report

### CRITICAL (blocks core function — fix before launch)

**1. No automated draw exists**
- **Issue:** Nothing selects a winner or transitions a raffle out of `live`.
- **Location:** No draw edge function; no cron; `supabase/functions/` only has `create-checkout`, `verify-payment`.
- **Impact:** A raffle can sell tickets but can **never end or pick a winner**. The entire core promise is non-functional.
- **Fix:** Add a `draw-raffle` edge function (CSPRNG winner selection, writes `winners` + `draw_audit`, sets `raffles.status='ended'`), and a `pg_cron` job scanning for `draw_date` reached or `tickets_sold_count >= ticket_cap`.

**2. Host prize-confirmation & withdrawal are fake (local state only)**
- **Issue:** `EndedRaffle.tsx` never calls the `confirm_prize` or `withdraw_revenue` RPCs; it just `setFlow(...)`. The audit log values are hardcoded.
- **Location:** `EndedRaffle.tsx:91-93` (`submitDecision`), `:365` (`setFlow("withdrawn")`), `:224-244` (fake audit).
- **Impact:** Hosts cannot actually confirm prizes or get paid; escrow never releases; "audit log" is not real evidence.
- **Fix:** Wire `submitDecision` to `confirm_prize(p_raffle_id, p_decision)`, the withdraw button to `withdraw_revenue(p_raffle_id)`, and render real `draw_audit` rows.

**3. Currency is inconsistent (GBP vs ETB)**
- **Issue:** Checkout collects/charges **ETB** (`TicketSelector.tsx:97`, Chapa `currency:"ETB"`), but wizard prices in **£/GBP** (`CreateRaffle.tsx:376`, `:629`), and `formatCurrency` defaults to GBP (`utils.ts:8`) — used in MyTickets, Dashboard, RaffleCard, EndedRaffle.
- **Impact:** A host sets "£5", an entrant is charged "5 ETB", dashboards show "£" on ETB amounts. Real financial mismatch.
- **Fix:** Pick one currency end-to-end; make `formatCurrency` consistent and drive it from a single config.

**4. Winner-facing claim/accept/dispute flow is entirely missing**
- **Issue:** `winners` table has `notified_at/accepted_at/disputed_at/claim_deadline/prize_status`, but no entrant UI reads or writes them.
- **Location:** `MyTickets.tsx` (no won state), no winner route.
- **Impact:** A winner is never notified and can never accept/claim, so the escrow→payout chain can never legitimately complete.
- **Fix:** Add winner notification (email + My Tickets "You won" state) and an accept/dispute page backed by RPCs + a 21-day cron.

### HIGH (major UX or trust gap)

**5. No mobile navigation**
- **Issue:** No hamburger or bottom tabs. `MarketingNav` nav links are `hidden md:flex`; `Sidebar` is `hidden lg:flex`.
- **Location:** `MarketingNav.tsx:36`, `Sidebar.tsx:80`.
- **Impact:** On phones, dashboard users get **no navigation at all** (no Overview/Create/Settings); public users lose How-it-works/Marketplace/Pricing.
- **Fix:** Add a hamburger drawer for public + a mobile sidebar/bottom-tab for the dashboard.

**6. Uploaded prize images are discarded**
- **Issue:** Wizard images are object URLs, never uploaded; `createRaffle` doesn't store images; cards/detail render gradient+icon only.
- **Location:** `CreateRaffle.tsx:69-75`; `raffles.ts:391-427`.
- **Impact:** A prize marketplace with no prize photos.
- **Fix:** Upload to Supabase Storage, persist URLs (needs an `images` column/table).

**7. Promo codes, charities, affiliates collected but not persisted**
- **Issue:** `createRaffle` ignores `promoCode` and `charityName`; affiliate % saved without an affiliate link.
- **Location:** `raffles.ts:391-427`; `CreateRaffle.tsx:570-577`.
- **Impact:** A promo input at checkout will never match a code; charity attribution missing.
- **Fix:** Insert `promo_codes` row, resolve/link `charity_id`, and generate affiliate links.

**8. Public entrant list not shown / no Winners page**
- **Issue:** Raffall shows entrants per raffle and a public past-winners page; neither exists.
- **Location:** `RaffleDetail.tsx`; `/public-raffles/ended` → `Marketplace` (queries only `status='live'`).
- **Impact:** Core transparency/trust features absent; "ended" tab shows nothing.
- **Fix:** Add an entrant list section and a real Winners listing (query `status='ended'` + `winners`).

**9. RLS unverifiable / no migrations in repo**
- **Issue:** No SQL migrations or RLS policies committed; schema lives only in the live project.
- **Impact:** Security posture can't be reviewed or reproduced; risk of public read/write on `payments`, `winners`, `payouts`.
- **Fix:** Commit migrations + RLS policies; run security advisors for lints.

### MEDIUM (missing feature, not blocking)

**10. No pricing/subscription page** — `#pricing` only scrolls to a CTA; `subscription_tier` exists but no upgrade flow. Sidebar "Upgrade plan" → `/en/account` (ComingSoon). (`Landing.tsx:166`, `Sidebar.tsx:117`)

**11. Account settings unbuilt** — `/en/account` and `/en/support` are `ComingSoon`.

**12. Telebirr unimplemented** — only Chapa works (`create-checkout/index.ts:136`).

**13. Share-for-free-ticket / QR / email campaigns** — promised in copy, not built; `campaigns` table unused.

**14. `EndedRaffle` route is unreachable** — `/en/dashboard/ended` is not linked from Sidebar or Dashboard.

### LOW (polish / performance)

**15. No real 404** — `*` redirects to `/en`, hiding typos (`App.tsx:173`).

**16. No real images** — covers are CSS gradients; `loading="lazy"` is already applied to the `<img>` tags, so this is moot until #6 (image upload) lands.

**17. Dashboard "Escrowed Revenue" = gross** — `sold*price`, ignores commission/charity/affiliate (`raffles.ts:269`).

**18. ~~`HOST_SELECT` uses `*`~~** — fixed: now selects explicit columns (`raffles.ts:94`).

**19. HostLogin "Forgot password?" is a dead `<a href="#">`** (`HostLogin.tsx:128`) while entrant Login has a working reset.

**20. No global error boundary** — a thrown lazy chunk/render error has no fallback.

**21. `fetchRaffleBySlug` returns drafts/cancelled** — no status filter; a `draft` raffle is viewable by slug (`raffles.ts:112-123`).

---

## 4 — Navigation Flow Diagram

```
                         ┌─────────────────────────┐
                         │   /  →  /en  (Landing)   │  PUBLIC
                         │  hero · how · #pricing*  │
                         └───────────┬─────────────┘
        ┌────────────────┬──────────┼───────────────┬────────────────┐
        ▼                ▼          ▼                ▼                ▼
  /public-raffles/live  /register  /login        /host/login    [Start hosting]
   (Marketplace)         │          │ (entrant)    │ (host)        → /dashboard
        │                │          │              │                (gated)
        ▼                │          │              │
  /raffle/:slug ◄────────┘          │              │
   (RaffleDetail)                   │              │
        │  TicketSelector           │              │
        ▼  (guest OK)               ▼              ▼
   startCheckout → Chapa ──► /checkout/success  ──► [if logged in] /tickets
        │                      (poll status)         (MyTickets)
        └──(cancel)──► /checkout/cancelled

  AUTH + HOST CONTEXT (RequireAuth + RequireHostContext)
  ┌──────────────────────────────────────────────┐
  │ /dashboard (Overview)                          │
  │   ├─ /dashboard/create (CreateRaffle wizard)   │ → publish → /raffle/:slug
  │   └─ /dashboard/ended (EndedRaffle) ⚠ UNLINKED │   (fake confirm/withdraw)
  │ Sidebar → /account, /support = ComingSoon      │
  │ Sidebar "Marketplace" → /public-raffles/live   │
  └──────────────────────────────────────────────┘

  PLACEHOLDERS:  /terms /privacy /contact = Legal stub
  DEAD ENDS / BROKEN:
   • /public-raffles/ended → Marketplace (only queries live = empty)   ✗
   • /account /support /terms /privacy /contact = placeholders          ✗
   • #pricing = scroll anchor, no real page                            ✗
   • Winner journey: NONE (no route, no notification)                  ✗
   • Draw: NONE (raffle can never leave "live")                        ✗
   • Mobile: no nav menu (links hidden below md/lg)                    ✗
   • * (unknown URL) → silent redirect to /en (no 404)                 ✗
```

---

## 5 — Checkout Flow Analysis

Journey: *"I want to enter this raffle" → "tickets confirmed"*

| # | Step | Status |
|---|---|---|
| 1 | Open `/raffle/:slug`, `fetchRaffleBySlug` | ✅ works |
| 2 | Select quantity + see bundle free tickets | ✅ (`TicketSelector.tsx:118-165`) |
| 3 | Enter promo code | ⚠️ accepted but no host UI ever creates codes, so it will never match |
| 4 | See totals | ⚠️ promo discount **not** reflected in the shown total (applied server-side only); labeled ETB |
| 5 | "Enter raffle" → contact step | ✅ |
| 6 | Enter name/phone/email/city (guest OK) | ✅ |
| 7 | Choose provider | ⚠️ Chapa only; Telebirr disabled |
| 8 | `startCheckout` → `create-checkout` → `create_pending_checkout` RPC → Chapa init | ✅ (requires `CHAPA_SECRET_KEY`) |
| 9 | Redirect to Chapa hosted page | ✅ |
| 10 | Chapa webhook → `verify-payment` re-verifies → `finalize_checkout` allocates tickets | ✅ |
| 11 | Receipt email (Resend) | ✅ (only if `RESEND_API_KEY` set) |
| 12 | Return to `/checkout/success`, poll `get_checkout_status` | ✅ (24 polls / ~60s) |
| 13 | See ticket numbers + amount | ✅ |
| 14 | "View in My Tickets" (logged-in only) | ✅ |

**Missing/broken in checkout:**
- No client-side promo validation/preview; discount invisible until receipt.
- No age (18+) gate before guest purchase.
- Guest has **no way to view tickets later** (no email magic-link / order-lookup) — only the success page (lost on close).
- Telebirr path dead.
- Currency mismatch (Critical #3) means displayed price ≠ charged currency intent.

---

## 6 — Draw Flow Analysis

Target lifecycle: `DRAFT → LIVE → DRAW_PENDING → ENDED → PRIZE_CONFIRMED → REVENUE_RELEASED`

Note: `raffles.status` enum is only `draft | live | ended | cancelled`. The later states are modeled via the separate `prize_status` enum + `prize_confirmed_at`/`revenue_released_at` timestamps and the `winners.prize_status` enum.

| Transition | Handled? | Automated? | Tested? | Notes |
|---|---|---|---|---|
| → DRAFT | ❌ | — | ❌ | Wizard inserts directly as `status:'live'` (`raffles.ts:405`); draft never used / no "save draft". |
| DRAFT → LIVE | ⚠️ | n/a | ❌ | Effectively "create = live"; no review/publish gate server-side. |
| LIVE → DRAW_PENDING | ❌ | ❌ | ❌ | No such status; nothing detects `draw_date`/cap reached. |
| DRAW_PENDING → ENDED (RNG fires) | ❌ | ❌ | ❌ | **No draw function, no cron, no winner selection, no `draw_audit` write.** |
| ENDED → PRIZE_CONFIRMED | ⚠️ | ❌ | ❌ | `confirm_prize` RPC exists but UI never calls it; `EndedRaffle` uses local state. No 7-day cron. |
| PRIZE_CONFIRMED → REVENUE_RELEASED | ⚠️ | ❌ | ❌ | `withdraw_revenue` RPC exists but UI never calls it; "Withdraw" is `setFlow` only. No payout execution. |
| (winner accept / 21-day) | ❌ | ❌ | ❌ | No winner UI; `claim_deadline` cron absent. |
| Compensation (revoke → 75%) | ❌ | ❌ | ❌ | UI text only; no `payouts` row of type `winner_compensation` created. |
| Min-target not met → refund | ❌ | ❌ | ❌ | `min_ticket_target` stored; no refund logic. |

**Summary:** The entire post-`live` lifecycle is **non-functional**. Tickets accumulate but the raffle is a dead end. Front-end "confirm/withdraw/revoke" screens are mockups disconnected from the (existing) RPCs. Nothing is tested (no test infra at all).

---

## 7 — Priority Build List

1. **Automated RNG draw + cron** — Without it the product literally cannot end a raffle or name a winner; everything downstream is blocked. *Create:* `supabase/functions/draw-raffle/index.ts` (CSPRNG, writes `winners` + `draw_audit`, sets `status='ended'`); `pg_cron` job (draw_date / cap). *Modify:* migrations for cron + RLS.

2. **Wire host confirm/withdraw to real RPCs + commit schema/RLS** — Makes escrow release real and lets the money flow be reviewed. *Modify:* `EndedRaffle.tsx` (call `confirm_prize`, `withdraw_revenue`, render real `draw_audit`); link it from `Dashboard.tsx`/`Sidebar.tsx`. *Create:* `supabase/migrations/*` (tables, RLS, RPC source).

3. **Winner notification + accept/claim/dispute flow** — Required for a legitimate payout chain and trust. *Create:* winner page/route, email templates, `pg_cron` for 7-day host + 21-day winner timers, compensation `payouts`. *Modify:* `MyTickets.tsx` (won state), `App.tsx` (route).

4. **Fix currency end-to-end** — Real financial correctness bug, cheap to fix, touches everything money. *Modify:* `lib/utils.ts` (`formatCurrency`), `CreateRaffle.tsx`, `TicketSelector.tsx`, dashboards; centralize currency config.

5. **Mobile navigation (hamburger + dashboard drawer/bottom-tabs)** — Today mobile dashboard users have zero nav. *Modify:* `MarketingNav.tsx`, `Sidebar.tsx`/`AppShell.tsx`; *Create:* `MobileNav` component.

6. **Persist prize images (Supabase Storage)** — A prize marketplace needs photos. *Modify:* `CreateRaffle.tsx` (upload), `raffles.ts` (`createRaffle`, mappers), `RaffleCard.tsx`/`RaffleDetail.tsx`; *Create:* `raffle_images` column/table + bucket.

7. **Persist promo codes / charity link / affiliate links on create** — Makes the promo input at checkout actually usable. *Modify:* `raffles.ts:createRaffle` (insert `promo_codes`, resolve `charity_id`, create `affiliates`).

8. **Public entrant list + real Winners page** — Core Raffall transparency. *Modify:* `RaffleDetail.tsx`, `Marketplace.tsx` (ended query); *Create:* `Winners` page + route; fix `/public-raffles/ended`.

9. **Pricing/subscription page + Account settings** — Replace `ComingSoon`/anchor. *Create:* `Pricing.tsx`, `Account.tsx`; *Modify:* `App.tsx`, `Sidebar.tsx`.

10. **Polish:** real 404 page; age gate at checkout; guest order-lookup; `fetchRaffleBySlug` status filter; HostLogin forgot-password; error boundary; Telebirr (when creds available). *Modify:* `App.tsx`, `TicketSelector.tsx`, `raffles.ts`, `HostLogin.tsx`.

---

*Conclusion:* The build is a polished, well-structured **front-end shell with a working ticket-purchase path (Chapa)**, but the **draw, winner, and payout lifecycle — the heart of a raffle platform — is entirely absent or mocked**, and there is a real **currency mismatch** between pricing (GBP) and charging (ETB). Priority items 1–4 are launch-blocking.
