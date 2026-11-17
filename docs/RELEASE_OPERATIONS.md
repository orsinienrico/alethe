# Release operations

Production: GitHub Actions Direct Upload, main branch only. Add repository secrets CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID once; token needs Pages Edit and D1 Edit for the intended account. Never expose token in chat, code, artifacts or logs. The workflow provisions alethe and alethe-db automatically, applies migrations, deploys and checks homepage and health. New D1 uses EU jurisdiction. Existing Git-integrated Pages projects are not overwritten. No deployment previews use production D1.

Routine: create branch, implement, run checks, open PR; review validation; merge and inspect production workflow and health. Roll back in Cloudflare deployment history if necessary; plan backward-compatible DB migrations. Before wide release: authoritative scoring, abuse controls, verification and recovery, privacy review; Stripe is a stub.
