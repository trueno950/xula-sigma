# Tareas: Mapa operativo territorial

## Pronóstico de carga de revisión

| Campo | Valor |
|---|---|
| Código autoral | 700–950 líneas; presupuesto fijo 400; riesgo High |
| Excepción generada | Solo `drizzle/meta/0014_snapshot.json`, 3,350–3,500 líneas; excepción estrecha; ninguna unidad manuscrita tiene excepción |
| Cadena | L0 → U3a → U3b → U4a → U5 → U6 → U7 → U8 |
| Estrategia | `ask-on-risk`; `feature-branch-chain` confirmada |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Unidades de trabajo sugeridas

| U | Entrega | Test enfocado | Runtime / rollback |
|---|---|---|---|
| L0 | Solo `drizzle/meta/0014_snapshot.json`; N/A aplicación | N/A; `pnpm db:local && pnpm db:generate && pnpm db:migrate` + `No schema changes` | Borrar snapshot; preservar SQL/journal |
| U3a | Eventos, RLS y lecturas; no NOTIFY | `pnpm vitest run --project integration src/modules/territorio/eventosDeCalles.isolation.test.ts` | `pnpm db:local && pnpm db:migrate && pnpm test:integration`; revertir U3a |
| U3b | NOTIFY transaccional de calle; sin LISTEN/SSE | `pnpm vitest run --project unit src/shared/notificaciones/notificar.test.ts` | `pnpm test:integration -- notificar`; retirar notificaciones |
| U4a | Lectura de reportes; U4b separada | `pnpm vitest run --project unit src/modules/reportes/application/listarReportesParaMapa.test.ts` | `pnpm test:integration -- mapa`; revertir lectura |
| U5 | Historial solo lectura | `pnpm vitest run --project unit src/modules/historial-de-calle/application/leerHistorialDeCalle.test.ts` | `pnpm test:integration -- historial`; retirar módulo |
| U6 | Mapa y snapshot | `pnpm vitest run --project unit src/modules/mapa-operativo/application/agregarMapa.test.ts src/modules/mapa-operativo/ui/MapaOperativo.test.tsx` | `pnpm test:e2e --grep mapa`; retirar módulo/ruta |
| U7 | LISTEN/SSE, hub, selección/consumo de canal y resync; sin polling | `pnpm vitest run --project unit src/shared/ui/EstadoEnVivo.test.tsx 'src/app/(panel)/eventos/route.test.ts'` | `pnpm test:e2e --grep desconexión` después de D1/D2; desmontar |
| U8 | Navegación y journey | `pnpm test:e2e --grep "mapa operativo"` | Sesión + pérdida SSE; revertir navegación/journey |

0014 está confirmada por el mantenedor en `xula_dev` y ya en `xula_test`; no
se afirma staging ni producción.

### Bloqueadores y decisiones explícitas

- **D1:** falta owner para publicar en vivo alta, estado y corrección de
  `intervenciones`.
- **D2:** falta aprobar el payload exacto de `reporte` e `intervencion`.
- Programables: L0, U3a, U3b, U4a, U5 y U6. U4b-publicación, U7-live y U8
  quedan bloqueadas por D1/D2; no se inventa resolución.

## Fases TDD

### Fase 1: Contrato y fundación
- [x] 1.1 U0: delta de territorio.
  - [x] 1.2 U1: RLS/FK/aislamiento.
  - [x] 1.2a U1a: dominio/tablas.
  - [x] 1.2b U1b: revisiones/correcciones/estados/UI.
    - [x] 1.2b.1 Hardening.
    - [x] 1.2b.2 Corrección.
    - [x] 1.2b.2a Transacción.
    - [x] 1.2b.2b `reporteId` tenant-scoped.
    - [x] 1.2b.3 Estados/UI.
    - [x] 1.2b.3a Transiciones.
    - [x] 1.2b.3a.1 Carrera/rollback.
  - [x] 1.2b.3b Actions/UI/navegación.
    - [x] 1.2b.3b.1 Acción/formulario.
    - [x] 1.2b.3b.1a Sesión/tenant.
    - [x] 1.2b.3b.2 Ficha/corrección.
- [x] 1.3 U2: `puedeEscribir` registra; regla nueva administra.

### Fase 2: Persistencia y publicación acotada
- [x] 2.1 L0 N/A→GREEN: generar solo `drizzle/meta/0014_snapshot.json` en copia con journal a 0013; preservar `drizzle/0014_revisiones_intervenciones.sql` (read-only) y `drizzle/meta/_journal.json` (read-only) byte a byte.
- [x] 2.2 U3a RED: tests `eventosDeCalles.isolation.test.ts`, `callesParaMapa.test.ts`, `callePorId.test.ts` en `src/modules/territorio/`.
- [x] 2.3 U3a GREEN: `drizzle/0015_eventos_de_calles.sql` y `src/modules/territorio/{infrastructure/{esquema.ts,repositorioDeCallesSql.ts,index.ts},application/{puertos.ts,altaDeCalle.ts,renombrarCalle.ts,reparentearCalle.ts,ubicarCalle.ts},composicion.ts}`; RLS/FORCE/GRANT S-I/FK, naturaleza/referencias cerradas sin JSON/nombres/coordenadas/descripciones/PII, misma tx, conserva `puedeAdministrarTerritorio`, sin writer genérico, lecturas sin permiso administrativo, `ALTA` excluida y orden determinista.
- [x] 2.4 U3b RED: tests de payload, canal y rollback en `src/shared/notificaciones/`.
- [x] 2.5 U3b GREEN: crear `src/shared/notificaciones/{canales.ts,notificar.ts}`; publicar solo `{ tipo: "calle", id, cambio: "estructura" }`, sin LISTEN/SSE.
- [x] 2.6 U4a RED: tests de lectura en `src/modules/reportes/` para nulos, tenant y campos protegidos.
- [x] 2.7 U4a GREEN: modificar `src/modules/reportes/application/{puertos.ts,listarReportesParaMapa.ts}` y `src/modules/reportes/infrastructure/{listadoDeReportesSql.ts,index.ts}`; sin NOTIFY. U4b queda separada y bloqueada por D1/D2.

### Fase 3: Proyección y mapa
- [x] 3.1 U5 RED: tipos, empate, 404 y vacío.
- [x] 3.2 U5 GREEN: `src/modules/historial-de-calle/`; solo lectura, tres naturalezas.
- [x] 3.3 U6 RED: cobertura, filtros, conteos y tenant.
- [x] 3.4 U6 GREEN: `src/modules/mapa-operativo/`; snapshot, enlaces, sin GIS.

### Fase 4: Vivo y navegación
- [ ] 4.1 U7 RED: 401/canal/heartbeat/resync/tenant/no polling; D1/D2.
- [ ] 4.2 U7 GREEN: hub/ruta/isla; refresh manual, no polling.
- [ ] 4.3 U8 RED: sesión/mapa/historial/push.
- [ ] 4.4 U8 GREEN: navegación/ruta; live bloqueado por D1/D2.
- [ ] 4.5 Verificar sin `rtk`: `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, cobertura y `pnpm check`.
