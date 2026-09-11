# Apply progress: mapa-operativo-territorial

## Estado

- Modo: Strict TDD.
- Token nativo actual: `sha256:9ff1a2d2bf930b59a155ca44ca083e247fea6fda9421e8687a59147d5400b33a`.
- Work unit actual: `U1b-state-action-hardening`.
- Estrategia: `ask-on-risk`; chain `feature-branch-chain`, confirmada por el
  usuario. No se usa `stacked-to-main` ni `size:exception`.
- Alcance acumulado: U1a, persistencia append-only de U1b, hardening,
  aplicacion de correccion, administracion de estados, formulario de acciones
  y hardening de su frontera siguen documentados abajo. La ficha, correccion y
  navegacion quedan para una unidad posterior.

## Tareas

- [x] 1.1 — U0: delta de `territorio` sin inventar aceptacion.
- [ ] 1.2 — U1: dominio, RLS y revisiones de intervenciones. (U1a completa; U1b de aplicacion completa, acciones/UI parciales.)
- [x] 1.2a — U1a: dominio, tabla, RLS, FKs compuestos, registro base y aislamiento.
- [ ] 1.2b — U1b: revisiones append-only, correcciones y administracion de estados (acciones/UI parciales).
- [x] 1.2b.2a — U1b-correction-transaction-hardening: validacion de ubicacion,
  correccion y bitacora con la misma transaccion; aislamiento y rollback.
- [x] 1.2b.3a — U1b-state-application: caso de uso ADMIN_MUNICIPAL,
  transiciones, tenant, bitacora ID-only y pruebas.
- [ ] 1.2b.3b — U1b-state-actions-ui: Server Actions, UI de administracion y
  navegacion.
- [x] 1.2b.3b.1 — U1b-state-action-form: Server Action estricta y formulario
  nativo para destinos de estado validos.
- [x] 1.2b.3b.1a — U1b-state-action-hardening: fallos de resolucion de
  sesion/tenant dentro del limite de error y mapeo seguro del tenant ausente.
- [ ] 1.2b.3b.2 — U1b-state-detail-navigation: ficha, correccion e ingreso
  desde navegacion; queda para una rebanada posterior.
- [ ] 1.3 — U2: aplicacion/UI de intervenciones y autorizacion.
- [ ] 2.1 — U3: eventos, lecturas y NOTIFY de `territorio`.
- [ ] 2.2 — U4: lectura operativa y NOTIFY de reportes.
- [ ] 3.1 — U5/U6: historial de calle y mapa operativo.
- [ ] 3.2 — U7: hub, SSE e isla de estado en vivo.
- [ ] 4.1 — U8: navegacion y E2E.
- [ ] 4.2 — verificacion completa del cambio.

## TDD Cycle Evidence

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | N/A: artefacto de especificacion | N/A | N/A: archivo nuevo | N/A: U0 no introduce comportamiento ejecutable | N/A: validacion de ruta y lectura | N/A: no hay ramas de runtime | N/A |
| 1.2a | `domain/intervencion.test.ts`, `application/registrarIntervencion.test.ts`, `*.isolation.test.ts`, `registro.integration.test.ts`, `superficiePublica.test.ts` | Unit + integration | N/A: modulo y pruebas nuevas; tests existentes de `reportes` verificados despues del FK | ✅ Tests escritos antes de la implementacion; imports y relaciones ausentes fallaron | ✅ 7 archivos, 27 tests | ✅ Tipos/estados, permisos, ubicacion, tenant, FKs y checks cubiertos con entradas distintas | ✅ Capas separadas, mapper/repositorio/adaptador y superficie sin tablas; 7 archivos de `reportes` ajustados solo para truncado FK |

U0 sigue la indicacion de `tasks.md` (`sdd-spec` define RED; N/A): no se
escribieron tests ni codigo de aplicacion porque el alcance es una correccion
de planificacion.

U1a conserva la evidencia RED/GREEN de la implementacion ya ejecutada. La
refactorizacion no cambio comportamiento; cada verificacion posterior quedo
en verde. Las revisiones append-only y la administracion de estados no forman
parte de esta rebanada.

## Work Unit Evidence

| Evidencia | Resultado |
|---|---|
| Test enfocado | `DATABASE_URL="postgresql://xula_app:postgres@localhost:55432/xula_test" MIGRATION_DATABASE_URL="postgresql://xula_migrator:postgres@localhost:55432/xula_test" SUPER_ADMIN_DATABASE_URL="postgresql://xula_super_admin:postgres@localhost:55432/xula_test" pnpm vitest run src/modules/intervenciones/domain/intervencion.test.ts src/modules/intervenciones/application/registrarIntervencion.test.ts src/modules/intervenciones/superficiePublica.test.ts src/modules/intervenciones/intervenciones.isolation.test.ts src/modules/intervenciones/intervenciones.clavesForaneas.isolation.test.ts src/modules/intervenciones/intervenciones.checks.isolation.test.ts src/modules/intervenciones/registro.integration.test.ts` → paso; 7 archivos, 27 tests. |
| Runtime harness | `DATABASE_URL="postgresql://xula_app:postgres@localhost:55432/xula_test" MIGRATION_DATABASE_URL="postgresql://xula_migrator:postgres@localhost:55432/xula_test" SUPER_ADMIN_DATABASE_URL="postgresql://xula_super_admin:postgres@localhost:55432/xula_test" pnpm test:integration` → paso; 84 archivos, 308 tests. |
| Suite completa | Con las mismas tres variables, `pnpm test` → paso; 254 archivos, 1247 tests. |
| Rollback boundary | Retirar `src/modules/intervenciones/`, `drizzle/0013_intervenciones.sql`, `drizzle/meta/0013_snapshot.json`, revertir la entrada `0013_intervenciones` del journal y revertir unicamente los truncados de los siete tests de `reportes`; U0 permanece intacto. |

## Resultado

- `openspec/changes/mapa-operativo-territorial/specs/territorio/spec.md`
  agrega seis requisitos y dieciseis escenarios para eventos append-only,
  RLS/aislamiento, autorizacion, `callesParaMapa`, `callePorId`, orden
  determinista y notificacion por tenant.
