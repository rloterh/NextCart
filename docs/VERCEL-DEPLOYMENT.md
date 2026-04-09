# Vercel Deployment

This guide is the shortest reliable path to deploy NexCart on Vercel without losing the platform capabilities added across Phases 1 through 8.

## Project Settings

Use these Vercel defaults unless your team already has a stronger house standard:

- framework preset: `Next.js`
- root directory: repository root
- install command: `npm install`
- build command: `npm run build`
- output directory: leave empty for Next.js
- Node.js version: `20.x`

Also enable:

- Automatically expose System Environment Variables

That allows server-side fallbacks such as `VERCEL_PROJECT_PRODUCTION_URL` and `VERCEL_URL` to resolve correctly during deployment and runtime.

## Required Environment Variables

Add these in the Vercel project settings before the first production deploy:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `SANITY_API_TOKEN`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Add these when notification and automation features should be live:

- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`
- `NOTIFICATION_REPLY_TO_EMAIL`
- `ADMIN_DIGEST_EMAILS`
- `PLATFORM_AUTOMATION_SECRET`
- `CRON_SECRET`

Recommended:

- keep `PLATFORM_AUTOMATION_SECRET` and `CRON_SECRET` aligned unless your security policy prefers separate rotation
- use a production custom domain for `NEXT_PUBLIC_APP_URL`

## Database And Runtime Prerequisites

Before production rollout, apply the required SQL migrations in Supabase. Earlier phases introduced platform-critical schema for:

- orders and lifecycle states
- governance and disputes
- product slug constraints
- notification state persistence
- review feedback and moderation support

If those migrations are missing, the app may still build, but parts of vendor/admin operations will degrade or become unavailable at runtime.

## Stripe Setup

Configure the production webhook in Stripe to point at:

```text
https://<your-domain>/api/stripe/webhooks
```

The webhook secret belongs in:

```text
STRIPE_WEBHOOK_SECRET
```

## Automation And Cron Readiness

NexCart supports secret-backed automation endpoints that work well with Vercel Cron.

Recommended production runs:

- `/api/platform/automation?run=delay_digest&deliver=policy`
- `/api/platform/automation?run=stale_dispute_reminder`
- `/api/platform/automation?run=payout_lag_followup`
- `/api/platform/automation?run=moderation_backlog_reminder`

The automation route accepts:

- `PLATFORM_AUTOMATION_SECRET`
- `CRON_SECRET`

If you use Vercel Cron, set `CRON_SECRET` in Vercel so scheduled requests can authenticate cleanly.

## Post-Deploy Smoke Check

After the first production deployment:

1. open the storefront homepage
2. verify `/shop`, `/vendors`, and one live product page
3. verify `/login` and `/signup`
4. verify `/vendor/settings`
5. verify `/admin/dashboard`, `/admin/system`, and `/admin/access`
6. verify Stripe Connect onboarding starts from the vendor settings page
7. verify `/api/platform/readiness` reports expected production capability status
8. verify `/sitemap.xml` and `/robots.txt` use the production domain

## Useful References

- Vercel system environment variables:
  - https://vercel.com/docs/environment-variables/system-environment-variables
