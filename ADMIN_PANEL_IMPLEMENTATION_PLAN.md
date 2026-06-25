# Admin Panel — Phased Implementation Plan

> Companion to `ADMIN_PANEL_RESEARCH.md`. That doc answers "what does admin need and
> why"; this one answers "in what order, with which files, and how do we know each
> phase is done." Each phase is independently shippable and leaves the automated draw
> / cron jobs (`private.draw_raffle`, `run_due_winner_claim_expirations`,
> `run_due_guarantee_compensations`) completely untouched.

## Conventions used below
- Migration files go in `supabase/migrations/` with the repo's `YYYYMMDDHHMMSS_name.sql`
  naming.
- All admin-mutating logic goes through `security definer` RPCs in `public` (never a
  raw client-side `update`/`delete` against an admin-bypass RLS policy) so every
  mutation can validate state transitions and write to `admin_actions` in one place.
- Frontend admin pages live under `src/pages/admin/`, routed at `/en/admin/*`, gated by
  a new `RequireAdmin` guard in `src/App.tsx` (sibling to `RequireHostContext`).

---

## Phase 0 — Foundation: admin identity, access, accountability

Nothing user-visible yet. This unblocks every later phase and is the highest-leverage
phase to get right, since every mutation later depends on it.

**Migration `..._admin_foundation.sql`:**
- `private.is_admin() returns boolean` — `security definer`, mirrors `is_raffle_host`/
  `is_raffle_public`: `select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')`.
- `public.admin_actions` table: `id, actor_id (fk profiles), action text, target_table text, target_id uuid, reason text, meta jsonb, created_at`.
  RLS: `select`/`insert` restricted to `private.is_admin()`.
- Add `using (private.is_admin() or <existing condition>)` to the `select` policies on
  `profiles`, `raffles`, `payments`, `tickets`, `winners`, `draw_audit`,
  `checkout_contacts`. (Most already allow broad `select`; the real fix is `raffles`,
  `payments`, `winners`, `draw_audit`, `checkout_contacts`, which are currently
  owner-scoped.)
- Helper `private.log_admin_action(p_action text, p_target_table text, p_target_id uuid, p_reason text, p_meta jsonb default '{}')` used by every RPC added in later phases.

**Frontend:**
- `src/App.tsx`: add `RequireAdmin` (checks `profile.role === 'admin'`, redirect to
  `/en/dashboard` otherwise — no separate admin login portal, reuse existing session).
- `src/pages/admin/AdminLayout.tsx` — shell with its own nav (Overview / Raffles /
  Payments / Users / Disputes), mounted at `/en/admin/*`.
- Empty placeholder pages so the route tree exists before Phase 1 fills them in.

**Acceptance criteria:**
- An account with `role = 'admin'` can load `/en/admin` and see the shell; any other
  role gets redirected.
- Direct REST calls to `raffles`/`payments`/etc. as a non-admin, non-owner user are
  still rejected by RLS (regression check — this phase must not loosen anything for
  non-admins).
- `admin_actions` has zero rows until Phase 2+ starts writing to it.

---

## Phase 1 — Read-only oversight

Lowest risk: every page here is a `select`, nothing mutates. Ships immediately useful
support/ops tooling.

**Frontend pages (all under `src/pages/admin/`):**
- `Overview.tsx` — platform stat cards: live raffle count, GMV (sum `payments.amount_gross` where `status in ('held','released')`), platform commission total, total users by role. Reuses the `StatCard`/`CardHeader` components already in `src/components/dashboard/`.
- `Raffles.tsx` — table of **all** raffles regardless of host/visibility, filterable by `status`, searchable by title/host email. Row click → detail view showing `draw_audit` rows for that raffle (the fairness evidence from §2 of the research doc).
- `Payments.tsx` — table of all `payments`, filterable by `status`/`provider`, joined to `checkout_contacts` for guest buyer info.
- `Users.tsx` — searchable `profiles` table, filter by `role`, link to a user's `tickets`/`payments`/`winners` history for support lookups.
- `Winners.tsx` — all `winners` rows, filterable by `prize_status`, flags `disputed` rows for follow-up in Phase 2.

**No new migrations beyond Phase 0's RLS bypass** — this phase is pure UI + queries.

**Acceptance criteria:**
- Admin can find any raffle/payment/user/winner across the whole platform, including
  private raffles and guest checkouts, without touching the DB directly.
- A support question ("did user X's payment go through?") is answerable from the UI
  in under a minute.

---

## Phase 2 — Dispute resolution

Closes the dead-end identified in the research doc: `winner_prize_status = 'disputed'`
and `raffles.prize_status = 'disputed'` are reachable but nothing resolves them today.

**Migration `..._admin_dispute_resolution.sql`:**
- `public.admin_resolve_dispute(p_winner_id uuid, p_decision text, p_reason text) returns jsonb`
  - `security definer`, requires `private.is_admin()`.
  - Loads the `winners` row `for update`; rejects if `prize_status <> 'disputed'`.
  - `p_decision = 'uphold_entrant'` → same effect as the guarantee-compensation cron:
    `winners.prize_status = 'compensated'`, `raffles.prize_status = 'revoked'`,
    `payments.status = 'compensated'` for that raffle.
  - `p_decision = 'uphold_host'` → `winners.prize_status = 'accepted'`,
    `winners.accepted_at = now()`, `raffles.prize_status = 'confirmed'`.
  - Either branch calls `private.log_admin_action('resolve_dispute', 'winners', p_winner_id, p_reason, jsonb_build_object('decision', p_decision))`.

