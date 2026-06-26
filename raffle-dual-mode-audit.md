# Raffle Platform — Dual-Mode Architecture Audit

**Date:** June 25, 2026  
**Scope:** Full codebase + DB + UI review for Entrant/Host mode switching

-----

## 1. WHAT THE PROJECT HAS RIGHT NOW

### Database (31 migrations, all live)

|Table              |Purpose                                                                            |Status |
|-------------------|-----------------------------------------------------------------------------------|-------|
|`profiles`         |One row per auth user. Holds `role`, `subscription_tier`, `status`, `date_of_birth`|✅ Solid|
|`raffles`          |All raffle data, state machine (`draft→live→ended/cancelled`)                      |✅ Solid|
|`tickets`          |Entry records, supports `paid / free_share / free_bonus / affiliate`               |✅ Solid|
|`payments`         |Payment lifecycle (`pending→held→released/refunded/compensated`)                   |✅ Solid|
|`checkout_contacts`|Guest checkout contact capture                                                     |✅ Solid|
|`winners`          |Win record + claim lifecycle                                                       |✅ Solid|
|`draw_audit`       |Cryptographic draw log (seed, index, winner)                                       |✅ Solid|
|`notifications`    |In-app notifications for both roles                                                |✅ Solid|
|`admin_actions`    |Full admin audit trail                                                             |✅ Solid|

### Enums already in the DB

```
user_role:          host | entrant | both | admin
raffle_status:      draft | live | ended | cancelled
payment_status:     pending | held | released | refunded | compensated | failed
subscription_tier:  basic | premium | pro
draw_type:          date | soldout | hybrid
entry_type:         paid | free_share | free_bonus | affiliate
prize_status:       pending | confirmed | revoked | disputed
winner_prize_status: awaiting_claim | claimed | accepted | disputed | compensated
visibility:         public | private
payment_provider:   chapa | telebirr
```

### Server-Side Functions (RPCs)

|Function                     |Who calls it    |Notes                               |
|-----------------------------|----------------|------------------------------------|
|`purchase_tickets`           |Entrant         |Legacy direct-purchase (Stripe path)|
|`create_pending_checkout`    |Entrant         |New Chapa/Telebirr checkout flow    |
|`finalize_checkout`          |Webhook         |Idempotent, issues tickets          |
|`get_checkout_status`        |Entrant         |Poll/confirm tickets issued         |
|`cancel_raffle`              |Host            |Zero-ticket cancellation            |
|`confirm_prize`              |Host            |Prize delivery confirmation         |
|`respond_to_win`             |Winner (Entrant)|Accept or dispute prize             |
|`update_raffle_details`      |Host            |Edit live/draft raffle              |
|`admin_set_user_role`        |Admin           |—                                   |
|`admin_set_user_status`      |Admin           |—                                   |
|`admin_set_subscription_tier`|Admin           |—                                   |
|`admin_set_raffle_status`    |Admin           |—                                   |
|`admin_resolve_dispute`      |Admin           |—                                   |
|`admin_export_user_data`     |Admin           |GDPR export                         |

### Automated (private schema, pg_cron)

|Function                                    |Trigger                                      |
|--------------------------------------------|---------------------------------------------|
|`private.run_due_draws()`                   |Draws raffles past their date                |
|`private.run_due_guarantee_compensations()` |Auto-refunds after 7 days of no prize confirm|
|`private.run_due_winner_claim_expirations()`|Auto-accepts unclaimed wins                  |
|`private.draw_raffle()`                     |Called by run_due_draws                      |
|`private.notify_draw()`                     |Fires Edge Function webhook after draw       |

### Edge Functions

|Slug             |JWT required|Purpose                               |
|-----------------|------------|--------------------------------------|
|`create-checkout`|Yes         |Initiates Chapa/Telebirr payment      |
|`verify-payment` |No          |Webhook receiver from payment provider|

### Frontend (current routes per README)

|Route          |View                       |
|---------------|---------------------------|
|`/` → `/en`    |Marketing landing          |
|`/en/dashboard`|Host dashboard (bento grid)|

-----

## 2. WHAT IS MISSING (Must Build)

### A. The `last_active_mode` column — NOT in DB yet

The profiles table has no `last_active_mode` column. This is the single most important addition for the dual-mode system.

**Migration needed:**

