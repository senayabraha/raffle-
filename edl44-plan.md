# እድል44 — Full Platform Planning Document

*Reverse-engineered from raffall.com for build reference*

-----

## 1. What You Are Building

A **two-sided SaaS marketplace** for online prize competitions (raffles). The platform connects:

- **Hosts** — individuals, brands, influencers, charities, sports clubs who list a prize and sell tickets
- **Entrants** — the public who browse listings, buy tickets, and enter draws

The platform earns money by taking a **commission on every ticket sale**. It never owns prizes — it is a trusted intermediary that holds funds in escrow until prize delivery is confirmed.

The closest mental model: **Etsy for raffles**. Anyone can list. The public can discover and enter from a public marketplace directory.

-----

## 2. Core Design Philosophy (Build Around This)

These three principles are Raffall’s entire trust moat — they are also your system’s architectural constraints:

|Principle                        |What It Means Technically                                                                       |
|---------------------------------|------------------------------------------------------------------------------------------------|
|**Escrow-first payments**        |Ticket revenue is NEVER released to the host until winner confirms prize receipt                |
|**Host cannot influence draw**   |Random number generation must be fully automated and auditable — no host-side trigger           |
|**Platform guarantees the prize**|If host fails to deliver, platform pays out 75% of ticket revenue to winners from platform funds|

Every data model decision and every state machine transition flows from these three principles.

-----

## 3. Full Site Architecture Map

### 3.1 URL Structure (Modeled from Raffall)

```
/                            → Redirect to /en
/en                          → Homepage (marketing)
/en/host-raffle              → Host acquisition landing page
/en/features/hosts           → Detailed feature list for hosts
/en/features/entrants        → Feature list for entrants
/en/pricing                  → Subscription tier comparison
/en/terms-fees               → Commission & fee schedule (legal)
/en/get-started-lp           → Conversion LP (A/B variant)
/en/public-raffles/live      → Public raffle marketplace (browse)
/en/public-raffles/ended     → Past/ended raffles directory
/en/login                    → Auth
/en/register                 → Sign up
/en/dashboard                → Host dashboard (authenticated)
/en/dashboard/create         → Create new raffle
/en/dashboard/live           → Host's live raffles
/en/dashboard/ended          → Host's ended raffles
/en/dashboard/analytics      → Traffic, revenue, ticket stats
/en/dashboard/payouts        → Withdrawal management
/en/dashboard/campaigns      → Email campaign manager
/en/account                  → Profile & settings
/en/tickets                  → Entrant's ticket history (my tickets)

/{raffle-id}/enter-raffle-to-win-{slug}   → Individual raffle listing (public)
```

**Tech note:** The `meta-next-head-count` tag in Raffall’s page source confirms **Next.js**. The `/en/` prefix is Next.js internationalized routing (i18n). For your build with Vite+React, replicate the URL pattern manually via React Router.

-----

### 3.2 Page-by-Page Breakdown

#### Public / Marketing Pages

**Homepage (`/en`)**

- Hero: “Host raffles that give back / earn from your audience”
- Social proof bar: Trustpilot score, “approved by Facebook/Google/Apple”
- Dual CTA: [Host a Raffle] [Browse Raffles]
- Use-case segments: Creators → Brands → Charities → Sports clubs
- Case study numbers: Named hosts and their revenue figures
- How It Works: 3-step visual (Create → Share → Draw)
- Trust section: Escrow system diagram, RNG fairness, Raffall Guarantee
- FAQ accordion
- Footer: links, legal, social

**Public Raffle Marketplace (`/en/public-raffles/live`)**

- Grid/card layout of all active public raffles
- Each card: prize image, prize name, host name/avatar, ticket price, tickets sold / cap, draw date, entry button
- Filters: category, price range, draw date, host type (charity / individual / brand)
- Sort: newest, ending soon, most popular
- Search bar

