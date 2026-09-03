```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:afd8942dbb044f38e907d0db1469add752867bde69d6210ac99e5651764e50f3
verdict: pass
blockers: 0
critical_findings: 0
requirements: 23/23
scenarios: 43/43
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:12b7da8bcd626f0ecb39a3f6ab9af42c1e60ce0d52c58b602d56feba90c942f3
build_command: pnpm check
build_exit_code: 0
build_output_hash: sha256:cc11d7627e7bbaf5f7d9cb3c64e546a7e770cc5fb64c112da642b50183dafce6
```

## Verification Report

**Change**: `reportes-ciudadanos`
**Version**: N/A (openspec change, not versioned separately)
**Mode**: Strict TDD (embedded RED/GREEN evidence in `tasks.md`, no separate `apply-progress` artifact — this change persists via OpenSpec files only)

**Re-verification note**: this supersedes the prior `verify-report.md` (evidence `sha256:cc9c53c...`), which `gentle-ai sdd-status` flagged as stale — its `scenarios: 44/44` summary line did not match the actual 43-scenario count produced by the spec matrix it printed (23 rows summed to 43, not 44; confirmed independently below by `grep -c "^#### Scenario:"` over all 5 delta specs). This report also confirms, with fresh runtime evidence, that the prior report's single WARNING (`asignarAreaDeReporte`'s repository `UPDATE` lacked `aplicarTransicion`'s optimistic-concurrency guard) is resolved: merged to `main` in commit `53e74bc` (PR #54), verified below.

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 119 |
| Tasks complete | 119 |
| Tasks incomplete | 0 |

All 8 phases (`Phase 1`–`Phase 8`) checked `[x]` in `tasks.md`. `main` is at `4cd1fdd` (merge of PR #54, `fix(reportes): asignarArea gana su propia carrera de concurrencia`), on top of all 7 original feature-phase merges plus the follow-up fix commit `53e74bc`.

### Scenario count, recomputed independently

```text
$ rg -c "^### Requirement:" openspec/changes/reportes-ciudadanos/specs/*/spec.md
autenticacion-municipal/spec.md:1
autorizacion-roles/spec.md:1
consulta-publica-de-reportes/spec.md:5
jerarquia-territorial/spec.md:1
reportes-ciudadanos/spec.md:15
Total: 23 requirements

$ rg -c "^#### Scenario:" openspec/changes/reportes-ciudadanos/specs/*/spec.md
autenticacion-municipal/spec.md:3
autorizacion-roles/spec.md:5
consulta-publica-de-reportes/spec.md:7
jerarquia-territorial/spec.md:4
reportes-ciudadanos/spec.md:24
Total: 43 scenarios
```

This matches `sdd-status`'s reported actual count (43) and matches the per-row sum of the compliance matrix below — the prior report's matrix rows already summed to 43; only its summary/header line said 44.

### Build & Tests Execution

**Build**: PASS (`pnpm check` — Biome, `tsc --noEmit`, `depcruise`, `pnpm reglas`)
```text
Checked 561 files in 305ms. Found 53 warnings (all pre-existing noNonNullAssertion
in territorio tests, not touched by this change — same 53 the prior report noted).
tsc --noEmit: no errors
depcruise: no dependency violations found (553 modules, 2407 dependencies)
pnpm reglas: 8 reglas y 2 metricas sobre 565 archivos: sin hallazgos.
Exit code: 0
```

**Tests**: PASS (unit + integration, run natively with the project's real `.env` `DATABASE_URL` against the `xula-pg` Postgres container — no `rtk` compression used, per `CLAUDE.md`'s isolation-testing rule)
```text
pnpm test (vitest run, "unit" project):
  Test Files  215 passed (215)
  Tests       1033 passed (1033)
  Duration    146.15s

pnpm test:integration (vitest run --project integration):
  Test Files  73 passed (73)
  Tests       260 passed (260)
  Duration    108.37s
```
Both counts are +1 file/+1 test over the prior report's 214/1032 and 72/259: the new `src/modules/reportes/asignarArea.concurrencia.integration.test.ts` from PR #54. No failures, no flakes observed in this run (the prior report's noted one-off `constancias/folio.integration.test.ts` timer flake did not recur and is unrelated to this change).