- Durante U0 la verificacion de `src/` no reporto archivos modificados.
- U1a implementa `src/modules/intervenciones/` en sus capas de dominio,
  aplicacion e infraestructura, junto con el esquema RLS, migracion 0013,
  FKs compuestos, registro base, lectura por id y pruebas unitarias/
  integration de aislamiento.
- La migracion local se aplico con `pnpm db:local`; no se agregaron folios,
  revisiones ni permisos de administracion.
- Verificaciones adicionales en verde: `pnpm typecheck`, `pnpm layers`
  (664 modulos, 2904 dependencias), `pnpm reglas` (9 reglas, 2 metricas,
  652 archivos) y lint dirigido. `pnpm check` sigue bloqueado en lint por el
  formato preexistente de `opencode.json` y reporta 51 advertencias
  preexistentes, entre ellas `src/app/(acceso)/acceso/page.tsx` y archivos de
  `constancias`, `reportes` y `territorio`; los archivos nuevos de
  `intervenciones` no tienen errores de lint.
- No se inicia otra fase ni se abre o cierra otro intento. Se entrega U1a al
  orquestador; la siguiente unidad es U1b, sin cerrar U1 como completa.

## Remediacion U1a: prueba de integracion

- Work unit actual: `U1a-integration-remediation`.
- Token nativo de esta remediacion: `sha256:afbbcf99a415d9c5bb3dbaad310aa510a75c31eb22beb5bc6aaea23c9aa92d2f`.
- Revision de evidencia fallida que se remedia: `sha256:5568aa73395c8f820a7239e377ab9e366a9eba4b21e366b1524668e11fe6b826`.
- Limites: un intento, 200 lineas maximas y sin cambios de aplicacion,
  migraciones, tests, planning adicional ni configuracion no relacionada.
- Estrategia: `ask-on-risk`; chain `feature-branch-chain`. Esta unidad no
  adquiere ni asienta el token; el orquestador conserva esa responsabilidad.

### TDD Cycle Evidence — remediacion

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| U1a-integration-remediation | Suites existentes de integracion y de intervenciones | Integration | La evidencia fallida anterior reporto la relacion ausente | N/A: no hay tarea nueva de codigo ni se permitio editar tests | ✅ `0013_intervenciones.sql` aplicada y las dos suites solicitadas pasaron | ✅ RLS, FKs, checks, registro y aislamiento quedaron ejecutados en la suite de integracion | N/A: no hubo cambio de codigo que refactorizar |

### Work Unit Evidence — remediacion

| Evidencia | Resultado |
|---|---|
| Migracion | `pnpm db:migrate` → paso; `0013_intervenciones.sql` quedo aplicada en la base local de pruebas autorizada. Drizzle reporto los avisos esperados de `drizzle` y `__drizzle_migrations` ya existentes y termino con `migrations applied successfully`. |
| Test de integracion | `pnpm test:integration` → paso; 84 archivos, 308 tests. Duracion observada: 145.81 s. |
| Test solicitado de intervenciones | `pnpm test -- intervenciones` → paso; 254 archivos, 1247 tests. La configuracion de Vitest ejecuto la suite completa, no solo archivos cuyo nombre contiene `intervenciones`. Duracion observada: 179.57 s. |
| Runtime harness | N/A: esta unidad solo remedia la migracion y prueba de integracion; no existe una frontera runtime/E2E aplicable. |
| Rollback boundary | Retirar unicamente esta seccion de `openspec/changes/mapa-operativo-territorial/apply-progress.md`; no se modificaron fuentes, migraciones ni tests. El rollback de la migracion aplicada es una operacion de base separada y no forma parte de esta unidad. |

### Resultado de la remediacion

- Las tres comprobaciones se ejecutaron en primer plano con las variables de
  los roles de prueba autorizados; sus valores no se copian al artefacto.
- La evidencia de esta seccion es fresca y distinta de la revision fallida:
  la migracion se aplico antes de repetir la integracion y ya no aparece la
  relacion inexistente `intervenciones`.
- Ruta escrita por esta unidad: este archivo. No se edito `src/`, `drizzle/`,
  ningun test ni configuracion ajena.
- Evidencia lista para el asentamiento nativo por el orquestador, usando la
  revision fallida exacta indicada arriba. No se inicia U1b ni otra fase.

## Remediacion U1a: folio y concurrencia (revision actual)

- Work unit actual: `U1a-folio-remediation`.
- Token nativo de esta remediacion: `sha256:0cc64afb3a499846b805b5c3ce0776cfd97d769d7be0eb5071a1ff7488ede565`.
- Revision de evidencia fallida que se remedia: `sha256:a947c079951809bc5bb6169a335a38fa7f3e188cb2346292d233f2eb6130be64`.
- Limites: una correccion enfocada, 200 lineas maximas y sin U1b ni cambios
  ajenos a `folio.integration.test.ts` y este ledger.
- Estrategia: `ask-on-risk`; chain `feature-branch-chain`. No se adquiere ni
  se asienta otro intento.

### Diagnostico

T6 esperaba que la transaccion paralela hubiera terminado su `INSERT` despues
de un `sleep(100)`. Bajo carga, la conexion podia no haber llegado al `RETURNING`
cuando corria la asercion (`consecutivoTomado === -1`). El test terminaba sin
liberar `puedeConfirmar`; esa transaccion conservaba el lock y hacia que el
`TRUNCATE` de T7 y el `afterAll` excedieran sus timeouts. La correccion espera
una señal despues del `INSERT` real y libera la transaccion en `finally` ante
cualquier asercion fallida. No cambia el contador, el lock, RLS ni el flujo de
registro.

### TDD Cycle Evidence — remediacion

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| U1a-folio-remediation | `src/modules/reportes/folio.integration.test.ts` | Integration | ✅ corrida previa: 1 archivo, 2 tests | ✅ ajuste del arnes escrito antes de la verificacion; fallo previo T6/T7 conservado | ✅ 5 corridas: 1 archivo, 2 tests cada una | ✅ lock concurrente de T6 y rollback de folio de T7 | ✅ señal de readiness y limpieza con `finally`; sin cambio de produccion |

