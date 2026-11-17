# Release operations

Production owner: repository owner. Product development via chat; all changes use dedicated branches and pull requests. Keep main deployable. Cloudflare Pages Git integration is the deployment mechanism; no permanent API token is required for ordinary releases.

## First setup
1. Create D1 database alethe-db in the intended Cloudflare account; provide its non-secret UUID and apply migrations/0001_init.sql. Keep preview data separate from production.
2. Replace the placeholder database_id in wrangler.toml. Import this repository as a Pages project named alethe: production main, build npm run build, output dist. Confirm binding DB. Do not enable preview deployments that use production D1.
3. Verify Cloudflare deployment result and GET /api/health, home page, game, real auth and scores; ensure README, wrangler.toml and migrations are not served as assets. Test service worker upgrades.
4. Before public rollout, add server-authoritative scoring, abuse protection, email verification/account recovery and review privacy; checkout remains a stub. Never store secrets in source.

## Routine
Create branch, implement, run npm test, open PR; build/preview and smoke test, merge and inspect production deployment. Roll back from Cloudflare deployment history if needed; database schema changes require a separate reversible migration plan.
