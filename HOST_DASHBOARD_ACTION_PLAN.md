# Host Dashboard & Create-Raffle — Action Plan

> Turns `HOST_DASHBOARD_REVIEW.md` into sequenced, file-level engineering tasks. Each phase is independently shippable. No code has been written yet — this is the plan to execute next.

---

## Phase 0 — Quick wins (no schema changes, ~1–2 days)

Pure client-side fixes inside the existing wizard. Ship first because they're cheap and immediately reduce bad publishes.

| # | Task | Files | Notes |
|---|---|---|---|
| 0.1 | Per-step validation: block "Continue" until the active step's required fields are valid, not just step 0's title check | `CreateRaffle.tsx` (`canAdvance`, `StepBody`) | Replace the single `canAdvance` boolean with a `stepErrors(step, draft)` function; show inline error text under each invalid field instead of only a publish-time banner |
| 0.2 | Guard: `ticketCap >= 1` when not unlimited | `CreateRaffle.tsx` step 1 | |
| 0.3 | Guard: `bundleFree < bundleQty` when bundles enabled, with a visible warning if the bundle makes the effective price negative | `CreateRaffle.tsx` step 1, add a computed "effective price after bundle" line | |
| 0.4 | Guard: `drawDate` required and in the future when `drawType === "date"` | `CreateRaffle.tsx` step 2 | |
| 0.5 | Guard: `minTicketTarget <= ticketCap` when capped | `CreateRaffle.tsx` step 2 | |
| 0.6 | Bundle-adjusted effective price-per-ticket shown in the Review step, not just base price | `CreateRaffle.tsx` `ReviewStep` | |

No backend changes. No migration needed.

---

## Phase 1 — Prize presentation (multi-image + value field)

**Goal:** fix the two fields that most affect entrant trust.

### 1.1 Multi-image upload
- **Schema:** add `raffles.image_urls text[]` (keep `image_url` as `image_urls[0]` for backward compat, or migrate `RaffleDetail`/`RaffleCard`/`LivePreview` to read `image_urls[0]` and drop `image_url` in a follow-up). Migration file: `supabase/migrations/<ts>_raffle_multi_image.sql`.
- **Storage:** `uploadRaffleImage` in `raffles.ts` already uploads one file to the `raffle-images` bucket per call — generalize to `uploadRaffleImages(files: File[], hostId): Promise<string[]>`, same bucket, just multiple paths.
- **UI:** `CreateRaffle.tsx` step 1 — replace the single dropzone with a 3–6 image grid, drag-to-reorder (first = cover), per-image remove. Reuse the existing dropzone markup as the "add" tile.
- **Consumers to update:** `LivePreview.tsx` (carousel/first image), `RaffleDetail.tsx` (gallery instead of single hero image), `RaffleCard.tsx`/marketplace grid (keep using first image only — no change needed there).
- **Effort:** medium — one migration, one storage helper change, 3 component updates.

### 1.2 Prize retail value field
- **Schema:** add `raffles.prize_value numeric` (nullable, optional field — don't force hosts who don't want to disclose it).
- **UI:** new `Field` in `CreateRaffle.tsx` step 1 (`PrefixInput` like ticket price, label "Prize value (optional)").
- **Consumers:** show "Worth ETB X" badge on `LivePreview.tsx`, `RaffleDetail.tsx` hero, and optionally `RaffleCard.tsx` marketplace tiles.
- **Effort:** small — one column, one field, three display spots.

### 1.3 Structured prize info (condition / what's included / delivery method)
- **Schema:** add `raffles.condition text` (`'new' | 'used' | 'refurbished'`), `raffles.delivery_method text` (`'shipping' | 'pickup' | 'digital' | 'cash_equivalent'`). Keep `description` as free text for everything else.
- **UI:** step 1 gets a `Segmented` for condition and delivery method, placed above the description textarea.
- **Why before Phase 2:** these fields are the structured baseline the "advertised vs. modified" decision in `EndedRaffle.tsx` needs — building this first makes that confirmation flow more meaningful later, but it's not a hard dependency, can ship independently.
- **Effort:** small.

