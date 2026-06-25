# Admin Panel — Capability Research

> Research only. No application code, routes, or migrations were added to produce
> this report. Written against `claude/admin-page-research-5qvj2s`, current as of
> 2026-06-25 (after the age-verification and auto-expire-unclaimed-wins migrations).

## Contents
1. [Starting point: what exists today](#1--starting-point-what-exists-today)
2. [What must stay fully automated (hands off)](#2--what-must-stay-fully-automated-hands-off)
3. [Where the platform's real risk lives](#3--where-the-platforms-real-risk-lives)
4. [Capability matrix](#4--capability-matrix)
5. [Schema/RLS gaps per capability](#5--schemarls-gaps-per-capability)
6. [Capabilities to deliberately leave out](#6--capabilities-to-deliberately-leave-out)
7. [Suggested build order](#7--suggested-build-order)

---

## 1 — Starting point: what exists today

- `profiles.role` is a `user_role` enum: `host | entrant | both | admin`. **`admin` has existed
  in the enum since the first migration but is wired to nothing** — `App.tsx` lumps it into both
  `HOST_ROLES` and `ENTRANT_ROLES`, so today an `admin` account just lands in the normal host
  dashboard with no extra access. There is no `/admin` route, no `RequireAdmin` guard, no admin
  UI component, and no `is_admin()` SQL helper.
- RLS policies (`20260623193807_rls_policies.sql` + later patches) are entirely
  owner-scoped: every `select`/`update`/`delete` policy checks `host_id = auth.uid()`,
  `entrant_id = auth.uid()`, or `winner_id = auth.uid()`. **No table has an admin-bypass
  policy.** An admin account today can see exactly what a host or entrant can see —
  nothing more — because Postgres RLS has no superuser carve-out by default.
- The live schema is leaner than a typical Raffall clone because several half-built
  subsystems were removed rather than finished (see `PLATFORM_AUDIT.md` §2–3):
  `payouts`, `affiliates`, `charities`, `promo_codes`, `campaigns` tables are **gone**,
  along with `raffles.featured_until/charity_id/charity_percent/affiliate_percent`.
  There is no Stripe Connect, no real payout/withdrawal transfer, no charity
  verification flow to manage today.
- Payments run through `chapa` / `telebirr` (Ethiopian mobile-money/payment
  gateways) in ETB, not Stripe. `payments.status` lifecycle is
  `pending → held → released/refunded/compensated`, driven by `create_pending_checkout`
  → webhook → `finalize_checkout`.
- The remaining live tables an admin would actually operate over: `profiles`,
  `raffles`, `payments`, `checkout_contacts`, `tickets`, `winners`, `draw_audit`.

## 2 — What must stay fully automated (hands off)

You asked for admin to cover "everything other than the drawing process" — that line
is already mostly enforced by the schema, not just convention:

- **`private.draw_raffle(raffle_id)`** — `security definer`, lives in the `private`
  schema (not `public`), seeds with `pgcrypto.gen_random_bytes(32)`, and is invoked
  only by the `run-due-*` cron jobs (`pg_cron`, every 15 min). There is currently **no
  RPC exposed to `public`/`authenticated`** that calls it — not even for hosts. Building
  an admin "force draw now" button would be a deliberate new capability, not just
  exposing something hidden; recommend **not** adding it, to keep the "platform can't
  influence who wins" guarantee airtight (this is also called out as the core fairness
  selling point in `raffall-clone-plan.md`).
- **`private.run_due_winner_claim_expirations()`** and
  **`private.run_due_guarantee_compensations()`** — also cron-only, auto-accept a win
  21 days after draw, auto-revoke + 75%-compensate a host who doesn't confirm prize
  delivery within 7 days. These encode a business policy (the "Raffall Guarantee");
  admin's role here is **observability**, not override.
- **`draw_audit`** — one append-only row per draw with the seed, entry count, and
  drawn index, specifically so a disputed result can be independently re-verified.
  Admin needs **read access to this table**, full stop — it's the evidence of a fair
  draw, and today nobody outside the host (via RLS) can see it for a non-public raffle.

**Conclusion for scope:** the admin panel's job is configuration, moderation, support,
and oversight — never the RNG, never the draw timing, never the auto-expiry policy.

## 3 — Where the platform's real risk lives

Cross-referencing `PLATFORM_AUDIT.md` against typical raffle/prize-draw platform
trust & safety needs (Raffall, RallyUp, Gleam-style competitions, and general
marketplace admin tooling) narrows the research to what's actually load-bearing here:

1. **Money moves before delivery is verified.** `payments.status = 'held'` the moment
   a ticket is bought; nothing currently confirms the prize was real before the host
   gets to keep the take. The guarantee compensation cron is the only safety net, and
   it's time-based, not judgment-based — it can't catch a host who *did* confirm a
   blatantly fake prize.
2. **No host vetting exists.** Anyone can register as a host and list a raffle for
   real money (ETB via Chapa/Telebirr) with zero identity check beyond email/phone.
3. **Age gate is enforced, but nothing flags evasion.** `date_of_birth` is now a hard
   `>= 18` DB constraint (good), but there's no admin visibility into rejected attempts
   or repeat-offender accounts.
4. **Disputes have an end-state but no resolver.** `winner_prize_status = 'disputed'`
   and `prize_status = 'disputed'` exist as enum values and are reachable via
   `respond_to_win(... 'dispute')`, but **no function transitions a raffle/winner out of
   `disputed`** — it's a dead-end state today. That's the single biggest functional
   gap an admin panel needs to close.
5. **No platform-wide visibility.** Today, "is the platform healthy" can only be
   answered by querying the DB directly — no dashboard rolls up GMV, commission
   revenue, live raffle count, or flagged accounts across all hosts.

## 4 — Capability matrix

Organized by domain. Each row maps to existing tables where possible.

### 4.1 Users & hosts
| Capability | Backed by | Notes |
|---|---|---|
| Search/list all users, filter by role | `profiles` | Already world-readable per current RLS (`select using (true)`) — only an admin **UI** is missing, not access. |
| Suspend / disable an account | `profiles` (needs new column) | No `status`/`suspended_at` column exists. A suspended host's *live* raffles need an explicit decision (auto-pause? let them run out?). |
| Promote/demote role (`entrant`↔`host`↔`admin`) | `profiles.role` | Granting `admin` should be admin-only-on-admin (no self-service) — needs its own RPC, not a raw `update`. |
| View a host's track record (raffles run, disputes, guarantee-compensation triggers) | `raffles` + `winners` + `payments`, joined | This is the #1 fraud signal: a host who keeps landing in `revoked`/`compensated` is the one to investigate. |
| View a user's full purchase/entry history (support lookups) | `tickets` + `payments` + `checkout_contacts` | Needed for "I paid but got no tickets" support tickets — `checkout_contacts` holds guest details too. |

### 4.2 Raffles
| Capability | Backed by | Notes |
|---|---|---|
| List/search/filter all raffles (any status, any host) | `raffles` | RLS currently hides non-public raffles from everyone except their host — admin needs a bypass. |
| Force-unpublish / pause a raffle (fraud, prohibited prize, complaint) | `raffles.status` | Needs a guarded transition — can't just `update` over RLS; should refuse once a draw has happened. |
| Manually cancel + trigger refund marking | `raffles.status='cancelled'` + `payments.status='refunded'` | Mirrors the existing automatic `min_ticket_target` cancellation path in `private.draw_raffle` — admin version is the same effect, different trigger (a complaint, not a missed target). |
| Edit raffle metadata to fix host mistakes (typo, wrong category) | `raffles` | Low-risk, straightforward. |
| Review queue for new/edited raffles before they go `live` | none today — `status` jumps straight `draft → live` at host's discretion | This is the single highest-leverage *new* capability: pre-publish moderation catches a bad listing before any money moves, instead of after. |

### 4.3 Entries / tickets
| Capability | Backed by | Notes |
|---|---|---|
| View all entries for a raffle, including guest checkouts | `tickets` + `checkout_contacts` | |
| Void a specific entry (confirmed fraud/chargeback) before draw | `tickets` (delete) + `raffles.tickets_sold_count` (decrement) | Must never run *after* a draw — `draw_audit` already locked in the entry count used for that draw. |
| See suspicious-volume patterns (one buyer, many tickets, near sell-out) | `tickets` aggregated | Reporting only — pairs with the analytics section below. |

### 4.4 Payments & finance
| Capability | Backed by | Notes |
|---|---|---|
| Platform-wide payment ledger (gross, commission, host net, by status) | `payments` | No host-scoping — this is the one place "everyone's money" legitimately needs a single screen. |
| Manual refund / mark compensated | `payments.status` | Real money movement is **out of scope** (no Chapa/Telebirr refund API exists per `PLATFORM_AUDIT.md`) — this can only ever update the ledger row, same boundary the automated guarantee-compensation cron already accepts. Must say so in the UI, not pretend it triggers a real transfer. |
| Commission rate visibility/config | currently hardcoded `0.15`/`0.10` in `purchase_tickets`/`create_pending_checkout` SQL | Today changing the take rate means a migration. Worth flagging as a config gap, not necessarily solving in v1. |
| Reconcile `checkout_contacts` for disputed/duplicate payments | `checkout_contacts` | Support tool, not bulk-edit. |

### 4.5 Winners & disputes
| Capability | Backed by | Notes |
|---|---|---|
| Cross-raffle winners list, filterable by `prize_status` | `winners` | |
| **Resolve a `disputed` winner/prize** | new RPC needed | The dead-end identified in §3.4 — admin needs to set a final outcome (`accepted`/`compensated`) with a reason, recorded somewhere auditable. This is the most important *new* function to design, separate from the automated paths. |
| Read `draw_audit` for any raffle (not just owned/public ones) | `draw_audit` | Needed to investigate "the draw was rigged" complaints — today only host/public-raffle viewers can see it. |
| Manually extend a claim deadline (compassionate case: winner unreachable, valid reason) | `winners.claim_deadline` | Edge case, low priority. |

### 4.6 Compliance
| Capability | Backed by | Notes |
|---|---|---|
| Review accounts that failed the `date_of_birth >= 18` check (signal abuse / repeated underage attempts) | needs new logging — currently a silent DB constraint violation, nothing recorded | |
| Free-entry-route audit (`entry_type = 'free_share'/'free_bonus'`) | `tickets.entry_type` | In many jurisdictions a paid prize draw is only legally a "raffle" if a genuine no-purchase-necessary route exists; admin should be able to confirm every live raffle actually offers one, not just that the column supports it. |
| Data export/delete for a user (subject access / right-to-erasure requests) | `profiles` + cascades | `profiles` cascades from `auth.users` already; a delete RPC is straightforward but needs care around `tickets`/`payments` that reference the user (financial records often must be *retained*, not deleted, even on request). |

### 4.7 Platform configuration & analytics
| Capability | Backed by | Notes |
|---|---|---|
| GMV / commission revenue / live-raffle-count dashboard | aggregate over `raffles`+`payments` | Pure reporting, no new tables. |
| Per-host leaderboard / risk score (dispute rate, compensation rate) | aggregate over `raffles`+`winners`+`payments` | Reuses the same join as §4.1's host track record. |
| Subscription tier overrides (`profiles.subscription_tier`) | `profiles` | Tier currently only affects commission rate (`basic`=15%, else 10%) — support teams will need to comp/adjust this manually sometimes. |

### 4.8 Admin accountability (meta)
| Capability | Backed by | Notes |
|---|---|---|
| **Admin action audit log** | new table | Every capability above that mutates state (suspend a host, force-cancel a raffle, resolve a dispute, edit a payment) should write to an `admin_actions` table (actor, target, action, reason, timestamp). Without this, the admin panel itself becomes the platform's biggest unaudited trust hole — worse than the gaps it's meant to close. Treat this as a prerequisite, not a nice-to-have, given admin will touch money and dispute outcomes. |

## 5 — Schema/RLS gaps per capability

Concrete blockers, so a future implementation pass doesn't rediscover these:

1. **No `is_admin()` helper.** Every existing RLS bypass pattern in this codebase uses
   a `security definer` SQL function (`is_raffle_host`, `is_raffle_public`) to dodge
   RLS recursion. Admin access needs the same pattern: `is_admin() returns boolean as
   $$ select exists(select 1 from public.profiles where id = auth.uid() and role =
   'admin') $$`, then `using (is_admin() or <existing owner check>)` added to every
   table's select/update policies — not a separate set of admin-only tables.
2. **No status/suspension column on `profiles`.** Needed before "suspend a host" can
   exist as anything beyond a role downgrade (which doesn't stop an in-flight raffle).
3. **No dispute-resolution RPC.** `respond_to_win()` only handles the entrant's
   accept/dispute transition; nothing handles what happens *after* `disputed`.
4. **No admin_actions audit table.** Called out in §4.8 — needed before any mutating
   admin capability ships, not after.
5. **No moderation/review state on `raffles`.** `raffle_status` is
   `draft|live|ended|cancelled` — there's no `pending_review` state if a pre-publish
   queue is wanted (§4.2).
6. **Commission rate is hardcoded in two SQL functions**, not read from a config
   table — changing it today means a migration touching both `purchase_tickets` and
   `create_pending_checkout`.

## 6 — Capabilities to deliberately leave out

To keep scope honest given what's actually achievable in this codebase
(per `PLATFORM_AUDIT.md`'s repeated "no real transfer integration" callouts):

- **Real refund/payout execution** — there is no Stripe Connect, no Chapa refund API,
  no Telebirr merchant API wired up. Admin "refund" actions can only update the ledger
  row, exactly like the existing automated compensation path does. Don't build a UI
  that implies money actually moves.
- **Triggering or rescheduling a draw** — covered in §2; this is the one process the
  user explicitly wants to stay fully automated, and the schema already isolates it
  in the `private` schema for exactly that reason.
- **Charity/affiliate management** — both subsystems were already built and then
  deliberately removed for having no real flow behind them. Resurrecting them isn't
  in scope unless the product direction changes.

## 7 — Suggested build order

A future implementation should sequence roughly:

1. **Foundation (no UI yet):** `is_admin()` helper, admin-bypass RLS policies on the
   tables above, `admin_actions` audit table, `/admin` route + `RequireAdmin` guard.
2. **Read-only oversight first:** platform-wide raffles/payments/winners list views,
   `draw_audit` access, host risk/track-record view. Zero mutation risk, immediately
   useful for support.
3. **Dispute resolution RPC** — closes the one functional dead-end in the current
   schema (§3.4 / §4.5).
4. **Moderation actions:** force-pause/cancel a raffle, suspend a host — each wired
   through the audit log from step 1.
5. **Reporting/analytics dashboard.**
6. **Compliance tooling** (age-check review, free-entry-route audit) and
   **config surfaces** (commission rate, subscription tier overrides) — lowest
   urgency, least schema-ready today.