### Work Unit Evidence — remediacion

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project integration src/modules/reportes/folio.integration.test.ts` con los roles locales autorizados → 5 corridas consecutivas en verde; cada una reporto 1 archivo y 2 tests. |
| Test de integracion completo | `pnpm test:integration` → paso; 84 archivos, 308 tests. Duracion observada: 218.09 s. |
| Test solicitado de intervenciones | La primera ejecucion excedio el limite de 300 s sin resumen; la misma orden con limite de 600 s → paso; 254 archivos, 1247 tests. Duracion observada: 367.08 s. |
| Quality gate | `pnpm check` → fallo en `pnpm lint` por el formato preexistente de `opencode.json`; reporto 50 advertencias preexistentes y no alcanzo `typecheck`, `layers` ni `reglas`. |
| Runtime harness | N/A: la unidad corrige un arnes de integracion y no tiene frontera runtime/E2E aplicable. |
| Rollback boundary | Revertir unicamente la señal de readiness, el `finally` de limpieza y esta seccion del ledger; conservar U1a, la migracion 0013 y el truncado de intervenciones. |

### Resultado de la remediacion

- Se modifico unicamente `src/modules/reportes/folio.integration.test.ts` y
  este archivo de progreso; no se tocaron dominio, aplicacion, migraciones,
  aislamiento ni U1b.
- La integracion completa y la suite solicitada de intervenciones quedaron en
  verde despues de la correccion; el primer limite de 300 s para la segunda
  orden fue insuficiente para su carga completa, no un fallo de aserciones.
- `pnpm check` conserva el bloqueo preexistente de lint documentado arriba; no
  se corrigio `opencode.json` porque queda fuera de esta unidad.

## U1b: rebanada de revisiones append-only

- Work unit: `U1b-intervenciones-revisiones`; token nativo:
  `sha256:76ae92c8fb230286b91c6ad45cb81bd40eab075f1e5908467fd2918bde78d4bb`.
- Limite: 240 lineas; se entrega la rebanada dependency-complete de tabla,
  RLS, aislamiento y correccion en repositorio. Estado/permiso de aplicacion,
  bitacora de correccion y UI quedan para la siguiente rebanada.

### TDD Cycle Evidence — U1b

| Tarea | Tests | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| U1b-revision-persistence | `intervenciones.isolation.test.ts` | ✅ Falto `repositorio.corregir`; 1 de 5 tests fallo | ✅ 1 archivo, 5 tests | ✅ fila vigente, revision anterior, tenant y UPDATE/DELETE denegados | ✅ puerto y repositorio separados; sin cambio en dominio U1a |

### Work Unit Evidence — U1b

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project integration src/modules/intervenciones/intervenciones.isolation.test.ts` con los tres roles locales → paso; 1 archivo, 5 tests. |
| Runtime harness | La misma suite contra Postgres real verifica correccion, RLS y permisos append-only; paso. |
| Verificacion adicional | `pnpm test -- intervenciones` → paso; 254 archivos, 1248 tests. `pnpm test:integration` → paso; 84 archivos, 309 tests. `pnpm typecheck`, `pnpm layers` y `pnpm reglas` → paso. |
| Migracion y permisos | `MIGRATION_DATABASE_URL="postgresql://xula_migrator:postgres@localhost:55432/xula_test" pnpm db:migrate` → paso; `relrowsecurity=true`, `relforcerowsecurity=true`, grants de `xula_app`: `INSERT`, `SELECT`. |
| Quality gate | `pnpm check` sigue fallando solo por el formato preexistente de `opencode.json`; 50 advertencias preexistentes. Lint dirigido de U1b → paso. |
| Rollback boundary | Retirar `drizzle/0014_revisiones_intervenciones.sql`, su entrada de journal, la tabla/export y `corregir` del repositorio, mas las aserciones/truncados de revisiones; conservar U1a y el resto del ledger. |

### Resultado U1b

- Se agrego `revisiones_de_intervenciones` con tenant, FKs compuestos, `FORCE
  ROW LEVEL SECURITY`, politica y `GRANT SELECT, INSERT`; la correccion actualiza
  la fila e inserta los valores anteriores en la misma transaccion del caller.
- U1b queda parcial: faltan `puedeAdministrarIntervenciones`, el caso de uso
  de correccion con validacion de ubicacion, bitacora de correccion y cambios
  de estado. `tasks.md` conserva 1.2b pendiente.
- La migracion se separo como `0014` porque U1a ya dejo aplicada `0013`; falta
  el snapshot generado `drizzle/meta/0014_snapshot.json` y debe resolverse antes
  de encadenar otra migracion.

## U1b: hardening de persistencia (sucesor)

- Work unit: `U1b-revision-persistence-hardening`; token nativo:
  `sha256:98213d87613ca466c0051b19a934fc6fa23cba6b6ca39690d12d55e459dcefbe`.
- Alcance: valores anteriores exactos, rollback atomico ante fallo de revision y
  lock de fila para correcciones concurrentes. No se adquirio ni asento otro
  intento.
- Estrategia: `ask-on-risk`; chain `feature-branch-chain`; sin migracion ni
  snapshot porque el cambio probado solo ajusta repositorio y tests.
### TDD Cycle Evidence — hardening

