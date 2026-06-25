# Host Dashboard & Create-Raffle Review

> Read-only research report. Builds on `PLATFORM_AUDIT.md` but is scoped specifically to: (1) what the host dashboard can/can't do today, (2) a critique of the create-raffle form, and (3) recommendations for what a competitive host dashboard needs. No code was changed.

---

## 1 — What the host can do today

**Dashboard Overview (`/en/dashboard`)**
- 4 stat cards: escrowed revenue, tickets sold, live raffle count, avg. sell-through
- 14-day sales line chart
- "Your raffles" list — title, status badge, sold/cap progress bar, escrowed revenue, links out to the public raffle page
- "Live activity" feed — recent ticket-purchase events across all raffles
- One CTA: "Create raffle"

**Create Raffle wizard (`/en/dashboard/create`)** — 5 steps, live preview pane, see §2.

**Ended Raffles (`/en/dashboard/ended`)**
- Shows the winner, draw audit log (method/seed/entries/drawn ticket/timestamp), revenue breakdown (gross/commission/net), and a "confirm prize delivery" action (advertised vs. modified) with a 7-day countdown.
- **Singular, not a list** — `fetchHostEndedRaffle` returns one raffle. A host with five ended raffles can only act on/see the most recent one.

**Account (`/en/account`)** — real settings page (not audited in depth here; out of scope for this report's focus).

That's the entire host surface. There is no raffle detail/management page, no entrant/order list for a host's own raffle beyond the public "recent entries" card, no edit capability, and no list of past raffles beyond the single most-recent "ended" one.

---

## 2 — Create-raffle form review

### Current structure (5 steps)
1. **Prize details** — title, description, category (chips), one cover photo
2. **Ticket settings** — price, unlimited toggle / cap, bundle deal (buy X get Y free)
3. **Draw settings** — fixed date vs. sold-out, minimum ticket target
4. **Visibility** — public marketplace vs. private link
5. **Review** — read-only summary + per-ticket commission breakdown → publish

### What's good
- Step-per-concern grouping is sound and matches how hosts think (what / how much / when / who sees it).
- Live preview pane while filling the form is a strong pattern — most competitors don't do this.
- Per-ticket commission breakdown on the review step builds trust before publish.
- `useConfirmOnLeave` guards against losing progress accidentally.
- Stepper lets you jump back to a completed step, not forward past where you are.

### Problems

**A. Single photo, no gallery (high impact)**
Only one cover image can be attached (`imageFile`/`imagePreview` are singular in `CreateRaffle.tsx:61-80`). A car, a phone, a holiday — anything with more than one angle — can't be shown properly. Raffle conversion lives and dies on prize photos; this is the single biggest visual gap.

**B. No prize value field**
There's a price-per-ticket but nowhere does the host state the prize's *retail value* ("$45,000 Tesla"). Entrants size up a raffle by comparing prize value to ticket price — Raffall and every competitor surfaces this prominently. Right now `LivePreview` and `RaffleDetail` can only show the title/description, not a value anchor.

**C. "Create == Live" — no draft state, no save-and-resume**
`createRaffle` always inserts `status: 'live'` (confirmed in `PLATFORM_AUDIT.md` §2/§6). The UI's `LiveRaffles` component even renders a `draft` status badge that can never be set. A host who starts the wizard, gets to step 3, and closes the tab loses everything — `useConfirmOnLeave` only warns, it doesn't persist. There's no "save as draft" exit point and no review/approval gate before something goes public.

**D. No post-publish editing**
Once published, nothing in the draft is editable — no route, no UI, no RPC. A typo in the title or a wrong draw date can't be fixed; the host has to live with it or contact support (which doesn't exist either — `/en/support` is a `ComingSoon` stub).

**E. Validation is shallow and only blocks step 1**
`canAdvance` only checks `title.trim().length > 2` (`CreateRaffle.tsx:82`). A host can set `ticketCap` to 0, leave `drawDate` empty while `drawType === "date"`, or set `bundleFree >= bundleQty` (giving away more free tickets than the bundle requires) and still advance and publish. There is no inline field-level error state anywhere in the wizard — only the top-level publish-time `error` banner for server failures.

