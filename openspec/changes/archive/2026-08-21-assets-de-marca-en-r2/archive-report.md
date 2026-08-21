# Archive Report — assets-de-marca-en-r2

**Archivado**: 2026-08-21
**Modo de artefactos**: hybrid (OpenSpec + Engram)
**Archivado en**: `openspec/changes/archive/2026-08-21-assets-de-marca-en-r2/`
**Rama de trabajo**: `chore/archivar-assets-marca` (cut from `main` after both PRs merged)

## Trazabilidad — artefactos leidos

| Artefacto | Fuente | Referencia |
|---|---|---|
| proposal | Engram | `sdd/assets-de-marca-en-r2/proposal` obs #4390 |
| spec (delta) | Engram | `sdd/assets-de-marca-en-r2/spec` obs #4394 |
| design | Engram | `sdd/assets-de-marca-en-r2/design` obs #4392 |
| tasks | Engram | `sdd/assets-de-marca-en-r2/tasks` obs #4395 |
| verify-report | Engram | `sdd/assets-de-marca-en-r2/verify-report` obs #4401 |
| specs (delta, versiones finales) | Filesystem | `openspec/changes/assets-de-marca-en-r2/specs/{marca-municipal,autorizacion-roles}/spec.md` — copiados a `openspec/specs/` antes de archivar |
| tasks.md (disco) | Filesystem | `openspec/changes/assets-de-marca-en-r2/tasks.md` — 43/43 tareas `[x]`, 0 sin marcar |

## Task Completion Gate

`tasks.md` en disco: 43 lineas `- [x]`, 0 lineas `- [ ]` (verificado visualmente). El gate pasa sin necesidad de reconciliacion.

## Native Review Receipt Gate

No aplica: no se encontro `reviewGate` en estado (archivado bajo politica ordinaria del repositorio; no hay receipt generado para este cambio).

## Sincronizacion de specs — resultado

Dos dominios fusionados en esta operacion:

| Domain | Accion | Details |
|---|---|---|
| `marca-municipal` | **Creado** | Spec nueva (8 requirements / 16 scenarios). Copia mecanica via shell: `cp openspec/changes/.../marca-municipal/spec.md openspec/specs/marca-municipal/spec.md`. `diff -r` readback: vacio ✓ |
| `autorizacion-roles` | **Modificado (merge)** | Delta de 1 requirement / 3 scenarios (`puedeCambiarMarca`) fusionado al final de `openspec/specs/autorizacion-roles/spec.md`. Requirement nuevo append tras "Baja logica de usuarios". |

Ambas operaciones verificadas con `diff -r` (vacio en ambos casos).

## Movimiento a archivo — resultado

`git mv openspec/changes/assets-de-marca-en-r2 openspec/changes/archive/2026-08-21-assets-de-marca-en-r2`. Confirmado que `openspec/changes/assets-de-marca-en-r2` ya no existe. `diff -r` entre snapshot recursivo previo al movimiento y la carpeta archivada: vacio. Este archivo (`archive-report.md`) es aditivo.

## Correccion de documentacion — estado final reportado

