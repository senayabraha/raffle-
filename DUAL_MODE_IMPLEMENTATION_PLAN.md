# Dual-Mode (Entrant / Host) — Actionable Implementation Plan

**Date:** June 26, 2026
**Source audit:** `raffle-dual-mode-audit.md`
**Target branch:** `claude/red-file-raffle-dual-mode-nugegr`

This plan supersedes the audit where the codebase has since moved on. Read
"Current reality" first — several items the audit listed as "NOT built" now
exist, and rebuilding them would be wasted work.

---

## 0. Current reality (verified against `main`)

What already exists and must be **reused, not rebuilt**:

| Already in the code | Where |
|---|---|
| Session-scoped mode (`loginContext: "host" \| "entrant"`), persisted to `localStorage`, cleared on sign-out | `src/lib/auth.tsx` |
| Mode route guards `RequireHostContext` / `RequireEntrantContext` (+ `RequireAuth`, `RequireAdmin`) | `src/App.tsx:83-137` |
| Two separate shells — **host** (`AppShell` + `Sidebar` + `Topbar`) and **entrant/public** (`PublicShell`) | `src/components/layout/` |
| Entrant pages: Marketplace, RaffleDetail, MyTickets, MyWinnings (use `PublicShell`) | `src/pages/` |
| Auth pages: `Login`, `HostLogin`, `Register` with separate portals | `src/pages/` |
| `user_role` enum already includes `both` | `…enums_and_profiles.sql` |

What is **genuinely still missing** (the real work):

1. `profiles.last_active_mode` column — mode is only in `localStorage`, so it
   does not survive a device change or a fresh login on another browser.
2. No **in-app mode switch** — today the only way to change mode is to sign
   out and come back through the other portal. There is no "Switch to
   Hosting / Switch to Entering" affordance.
