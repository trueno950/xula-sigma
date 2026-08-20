# Archive Report — auth-rbac

**Archivado**: 2026-08-19
**Modo de artefactos**: hybrid (OpenSpec + Engram)
**Archivado en**: `openspec/changes/archive/2026-08-19-auth-rbac/`
**Rama de trabajo**: `chore/archivar-auth-rbac` (sin commit, working tree)

## Trazabilidad — artefactos leidos

| Artefacto | Fuente | Referencia |
|---|---|---|
| proposal | Engram | `sdd/auth-rbac/proposal` obs #4331 |
| spec (delta original) | Engram | `sdd/auth-rbac/spec` obs #4333 |
| design | Engram | `sdd/auth-rbac/design` obs #4334 |
| tasks | Engram | `sdd/auth-rbac/tasks` obs #4336 |
| verify-report | Engram | `sdd/auth-rbac/verify-report` obs #4362 |
| specs (delta, disco, version final fusionada) | Filesystem | `openspec/changes/auth-rbac/specs/{autenticacion-municipal,autorizacion-roles,provision-ayuntamientos}/spec.md` — leidos DESPUES de la correccion de forma que resolvio el bloqueo (ver seccion siguiente) |
| tasks.md (disco) | Filesystem | `openspec/changes/auth-rbac/tasks.md` — 73/73 tareas `[x]`, 0 sin marcar |
| invariantes-criticos.md | Filesystem | `docs/architecture/invariantes-criticos.md` |

## Task Completion Gate

`tasks.md` en disco: 73 lineas `- [x]`, 0 lineas `- [ ]` (verificado con `grep -c`). El gate pasa sin necesidad de reconciliacion.

## Native Review Receipt Gate

No aplica: no se encontro `reviewGate` en el estado de esta sesion (agente sub-fase sin acceso a `gentle-ai review status`); no se bloqueo el archivado por este concepto, consistente con "reviewGate ausente -> procede bajo politica ordinaria del repositorio".

## Regla 1 de `openspec/config.yaml` — advertir antes de fusionar deltas que remuevan invariantes criticos

**Verificado, sin hallazgos.** Los tres deltas (`autenticacion-municipal`, `autorizacion-roles`, `provision-ayuntamientos`) son exclusivamente `ADDED` — no existia spec previo en `openspec/specs/` (0 archivos antes de este archivado, confirmado con `ls`), y la propuesta declara explicitamente "Modified: ninguna". Ningun requirement trae seccion `REMOVED` ni `MODIFIED` que afloje el invariante 1 (aislamiento) o el 5 (auditoria) de `docs/architecture/invariantes-criticos.md`. Al contrario, tres requirements los refuerzan textualmente: "ayuntamiento_id nunca llega desde el cliente", "Aislamiento de toda tabla con ayuntamiento_id" (ver correccion abajo), y "Todo restablecimiento deja traza en bitacora".

## Regla 2 de `openspec/config.yaml` — confirmar test de aislamiento archivado para toda tabla con `ayuntamiento_id`

**Hallazgo inicial (bloqueo momentaneo) y su correccion.**

En la primera pasada de este archivado se verificaron las cinco tablas con `ayuntamiento_id` (`usuarios`/`user`, `sesiones`/`session`, `cuentas`/`account`, `verificaciones`/`verification`, `intentos_acceso`) contra el spec que se iba a fusionar. Los cinco archivos `*.isolation.test.ts` existian en `src/shared/auth/`, pero el `Requirement: Aislamiento de las tablas de autenticacion` del delta original enumeraba las tablas de Better Auth por nombre literal (`user`, `session`, `account`, `verification`) y **no incluia `intentos_acceso`**; el requirement de rate limiting tampoco mencionaba RLS, `GRANT` ni test de aislamiento. El codigo era correcto (`drizzle/0001_auth.sql`: `ENABLE`/`FORCE ROW LEVEL SECURITY`, `CREATE POLICY intentos_acceso_tenant`, `GRANT SELECT, INSERT, DELETE`), pero el spec como fuente de verdad no lo exigia — el archivado se detuvo antes de fusionar.

