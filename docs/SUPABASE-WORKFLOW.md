# Supabase Workflow

Use this repo's tracked `supabase/` directory as the source of truth for database changes.

## Setup

1. Copy `.env.supabase.example` to `.env.supabase.local`.
2. Fill in `SUPABASE_PROD_DB_PASSWORD`.

## Commands

```bash
npm run supabase:status
npm run supabase:new -- add_vendor_payout_hold
npm run supabase:check
npm run supabase:link
npm run supabase:push -- --confirm-prod
npm run supabase:pull -- sync_manual_prod_change
```

## Shortcuts

Optional wrappers are available if you prefer shorter commands.

`Makefile` examples:

```bash
make supabase-status
make supabase-check
make supabase-link
make supabase-new name=add_vendor_payout_hold
make supabase-push
make supabase-pull name=sync_manual_prod_change
```

PowerShell examples:

```powershell
./scripts/supabase.ps1 status
./scripts/supabase.ps1 check
./scripts/supabase.ps1 link
./scripts/supabase.ps1 new add_vendor_payout_hold
./scripts/supabase.ps1 push
./scripts/supabase.ps1 pull sync_manual_prod_change
```

Notes:

- `make` is optional and may not be installed on every Windows machine.
- If PowerShell blocks local scripts, you can still use the npm commands directly.
- These wrappers do not bypass any production safety checks; they delegate to the npm workflow.

## Recommended flow

1. Create a local migration with `npm run supabase:new -- <name>`.
2. Edit the generated SQL in `supabase/migrations`.
3. Run `npm run supabase:check`.
4. Push the tracked migration to production with `npm run supabase:push -- --confirm-prod`.
5. Validate the schema and app behavior after the push.

## Pulling remote changes

Use `db pull` only when the remote project was changed outside the repo and you need to reconcile that change back into version control.

Example:

```bash
npm run supabase:pull -- sync_manual_prod_change
```

That creates a new tracked migration file based on the current remote state.

## Production safety

- Production pushes require the explicit `--confirm-prod` flag.
- In CI, production mutation commands also require `SUPABASE_ALLOW_PROD=true`.
- The helper script links the repo to the production project before each operation so you do not accidentally use stale local linkage.
- Keep production-only hotfixes rare. Prefer migration-first changes from the repo.