**Individual Raffle Listing (`/{id}/enter-raffle-to-win-{slug}`)**

- Prize header: large image, prize title, host name + avatar + Trustpilot rating
- Ticket price, ticket cap, tickets sold (live counter), draw date countdown
- Ticket quantity selector with bundle options (“Buy 5 get 1 free”)
- Entry button → payment flow
- Live entrant list (publicly visible)
- About the host section
- Share buttons (social + unique referral link)
- Promo code input
- Raffall Guarantee badge
- Comments / Q&A section

#### Host Dashboard (Authenticated)

**Create Raffle wizard steps:**

1. Prize details (title, description, images, category)
1. Ticket settings (price, cap or unlimited, bundle deals)
1. Draw settings (draw date or “when sold out”, min ticket threshold)
1. Charity donation split (optional %)
1. Promotion settings (affiliate %, promo codes, featured listing)
1. Visibility (public marketplace or private link only)
1. Review & publish

**Live Raffle Dashboard:**

- Real-time ticket sales counter
- Revenue meter (escrowed)
- Traffic sources chart
- Entrant list
- Share tools: unique URL, QR code generator, email campaign trigger
- Live stream embed option
- Edit / extend draw date controls

**Ended Raffle Panel:**

- Winner(s) displayed with contact info
- “Confirm prize” action (7-day timer)
- Options: Prize as advertised / Modified prize / Revoke (triggers guarantee payout)
- Withdrawal request button (unlocked after winner confirms receipt)

**Analytics Dashboard:**

- Per-raffle stats: page views, ticket conversion rate, revenue
- Time-series charts: daily sales
- Traffic source breakdown (direct / social / affiliate / email campaign)
- Affiliate performance table

-----

## 4. Data Model (Core Tables)

### users

```
id              uuid PK
email           text unique
full_name       text
avatar_url      text
role            enum('host', 'entrant', 'both', 'admin')
stripe_account_id  text           -- host payout account
stripe_customer_id text           -- entrant billing
subscription_tier  enum('basic', 'premium', 'pro')  default 'basic'
trustpilot_score   decimal
created_at      timestamptz
```

### raffles

```
id                  uuid PK
host_id             uuid FK → users
title               text
slug                text unique
description         text
category            text
status              enum('draft', 'live', 'ended', 'cancelled')
visibility          enum('public', 'private')
ticket_price        decimal
ticket_cap          integer nullable       -- null = unlimited
tickets_sold_count  integer default 0
bundle_rules        jsonb                  -- [{"buy":5,"free":1}]
draw_type           enum('date', 'soldout', 'hybrid')
draw_date           timestamptz nullable
min_ticket_target   integer nullable
charity_id          uuid FK nullable → charities
charity_percent     decimal default 0
affiliate_percent   decimal default 0
featured_until      timestamptz nullable
prize_confirmed_at  timestamptz nullable
prize_status        enum('pending','confirmed','revoked','disputed') default 'pending'
revenue_released_at timestamptz nullable
created_at          timestamptz
updated_at          timestamptz
```

### tickets

```
id              uuid PK
raffle_id       uuid FK → raffles
entrant_id      uuid FK → users
ticket_number   integer              -- sequential within raffle
entry_type      enum('paid','free_share','free_bonus','affiliate')
payment_id      uuid FK → payments nullable
promo_code_id   uuid FK nullable → promo_codes
affiliate_id    uuid FK nullable → users
geo_region      text                 -- 'UK', 'US', etc.
created_at      timestamptz
```

### payments

```
id                  uuid PK
raffle_id           uuid FK → raffles
payer_id            uuid FK → users
amount_gross        decimal
platform_commission decimal
host_net            decimal
affiliate_share     decimal default 0
charity_share       decimal default 0
stripe_payment_id   text
status              enum('held','released','refunded','compensated')
created_at          timestamptz
```

### winners