**Phase 1 total:** 1 migration covering all three, ~4–6 files touched. Good candidate for a single PR.

---

## Phase 2 — Draft state & save/resume

**Goal:** stop "create == publish" from being the only option. This is cheaper than it looks: `raffles.status` already has a `draft` enum value and defaults to it at the DB level (`supabase/migrations/20260623193705_enums_and_profiles.sql:4`, `20260623193728_core_tables.sql:20`) — only the client hardcodes `status: "live"` in `createRaffle` (`raffles.ts:660`).

| # | Task | Files |
|---|---|---|
| 2.1 | `createRaffle(draft, hostId, imageUrls, { publish: boolean })` — pass `status: publish ? "live" : "draft"` | `raffles.ts:642-678` |
| 2.2 | Add "Save as draft" button next to "Publish raffle" on the Review step | `CreateRaffle.tsx` |
| 2.3 | `fetchHostDrafts(hostId)` — list a host's `draft` raffles | `raffles.ts`, mirror `fetchHostOverview`'s query shape |
| 2.4 | "Resume draft" entry point: either (a) a "My drafts" section on `Dashboard.tsx`/`LiveRaffles.tsx` filtering by status, or (b) a dedicated `/en/dashboard/drafts` route | `Dashboard.tsx`, `App.tsx`, new `DraftsList` component or reuse `LiveRaffles` |
| 2.5 | Wizard needs to accept an existing draft id to edit instead of always starting from `initialDraft` — load draft row into `RaffleDraft` shape on mount when a `:draftId` param is present | `CreateRaffle.tsx`, `App.tsx` route `/en/dashboard/create/:draftId?` |
| 2.6 | "Publish" from an existing draft = `UPDATE` not `INSERT` — `createRaffle` needs a sibling `publishDraft(draftId, draft, imageUrls)` or a single upsert-style function | `raffles.ts` |
| 2.7 | Lightweight autosave fallback (covers the case before 2.1–2.6 ship, or as a belt-and-suspenders layer): persist `draft` state to `localStorage` keyed by host id on every change, restore on mount if no `:draftId` | `CreateRaffle.tsx` |

**Sequencing note:** 2.7 can ship alone in Phase 0/1 timeframe as a stopgap (cheap, no schema). 2.1–2.6 are the real fix and should ship together since they're interdependent (insert-vs-update path, the list, and the resume route all need each other to be useful).

---

## Phase 3 — Raffle management page + ended-raffles list

**Goal:** replace "the only host-facing raffle page is public `/raffle/:slug` or the singleton `EndedRaffle`" with real management.

### 3.1 Ended raffles → list + detail
- `fetchHostEndedRaffle(hostId)` currently returns one raffle (`raffles.ts`). Change to `fetchHostEndedRaffles(hostId): EndedRaffleSummary[]` (drop the singleton assumption, same query shape, remove the implicit `limit(1)`/`single()`).
- Route change: `/en/dashboard/ended` becomes a list (reuse `LiveRaffles`-style rows: title, draw date, prize status badge), `/en/dashboard/ended/:id` becomes today's `EndedRaffle.tsx` detail content, parameterized by raffle id instead of "the host's only ended raffle."
- Files: `raffles.ts`, `EndedRaffle.tsx` (split into `EndedRafflesList.tsx` + `EndedRaffleDetail.tsx`), `App.tsx`, `Sidebar.tsx`/`DashboardDrawer.tsx` link unchanged (still points at `/dashboard/ended`, now the list).

### 3.2 Raffle management/detail page for live raffles
- New route `/en/dashboard/raffles/:id`, reachable by clicking a row in `LiveRaffles.tsx` on the Overview dashboard (currently those rows link out to the *public* `/en/raffle/:slug` page — change that link, or add a second "Manage" affordance).
- Scope for v1: read-only detail (full stats for that one raffle, entrant list with contact info + payment status — see 3.3) plus two safe mutations:
  - Edit `description`/images/`prize_value` (never `ticket_price`/`ticket_cap` once any ticket has sold — guard server-side via RLS/RPC check, not just client-side)
  - Manual cancel (only while `status = 'live'` and `tickets_sold_count = 0`, to avoid touching the refund logic that `private.draw_raffle()` already owns for the under-target case)