**F. Description has no minimum/structure**
The textarea has no character minimum and no prompts (condition, what's included, delivery method, shipping vs. local pickup). Thin descriptions are a major reason marketplace browsers don't trust a raffle enough to buy.

**G. Minimum ticket target has no relationship to ticket cap shown to the user**
You can set a `minTicketTarget` (1000 default) larger than `ticketCap`, which would make the raffle mathematically guaranteed to cancel. Nothing warns the host.

**H. No delivery/fulfillment commitment captured**
There's no field for how/when the prize ships, or whether it's a physical item, gift card, cash-equivalent, or experience. This information currently only exists implicitly in free-text `description`, which makes the "advertised vs. modified" decision in `EndedRaffle.tsx` hard to adjudicate fairly — there's no structured baseline to compare against.

**I. Bundle deal config can produce a worse-than-base-price effective rate without warning**
E.g. price ETB 5, "buy 5 get 1 free" is fine, but a host could set buy 2 get 5 free, destroying their own revenue. A simple effective-price-per-ticket-after-bundle preview would catch this before publish (the review step shows base per-ticket breakdown but not bundle-adjusted economics).

**J. Category list is reused from marketplace filter chips, not curated for hosts**
`prizeCategories` pulls from `src/data/marketplace.ts`'s filter list. That's fine as a starting point, but worth confirming it's actually maintained as a single source of truth rather than two lists drifting apart over time.

### Recommended form restructure

Keep 5 steps but rebalance what's in each, and add the missing fields:

| Step | Add |
|---|---|
| 1. Prize details | Multi-image upload (3–6 photos, drag-reorder, first = cover); **prize retail value** field; structured "what's included" / condition / delivery method sub-fields instead of one free-text blob |
| 2. Ticket settings | Live bundle-adjusted effective-price preview; inline validation (cap > 0, bundleFree < bundleQty) |
| 3. Draw settings | Inline validation that `minTicketTarget <= ticketCap` (when capped); required `drawDate` when `drawType === "date"` enforced before advancing, not just at publish |
| 4. Visibility | unchanged |
| 5. Review | Add a **"Save as draft"** button alongside "Publish raffle" — needs `status: 'draft'` to actually be reachable in `createRaffle`, and a route/edit screen to resume drafts |

Cross-cutting: replace the single `canAdvance` boolean with per-step validation that surfaces field-level errors, and add a lightweight autosave (localStorage is enough to start) so a closed tab doesn't erase 10 minutes of work even before server-side drafts exist.

---

## 3 — What capability hosts are missing (dashboard-wide)

Ranked by how much it blocks a host from running their business day-to-day, not by build effort:

**1. A raffle management/detail page.** Today a host's only way to "manage" a specific raffle is the public `/raffle/:slug` page (read-only, entrant-facing) or, if it's ended, the single-most-recent-only `EndedRaffle` page. There's no page where a host can see *all* their raffles with status, edit a live raffle (within safe bounds — e.g. description, not price after sales started), pause sales, or extend/cancel a raffle manually.

**2. A real "ended raffles" list, not a singleton.** `fetchHostEndedRaffle` returns one raffle (`PLATFORM_AUDIT.md`, `EndedRaffle.tsx`). A host running multiple raffles per month has no way to see history, re-confirm an older prize, or review past audit logs once a newer raffle ends.

**3. Draft / save-and-resume for raffle creation.** Covered in §2 — this is both a form problem and a dashboard-capability gap (no drafts list anywhere in the nav).

**4. Entrant/order management for the host's own raffles.** The public "recent entries" card is name-only and capped at 50, designed for entrant trust, not host operations. A host needs a searchable order list (contact info, ticket numbers, payment status, refund-needed flag) for support and dispute handling — currently the host has no tool for this at all, short of a database query.

**5. Payout/withdrawal.** Already flagged in `PLATFORM_AUDIT.md` as an explicit out-of-scope gap pending real payment-provider integration. Still the single most consequential missing capability — a host can sell tickets and confirm a prize but never actually receive money in-app.

**6. Notifications/alerts surface.** No in-dashboard notification center for "raffle hit minimum target," "draw fires in 24h," "confirmation deadline in 2 days," "winner disputed your prize." Email exists server-side (Resend) but there's no in-app equivalent, and a host who doesn't check email could miss the 7-day confirmation window and forfeit 75% of revenue without warning inside the product itself.

**7. Per-raffle analytics.** The dashboard chart is aggregate-across-all-raffles only. There's no way to see a single raffle's sales curve, traffic source, or conversion rate — useful for a host running 2+ raffles to know which one to promote harder.

**8. Promotion tools beyond share/QR.** `RaffleDetail.tsx` has share links and a QR code (entrant-facing, on the public page). Nothing host-facing helps a host *drive* sales — no campaign/boost options, no referral tracking (flagged in the audit as removed scope), no "send reminder to people who haven't bought yet" tool.

**9. Host identity/trust signals.** No verification badge, no "verified host" tier, no rating/review history visible to entrants when deciding whether to trust a private host's raffle. This matters more as soon as private/lesser-known hosts list publicly.

**10. Bulk/recurring raffle tools.** No "duplicate this raffle" or template system for hosts who run a similar raffle weekly/monthly — every raffle is built from scratch.

---

## 4 — Recommendations, prioritized

**Do first (cheap, high trust/conversion impact, no new infra needed):**
1. Multi-image upload + prize value field in the wizard (§2.A, §2.B)
2. Inline step validation (cap, bundle math, draw date) before allowing "Continue"/"Publish" (§2.E, §2.G, §2.I)
3. Turn `EndedRaffle` into a list (`/dashboard/ended/:id` detail + list view) instead of singleton-only

**Do next (needs a small schema/RPC addition but no new external integration):**
4. Real draft state: `createRaffle` accepts `status: 'draft'`, add a "My drafts" section, autosave wizard progress to `localStorage` as a stopgap before that lands
5. A raffle list/management page for hosts (status, edit limited fields, manual cancel) — distinct from the entrant-facing detail page
6. In-app notification center surfacing the same events currently only emailed (target hit, draw imminent, confirmation deadline, dispute)
7. Per-raffle analytics view (reuse the existing `SalesChart`/`StatCard` components, scoped to one `raffle_id` instead of all of a host's raffles)

**Bigger bets (real infra/product decisions, sequence after the above):**
8. Host payout/withdrawal once a transfer-capable payment integration exists (already tracked in `PLATFORM_AUDIT.md` #2b)
9. Host identity verification + trust badges
10. Promotion/referral tooling, raffle templates/duplication

---

## 5 — One-line summary

The host dashboard is good at **reporting** (stats, charts, activity feed) and **draw integrity** (audit log, automated RNG, guarantee timer) but has almost no **management** surface: no drafts, no editing, no multi-raffle history, no order tools, and no in-app alerts for time-sensitive host actions. The create-raffle form is well-designed structurally but is missing the two fields (multiple photos, prize value) that most directly affect whether a stranger trusts the raffle enough to buy a ticket, and has effectively no guardrails against a host misconfiguring bundle economics or impossible minimum targets before publishing.