| Tarea | Tests | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| U1b-revision-persistence-hardening | `intervenciones.isolation.test.ts` | Integration | ✅ Evidencia U1b previa: 1 archivo, 5 tests | ✅ Con la implementacion previa pasaron 6 de 7; la prueba concurrente fallo por valores anteriores obsoletos | ✅ 1 archivo, 7 tests | ✅ valores exactos, rollback de transaccion y lock con segunda conexion | ✅ `SELECT ... FOR UPDATE` en el repositorio; se conservaron `withTenant` y el contrato transaccional |
### Work Unit Evidence — hardening

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project integration src/modules/intervenciones/intervenciones.isolation.test.ts` con los tres roles locales → paso; 1 archivo, 7 tests. |
| Runtime harness | La misma suite contra Postgres real; la conexion paralela actualiza y retiene la fila antes de la correccion → la revision conserva los valores confirmados más recientes. Paso; 1 archivo, 7 tests. |
| Verificacion adicional | `pnpm test -- intervenciones` → paso; 254 archivos, 1250 tests. `pnpm test:integration` → paso; 84 archivos, 311 tests. `pnpm typecheck`, `pnpm layers` y `pnpm reglas` → paso; layers: 664 modulos/2906 dependencias; reglas: 652 archivos. |
| Quality gate | `pnpm check` → fallo en lint por el formato preexistente de `opencode.json`; 1 error y 50 advertencias preexistentes. Los archivos de esta unidad no reportan diagnosticos; typecheck, layers y reglas pasaron por separado. |
| Rollback boundary | Revertir unicamente `for("update")` en `repositorioDeIntervencionesSql.ts`, las tres pruebas nuevas/aserciones y la sub-tarea de este ledger; no retirar U1a ni la persistencia U1b previa. |
### Resultado del hardening
- `valoresAnteriores` exactos: PASO; siete campos editables, incluidos los dos `null`.
- Rollback atomico: PASO; correccion concurrente: PASO; el lock lee lo confirmado antes de escribir.
- No se modificaron migraciones ni snapshots; queda documentada la ausencia preexistente de `0014_snapshot.json`.
- Permisos, caso de uso, bitacora, estados, UI y U2 siguen fuera de alcance; `tasks.md` conserva U1b padre pendiente.

## U1b: aplicacion de correccion (actual)

- Work unit: `U1b-correction-application`; token nativo:
  `sha256:8f4b032cafca76032965d4050fe2365d912ea972ae15ededa83ef82176c320e1`.
- Alcance: `puedeAdministrarIntervenciones`, entrada estricta, correccion por
  contexto de servidor y bitacora por ID en la misma transaccion. Estados, UI,
  acciones de estado y navegacion siguen fuera de esta rebanada.
- Limite: el codigo y las pruebas agregan 238 lineas; se conserva la estrategia
  `feature-branch-chain` y no se usa `size:exception`.

### TDD Cycle Evidence — aplicacion de correccion

| Tarea | Tests | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| 1.2b.2 | `roles.test.ts`, `corregirIntervencion.test.ts` | ✅ El permiso nuevo y el modulo de aplicacion fueron provocados antes de implementar; las importaciones faltantes fallaron | ✅ 2 archivos, 25 tests | ✅ Suite de intervenciones, integracion RLS/revisiones, typecheck, capas y reglas en verde | ✅ Validacion separada, `id` fuera de `cambios`, composicion por puertos y auditoria con la misma transaccion |

### Work Unit Evidence — aplicacion de correccion

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit src/modules/intervenciones/application/corregirIntervencion.test.ts src/shared/auth/roles.test.ts` → paso; 2 archivos, 25 tests. |
| Runtime harness | `DATABASE_URL="postgresql://xula_app:postgres@localhost:55432/xula_test" MIGRATION_DATABASE_URL="postgresql://xula_migrator:postgres@localhost:55432/xula_test" SUPER_ADMIN_DATABASE_URL="postgresql://xula_super_admin:postgres@localhost:55432/xula_test" pnpm test:integration` → paso; 84 archivos, 312 tests contra Postgres real, incluida la correccion y bitacora por ID. |
| Verificacion completa | Con las mismas variables, `pnpm test -- intervenciones` → paso; 255 archivos, 1255 tests. `pnpm test:integration` → paso; 84 archivos, 312 tests. `pnpm typecheck`, `pnpm layers` → paso; 666 modulos/2922 dependencias. `pnpm reglas` → paso; 9 reglas, 2 metricas, 652 archivos. |
| Lint dirigido | `rtk lint check` sobre los archivos de esta rebanada → paso; sin issues. |
| Quality gate | `pnpm check` sigue bloqueado en lint por el formato preexistente de `opencode.json` y advertencias preexistentes; no reporta diagnosticos en los archivos de esta rebanada. |
| Rollback boundary | Retirar `application/corregirIntervencion.ts` y sus pruebas unitaria e integration; revertir la regla y su test en `shared/auth/roles*`, el wiring en `application/index.ts`, `composicion.ts` e `index.ts`, y esta seccion del ledger. Conservar U1a, revisiones append-only y hardening. |

### Resultado de la aplicacion de correccion

- `ADMIN_MUNICIPAL` es el unico rol autorizado; el tenant siempre sale de
  `ContextoActual`, nunca de la entrada.
- La correccion actualiza la fila, conserva la revision append-only existente y
  registra `CORREGIR_INTERVENCION` solo con IDs dentro del mismo `withTenant`.
- Las pruebas unitarias confirman que repositorio y bitacora reciben la misma
  transaccion; la integracion confirma la correccion real y su bitacora por ID.
  No se agrego una inyeccion de fallo del insert de bitacora; el rollback queda
  garantizado por la transaccion compartida y la prueba unitaria de composicion.
- `tasks.md` marca `1.2b.2` completa; `1.2b.3` (administracion de estados) sigue
  pendiente.

## U1b: hardening transaccional de la correccion (sucesor)

- Work unit: `U1b-correction-transaction-hardening`; token nativo:
  `sha256:a5aaf928b7659aba6c0dd9808cd5fe7491e69cfd48bf41766128f94efd70d0c9`.
- Alcance: validar la ubicacion dentro del `withTenant` de la correccion,
  conservar el mismo `tx` para repositorio y bitacora, y agregar evidencia de
  ubicacion invisible, correccion cruzada, rollback de auditoria y actor.
- No se adquirio ni asento otro intento. Estados, UI, navegacion, U2 y otros
  modulos siguen fuera de alcance.

### TDD Cycle Evidence — hardening transaccional