El `verify-report` (Engram obs #4401, snapshot del 2026-08-21 10:34) identifica tres hallazgos de drift entre propuesta/design y el codigo implementado:

1. **`design.md` referencias a ruta — YA CORREGIDO, no queda drift.** El `verify-report` es un snapshot de las 10:34 y encontro tres referencias a `(acceso)/marca/page.tsx`. Se corrigieron en el commit `95897dd` (PR #10), junto con el parrafo que justificaba `(acceso)` y que afirmaba lo contrario de lo que hace el codigo. El `design.md` archivado dice `(panel)/marca/page.tsx` en los tres lugares (lineas 53, 117, 492) y explica por que se movio. Verificado sobre el archivo archivado, no sobre el snapshot.

2. **`proposal.md` — anotado a proposito, no desincronizado por olvido.** Su cuerpo sigue diciendo `src/shared/ui/marca.ts`, porque un proposal es un documento de un momento y sus decisiones eran ciertas cuando se tomaron. Lleva una nota al principio (linea 6) que declara los dos movimientos posteriores: la validacion vive en `src/shared/marca/validacion.ts` y el caso de uso recibe dos puertos, no uno. `design.md` es el que manda.

3. **Scenarios sin cobertura de test** — El `verify-report` reporta tres gaps en cobertura (dos WARNINGS, una SUGGESTION):
   - Scenario 6 ("Bytes que no son PNG aunque el nombre diga .png"): NO tiene test de integracion que pruebe "ningun PUT llega al almacen". El codigo es estructuralmente correcto (`cambiarEscudo.ts:135-142` ejecuta `exigirPngValido` antes de `almacen.guardar`), confirmado por inspeccion; el domain-level test existe (`png.test.ts:63,70`). Brecha de coverage, no bug.
   - Scenario 3 ("SUPER_ADMIN no puede cambiar marca"): probado solo a nivel de regla (`roles.test.ts:164`), no end-to-end en `cambiarEscudo`. Type system hace imposible forzar un `ayuntamientoId` distinto (Scenario 5), asi que el riesgo de esa brecha es bajo.
   - Scenario 16 ("Pantalla sin escudo sin cambios"): no tiene test dedicado; se infiere de "archivos no modificados" + E2E global (confirmado via `git log` — `(acceso)/layout.tsx` y `acceso/page.tsx` intactos desde el commit 5920d0c).

   Estas brechas fueron aceptadas por la propuesta (capacidad de MVP, no bugs criticos). El state del codigo es verde.

## Limitaciones declaradas — persistidas en el registro

El `proposal.md` declara explicitamente cinco limitaciones de scope que permanecen, todas aceptadas:

1. **PNG unicamente** — JPG es limitacion declarada. Futura: byte-sniffer secundario para JPEG si el municipio solo tiene scans.
2. **No hay ruta de "quitar escudo"** — reemplazar es el path (no borrar separadamente). Futura: RemovedEscudo(entidad) si se necesita desnudez.
3. **Orphanos acotados** — una falla entre commit + borrado diferido deja ~1 MiB por municipio. Aceptado. Mitigacion: el borrado falla en log, no en la respuesta.
4. **Dos escenarios sin test automatizado**:
   - El escudo realmente llega a R2 y sobrevive un redeploy (no hay creds R2 en CI).
   - Login screen sin escudo es verdaderamente unchanged (inferred de files untouched + E2E global, no assertion explicita).
   Ambos son "manual by design". Registrados en `tasks.md` (sin checkbox).
5. **URL exportada muere si el bucket se desmonta** — los bytes del escudo no van en la exportacion. Cambio siguiente: enviar asset + JSON en un Bundle.

## Test coverage y verificacion mecanica — fecha, estado final

Cifras aportadas por el lanzador (usuario: main verde, 278 tests / 45 files, tsc clean, dependency-cruiser 0 violations; no re-ejecutado en esta fase):

- `pnpm test` — 278/45 (incluye isolation tests para T10 en Postgres)
- `pnpm check` — exit 0, sin violaciones de capas
- Coverage — (no cifra reportada; piso 80% en shared/modules domain+application per AGENTS.md)
- PR #9 (Phases 1-4) — merged, commit `0f1d630`
- PR #10 (Phases 5-7) — merged, `chore/archivar-assets-marca` cut from main after both

## Contenido del archivo

- `proposal.md` (decision-point snapshot, deliberadamente NO reescrito post-correccion)
- `specs/marca-municipal/spec.md` (8 requirements / 16 scenarios, spec completo)
- `specs/autorizacion-roles/spec.md` (delta de 1 requirement / 3 scenarios fusionado)
- `design.md` (15 secciones, rutas corregidas en `95897dd`)
- `tasks.md` (43/43 tareas completas)
- `archive-report.md` (este archivo, aditivo)

## Ciclo SDD completo

`assets-de-marca-en-r2` fue planificado, implementado en dos PRs (Phases 1-4, Phases 5-7), verificado con hallazgos no-CRITICAL de coverage (gaps de test aceptados, limitaciones declaradas), y archivado. `openspec/specs/{marca-municipal,autorizacion-roles}/spec.md` es ahora la fuente de verdad para estas capacidades. El cambio esta cerrado.

Conocidos en el registro para futuro:
- `design.md` quedo sincronizado con el codigo; `proposal.md` conserva su texto de origen con la nota de correccion arriba, a proposito.
- Dos scenarios tienen NO automated test pero codigo verificado: R2 persistence (no CI creds), login-without-escudo (files untouched).
- Limitaciones de MVP aceptadas: PNG only, no remove-only path, bounded orphans ~1 MiB, export carries URL not bytes.