```
id              uuid PK
raffle_id       uuid FK → raffles
ticket_id       uuid FK → tickets
winner_id       uuid FK → users
notified_at     timestamptz
claim_deadline  timestamptz      -- winner has 21 days to accept/dispute
accepted_at     timestamptz nullable
disputed_at     timestamptz nullable
prize_status    enum('awaiting_claim','claimed','accepted','disputed','compensated')
```

### payouts

```
id              uuid PK
host_id         uuid FK → users
raffle_id       uuid FK → raffles
amount          decimal
type            enum('host_revenue','charity','affiliate','winner_compensation')
stripe_transfer_id text
status          enum('pending','processed','failed')
created_at      timestamptz
```

### promo_codes

```
id              uuid PK
raffle_id       uuid FK → raffles
code            text
discount_type   enum('percent','fixed','free_tickets')
discount_value  decimal
max_uses        integer nullable
uses_count      integer default 0
expires_at      timestamptz nullable
```

### affiliates

```
id              uuid PK
raffle_id       uuid FK → raffles
affiliate_id    uuid FK → users
unique_link     text
tickets_sold    integer default 0
commission_earned decimal default 0
```

### charities

```
id              uuid PK
name            text
registration_number text
verified        boolean
logo_url        text
description     text
```

### campaigns (email)

```
id              uuid PK
host_id         uuid FK → users
raffle_id       uuid FK → raffles
subject         text
body_html       text
recipient_count integer
sent_at         timestamptz nullable
status          enum('draft','sent','scheduled')
```

-----

## 5. Raffle State Machine

This is the most critical logic in the entire system. Every state transition has money implications.

```
DRAFT
  └─► LIVE (host publishes)
        ├─► LIVE (tickets selling, countdown active)
        │     ├─► draw_date reached OR tickets_sold = cap
        │     │       └─► DRAW_PENDING
        │     │                 └─► ENDED (automated RNG draw fires)
        │     │                        ├─► host must confirm prize (7 day timer)
        │     │                        │     ├─► PRIZE_CONFIRMED
        │     │                        │     │       ├─► winner accepts → REVENUE_RELEASED (host paid)
        │     │                        │     │       └─► winner disputes → DISPUTE_OPEN
        │     │                        │     │                └─► resolved → REVENUE_RELEASED or COMPENSATED
        │     │                        │     └─► host fails to confirm (7 days expire) → PRIZE_REVOKED
        │     │                        │               └─► winner auto-receives 75% → COMPENSATED
        │     │                        └─► host manually revokes prize → PRIZE_REVOKED
        └─► CANCELLED (before any tickets sold)
```

**Key timers:**

- Host must confirm prize: **7 days** after draw
- Winner must accept/dispute: **21 days** after notification
- If winner takes no action: prize auto-accepted

-----

## 6. Money Flow Architecture

```
Entrant pays £10 for ticket
        │
        ▼
Stripe holds £10 in platform escrow
        │
        ├── Platform commission cut: 10–15% = £1.00–£1.50
        ├── Affiliate share (if enabled): e.g. 5% = £0.50
        ├── Charity share (if enabled): e.g. 10% = £1.00
        └── Host net: ~£7.00–£8.50
        
        All held until winner confirms receipt
        │
        ▼
Winner confirms prize received
        │
        ▼
Platform releases host net to Stripe Connect payout
Platform sends charity % to charity account
Platform sends affiliate % to affiliate account
        
--- FAILURE SCENARIO ---
Host fails to deliver / confirm (7 days)
        │
        ▼
Platform pays winners 75% of GROSS ticket revenue
(paid FROM platform — this is the guarantee)
Host receives NOTHING
Affiliates still receive their commission
```

**Payment processor note:** You MUST use a payment processor that supports **marketplace escrow and split payouts** — Stripe Connect (Express or Standard) is the standard choice. Regular Stripe won’t hold funds on your behalf.

-----

## 7. Promotional & Marketing Feature Set