```sql
ALTER TABLE public.profiles
  ADD COLUMN last_active_mode text NOT NULL DEFAULT 'entrant'
  CHECK (last_active_mode IN ('entrant', 'host'));
```

### B. Entire Entrant-side UI — NOT built

The frontend only has a landing page and a host dashboard. There is no:

- Marketplace / raffle browsing page
- Raffle detail / ticket purchase page
- My Tickets page
- My Wins page
- Entrant profile/settings

### C. Mode Context — NOT built

No React context, no Zustand store, no mode-aware routing exists yet.

### D. Auth flow — partially missing

- No sign-up form that captures `role` or routes by entry point
- No login page for either mode’s entry point
- `handle_new_user()` trigger exists and reads `role` from `raw_user_meta_data`, but nothing passes it yet

### E. Route guards — NOT built

No protection on `/en/dashboard` to prevent an entrant-mode user from accessing it.

### F. AppShell switching — NOT built

The sidebar/topbar are currently hardcoded to host mode. No conditional rendering based on mode.

### G. Host onboarding screen — NOT built

Empty state for a brand-new host (no raffles yet).

### H. Self-entry prevention — NOT enforced

A host can buy tickets in their own raffle. No DB constraint or RLS policy blocks this.

-----

## 3. WHAT EXISTS BUT NEEDS CHANGES

### A. `profiles.role` — needs rethinking for mode

Currently `role` stores the *capability* (`host | entrant | both | admin`). It should continue to do that. The *active mode* (which app shell the user is in right now) should be `last_active_mode`. These are two different things. **No change to role enum needed.**

### B. `handle_new_user()` trigger — needs update

Currently reads `role` from sign-up metadata. After the mode system is built, new users should always get `role = 'entrant'` by default. If they go through the host sign-up door, set `role = 'host'` AND `last_active_mode = 'host'`. Currently it only sets role.

### C. `private.is_admin()` — fine as-is

Checks `role = 'admin'`. No change needed.

### D. RLS on `raffles` INSERT policy

Current policy: `Hosts can create their own raffles` — no role check. Any authenticated user can INSERT a raffle. Should be tightened to `role IN ('host', 'both', 'admin')`.

### E. `purchase_tickets` RPC

Does not prevent a host from entering their own raffle. Add:

```sql
IF v_raffle.host_id = v_uid THEN
  RAISE EXCEPTION 'Hosts cannot enter their own raffle.';
END IF;
```

Same fix needed in `create_pending_checkout`.

-----

## 4. WHAT IS THERE BUT NOT NECESSARY (Can Remove or Defer)

### A. `trustpilot_score` column on profiles

This is a `numeric` column on profiles. There is no Trustpilot integration, no function that writes to it, no UI for it. **Remove or defer** — it adds noise and is not part of the current scope.

### B. `subscription_tier` gating on raffles INSERT

Currently the commission rate is calculated based on `subscription_tier` (`basic = 15%, other = 10%`). But there is no sign-up flow, no payment for tiers, and no UI to upgrade. The tier logic in `purchase_tickets` and `create_pending_checkout` works fine, but the subscription upgrade path is entirely absent. **Defer the upgrade UI** — the math works but the user-facing tier management is missing.

### C. `entry_type: free_share | affiliate`

These entry types exist in the enum but no function currently creates `free_share` or `affiliate` tickets. Bundle rules create `free_bonus`, but share-based free entries have no implementation. **Defer** — remove from UI references for now.

### D. `payment_provider: telebirr`

In the enum but the Edge Function only handles Chapa. **Defer** telebirr until that integration is built.

### E. `visibility: private` on raffles

The column and RLS policies exist for private raffles, but there is no UI to toggle visibility or share a private raffle link. **Defer UI** — the DB is fine.

-----

## 5. THE DUAL-MODE IMPLEMENTATION PLAN

### Phase 1 — Database (1 migration)

```sql
-- Migration: add_last_active_mode
ALTER TABLE public.profiles
  ADD COLUMN last_active_mode text NOT NULL DEFAULT 'entrant'
  CHECK (last_active_mode IN ('entrant', 'host'));

-- Also add self-entry guard to purchase_tickets and create_pending_checkout (see Phase 3)
-- Also tighten raffles INSERT RLS
```

### Phase 2 — React Context (new file: src/contexts/ModeContext.tsx)