**Frontend:**
- `Disputes.tsx` queue (filtered `Winners.tsx` view) with a resolve modal that requires
  a `reason` before submitting — surfaced as its own admin nav item since it's the
  page admin will use most.

**Acceptance criteria:**
- A `disputed` winner can be moved to a terminal state (`accepted` or `compensated`)
  only by admin, only with a recorded reason, and the action appears in
  `admin_actions`.
- Attempting to resolve a winner that isn't currently `disputed` is rejected by the
  RPC (state-machine guard, not just a UI disable).

---

## Phase 3 — Moderation actions (raffles & hosts)

First phase that lets admin act on *live* state outside a dispute — sequenced after
Phase 2 because it's higher blast-radius (can stop a raffle that's actively selling
tickets) and benefits from the audit-log pattern already proven in Phase 2.

**Migration `..._admin_moderation.sql`:**
- `public.admin_set_raffle_status(p_raffle_id uuid, p_status text, p_reason text) returns jsonb`
  - Allowed transitions only: `live → draft` (unpublish), `live → cancelled` (force
    cancel — also flips `payments.status = 'refunded'` for held payments on that
    raffle, same as the existing `min_ticket_target` auto-cancel path).
  - Rejects any transition once `draw_audit` has a row for that raffle (draw already
    happened — moderation after the fact belongs in Phase 2's dispute flow, not here).
  - Logs via `log_admin_action`.
- `alter table public.profiles add column status text not null default 'active' check (status in ('active','suspended'))`.
- `public.admin_set_user_status(p_user_id uuid, p_status text, p_reason text) returns jsonb`
  - Suspending a host does **not** auto-cancel their live raffles (separate decision,
    surfaced to admin as a prompt: "this host has N live raffles — cancel them too?"
    which calls `admin_set_raffle_status` per raffle if confirmed).
  - Suspended accounts should be blocked at login — small addition to `src/lib/auth.tsx` to check `profile.status` and sign out with a message.
- `public.admin_set_user_role(p_user_id uuid, p_role text, p_reason text) returns jsonb` — admin-only, logged; used sparingly (granting `admin` itself).

**Frontend:**
- Raffle detail admin actions (unpublish/cancel buttons + reason field) added to
  Phase 1's `Raffles.tsx` detail view.
- User detail admin actions (suspend/reinstate, role change) added to `Users.tsx`.

**Acceptance criteria:**
- Cancelling a raffle through admin marks held payments refunded, exactly mirroring
  the automated under-target cancellation path's effect.
- A suspended user cannot log in; reinstating them restores access without resetting
  any other state.
- All three RPCs reject the action and the relevant transition is impossible once
  `draw_audit` exists for that raffle.

---

## Phase 4 — Compliance & support tooling

Lower urgency than Phases 1–3 (per research doc §6/§7) — schema isn't fully ready for
some of this, so each item below starts with the smallest viable migration.

- **Free-entry-route audit:** `Raffles.tsx` filter/badge flagging any `live` raffle
  whose `bundle_rules` contains no free-tier entry — read-only, no migration needed,
  just a query against existing `tickets.entry_type`/`raffles.bundle_rules`.
- **Age-gate rejection visibility:** add a lightweight log insert (new table
  `public.signup_rejections` or reuse `admin_actions` with `actor_id = null`) at the
  point `handle_new_user`/checkout age check fails, so repeated underage attempts are
  visible instead of silently bouncing off the DB constraint. Small, isolated
  migration — do this only if/when underage-signup volume becomes a real question.
- **Data export/delete RPC** for subject-access requests: `public.admin_export_user_data(p_user_id uuid)` returning a JSON bundle of `profiles`/`tickets`/`payments`/`winners` rows; deletion needs explicit product sign-off on what must be *retained* (financial records) vs. erased, so scope that conversation before writing the migration.

**Acceptance criteria:** each item ships independently; none blocks the others.

---

## Phase 5 — Analytics & platform configuration

Builds on Phase 1's read views; lowest priority because the schema changes here are
more invasive (touching the commission-rate logic embedded in `purchase_tickets`/
`create_pending_checkout`).

- **Host risk leaderboard:** aggregate page (dispute rate, compensation rate per
  host) — pure query over Phase 1's data, no migration.
- **Commission-rate config:** introduce `public.platform_config` (key/value or a
  dedicated `commission_rates` table keyed by `subscription_tier`), then update
  `purchase_tickets` and `create_pending_checkout` to read from it instead of the
  hardcoded `0.15`/`0.10` literals. This is a behavior-affecting migration on the
  checkout path — needs its own careful review/testing pass, not bundled with
  anything else.
- **Subscription tier override RPC:** `public.admin_set_subscription_tier(p_user_id uuid, p_tier text, p_reason text)` — small, logged, low risk once Phase 0's logging helper exists.

---

## Summary checklist

| Phase | Adds mutation risk? | Depends on |
|---|---|---|
| 0 — Foundation | No (infra only) | — |
| 1 — Read-only oversight | No | 0 |
| 2 — Dispute resolution | Yes (new terminal state) | 0, 1 |
| 3 — Moderation actions | Yes (live-state changes) | 0, 1, 2 (audit pattern) |
| 4 — Compliance/support | Mixed, small | 0 |
| 5 — Analytics/config | Yes (checkout-path migration in the config item) | 0, 1 |

Recommend treating Phases 0–2 as a single first milestone (foundation + visibility +
the one real functional gap), and 3–5 as follow-on work once that's in production and
the audit-log pattern has proven itself.