**Correccion aplicada por el orquestador antes de continuar** (no redactada por este agente, solo verificada): el requirement se renombro a `Aislamiento de toda tabla con ayuntamiento_id` y se reescribio como **regla**, no como enumeracion — "Toda tabla alcanzada por este cambio que lleve `ayuntamiento_id` MUST tener `FORCE ROW LEVEL SECURITY`, politica de aislamiento por tenant, `GRANT` explicito y su propio `*.isolation.test.ts`... La regla se enuncia por la presencia de la columna y NO por una lista de tablas." Las cinco tablas se nombran al cierre del cambio como **estado**, no como definicion. Se agregaron dos escenarios para `intentos_acceso`, verificados linea por linea contra `src/shared/auth/intentosAcceso.isolation.test.ts`:
- "La ventana de limitacion de ritmo no cruza municipios" -> test linea 39 (`toHaveLength(0)` sobre intentos de Ticul consultados bajo `withTenant(motul)`).
- "Un intento no se registra a nombre de otro municipio" -> test linea 56 (`insert` con `ayuntamientoId: ticul` bajo `withTenant(motul)`, falla con `/row-level security/i`).

**Motivo del cambio de forma** (registrado por instruccion explicita del orquestador): una lista de tablas obliga a que alguien se acuerde de extenderla cada vez que nace una tabla nueva con `ayuntamiento_id`; la regla general cubre a la tabla siguiente sin intervencion. Esto ademas alinea el requirement con la redaccion de `docs/architecture/invariantes-criticos.md` Capa 2 ("Obligatorios. Uno por cada tabla con `ayuntamiento_id`"), que ya es una regla, no una lista.

**Estado final, reverificado antes de fusionar**: las cinco tablas quedan cubiertas por un unico requirement basado en regla, con test de aislamiento propio para cada una. Regla 2 cierra.

## Sincronizacion de specs — resultado

`openspec/specs/` estaba vacio (0 archivos) antes de este archivado: es la primera fusion del proyecto, sin merge contra specs previas, solo creacion. Copia mecanica via shell (`cp` a archivo temporal + `diff -r` + `mv`), sin paso por Read/Write del modelo.

| Domain | Accion | Requirements | Diff readback |
|---|---|---|---|
| `autenticacion-municipal` | Creado | 7 (incluye el corregido "Aislamiento de toda tabla con ayuntamiento_id") | vacio |
| `autorizacion-roles` | Creado | 6 | vacio |
| `provision-ayuntamientos` | Creado | 4 | vacio |

Readback adicional post-copia (fuente en carpeta de cambio vs. destino en `openspec/specs/`, antes de mover la carpeta): vacio en los tres dominios.

## Movimiento a archivo — resultado

`git mv openspec/changes/auth-rbac openspec/changes/archive/2026-08-19-auth-rbac`. Confirmado que `openspec/changes/auth-rbac` ya no existe. `diff -r` entre un snapshot recursivo previo al movimiento y la carpeta archivada: vacio. Este archivo (`archive-report.md`) es aditivo y no participo de esa comparacion, porque no existia en la carpeta original.

## Estado final — autoridad sobre snapshots intermedios