```typescript
type AppMode = 'entrant' | 'host'

interface ModeContextValue {
  mode: AppMode
  setMode: (m: AppMode) => void   // saves to DB + flips local state
  canHost: boolean                 // role is 'host' | 'both' | 'admin'
  canEnter: boolean                // role is 'entrant' | 'both' | 'admin'
}
```

On mount: reads `profiles.last_active_mode` from Supabase, sets context.  
On switch: calls `supabase.from('profiles').update({ last_active_mode: m })`, then flips context.

### Phase 3 — Route Structure

```
/en/                          → Landing (public)
/en/login                     → Login (mode-aware, reads ?mode=host or ?mode=entrant)
/en/signup                    → Sign-up (same)

--- ENTRANT MODE ROUTES ---
/en/raffles                   → Marketplace (browse all live raffles)
/en/raffles/:slug             → Raffle detail + ticket purchase
/en/my-tickets                → My entered raffles + ticket numbers
/en/my-wins                   → My winning records

--- HOST MODE ROUTES ---
/en/dashboard                 → Host dashboard (bento overview)
/en/dashboard/raffles         → My raffles list
/en/dashboard/raffles/new     → Create raffle
/en/dashboard/raffles/:id     → Edit / manage single raffle
/en/dashboard/orders          → Buyer list / checkout contacts
/en/dashboard/payouts         → Payout history

--- SHARED ---
/en/account                   → Profile settings (works in both modes)
/en/notifications             → Notification center (works in both modes)
```

### Phase 4 — AppShell Splitting

Two separate sidebar configs. The `AppShell` component reads `mode` from context and renders the correct one.

**Entrant sidebar:**

- Browse Raffles
- My Tickets
- My Wins
- Notifications
- Account
- [Switch to Hosting] (only shown if `canHost === true`)

**Host sidebar:**

- Dashboard
- My Raffles
- Orders
- Payouts
- Notifications
- Account
- [Switch to Entering] (only shown if `canEnter === true`)

### Phase 5 — Route Guard

```typescript
// src/components/ModeGuard.tsx
// If the route requires 'host' mode but user is in 'entrant' mode,
// silently switch mode and proceed (Option B behavior)
```

### Phase 6 — Login / Sign-up Entry Points

Landing page has two CTAs:

- “Browse Raffles” → `/en/login?mode=entrant`
- “Host a Raffle” → `/en/login?mode=host`

After auth: read `?mode` param → set `last_active_mode` → redirect to appropriate home route.

-----

## 6. SUMMARY TABLE

|Item                                                   |Status                |Action                                                     |
|-------------------------------------------------------|----------------------|-----------------------------------------------------------|
|`profiles.last_active_mode` column                     |❌ Missing             |ADD via migration                                          |
|Self-entry prevention in RPCs                          |❌ Missing             |ADD guard in `purchase_tickets` + `create_pending_checkout`|
|Raffles INSERT RLS role check                          |⚠️ Too loose           |TIGHTEN to host/both/admin                                 |
|Mode React context                                     |❌ Missing             |BUILD `ModeContext.tsx`                                    |
|Entrant-side pages (marketplace, detail, tickets, wins)|❌ Missing             |BUILD all 4                                                |
|Auth pages (login, signup with mode param)             |❌ Missing             |BUILD                                                      |
|Route guards (ModeGuard)                               |❌ Missing             |BUILD                                                      |
|AppShell mode switching                                |❌ Missing             |REFACTOR existing AppShell                                 |
|Host onboarding (empty state)                          |❌ Missing             |BUILD                                                      |
|`trustpilot_score` column                              |⚠️ Unused              |REMOVE or defer                                            |
|`entry_type: free_share/affiliate`                     |⚠️ Unused              |DEFER                                                      |
|`payment_provider: telebirr`                           |⚠️ Unimplemented       |DEFER                                                      |
|`visibility: private` UI                               |⚠️ DB ready, no UI     |DEFER                                                      |
|Subscription upgrade UI                                |⚠️ DB/math ready, no UI|DEFER                                                      |
|All draw/guarantee automation                          |✅ Complete            |Keep as-is                                                 |
|Admin foundation (6 RPCs)                              |✅ Complete            |Keep as-is                                                 |
|Checkout flow (Chapa)                                  |✅ Complete            |Keep as-is                                                 |
|Notification system                                    |✅ Complete            |Keep as-is                                                 |