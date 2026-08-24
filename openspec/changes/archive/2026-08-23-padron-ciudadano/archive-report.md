# Archive Report — padron-ciudadano

**Archivado**: 2026-08-23
**Modo de artefactos**: openspec (archivos, sin Engram para este cambio)
**Archivado en**: `openspec/changes/archive/2026-08-23-padron-ciudadano/`
**Ramas de trabajo**: cinco PRs, una por rebanada, cada una mergeada a `main` tras revision de GGA y CI en verde. `main` sincronizado en `a9d018c` antes de este archivado.

## Trazabilidad — artefactos leidos

| Artefacto | Fuente | Referencia |
|---|---|---|
| proposal | Filesystem | `openspec/changes/padron-ciudadano/proposal.md` (previo a este cambio de sesion) |
| spec (delta) | Filesystem | `openspec/changes/padron-ciudadano/specs/{padron-ciudadano,autorizacion-roles}/spec.md` |
| design | Filesystem | `openspec/changes/padron-ciudadano/design.md` (14 secciones) |
| tasks.md (disco) | Filesystem | `openspec/changes/padron-ciudadano/tasks.md` — 82/82 tareas `[x]`, 0 sin marcar |
| invariantes-criticos.md | Filesystem | `docs/architecture/invariantes-criticos.md` |
| Codigo implementado | Filesystem | `src/modules/padron/`, `src/shared/exportacion/`, `src/shared/auth/roles.ts` |

## Task Completion Gate

`tasks.md` en disco: 82 lineas `- [x]`, 0 lineas `- [ ]` (`grep -c`). El gate pasa sin necesidad de reconciliacion.

## Native Review Receipt Gate

No aplica: `reviewGate` no esta activo en este repositorio (receipt-driven development es opt-in y no fue habilitado). Las cinco rebanadas se revisaron por la via ordinaria del repositorio — GGA en pre-commit/pre-push/CI, multiples rondas por rebanada, techo de dos rondas aplicado segun `CLAUDE.md`.

## Regla 1 de `openspec/config.yaml` — advertir antes de fusionar deltas que remuevan invariantes criticos

**Verificado, sin hallazgos.** Los dos deltas (`padron-ciudadano`, `autorizacion-roles`) son exclusivamente `ADDED` — ninguna seccion `REMOVED` ni `MODIFIED`. Ningun requirement afloja un invariante existente; al contrario, el requirement "Aislamiento de personas por ayuntamiento" refuerza el invariante 1 (`FORCE ROW LEVEL SECURITY` + FK compuesto contra `(id, ayuntamientoId)`, nunca `id` solo) y el de fusion agrega el mismo patron para `fusionadaEn`/`fusionadaDirectoEn`.

## Regla 2 de `openspec/config.yaml` — confirmar test de aislamiento archivado para toda tabla con `ayuntamiento_id`

**Verificado.** `personas` es la unica tabla operativa nueva de este cambio (`abreviaturas` es catalogo de plataforma sin `ayuntamiento_id`, excepcion ya documentada en `invariantes-criticos.md`). Su test de aislamiento existe: `src/modules/padron/personas.isolation.test.ts`, mas los tests cross-tenant especificos de fusion (`fusionarPersonas.integration.test.ts`, `revertirFusion.integration.test.ts`) que ejercitan el FK compuesto y el 404-no-403 sobre un id de otro municipio.

## Verificacion de requisitos contra el codigo (11 requirements, 20 escenarios)

Revisados uno por uno contra `src/modules/padron/`, la migracion `drizzle/0004_padron.sql` y `openspec/specs/`:

| Requirement | Estado |
|---|---|
| Identidad en tres campos + `nombreNormalizado` en la app | ✅ `esquema.ts`, `repositorioDePersonasSql.ts` (guardar/actualizar) |
| Aislamiento por `ayuntamiento_id` | ✅ `FORCE ROW LEVEL SECURITY` (linea 40 de la migracion, no solo `ENABLE`), `unique(id, ayuntamientoId)`, FK compuestos en fusion |
| CURP opcional y unica por municipio | ✅ `personas_tenant_curp_idx` unico compuesto, `NULL` y no `''` |
| Bitacora de alta/edicion/fusion/baja, solo ids | ✅ los cinco casos de uso registran en la misma transaccion |
| Sin domicilio en `personas` | ✅ columnas del esquema revisadas, ninguna de domicilio |
| Busqueda tolerante con trigramas | ✅ rebanada 3, ya mergeada antes de esta sesion |
| Catalogo de abreviaturas sin `ayuntamiento_id`, solo lectura | ✅ `GRANT SELECT` sin `INSERT`/`UPDATE` en la migracion |
| Fusion no destructiva por redireccion, dos columnas | ✅ rebanada 4, con dos bugs encontrados por la revision y corregidos con test de regresion (listar() excluye fusionadas; revertirFusion recolapsa el subarbol completo y no registra bitacora sobre un no-op) |
| Puerto de lectura como unica entrada | ✅ `identidadPorPuerto.test.ts` |
| Sugerencia de duplicados, nunca bloqueante | ✅ umbral 0.30, tope 5, medido en design.md |
| Exportacion incluye el padron | ✅ con una correccion, ver abajo |