| Tarea | Tests | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| 1.2b.2a | `corregirIntervencion.test.ts`, `ubicacionDeLugar.test.ts`, `registro.integration.test.ts` | ✅ Primero se escribieron las aserciones de `tx`, el helper transaccional y el fallo de auditoria; la corrida inicial dejo 2 tests en rojo | ✅ Unit: 3 archivos, 11 tests; integration enfocada: 2 archivos, 10 tests | ✅ La integracion completa ejercito RLS, ubicacion invisible, id de otro tenant y rollback atomico con Postgres real | ✅ Los callers de `reportes` permanecen intactos; el adaptador y los casos de uso de `intervenciones` adoptan el puente transaccional |

### Work Unit Evidence — hardening transaccional

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit src/modules/intervenciones/application/corregirIntervencion.test.ts src/modules/intervenciones/application/registrarIntervencion.test.ts src/modules/territorio/application/ubicacionDeLugar.test.ts` → paso; 3 archivos, 11 tests. |
| Tests de correccion y dominio | `pnpm vitest run --project unit src/modules/intervenciones/application/corregirIntervencion.test.ts src/modules/intervenciones/domain/intervencion.test.ts src/shared/auth/roles.test.ts` → paso; 3 archivos, 36 tests. |
| Integracion enfocada | Con los tres roles locales autorizados, `pnpm vitest run --project integration src/modules/intervenciones/registro.integration.test.ts src/modules/territorio/ubicacionDeLugar.integration.test.ts` → paso; 2 archivos, 10 tests. |
| Runtime harness | `pnpm test:integration` contra Postgres real → paso; 84 archivos, 315 tests. Incluye ubicacion invisible, correccion cruzada y rollback de auditoria. |
| Suite solicitada | `pnpm test -- intervenciones` → paso; 255 archivos, 1260 tests. |
| Typecheck | `pnpm typecheck` → paso. |
| Capas | `pnpm layers` → paso; 666 modulos, 2924 dependencias, sin violaciones. |
| Reglas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 652 archivos. |
| Quality gate | `pnpm check` → falla solo en el formato preexistente de `opencode.json`; conserva 50 advertencias preexistentes. Los archivos de esta unidad no agregan diagnosticos de lint; typecheck, capas y reglas pasan por separado. |
| Rollback boundary | Retirar unicamente el puente `ubicacionDeLugarEnTransaccion`, el contrato/adaptador transaccional de `intervenciones`, el movimiento de validacion dentro de `withTenant`, la inyeccion opcional de `registrarBitacora`, sus pruebas y esta seccion del ledger. Conservar U1a, revisiones append-only y el hardening de persistencia anterior. |

### Resultado del hardening transaccional

- **Misma transaccion de ubicacion, correccion y auditoria: probado.** La
  prueba unitaria verifica el mismo `tx` en lectura, repositorio y bitacora; el
  adaptador real usa `ubicacionDeLugarEnTransaccion` y no abre otro
  `withTenant`.
- **Rechazo de ubicacion invisible y correccion cruzada: probado.** La
  integracion devuelve `NoEncontradoError` y conserva el estado original sin
  revelar si la fila existe en el otro municipio.
- **Rollback por fallo de auditoria: probado.** Una auditoria inyectada que
  falla desde el caso de uso deja intacta la fila vigente y no deja revision.
- **Propagacion del actor: probado.** La unidad afirma `usuarioId` al
  repositorio y `actor` a la bitacora con el id del contexto servidor.
- `tasks.md` marca `1.2b.2a` completa; `1.2b.3` (administracion de estados)
  sigue pendiente.

## U1b: administracion de estados (actual)

- Work unit: `U1b-state-administration`; token nativo:
  `sha256:f8e2a5c59cd491fde1b912666159fa0ff95bdde62a064dc84d18fd9f80cbd5a9`.
- Alcance: caso de uso de aplicacion para cambiar estado, exclusivo de
  `ADMIN_MUNICIPAL`, validacion estricta, lectura bajo `withTenant`,
  transicion SQL condicionada por el estado anterior y bitacora ID-only en la
  misma transaccion.
- Quedan fuera de esta unidad: Server Actions, UI, navegacion, U2, mapa,
  historial, reportes y SSE. La sub-tarea `1.2b.3b` conserva ese remanente.
- No se adquiere ni se asienta otro intento. Se conserva la estrategia
  `ask-on-risk` con chain `feature-branch-chain`.

### TDD Cycle Evidence — administracion de estados

| Tarea | Tests | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.2b.3a | `cambiarEstadoDeIntervencion.test.ts`, `intervenciones.isolation.test.ts` | Unit + integration | ✅ Unit previo: 4 archivos, 40 tests; aislamiento previo documentado con 7 tests | ✅ Las importaciones del caso de uso fallaron antes de crear la implementacion | ✅ Unit: 2 archivos, 20 tests; integration: 1 archivo, 8 tests | ✅ Las cuatro transiciones validas, terminales, transicion invalida, roles, borde estricto, 404 tenant y auditoria fueron ejercitados | ✅ Fixture con id marcado, imports/formato y UPDATE condicional; pruebas permanecen verdes |

### Work Unit Evidence — administracion de estados

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit src/modules/intervenciones/domain/intervencion.test.ts src/modules/intervenciones/application/cambiarEstadoDeIntervencion.test.ts` → paso; 2 archivos, 20 tests. |
| Runtime harness | `DATABASE_URL="postgresql://xula_app:postgres@localhost:55432/xula_test" MIGRATION_DATABASE_URL="postgresql://xula_migrator:postgres@localhost:55432/xula_test" SUPER_ADMIN_DATABASE_URL="postgresql://xula_super_admin:postgres@localhost:55432/xula_test" pnpm vitest run --project integration src/modules/intervenciones/intervenciones.isolation.test.ts` → paso; 1 archivo, 8 tests contra Postgres real. |
| Suite solicitada | Con las mismas tres variables, `pnpm test -- intervenciones` → paso; 256 archivos, 1270 tests. |
| Integracion completa | Con las mismas tres variables, `pnpm test:integration` → paso; 84 archivos, 316 tests. |
| Typecheck | `pnpm typecheck` → paso. |
| Capas | `pnpm layers` → paso; 668 modulos, 2942 dependencias, sin violaciones. |
| Reglas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 652 archivos. |
| Quality gate | `pnpm check` → falla unicamente por el formato preexistente de `opencode.json`; conserva 50 advertencias preexistentes. Los archivos de esta unidad no agregan diagnosticos. |
| Rollback boundary | Retirar `application/cambiarEstadoDeIntervencion.ts` y su test, los errores de dominio y `aplicarTransicion` del puerto/adaptador, su wiring en los barriles/composicion y las aserciones nuevas de `intervenciones.isolation.test.ts`; conservar U1a, revisiones, correcciones y el resto de este ledger. |

