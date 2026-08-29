# Archive Report — capa-territorial

**Archivado**: 2026-08-29
**Modo de artefactos**: openspec (archivos, sin Engram para este cambio)
**Archivado en**: `openspec/changes/archive/2026-08-29-capa-territorial/`
**Ramas de trabajo**: siete PRs, una por rebanada, cada una mergeada a `main` tras revision de GGA y CI en verde. `main` sincronizado en HEAD tras PR #32 (2026-08-28) antes de este archivado.

## Trazabilidad — artefactos leidos

| Artefacto | Fuente | Referencia |
|---|---|---|
| proposal | Filesystem | `openspec/changes/archive/2026-08-29-capa-territorial/proposal.md` |
| specs (delta) | Filesystem | `openspec/changes/archive/2026-08-29-capa-territorial/specs/{autorizacion-roles,padron-ciudadano,jerarquia-territorial,domicilios,residencias}/spec.md` |
| design | Filesystem | `openspec/changes/archive/2026-08-29-capa-territorial/design.md` (17 secciones) |
| tasks.md (disco) | Filesystem | `openspec/changes/archive/2026-08-29-capa-territorial/tasks.md` — 120/120 tareas `[x]`, 0 sin marcar |
| invariantes-criticos.md | Filesystem | `docs/architecture/invariantes-criticos.md` |
| Codigo implementado | Filesystem | `src/modules/territorio/`, `src/modules/padron/application/{personaPorId,identidadesDePersona}.ts`, `src/shared/auth/roles.ts`, `src/shared/lib/fecha.ts` |

## Task Completion Gate

`tasks.md` en disco: 120 lineas `- [x]`, 0 lineas `- [ ]` (`grep -c`). El gate pasa sin necesidad de reconciliacion.

## Native Review Receipt Gate

No aplica: `reviewGate` no esta activo en este repositorio (receipt-driven development es opt-in y no fue habilitado). Las siete rebanadas se revisaron por la via ordinaria del repositorio — GGA en CI (multiples rondas por rebanada, techo de dos rondas aplicado segun `CLAUDE.md`, con ciclos posteriores dedicados a hallazgos concretos). PR #31 fue la mas intensa: cuatro rondas de GGA, corrigiendo violaciones de capas (importar `PersonaId` de `padron` desde `territorio`), division de puertos por tamano (`puertos.ts` + `puertosDeResidencias.ts`), una funcion muerta (`vigenciaValida`), y un bug real de UI (`HistorialDeResidencias.tsx` marcaba todas las residencias abiertas como "Vigente", no solo la mas reciente). Rondas 2–3 encontraron hallazgos reales; la ronda 4 fue sobre opiones de diseno explicitamente aceptadas (retencion de `string` sin marca para `personaId` en puertos, y `registrarMudanza` en 200+ lineas) que quedaron fijas tras revision.

## Regla 1 de `openspec/config.yaml` — advertir antes de fusionar deltas que remuevan invariantes criticos

**Verificado, sin hallazgos.** Todos los deltas (autorizacion-roles, padron-ciudadano, jerarquia-territorial, domicilios, residencias) son exclusivamente `ADDED` — ninguna seccion `REMOVED` ni `MODIFIED`. Los deltas refuerzan el invariante 1 (`FORCE ROW LEVEL SECURITY` + FKs compuestos contra `(id, ayuntamientoId)`): todas las cuatro tablas nuevas (`lugares`, `calles`, `domicilios`, `residencias`) y el FK compuesto a mano de `residencias.personaId` hacia `personas` fortalecen el aislamiento.

## Regla 2 de `openspec/config.yaml` — confirmar test de aislamiento archivado para toda tabla con `ayuntamiento_id`

**Verificado.** Cuatro tablas operativas nuevas con `ayuntamiento_id`:
- `lugares` — test de aislamiento existe: `src/modules/territorio/lugares.isolation.test.ts`
- `calles` — test de aislamiento existe: `src/modules/territorio/calles.isolation.test.ts`
- `domicilios` — test de aislamiento existe: `src/modules/territorio/domicilios.isolation.test.ts`
- `residencias` — test de aislamiento existe: `src/modules/territorio/residencias.isolation.test.ts` (incluye FK compuesto a `personas`)