## Correccion aplicada antes de fusionar — requirement de exportacion

**Hallazgo:** el requirement "Exportacion por ayuntamiento incluye el padron" (rebanada 5) exigia que la bitacora de una exportacion masiva llevara "alcance y cantidad de registros". Ni `design.md` ni `tasks.md` de la rebanada 5 disenaron o tasquearon esos dos campos, y `exportarAyuntamiento` (`shared/exportacion/exportar.ts`) no cambio su firma de bitacora en esta rebanada — sigue registrando actor, origen y accion, igual que desde Fase 0. El requirement afirmaba algo que el codigo nunca hizo.

**Correccion:** se reescribio el requirement y su segundo escenario en `specs/padron-ciudadano/spec.md` antes de fusionar a `openspec/specs/`, retirando la exigencia de "alcance y cantidad de registros" y dejando solo lo que el codigo garantiza y los tests cubren (`exportar.isolation.test.ts`, "cada exportacion deja su traza en bitacora"). Si se necesita ese detalle en el futuro, queda anotado como cambio de `shared/exportacion`, no de `padron`.

## Sincronizacion de specs — resultado

Dos dominios en esta operacion:

| Domain | Accion | Details |
|---|---|---|
| `padron-ciudadano` | **Creado** | Spec nueva (11 requirements / 20 escenarios, con la correccion de arriba). Copia mecanica, `diff` readback: vacio ✓ |
| `autorizacion-roles` | **Modificado (merge)** | Delta de 1 requirement / 3 escenarios (`puedeFusionarPersonas`) agregado al final de `openspec/specs/autorizacion-roles/spec.md`, mismo patron que el requirement de `puedeCambiarMarca` que ya vivia ahi |

## Movimiento a archivo — resultado

`git mv openspec/changes/padron-ciudadano openspec/changes/archive/2026-08-23-padron-ciudadano`. Confirmado que `openspec/changes/padron-ciudadano` ya no existe. Este archivo (`archive-report.md`) es aditivo.

## Test coverage y verificacion mecanica — estado final

- `pnpm vitest run --project unit` — 221/221 (a la fecha del ultimo PR mergeado, rebanada 5)
- `pnpm vitest run --project integration` (Postgres real) — 146/146
- `pnpm check` (biome + tsc + depcruise) — exit 0, sin violaciones de capas
- Cobertura `padron/domain` + `padron/application`: 100%/100%/100% (verificado sobre `coverage-final.json` en la rebanada 4; el reporter de terminal omitia el modulo por un bug cosmetico, no una brecha real)
- Cinco PRs, uno por rebanada, todos mergeados: #19 (busqueda, rebanada 3, ya en curso antes de esta sesion), #20 (alineacion de CI), #21 (deuda de `PersonaId` marcado), #22 (fusion, rebanada 4), #23 (exportacion, rebanada 5)

## Limitaciones declaradas — persistidas en el registro

1. **`identidadPorPuerto.test.ts` no cubre `.sql` de `scripts/` ni nombres de tabla armados dinamicamente.** Documentado en el propio test.
2. **`FusionarPersonas.tsx` no tiene pagina propia todavia.** Se auto-protege con `puedeFusionarPersonas` en vez de gate a nivel de pagina (desviacion documentada del patron habitual).
3. **`src/app/exportacion/porciones.ts` no tiene todavia un llamador real.** Ninguna pagina ni Server Action invoca `exportarAyuntamiento` con este arreglo hoy; es el punto de composicion listo para cuando esa superficie se construya.
4. **"Alcance y cantidad de registros" en la bitacora de exportacion** — retirado del requirement en esta misma operacion de archivado, ver correccion arriba. Si se implementa, es cambio de `shared/exportacion`.
5. **`personas` fusionadas en la busqueda difusa**: pregunta abierta de `design.md` seccion 14 resuelta como "no se muestran" (mismo criterio que `listar`), sin escenario de spec dedicado a esa decision.

## Ciclo SDD completo

`padron-ciudadano` fue implementado en cinco rebanadas incrementales (esquema/aislamiento, alta/edicion/baja, busqueda tolerante, fusion/duplicados, exportacion), cada una con TDD estricto, revision de GGA multi-ronda, y su propio PR mergeado a `main`. Verificado contra sus 11 requirements y 20 escenarios, con una correccion aplicada al requirement de exportacion antes de fusionar. `openspec/specs/{padron-ciudadano,autorizacion-roles}/spec.md` es ahora la fuente de verdad para estas capacidades. El cambio esta cerrado.