### Resultado de la administracion de estados

- **Transiciones probadas:** `PLANIFICADA -> EN_EJECUCION`,
  `PLANIFICADA -> CANCELADA`, `EN_EJECUCION -> FINALIZADA` y
  `EN_EJECUCION -> CANCELADA` aceptan y actualizan; `FINALIZADA` y
  `CANCELADA` rechazan cualquier reapertura con `IntervencionCerradaError`.
  `PLANIFICADA -> FINALIZADA` rechaza con `TransicionInvalidaError`.
- **Autorizacion y limite:** `ADMIN_MUNICIPAL` es el unico rol que llega al
  repositorio; `OPERADOR`, `CONSULTA` y `SUPER_ADMIN` reciben
  `NoAutorizadoError`. El payload estricto no acepta tenant adicional ni
  estados fuera de la union.
- **Tenant y auditoria:** una fila invisible por RLS se traduce a
  `NoEncontradoError` y la integracion real confirma que otro ayuntamiento no
  puede cambiarla. Repositorio y bitacora reciben el mismo `tx`; la traza usa
  actor, origen, accion, entidad e id, sin estado ni descripcion.
- **Remanente exacto:** no se agrego una prueba de fallo inyectado especifica
  para el INSERT de bitacora de estados; la atomicidad queda probada por la
  identidad de transaccion y el contrato de `withTenant`, mientras el caso de
  uso de acciones/UI permanece en `1.2b.3b`.
- `tasks.md` marca `1.2b.3a` completa; `1.2b.3` y `1.2b` permanecen abiertas
  por las acciones/UI diferidas.

## U1b: hardening de evidencia de estados (sucesor)

- Work unit: `U1b-state-evidence-hardening`; token nativo activo:
  `sha256:973e6a201a65e652666b97cdb58f005f7121a9fd3906a16209aacadb685477f1`.
- Alcance: cerrar las dos brechas de verificacion independientes de
  `U1b-state-application`: carrera de actualizacion condicional contra
  Postgres real y rollback de estado cuando falla el INSERT de bitacora.
- No se modifico produccion: las pruebas pasaron contra el codigo existente y
  no expusieron un defecto funcional. No se tocaron transiciones, UI, acciones,
  navegacion, mapa, SSE ni U2. No se adquiere ni se asienta otro intento.
- Estrategia: `ask-on-risk`; chain `feature-branch-chain`; rebanada menor a
  160 lineas modificadas.

### TDD Cycle Evidence — hardening de evidencia

| Tarea | Tests | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.2b.3a.1 | `intervenciones.isolation.test.ts` | Integration | ✅ Evidencia previa de estado: 8 tests | ✅ Pruebas escritas antes de evaluar cambios de produccion; el codigo existente ya satisfacia el contrato | ✅ 1 archivo, 10 tests | ✅ Carrera stale y fallo de bitacora cubren dos caminos reales, junto con las cuatro transiciones existentes | ✅ Formato Biome aplicado; la suite enfocada permanecio en 10/10 |

### Work Unit Evidence — hardening de evidencia

| Evidencia | Resultado |
|---|---|
| Test enfocado unitario | `pnpm vitest run --project unit src/modules/intervenciones/domain/intervencion.test.ts src/modules/intervenciones/application/cambiarEstadoDeIntervencion.test.ts` → paso; 2 archivos, 20 tests. |
| Test enfocado de integracion | `DATABASE_URL="postgresql://xula_app:postgres@localhost:55432/xula_test" MIGRATION_DATABASE_URL="postgresql://xula_migrator:postgres@localhost:55432/xula_test" SUPER_ADMIN_DATABASE_URL="postgresql://xula_super_admin:postgres@localhost:55432/xula_test" pnpm vitest run --project integration src/modules/intervenciones/intervenciones.isolation.test.ts` → paso; 1 archivo, 10 tests. |
| Runtime harness | La misma suite contra Postgres real coordina una lectura stale con `enTransaccionParalela`, confirma el nuevo `CANCELADA`, recibe `NoEncontradoError` y verifica que no fue pisado; el actor invalido hace fallar el INSERT UUID de bitacora y deja estado `PLANIFICADA` sin traza. Paso. |
| Suite solicitada | Con las mismas tres variables, `pnpm test -- intervenciones` → paso; 256 archivos, 1272 tests, 190.34 s. |
| Integracion completa | Con las mismas tres variables, `pnpm test:integration` → paso; 84 archivos, 318 tests, 156.30 s. |
| Typecheck | `pnpm typecheck` → paso. |
| Capas | `pnpm layers` → paso; 668 modulos, 2942 dependencias, sin violaciones. |
| Reglas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 652 archivos. |
| Quality gate | `pnpm check` → falla unicamente por el formato preexistente de `opencode.json` (`instructions` en una sola linea); 1 error y 50 advertencias preexistentes. El test modificado no agrega diagnosticos. |
| Rollback boundary | Retirar el import `and`, las dos pruebas nuevas de `src/modules/intervenciones/intervenciones.isolation.test.ts`, la sub-tarea de `tasks.md` y esta seccion del ledger; no hay cambio de produccion que revertir. |

### Resultado del hardening de evidencia

- **Carrera de estado condicional: probado.** Una conexion separada confirma
  `PLANIFICADA -> CANCELADA` despues de que el caso de uso stale lee
  `PLANIFICADA`; el `UPDATE ... WHERE estado = estadoAnterior` devuelve cero,
  el caso de uso responde `NoEncontradoError` y el estado final permanece
  `CANCELADA`.
- **Rollback de bitacora de estado: probado.** Un actor no UUID provoca el
  rechazo real de Postgres en el INSERT de auditoria despues del UPDATE; la
  transaccion revierte el estado y no queda fila de
  `CAMBIAR_ESTADO_INTERVENCION`.
