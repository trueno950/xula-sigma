# SDD Archive Report — constancias-oficios (Fase 2)

**Change**: `constancias-oficios` (Constancias y oficios — Fase 2)
**Status**: COMPLETE AND ARCHIVED
**Archive Location**: `openspec/changes/archive/2026-08-30-constancias-oficios/`
**Archive Date**: 2026-08-30

## Artifact Traceability

Todos los artefactos del change fueron recuperados y quedan registrados con
su id de observacion de Engram, para auditoria y reproducibilidad:

| Artifact | Engram Observation ID | Retrieved | Status |
|----------|----------------------|-----------|--------|
| Proposal | #4445 | ✅ | Complete |
| Specification | #4446 | ✅ | Complete |
| Design | #4447 | ✅ | Complete |
| Tasks | #4448 (rev. 2) | ✅ | Complete |
| Verify Report | — | N/A | No se persistio: las 8 fases completaron su implementacion, pasaron verificacion (`pnpm check`, `pnpm test`, `pnpm test:integration` en verde en cada PR) y fueron mergeadas a `main` (PRs #35-#42, commit final `0178b72`). El trabajo queda verificado por los commits mergeados y los resultados de CI. |

## Specification Merge Summary

### Delta specs fusionados (4 dominios existentes)

| Domain | Type | Change | Details |
|--------|------|--------|---------|
| `autorizacion-roles` | DELTA | ADDED 1 req | `Regla de autorizacion para administrar documentos oficiales` — regla nueva `puedeAdministrarDocumentos` (ADMIN_MUNICIPAL) para cancelar constancias y configurar el bloque de firma; emision/reimpresion siguen bajo `puedeEscribir` generico |
| `autenticacion-municipal` | DELTA | MODIFIED 1 req | `Limitacion de ritmo sin bloqueo persistente` — extendida a la validacion publica de folio (misma tabla, ventana y hash de clave que los intentos de acceso) |
| `residencias` | DELTA | ADDED 1 req | `Lectura de residencia vigente para consumidores externos` — caso de uso que aplica la regla de desempate existente y devuelve ausencia explicita cuando no hay residencia vigente |
| `domicilios` | DELTA | ADDED 1 req | `Direccion compuesta como texto imprimible` — caso de uso que compone el texto completo de la direccion sin que el consumidor conozca la jerarquia de `lugares` |

Verificacion de lectura: los cuatro merges fueron revisados a mano (`git diff`)
antes de commitear — no solo por el reporte del subagente. Las specs
principales conservan todos los requirements existentes y agregan los
nuevos al final de la seccion de Requirements.

### Specs nuevas creadas (2 dominios)

| Domain | Status | File |
|--------|--------|------|
| `emision-de-constancias` | Created | `openspec/specs/emision-de-constancias/spec.md` |
| `validacion-publica-de-folio` | Created | `openspec/specs/validacion-publica-de-folio/spec.md` |

Verificacion de copia mecanica: ambos archivos comparados con `diff -r`
contra su origen en el change — identicos, cero diferencias.

## Archive Contents Verification

✅ Carpeta movida: `openspec/changes/constancias-oficios/` →
`openspec/changes/archive/2026-08-30-constancias-oficios/`

✅ Movimiento verificado con `diff -r` — cero diferencias (sin truncar, sin
alterar contenido)

✅ Artefactos preservados en el archive: `proposal.md`, `design.md`,
`tasks.md`, `exploration.md`, `specs/` (6 archivos de capacidad: 2 specs
nuevas completas + 4 delta specs)

✅ Task Completion Gate: las 146 tareas de implementacion marcadas `- [x]`
en `tasks.md`. Cero tareas sin marcar.

✅ `openspec/changes/constancias-oficios/` ya no existe (verificado).

## Product Gate — Revision de impresion (no es bloqueo de codigo)

**El gate de revision de impresion de la Fase 5 sigue formalmente abierto y
ningun agente puede cerrarlo:**

- Requiere revision fisica de una hoja impresa (constancia de vecindad:
  formato, legibilidad, area del sello) por el operador del municipio
  piloto.
- Se ubica en el flujo entre la Fase 5 (render de PDF) y la Fase 6
  (reimpresion/cancelacion).
- Estado actual: no cerrado — a la espera de la revision fisica del
  piloto.
- Bloquea disponibilidad de producto, no el archive de codigo: la Fase 6
  quedo bloqueada por politica de producto, pero el archive del trabajo
  completado procede igual.
- Solo el municipio piloto puede aprobarlo; ningun test, script o
  artefacto de codigo reemplaza la revision fisica.

## Changes Merged to Main

- `openspec/specs/autorizacion-roles/spec.md` (actualizada, +1 requirement)
- `openspec/specs/autenticacion-municipal/spec.md` (actualizada, 1 requirement modificado)
- `openspec/specs/residencias/spec.md` (actualizada, +1 requirement)
- `openspec/specs/domicilios/spec.md` (actualizada, +1 requirement)
- `openspec/specs/emision-de-constancias/spec.md` (nueva, 15 requirements, 25 scenarios)
- `openspec/specs/validacion-publica-de-folio/spec.md` (nueva, 7 requirements, 8 scenarios)
- `openspec/changes/archive/2026-08-30-constancias-oficios/` (rastro de auditoria completo)

## SDD Cycle Complete

`constancias-oficios` (Fase 2) quedo completamente planeado, especificado,
disenado, tareado, implementado (8 fases), verificado y archivado. Sin
dependencias ni seguimientos pendientes a nivel de codigo.

Session: 2ba6b11e-fdcd-40f3-803e-aaebaad949b8
Project: xula-sigma
