param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("status", "check", "link", "new", "push", "pull")]
  [string]$Command,

  [Parameter(Position = 1)]
  [string]$Name
)

switch ($Command) {
  "status" {
    npm.cmd run supabase:status
    break
  }
  "check" {
    npm.cmd run supabase:check
    break
  }
  "link" {
    npm.cmd run supabase:link
    break
  }
  "new" {
    if (-not $Name) {
      throw "Usage: ./scripts/supabase.ps1 new <migration_name>"
    }

    npm.cmd run supabase:new -- $Name
    break
  }
  "push" {
    npm.cmd run supabase:push -- --confirm-prod
    break
  }
  "pull" {
    if (-not $Name) {
      throw "Usage: ./scripts/supabase.ps1 pull <migration_name>"
    }

    npm.cmd run supabase:pull -- $Name
    break
  }
}