Todos cuatro tests nacieron en la Rebanada 2 (PR #26) como indica `tasks.md` §Nota 1.

## Verificacion de requisitos contra el codigo

### Autorizacion Roles (delta de 1 requirement)

| Requirement | Estado |
|---|---|
| Regla `puedeAdministrarTerritorio` limitada a `ADMIN_MUNICIPAL` para reparenteo y renombre de calles | ✅ `src/shared/auth/roles.ts`, lógica pura; `territorio/application/{reparentearLugar,renombrarCalle}.ts` verifican la regla antes de escribir; tests en `roles.test.ts` |

### Padron Ciudadano (delta de 1 requirement)

| Requirement | Estado |
|---|---|
| Lectura compuesta de persona por id mediante `personaPorId` compuesto en `padron` | ✅ `src/modules/padron/application/{personaPorId,identidadesDePersona}.ts` existen; compuestos en `padron/composicion.ts`; reexportados nombrados en `padron/index.ts`; no usan `export *`; consumidos por `territorio/infrastructure/lectorDePersonasPorPadron.ts` (adaptador que resuelve fusion colapsada) |

### Jerarquia Territorial (5 requirements, 20 escenarios)

| Requirement | Estado |
|---|---|
| Lugares es tabla de lista de adyacencia, sin `ltree`, sin tabla de cierre | ✅ `esquema.ts`: `padreId` nullable hacia misma tabla; `tipo` discriminador; permitte ausencia de niveles intermedios |
| Orden estricto de tipos: {cabecera, comisaria} < colonia < sector < manzana | ✅ `domain/tipoDeLugar.ts`: tabla de rangos + `puedeContener(padre, hijo)` comprueba orden; `check("lugares_tipo_valido")` valida enum; `check("lugares_sin_autopadre")` rechaza ciclos de largo 1 |
| Aislamiento de lugares: `FORCE RLS` + FK compuesto `padreId` | ✅ `politicaTenant("lugares")` + `.enableRLS()` + FK compuesto en `lugares_padre_tenant_fk` |
| Alta/edicion/baja/reparenteo con bitacora | ✅ Casos de uso en `application/{altaDeLugar,editarLugar,darDeBajaLugar,reparentearLugar}.ts` registran en la misma transaccion |
| Subarbol en una sola consulta con CTE | ✅ `infrastructure/repositorioDeLugaresSql.ts`: `subarbol` CTE con profundidad max 8; no exige niveles intermedios |

### Calles (2 requirements, 6 escenarios)

| Requirement | Estado |
|---|---|
| Catalogo cerrado por asentamiento, sin normalizacion | ✅ `esquema.ts`: `lugarId NOT NULL` (siempre referencia un lugar explícito, nunca `NULL` para cabecera); unicidad compuesta `(lugarId, nombre)` |
| Aislamiento: `FORCE RLS` + FKs compuestos | ✅ `politicaTenant("calles")` + `.enableRLS()` + FK compuesto hacia `lugares` + hacia `lugares` en transversales |

### Domicilios (7 requirements, 16 escenarios)

| Requirement | Estado |
|---|---|
| Cuelga del nivel conocido mas profundo, sin exigir intermedios | ✅ `esquema.ts`: `lugarId NOT NULL` pero sin chequeo de profundidad (la frontera es la consulta de datos, no la migracion) |
| `numero` texto nullable, nunca centinela "S/N" | ✅ `esquema.ts`: `numero` es `text()` sin `notNull()` |
| Transversales: dos referencias nullable, distintas entre si y de `calleId` | ✅ `esquema.ts`: `entreCalleAId` y `entreCalleBId` uuid nullable; `check("domicilios_calles_distintas")` fuerza distincion (NULL no falla el check, que es lo esperado: la restriccion es "cuando presentes, distintas") |
| Aislamiento: `FORCE RLS` + FKs compuestos | ✅ `politicaTenant("domicilios")` + `.enableRLS()` + FKs compuestos en todas las referencias a `lugares` y `calles` |
| Reparentear/renombrar no toca domicilios | ✅ `repositorioDeLugaresSql` solo actualiza `lugares` en reparenteo; `renombrarCalle` solo toca `calles` |
| Consulta por zona y por calle | ✅ `repositorioDeDomiciliosSql.ts`: `porLugarYSubarbol` reutiliza CTE; `porCalle` es `WHERE calleId = ?` directo |
| Domicilio sin residentes es valido | ✅ No hay `NOT NULL` de `residencias.domicilioId` en el lado de `domicilios` |

### Residencias (6 requirements, 16 escenarios)

| Requirement | Estado |
|---|---|
| Relacion temporal persona-domicilio: `desdeEn` + `hastaEn` nullable (NULL = vigente) | ✅ `esquema.ts`: ambas columnas presente; `date` para fechas civiles |
| A lo sumo una abierta por persona: indice unico parcial | ✅ `uniqueIndex("residencias_una_abierta_idx").where(isNull(hastaEn))` sobre `(ayuntamientoId, personaId)` |
| Mudanza atomica: cerrar + abrir en una transaccion | ✅ `registrarMudanza.ts` abre `withTenant`, llama `cerrarAbierta` + `abrir`, registra dos trazas en la misma tx |
| Sin motivo de mudanza | ✅ Ninguna columna de motivo en el esquema |
| FK compuesto a `personas(id, ayuntamiento_id)` en migracion | ✅ Mano en `drizzle/0007_territorio.sql`: FK `residencias_persona_tenant_fk` compuesto |
| Aislamiento: `FORCE RLS` + FK compuesto a `domicilios` | ✅ `politicaTenant("residencias")` + `.enableRLS()` + FK compuesto en `residencias_domicilio_tenant_fk` |
| Sin cascada de fusion; colapso en lectura | ✅ `registrarMudanza` no toca fusion; `historialDeResidencias.ts` consulta `LecturaDePersonas.identidadesDe` para resolver todas las identidades colapsadas; UI desempatiza por `desdeEn DESC` |

## Sincronizacion de specs — resultado

Cinco dominios en esta operacion:

| Domain | Accion | Details |
|---|---|---|
| `padron-ciudadano` | **Modificado (merge)** | Delta de 1 requirement / 2 escenarios sobre lectura compuesta agregado al final, mismo patron que el requirement de exportacion que ya vivia ahi. Copia mecanica, `diff` readback: vacio ✓ |
| `autorizacion-roles` | **Modificado (merge)** | Delta de 1 requirement / 5 escenarios (`puedeAdministrarTerritorio`) agregado al final, mismo patron que el requirement de `puedeFusionarPersonas` que ya vivia ahi. Copia mecanica, `diff` readback: vacio ✓ |
| `jerarquia-territorial` | **Creado** | Spec nueva (5 requirements / 20 escenarios). Copia mecanica del delta, `diff` readback: vacio ✓ |
| `domicilios` | **Creado** | Spec nueva (7 requirements / 16 escenarios). Copia mecanica del delta, `diff` readback: vacio ✓ |
| `residencias` | **Creado** | Spec nueva (6 requirements / 16 escenarios). Copia mecanica del delta, `diff` readback: vacio ✓ |

## Movimiento a archivo — resultado

`git mv openspec/changes/capa-territorial openspec/changes/archive/2026-08-29-capa-territorial`. Confirmado que `openspec/changes/capa-territorial` ya no existe. Este archivo (`archive-report.md`) es aditivo.

## Test coverage y verificacion mecanica — estado final

- `pnpm vitest run --project unit` — 388/388 (a la fecha de este archivado)
- `pnpm vitest run --project integration` (Postgres real) — 188/188
- `pnpm check` (biome + tsc + depcruise) — exit 0, sin violaciones de capas
- Cobertura `territorio/domain` + `territorio/application`: ~97.7% statements / ~91.2% branches / ~98.1% functions / ~98.5% lines (medido en PR #31, superior al piso 80/75 de `vitest.config.ts`)
- Siete PRs, uno por rebanada, todos mergeados a `main`: #26 (esquema/aislamiento), #27 (casos de uso lugares/arbol), #29 (calles), #30 (domicilios), #31 (residencias/mudanza, 4 rondas GGA), #32 (exportacion)

## Limitaciones declaradas — persistidas en el registro

1. **`identidadPorPuerto.test.ts` no cubre `.sql` de `scripts/` ni nombres de tabla armados dinamicamente.** Documentado en el propio test (heredado de `padron`).
2. **`puertos.ts` + `puertosDeResidencias.ts` por tamano.** Hallazgo de GGA ronda 4 PR #31: `puertos.ts` original llego a 288 lineas. Metrica 200 lineas por archivo aplicada al recorte, sin cambio de diseño logico.
3. **`registrarMudanza` en 200+ lineas.** Aceptado explicitamente tras GGA ronda 4 PR #31: la operacion atomica (cerrar + abrir + trazas) no se puede partir sin exponerla a estados intermedios observables.
4. **`personaId` como `string` sin marca de tipo.** Aceptado explicitamente tras GGA ronda 4 PR #31: resuelve la colision entre "no importar `PersonaId` de `padron`" (AGENTS.md antipatron 8) y "IDs marcados" (AGENTS.md regla general). Solo `lectorDePersonasPorPadron.ts` hace la conversion.
5. **`puedeAdministrarTerritorio` aplica a reparenteo y renombre, no a alta/baja de lugares.** Documentado en delta y requirement: la estructura se toca en reparenteo (reescribe la jerarquia); alta/baja/edicion son trabajo de mostrador.
6. **Sin superficie activa de llamadores de `porcionesDeTerritorio` hoy.** `src/app/exportacion/porciones.ts` integra las cuatro porciones en la plataforma; ningun `Server Action` ni pagina las invoca aun — queda lista para Fase 8 (scope fuera de este cambio).

## Ciclo SDD completo

`capa-territorial` fue implementado en siete rebanadas incrementales (puerto de lectura compuesto en `padron`, esquema/aislamiento, casos de uso lugares/arbol, catalogo calles, domicilios, residencias/mudanza, exportacion), cada una con TDD estricto, revision de GGA en CI, y su propio PR mergeado a `main`. Verificado contra 20 requirements y 74 escenarios, con una evaluacion de diseno explicitamente aceptada (retencion de `string` sin marca para `personaId` en la frontera entre modulos, limitando la importacion cruzada de tipos de dominio). `openspec/specs/{autorizacion-roles,padron-ciudadano,jerarquia-territorial,domicilios,residencias}/spec.md` son ahora la fuente de verdad para estas capacidades. El cambio esta cerrado.