**Coverage**: `pnpm vitest run --coverage` (CI's exact command, `.github/workflows/*.yml`, "Integracion y aislamiento" step) — `modules/reportes/{domain,application}` produce **zero rows** in the v8 text reporter, which only prints files with any column below 100%: confirms all `reportes/{domain,application}` files remain at 100% stmts/branch/funcs/lines, unchanged by the fix (the fix touched only `infrastructure`, which is outside the covered floor per `vitest.config.ts`'s `coverage.include`). Whole-repo aggregate: 98.32% stmts / 93.39% branches / 98.9% funcs / 98.96% lines — floor is 80/75 → ABOVE. Identical to the prior report's figures (expected: no `domain`/`application`/`shared` line changed between the two verification runs).

### Spec Compliance Matrix

23 requirements / 43 scenarios across 5 spec deltas. All PASS — each requirement re-checked against current runtime behavior (source read + passing covering test on `main` at `4cd1fdd`).

| Requirement | Scenarios | Test | Result |
|---|---|---|---|
| Folio consecutivo por (ayuntamiento, anio) bajo lock en transaccion | 4 | `folio.integration.test.ts` (T6/T7 concurrency via real parallel Postgres tx), `folioParticion.integration.test.ts` (Motul/Ticul, año Merida) | ✅ COMPLIANT |
| Un reporte no es un documento inmutable | 1 | `cambiarEstadoDeReporte.test.ts`, schema `UPDATE` grant | ✅ COMPLIANT |
| Clasificacion por tipo de incidencia, union cerrada | 1 | `domain/tipoDeIncidencia.test.ts`, `reportes_tipo_valido` CHECK | ✅ COMPLIANT |
| Area responsable cerrada, asignada despues del registro | 1 | `domain/areaResponsable.test.ts`, `areaResponsable: null` in `registrarReporte.ts` | ✅ COMPLIANT |
| Ubicacion por lugar obligatorio, calle opcional, sin domicilio | 2 | `registro.integration.test.ts`, `ubicacionDeLugar.integration.test.ts` | ✅ COMPLIANT |
| Las dos cajas de texto libre, mismas protecciones | 2 | `validacionDeReporte.test.ts` (Zod bounds), public page markup assertion (`page.test.ts`) | ✅ COMPLIANT |
| Vinculo opcional con persona del padron, sin datos sueltos | 1 | `registro.integration.test.ts` — anonymous path, no contact columns in schema | ✅ COMPLIANT |
| Transiciones de estado cerradas, terminales sin reapertura | 3 | `domain/estado.test.ts` (16-pair table incl. RECIBIDO→RESUELTO direct), `cambiarEstadoDeReporte.validaciones.test.ts` | ✅ COMPLIANT |
| Registrar es mostrador; cambiar estado/asignar area son estructura | 1 | `registrarReporte.test.ts` (`puedeEscribir`), `cambiarEstadoDeReporte.validaciones.test.ts` + `asignarAreaDeReporte.test.ts` (`NoAutorizadoError`) | ✅ COMPLIANT |
| Motivo de rechazo cerrado; DUPLICADO exige vinculo | 1 | `duplicados.atomicidad.integration.test.ts`, `resolverOriginal()` in `cambiarEstadoDeReporte.ts` | ✅ COMPLIANT |
| Un duplicado apunta siempre a un reporte que no es duplicado | 3 | `domain/duplicado.test.ts` (`originalDe`/`vincularDuplicado`), `duplicados.cadena.integration.test.ts`, `duplicados.ciclo.integration.test.ts`, `reportes_duplicado_tenant_fk` | ✅ COMPLIANT |
| Buscador de reportes similares informativo, no bloquea | 1 | `buscarReportesSimilares.test.ts`, `similaresDeReportesSql.ts` (no rejection branch) | ✅ COMPLIANT |
| Historial de movimientos de solo agregado | 1 | `movimientosDeReportes.isolation.test.ts` (UPDATE rejected by GRANT), `GRANT SELECT, INSERT` only in migration | ✅ COMPLIANT |
| Aislamiento por ayuntamiento de las tres tablas nuevas | 1 | `reportes.isolation.test.ts`, `reportes.checks.isolation.test.ts`, `reportes.clavesForaneas.isolation.test.ts`, `foliosDeReportes.isolation.test.ts`, `movimientosDeReportes.isolation.test.ts` (5 files covering 3 tables) | ✅ COMPLIANT |
| Reportes en la exportacion por ayuntamiento | 1 | `composicion.test.ts`, `porcionesDeReportes` with explicit columns | ✅ COMPLIANT |
| Ubicacion compuesta como texto (`jerarquia-territorial`) | 4 | `direccion.test.ts`, `lectorDeUbicacionesSql.test.ts`, `ubicacionDeLugar.integration.test.ts` | ✅ COMPLIANT |
| Caso de uso publico con firma propia, sin ContextoActual | 1 | `consultarFolioDeReporte.test.ts` — signature `(ayuntamientoId, folio) => ...`, no `ContextoActual` import | ✅ COMPLIANT |
| Respuesta minima sin ningun dato personal | 1 | `page.test.ts` markup assertion, `ConsultaDeReporte` union type (no folio/descripcion/referencia/area fields) | ✅ COMPLIANT |
| Folio duplicado responde estado del original y fecha propia | 3 | `domain/consulta.test.ts` (`proyectarConsulta`), `consultarFolioDeReporte.test.ts` (2-call assertion) | ✅ COMPLIANT |
| Toda respuesta negativa es indistinguible | 1 | `domain/consulta.test.ts` (`toBe(SIN_REGISTRO)` identity) | ✅ COMPLIANT |
| Limitacion de ritmo por IP, nunca por folio | 1 | `ritmo.test.ts` (order + key-by-IP assertion) | ✅ COMPLIANT |
| Regla de autorizacion `puedeAdministrarReportes` (`autorizacion-roles`) | 5 | `roles.test.ts` (full `ROLES` table sweep) | ✅ COMPLIANT |
| Limitacion de ritmo sin bloqueo persistente (`autenticacion-municipal`) | 3 | Shared `limitarRitmo`/`ritmo.ts` mechanism (same `"folio"` `TipoIntento`, no schema change); cross-surface sharing is structural (same function/key), not independently re-tested per surface | ✅ COMPLIANT |

