# Archive Report: reportes-ciudadanos

**Date Archived**: 2026-09-03  
**Change Name**: `reportes-ciudadanos`  
**Mode**: OpenSpec  
**Status**: CLOSED — All phases complete, all artifacts synced, change ready for operational use

---

## Executive Summary

The `reportes-ciudadanos` SDD change has been fully implemented, verified, and archived. All 119 implementation tasks are complete, all specifications have been merged into the main spec repository, and the verification report confirms PASS with zero critical findings and zero warnings. The change is ready for deployment.

---

## Specs Merged into Main Specs

The following delta specifications have been synced into `openspec/specs/` (the source of truth):

| Domain | Action | Details |
|--------|--------|---------|
| `autenticacion-municipal` | **Modified** | Added clarification that rate-limiting covers both constancia AND reporte folio validation using the same `"folio"` type and key. Added new scenario: "Consultar constancias y reportes desde el mismo origen comparte cuota". 1 requirement modified, 3 scenarios now (was 2). |
| `autorizacion-roles` | **Added** | New requirement: "Regla de autorizacion para administrar reportes ciudadanos" (`puedeAdministrarReportes`). Authorizes only `ADMIN_MUNICIPAL` to change report state and assign area. 1 new requirement, 5 new scenarios. |
| `jerarquia-territorial` | **Added** | New requirement: "Ubicacion compuesta como texto para un reporte ciudadano". Exposes a read-only case use to compose report location from `lugarId`+optional `calleId` with validation. 1 new requirement, 4 new scenarios. |
| `consulta-publica-de-reportes` | **Created** | Entirely new spec (no pre-existing). Public, unauthenticated case use for citizens to query report status by folio. No personal data exposed; duplicates return original state + own registration date. 5 requirements, 7 scenarios. |
| `reportes-ciudadanos` | **Created** | Entirely new spec (no pre-existing). Core reporting module: folio generation, closed taxonomy of incident types, state machine (no reopening), optional person linkage, area assignment, duplicate linking, audit trail, and isolation by municipality. 15 requirements, 24 scenarios. |

**Total**: 5 delta specs merged; 23 requirements across all 5; 43 scenarios total.

---

## Archive Location

```
openspec/changes/archive/2026-09-03-reportes-ciudadanos/
├── proposal.md              (495 lines — scope, rationale, rollback plan)
├── design.md                (1593 lines — 15 numbered decisions)
├── exploration.md           (22306 bytes — research notes)
├── tasks.md                 (119 tasks, 100% complete ✅)
├── verify-report.md         (153 lines — PASS, 0 critical, 0 warnings)
├── archive-report.md        (this file)
└── specs/
    ├── autenticacion-municipal/spec.md
    ├── autorizacion-roles/spec.md
    ├── consulta-publica-de-reportes/spec.md
    ├── jerarquia-territorial/spec.md
    └── reportes-ciudadanos/spec.md
```

---

## Task Completion

**Status**: 119 / 119 tasks complete ✅

All 8 implementation phases marked done:
- Phase 1: Data model, isolation, folio generation ✅
- Phase 2: Folio locking, landing page navigation ✅
- Phase 3: Domain and use cases, state machine ✅
- Phase 4: Public query interface, rate limiting ✅
- Phase 5: Admin state transitions, area assignment ✅
- Phase 6: Duplicate linking, one-hop resolution ✅
- Phase 7: UI, search suggestions, follow-up fix (asignarArea concurrency guard) ✅
- Phase 8: Export, cleanup, final verification ✅