3. No unified **mode context** exposing `canHost` / `canEnter` / `setMode`.
4. `Sidebar` and `Topbar` are **hardcoded to host** ("Host Studio", "New
   raffle", tier label "Host", search placeholder "raffles, entrants,
   payouts"). They never adapt to entrant mode.
5. **Self-entry is not blocked** in `purchase_tickets` or
   `create_pending_checkout` — a host can buy tickets in their own raffle.
6. **Raffles INSERT RLS is too loose** — any authenticated user can insert a
   raffle row regardless of role.
7. `handle_new_user()` still trusts `role` from sign-up metadata.
8. `trustpilot_score` column is unused dead weight.

### Guiding decision: one source of truth for mode

`last_active_mode` (DB) becomes the **durable** source of truth.
`loginContext` (localStorage) stays as the **fast, pre-profile** hint used on
the login screens and during the first paint before the profile loads. On
auth resolution we reconcile: DB value wins; if absent, seed it from
`loginContext`; the in-app switch writes both.

---

## Phase 1 — Database foundation

**Goal:** make mode durable and close the two security gaps. One migration,
no app code.

**New migration** `supabase/migrations/20260630000000_dual_mode_foundation.sql`:

1. **Add the column**
   ```sql
   alter table public.profiles
     add column last_active_mode text not null default 'entrant'
     check (last_active_mode in ('entrant', 'host'));
   ```
2. **Backfill** existing rows so current hosts land in host mode:
   ```sql
   update public.profiles
     set last_active_mode = 'host'
     where role in ('host', 'both', 'admin');
   ```
3. **Self-entry guard** — add to `purchase_tickets` AND
   `create_pending_checkout`, right after `v_raffle` is loaded:
   ```sql
   if v_uid is not null and v_raffle.host_id = v_uid then
     raise exception 'Hosts cannot enter their own raffle.';
   end if;
   ```
   (Recreate both functions with `create or replace`; keep every existing
   line — only insert the guard.)
4. **Tighten raffles INSERT RLS** — replace the policy at
   `rls_policies.sql:55-56`:
   ```sql
   drop policy "Hosts can create their own raffles" on public.raffles;
   create policy "Hosts can create their own raffles"
     on public.raffles for insert to authenticated
     with check (
       host_id = (select auth.uid())
       and exists (
         select 1 from public.profiles p
         where p.id = (select auth.uid())
           and p.role in ('host', 'both', 'admin')
       )
     );
   ```
5. **Update `handle_new_user()`** — default `role = 'entrant'`; when sign-up
   metadata carries `role = 'host'`, also set `last_active_mode = 'host'`.
6. **Drop dead column** (optional, low risk): `alter table public.profiles
   drop column trustpilot_score;` — only after confirming nothing reads it
   (it appears solely in generated types).

**Acceptance:** `last_active_mode` exists with the check constraint; a host
calling `purchase_tickets` on their own raffle gets the exception; a pure
entrant cannot INSERT a raffle row.

**Then regenerate types:** `src/lib/database.types.ts` (Supabase typegen).

---

## Phase 2 — Mode context (the brain)

**Goal:** one hook the whole app reads mode from, backed by the DB.

**New file** `src/lib/mode.tsx` (mirrors the `auth.tsx` provider style):

```ts
type AppMode = "entrant" | "host";

interface ModeState {
  mode: AppMode;          // durable, from profile.last_active_mode
  canHost: boolean;       // role ∈ host | both | admin
  canEnter: boolean;      // role ∈ entrant | both | admin
  setMode: (m: AppMode) => Promise<void>; // writes DB + loginContext + state
  switching: boolean;
}
```

- Reads `profile.last_active_mode` from `useAuth()`; falls back to
  `loginContext` then `"entrant"` before the profile resolves.
- `setMode` updates `profiles.last_active_mode`, mirrors to `loginContext`,
  calls `refreshProfile()`, then navigates to that mode's home
  (`/en/dashboard` for host, `/en/public-raffles/live` for entrant).
- Guard `setMode` against capability: switching to `host` requires
  `canHost`; otherwise route to an "Become a host" upsell (Phase 4).

Wrap `<ModeProvider>` inside `<AuthProvider>` in `src/App.tsx`.

**Acceptance:** `useMode()` returns correct flags for entrant / host / both /
admin accounts; switching persists across a full reload and a different
browser.

---

## Phase 3 — Mode-aware navigation & shell

**Goal:** the chrome reflects the mode, and switching is one click. Keep the
two-shell split; make each one mode-literate.

1. **Nav config** — turn the hardcoded arrays in `Sidebar.tsx:15-25` into two
   sets:
   - **Host:** Overview, Create Raffle, Ended Raffles · Marketplace,
     Settings, Support.
   - **Entrant:** Browse Raffles, My Tickets, My Wins · Settings, Support.
   `Sidebar` picks the set from `useMode().mode`.
2. **Switch affordance** — add one item at the bottom of the nav:
   - In host mode, if `canEnter`: **"Switch to Entering"** → `setMode('entrant')`.
   - In entrant mode, if `canHost`: **"Switch to Hosting"** → `setMode('host')`.
   - In entrant mode, if `!canHost`: **"Host a raffle"** → upsell (Phase 4).
3. **Topbar de-hardcode** (`Topbar.tsx`): the "New raffle" button and "Host"
   tier label render only in host mode; in entrant mode show the user's
   entrant identity and an entrant-appropriate primary action (e.g. "Browse
   raffles"). Brand subtitle "Host Studio" becomes mode-driven.
4. **Shared pages** (`Account`, `Support`, notifications) should render under
   whichever shell matches the current mode so the surrounding nav stays
   consistent — pick the shell from `useMode()` rather than hardcoding
   `AppShell`.

**Acceptance:** a `both`/admin account can flip modes from the sidebar with no
sign-out; nav, brand, and primary CTA all change; an entrant-only account
never sees host-only items.

---

## Phase 4 — Entry points, guards & onboarding

**Goal:** seed mode correctly at the front door, and reconcile guards with the
new durable mode.

1. **Login mode param** — `Login` / `HostLogin` already set `loginContext`;
   on successful auth, also write `last_active_mode` to match the portal, then
   redirect to that mode's home (respecting `?redirectTo`).
2. **Register** — capture intended role; pass `role` in sign-up metadata so
   the updated `handle_new_user()` (Phase 1) sets role + mode together.
3. **Guards** — `RequireHostContext` / `RequireEntrantContext` keep their
   current capability checks but now read durable `mode` for redirect targets,
   so a deep link into the wrong mode lands the user on their real home
   instead of bouncing.
4. **"Become a host" upsell** — small page/modal for entrant-only accounts who
   tap a host CTA: explains hosting, and on confirm promotes `role`
   entrant→both (server RPC, e.g. `request_host_access`) then `setMode('host')`.
5. **Host onboarding empty state** — when a host has zero raffles, the
   Dashboard shows a friendly first-run panel (single primary CTA: "Create
   your first raffle") instead of empty bento cards.

**Acceptance:** new sign-ups land in the right mode; entrant-only users get the
upsell, not a dead end; brand-new hosts see guidance, not emptiness.

---

## Phase 5 — QA & regression

**Goal:** prove the matrix before shipping. No new features.

Test the cross-product of **role** × **entry portal** × **switch**:

| Role | From entrant portal | From host portal | In-app switch |
|---|---|---|---|
| entrant | entrant home | blocked → entrant home | upsell only |
| host | entrant browsing OK | host dashboard | both ways |
| both | entrant home | host dashboard | both ways |
| admin | entrant home | host dashboard + admin | both ways |

Plus: self-entry blocked end-to-end (RPC + UI); entrant cannot create a
raffle; mode survives reload and second device; sign-out clears
`loginContext`. Run `tsc`/build and the existing lint before each push.

---

## Phase 6 — Frontend presentation polish (keep it simple)

**Goal:** make the dual-mode product feel like *one calm place with two
doors*, not two bolted-together apps. Constraint from the brief: **easy,
simple, basic — not complicated.** Everything below removes choices rather
than adding them.

**The one idea — "one house, two rooms."** A single mental model the user
never has to relearn: they are always *somewhere in the same building*, and a
single switch moves them between the two rooms. No second login, no second
brand, no second visual world — just a quieter or busier version of the same
room.

Concrete, low-effort moves:

1. **One mode pill, always in the same spot.** A single small pill in the
   top-left of the nav showing the current room ("Entering" / "Hosting") with
   a ⇄ icon. Tap = switch (or upsell). This *replaces* the buried sidebar
   switch item — one obvious control beats two hidden ones. It is the only new
   UI primitive the whole feature needs.

2. **Two accent colors, nothing else changes.** Entrant = the existing
   accent; Host = one alternate accent. Layout, spacing, type, components stay
   byte-for-byte identical between modes. The color is the *only* signal of
   "which room" — cheap to build, instantly legible, impossible to get lost
   in.

3. **One empty state pattern, reused everywhere.** A single
   `<EmptyState icon title subtitle cta />` component for "no raffles yet",
   "no tickets yet", "no wins yet". Same shape, same tone ("Nothing here yet —
   here's the one thing to do next"). Consistency *is* the polish; it also
   deletes bespoke empty markup scattered across pages.

4. **Subtract from the chrome.** Remove anything mode-irrelevant: hide the ⌘K
   search until it actually searches; collapse Support into Account; cap the
   sidebar at the few items that matter per mode (3 primary + 2 secondary).
   The fastest way to feel "simple" is fewer things on screen.

5. **One honest transition.** When switching modes, a ~200ms accent-color
   crossfade on the shell — enough to say "you moved rooms", not a spinner or
   a reload. Reuse the existing framer-motion already in the bundle; no new
   dependency.

**Creative-but-restrained framing for copy:** lean on the spatial metaphor
without naming it — "You're entering." / "You're hosting." / "Step into
hosting." Verbs, present tense, second person. No jargon, no mode taxonomy
exposed to the user; "Entrant" and "Host" are internal words, the UI says
"Entering" and "Hosting".

**Acceptance:** a first-time user understands which room they're in and how to
switch within 5 seconds, with zero documentation; the two modes are visually
distinguishable by color alone; every "nothing here" screen looks like a
sibling of the others.

---

## Suggested commit sequence

1. `feat(db): dual-mode foundation — last_active_mode, self-entry guard, RLS, handle_new_user`
2. `feat(mode): durable ModeProvider + useMode`
3. `feat(nav): mode-aware sidebar, topbar, and shell selection`
4. `feat(auth): seed mode at login/register, host upsell, host onboarding`
5. `test: dual-mode role × portal × switch matrix`
6. `feat(ui): one-house presentation pass — mode pill, accent, empty states`

Each phase is independently shippable and leaves the app working.
