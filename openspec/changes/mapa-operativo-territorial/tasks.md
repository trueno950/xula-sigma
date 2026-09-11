# Tareas: Mapa operativo territorial

## Pronóstico de carga de revisión

Estimación: 1,300–1,700 líneas; supera sesión 800 y límite 400.
División: 9 unidades. Estrategia `ask-on-risk`; slices encadenados por
`feature-branch-chain`.

Decision needed before apply: Resuelto por el usuario: `feature-branch-chain`
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Unidades de trabajo sugeridas

| U | Alcance, dependencias y archivos | RED primero / comando | Runtime | Rollback / líneas |
|---|---|---|---|---|
| 0 | Completar `openspec/changes/mapa-operativo-territorial/specs/territorio/spec.md` para `eventos_de_calles`, `callesParaMapa`, `callePorId`; bloquea U3/U5/U6/U7/U8. | `sdd-spec` define RED; no inventar / N/A | N/A: planificación | Retirar prerrequisito / 20–40 |
| 1 | Dominio, RLS, revisiones, `drizzle/0013_intervenciones.sql`, `src/shared/auth/roles.ts`. | RED dominio + `src/modules/intervenciones/{intervenciones,revisionesDeIntervenciones}.isolation.test.ts` / `pnpm test` + integración | `pnpm db:local`; alta/corrección por rol | Migración, módulo, permisos / 180–240 |
| 2 | Aplicación/UI en `src/modules/intervenciones/**`, ruta `src/app/(panel)/intervenciones/**`; depende U1. | RED registrar/estado/corrección, acciones, 403/404 / `pnpm test -- intervenciones` | Alta/corrección autenticadas | Revertir módulo/rutas / 160–220 |
| 3 | Eventos, lecturas, NOTIFY en `src/modules/territorio/**`, `drizzle/0014_territorio_eventos.sql`; bloqueada por U0. | RED + `eventosDeCalles.isolation.test.ts` según delta / `pnpm test:integration` | Mutaciones territoriales | Migración 0014 y cambios / 140–190 |
| 4 | Lectura operativa/NOTIFY en `src/modules/reportes/{application,infrastructure}/**`; independiente de U0. | RED campos, nulos, tenant, emisiones / `pnpm test -- reportes` | Registrar/cambiar/asignar reporte | Adaptadores y NOTIFY / 80–120 |
| 5 | Proyección/UI `src/modules/historial-de-calle/**`, ruta `[id]`; bloqueada por U0/U1/U3/U4. | RED naturalezas, orden, 404, vacío / `pnpm test -- historial-de-calle` | Historial con tres fuentes | Retirar módulo/ruta / 130–180 |
| 6 | Agregación/filtros/UI `src/modules/mapa-operativo/**`, ruta mapa; bloqueada por U0/U1/U3/U4. | RED marcadores, cobertura, conteos, tenant / `pnpm test -- mapa-operativo` | Mapa autenticado filtrable | Retirar mapa; snapshot intacto / 180–250 |
| 7 | Hub LISTEN/NOTIFY, SSE e isla en `src/shared/{notificaciones,tenancy,ui}/**`, `AGENTS.md`, `src/app/(panel)/eventos/route.ts`; bloqueada por U0/U6. | RED sin sesión→401; canal ignora cliente y deriva tenant; payload tipo/id/cambio+RLS; heartbeat; cierre→desconectada+resync / `pnpm test -- eventos` | E2E con desconexión controlada | Desmontar ruta/hub; snapshot sigue / 180–240 |
| 8 | Navegación y E2E en `src/app/(panel)/NavegacionDeModulos.tsx`, `e2e/mapa-operativo.spec.ts`; bloqueada por U5–U7. | RED sesión, mapa, historial, push / `pnpm test:e2e` | Flujo operador Motul/Ticul | Revertir navegación / 80–120 |

## Fases TDD

### Fase 1: Contrato y fundación
- [x] 1.1 Ejecutar U0; resolver el delta de `territorio` sin inventar aceptación.
- [ ] 1.2 RED y GREEN de U1; RLS y aislamiento de ambas tablas en el mismo slice. (U1a completa; U1b de aplicacion completa, acciones/UI pendientes.)
  - [x] 1.2a U1a; dominio, tabla `intervenciones`, RLS, FKs compuestos, registro base y aislamiento.
  - [ ] 1.2b U1b; revisiones append-only, correcciones y administración de estados (acciones/UI pendientes).
      - [x] 1.2b.1 U1b hardening; valores anteriores exactos, rollback atómico y lock concurrente.
      - [x] 1.2b.2 U1b-correction-application; permiso, corrección validada y bitácora atómica por id.
      - [x] 1.2b.2a U1b-correction-transaction-hardening; validación de ubicación y corrección/auditoría en la misma transacción, aislamiento y rollback.
      - [ ] 1.2b.3 U1b-state-administration; transiciones, acciones y UI de administración quedan pendientes.
        - [x] 1.2b.3a U1b-state-application; caso de uso ADMIN_MUNICIPAL, transiciones, tenant, bitácora y pruebas.
        - [x] 1.2b.3a.1 U1b-state-evidence-hardening; concurrencia condicional y rollback atómico de bitácora contra Postgres real.
- [ ] 1.2b.3b U1b-state-actions-ui; Server Actions, UI de administración y navegación.
  - [x] 1.2b.3b.1 U1b-state-action-form; Server Action estricta y formulario nativo de destinos válidos.
    - [x] 1.2b.3b.1a U1b-state-action-hardening; capturar fallos de resolución de sesión/tenant y mapear el error conocido sin exponer detalles.
  - [ ] 1.2b.3b.2 U1b-state-detail-navigation; ficha, corrección e ingreso desde navegación.
- [ ] 1.3 RED y GREEN de U2; `puedeEscribir` para registrar, regla nueva para administrar.

### Fase 2: Integración de lecturas
- [ ] 2.1 RED y GREEN de U3; permanece bloqueada hasta U0.
- [ ] 2.2 RED y GREEN de U4; excluir `descripcion` y `referencia`.

### Fase 3: Proyecciones, mapa y vivo
- [ ] 3.1 RED y GREEN de U5 y U6; bloqueadas hasta U0 y dependencias.
- [ ] 3.2 RED y GREEN de U7; cada amenaza SSE falla antes del código.

### Fase 4: Navegación y verificación
- [ ] 4.1 RED y GREEN de U8; ejecutar después de U5–U7.
- [ ] 4.2 Ejecutar `pnpm test`, integración, E2E y `pnpm check` sin compresión.
