# NexCart — Phase 2: Product Catalog, Search & Vendor Dashboard

## Overview
**Duration:** 2 weeks (4 sprints)  
**Goal:** Full product catalog with faceted search/filter, vendor product CRUD with image upload, vendor analytics dashboard, category browsing, and storefront animations.

---

## Sprint Breakdown

### Sprint 2.1 — Product Queries & Shop Page (Days 1-3)
- Server-side product query functions (search, filter, sort, paginate)
- Shop page with product grid, sidebar filters, sort dropdown
- Category page with breadcrumbs
- Product detail page with image gallery, variants, add-to-cart

### Sprint 2.2 — Vendor Product Management (Days 4-6)
- Product list with DataTable (status filter, search)
- Create/edit product form (multi-step: details, images, pricing, variants)
- Image upload to Supabase Storage
- Product status workflow (draft → active → paused → archived)

### Sprint 2.3 — Vendor Analytics & Dashboard (Days 7-9)
- Revenue chart (Recharts area)
- Order + view metrics
- Top products by sales
- Store performance KPIs

### Sprint 2.4 — Storefront Polish & Animations (Days 10-14)
- GSAP scroll animations on homepage
- Product card hover micro-interactions
- Category grid with stagger animations
- Vendors listing page
- Loading skeletons for all data pages

---

## New Dependencies

```bash
npm install recharts gsap
```
