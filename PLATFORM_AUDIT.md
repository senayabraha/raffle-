# Raffle Platform — Full Technical Audit

> Read-only audit of the current codebase (branch `claude/audit-covid-base-review-nt85p6`, re-verified 2026-06-25).
> No application code was written or modified to produce this report.

> **2026-06-25 re-verification note:** Since the original audit (PR #12, commit `024f1a9`), 9 follow-up PRs (#14–#21) closed most CRITICAL/HIGH findings: automated draw + cron, host prize-confirmation, winner accept/dispute flow, mobile nav, image upload, Winners/Pricing/Account pages, 404 page, error boundary, RLS migrations, and age verification are all now real and shipped. The `payouts`/`affiliates`/`promo_codes`/`campaigns`/`charities` tables and their half-built UI hooks were removed entirely rather than finished (see §2/§3 below) — this was a deliberate scope cut, not a regression. Sections 3–7 below have been rewritten to match the current code; superseded findings are marked **RESOLVED** rather than deleted, so the history stays visible. Still-open items: **currency inconsistency (GBP/ETB)**, Telebirr, `EndedRaffle` dashboard link, draft/cancelled raffles being viewable by slug, host login "forgot password", and refunds for under-target raffles.

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

> Updated 2026-06-25 to match the current branch. Original (now-stale) state is preserved in §3's "Resolved" section for history.

**Stack:** React 18 + TS + Vite, React Router v6 (`/en/` prefix), Tailwind, Framer Motion, Radix, Supabase JS. Lazy-loaded routes. **Still no test setup, no CI.** Migrations folder now exists (`supabase/migrations/`, 23 files).

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
| `/en/dashboard/ended` | `EndedRaffle` | auth + host context (works, but unlinked — see #14) |
| `/en/account` | `Account` (real settings page) | auth |
| `/en/support` | `ComingSoon("Support")` | auth |
| `/en/pricing` | `Pricing` (real page) | public |
| `/en/winnings` | `MyWinnings` (winner accept/dispute) | auth + entrant context |
| `/en/tickets` | `MyTickets` | auth + entrant context |
| `/en/checkout/success` | `CheckoutSuccess` | public |
| `/en/checkout/cancelled` | `CheckoutCancelled` | public |
| `/en/terms`, `/privacy`, `/contact` | `Legal` (placeholder) | public |
| `/en/public-raffles/live` | `Marketplace` | public |
| `/en/public-raffles/ended` | `Winners` (real ended/winners query) | public |
| `/en/raffle/:slug` | `RaffleDetail` | public (no status filter — see #21) |
| `*` | `NotFound` (real 404) | — |

### Data layer
- `lib/supabase.ts` — client with hardcoded fallback URL/key.
- `lib/auth.tsx` — `AuthProvider`, dynamic Supabase import, `loginContext` ("host"/"entrant") persisted in localStorage, separate from `profile.role`.
- `lib/raffles.ts` — `fetchPublicRaffles`, `fetchRaffleBySlug`, `purchaseTickets` (RPC), `fetchMyTickets`, `fetchHostOverview`, `fetchHostEndedRaffle`, `createRaffle`, `uploadRaffleImage`, `fetchPublicWinners`.
- `lib/checkout.ts` — `startCheckout` (invokes `create-checkout`), `getCheckoutStatus` (RPC).
- `lib/drawer.ts` — shared drawer-open state used by `NavDrawer`/`DashboardDrawer`.

### Supabase backend (now backed by committed migrations, not just inferred)
- **Tables:** `checkout_contacts`, `draw_audit`, `payments`, `profiles`, `raffles`, `tickets`, `winners`. (`affiliates`, `campaigns`, `charities`, `payouts`, `promo_codes` were dropped — `20260625010000`, `20260625020000`.)
- **RPCs:** `confirm_prize`, `create_pending_checkout`, `finalize_checkout`, `get_checkout_status`, `purchase_tickets`, `respond_to_win`. (`withdraw_revenue` was dropped — `20260625010000`.)
- **Edge functions (in repo):** `create-checkout`, `verify-payment` (Chapa only; Telebirr throws "not configured"; Resend email on finalize and on draw notification).
- **Migrations:** 23 files committed under `supabase/migrations/`, including RLS policies, the automated draw function + cron, draw notifications/claim flow, age verification, and the table-removal migrations above.
- **Cron jobs (pg_cron, defined in migrations):** `run-due-draws` (1 min), `run-due-guarantee-compensations` (15 min), `run-due-winner-claim-expirations` (15 min).

### Navigation
- **Desktop dashboard:** `Sidebar.tsx` (`hidden lg:flex`) + `Topbar.tsx`, with a hamburger trigger that opens `DashboardDrawer`.
- **Public:** `MarketingNav.tsx` floating glass nav + hamburger trigger that opens `NavDrawer`.
- **Mobile:** `NavDrawer` (public) and `DashboardDrawer` (host) are real slide-out drawers; scroll-locked while open. No separate bottom tab bar, but no longer "zero nav."

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
- 🗑️ Promo code input — `promo_codes` table dropped; intentionally removed, no longer part of the flow
- ⚠️ Payment — Chapa works; **Telebirr still unimplemented** (`create-checkout/index.ts:136`, disabled in UI)
- ✅ Order confirmation (`CheckoutSuccess.tsx` polls status)
- ✅ Ticket number assignment (via `finalize_checkout`/`purchase_tickets`)
- ✅ Email confirmation (Resend in `verify-payment`)
- ✅ Guest checkout (`checkout_contacts`, no auth required)

### Raffle Draw & Winner Logic
- ✅ Automated RNG draw trigger — `private.draw_raffle()` CSPRNG + `run-due-draws` cron (every minute); moves `live → ended`, populates `winners`
- ✅ Host-independent draw — fully automated via cron, no host action involved
- ✅ Winner logged with seed/timestamp — `draw_audit` is written by `draw_raffle()`; `EndedRaffle.tsx` now renders the real rows (no longer fabricated)
- ✅ Automated email to entrants after draw (draw notification flow, `20260625000000_draw_notifications_and_claim_flow.sql`)
- ✅ Automated email to host after draw (same migration)
- ✅ Winner notification / claim / accept / dispute — `MyWinnings.tsx` (`/en/winnings`) reads/writes `winners` columns via `respond_to_win` RPC
- ✅ Host 7-day confirm timer — backed by `run-due-guarantee-compensations` cron (15 min), not just a client-side countdown
- ✅ 75% compensation logic — `run-due-guarantee-compensations` cron computes and applies it automatically (though it has nowhere to be paid out to — see #2b)
- ✅ Winner accept flow — `respond_to_win` RPC + 21-day auto-accept cron
- ✅ Dispute flow — `respond_to_win` RPC supports a dispute decision

### Payment & Escrow
- ✅ Revenue held in escrow — `payments.status` enum (`held`, `released`, etc.) and split columns exist
- ✅ Commission calc — `platform_commission` column; per-ticket preview in wizard (`CreateRaffle.tsx:628-636`)
- 🗑️ Affiliate commission tracking — `affiliates` table dropped; intentionally removed
- 🗑️ Charity split tracking — `charities` table dropped; intentionally removed
- ❌ Host withdrawal request — **regressed**: `withdraw_revenue` RPC was deleted outright (`20260625010000:294`), not just left unwired. No withdrawal mechanism exists at all (#2b).
- ❌ Payout to host account (no payout execution; Stripe transfer columns unused)
- ❌ Winner compensation payout (compensation is calculated by cron but never paid out — same root cause as #2b)

### Promotional Tools
- ✅ Shareable URL per raffle (`RaffleDetail.tsx:34`, X/FB/Telegram/copy)
- ✅ QR code generator — real, generates + downloads a PNG (`RaffleDetail.tsx:4,57-61`, `qrcode.react`)
- ❌ Share-for-free-ticket referral — still no referral tracking anywhere
- 🗑️ Promo codes — `promo_codes` table **dropped** (`20260625020000`); wizard input removed; no longer a gap to close, it's out of scope
- 🗑️ Affiliate links — `affiliates` table **dropped** (`20260625010000`); wizard input removed
- 🗑️ Email campaign builder — `campaigns` table **dropped** (`20260625020000`)
- 🗑️ Featured listing — `featured_until` column **dropped** (`20260625020000`); no paid boost flow exists or is planned

### Trust & Safety
- ❌ Entrant list publicly visible on raffle page — still not rendered (#8b)
- ✅ Guarantee badge (`RaffleDetail.tsx:239`)
- ✅ RNG auditability — `draw_audit` is written by the real draw function and rendered as-is in `EndedRaffle.tsx`; no longer fake
- ✅ Age verification — `date_of_birth` + `>=18` CHECK constraint enforced server-side in `create_pending_checkout`, not just a UI checkbox
- ❌ Host identity verification

### Navigation & UX
- ✅ Mobile hamburger menu — `NavDrawer.tsx` (public) + `DashboardDrawer.tsx` (host), hamburger triggers in `MarketingNav`/`Sidebar.tsx:88-93`
- ✅ Bottom-tab-equivalent — drawer covers this need on mobile (no separate bottom tab bar, but no longer "zero nav")
- ✅ Loading skeletons / spinners (Marketplace, MyTickets, FullPageSpinner)
- ✅ Empty states (Marketplace, MyTickets, EndedRaffle)
- ✅ Error states — checkout/auth have them; `ErrorBoundary.tsx` now also catches global render errors
- ✅ 404 page — real `NotFound.tsx`, wired as catch-all
- ⚠️ Back navigation — back links exist; wizard/checkout progress is now guarded against back-navigation, but mistyped URLs still 404 correctly rather than confusingly redirecting
- ❌ Breadcrumbs

### Performance
- ✅ Lazy images — `loading="lazy"` set on raffle covers (`RaffleCard.tsx:23`, `RaffleDetail.tsx:127`); image upload (#6) is fixed, so covers are now real photos where a host has uploaded one
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

### RESOLVED since the original audit

**1. ~~No automated draw exists~~ — FIXED**
- `private.draw_raffle()` (CSPRNG, picks a winning ticket, writes `winners` + `draw_audit`, sets `raffles.status='ended'`) plus the `run-due-draws` cron (every minute) are live. `supabase/migrations/20260623200135_automated_rng_draw.sql:25-113`.

**2. ~~Host prize-confirmation & withdrawal are fake~~ — FIXED (confirmation), REMOVED (withdrawal)**
- `EndedRaffle.tsx:94` now calls the real `confirmPrize()` → `confirm_prize` RPC, and the audit panel renders real `draw_audit` rows fetched via `fetchHostEndedRaffle` (`EndedRaffle.tsx:221-256`).
- The withdraw button is gone entirely, not wired-but-fake: `withdraw_revenue` and `raffles.revenue_released_at` were both dropped in `20260625010000_remove_payout_affiliate_charity.sql:294,304`, because there was never a real payout execution path behind it. Confirming the prize is now the final host-facing step; there is no in-app withdrawal flow at all (see new finding **#2b** below).

**4. ~~Winner-facing claim/accept/dispute flow is entirely missing~~ — FIXED**
- `MyWinnings.tsx` (routed at `/en/winnings`, `App.tsx:174-182`) shows won raffles with accept/dispute buttons calling `respond_to_win` (`MyWinnings.tsx:39-56`). Backed by `20260625000000_draw_notifications_and_claim_flow.sql` and a 21-day `run-due-winner-claim-expirations` cron that auto-accepts unanswered wins.

**5. ~~No mobile navigation~~ — FIXED**
- `NavDrawer.tsx` (public) and `DashboardDrawer.tsx` (host) are real slide-out drawers, opened via hamburger triggers in `MarketingNav`/`Sidebar.tsx:88-93` and rendered from `App.tsx:105`.

**6. ~~Uploaded prize images are discarded~~ — FIXED**
- `uploadRaffleImage()` (`raffles.ts:580-591`) uploads to the `raffle-images` Storage bucket; `CreateRaffle.tsx:110-111` calls it before publish and `image_url` is persisted (`20260624075444_add_raffle_image_url_and_storage_bucket.sql`).

**7. ~~Promo codes, charities, affiliates collected but not persisted~~ — RESOLVED BY REMOVAL**
- Rather than wiring these up, the `payouts`/`affiliates`/`promo_codes`/`campaigns`/`charities` tables and every related wizard input were deleted (`20260625010000`, `20260625020000`). None of them ever executed a real transfer or had a host-facing creation flow, so this was a deliberate scope cut. Not a gap to track anymore.

**8. ~~Public entrant list not shown / no Winners page~~ — PARTIALLY FIXED**
- A real public `Winners.tsx` page now exists, querying ended raffles + their `winners` row (`raffles.ts:520-576`), routed at `/en/public-raffles/ended` (`App.tsx:192`). The **per-raffle entrant list** on `RaffleDetail.tsx` is still not rendered — carried forward as open finding **#8b**.

**9. ~~RLS unverifiable / no migrations in repo~~ — FIXED**
- 23 migration files are committed, including `20260623193807_rls_policies.sql` and a hardening pass (`20260623194008_harden_security_definer_helpers.sql`) moving `is_raffle_host`/`is_raffle_public` into a non-API-exposed `private` schema.

**13 (old). ~~QR code generator missing~~ — FIXED**
- `RaffleDetail.tsx` generates and downloads a real QR PNG via `qrcode.react` (`RaffleDetail.tsx:4,57-61`).

**15 (old). ~~No real 404~~ — FIXED**
- `NotFound.tsx` is a real page, wired as the catch-all route (`App.tsx:195`).

**20 (old). ~~No global error boundary~~ — FIXED**
- `ErrorBoundary.tsx` wraps the app root (`App.tsx:101`).

**Age verification — FIXED (was ⚠️ partial)**
- `date_of_birth` + an `age >= 18` CHECK constraint now exist on `profiles` and `checkout_contacts` (`20260625050000_age_verification.sql:8-43`), enforced server-side inside `create_pending_checkout` for both registered and guest checkout — not just a UI checkbox.

**Pricing/Account settings — FIXED (was MEDIUM #10/#11)**
- `Pricing.tsx` and `Account.tsx` are real pages (not `ComingSoon`), routed at `/en/pricing` and `/en/account` (`App.tsx:147-161,193`).

---

### CRITICAL (still open — blocks correctness)

**3. Currency is inconsistent (GBP vs ETB)** — *unchanged, still real*
- **Issue:** Checkout charges **ETB** end-to-end (`TicketSelector.tsx:116,192,196,208,235` all pass `"ETB"`; Chapa `create-checkout/index.ts:119` hardcodes `currency: "ETB"`), but the wizard's price field is still labeled GBP (`CreateRaffle.tsx:386`, `hint="GBP"`), `formatCurrency` defaults to `"GBP"` (`utils.ts:8`), and `Dashboard.tsx:70` hardcodes a `£` prefix on the (ETB-denominated) escrowed-revenue stat.
- **Impact:** A host sets a price thinking in £, the entrant is charged in ETB, and the host's own dashboard then shows that ETB figure with a £ sign. Real financial/display mismatch, unchanged since the original audit.
- **Fix:** Pick one currency end-to-end; remove the `"GBP"` default and the `hint="GBP"`/`£` literals, drive everything from a single currency config.

### HIGH (open)

**2b. No host withdrawal / payout execution path exists**
- **Issue:** Following the removal of `payouts`/`withdraw_revenue` (see resolved #2 above), there is now no mechanism — UI or RPC — for a host to ever receive escrowed funds. Prize confirmation is the last step the product performs.
- **Impact:** Revenue can be collected and escrowed but never legitimately released to a host. This is a bigger gap than the original "fake withdraw button" — there's now no withdrawal concept in the schema at all.
- **Fix:** Either reintroduce a real payout RPC + host bank/payout-method capture, or explicitly scope withdrawal as a manual/off-platform process and document that in product copy so hosts aren't misled.

**8b. Public entrant list not shown on raffle page**
- **Issue:** `RaffleDetail.tsx` has no section listing entrants, unlike the now-built Winners page for past results.
- **Impact:** Trust/transparency feature still missing for live raffles.
- **Fix:** Add an entrant list section reading from `tickets`/`profiles` with appropriate RLS-safe columns only.

### MEDIUM (missing feature, not blocking)

**12. Telebirr unimplemented** — `create-checkout/index.ts:136-146` (`initTelebirr`) still throws `"Telebirr checkout is not configured yet. Please choose Chapa for now."`; provider toggle is disabled in UI. Unchanged.

**13. Share-for-free-ticket referral** — still promised nowhere in copy now (the old Landing-copy promise was removed along with the demo content cleanup), and there is still no referral tracking. Lower priority than originally since the dangling UI promise is gone too.

**14. `EndedRaffle` route is still unreachable** — confirmed unchanged: `Sidebar.tsx:14-23` (`primaryNav`/`secondaryNav`) has no entry for `/en/dashboard/ended`, and `Dashboard.tsx` doesn't link to it either, even though the route works and is now fully wired to real RPCs (see resolved #2). Hosts have no way to discover it.

### LOW (polish / performance)

**16. No real images** — moot until host onboarding actually populates `image_url` for existing raffles; upload path itself (#6) is fixed.

**17. Dashboard "Escrowed Revenue" = gross, and hardcodes `£`** — still `sold*price` with no commission deduction (`Dashboard.tsx:70`), now also a second instance of the currency-label bug (#3).

**18. ~~`HOST_SELECT` uses `*`~~** — fixed, unchanged from original audit: explicit columns (`raffles.ts:94`).

**19. HostLogin "Forgot password?" is still a dead `<a href="#">`** (`HostLogin.tsx:128`) — unchanged, entrant Login still has a working reset that host login lacks.

**21. `fetchRaffleBySlug` still returns drafts/cancelled** — unchanged: `raffles.ts:111-122` has no `.eq("status", ...)` filter; a `draft` raffle remains viewable by guessing/sharing its slug.

**22 (new). Min-ticket-target-not-met has no refund path** — `min_ticket_target` is stored and shown (`raffles.ts:622`), but nothing checks it against `tickets_sold_count` or issues refunds when a raffle ends under-target. Carried up from the Draw Flow table (§6) since it was never given a numbered finding before.

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
  ┌──────────────────────────────────────────────────┐
  │ /dashboard (Overview)                              │
  │   ├─ /dashboard/create (CreateRaffle wizard)       │ → publish → /raffle/:slug
  │   └─ /dashboard/ended (EndedRaffle) ⚠ STILL UNLINKED│   (real confirm_prize RPC;
  │       (works fine if you type the URL)             │    no withdraw step exists at all)
  │ Sidebar → /account (real), /support (ComingSoon)   │
  │ Sidebar "Marketplace" → /public-raffles/live       │
  │ Sidebar → /pricing (real Pricing page)             │
  └──────────────────────────────────────────────────┘

  Entrant winner journey: /en/winnings (MyWinnings) — accept/dispute, real RPCs

  PLACEHOLDERS:  /terms /privacy /contact = Legal stub
  STILL DEAD ENDS / BROKEN:
   • /dashboard/ended reachable only by typed URL, no Sidebar/Dashboard link  ✗
   • /support = ComingSoon                                                   ✗
   • /terms /privacy /contact = placeholders                                 ✗
   • No host withdrawal step anywhere post-confirmation (#2b)                ✗
   • fetchRaffleBySlug exposes draft/cancelled raffles by slug (#21)         ✗
   • Currency: GBP-labeled price input, ETB-charged checkout (#3)            ✗

  RESOLVED SINCE ORIGINAL AUDIT:
   • /public-raffles/ended now a real Winners page (queries ended + winners) ✓
   • #pricing replaced by a real /en/pricing page                            ✓
   • Winner journey: /en/winnings, real accept/dispute RPCs + 21-day cron    ✓
   • Draw: private.draw_raffle() + run-due-draws cron, every minute          ✓
   • Mobile: NavDrawer (public) + DashboardDrawer (host), hamburger-driven   ✓
   • * (unknown URL) → real NotFound page                                   ✓
```

---

## 5 — Checkout Flow Analysis

Journey: *"I want to enter this raffle" → "tickets confirmed"*

| # | Step | Status |
|---|---|---|
| 1 | Open `/raffle/:slug`, `fetchRaffleBySlug` | ⚠️ works, but no status filter — draft/cancelled raffles are also viewable (#21) |
| 2 | Select quantity + see bundle free tickets | ✅ (`TicketSelector.tsx:118-165`) |
| 3 | Promo code | 🗑️ removed — `promo_codes` table dropped, no longer part of the flow |
| 4 | See totals | ✅ shown and charged consistently in ETB (`TicketSelector.tsx:116-235`) |
| 5 | "Enter raffle" → contact step | ✅ |
| 6 | Enter name/phone/email/city (guest OK) | ✅ |
| 6b | Age (18+) check | ✅ enforced server-side in `create_pending_checkout` via DOB CHECK constraint, for both guest and registered checkout |
| 7 | Choose provider | ⚠️ Chapa only; Telebirr still throws `"not configured yet"` |
| 8 | `startCheckout` → `create-checkout` → `create_pending_checkout` RPC → Chapa init | ✅ (requires `CHAPA_SECRET_KEY`) |
| 9 | Redirect to Chapa hosted page | ✅ |
| 10 | Chapa webhook → `verify-payment` re-verifies → `finalize_checkout` allocates tickets | ✅ |
| 11 | Receipt email (Resend) | ✅ (only if `RESEND_API_KEY` set) |
| 12 | Return to `/checkout/success`, poll `get_checkout_status` | ✅ (24 polls / ~60s) |
| 13 | See ticket numbers + amount | ✅ |
| 14 | "View in My Tickets" (logged-in only) | ✅ |
| 15 | If a winner is later drawn, see "you won" + accept/dispute | ✅ `MyWinnings.tsx`, `/en/winnings` |

**Still missing/broken in checkout:**
- Guest has **no way to view tickets later** (no email magic-link / order-lookup) — only the success page (lost on close).
- Telebirr path dead.
- The wizard's price input is still labeled GBP while checkout charges ETB (Critical #3) — displayed creation-time price ≠ charged currency intent, even though the checkout amount itself is internally consistent.

---

## 6 — Draw Flow Analysis

Target lifecycle: `DRAFT → LIVE → DRAW_PENDING → ENDED → PRIZE_CONFIRMED → REVENUE_RELEASED`

Note: `raffles.status` enum is only `draft | live | ended | cancelled`. The later states are modeled via the separate `prize_status` enum + `prize_confirmed_at`/`revenue_released_at` timestamps and the `winners.prize_status` enum.

| Transition | Handled? | Automated? | Tested? | Notes |
|---|---|---|---|---|
| → DRAFT | ❌ | — | ❌ | Unchanged: wizard still inserts directly as `status:'live'`; draft never used / no "save draft". |
| DRAFT → LIVE | ⚠️ | n/a | ❌ | Unchanged: effectively "create = live"; no review/publish gate server-side. |
| LIVE → DRAW_PENDING | ❌ | ❌ | ❌ | Unchanged: no such intermediate status; the cron instead directly fires the draw when due (see next row), skipping a pending state — by design, not a gap. |
| DRAW_PENDING → ENDED (RNG fires) | ✅ | ✅ | ❌ | **FIXED.** `private.draw_raffle()` CSPRNG selection + `run-due-draws` cron (every minute) writes `winners` + `draw_audit`, sets `status='ended'`. Still untested (no test infra in repo). |
| ENDED → PRIZE_CONFIRMED | ✅ | ⚠️ | ❌ | **FIXED.** `EndedRaffle.tsx` calls real `confirm_prize` RPC. `run-due-guarantee-compensations` cron (15 min) auto-revokes unconfirmed prizes into the 75% guarantee after 7 days if the host doesn't act. |
| PRIZE_CONFIRMED → REVENUE_RELEASED | ❌ | ❌ | ❌ | **WORSE THAN BEFORE.** `withdraw_revenue` RPC and `revenue_released_at` column were deleted outright (not just left unwired). There is now no payout-execution concept anywhere in the schema (new finding #2b). |
| Winner accept / 21-day claim | ✅ | ✅ | ❌ | **FIXED.** `MyWinnings.tsx` + `respond_to_win` RPC; `run-due-winner-claim-expirations` cron (15 min) auto-accepts unanswered wins after 21 days. |
| Compensation (revoke → 75%) | ✅ | ✅ | ❌ | **FIXED.** `run-due-guarantee-compensations` cron computes and applies the 75% guarantee compensation automatically; no longer UI-text-only. (Compensation amount is calculated, but still has nowhere to be paid out to — see #2b.) |
| Min-target not met → refund | ❌ | ❌ | ❌ | Unchanged: `min_ticket_target` stored; nothing checks it against `tickets_sold_count` or issues refunds (finding #22). |

**Summary:** The draw → winner-notification → accept/dispute → compensation chain that was the original audit's headline gap is now **fully automated end-to-end via cron + CSPRNG + RPCs**. The one piece that regressed rather than improved is the very last step: actually getting escrowed money (or guarantee compensation) out to a host or winner — that mechanism was removed, not built. Nothing in this lifecycle has automated test coverage (still no test infra in repo).

---

## 7 — Priority Build List (re-prioritized 2026-06-25)

Items 1, 2 (partially), 3, 5, 6, 8 (partially), 9 from the original list are **done** — see §3 "Resolved" and §6. What's left, in priority order:

1. **Build a real host payout/withdrawal path** — The single biggest open gap. `withdraw_revenue` and `revenue_released_at` were deleted along with the dead `payouts` table, so there is currently *no* mechanism, fake or real, for a host to get paid after confirming a prize, and no mechanism to pay out the 75% guarantee compensation the cron now calculates. *Decide first:* manual/off-platform payout (document it) vs. a real payout RPC + bank-detail capture + execution. *Create/modify:* new `payouts`-equivalent table + RPC, `EndedRaffle.tsx` action, payout execution (Stripe Connect/bank transfer/manual ops queue).

2. **Fix currency end-to-end** — Still a real financial-correctness bug, still cheap relative to its risk. *Modify:* `lib/utils.ts` (`formatCurrency` default), `CreateRaffle.tsx:386` (`hint="GBP"`), `Dashboard.tsx:70` (hardcoded `£`); centralize on ETB (the currency that's actually charged) or introduce a host-selectable currency end-to-end.

3. **Link `EndedRaffle` from the dashboard** — Trivial fix, currently the only thing stopping hosts from finding a fully-working confirm-prize flow. *Modify:* `Sidebar.tsx` (`primaryNav`/`secondaryNav`), `Dashboard.tsx` (link from the relevant raffle card once it's ended).

4. **Public entrant list on `RaffleDetail.tsx`** — Last piece of the original transparency gap; the Winners page (past results) is done, live-raffle entrant visibility isn't. *Modify:* `RaffleDetail.tsx`; *Create:* RLS-safe entrant query (name/initials + ticket count only).

5. **`fetchRaffleBySlug` status filter** — Quick, real bug: draft/cancelled raffles are publicly viewable by slug. *Modify:* `raffles.ts:111-122`, add `.eq("status", ...)` or an explicit allow-list.

6. **Min-target-not-met refunds** — `min_ticket_target` is collected and displayed but never enforced; no refund path exists if a raffle ends under-target. *Create:* refund RPC + cron check alongside the existing draw cron.

7. **Polish:** Telebirr (when merchant credentials are available — `create-checkout/index.ts:136-146`); HostLogin forgot-password (`HostLogin.tsx:128`, dead `<a href="#">`); guest order-lookup (no way to revisit a guest checkout after closing the success page).

---

*Conclusion (updated):* The original audit's headline gap — **draw, winner-notification, accept/dispute, and compensation are entirely automated now** via CSPRNG + cron + RPCs, and trust/UX gaps (mobile nav, images, 404, error boundary, RLS, age verification, Winners/Pricing/Account pages) have been closed. The platform traded one kind of incompleteness for a narrower one: the **end of the money trail — actually paying a host or a compensated winner — was removed rather than finished**, and the **GBP/ETB currency mismatch** from the original audit is still unresolved. Priority items 1–2 above are now the launch-blockers; the rest is real but lower-stakes polish.
