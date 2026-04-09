# NexCart Enterprise Expansion Roadmap

## Vision

NexCart should evolve from a strong multi-vendor marketplace prototype into a premium marketplace platform with:

- confident buyer discovery and post-purchase flows
- operationally credible vendor tooling
- trustworthy admin moderation and controls
- polished, editorial, premium UX
- clear architecture and maintainable data boundaries

This roadmap preserves the warm editorial visual identity while elevating the platform into a more complete product.

## Guiding Principles

- preserve and strengthen existing architecture where it is already sound
- complete implied features before adding speculative complexity
- prefer explicit state ownership and server-safe data flows
- improve trust, clarity, and operational confidence across every role
- ship features with premium UX states, keyboard usability, and disciplined motion

## Phase 1: Experience And Operations Foundation

### Objective

Complete the most obvious gaps already implied by the current product and route structure.

### Major Features

- authenticated account menu with logout and role-aware shortcuts
- visible toast/notification surface
- buyer account home
- buyer wishlist experience
- vendor settings and Stripe onboarding status
- vendor product edit flow
- vendor product action menu
- admin product moderation page

### Sprint Breakdown

#### Sprint 1A: Account And Session Experience

- add toast viewport
- add auth/account dropdown menu
- wire logout
- build `/account` landing page
- add role-aware shortcuts for buyer, vendor, admin

#### Sprint 1B: Wishlist And Saved Commerce

- build `/account/wishlist`
- wire product-card and product-detail wishlist actions
- add empty states and remove flows
- preserve buyer-only access controls

#### Sprint 1C: Vendor Operations Completion

- build `/vendor/settings`
- surface vendor approval and Stripe connection state
- support store profile/settings updates
- build `/vendor/products/[id]`
- add product lifecycle actions from product list

#### Sprint 1D: Admin Moderation Completion

- build `/admin/products`
- search/filter products across stores
- moderate status and featured state
- add polished operational state handling

### Suggested Branch

- `feature/experience-ops-foundation`

### Suggested Commits

- define enterprise expansion roadmap
- complete account session and notification surfaces
- add buyer wishlist and account hub
- complete vendor settings and product operations
- add admin product moderation tools

## Phase 2: Marketplace Trust, Merchandising, And Conversion

### Objective

Increase marketplace quality, merchandising power, and conversion confidence.

### Major Features

- richer homepage merchandising blocks
- featured collections and editorial CMS modules
- saved searches and recently viewed products
- richer product comparison and related recommendations
- better checkout trust surfaces and order communication
- vendor quality badges and trust signals

### Sprint Breakdown

#### Sprint 2A: Merchandising Framework

- homepage composition modules in Sanity
- featured vendor and seasonal collection rails
- curated category landing sections

#### Sprint 2B: Buyer Discovery Enhancements

- saved searches
- recently viewed products
- improved faceting and sort affordances
- product comparison shortlist

#### Sprint 2C: Conversion Confidence

- shipping and returns detail surfaces
- clearer order/payment timeline
- better review summaries and recommendation cues
- polish empty/loading/error states on commerce surfaces

#### Sprint 2D: Vendor Trust Surfaces

- vendor profile enrichment
- quality badges
- shipping/returns policy display
- store profile storytelling sections

### Suggested Branch

- `feature/merchandising-trust-conversion`

## Phase 3: Vendor Growth And Operational Depth

### Objective

Make NexCart feel viable for serious vendors, not just casual listing management.

### Major Features

- inventory controls and low-stock awareness
- richer order workflow and fulfillment states
- payouts visibility
- customer notes and internal order notes
- vendor analytics uplift
- bulk product operations

### Sprint Breakdown

#### Sprint 3A: Catalog Operations

- bulk publish/pause/archive
- inventory edits
- duplicate product flow
- variant management improvements

#### Sprint 3B: Fulfillment Workflow

- richer shipping/tracking handling
- customer communication notes
- internal order notes
- fulfillment timeline state

#### Sprint 3C: Payouts And Finance

- payouts overview
- settlement visibility
- fee breakdown history
- Stripe account health indicators

#### Sprint 3D: Analytics Uplift

- more credible charting and periods
- top category and conversion metrics
- performance summaries
- improved export-ready operational views

### Suggested Branch

- `feature/vendor-growth-operations`

## Phase 4: Admin Governance, Risk, And Marketplace Health

### Objective

Turn the admin side into a real governance console.

### Major Features

- moderation queue
- vendor health overview
- dispute/refund workflow foundations
- audit trail surfaces
- risk flags and policy actions
- admin product/store/user operational detail screens

### Sprint Breakdown

#### Sprint 4A: Moderation Queue

- unified queue for products, vendors, reviews
- pending issue counts
- faster approve/reject flows

