NPM ?= npm

.PHONY: supabase-status supabase-check supabase-link supabase-new supabase-push supabase-pull

supabase-status:
	$(NPM) run supabase:status

supabase-check:
	$(NPM) run supabase:check

supabase-link:
	$(NPM) run supabase:link

supabase-new:
ifndef name
	$(error Usage: make supabase-new name=add_vendor_limits)
endif
	$(NPM) run supabase:new -- $(name)

supabase-push:
	$(NPM) run supabase:push -- --confirm-prod

supabase-pull:
ifndef name
	$(error Usage: make supabase-pull name=sync_manual_prod_change)
endif
	$(NPM) run supabase:pull -- $(name)