- New RPC likely needed: `update_raffle_details(raffle_id, patch)` enforcing the "no price/cap edits after first sale" rule server-side, since client-side checks alone aren't trustworthy.
- Files: new `RaffleManage.tsx` page, `App.tsx` route, `raffles.ts` (`fetchRaffleForManage`, `updateRaffleDetails`), one migration for the RPC.

### 3.3 Host-facing entrant/order list
- Separate from the public "recent entries" card (`fetchRaffleEntrants`, name-only, capped 50, public RLS). Hosts need: full contact info, ticket numbers, payment status, refund flag — gated to the raffle's own host via RLS (`is_raffle_host` helper already exists in the `private` schema per `PLATFORM_AUDIT.md` §1).
- New query `fetchRaffleOrdersForHost(raffleId, hostId)` joining `tickets` + `payments` + `checkout_contacts`, filtered by an RLS policy scoped to `host_id = auth.uid()`.
- Surfaced inside `RaffleManage.tsx` (3.2) as a tab/section, not a separate page.
- **Security note:** this is new PII exposure (contact info) — needs its own RLS policy, not a relaxation of the existing public one. Get this reviewed before shipping.

**Phase 3 effort:** largest phase — one new RPC + RLS policy, 2-3 new pages, query changes. Worth splitting into two PRs: (3.1, cheap) then (3.2+3.3, the real management page).

---

## Phase 4 — Notifications & per-raffle analytics

### 4.1 In-app notification center
- Backend already computes/emails the relevant events (draw imminent, target hit, 7-day confirm deadline, dispute) per `PLATFORM_AUDIT.md`'s cron jobs. Cheapest path: add a `notifications` table written by the same cron functions/RPCs that already trigger emails (`draw_raffle()`, `run-due-guarantee-compensations`, `respond_to_win`), then a bell icon + dropdown in `Topbar.tsx` reading unread rows for `auth.uid()`.
- This is the one item in this plan that touches the existing cron/RPC SQL rather than just adding new tables — coordinate carefully, append `INSERT INTO notifications` calls rather than restructuring the existing functions.

### 4.2 Per-raffle analytics
- Reuse `SalesChart`/`StatCard` from `components/dashboard/`, scope the existing `fetchHostOverview` query pattern to a single `raffle_id` instead of all of a host's raffles.
- Surfaced inside `RaffleManage.tsx` (3.2) as the default tab.

---

## Phase 5 — Larger bets (sequence after the above, no firm plan yet)

- Host payout/withdrawal — blocked on a real Stripe Connect/Chapa transfer integration (tracked as out-of-scope in `PLATFORM_AUDIT.md` #2b); revisit once that integration exists.
- Host identity verification + trust badges — needs a product decision on what "verified" means (ID upload? business registration?) before any schema work.
- Promotion/referral tooling, raffle templates/duplication — lower urgency, no dependencies on anything above; can be picked up opportunistically.

---

## Suggested execution order

1. **Phase 0** (quick wins) — ship immediately, lowest risk
2. **Phase 1** (images + prize value) — highest conversion impact per unit effort
3. **Phase 2** (drafts) — unblocks safer raffle creation habits
4. **Phase 3.1** (ended list) — cheap, unblocks hosts running >1 raffle
5. **Phase 3.2/3.3** (management page + orders) — the biggest single capability gap, do once 1–3 are stable
6. **Phase 4** (notifications + per-raffle analytics)
7. **Phase 5** — opportunistic / dependent on external integrations

---

## What I need from you to start

- Confirm whether Phase 1's `image_url` → `image_urls[]` change should keep the old column for backward compat or do a clean migration (no raffles exist yet that would need migrating, if this is pre-launch — worth confirming).
- Confirm scope for 3.2's "edit after publish" — which fields should be lockable after first sale vs. always editable.
- Pick a starting phase, or say "start at Phase 0" and I'll begin there.
