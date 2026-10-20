# Forwards Stripe test-mode webhooks to the local API, using STRIPE_SECRET_KEY
# from .env.local (so it always targets the same Stripe account as the API).
#   .\scripts\stripe-listen.ps1
$envFile = Join-Path $PSScriptRoot '..\.env.local'
$line = Get-Content $envFile | Where-Object { $_ -match '^STRIPE_SECRET_KEY=' } | Select-Object -First 1
if (-not $line) { throw 'STRIPE_SECRET_KEY not found in .env.local' }
$key = ($line -replace '^STRIPE_SECRET_KEY=', '').Trim('"', "'", ' ')

stripe listen --api-key $key `
  --events checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed `
  --forward-to localhost:4000/stripe/webhook
