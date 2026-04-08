# NexCart

A curated multi-vendor e-commerce marketplace built with Next.js, Supabase, Sanity CMS, and Stripe Connect.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS 4, Framer Motion, GSAP (Phase 2+)
- **State:** Zustand 5 (auth, cart, UI stores)
- **Database:** Supabase (PostgreSQL + Auth + Realtime + RLS + Storage)
- **CMS:** Sanity (homepage, banners, static pages)
- **Payments:** Stripe Connect split payments (Phase 3)
- **Fonts:** Playfair Display (serif display) + DM Sans (body)

## User Roles

| Role | Access |
|------|--------|
| **Buyer** | Browse, cart, checkout, order history, reviews, wishlist |
| **Vendor** | Buyer access + store management, products, orders, payouts |
| **Admin** | Everything + user management, vendor approval, platform settings |

## Quick Start

```bash
git clone https://github.com/yourusername/nexcart.git
cd nexcart && npm install
cp .env.example .env.local  # Fill in keys
# Paste supabase-schema.sql in Supabase SQL Editor
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/         # Login, signup
│   ├── (storefront)/   # Buyer-facing: shop, categories, product pages
│   ├── (vendor)/       # Vendor dashboard: products, orders, analytics
│   └── api/            # Auth callback, webhooks, Stripe
├── components/
│   ├── ui/             # Design system (editorial warm aesthetic)
│   ├── layout/         # Storefront header/footer, vendor sidebar
│   └── auth/           # Login/signup forms with role selector
├── stores/             # Zustand: auth, cart (persisted), UI
├── lib/
│   ├── supabase/       # DB clients + middleware
│   └── sanity/         # CMS client + GROQ queries
├── config/             # RBAC roles, navigation
└── types/              # TypeScript definitions
```

## Phases

- **Phase 1:** Auth, roles, schema, Sanity CMS, design system *(current)*
- **Phase 2:** Product catalog, search/filter, vendor dashboard
- **Phase 3:** Cart, checkout, Stripe Connect, order management
- **Phase 4:** Reviews, admin panel, SEO, performance

## License

MIT