- Ambas brechas de evidencia quedan cerradas sin cambio de produccion.
- `tasks.md` marca `1.2b.3a.1` completa; `1.2b.3a` conserva su alcance y
  `1.2b.3b` sigue pendiente para acciones/UI.

## U1b: formulario de acciones de estado (slice actual)

- Work unit: `U1b-state-actions-ui`; token nativo recibido:
  `sha256:d213075b3f22a58bbe77af04ed5adcc5cdb3777644ee8f1790500ee328cbc129`.
- Alcance cerrado: Server Action de cambio de estado y formulario nativo que
  solo ofrece destinos aceptados por `transicionValida`. El servidor conserva
  el contexto y la autorizacion del caso de uso; la UI no es la guarda.
- Se retiro la implementacion tentativa de correccion y la ficha para no
  mezclar otra costura ni fingir que existe una ruta de detalle sin listado.
  La ficha, la accion/formulario de correccion y la entrada de navegacion son
  el remanente exacto de `1.2b.3b.2`.
- No se adquiere ni se asienta otro intento. Se conserva `feature-branch-chain`.
- La rebanada agrega 255 lineas fisicas entre codigo y pruebas; queda 35 por
  encima del limite local de 220. No se eliminan aserciones ni se comprimen
  tests para alcanzar el numero; se recomienda `size:exception` si el limite
  de 220 es obligatorio para este slice.

### TDD Cycle Evidence — formulario de acciones de estado

| Tarea | Tests | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.2b.3b.1 | `ui/actions/acciones.test.ts`, `ui/AccionesDeIntervencion.test.tsx` | Unit | ✅ Caso de uso y transiciones ya probados en U1b-state-evidence-hardening | ✅ Las pruebas de la superficie nueva se escribieron antes de crear sus archivos; la primera corrida no pudo resolver los modulos nuevos | ✅ 2 archivos, 5 tests | ✅ Suite de intervenciones contra Postgres, typecheck, capas y reglas | ✅ Se retiro correccion/ficha fuera de esta costura; se conservaron las pruebas de destinos validos y terminales |

### Work Unit Evidence — formulario de acciones de estado

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit "src/modules/intervenciones/ui/actions/acciones.test.ts" "src/modules/intervenciones/ui/AccionesDeIntervencion.test.tsx"` → paso; 2 archivos, 5 tests. |
| Runtime harness | `DATABASE_URL="postgresql://xula_app:postgres@localhost:55432/xula_test" MIGRATION_DATABASE_URL="postgresql://xula_migrator:postgres@localhost:55432/xula_test" SUPER_ADMIN_DATABASE_URL="postgresql://xula_super_admin:postgres@localhost:55432/xula_test" pnpm test -- intervenciones` → paso; 258 archivos, 1277 tests, 228.45 s. La ruta Next no se agrego en esta costura; el arnes real cubre el caso de uso y su persistencia contra Postgres. |
| Typecheck | `pnpm typecheck` → paso. |
| Capas | `pnpm layers` → paso; 672 modulos, 2963 dependencias, sin violaciones. |
| Reglas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 652 archivos. |
| Quality gate | `pnpm check` → falla en lint por el formato preexistente de `opencode.json`; conserva 1 error y 50 advertencias preexistentes. Los archivos de esta rebanada no agregan diagnosticos. |
| Rollback boundary | Retirar `ui/actions/cambiarEstadoAction.ts`, `ui/AccionesDeIntervencion.tsx`, sus dos pruebas, la exportacion del barril y esta seccion; no toca dominio, aplicacion, infraestructura, migraciones ni otros modulos. |

### Resultado del formulario de acciones de estado

- La accion valida con Zod, no acepta `ayuntamientoId`, redirige errores con
  mensajes de operador y revalida la ficha despues del cambio.
- El formulario genera un boton por transicion valida y comunica cuando el
  estado es terminal; no ofrece destinos invalidos ni agrega una isla cliente.
- `tasks.md` marca `1.2b.3b.1` completa. `1.2b.3b`, `1.2b.3b.2` y `1.2b`
  permanecen abiertas por ficha, correccion y navegacion diferidas.

## U1b: hardening de la frontera de la accion de estado (sucesor actual)

- Work unit: `U1b-state-action-hardening`; token nativo recibido:
  `sha256:9ff1a2d2bf930b59a155ca44ca083e247fea6fda9421e8687a59147d5400b33a`.
- Alcance: capturar los fallos que ocurren al resolver sesion o tenant antes
  del caso de uso y mapear `TenantNoResueltoError` a un mensaje de operador.
- Se conserva el formulario nativo y la autorizacion exclusiva del caso de
  uso. No se agregan ficha, correccion, navegacion, U2, mapa, historial,
  reportes ni SSE.
- Estrategia: `ask-on-risk`; chain `feature-branch-chain`; sin `size:exception`.

### TDD Cycle Evidence — hardening de la accion

| Tarea | Tests | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.2b.3b.1a | `ui/actions/acciones.test.ts` | Unit | ✅ Accion y UI previas en 5 tests | ✅ El nuevo test recibio `TenantNoResueltoError` en vez de `NEXT_REDIRECT` | ✅ 2 archivos, 6 tests | ✅ Exito existente + falla de contexto | ✅ Solo se agrego la frontera de contexto y su mapeo; no cambio la autorizacion |

### Work Unit Evidence — hardening de la accion

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit "src/modules/intervenciones/ui/actions/acciones.test.ts" "src/modules/intervenciones/ui/AccionesDeIntervencion.test.tsx"` → paso; 2 archivos, 6 tests. |
| Runtime harness | `pnpm test -- intervenciones` con los tres roles locales autorizados → paso; 258 archivos, 1278 tests, 137.85 s. La frontera de Server Action se prueba en unit; la persistencia/autorizacion del modulo se ejercita contra Postgres real. |
| Typecheck | `pnpm typecheck` → paso. |
| Capas | `pnpm layers` → paso; 672 modulos, 2963 dependencias, sin violaciones. |
| Reglas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 652 archivos. |
| Quality gate | `pnpm check` → falla unicamente por el formato preexistente de `opencode.json`; conserva 50 advertencias preexistentes y no reporta diagnosticos en los archivos de esta rebanada. |
| Rollback boundary | Retirar el `TenantNoResueltoError`, el `try/catch` de `contextoActual`, la asercion nueva, la tarea `1.2b.3b.1a` y esta seccion; conservar la accion/formulario, la autorizacion y la evidencia anterior. |

