# Tasks: Street Coordinates and Reassignment

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,100–1,400 |
| Requested 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 persistence/domain → PR 2 application/actions → PR 3 UI |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Resuelta para la recuperacion de PR3: el maintainer autorizo `size:exception` para conservar esta slice unica.
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Point storage, validation, port, repository | PR 1 | `pnpm test -- punto calles` | Integration with local Postgres | Migration, schema, domain, ports, repository, tests |
| 2 | Use cases, traces, composition, permissions, actions | PR 2 | `pnpm test -- ubicarCalle reparentearCalle darDeBajaCalle` | Native POST; map not required | Application, action, routing, permission files |
| 3 | Map island, panel, forms, table, browser flow | PR 3 | `pnpm test:e2e -- calles` | Playwright; OSM tiles mocked/not required | UI, dependency, E2E, documentation |

## Phase 1: Foundation and RED Tests

- [x] 1.1 Write RED tests in `src/modules/territorio/domain/punto.test.ts`, `src/modules/territorio/application/*Calle.test.ts`, `calles.integration.test.ts`, and `calles.isolation.test.ts` for nullable points, bounds, rounding, partial CHECK, active guards, Motul/Ticul visibility, and cross-tenant update zero rows.
- [x] 1.2 Write the foundation/repository tests for primary and transversal domicile blocking, duplicate names, nullable point clearing, and exact point preservation.
- [x] 1.2-P2 Write application tests for reports allowed, invalid destination, audit rows, and permission rejection when the PR2 use cases exist.
- [x] 1.3 Add `drizzle/0011_calles_coordenadas.sql`, `src/modules/territorio/infrastructure/esquema.ts`, `src/modules/territorio/domain/punto.ts`, and `domain/errores.ts`: nullable `doublePrecision`, `calles_punto_completo`, one `CAJA_DE_YUCATAN`, no new RLS/GRANT.
- [x] 1.4 Widen `src/modules/territorio/application/puertos.ts`; update `src/modules/territorio/infrastructure/repositorioDeCallesSql.ts` reads/counts/updates, all domicile references, and `bajaEn IS NULL`.

## Phase 2: Application and Public Boundaries

- [x] 2.1 Implement `src/modules/territorio/application/{ubicarCalle,reparentearCalle,darDeBajaCalle}.ts` with `puedeAdministrarTerritorio`, `withTenant`, rereads, no domicile cascade/report dependency, and same-transaction id-only bitacora.
- [x] 2.2 Update `renombrarCalle.ts`, `composicion.ts`, and `permisos.ts`; reuse the widened update and export `CalleGuardada.punto`.
- [x] 2.3 Add RED tests for malformed forms, forged tenant IDs, foreign-resource 404, and server-derived redirects; implement `ui/actions/{ubicarCalle,reparentearCalle,darDeBajaCalle}Action.ts` with first-line Zod `safeParse`, allowlisted Spanish messages, and no leaks.
- [x] 2.4 Add RED routing coverage for `?calle=xx` plus unrelated `?raiz`; update `app/(panel)/territorio/parametros.ts` with field-local `.catch(undefined)`.

## Phase 3: UI and Integration

- [x] 3.1 Add RED coverage for bounded public OSM configuration, attribution, and tile failure; implement `SelectorDePunto.tsx`/`useMapaDePunto.ts` with visible native fields, no-JS fallback, Leaflet `circleMarker`, Yucatan `maxBounds`, and CI without tiles.
- [x] 3.2 Add `PanelDeCalle.tsx`, `FormularioDeUbicacion.tsx`, `FormularioDeMovimientoDeCalle.tsx`, and `FormularioDeBajaDeCalle.tsx`; modify `FormularioDeRenombreDeCalle.tsx`/`TabDeCalles.tsx` for hidden ID, linked rows, `Ubicacion`, `Sin punto`, and disclosure.
- [x] 3.3 Update `package.json`, `AGENTS.md`, and `e2e/calles.spec.ts`; cover native reparent/baja, empty state, duplicate message, domicile block, report-allowed baja, and audit actions.

## Phase 4: Verification

- [x] 4.1 Run `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm check`, dependency-layer validation, and complete-diff review; verify rollback drops columns/CHECK while retaining audit rows.
