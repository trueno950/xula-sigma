# Fix review findings: migracion sectores a zonas

## Objective
Repair the four confirmed local-review findings in B3d while preserving the migration transaction and existing domicilio repointing behavior.

## Route
Delegated direct writer: mapping and writer triggers apply (the repair spans the migration script, rollback/test helpers, integration tests, and runbook). The user explicitly prohibits commits.

## Scope and constraints
- Do not modify the already-correct migration-header filename comment.
- Do not alter domicilio repointing or per-tenant commit behavior.
- Preserve the final FK `23503` safety net for unresolved calle blockers.

## Tasks
- [x] R1 — Propagated `baja_en` through source sectors, zones, deleted-place output, rollback parser/JSON/reinsert, runbook, and integration assertions.
- [x] R2 — Added deduplicated direct `calles.lugar_id` blocker detection into `calles_rechazadas`; emitted its JSON as a pre-delete NOTICE so failure output remains observable while FK `23503` still aborts.
- [x] R3 — Seeded independent Motul and Ticul trees and asserted both migration and tenant ownership.
- [x] R4 — Split the migration readers, rollback state/reversion/readers, test assertions, and scenario seeding into smaller topical helpers; all affected files are below 200 lines except rollback parser at 158 lines.

## Verification
- `pnpm db:local`: passed — migrations applied, roles provisioned.
- `pnpm test` (with DB env vars): passed — 318 test files, 1564 tests.
- `pnpm typecheck`: passed.
- Targeted `pnpm biome check` for all changed TypeScript files: passed.
- `git diff --check`: passed.
- `pnpm check`: failed on pre-existing project diagnostics and `.pi/gentle-ai/sdd-preflight.json` formatting, not on edited files.
- `pnpm reglas`: passed — 9 reglas y 2 metricas sobre 830 archivos, sin hallazgos.

## Next step
None. All verification complete; no source task remains pending.