Tasks checked against `main` branch at commit `4cd1fdd` (merge of PR #54, containing the follow-up fix for the prior verification's sole WARNING about `asignarArea` race condition).

---

## Verification Summary

**Verdict**: ✅ **PASS**

From `verify-report.md` (authority: latest verification run against final implementation):

| Metric | Result |
|--------|--------|
| **Requirements** | 23/23 COMPLIANT |
| **Scenarios** | 43/43 COMPLIANT |
| **Test Exit Code** | 0 (unit: 1033 tests, integration: 260 tests — all pass) |
| **Build Exit Code** | 0 (Biome/TypeScript/depcruise/reglas — all pass) |
| **Coverage** | 98.32% stmts / 93.39% branches / 98.9% funcs / 98.96% lines (floor: 80/75) ✅ |
| **Critical Issues** | 0 |
| **Warnings** | 0 (prior report's sole WARNING about `asignarArea` concurrency is **RESOLVED** by commit `53e74bc`) |
| **Suggestions** | 1 (cross-surface rate-limit sharing tested structurally, not by dedicated integration test; adequate but noted) |

### Key Verification Milestones

1. **Spec compliance**: All 23 requirements verified against runtime behavior (source read + passing covering test).
2. **Isolation assurance**: 5 dedicated `*.isolation.test.ts` files (one per table in `reportes` module) confirm RLS and tenant boundary enforcement.
3. **Concurrency correctness**: Real Postgres transaction tests (T6/T7 via `folio.integration.test.ts` and `folioParticion.integration.test.ts`) confirm folio lock mechanism under parallel load.
4. **State machine integrity**: `domain/estado.test.ts` covers 16-pair transition table; `cambiarEstadoDeReporte.validaciones.test.ts` and `domain/duplicado.test.ts` confirm no reopening and duplicate chain integrity.
5. **Design decisions**: 15 decisions mapped to source code and verified:
   - Decision 14 (atomicity of transition+link+movement): implemented in `resolverOriginal()` within same transaction.
   - **Decision 16 (asignarArea concurrency)**: Originally noted as a gap in the prior report. Now implemented in `repositorioDeReportesSql.asignarArea` with `WHERE estado IN (<non-terminal>)` guard (commit `53e74bc`, merged). New test `asignarArea.concurrencia.integration.test.ts` exercises the exact race and confirms it's closed.

---

## Artifacts Included in Archive

All required SDD artifacts are present and tracked:

- ✅ **proposal.md** — scope, rationale, dependencies, delivery cadence, rollback plan
- ✅ **design.md** — 15 numbered decisions, rationale for each, documented deviations
- ✅ **specs/** — all 5 domain specifications (3 modified, 2 new)
- ✅ **tasks.md** — 119 implementation tasks (100% complete, all `[x]`)
- ✅ **verify-report.md** — comprehensive verification report (PASS, 0 CRITICAL)
- ✅ **exploration.md** — research and discovery notes from proposal phase
- ✅ **archive-report.md** — this final audit trail

---

## Operability Notes

### No Breaking Changes

The change is additive. All modifications to existing specs add new scenarios or clarify existing requirements without removing or contradicting prior ones. The two new specs introduce entirely new capabilities.

### Deployment Ready

- All implementation complete and merged to `main` (`4cd1fdd`).
- All tests passing (unit + integration, including isolation and concurrency verification).
- Coverage within floor (98.32% stmts vs. 80% floor).
- No schema breaking changes; migration `0010_reportes.sql` is self-contained and includes RLS policies, GRANTs, and isolation tests.

### Known Limitations (by Design)

None noted. All design decisions are documented and verified.

---

## Handoff Checklist

- ✅ All specs merged into `openspec/specs/` (source of truth)
- ✅ Original change folder moved to `openspec/changes/archive/2026-09-03-reportes-ciudadanos/`
- ✅ No uncommitted/untracked artifacts remain in active `openspec/changes/`
- ✅ Tasks artifact reflects final state (119/119 complete, no stale checkboxes)
- ✅ Verify-report verdict is PASS (0 CRITICAL, 0 WARNING)
- ✅ Archive report documents closure and final state

**Change is complete and ready for operational use.**

---

## Recorded Artifacts (for Traceability)

**Artifacts read during archive phase:**
- `openspec/changes/reportes-ciudadanos/proposal.md`
- `openspec/changes/reportes-ciudadanos/design.md`
- `openspec/changes/reportes-ciudadanos/specs/*/spec.md` (5 files)
- `openspec/changes/reportes-ciudadanos/tasks.md`
- `openspec/changes/reportes-ciudadanos/verify-report.md`

**Artifacts merged into main specs:**
- `openspec/specs/autenticacion-municipal/spec.md` (modified)
- `openspec/specs/autorizacion-roles/spec.md` (modified)
- `openspec/specs/jerarquia-territorial/spec.md` (modified)
- `openspec/specs/consulta-publica-de-reportes/spec.md` (created)
- `openspec/specs/reportes-ciudadanos/spec.md` (created)

**Archive folder:**
- `openspec/changes/archive/2026-09-03-reportes-ciudadanos/` (created, contains all artifacts + verify-report.md)

---

**Archived by**: sdd-archive executor  
**Timestamp**: 2026-09-03 UTC  
**Mode**: OpenSpec (mechanical filesystem merge + archive)  
**Authority**: Native repository policy (no review gate required for openspec mode)
