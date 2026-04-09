# NexCart — Phase 1: Foundation & Multi-Role Auth

## Overview
**Duration:** 2 weeks (4 sprints)  
**Goal:** Multi-vendor marketplace scaffold with buyer/vendor/admin roles, Supabase schema, Sanity CMS integration, Zustand stores, design system, and CI/CD pipeline.

---

## Sprint Breakdown

### Sprint 1.1 — Project Scaffold & Design System (Days 1-2)
- Next.js 16 + TypeScript + Tailwind CSS 4
- Warm editorial design system (Playfair Display + DM Sans)
- Base UI components (different aesthetic from VaultFlow)
- ESLint + Prettier + Husky

### Sprint 1.2 — Supabase Schema & Auth (Days 3-5)
- Stores, products, categories, orders tables
- Multi-role auth (buyer, vendor, admin)
- Vendor application/approval workflow
- Row Level Security policies

### Sprint 1.3 — Sanity CMS & Content (Days 6-8)
- Sanity project setup + schemas
- Homepage banners, category pages, static content
- GROQ query utilities
- ISR for CMS content pages

### Sprint 1.4 — Route Guards & Shell (Days 9-10)
- Storefront layout (header, footer, nav)
- Vendor dashboard layout
- Admin layout
- Role-based middleware + guards
- GitHub Actions CI + Vercel deploy

---

## Tech Stack

```
next@16.x          react@19.x         typescript@5.7+
tailwindcss@4.x    zustand@5.x        framer-motion@12.x
@supabase/supabase-js@2.x             @supabase/ssr@0.5.x
next-sanity@9.x    @sanity/client@6.x  @sanity/image-url@1.x
lucide-react       clsx               tailwind-merge
```

---

## Initialization

```bash
npx create-next-app@latest nexcart \
  --typescript --tailwind --eslint \
  --app --src-dir --import-alias "@/*"

cd nexcart

npm install zustand @supabase/supabase-js @supabase/ssr \
  framer-motion clsx tailwind-merge lucide-react \
  next-sanity @sanity/client @sanity/image-url

npm install -D prettier eslint-config-prettier husky lint-staged
```

---

## Three User Roles

| Role | Access | How they get it |
|------|--------|-----------------|
| **Buyer** | Browse, cart, checkout, order history, reviews | Default on signup |
| **Vendor** | All buyer access + store management, products, orders, payouts | Apply → admin approves |
| **Admin** | Everything + user management, vendor approval, platform settings | Manually assigned |

---

## Environment Variables (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NexCart

# Stripe Connect (Phase 3)
# STRIPE_SECRET_KEY=
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```