These are all the tools Raffall provides hosts to drive ticket sales:

|Feature              |Description                                     |Priority     |
|---------------------|------------------------------------------------|-------------|
|Unique raffle URL    |Shareable link per raffle, SEO slug             |MVP          |
|Promo codes          |% off, fixed off, or extra free tickets         |MVP          |
|Share-for-free-ticket|Entrant gets 1 free ticket for sharing on social|MVP          |
|QR code generator    |Downloadable QR pointing to raffle page         |V2           |
|Affiliate system     |Unique tracking links, commission cut on sales  |V2           |
|Email campaigns      |Host sends bulk emails to past entrants         |V2           |
|Auto-retargeting     |Automated email to non-converting visitors      |V3 (Pro only)|
|Featured listing     |Paid boost — raffle appears top of marketplace  |V2           |
|Live streaming embed |Host streams the draw live                      |V3           |
|Bonus draw           |Monthly bonus draw for all entrants             |V2           |
|Multi-language       |Auto-translate raffle page                      |V3 (Pro only)|

-----

## 8. Subscription Tiers (Modeled from Raffall)

|Tier       |Price                 |Commission       |Live Raffles|Key Extras                                           |
|-----------|----------------------|-----------------|------------|-----------------------------------------------------|
|**Basic**  |Free                  |15% (10% charity)|1 at a time |Core creation tools                                  |
|**Premium**|£8/mo (billed yearly) |10% (9% charity) |3 at a time |Email campaigns, QR codes                            |
|**Pro**    |£83/mo (billed yearly)|10% (9% charity) |10 at a time|Auto-translate, account manager, 50% off feature fees|

**Additional paid add-ons (on top of subscription):**

- Featured listing fee (based on ticket cap × price × duration)
- Email invite fee (per campaign send)
- Auto-retargeting fee (Pro gets 50% off)

-----

## 9. Entrant-Side Features

Often overlooked in planning — the entrant UX is what drives volume:

- Browse public marketplace with search + filters
- View individual raffle with live ticket counter
- Buy tickets (multiple, bundles)
- Get free ticket for sharing raffle on social media
- Apply promo code at checkout
- View all their tickets in “My Tickets” dashboard
- Receive automated email after draw
- Claim / accept / dispute prize from My Tickets page
- Receive 75% compensation payout if host fails
- Bonus draw entries (separate monthly prize pool)
- Guest checkout option (no account required to enter)

-----

## 10. Compliance & Legal Layer

This is often what kills raffle platforms — you must bake this in from day one:

|Requirement           |Implementation                                                                                                |
|----------------------|--------------------------------------------------------------------------------------------------------------|
|Gambling Act 2005 (UK)|Prize competitions must have a “skill” element OR be free entry → Raffall solves with free postal entry option|
|US sweepstake laws    |No purchase necessary in many states → Raffall’s token + skill game system                                    |
|GDPR / data privacy   |Consent at registration, cookie policy, data export                                                           |
|Payment compliance    |Stripe’s KYC for host payouts (Stripe handles most of this)                                                   |
|Age verification      |18+ gate on entry                                                                                             |
|RNG auditability      |Log every draw with seed/timestamp for dispute evidence                                                       |
|VAT (UK)              |Platform commission is subject to VAT; Raffall has specific VAT docs for hosts                                |

**For Ethiopia/Addis Ababa context:** Ethiopian law doesn’t have the same sweepstake distinctions as UK/US. You’d likely operate under a simpler model — just confirm with a local lawyer what constitutes a legal prize draw vs lottery in Ethiopia, and whether a platform license is required.

-----

## 11. Build Phases (Recommended Sequence)

### Phase 0 — Foundation (Weeks 1–3)

- Supabase schema: users, raffles, tickets, payments, winners, payouts
- Auth (email + Google OAuth)
- Stripe Connect setup (escrow + split payouts)
- Basic raffle CRUD (host side)
- Public listing page (single raffle)

