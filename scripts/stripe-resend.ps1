# Re-sends Stripe events to the running `stripe listen` (same key as the API).
#   .\scripts\stripe-resend.ps1 evt_123 evt_456
$envFile = Join-Path $PSScriptRoot '..\.env.local'
$line = Get-Content $envFile | Where-Object { $_ -match '^STRIPE_SECRET_KEY=' } | Select-Object -First 1
$key = ($line -replace '^STRIPE_SECRET_KEY=', '').Trim('"', "'", ' ')

foreach ($id in $args) {
  stripe events resend $id --api-key $key
}
