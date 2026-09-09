# Informe de archivo: territorio-calles-coordenadas-y-reasignacion

**Fecha de archivo**: 2026-09-07  
**Cambio**: `territorio-calles-coordenadas-y-reasignacion`  
**Modo**: Hybrid (OpenSpec + Engram)  
**Estado**: CERRADO — planificación, implementación, verificación y archivo completados

## Resumen ejecutivo

El cambio fue archivado después de sincronizar sus dos delta specs con
`openspec/specs/` y mover mecánicamente la carpeta completa a
`openspec/changes/archive/2026-09-07-territorio-calles-coordenadas-y-reasignacion/`.
La verificación final independiente fue `PASS WITH WARNINGS`, con 10/10
requisitos, 13/13 escenarios, cero blockers y cero critical findings.

## Estado final y puertas de cierre

- El estado nativo previo al archivo reportó `artifactStore: openspec` para el
  árbol repo-local, `nextRecommended: archive`, `archive: ready` y contexto
  `repo-local` dentro de `/Users/joelmay/Documents/Projects/xula-sigma`.
- El `reviewGate` estuvo ausente. No se descubrió una revisión para este
  candidato; el archivo procede bajo la política ordinaria del repositorio,
  sin habilitar ni investigar una puerta de revisión inexistente.
- La puerta de tareas se cumplió: el `tasks.md` vigente tenía 13/13 tareas
  `[x]`, y la copia archivada conserva las 13 tareas marcadas `[x]`, sin
  checkboxes de implementación pendientes.
- La observación Engram `#4528` de `tasks` fue leída como snapshot anterior y
  todavía contenía casillas pendientes de ese momento. El archivo actual y el
  estado nativo posterior son la evidencia final; no se propagó ese snapshot
  histórico como estado vigente.
- No se hizo reconciliación excepcional de checkboxes: la implementación ya
  había actualizado el artefacto persistido antes de este archivo.

## Corrección acotada y verificación final

La verificación previa encontró tres blockers de cobertura. El maintainer
autorizó una remediación acotada. Durante ella solo se agregaron o modificaron
estos archivos de tests; no se modificaron código de producción ni artefactos
de planificación:

- `src/modules/territorio/application/callesFoundation.todo.test.ts`
- `src/modules/territorio/ui/mapa.test.tsx`
- `src/modules/territorio/calles.integration.test.ts`

La verificación Strict TDD independiente posterior cerró los tres blockers y
confirmó:

| Evidencia final | Resultado |
|---|---:|
| Requisitos | 10/10 |
| Escenarios | 13/13 |
| Tests totales | 1204 |
| Tests de integración | 289 |
| Tests E2E | 11/11 |
| Coverage de statements | 97.75% |
| Coverage de branches | 92.69% |
| Build | Pasó |
| `pnpm check` | Pasó |
| `git diff --check` | Pasó |
| Blockers | 0 |
| Critical findings | 0 |

El reporte final canónico es el `verify-report.md` archivado, con
`verdict: pass_with_warnings` y `evidence_revision:
sha256:0e15541cd7c1f25634f439da95a5b211c64e90b2bf474904052e5856a8e99dec`.
Las advertencias restantes son informativas: trazabilidad histórica del
safety net TDD, coverage de branches menor a 80% en dos archivos, coupling de
aserciones y ausencia de un dispatch real en navegador del evento `tileerror`
de Leaflet. No bloquean el archivo.

## Specs sincronizadas

| Dominio | Acción | Detalle |
|---|---|---|
| `georreferenciacion-de-calles` | **Created** | Se creó `openspec/specs/georreferenciacion-de-calles/spec.md` mediante copia shell mecánica del spec completo: 6 requirements y 7 scenarios. |
| `jerarquia-territorial` | **Updated** | Se agregaron 4 requirements y 6 scenarios; se preservaron todos los requirements no mencionados por el delta. No hubo modificaciones, renombres ni eliminaciones. |

No hubo un delta destructivo: no se removieron invariantes ni requirements,
por lo que la regla `rules.archive` de advertir antes de una eliminación no
requirió confirmación adicional. Tampoco se creó una tabla nueva con
`ayuntamiento_id`; las columnas nuevas pertenecen a `calles`, y
`src/modules/territorio/calles.isolation.test.ts` está presente para su
aislamiento.

## Operación mecánica y readback

Antes del movimiento se creó un snapshot recursivo con `cp -R`. La carpeta
completa se movió con shell (`git mv` con fallback nativo a `mv`), se confirmó
que la fuente activa desapareció y se ejecutó el `diff -r` obligatorio contra
el snapshot previo. La salida literal de cada `diff -r` fue vacía.

### Readback de la copia del spec nuevo

```text

```

### Readback del movimiento de archivo

```text

```

## Ubicación y contenido archivado

**Ubicación exacta**:
`openspec/changes/archive/2026-09-07-territorio-calles-coordenadas-y-reasignacion/`

Contenido movido antes de agregar este informe:

- `proposal.md`
- `design.md`
- `apply-progress.md`
- `tasks.md` — 13/13 tareas completas
- `verify-report.md` — evidencia final `PASS WITH WARNINGS`
- `specs/georreferenciacion-de-calles/spec.md`
- `specs/jerarquia-territorial/spec.md`

Este `archive-report.md` se agregó después del `diff -r`, por lo que es el
registro aditivo de cierre y no altera la comparación de identidad del árbol
movido.

La carpeta activa
`openspec/changes/territorio-calles-coordenadas-y-reasignacion/` ya no existe.

## Trazabilidad de artefactos leídos en Engram

Se recuperaron las observaciones completas, no solo sus previews:

- `#4522` — `sdd/territorio-calles-coordenadas-y-reasignacion/proposal`
- `#4523` — `sdd/territorio-calles-coordenadas-y-reasignacion/spec`
- `#4524` — `sdd/territorio-calles-coordenadas-y-reasignacion/design`
- `#4528` — `sdd/territorio-calles-coordenadas-y-reasignacion/tasks` (snapshot histórico)
- `#4573` — `sdd/territorio-calles-coordenadas-y-reasignacion/verify-report`

También se leyeron directamente los artefactos repo-locales antes del
movimiento: `openspec/config.yaml`, `proposal.md`, las dos delta specs,
`design.md`, `tasks.md`, `apply-progress.md` y `verify-report.md`.

## Engram archive report

Este informe se persiste además en el topic:
`sdd/territorio-calles-coordenadas-y-reasignacion/archive-report`.

## Cierre

- ✅ Delta specs sincronizadas con la fuente de verdad.
- ✅ Carpeta completa movida al archivo fechado.
- ✅ Snapshot recursivo comparado con `diff -r` vacío.
- ✅ Tasks archivadas sin implementación pendiente.
- ✅ Verificación final sin blockers ni critical findings.
- ✅ Informe de archivo persistido en filesystem y Engram.

El cambio queda archivado y listo para el siguiente change.