### Phase 1 — MVP (Weeks 4–7)

- Public marketplace directory
- Ticket purchase flow (Stripe checkout)
- Automated draw (RNG cron job)
- Winner notification (email)
- Host prize confirmation flow (7-day timer)
- Winner accept/dispute flow (21-day timer)
- Host withdrawal after prize confirmed
- Raffall Guarantee payout logic (75% to winner on failure)

### Phase 2 — Growth Tools (Weeks 8–12)

- Promo codes
- Share-for-free-ticket referral
- Affiliate tracking links + commission
- QR code generator
- Email campaign builder
- Featured listing (paid boost)
- Host analytics dashboard
- Subscription billing (Basic/Premium/Pro via Stripe Billing)

### Phase 3 — Polish & Scale (Weeks 13+)

- Bonus draw (monthly pool)
- Auto-retargeting emails
- Live stream embed
- Multi-language (i18n)
- Mobile app (React Native)
- Admin dashboard (moderation, payouts oversight, dispute arbitration)

-----

## 12. Tech Stack Recommendation

Given your existing Zembil Market stack:

|Layer         |Technology                                                       |
|--------------|-----------------------------------------------------------------|
|Frontend      |React + TypeScript + Vite + Tailwind (consistent with Zembil)    |
|Routing       |React Router v6 (locale prefix: `/en/`)                          |
|Backend / DB  |Supabase (PostgreSQL + Row Level Security + Edge Functions)      |
|Auth          |Supabase Auth                                                    |
|Payments      |Stripe Connect (Express accounts for host payouts)               |
|File storage  |Supabase Storage (prize images)                                  |
|Email         |Resend or SendGrid (transactional + campaigns)                   |
|RNG draw      |Supabase Edge Function (cron-triggered, cryptographically random)|
|Cron jobs     |Supabase pg_cron (draw triggers, timer expirations)              |
|Deployment    |Vercel                                                           |
|Mobile (later)|React Native + Expo (same Supabase backend)                      |

-----

## 13. Key Supabase Functions to Plan

```
createRaffle(hostId, raffleData) → raffles row
publishRaffle(raffleId) → status: draft → live
purchaseTickets(raffleId, entrantId, qty, promoCode?) → tickets[] + payment
triggerDraw(raffleId) → winners[] (RNG, atomic)
confirmPrize(raffleId, hostId, prizeStatus) → winners updated, timer set
acceptPrize(winnerId) → payment released to host
disputePrize(winnerId, reason) → dispute opened
resolveDispute(winnerId, outcome) → payment or compensation
withdrawRevenue(hostId, raffleId) → payout row + Stripe transfer
applyPromoCode(code, raffleId) → discount details
generateAffiliateLink(raffleId, affiliateId) → unique URL
trackAffiliateClick(linkId) → session cookie
```

-----

## 14. Differentiation Opportunities vs Raffall

Places you can beat Raffall for your market:

|Opportunity                  |Detail                                                                                    |
|-----------------------------|------------------------------------------------------------------------------------------|
|**Ethiopia-first**           |ETB currency, Chapa/Telebirr payment integration (not just Stripe)                        |
|**Mobile-first UX**          |Most Ethiopian internet usage is mobile; optimize draw flow for low-bandwidth             |
|**WhatsApp/Telegram sharing**|More relevant than Facebook/Twitter for Ethiopian audience                                |
|**Lower commission**         |Raffall takes 10–15%; starting at 8% could win hosts                                      |
|**Charity-first branding**   |Partner with well-known Ethiopian NGOs for trust                                          |
|**Simpler tiers**            |One flat commission + optional premium features, less confusing than Raffall’s add-on fees|
|**Faster payout**            |Raffall payouts can be slow; same-day payout post-confirmation is a differentiator        |

-----

*Document generated June 2026 — based on reverse engineering raffall.com*