Los tres criticos que `verify-report.md` (Engram obs #4362, snapshot del 2026-08-19 17:52) reporta como abiertos/relevantes tienen estado final distinto, segun evidencia posterior provista por el lanzador de esta fase y no re-ejecutada por este agente:

1. **"Ghost loop" en `accesoCruzado.integration.test.ts` — CERRADO.** El bucle `for ... expect(...)` sin aserción de longitud previa pasaba 7/7 aunque el aislamiento estuviera desactivado. Corregido con aserciones de delta (`toHaveLength(antesEnTicul.length + 1)`, `toHaveLength(antesEnMotul.length)`). Commit `c8e4827`, PR #4, merge `38c001f`. Barrido de `**/*.test.ts` sin coincidencias adicionales del patron.
2. **E2E sin Chromium — CERRADO.** Era un binario ausente (`chromium_headless_shell-1234`, cache en `1223`), no un defecto de codigo. Instalado con `pnpm exec playwright install chromium`. `pnpm test:e2e` da 6/6, incluidos los dos casos que cubren el escenario MUST de alcance de cookie por subdominio.
3. **`apply-progress` ausente — ACEPTADO CON EVIDENCIA SUSTITUTA, fecha 2026-08-19.** No existe el artefacto `apply-progress` ni en OpenSpec ni en Engram para `auth-rbac`. Decision tomada por el orquestador: no se reconstruye. Evidencia contemporanea aceptada en su lugar: 48 anotaciones RED/GREEN en `openspec/changes/auth-rbac/tasks.md` (hoy en `openspec/changes/archive/2026-08-19-auth-rbac/tasks.md`), repartidas en los seis PRs con el nombre del archivo de test junto a cada par (ej. `1.1 RED usuarios.isolation.test.ts` / `1.2 GREEN tabla usuarios en shared/auth/esquema.ts`), mas cinco registros por PR en Engram con sus commits. Reconstruir el artefacto hoy copiaria esos mismos datos a un segundo lugar que envejeceria peor que el original.

   **Causa sistemica registrada explicitamente**: `sdd-apply` corrio cinco veces sobre este cambio (una por PR) y ninguna corrida persistio su propio artefacto `apply-progress`. Es un hueco del flujo `sdd-apply`, no un defecto especifico de `auth-rbac`. Si no queda escrito aca, el proximo cambio de este proyecto llega a `sdd-verify` con el mismo CRITICO abierto por la misma causa.

Estos tres hechos priman por rango de autoridad segun la jerarquia de estado final: los dos primeros porque hay commit/merge y re-ejecucion posterior evidenciables; el tercero porque es una decision explicita del orquestador con la evidencia sustituta descrita, no una afirmacion sin respaldo. Ninguno de los tres fue re-verificado directamente por este agente de archivado (no se re-corrio `pnpm test:e2e` ni se inspecciono el commit `c8e4827`): se registran como hechos de estado final aportados por el lanzador de la fase, distintos de — y con precedencia sobre — el `verdict: fail` del snapshot de verificacion.

## Evidencia de verificacion vigente (aportada por el lanzador, no re-ejecutada en esta fase)

- `pnpm test` — 187/187 (91 unit + 96 integration, aislamiento incluido)
- `pnpm check` — exit 0, sin violaciones de capas (88 modulos, 282 dependencias)
- `pnpm test:e2e` — 6/6
- cobertura — 92.94 / 81.13 / 92.75 / 93.48, piso 80/75
- CI en PR #4 — los cinco jobs en verde, incluido "Integracion y aislamiento entre municipios" (1m15s) y "Revision de IA" con variante high (2m8s)

## Contenido del archivo

- `proposal.md`
- `exploration.md`
- `specs/autenticacion-municipal/spec.md`, `specs/autorizacion-roles/spec.md`, `specs/provision-ayuntamientos/spec.md`
- `design.md`
- `tasks.md` (73/73 tareas completas)
- `verify-report.md` (snapshot intermedio, `verdict: fail` a la fecha de esa corrida — ver seccion "Estado final" arriba para el estado que prevalece)
- `archive-report.md` (este archivo, aditivo)

## Ciclo SDD completo

`auth-rbac` quedo planificado, implementado, verificado (con hallazgos posteriores cerrados fuera de esa corrida) y archivado. `openspec/specs/{autenticacion-municipal,autorizacion-roles,provision-ayuntamientos}/spec.md` es ahora la fuente de verdad para estas tres capacidades.