#### Sprint 4B: Risk And Governance

- policy notes
- suspension reasons
- admin action log surfaces
- visibility controls

#### Sprint 4C: Disputes And Refund Foundations

- refund request status model
- customer issue tracking
- admin/vendor resolution states

#### Sprint 4D: Marketplace Health Dashboard

- platform health KPIs
- vendor health/risk scoring basics
- operational backlog insights

### Suggested Branch

- `feature/admin-governance-console`

## Phase 5: Enterprise Polish, Reliability, And Delight

### Objective

Bring the whole platform to a higher bar for polish, reliability, and perceived quality.

### Major Features

- stronger design token consistency
- motion system standardization
- image optimization rollout
- lint and type quality uplift
- observability and notification groundwork
- premium micro-interactions and skeleton system

### Sprint Breakdown

#### Sprint 5A: Design System Hardening

- unify cards, badges, tables, empty states
- status badge system
- consistent spacing and typography scale

#### Sprint 5B: Motion And States

- restrained shared transition patterns
- reduced-motion handling
- better skeleton/loading surfaces

#### Sprint 5C: Technical Quality

- remove dead imports and leftovers
- reduce `any` usage
- improve server/client boundaries
- tighten route and component typing

#### Sprint 5D: Reliability And Observability

- notification/event scaffolding
- structured error reporting hooks
- environment validation
- operational readiness checklist

### Suggested Branch

- `feature/platform-polish-reliability`

## Phase 6: Launch Readiness, Automation, And Scale

### Objective

Make NexCart feel operationally launch-ready by tightening runtime safety, surfacing platform readiness clearly, and laying disciplined foundations for event-driven automation.

### Major Features

- environment and runtime validation across critical platform boundaries
- platform readiness surfaces for admin and vendor operators
- marketplace event scaffolding for orders, disputes, moderation, and payouts
- clearer configuration failure messaging in critical payment and governance workflows
- automation-ready notification foundations without premature infrastructure sprawl

### Sprint Breakdown

#### Sprint 6A: Operational Readiness Foundation

- validate Stripe, Supabase, Sanity, and public app configuration more explicitly
- add admin and vendor launch-readiness visibility
- create a shared marketplace event model for future notification channels
- harden critical payment, payout, and privileged workflow error handling

#### Sprint 6B: Notification Delivery Foundations

- in-app event inbox groundwork
- email-ready template boundaries
- audience/channel mapping for marketplace events
- clearer escalation paths for failures and delayed operations

#### Sprint 6C: Launch Safety And Recovery

- stronger degraded-mode and fallback handling
- readiness checklist coverage for launch-critical surfaces
- safer startup diagnostics and operational messaging
- recovery guidance for missing configuration or broken integrations

#### Sprint 6D: Scale And Automation Extensions

- scheduled operational jobs and reminders groundwork
- export and handoff readiness for finance and governance teams
- richer automation around settlement, moderation, and dispute follow-up
- scaling-oriented runbook and checklist coverage

### Suggested Branch

- `feature/launch-readiness-automation`

## Phase 7: Security, Observability, And Incident Readiness

### Objective

Make NexCart easier to operate safely in production by adding clearer diagnostics, request tracing, system-health visibility, and incident-ready operational surfaces.

### Major Features

- request tracing and response correlation across critical operational routes
- admin-visible system diagnostics and production health summaries
- stronger operational error envelopes for support and incident review
- deploy-ready runbook patterns for diagnostics and escalation
- security-minded visibility into capability blocks without exposing secrets

### Sprint Breakdown

#### Sprint 7A: Diagnostics And Tracing Foundation

- shared request trace helpers for critical platform APIs
- admin system diagnostics page
- unified system-health payload for readiness and automation posture
- clearer support-facing request correlation for degraded flows

#### Sprint 7B: Incident And Support Operations

- incident-ready support handoff surfaces
- richer failure categorization and operator guidance
- workflow links from diagnostics into the right admin queues

#### Sprint 7C: Security And Compliance Visibility

- privileged workflow visibility and review checkpoints
- safer operational guardrails around sensitive admin actions
- policy/readiness visibility for production operations

### Suggested Branch

- `feature/security-observability-readiness`

## Notes On Unfinished Existing Signals

These should be treated as intentional completion targets unless product direction changes:

- account menu and logout
- wishlist route and saved buyer flows
- vendor settings route
- vendor product detail/edit route
- admin products moderation page
- richer action affordances in vendor/admin tables

## Cleanup Policy

- delete dead imports only when confirmed not part of an immediate feature follow-up
- preserve unfinished affordances when they are being actively completed in the current phase
- avoid broad lint-only churn outside the currently touched feature area