**Compliance summary**: 43/43 scenarios compliant. (23 rows above; sum verified against the independent `rg` count in the "Scenario count" section — matches exactly, no arithmetic drift this time.)

### Correctness (Static + Runtime Evidence, spot-checked on the highest-risk decisions)

| Decision | Status | Notes |
|---|---|---|
| Decision 2 — folio lock, no sequence | ✅ Implemented | `contadorDeFoliosSql.ts` uses `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, verified against T6/T7 real-Postgres concurrency tests |
| Decision 5 — `IS NOT DISTINCT FROM` on CHECKs | ✅ Implemented | `reportes_duplicado_con_motivo`, `movimientos_motivo_solo_en_rechazo` both use `IS NOT DISTINCT FROM` |
| Decision 6 — self-referential FK via Drizzle, not by hand | ✅ Implemented | `reportes_duplicado_tenant_fk` is a Drizzle `foreignKey()`; the other 3 FKs (`lugares`, `calles`, `personas`) are hand-written in `0010_reportes.sql` |
| Decision 8 — one-hop chain resolution, no loops | ✅ Implemented | `domain/duplicado.ts`: `originalDe`/`vincularDuplicado`, no `while`/`for`/recursion; cycle-by-raw-SQL test confirms degraded-but-bounded behavior |
| Decision 12 — public query field split | ✅ Implemented | `proyectarConsulta`: `tipo`/`registradoEn` from the queried report, `estado`/`actualizadoEn` from the original; no `folio` field on the response type |
| Decision 14 — atomicity of transition+link+movement | ✅ Implemented | `resolverOriginal()` runs inside the same `withTenant` tx as `aplicarTransicion`/`movimientos.agregar`/`registrar` |
| Decision 15 — similar-reports search never blocks | ✅ Implemented | `buscarReportesSimilares.ts` has zero rejection branches; `registrarReporte.ts` never calls it |
| **New**: `asignarArea` concurrency guard | ✅ Implemented | `repositorioDeReportesSql.asignarArea` now `UPDATE ... WHERE id = $1 AND estado IN (<ESTADOS_NO_TERMINALES>)`, same conditional-`WHERE` mechanism as `aplicarTransicion`. Verified by reading `infrastructure/repositorioDeReportesSql.ts:115-135` (commit `53e74bc`) and by the new `asignarArea.concurrencia.integration.test.ts`, which registers a report, transitions it to `RESUELTO`, then calls `repositorioDeReportesSql.asignarArea` directly against the now-terminal report and asserts it returns `false` and leaves `areaResponsable` untouched — the exact race the prior WARNING described, now closed at the SQL layer, not just by the use case's pre-check |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Migration: FORCE RLS + GRANT + 3 manual FK + self-ref FK, single file | ✅ Yes | `drizzle/0010_reportes.sql` matches exactly, `GRANT` excludes UPDATE/DELETE on `movimientos_de_reportes`, no DELETE anywhere |
| `aplicarTransicion` as the concurrency control (conditional `UPDATE ... WHERE estado = $anterior`) | ✅ Yes | `repositorioDeReportesSql.ts` |
| `asignarArea` — same skeleton as `aplicarTransicion` (design.md §12) | ✅ Yes | **Resolved since the prior report.** `asignarArea` now carries the same conditional-`WHERE` mechanism as `aplicarTransicion` (`WHERE id = $1 AND estado IN (<non-terminal>)`), closing the gap the prior report flagged as an undocumented deviation from design.md §12's own stated principle ("el `WHERE` decide, no la lectura previa") |
| Schema split into `reportes.ts`/`foliosDeReportes.ts`/`movimientosDeReportes.ts` | ✅ Yes (documented deviation) | Matches the 200-line file metric (`AGENTS.md`); `esquema.ts` is a barrel re-export |
| `similaresAbiertos` in `similaresDeReportesSql.ts`, composed by spread | ✅ Yes (documented deviation, tasks.md 7.1) | Same 200-line reason |
| `paraConsultaPublica`/`paraConsultaPublicaPorId` in `consultaPublicaDeReportesSql.ts` | ✅ Yes (new documented deviation, PR #54 commit message) | Same 200-line reason: the fix's added `WHERE`/comment pushed `repositorioDeReportesSql.ts` over 200 lines, same precedent as `similaresDeReportesSql.ts`. Pure extraction — behavior unchanged, verified: `RepositorioDeReportes` still exposes both methods via spread in `composicion.ts`/the object literal, all consulta-publica tests (`consultarFolioDeReporte.test.ts`, `ritmo.test.ts`, public `page.test.ts`) pass unmodified |
| `/reportes/detalle/[id]` instead of `/reportes/[id]` | ✅ Yes (documented deviation, tasks.md 7.12) | `src/app/(panel)/reportes/detalle/[id]/page.tsx` confirmed on disk |

### Issues Found

**CRITICAL**: None

**WARNING**: None. The single WARNING from the prior verification (`asignarAreaDeReporte`'s repository `UPDATE` had no `estado`-conditioned `WHERE`, allowing a concurrent state-transition-to-terminal to slip an area assignment onto an already-closed report) is resolved: `repositorioDeReportesSql.asignarArea` (commit `53e74bc`, merged via PR #54, `main` at `4cd1fdd`) now filters `WHERE estado IN (<ESTADOS_NO_TERMINALES>)` in the same `UPDATE`, mirroring `aplicarTransicion`'s existing guard, and is proven by a new integration test (`asignarArea.concurrencia.integration.test.ts`) that exercises exactly the previously-described race and asserts the `UPDATE` now affects zero rows against a terminal report.

**SUGGESTION**:
1. The cross-surface rate-limit sharing scenario ("Consultar constancias y reportes desde el mismo origen comparte cuota," `autenticacion-municipal` delta) is proven structurally (both surfaces call the same `limitarRitmo` function with the same `"folio"` `TipoIntento` key) rather than by a dedicated integration test exercising both call sites together. Given the mechanism is literally the same function and the same key, this is adequate, but a single cross-surface integration test would make the scenario's compliance explicit rather than inferred. (Carried over unchanged from the prior report — not affected by the `asignarArea` fix.)

### Verdict
**PASS**
All 119/119 tasks complete on `main` (`4cd1fdd`), `pnpm check`/`pnpm test`/`pnpm test:integration` green (215/1033 unit, 73/260 integration), 23/23 requirements and 43/43 scenarios compliant with runtime evidence (scenario total independently recomputed via `rg` and matches the compliance matrix exactly — the prior report's stale `44/44` summary is corrected), `modules/reportes/{domain,application}` coverage remains at 100% (floor 80/75). The prior report's sole WARNING (`asignarArea` concurrency gap) is resolved and proven by a new integration test. Zero CRITICAL, zero WARNING; one carried-over SUGGESTION that does not affect the verdict.