### Resultado del hardening de la accion

- **La frontera de contexto esta probada.** Un fallo de resolucion del tenant
  no escapa como excepcion cruda: vuelve al formulario por `redirect` con un
  mensaje seguro y sin el detalle interno.
- Un contexto ausente (`null`) conserva el redirect existente a `/acceso`; el
  caso de uso sigue recibiendo exclusivamente el contexto del servidor.
- La rebanada agrega 72 lineas fisicas netas propias entre codigo, prueba y
  documentacion (menos de 180 lineas cambiadas); no se eliminaron tests ni
  controles.
- `tasks.md` marca `1.2b.3b.1a` completa. `1.2b.3b`, `1.2b.3b.2` y `1.2b`
  siguen abiertas por ficha, correccion y navegacion diferidas.

## U1b: cobertura de mapeos en la frontera de la accion (continuacion)

- Work unit actual: `U1b-state-action-hardening`; token nativo conservado:
  `sha256:9ff1a2d2bf930b59a155ca44ca083e247fea6fda9421e8687a59147d5400b33a`.
- Motivo: la verificacion independiente devolvio parcial porque faltaba afirmar
  cada mapeo conocido directamente en la Server Action.
- Alcance: cinco mapeos de borde y contexto nulo; no cambia produccion ni abre
  alcance.
- Impacto: 64 lineas nuevas en el test, 5 del contexto nulo y 39 en este
  ledger; 108 en esta continuacion, 180/180 acumuladas.

### TDD Cycle Evidence — cobertura de mapeos

| Tarea | Tests | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.2b.3b.1a | `ui/actions/acciones.test.ts` | Unit | ✅ Accion, UI y hardening previos | ✅ Las seis pruebas se escribieron primero; la corrida inicial fue verde, sin defecto de produccion | ✅ 1 archivo, 10 tests | ✅ Suite completa de intervenciones, typecheck y reglas | ✅ Cuatro mapeos parametrizados, contexto nulo y log seguro |

### Work Unit Evidence — cobertura de mapeos

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit "src/modules/intervenciones/ui/actions/acciones.test.ts" "src/modules/intervenciones/ui/AccionesDeIntervencion.test.tsx"` → paso; 2 archivos, 12 tests. |
| Runtime harness | `DATABASE_URL="postgresql://xula_app:postgres@localhost:55432/xula_test" MIGRATION_DATABASE_URL="postgresql://xula_migrator:postgres@localhost:55432/xula_test" SUPER_ADMIN_DATABASE_URL="postgresql://xula_super_admin:postgres@localhost:55432/xula_test" pnpm test -- intervenciones` → paso; 258 archivos, 1283 tests, 131.43 s. |
| Typecheck | `pnpm typecheck` → paso. |
| Reglas | `pnpm reglas` → paso; 9 reglas, 2 metricas, 652 archivos. |
| Seguridad | El fallo generico redirige con mensaje fijo y el log solo recibe `datosSegurosDeError`; el detalle secreto no aparece. |
| Rollback boundary | Retirar imports y las seis pruebas nuevas de `ui/actions/acciones.test.ts`, mas esta seccion; no hay produccion que revertir. |

### Resultado de la cobertura de mapeos

- La Server Action ahora tiene aserciones directas para los cinco mapeos y el
  contexto nulo que la verificacion habia dejado sin afirmar; el formulario sigue siendo nativo.
- El caso generico conserva el mensaje fijo y verifica que `console.error`
  reciba datos reducidos, nunca el detalle del error.
- No se cambio comportamiento de produccion: todas las pruebas pasaron con la
  implementacion existente y no expusieron un defecto.
- No se eliminaron tests de aislamiento, controles de seguridad ni documentacion;
  `tasks.md` ya marca `1.2b.3b.1a` completa.

## U1: metric test split cleanup

- Work unit: `U1-metric-test-split`; native attempt token received:
  `sha256:284d02622c6c5cb0b9257de36d32306fbf23844814df4706d1a3cf5d8b469c7f`.
- Scope: split the two oversized intervention test files by coherent topic;
  production behavior, test assertions, setup, cleanup, tenant isolation, and
  role isolation remain unchanged. No additional attempt was acquired or
  settled, and no commit or push was performed.
- `intervenciones.isolation.test.ts` went from 470 lines to the tenant-only
  suite; its state and revision cases moved to five focused suites. The file
  count for that suite is now six, and every file is at most 200 lines.
- `registro.integration.test.ts` went from 263 lines to registration-only
  coverage; correction and correction-rollback cases moved to two focused
  suites. The file count for that suite is now three, and every file is at most
  200 lines.
- Focused split suites: `pnpm vitest run --project integration
  src/modules/intervenciones/intervenciones.isolation.test.ts
  src/modules/intervenciones/intervenciones.estado.isolation.test.ts
  src/modules/intervenciones/intervenciones.estado.rollback.integration.test.ts
  src/modules/intervenciones/intervenciones.revisiones.isolation.test.ts
  src/modules/intervenciones/intervenciones.revisiones.rollback.integration.test.ts
  src/modules/intervenciones/intervenciones.revisiones.concurrente.integration.test.ts
  src/modules/intervenciones/registro.integration.test.ts
  src/modules/intervenciones/correccion.integration.test.ts
  src/modules/intervenciones/correccion.rollback.integration.test.ts` → passed;
  9 files, 16 tests, 49.06s.
- `pnpm typecheck` → passed. `pnpm reglas` → passed; 9 rules and 2 metrics
  over 687 files, with no findings. Targeted lint also passed with no issues.
- The rollback boundary is the test-file split and this ledger section only; no
  production file is included.
