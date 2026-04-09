# Phase 6 Automation Runbook

This runbook turns the Phase 6 readiness, digest, and automation work into a deploy-ready operator workflow.

## Required Environment Variables

- `PLATFORM_AUTOMATION_SECRET`
  Use a strong shared secret for scheduled or external automation triggers.
- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`
- `ADMIN_DIGEST_EMAILS`
  Optional comma-separated admin digest recipients. If omitted, NexCart falls back to all admin profiles with valid emails.

## Digest Recipient Policy

### Vendor digests

- primary recipient: vendor account email
- optional secondary recipient: `stores.settings.supportEmail`

### Admin digests

- preferred source: `ADMIN_DIGEST_EMAILS`
- fallback: all admin profile emails in Supabase

## Schedule-Ready Endpoints

All secret-backed calls use:

```http
Authorization: Bearer <PLATFORM_AUTOMATION_SECRET>
```

### Preview automation state

```bash
curl -H "Authorization: Bearer $PLATFORM_AUTOMATION_SECRET" \
  "https://your-app.com/api/platform/automation"
```

### Run admin automation preview

```bash
curl -H "Authorization: Bearer $PLATFORM_AUTOMATION_SECRET" \
  "https://your-app.com/api/platform/automation?run=stale_dispute_reminder"
```

### Run and deliver the admin digest to policy recipients

```bash
curl -H "Authorization: Bearer $PLATFORM_AUTOMATION_SECRET" \
  "https://your-app.com/api/platform/automation?run=delay_digest&deliver=policy"
```

### Run a vendor digest for a specific owner and deliver to policy recipients

```bash
curl -H "Authorization: Bearer $PLATFORM_AUTOMATION_SECRET" \
  "https://your-app.com/api/platform/automation?audience=vendor&ownerId=<vendor-user-id>&run=delay_digest&deliver=policy"
```

## Export Handoff Examples

### Finance: lagging settlements

```bash
curl -L -H "Authorization: Bearer $PLATFORM_AUTOMATION_SECRET" \
  "https://your-app.com/api/platform/exports?kind=admin_payout_review&onlyFlagged=true&status=delivered&format=csv"
```

### Governance: SLA breaches only

```bash
curl -L -H "Authorization: Bearer $PLATFORM_AUTOMATION_SECRET" \
  "https://your-app.com/api/platform/exports?kind=dispute_queue&sla=breached&format=csv"
```

### Governance: aged moderation backlog

```bash
curl -L -H "Authorization: Bearer $PLATFORM_AUTOMATION_SECRET" \
  "https://your-app.com/api/platform/exports?kind=moderation_backlog&agedOnly=true&format=json"
```

## Suggested Scheduler Wiring

### Vercel Cron

Use one cron per high-value automation boundary:

- `delay_digest`
- `stale_dispute_reminder`
- `payout_lag_followup`
- `moderation_backlog_reminder`

Recommended pattern:

1. run the preview endpoint first
2. capture the JSON result in logs
3. enable `deliver=policy` only for digest jobs once email delivery is verified

### Other runners

Cloudflare Workers Cron, GitHub Actions, or a simple queue worker can call the same secret-backed routes.

## Daily Operator Routine

### Admin

1. review `/admin/dashboard`
2. open the automation ops panel
3. export `dispute_queue` with `sla=breached`
4. export `admin_payout_review` with `onlyFlagged=true`
5. run the digest boundary if backlog pressure is building

### Vendor

1. review `/vendor/settings`
2. inspect payout lag and finance anomalies
3. export `vendor_payout_review` for finance follow-up when settlement drifts
4. send the policy digest when support and owner inboxes both need the latest status
