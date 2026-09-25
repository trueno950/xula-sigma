# Apply progress: mapa-operativo-territorial

## Estado

- Modo: Strict TDD.
- Token nativo actual: el orquestador conserva `sha256:3d3d3abc0b16aa09fe21226a5331f6b046163d0f79fe4be3bfdd8eb82c50e5fb`;
  este ejecutor no lo adquiere ni lo asienta.
- Work unit actual: `U2-permisos-evidence-remediation`.
- Estrategia: `ask-on-risk`; chain `feature-branch-chain`, confirmada por el
  usuario. No se usa `stacked-to-main` ni `size:exception`.
- Alcance acumulado: U1a, persistencia append-only de U1b, hardening,
  aplicacion de correccion, administracion de estados, formulario de acciones,
  hardening de su frontera y ficha/correccion/navegacion siguen documentados
  abajo; U2 agrega evidencia de la separacion de permisos.

> Las filas de calidad y los comandos de las secciones siguientes conservan
> resultados historicos de cada unidad. No describen por si solos el estado
> actual del repositorio; la seccion final registra la ultima verificacion.

## Tareas

- [x] 1.1 — U0: delta de `territorio` sin inventar aceptacion.
- [x] 1.2 — U1: dominio, RLS y revisiones de intervenciones. (U1a y U1b completas; U2 queda completa en 1.3.)
- [x] 1.2a — U1a: dominio, tabla, RLS, FKs compuestos, registro base y aislamiento.
- [x] 1.2b — U1b: revisiones append-only, correcciones y administracion de estados, acciones y UI.
- [x] 1.2b.2a — U1b-correction-transaction-hardening: validacion de ubicacion,
  correccion y bitacora con la misma transaccion; aislamiento y rollback.
- [x] 1.2b.3a — U1b-state-application: caso de uso ADMIN_MUNICIPAL,
  transiciones, tenant, bitacora ID-only y pruebas.
- [x] 1.2b.3b — U1b-state-actions-ui: Server Actions, UI de administracion y
  navegacion.
- [x] 1.2b.3b.1 — U1b-state-action-form: Server Action estricta y formulario
  nativo para destinos de estado validos.
- [x] 1.2b.3b.1a — U1b-state-action-hardening: fallos de resolucion de
  sesion/tenant dentro del limite de error y mapeo seguro del tenant ausente.
- [x] 1.2b.3b.2 — U1b-state-detail-navigation: ficha, correccion e ingreso
  desde navegacion.
- [x] 1.3 — U2: registro por `puedeEscribir` y administracion por
  `puedeAdministrarIntervenciones`.
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
| Test enfocado | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run src/modules/intervenciones/domain/intervencion.test.ts src/modules/intervenciones/application/registrarIntervencion.test.ts src/modules/intervenciones/superficiePublica.test.ts src/modules/intervenciones/intervenciones.isolation.test.ts src/modules/intervenciones/intervenciones.clavesForaneas.isolation.test.ts src/modules/intervenciones/intervenciones.checks.isolation.test.ts src/modules/intervenciones/registro.integration.test.ts` → paso; 7 archivos, 27 tests. |
| Runtime harness | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm test:integration` → paso; 84 archivos, 308 tests. |
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
| Migracion y permisos | `MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" pnpm db:migrate` → paso; `relrowsecurity=true`, `relforcerowsecurity=true`, grants de `xula_app`: `INSERT`, `SELECT`. |
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
| Runtime harness | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm test:integration` → paso; 84 archivos, 312 tests contra Postgres real, incluida la correccion y bitacora por ID. |
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
| Runtime harness | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run --project integration src/modules/intervenciones/intervenciones.isolation.test.ts` → paso; 1 archivo, 8 tests contra Postgres real. |
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
| Test enfocado de integracion | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run --project integration src/modules/intervenciones/intervenciones.isolation.test.ts` → paso; 1 archivo, 10 tests. |
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
| Runtime harness | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm test -- intervenciones` → paso; 258 archivos, 1277 tests, 228.45 s. La ruta Next no se agrego en esta costura; el arnes real cubre el caso de uso y su persistencia contra Postgres. |
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
| Runtime harness | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm test -- intervenciones` → paso; 258 archivos, 1283 tests, 131.43 s. |
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

## U1b: validacion tenant-scoped de reporte (remediacion actual)

- Work unit: `U1b-report-link-validation`.
- La tentativa nativa fue recibida por el orquestador; esta unidad no adquiere,
  asienta, reinicia ni resetea otro intento.
- Alcance: validar un `reporteId` no nulo bajo el `TransaccionTenant` actual
  antes de registrar o corregir una intervencion. Un reporte inexistente o
  invisible por RLS devuelve `NoEncontradoError` sin escritura, revision ni
  bitacora; la FK compuesta existente permanece como defensa final.
- La tarea no estaba descrita con este caso de seguridad en `tasks.md`; se
  agrego y marco `1.2b.2b` completa, sin abrir otra unidad funcional.
- Limite solicitado: 220 lineas cambiadas. Resultado medido de codigo y
  pruebas: 370 lineas; no se eliminaron aserciones ni se comprimieron tests
  para perseguir el numero. Requiere `size:exception` o una division posterior
  antes de asentarse como una sola rebanada.

### TDD Cycle Evidence — validacion de reporte

| Tarea | Tests | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| 1.2b.2b | `registrarIntervencion.test.ts`, `corregirIntervencion.test.ts`, `registro.integration.test.ts`, `correccion.integration.test.ts` | ✅ Las pruebas de reporte inexistente y de otro municipio se escribieron antes del puerto, adaptador y cableado; la lectura requerida estaba ausente | ✅ Registro y correccion rechazan ambos casos con `NoEncontradoError` antes de guardar, corregir, revisar o auditar | ✅ Postgres real confirma aislamiento RLS, ausencia de intervencion/revision y bitacora sin cambios; suite completa, typecheck, capas y reglas en verde | ✅ El puerto pertenece a `intervenciones`; infraestructura usa la superficie publica de `reportes`; los helpers de prueba se extrajeron para respetar el limite de archivo |

### Work Unit Evidence — validacion de reporte

| Evidencia | Resultado |
|---|---|
| Test enfocado | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm test -- src/modules/intervenciones/application/registrarIntervencion.test.ts src/modules/intervenciones/application/corregirIntervencion.test.ts` → paso; Vitest ejecuto los proyectos configurados: 265 archivos, 1292 tests. |
| Runtime harness | Con las mismas tres variables, `pnpm test:integration -- src/modules/intervenciones/registro.integration.test.ts src/modules/intervenciones/correccion.integration.test.ts` → paso; 91 archivos, 322 tests contra Postgres real. |
| Quality gates | `pnpm typecheck` → paso; `pnpm layers` → paso, 682 modulos y 3045 dependencias; `pnpm reglas` → paso, 9 reglas y 2 metricas sobre 694 archivos. Biome dirigido (`pnpm exec biome check --write` sobre los 16 archivos cambiados) → sin issues. `pnpm check` → falla solo por el formato preexistente de `opencode.json` y 50 advertencias preexistentes; no reporta archivos de esta unidad. |
| Rollback boundary | Retirar `src/modules/intervenciones/application/{puertosDeLectura,registrarIntervencion,corregirIntervencion}.ts`, sus dos pruebas, `composicion.ts`, `infrastructure/{index,lectorDeReportesPorReportes}.ts`, los tres tests de integracion y sus dos helpers; retirar `crearReporteExisteEnTransaccion` y su exportacion de `src/modules/reportes/{application/reportePorId,composicion,index}.ts`, junto con la tarea `1.2b.2b` y esta seccion. Conservar U1a, revisiones, correcciones, estados y sus pruebas previas. |

### Resultado de la validacion de reporte

- El lector real consulta el reporte dentro del `tx` abierto por
  `withTenant`; no crea una segunda conexion ni recibe `ayuntamientoId` del
  cliente.
- Los casos de registro y correccion cubren un UUID de otro municipio y uno
  inexistente. Ambos se traducen a `NoEncontradoError` antes de cualquier
  efecto observable.
- El diff de esta rebanada mide 370 lineas de codigo y pruebas, 150 por encima
  del limite explicito de 220. La implementacion queda funcionalmente verde,
  pero no debe asentarse sin una decision de `size:exception` o una futura
  division de entrega.

## U1b: revalidacion del intento activo

- Work unit: `U1b-report-link-validation`.
- Token nativo activo recibido del orquestador: `sha256:dd19ad9522fc92c9ea56ce3ac0c13930ba18e3eedcf164dcc898842b28af648c`.
- El ejecutor no adquirio, asento, reinicio ni reseteo otro intento.
- La implementacion de la unidad ya estaba presente en el worktree al inicio
  de esta revalidacion. No se modificaron los cinco paths excluidos por el
  orquestador ni se altero codigo fuente adicional.

### TDD Cycle Evidence — revalidacion

| Tarea | Tests | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| 1.2b.2b | `registrarIntervencion.test.ts`, `corregirIntervencion.test.ts`, `registro.integration.test.ts`, `correccion.integration.test.ts` | ✅ La evidencia RED persistida confirma que los escenarios se escribieron antes del puerto, adaptador y cableado | ✅ Unitario: 2 archivos, 12 tests; integracion: 2 archivos, 9 tests; rollback: 1 archivo, 1 test | ✅ Se revalidaron reporte inexistente y reporte invisible de otro ayuntamiento, sin escritura, revision ni bitacora | ✅ Check dirigido de Biome sin hallazgos; typecheck y capas sin violaciones |

### Work Unit Evidence — revalidacion

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit src/modules/intervenciones/application/registrarIntervencion.test.ts src/modules/intervenciones/application/corregirIntervencion.test.ts` → paso; 2 archivos, 12 tests. |
| Runtime harness | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run --project integration src/modules/intervenciones/registro.integration.test.ts src/modules/intervenciones/correccion.integration.test.ts` → paso; 2 archivos, 9 tests contra Postgres real. La regresion de rollback tambien paso: `correccion.rollback.integration.test.ts`, 1 test. |
| Typecheck | `pnpm typecheck` → paso. |
| Reglas y capas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 694 archivos. `pnpm layers` → paso; 682 modulos y 3045 dependencias, sin violaciones. |
| Lint dirigido | `rtk lint check` sobre los archivos de la unidad → paso; sin issues. |
| Quality gate | `pnpm check` → falla con el unico error preexistente de formato en `opencode.json`; mantiene 50 advertencias preexistentes y no reporta errores en los archivos de esta unidad. No se modifico `opencode.json`. |
| Rollback boundary | Retirar unicamente la validacion tenant-scoped de `reporteId`, su puerto/adaptador, las pruebas de unidad e integracion y sus helpers de prueba; conservar U1a, revisiones append-only, correccion, estados y sus evidencias previas. |

### Resultado de la revalidacion

- El estado de fuente conserva la lectura del reporte dentro del `tx` de
  `withTenant`, con `NoEncontradoError` para filas inexistentes o invisibles.
- La evidencia actual confirma que registro y correccion no escriben
  intervencion, revision ni bitacora antes de validar el vinculo.
- La verificacion queda verde salvo el baseline conocido de `pnpm check` en
  `opencode.json`; no se hizo ninguna edicion de ese archivo ni de los paths
  excluidos.

## U1b: ficha, correccion y navegacion (actual)

- Work unit: `U1b-state-detail-navigation`.
- Alcance: ficha server-rendered por id, correccion append-only mediante Server
  Action y formulario nativo, controles de estado para administracion y entrada
  del modulo en la navegacion. No se agrega listado ni alta en la ruta raiz;
  quedan fuera de esta hoja.
- El token nativo lo conserva el orquestador; este ejecutor no lo adquiere ni
  lo asienta. Se conserva `feature-branch-chain`.
- La unidad agrega 523 lineas cambiadas de codigo, pruebas y la documentacion
  de su superficie, frente al maximo local de 240. No se eliminan aserciones,
  comentarios ni pruebas para perseguir el numero; requiere recomendacion de
  `size:exception` antes de asentarse como una sola rebanada.

### TDD Cycle Evidence — ficha, correccion y navegacion

| Tarea | Tests | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.2b.3b.2 | `app/(panel)/intervenciones.test.tsx`, `ui/FormularioDeCorreccion.test.tsx`, `ui/actions/corregirIntervencionAction.test.ts` | Unit | Casos de uso, aislamiento y acciones de estado ya verificados en las rebanadas anteriores | ✅ Cada superficie nueva fallo primero por modulo o ruta ausente | ✅ 3 archivos, 10 tests | ✅ Correccion, rollback, aislamiento, suite completa, typecheck, capas y reglas en verde | ✅ Formato Biome aplicado y comentario de navegacion corregido sin cambiar comportamiento |

### Work Unit Evidence — ficha, correccion y navegacion

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit 'src/app/(panel)/intervenciones.test.tsx' 'src/modules/intervenciones/ui/FormularioDeCorreccion.test.tsx' 'src/modules/intervenciones/ui/actions/corregirIntervencionAction.test.ts'` → paso; 3 archivos, 10 tests. |
| Runtime harness | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run --project integration src/modules/intervenciones/correccion.integration.test.ts src/modules/intervenciones/correccion.rollback.integration.test.ts src/modules/intervenciones/intervenciones.isolation.test.ts` → paso; 3 archivos, 8 tests contra Postgres real. |
| Regresion de modulo | Con las mismas variables, `pnpm test -- intervenciones` → paso; 268 archivos, 1302 tests, 249.88 s. |
| Harness autenticado/UI | `pnpm test:e2e` construyo y arranco la aplicacion; 8 de 11 tests pasaron. 3 pruebas preexistentes fallaron por `The destination stream closed early` y agotaron timeout en `bajaDeLugar.spec.ts`, `calles.spec.ts` y `respaldoPorHost.spec.ts`; los fixtures no siembran intervenciones, por lo que no existe un escenario E2E especifico de esta ficha. |
| Quality gates | `pnpm typecheck`, `pnpm reglas` (9 reglas, 2 metricas, 694 archivos), `pnpm layers` (688 modulos, 3076 dependencias) y lint dirigido → paso. `pnpm check` falla solo por el formato preexistente de `opencode.json` y conserva 50 advertencias; no reporta errores en los archivos de esta unidad. |
| Rollback boundary | Retirar `src/app/(panel)/intervenciones.test.tsx`, `src/app/(panel)/intervenciones/[id]/page.tsx`, la entrada de `NavegacionDeModulos.tsx`, `src/modules/intervenciones/ui/{FormularioDeCorreccion.tsx,FormularioDeCorreccion.test.tsx}`, `ui/actions/{corregirIntervencionAction.ts,corregirIntervencionAction.test.ts}`, la exportacion en `src/modules/intervenciones/index.ts`, la fila/nota correspondiente de `AGENTS.md` y esta seccion; conservar aplicacion, infraestructura, migraciones y pruebas previas. |

### Resultado de ficha, correccion y navegacion

- La ficha resuelve el contexto en servidor, consulta por `withTenant` y trata
  una fila invisible o inexistente como `notFound()`, sin distinguir tenants.
  Presenta por separado la fecha de ocurrencia y los momentos de captura y
  actualizacion; solo `ADMIN_MUNICIPAL` ve estado y correccion.
- La correccion valida con Zod en la primera frontera, conserva el contexto de
  servidor, usa el formulario nativo y redirige errores con mensajes seguros.
  La descripcion es el unico campo de texto libre visible; el estado queda en
  su accion de administracion separada.
- La navegacion marca `/intervenciones` como activa y conserva la costura de
  rutas para la ficha. `tasks.md` marca `1.2b.3b.2` completa; `1.2b.3b` y
  `1.2b` permanecen abiertas.
- La funcionalidad esta verde en focused/integration, pero el exceso medido de
  283 lineas sobre el maximo y los fallos E2E preexistentes deben quedar a la
  vista del orquestador antes de la verificacion independiente.

## Remediacion vinculada: brechas de evidencia de U1b-state-detail-navigation

- Work unit: `U1b-state-detail-navigation-evidence-remediation`.
- Token nativo recibido del orquestador: `sha256:27277fcafaf52bad5c829732123f0f19d101ebc8542abb2dc1be4eab04a66243`.
- Revision de evidencia fallida que se remedia: `sha256:73900353b95999bcf336d1000692997f880eec2e19fb2a7957ade3daf8d7d640`.
- El ejecutor no adquirio, asento, reinicio ni reseteo otro intento.
- Limite de esta remediacion: 180 lineas cambiadas; el maintainer autorizo
  `size:exception` para esta unidad. Se conserva `feature-branch-chain`.
- Alcance cerrado: cobertura directa de errores de la Server Action, contrato
  oculto de `lugarId`, tipografia de fechas con `CLASES_DE_DATO` y un journey
  de intervencion agregado a infraestructura E2E existente y rastreada.
- `tasks.md` conserva `[x] 1.2b.3b.2`; esta remediacion corrige evidencia de la
  misma tarea y no abre una tarea funcional nueva.

### TDD Cycle Evidence — remediacion de evidencia

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Mapeos de `corregirIntervencionAction` | `ui/actions/corregirIntervencionAction.test.ts` | Unit | ✅ 3 archivos, 10 tests | ✅ Tests escritos antes; el primer resultado de estos regresos fue verde porque la implementacion ya tenia los mapeos | ✅ 3 archivos, 13 tests finales | ✅ `NoAutorizadoError`, `ValidacionError` y error desconocido con log seguro | ✅ Biome y test enfocado en verde |
| Contrato oculto de `lugarId` | `ui/FormularioDeCorreccion.test.tsx` | Unit | ✅ 3 archivos, 10 tests | ✅ Aserciones escritas antes; la implementacion ya transportaba el campo | ✅ 3 archivos, 13 tests finales | ✅ Lugar inicial y lugar alterno, con referencias nulas y existentes | ✅ Biome y test enfocado en verde |
| Fechas de la ficha | `app/(panel)/intervenciones.test.tsx` | Unit | ✅ 3 archivos, 10 tests | ✅ La nueva asercion fallo: 1 test rojo por clases de dato ausentes | ✅ 3 archivos, 13 tests finales | ✅ Ocurrencia, captura y actualizacion usan la convencion compartida | ✅ Extraccion de `dato` y Biome, sin cambio de comportamiento de datos |
| Journey de ficha y correccion | `e2e/calles.spec.ts` + `e2e/calles.fixture.ts` | E2E | ✅ Infraestructura E2E rastreada existente | ✅ El test primero dejo `Scenario.intervencionId` ausente y `pnpm typecheck` fallo | ✅ Journey enfocado: 1 test pasado | ✅ Render server-side y correccion nativa con resultado visible | ✅ Se retiro `networkidle`, que colgaba por el stream del harness, y se uso un locator de salida visible |

### Test Summary — remediacion

- **Tests enfocados finales**: 3 archivos, 13 tests unitarios.
- **Tests PostgreSQL finales**: 3 archivos, 8 tests de integracion.
- **Journey E2E nuevo**: 1 test enfocado pasado.
- **Approval tests**: los tests enfocados previos funcionaron como safety net;
  no se refactorizo logica de negocio.
- **Funciones puras nuevas**: ninguna.

### Work Unit Evidence — remediacion

| Evidencia | Resultado |
|---|---|
| Test unitario enfocado | `pnpm vitest run --project unit 'src/app/(panel)/intervenciones.test.tsx' 'src/modules/intervenciones/ui/FormularioDeCorreccion.test.tsx' 'src/modules/intervenciones/ui/actions/corregirIntervencionAction.test.ts'` → paso; 3 archivos, 13 tests. |
| Test PostgreSQL enfocado | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run --project integration src/modules/intervenciones/correccion.integration.test.ts src/modules/intervenciones/correccion.rollback.integration.test.ts src/modules/intervenciones/intervenciones.isolation.test.ts` → paso; 3 archivos, 8 tests. |
| Runtime harness E2E | `pnpm test:e2e --grep "intervenciones conserva la ficha"` → paso; 1 journey, 12.4 s. El servidor tambien registro el warning conocido `The destination stream closed early`; no impidio este journey enfocado. |
| Typecheck | `pnpm typecheck` → paso. |
| Reglas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 694 archivos. |
| Capas | `pnpm layers` → paso; 688 modulos y 3077 dependencias, sin violaciones. |
| Lint dirigido | Biome sobre los seis paths UI autorizados y `e2e/calles.{fixture,spec}.ts` → paso; sin issues. |
| Diff | `git diff --check` → paso. |
| Quality gate | `pnpm check` → falla solo por el formato preexistente de `opencode.json`; conserva 50 warnings preexistentes y no reporta errores en los paths de esta remediacion. |
| Runtime adicional conocido | La corrida E2E completa previa queda en 8/11: `bajaDeLugar.spec.ts`, `calles.spec.ts` y `respaldoPorHost.spec.ts` agotaron timeout con `The destination stream closed early`; no se atribuye ese fallo al journey nuevo. |
| Rollback boundary | Retirar unicamente las nuevas aserciones de `src/app/(panel)/intervenciones.test.tsx`, `src/modules/intervenciones/ui/FormularioDeCorreccion.test.tsx` y `ui/actions/corregirIntervencionAction.test.ts`; revertir `dato`/`CLASES_DE_DATO` en la ficha, el test y fixture de `e2e/calles.spec.ts`/`e2e/calles.fixture.ts`, y esta seccion. Conservar la funcionalidad U1b previa. |

### Resultado de la remediacion

- La Server Action afirma directamente los mapeos de autorizacion,
  validacion y error desconocido: todos vuelven con mensaje seguro de
  operador y el detalle inesperado queda fuera de la redireccion.
- El formulario afirma que `lugarId` viaja en el POST nativo tanto para el
  lugar inicial como para otro lugar valido.
- La ficha usa `CLASES_DE_DATO` en fecha de ocurrencia, captura y actualizacion.
- El journey E2E existente siembra una intervencion, abre su ficha autenticada
  y confirma la correccion nativa por el valor visible de la ficha. La
  advertencia de stream permanece documentada, pero el caso enfocado paso.

## Cierre acumulado: U1b y U1

- Verificacion: todos los leaf units bajo `1.2b.3` están `[x]` y tienen evidencia aprobada; la remediacion de `1.2b.3b.2` queda respaldada por `sha256:3930a4b2d1979eecdf08d423e250b3219ecb876b67747183eb3acf11dedaf150`.
- Evidencia de la remediacion: 3 archivos/13 tests unitarios, 3 archivos/8 tests PostgreSQL y 1 journey E2E enfocado pasaron.
- Verificacion documental: relectura estructural de ambos artefactos y `git diff --check` → paso; test enfocado: N/A — no hay código ejecutable; runtime harness: N/A — no se modificó comportamiento ejecutable.
- Se cierran los agregados `1.2b.3`, `1.2b.3b`, `1.2b` y `1.2`; `1.3 U2` se documenta en la seccion siguiente y las fases posteriores permanecen pendientes.
- Rollback boundary: revertir únicamente los cuatro checkboxes y los textos parent actualizados en `tasks.md` y este ledger, incluida esta sección; no revertir fuentes, tests, configuración ni E2E.

## U2: permisos de escritura (evidencia inicial)

- Work unit: `U2-permisos-escritura`.
- El token nativo lo conserva el orquestador; este ejecutor no adquiere ni
  asienta otro intento.
- Alcance: confirmar que registrar usa `puedeEscribir`, mientras cambiar el
  estado y corregir exigen `puedeAdministrarIntervenciones`.
- La implementacion de produccion ya cumplia el contrato al iniciar esta
  unidad: `registrarIntervencion` usa `puedeEscribir` y las dos operaciones
  administrativas usan la regla nueva. Se agrego una regresion explicita;
  no hubo cambio de produccion.
- La unidad agrego 13 lineas propias al test, dentro del limite de 180. El
  resto del diff de ese archivo pertenece a la validacion de reportes de U1b.

### TDD Cycle Evidence — U2

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.3 | `registrarIntervencion.test.ts`, `roles.test.ts`, `cambiarEstadoDeIntervencion.test.ts`, `corregirIntervencion.test.ts` | Unit | ✅ 4 archivos, 42 tests | ✅ La prueba de separacion se escribio antes de la verificacion; el primer resultado fue verde porque la implementacion ya estaba presente | ✅ 4 archivos, 43 tests | ✅ OPERADOR registra pero no administra; CONSULTA no registra; estado y correccion niegan roles no administradores | ➖ No hubo codigo de produccion que refactorizar |

### Work Unit Evidence — U2

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit src/modules/intervenciones/application/registrarIntervencion.test.ts` → paso; 1 archivo, 7 tests. |
| Triangulacion | `pnpm vitest run --project unit src/shared/auth/roles.test.ts src/modules/intervenciones/application/registrarIntervencion.test.ts src/modules/intervenciones/application/cambiarEstadoDeIntervencion.test.ts src/modules/intervenciones/application/corregirIntervencion.test.ts` → paso; 4 archivos, 43 tests. |
| Runtime harness | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run --project integration src/modules/intervenciones/registro.integration.test.ts` → paso; 1 archivo, 4 tests contra Postgres real. |
| Typecheck | `pnpm typecheck` → paso. |
| Reglas y capas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 694 archivos. `pnpm layers` → paso; 688 modulos y 3078 dependencias, sin violaciones. |
| Diff | `git diff --check` → paso. |
| Rollback boundary | Retirar el import y la prueba agregada en `src/modules/intervenciones/application/registrarIntervencion.test.ts`, revertir el checkbox 1.3 y esta seccion; no hay produccion que revertir. |

### Resultado de U2

- Un `OPERADOR` con permiso de escritura puede registrar una intervencion sin
  recibir permiso de administracion.
- `cambiarEstadoDeIntervencion` y `corregirIntervencion` conservan la guarda
  exclusiva de `ADMIN_MUNICIPAL`; los recursos invisibles mantienen el camino
  de `NoEncontradoError` ya probado bajo `withTenant`.
- `tasks.md` marca `1.3` completa. Las fases 2 a 4 y la verificacion completa
  siguen pendientes.

## Remediacion U2: evidencia real de permisos

- Work unit: `U2-permisos-evidence-remediation`.
- Token nativo recibido del orquestador: `sha256:3d3d3abc0b16aa09fe21226a5331f6b046163d0f79fe4be3bfdd8eb82c50e5fb`.
- Revision de evidencia fallida que se remedia: `sha256:31c356da9f8520773cc92654919d126d0d52380e856bebf6a4ca12843c19dbcd`.
- Alcance cerrado: una asercion directa contra Postgres real para el registro de
  un `OPERADOR` por `puedeEscribir`, sin ampliar UI ni afirmar comportamiento
  de aplicacion que no este cubierto aqui.
- No se cambio produccion: `registrarIntervencion` ya usa `puedeEscribir` y
  `cambiarEstadoDeIntervencion`/`corregirIntervencion` conservan la guarda de
  `puedeAdministrarIntervenciones`.

### TDD Cycle Evidence — remediacion U2

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.3 | `registro.integration.test.ts`, `registrarIntervencion.test.ts` | Integration + unit | ✅ 268 archivos, 1306 tests | ✅ Aserciones escritas primero; la implementacion existente ya satisfacia el contrato y la primera corrida fue verde | ✅ Postgres: 1 archivo, 4 tests; unit: 1 archivo, 7 tests | ✅ Alta real con `OPERADOR` y caminos de ubicacion/reporte rechazados; `CONSULTA` sigue rechazado en unit | ➖ No hubo codigo de produccion que refactorizar |

### Test Summary — remediacion U2

- Tests nuevos: 2 aserciones en una prueba de integracion existente; no se
  agrego una suite mock-backed para sustituir la prueba real.
- Tests PostgreSQL: 1 archivo, 4 tests; pruebas unitarias de registro: 1
  archivo, 7 tests.
- Funciones puras nuevas: ninguna. Approval tests de refactor: ninguno.

### Work Unit Evidence — remediacion U2

| Evidencia | Resultado |
|---|---|
| Test PostgreSQL enfocado | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm test -- src/modules/intervenciones/registro.integration.test.ts` → paso; 268 archivos, 1306 tests. |
| Test de aplicacion | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm test -- src/modules/intervenciones/application/registrarIntervencion.test.ts` → paso; 268 archivos, 1306 tests. |
| Typecheck | `pnpm typecheck` → paso. |
| Reglas y capas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 694 archivos. `pnpm layers` → paso; 688 modulos y 3079 dependencias, sin violaciones. |
| Diff | `git diff --check` → paso. |
| Runtime harness | La prueba de integracion enfocada ejecuta el caso de uso, `withTenant`, repositorio SQL, RLS y bitacora contra Postgres real; paso. |
| Rollback boundary | Retirar los imports, aserciones y nombre de prueba agregados en `src/modules/intervenciones/registro.integration.test.ts`, y esta seccion; no revertir produccion ni las guardas administrativas. |

### Resultado de la remediacion U2

- La prueba reconsulta la fila persistida por el rol `xula_app` dentro de
  `withTenant`, comprueba el `id`, el estado `PLANIFICADA` y el operador que la
  registro, y verifica que `puedeEscribir` es verdadero mientras la regla
  administrativa es falsa.
- `tasks.md` y este ledger marcan `1.3` completa con alcance de autorizacion y
  evidencia real; las fases 2 a 4 siguen pendientes.

## L0: reparacion del linaje de 0014 (actual)

- Work unit: `L0-drizzle-lineage-repair`. El token nativo lo conserva el
  orquestador; este ejecutor no lo adquiere ni lo asienta.
- Alcance: promover solo `drizzle/meta/0014_snapshot.json`, generado en una
  copia aislada fuera del worktree. `drizzle/0014_revisiones_intervenciones.sql`
  y `drizzle/meta/_journal.json` permanecen byte a byte: sus hashes preflight y
  post-promocion son identicos (SQL `b63764e7...`, journal `36cfa424...`).
- Copia retenida como evidencia:
  La ubicacion local de la copia aislada se omite de este artefacto.
- Nota operativa: pnpm 11.22 intenta `pnpm install` al ejecutar scripts y se
  niega porque `node_modules` es un symlink fuera del root de la copia; se
  ejecuto con `pnpm_config_verify_deps_before_run=false`. No afecta al repo.

### Work Unit Evidence — L0

| Evidencia | Resultado |
|---|---|
| `pnpm db:local` en la copia (journal truncado a 0013) | paso; `drizzle.__drizzle_migrations` con 14 filas, ultimo `when` 1789049065173 (0013); `revisiones_de_intervenciones` ausente. |
| `pnpm db:generate` en la copia (primer run) | paso; genero `drizzle/0014_sour_hellion.sql` y `drizzle/meta/0014_snapshot.json`; el SQL generado es estructuralmente equivalente al autoral (RLS/politica salen del esquema TS; FORCE RLS y GRANT son adiciones manuales que Drizzle no genera). |
| Validacion estructural del snapshot | paso; `prevId` = `69ab52ee-8e3d-41e9-9739-ee38503bcf84` (id de `0013_snapshot.json`), `version` 7, `dialect` postgresql; tabla `revisiones_de_intervenciones` con 6 columnas, RLS habilitado, politica tenant `revisiones_de_intervenciones_tenant` (PERMISSIVE/ALL/xula_app, USING y WITH CHECK por `app.tenant`), 2 indices y 3 FKs (`ayuntamientos`, `intervenciones(id, ayuntamiento_id)`, `usuarios(id, ayuntamiento_id)`). |
| `pnpm db:generate` en la copia (segundo run, journal real restaurado) | paso; `No schema changes, nothing to migrate`. El snapshot describe por completo el esquema TypeScript. |
| `pnpm db:local` en la copia (journal real) + suite enfocada | paso; cadena 0→14 aplicada (15 filas, tabla presente); `pnpm vitest run --project integration src/modules/intervenciones/intervenciones.isolation.test.ts` → 1 archivo, 2 tests. |
| Promocion | `git status --porcelain -- drizzle/` → solo `?? drizzle/meta/0014_snapshot.json`; `git diff --check` → limpio; hashes de SQL y journal sin cambio. Hash del snapshot promovido: `6dc3eb5913c988d502abcba78c5e2c3c00fcfc534ad886542842d07000169079`. |
| `pnpm db:local` en el repo real | paso; 15 filas en `__drizzle_migrations` (0→14) y `revisiones_de_intervenciones` presente; `xula_test` queda migrada hasta 0014. |
| Suite enfocada en el repo real | paso; `pnpm vitest run --project integration src/modules/intervenciones/intervenciones.isolation.test.ts` → 1 archivo, 2 tests. |
| Runtime harness | N/A: L0 es metadata generada; no introduce comportamiento ejecutable. Su validacion es la regeneracion sin cambios y la migracion real. |
| Rollback boundary | Borrar unicamente `drizzle/meta/0014_snapshot.json`; SQL y journal permanecen intactos. |

### Resultado L0

- Discrepancia de nombre documentada, no corregida: el SQL autoral nombra la FK
  de `ayuntamiento_id` `revisiones_intervenciones_ayuntamiento_fk`, mientras el
  esquema TS no la nombra y Drizzle la registra en el snapshot como
  `revisiones_de_intervenciones_ayuntamiento_id_ayuntamientos_id_fk`. El SQL
  esta congelado por L0 y la generacion futura diferencia contra el snapshot,
  no contra la base.
- `tasks.md` marca `2.1 L0` completa. Las fases 2 a 4 siguen pendientes.

## U3a: eventos de calles, RLS y lecturas (actual)

- Work unit: `U3a-eventos-de-calles`. El token nativo lo conserva el
  orquestador; este ejecutor no lo adquiere ni lo asienta.
- Alcance: tabla `eventos_de_calles` (migracion 0015, RLS/FORCE, GRANT
  SELECT+INSERT, FK compuesto), escritura del evento en las cuatro
  mutaciones estructurales dentro de su misma transaccion, y los puertos de
  lectura `callesParaMapa` y `callePorId`. Sin publicacion, sin `pg_notify`,
  sin LISTEN/SSE, sin permiso nuevo y sin escritor generico: las cuatro
  operaciones del repositorio son una por naturaleza y solo las alcanzan las
  mutaciones guardadas.
- `esquema.ts` paso de 198 a 120 lineas: `lugares`, `calles` y la tabla
  nueva viven en `esquemaDeCalles.ts`, reexportadas por `esquema.ts` porque
  el glob de `drizzle.config.ts` solo alcanza ese archivo. La regeneracion
  posterior reporto `No schema changes`.

### TDD Cycle Evidence — U3a

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.2/2.3 | `eventosDeCalles.isolation.test.ts`, `callesParaMapa.{test,integration}.test.ts`, `callePorId.{test,integration}.test.ts` y las cuatro pruebas de mutacion | Unit + integration | ✅ Suites previas de `territorio` en verde | ✅ Unit: 6 archivos fallaron (2 por modulo ausente y 4 por la escritura de evento ausente); integracion: 3 archivos, 5 pruebas fallaron | ✅ Unit: 43 archivos, 231 pruebas; integracion enfocada: 3 archivos, 11 pruebas; modulo integro: 24 archivos, 83 pruebas | ✅ RLS, FK compuesto, append-only, rollback, punto nulo, baja logica, cruce de tenants, `ALTA` excluida y desempate por rango e id | ✅ `esquema.ts` partido en `esquemaDeCalles.ts` + `esquema.ts` reexportador; proyeccion de calle compartida en `lecturaDeCalle.ts` |

### Work Unit Evidence — U3a

| Evidencia | Resultado |
|---|---|
| Migracion | `pnpm db:local` → paso; `xula_test` recreada y migrada 0→15 (`0015_eventos_de_calles.sql`). `relrowsecurity=true`, `relforcerowsecurity=true`; grants de `xula_app`: `INSERT`, `SELECT`; FK compuesto `eventos_de_calles_calle_tenant_fk (calle_id, ayuntamiento_id) → calles(id, ayuntamiento_id)`. |
| Test enfocado de aislamiento | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run --project integration src/modules/territorio/eventosDeCalles.isolation.test.ts` → paso; 1 archivo, 5 pruebas. |
| Test enfocado unitario | `pnpm vitest run --project unit src/modules/territorio` → paso; 43 archivos, 231 pruebas. |
| Integracion del modulo | Con los tres roles locales, `pnpm vitest run --project integration src/modules/territorio` → paso; 24 archivos, 83 pruebas. |
| Runtime harness | Postgres real: la mutacion `renombrarCalle` con actor no UUID hace fallar la bitacora despues del INSERT del evento; la transaccion revierte calle y evento (0 filas). La conexion `appSinTenant` lee 0 filas. |
| Regeneracion | `MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" pnpm exec drizzle-kit generate --name=eventos_de_calles` → `No schema changes, nothing to migrate`; el snapshot 0015 describe el esquema completo. |
| Typecheck | `pnpm typecheck` → paso. |
| Reglas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 694 archivos (solo rastreados). Los 13 archivos nuevos sin rastrear se revisaron ejecutando el motor de reglas directo sobre ellos: 0 hallazgos reales (el unico reporte, `modulo-cuatro-capas`, es un falso positivo del corpus parcial: sin los archivos de `ui/` el conjunto de capas parece incompleto). |
| Capas | `pnpm layers` → paso; 700 modulos, 3152 dependencias, sin violaciones. |
| Diff | `git diff --check` → limpio. |
| Rollback boundary | Retirar `drizzle/0015_eventos_de_calles.sql`, `drizzle/meta/0015_snapshot.json`, la entrada 0015 del journal, `domain/eventoDeCalle.ts`, `application/{puertosDeLecturaDeCalles,callesParaMapa,callePorId}.ts`, `infrastructure/{esquemaDeCalles,lecturaDeCalle,lectorDeCallesDeMapaSql}.ts`, las cinco pruebas nuevas y las aserciones de evento de las cuatro pruebas de mutacion; revertir `esquema.ts` al estado previo (con `lugares`/`calles` adentro) y los cuatro casos de uso, sus puertos y el cableado. Conservar U1 y U2. |

### Resultado U3a

- Cada mutacion estructural escribe su evento con la misma `tx` del cambio
  de calle y antes de la bitacora: un fallo posterior revierte ambos.
  `ocurridoEn` lo asigna Postgres (`now()`), nunca el cliente.
- `callesParaMapa` devuelve todas las calles del tenant, incluidas las de
  `bajaEn` y las sin punto, sin leer domicilios, descripciones ni datos
  personales. `callePorId` devuelve estado y solo las naturalezas
  `RENOMBRE`, `REPARENTEO` y `UBICACION`, ordenadas por `ocurridoEn` DESC,
  rango fijo y `id` ASC; una calle de otro municipio es ausencia.
- Ninguna de las dos lecturas exige `puedeAdministrarTerritorio`; el tenant
  sale del contexto del servidor y RLS cierra el resto.
- `tasks.md` marca `2.2` y `2.3` completas. U3b (publicacion) y las fases 3
  y 4 siguen pendientes.

## U3b: publicacion de cambios de calle (actual)

- Work unit: `U3b-publicacion-calles`. El token nativo lo conserva el
  orquestador; este ejecutor no lo adquiere ni lo asienta.
- Alcance: `pg_notify` transaccional con payload Zod exacto y
  `canalDeTenant` puro en `src/shared/notificaciones/`, mas el cableado de
  las cuatro mutaciones dentro de su mismo `withTenant`. Sin LISTEN/SSE/hub,
  sin ruta ni isla (U7), sin excepcion de tenancy y sin tocar `AGENTS.md`.
- Codigo y pruebas: 396 lineas, dentro del presupuesto local de 400. Este
  ledger es documentacion y va aparte.

### TDD Cycle Evidence — U3b

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.4/2.5 | `canales.test.ts`, `notificar.test.ts`, `notificar.integration.test.ts`, `notificacionDeCalles.integration.test.ts` y las cuatro pruebas de mutacion | Unit + integration | ✅ U3a: 43 archivos/231 pruebas unitarias y 24/83 de integracion | ✅ Unit compartido: 2 archivos sin modulo; unit territorio: 4 pruebas rojas por publicacion ausente; integracion: `./canales` ausente | ✅ Unit: 2/8 y 43/231; integracion compartida: 1/1; integracion territorio: 25/86 | ✅ Payload exacto, faltante/extra/id invalido, canal por tenant, commit/rollback, cruce Ticul→Motul y las cuatro mutaciones | ✅ `canalDeTenant` puro y separado; publicacion solo por `tx`; `publicarEn` compacta la asercion de alta |

### Work Unit Evidence — U3b

| Evidencia | Resultado |
|---|---|
| Test unitario compartido | `pnpm vitest run --project unit src/shared/notificaciones` → paso; 2 archivos, 8 pruebas. |
| Test unitario del modulo | `pnpm vitest run --project unit src/modules/territorio` → paso; 43 archivos, 231 pruebas. |
| LISTEN real compartido | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run --project integration src/shared/notificaciones` → paso; 1 archivo, 1 prueba: entrega unica con payload exacto al confirmar. |
| LISTEN real de mutaciones | Con las mismas tres variables, `pnpm vitest run --project integration src/modules/territorio` → paso; 25 archivos, 86 pruebas: el renombre confirma y notifica su identidad, la mutacion revertida calla y Ticul notifica solo a Ticul. |
| Typecheck | `pnpm typecheck` → paso. |
| Reglas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 694 archivos. Los 7 archivos nuevos sin rastrear se revisaron con el motor directo: 0 hallazgos. |
| Capas | `pnpm layers` → paso; 707 modulos, 3187 dependencias, sin violaciones. |
| Diff | `git diff --check` → paso. |
| Rollback boundary | Retirar `src/shared/notificaciones/`, las llamadas e imports en las cuatro mutaciones, las aserciones de publicacion de las cuatro pruebas unitarias, `notificacionDeCalles.integration.test.ts`, los checkboxes 2.4/2.5 y esta seccion. Conservar U3a. |

### Resultado U3b

- `canalDeTenant` es puro y recibe el id marcado; `publicarActualizacion`
  valida con Zod estricto y ejecuta `pg_notify` en el `tx` del llamador, con
  el canal derivado del `ayuntamientoId` del servidor.
- Las cuatro mutaciones publican despues de insertar su evento y antes de la
  bitacora: cambio, evento y notificacion confirman o revierten juntos.
- Postgres entrega una sola notificacion al COMMIT con
  `{ tipo: "calle", id, cambio: "estructura" }`; una transaccion revertida no
  entrega nada y el canal de un municipio no recibe lo de otro.
- `tasks.md` marca `2.4` y `2.5` completas. U4a sigue pendiente.

## U4a: lectura de reportes para el mapa (actual)

- Work unit: `U4a-lectura-reportes-mapa`. El token nativo lo conserva el
  orquestador (`sha256:f39be114...`); este ejecutor no lo adquiere ni lo
  asienta.
- Alcance: lectura operativa solo con sesion que devuelve los reportes del
  tenant del contexto con exactamente `id`, `folio`, `tipo`, `estado`,
  `calleId` y `lugarId`. Sin `descripcion` ni `referencia`; las filas con
  `calleId` nulo entran. Sin publicacion, sin `pg_notify`, sin LISTEN/SSE,
  sin migracion y sin dependencia nueva. U4b queda bloqueada por D1/D2.
- Desvio 1: los tipos del puerto viven en
  `application/puertosDeLecturaDeReportes.ts` y no en `puertos.ts` porque
  `puertos.ts` esta en 196/200 lineas y `metrica-archivo-200` no admite
  crecerlo; es el mismo corte de `territorio` con
  `puertosDeLecturaDeCalles.ts`.
- Desvio 2: el adaptador `lectorDeReportesDeMapaSql` se agrega a
  `infrastructure/listadoDeReportesSql.ts` (como pedia `tasks.md`) y se
  exporta por `infrastructure/index.ts`; se cablea directo en
  `composicion.ts` -sin pasar por `repositorioDeReportesSql`-, mismo
  mecanismo que `callesParaMapa` con `lectorDeCallesDeMapaSql`. El caso de
  uso y el tipo tambien se exportan por los barriles para que U6 los
  consuma.
- Codigo y pruebas: 385 lineas (343 de archivos nuevos + 42 netas en
  archivos rastreados), dentro del presupuesto local de 450. Este ledger es
  documentacion y va aparte.

### TDD Cycle Evidence — U4a

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.6/2.7 | `application/listarReportesParaMapa.test.ts`, `listarReportesParaMapa.integration.test.ts` | Unit + integration | ✅ Suites previas de `reportes`: 29 archivos/124 tests unitarios y 13/37 de integracion | ✅ Unit: 1 suite fallo por modulo ausente; integracion enfocada: 1 suite fallo por modulo ausente | ✅ Unit: 30 archivos, 128 tests; integracion enfocada: 1 archivo, 4 tests | ✅ Fila nula, fila con calle, cruce Motul→Ticul, ausencia de `descripcion`/`referencia` y rol `CONSULTA` sin guarda | ✅ Biome aplicado; el puerto se separo por la metrica de 200 lineas |

### Work Unit Evidence — U4a

| Evidencia | Resultado |
|---|---|
| Test enfocado unitario | `pnpm vitest run --project unit src/modules/reportes` → paso; 30 archivos, 128 pruebas. |
| Test enfocado de integracion | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run --project integration src/modules/reportes/listarReportesParaMapa.integration.test.ts` → paso; 1 archivo, 4 pruebas. |
| Runtime harness | Con los tres roles locales, `pnpm vitest run --project integration src/modules/reportes` → paso; 14 archivos, 41 pruebas contra Postgres real: RLS acota el tenant, la fila sin calle aparece y las columnas protegidas no salen. |
| Typecheck | `pnpm typecheck` → paso. |
| Reglas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 694 archivos. Los 4 archivos nuevos sin rastrear se revisaron con el motor directo: 0 metricas y el unico reporte es el falso positivo ya documentado de `modulo-cuatro-capas` con corpus parcial. |
| Capas | `pnpm layers` → paso; 711 modulos, 3211 dependencias, sin violaciones. |
| Diff | `git diff --check` → paso. |
| Lint dirigido | Biome sobre los nueve paths de la unidad → sin issues (formato aplicado a un test). |
| Rollback boundary | Retirar `application/{puertosDeLecturaDeReportes,listarReportesParaMapa}.ts`, las dos pruebas, `lectorDeReportesDeMapaSql` de `infrastructure/listadoDeReportesSql.ts`, su export en `infrastructure/index.ts`, el cableado en `composicion.ts`, las exportaciones de `application/index.ts` y `index.ts`, los checkboxes 2.6/2.7 y esta seccion. Conservar U3a/U3b y el resto del modulo. |

### Resultado U4a

- `listarReportesParaMapa` recibe solo el contexto, resuelve el tenant con
  `withTenant` y no aplica guarda de rol: un `CONSULTA` lee el mapa. RLS
  acota el resultado al ayuntamiento del contexto.
- El adaptador selecciona columnas explicitas: `descripcion` y `referencia`
  no existen del lado del consumidor ni viajan por la consulta; una fila con
  `calleId` nulo aparece sin filtro ni descarte.
- La prueba unitaria afirma el contrato de tipo con `@ts-expect-error`
  (mismo mecanismo que `editarLugar.test.ts`): si alguien agrega
  `descripcion` o `referencia` a `ReporteParaMapa`, `tsc --noEmit` falla.
- Sin `pg_notify`, LISTEN/SSE, migracion, snapshot ni dependencia nueva;
  U4b-publicacion sigue bloqueada por D1/D2.
- `tasks.md` marca `2.6` y `2.7` completas. U5/U6 y las fases 3 y 4 siguen
  pendientes.

## U5: historial de calle (actual)

- Work unit: `U5-historial-de-calle`. El token nativo lo conserva el
  orquestador; este ejecutor no lo adquiere ni lo asienta.
- Alcance: proyeccion de solo lectura que compone reportes, intervenciones y
  eventos estructurales de una calle bajo el tenant del contexto. Incluye
  orden descendente por ocurrencia, desempate por naturaleza e id, estado
  vacio explicito y ausencia de una calle ajena. No agrega escritura,
  migracion, UI funcional, ruta, polling, SSE ni dependencia nueva.
- Las lecturas de reportes e intervenciones son puertos propios de sus
  modulos, y el adaptador de historial solo consume sus superficies publicas.
  La prueba de integracion siembra hechos mediante casos de uso publicos para
  conservar la regla de capas; no importa esquemas internos de otro modulo.
- Codigo autoral de los doce archivos de `historial-de-calle`: 449 lineas,
  dentro del limite nativo de 450 y sin `size:exception`.

### TDD Cycle Evidence — U5

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `application/leerHistorialDeCalle.test.ts` | Unit | ✅ Pruebas de `territorio`, `reportes` e `intervenciones` permanecieron como regresion | ✅ La suite fue escrita antes del modulo y fallo al no resolver `domain` | ✅ 1 archivo, 3 pruebas | ✅ Naturalezas, empate estable por rango/id, tenant del contexto, vacio y calle invisible | ✅ Tipos de fuente separados; la ordenacion quedo en dominio puro |
| 3.2 | `historialDeCalle.integration.test.ts` | Integration | ✅ U3a/U4a y registro de intervenciones en verde | ✅ El arnes se escribio antes del cableado y no podia resolver la superficie U5 | ✅ 1 archivo, 3 pruebas | ✅ Postgres real, RLS Motul/Ticul, cinco naturalezas, movimientos/auditoria fuera de la proyeccion y estado vacio | ✅ Adaptadores de lectura consolidados; el arnes usa solo superficies publicas para respetar capas |

### Work Unit Evidence — U5

| Evidencia | Resultado |
|---|---|
| Test enfocado unitario | `pnpm vitest run --project unit src/modules/historial-de-calle/application/leerHistorialDeCalle.test.ts` → paso; 1 archivo, 3 pruebas. |
| Runtime harness | `DATABASE_URL="$TEST_APP_DATABASE_URL" MIGRATION_DATABASE_URL="$TEST_MIGRATOR_DATABASE_URL" SUPER_ADMIN_DATABASE_URL="$TEST_SUPER_ADMIN_DATABASE_URL" pnpm vitest run --project integration src/modules/historial-de-calle/historialDeCalle.integration.test.ts` → paso; 1 archivo, 3 pruebas contra Postgres real. |
| Regresiones enfocadas | Con las mismas tres variables, unit de U5/U3a/U4a/intervenciones → paso; 4 archivos, 18 pruebas. Integracion de los mismos cuatro lectores → paso; 4 archivos, 14 pruebas. |
| Typecheck | `pnpm typecheck` → paso. |
| Reglas | `pnpm reglas` → paso; 9 reglas y 2 metricas sobre 694 archivos rastreados. El escaneo directo de los doce archivos nuevos de U5 → 0 hallazgos. |
| Capas | `pnpm layers` → paso; 723 modulos, 3244 dependencias, sin violaciones. |
| Lint dirigido | Biome sobre U5 y los adaptadores modificados → sin issues. |
| Diff | `git diff --check` → paso para los archivos rastreados; los archivos nuevos fueron validados por Biome y el escaneo directo de reglas porque no estan en el indice. |
| Rollback boundary | Retirar `src/modules/historial-de-calle/`; quitar `ReporteParaHistorial`, `LectorDeReportesDeHistorial`, `listarPorCalle` y su cableado publico en `reportes`; quitar `IntervencionParaHistorial`, `listarPorCalle` y su cableado publico en `intervenciones`. Conservar la lectura transaccional de `territorio` que pertenece a U3a y todo U3a/U3b/U4a. |

### Resultado U5

- `leerHistorialDeCalle` fija el tenant con `withTenant`, devuelve `null` si
  RLS hace invisible la calle y no consulta las otras fuentes en ese caso.
- El dominio solo proyecta `id`, naturaleza y momento de ocurrencia; no
  transporta filas de `bitacora` ni de `movimientos_de_reportes`, actores ni
  ids de auditoria. Una calle sin hechos devuelve `VACIO` con `entradas: []`.
- `tasks.md` marca `3.1` y `3.2` completas. U6 y las fases 4 siguen
  pendientes; no se inicia otra unidad.

## Estado posterior a la normalizacion

- Verificacion actual: Node `26.7.0`; `pnpm vitest run --project unit` paso con
  183 archivos y 1006 tests.
- Quality gate actual: `pnpm check` paso; reporto 48 warnings y ningun error.
- Commits de la unidad de Intervenciones: `cacecc6` agrega la ficha,
  navegacion y journey E2E; `3f3b307` completa la transaccion simulada de
  `altaDeCalle`; `3c03c0e` agrega evidencia de permisos.
- El mock de `altaDeCalle` entrega `tx.execute`, que era el contrato requerido
  por la publicacion de actualizaciones.

## U6: mapa operativo y snapshot

- Work unit: `U6-mapa-operativo`. Alcance: tareas 3.3 y 3.4; el agente de
  aplicacion dejo `tasks.md` sin editar por instruccion expresa del usuario,
  y la sesion orquestadora marco ambas casillas despues, al cerrar la unidad.
- Entrega: modulo completo `mapa-operativo`, ruta interna `/mapa-operativo`,
  lectura propia de intervenciones para mapa y extension acotada de reportes
  con `areaResponsable`. No se tocaron `consulta-publica-de-reportes`,
  migraciones, PostGIS, geocodificacion, polilineas, SSE ni polling.
- El snapshot agrega en paralelo las tres fuentes con el `ContextoActual`;
  clasifica cada hecho sin calle o con calle sin punto como cobertura faltante,
  y solo muestra marcadores con el punto existente de su calle. Los enlaces
  son las rutas vigentes `/reportes/detalle/[id]` e `/intervenciones/[id]`.

### Estado de tareas

- 3.3 U6 RED — completada en esta unidad; el tracker quedo en `[x]`.
- 3.4 U6 GREEN — completada en esta unidad; el tracker quedo en `[x]`.

### TDD Cycle Evidence — U6

| Tarea | Tests | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.3 | `application/agregarMapa.test.ts`, `application/listarIntervencionesParaMapa.test.ts` | Unit | N/A: modulo y lector nuevos; U4a/U3a se ejecutaron como regresion | ✅ `pnpm vitest run --project unit src/modules/mapa-operativo/application/agregarMapa.test.ts src/modules/mapa-operativo/ui/MapaOperativo.test.tsx src/modules/intervenciones/application/listarIntervencionesParaMapa.test.ts` fallo: imports de `agregarMapa`, `MapaOperativo` y lector inexistentes; 3 archivos/4 pruebas fallidas | ✅ pruebas enfocadas posteriores en verde | ✅ cobertura sin calle/punto, filtro de area que elimina intervenciones y propagacion del contexto; intervencion sin calle | ✅ `Map` indexa calles una vez y los tipos separan puertos propios |
| 3.4 | `ui/MapaOperativo.test.tsx` | Unit | N/A: UI y ruta nuevas | ✅ el mismo RED fallo por componente inexistente | ✅ 2 archivos/5 pruebas en verde | ✅ marcadores diferenciados y estado vacio con conteos cero | ✅ componente server simple, sin estado cliente ni GIS |

### Work Unit Evidence — U6

| Evidencia | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit src/modules/mapa-operativo/application/agregarMapa.test.ts src/modules/mapa-operativo/ui/MapaOperativo.test.tsx` → paso; 2 archivos, 5 pruebas. |
| Regresiones de lectores | `pnpm vitest run --project unit src/modules/reportes/application/listarReportesParaMapa.test.ts src/modules/intervenciones/application/listarIntervencionesParaMapa.test.ts src/modules/territorio/application/callesParaMapa.test.ts` → paso; 3 archivos, 8 pruebas. |
| Typecheck | `pnpm typecheck` → paso. |
| Capas | `pnpm layers` → paso; 828 modulos y 3771 dependencias, sin violaciones. |
| Reglas | `pnpm reglas` → bloqueado por sandbox: `tsx` no pudo abrir su socket IPC temporal (`EPERM`), incluso con `TMPDIR=/private/tmp`; no es un hallazgo de reglas del codigo. |
| Runtime harness | `pnpm db:local` → bloqueado: `Docker no esta corriendo`; no se ejecutaron integracion/isolation ni E2E. |
| Diff | `git diff --check` → paso. |
| Rollback boundary | Retirar `src/modules/mapa-operativo/` y `src/app/(panel)/mapa-operativo/`; revertir el lector ParaMapa de `intervenciones` y la columna `areaResponsable` en la lectura ParaMapa de `reportes`. No afecta U3a, U4a ni U5. |

### Desviaciones e incidencias

- No hay desviacion funcional: el filtro de area excluye intervenciones, como
  proponia D9; por ello marcadores, cobertura y conteos permanecen coherentes.
- El cambio suma 573 lineas autorales (572 agregadas, 1 eliminada), sobre la
  referencia de 400 para una rebanada. No se solicito ni registro
  `size:exception`; los cambios quedan sin commit para que el orquestador
  decida el corte de revision.

## U6 corrective gatekeeper rerun — 2026-09-21

This rerun re-read the authoritative proposal, map specification, design, tasks,
OpenSpec configuration, existing U6 evidence, and the implemented source. It
confirmed that U6 remains limited to 3.3/3.4; `tasks.md` remains intentionally
unchanged and both checkboxes remain unchecked.

### Specification readback

- `agregarMapa` passes the server `ContextoActual` to three owning read ports
  concurrently. The readers themselves establish `withTenant`, so the
  aggregation has no client-selected tenant and does not cross modules through
  domain imports.
- Null `calleId` produces `SIN_CALLE`; a missing street point produces
  `CALLE_SIN_PUNTO`; neither produces invented coordinates. Both buckets remain
  in counts and link to the current detail route.
- Type and status filter both sources; area filters reports and intentionally
  excludes interventions (D9), so markers, coverage, and counts share the same
  filtered source. Zero results return `VACIO` and zero counts.
- The server UI labels street locations as approximate, distinguishes reportes
  from intervenciones, exposes the current detail links, adds no GIS,
  geocoding, polylines, SSE, or polling, and the route is under authenticated
  `(panel)` with a second local context guard.

No concrete defect within U6 scope was found, so no production code or new
regression test was added during this verification-only rerun. The original
strict-TDD RED/GREEN evidence below remains the evidence for the implementation.

### Corrective verification results

| Check | Exact observed result |
|---|---|
| Focused U6 unit | `pnpm vitest run --project unit src/modules/mapa-operativo/application/agregarMapa.test.ts src/modules/mapa-operativo/ui/MapaOperativo.test.tsx` → exit 0; `Test Files  2 passed (2)`; `Tests  5 passed (5)`; duration `3.63s`. |
| Focused reader regressions | `pnpm vitest run --project unit src/modules/reportes/application/listarReportesParaMapa.test.ts src/modules/intervenciones/application/listarIntervencionesParaMapa.test.ts src/modules/territorio/application/callesParaMapa.test.ts` → exit 0; `Test Files  3 passed (3)`; `Tests  8 passed (8)`; duration `237ms`. |
| Typecheck | `pnpm typecheck` → exit 0; `$ tsc --noEmit`. |
| Rules | `pnpm reglas` → exit 1 before rules ran: `Error: listen EPERM: operation not permitted /var/folders/65/rz7tsz7555q3vb571k24q8jw0000gn/T/tsx-501/57669.pipe`; `code: 'EPERM'`, `syscall: 'listen'`; Node `v26.7.0`. This is sandbox IPC, not a rules verdict. |
| Postgres/runtime | `pnpm db:local` → exit 1; `$ bash scripts/db-local.sh`; `Docker no esta corriendo.` No Postgres integration, isolation, or E2E command was runnable. |

### Corrective status

- U6 implementation evidence is verified and focused functional checks are
  green. The phase remains **partial** only because the required `pnpm reglas`
  verdict and Postgres-backed verification remain blocked by the environment.
- No claim of success is made while those required checks have no observed pass.

## U6: verification rerun with Postgres (supersedes "Corrective status")

Docker was available; `pnpm db:local` provisioned roles and migrated
`xula_test`. All commands ran natively (no `rtk`) with `DATABASE_URL`,
`MIGRATION_DATABASE_URL` and `SUPER_ADMIN_DATABASE_URL` exported (port 55432).
No production code or test changed during this rerun.

| Check | Exact observed result |
|---|---|
| `pnpm reglas` | exit 0; `9 reglas y 2 metricas sobre 857 archivos: sin hallazgos.` |
| `pnpm typecheck` | exit 0; `$ tsc --noEmit`. |
| `pnpm test:integration` | exit 0; `Test Files  110 passed (110)`; `Tests  382 passed (382)`. |
| `pnpm test` | exit 0; `Test Files  323 passed (323)`; `Tests  1585 passed (1585)`. |
| `pnpm vitest run --coverage` | exit 0; floors held; `All files` 97.78% statements, 93.1% branches, 98.82% functions, 98.8% lines. |
| `pnpm check` | exit 0; Biome 56 warnings and no errors, `tsc` clean, dependency-cruiser `no dependency violations found` (837 modules), `reglas` no findings. |
| `pnpm test:e2e` | exit 0; `12 passed (49.0s)`. |

Notes:

- A first `pnpm test` without the database variables failed 110 files with
  `Falta DATABASE_URL`; that was the environment, not code. With the variables
  exported the same command passed.
- No Playwright spec covers the operational map; the 12 specs are `acceso`,
  `hostAjeno`, `respaldoPorHost`, `calles` and `bajaDeLugar`. The map E2E journey
  belongs to task 4.3 (U8).
- `pnpm build` (run by Playwright) rewrote `next-env.d.ts`; it was restored
  with `git checkout` and is not part of any change.

### U6 status

U6 (tasks 3.3 and 3.4) is **verified**: the blockers listed under "Corrective
status" (sandbox `EPERM` on `pnpm reglas`, no Docker) no longer apply and every
required check has an observed pass.

Task 4.5 stays open: this run covers U1–U6 only and must be repeated once U7
and U8 land.

## U4b: publication from reportes and intervenciones use cases (tasks 2.8 and 2.9)

- Work unit: `U4b-publicacion`. Scope: widen `publicarActualizacion` to a
  discriminated union and publish from the six use cases approved in D1/D2
  (2026-09-24). No LISTEN, SSE, hub, route or UI (U7/U8 untouched).
- Mode: Strict TDD. Delivery: `single-pr`, `size:exception` approved by the user
  on 2026-09-24 for the branch's single PR. Nothing was staged or committed.
- Payloads (all `z.strictObject`, uuid id, closed vocabulary, no tenant, names,
  coordinates or free text): `{tipo:"reporte", id, cambio:"alta"|"estado"|"area"}`
  and `{tipo:"intervencion", id, cambio:"alta"|"estado"|"correccion"}`. The calle
  payload is unchanged.
- Each use case publishes as the LAST statement of its `withTenant` callback,
  after its writes and its audit row. A failure earlier in the transaction
  therefore never reaches the publish call, and Postgres delivers `pg_notify`
  only at COMMIT (D3).

### TDD Cycle Evidence — U4b

| Task | Test files | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.8 / 2.9 payload union | `src/shared/notificaciones/notificar.test.ts`, `notificar.integration.test.ts` | Unit + integration | `pnpm vitest run --project unit src/shared/notificaciones src/modules/reportes/application src/modules/intervenciones/application` → 18 files, 86 tests passing before any change | `notificar.test.ts`: 25 failed, 7 passed (schemas not exported); `notificar.integration.test.ts`: 2 failed, 1 passed (`publicarActualizacion` rejected the reporte/intervencion payloads) | `pnpm vitest run --project unit src/shared/notificaciones` → 2 files, 34 tests; integration → 3 tests after the widening | Every cambio accepted per tipo; extra keys (tenant, free text, coordinates, name), unknown cambio, cross-vocabulary cambio and non-uuid id rejected; calle payload still valid through the union | Types `PayloadDeReporte/Intervencion/Actualizacion` derived with `z.infer`; single `esquemaDePayload` parse in the transport |
| 2.8 / 2.9 reportes (alta, estado, area) | `application/publicacionDeReportes.test.ts`, `publicacionDeReportes.transiciones.test.ts`, `src/modules/reportes/notificacionDeReportes.integration.test.ts` | Unit + integration | same safety net as above | Unit: 3 failed, 7 passed (publish never called; the negative cases passed trivially until GREEN). Integration: 4 failed, 2 passed (`No llego la notificacion esperada.`; the two rollback cases passed trivially) | Unit: 2 files, 10 tests; integration: 6 tests | Publish order after write, movement and audit; no publish on audit failure, unauthorized role, invalid transition, closed report, lost race and invisible row; real LISTEN: confirmed delivery, rollback delivers nothing, Ticul channel silent | Mutation check: moving the `asignarArea` publish before the write made 2 tests fail; restored. `validarTransicion`/`validarMotivo` moved to `validacionDeCambioDeEstado.ts` because `cambiarEstadoDeReporte.ts` was at 196 lines |
| 2.8 / 2.9 intervenciones (alta, estado, correccion) | `application/publicacionDeIntervenciones.test.ts`, `publicacionDeIntervenciones.cambios.test.ts`, `src/modules/intervenciones/notificacionDeIntervenciones.integration.test.ts` | Unit + integration | same safety net as above | Unit: 3 failed, 7 passed. Integration: 4 failed, 2 passed (`No llego la notificacion esperada.`; the two rollback cases passed trivially) | Unit: 2 files, 10 tests; integration: 6 tests | Same matrix as reportes (alta/estado/correccion, audit failure, roles, invalid transition, closed, lost race, invisible row, rollback with invalid actor, tenant isolation) | Existing use case tests in `intervenciones` mock the transport; those in `reportes` give the mocked tx an `execute` so the real transport validates each payload |

### Work Unit Evidence — U4b

| Evidence | Result |
|---|---|
| Focused unit | `pnpm vitest run --project unit src/shared/notificaciones src/modules/reportes src/modules/intervenciones` → 46 files, 238 tests passed. |
| Runtime harness | With the three test database URLs exported (port 55432), `pnpm vitest run --project integration src/shared/notificaciones src/modules/reportes/notificacionDeReportes.integration.test.ts src/modules/intervenciones/notificacionDeIntervenciones.integration.test.ts` → 3 files, 15 tests passed against real Postgres LISTEN. |
| `pnpm typecheck` | exit 0. |
| `pnpm reglas` | exit 0; `9 reglas y 2 metricas sobre 857 archivos: sin hallazgos.` |
| `pnpm check` | exit 0; Biome 56 warnings (same count as before this unit), `tsc` clean, dependency-cruiser `no dependency violations found` (844 modules, 3854 dependencies), `reglas` no findings. |
| `pnpm test` | exit 0; `Test Files 329 passed (329)`, `Tests 1645 passed (1645)`. |
| `git diff --check` | clean. |
| Rollback boundary | Revert the union in `src/shared/notificaciones/notificar.ts`, the publish call and import in the six use cases, `validacionDeCambioDeEstado.ts` (restore its two functions into `cambiarEstadoDeReporte.ts`), the mock/`tx` lines in the six existing unit tests and the new publication and notification test files. U3b calle publishing is unaffected. |

### Results and notes

- Authored size: about 300 lines changed in tracked files plus about 980 lines
  in new files, almost all tests. This exceeds the 400 heuristic and falls under
  the approved `size:exception`; no test or comment was removed to fit.
- New test files were split (`.test.ts` plus `.transiciones.test.ts` / `.cambios.test.ts`)
  because a single file exceeded the 200-line metric; new files may not enter the
  `DEUDA_DE_ARCHIVO` list.
- `registrarReporte.test.ts` is exactly 200 lines and `notificar.test.ts` is 200.
- Tasks 2.8 and 2.9 are checked in `tasks.md`. U7 and U8 (LISTEN, SSE, hub,
  route; tasks 4.1 onward) remain pending; the LISTEN exception in rule 2 of `AGENTS.md`
  still enters with U7.

## U7: LISTEN hub, SSE route and live-status island (tasks 4.1/4.2)

- Work unit: `U7`. Scope is limited to the private lazy `LISTEN` hub, `/eventos`
  SSE route, and `EstadoEnVivo`; no map-page or navigation wiring (U8 remains
  untouched).
- Mode: Strict TDD. Delivery: `single-pr`, `size:exception` approved for the
  branch. Nothing was staged or committed.
- Decision: heartbeat is emitted every 15 seconds and the island marks the
  connection stale after 45 seconds without one. `EventSource` reconnects;
  both an `open` event and an update invoke `router.refresh()`. The timeout is
  a liveness watchdog, not polling: it issues no request. The initial
  snapshot and every re-sync remain server-rendered under RLS.

### TDD Cycle Evidence — U7

| Task | Test files | Layer | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| 4.1 / 4.2 SSE and island | `src/app/(panel)/eventos/route.test.ts`, `src/shared/ui/EstadoEnVivo.test.tsx` | Unit | `pnpm vitest run --project unit src/shared/ui/EstadoEnVivo.test.tsx 'src/app/(panel)/eventos/route.test.ts'` → exit 1; both suites failed because `./EstadoEnVivo` and `./route` did not exist. | Same exact command → exit 0; `Test Files 2 passed (2)`, `Tests 4 passed (4)`. | The route covers no session, server-context tenant subscription, initial resync and payload forwarding; the island covers reconnect and update refresh. | Extracted `useEventosEnVivo` to keep the component within the function-size rule; focused unit command remained green. |
| 4.1 / 4.2 tenant listener | `src/shared/tenancy/notificacionesDeTenant.integration.test.ts` | Integration / real Postgres | New test written before the hub. | Blocked by the execution sandbox, not a test assertion: with all three required database URLs, `pnpm vitest run --project integration src/shared/tenancy/notificacionesDeTenant.integration.test.ts` reached `connect EPERM ::1:55432` and `connect EPERM 127.0.0.1:55432`; Vitest reported `1 skipped` and a failed suite. | The test subscribes Motul and Ticul and publishes a committed Motul payload, asserting only Motul receives it. | N/A while the real database socket is unavailable. |

### Work Unit Evidence — U7

| Evidence | Result |
|---|---|
| Focused unit | `pnpm vitest run --project unit src/shared/ui/EstadoEnVivo.test.tsx 'src/app/(panel)/eventos/route.test.ts'` → exit 0; `2 passed`, `4 passed`. |
| Rule checker unit | `pnpm vitest run --project unit scripts/reglas/reglas/tenancia.test.ts` → exit 0; `1 passed`, `7 passed`. |
| Typecheck | `pnpm typecheck` → exit 0; `$ tsc --noEmit`. |
| Runtime harness | Blocked by sandbox `EPERM` on the local Postgres socket as described above. |
| `pnpm reglas` | Blocked before rules execute: `listen EPERM` on the tsx IPC pipe under `/var/folders/.../tsx-501/*.pipe`. |
| `pnpm test` | Began with all required database URLs; the observed integration failures were the same `connect EPERM` socket failures (including `src/shared/notificaciones/notificar.integration.test.ts`). No terminal full-suite verdict was obtained in this execution environment. |
| `pnpm vitest run --coverage` | Began with all required database URLs and V8 coverage enabled; its integration phase hit the same `connect EPERM` condition, so no coverage-floor verdict was obtained. |
| `pnpm check` | Not run to completion because it includes the blocked `pnpm reglas` IPC step. |
| Rollback boundary | Remove `src/shared/tenancy/notificacionesDeTenant.ts`, `src/app/(panel)/eventos/`, `src/shared/ui/EstadoEnVivo.tsx` and their tests; revert the fourth-exit entry in `AGENTS.md` and `scripts/reglas/reglas/tenancia.*`. U3b/U4b publishers remain unaffected. |

### Status

Implementation and focused unit/type checks are green. Tasks 4.1 and 4.2
remain unchecked until the real Postgres isolation test and the required final
gates have observed terminal passes outside the restricted sandbox.

### U7 corrective self-audit

A corrective audit found and fixed three boundary defects before finalizing the
work unit:

- Concurrent subscribers to a previously unopened channel could return before
  the first `LISTEN` completed. `aperturas` now shares and awaits one opening
  promise for every consumer; an opening failure rejects all waiting
  subscribers instead of returning a dead subscription.
- Hub shutdown previously cleared stored `unlisten` callbacks without calling
  them. It now waits for pending openings, invokes every channel unlisten, and
  ends the one private connection in `finally`.
- The SSE route emitted `resync`, but the island refreshed only on `open`.
  The island now handles the named `resync` event explicitly. Route cancellation
  is asserted to close its hub subscription.

| Check | Exact observed result |
|---|---|
| Correction RED | `pnpm vitest run --project unit src/shared/ui/EstadoEnVivo.test.tsx src/shared/tenancy/notificacionesDeTenant.test.ts` → exit 1; expected 3 refreshes got 2, and expected hub `unlisten` got 0. |
| Corrected unit | `pnpm vitest run --project unit src/shared/ui/EstadoEnVivo.test.tsx src/shared/tenancy/notificacionesDeTenant.test.ts 'src/app/(panel)/eventos/route.test.ts'` → exit 0; `Test Files 3 passed (3)`, `Tests 5 passed (5)`. |
| Prescribed focused unit | `pnpm vitest run --project unit src/shared/ui/EstadoEnVivo.test.tsx 'src/app/(panel)/eventos/route.test.ts'` → exit 0; `Test Files 2 passed (2)`, `Tests 4 passed (4)`. |
| Typecheck | `pnpm typecheck` → exit 0; `$ tsc --noEmit`. |
| Real integration | With all three required database URLs exported, `pnpm vitest run --project integration src/shared/tenancy/notificacionesDeTenant.integration.test.ts` → exit 1; sandbox `connect EPERM` for `::1:55432` and `127.0.0.1:55432`; `1 skipped`. |

Tasks 4.1 and 4.2 remain unchecked: the required real-Postgres test still has
no observed terminal pass.

### U7 race-condition corrective pass

A second independent review found two races and an incomplete heartbeat proof.
Both fixes stay inside U7:

- `cuerpoDeEventos` now closes a subscription that resolves after stream
  cancellation and returns before installing its heartbeat timer.
- The hub serializes per-channel unlisten/open transitions with `cierres`:
  a subscriber arriving while the final unlisten is pending waits for it and
  then reopens the channel, rather than being erased by the old close.
- The focused SSE route test uses fake timers and reads the actual 15-second
  heartbeat frame.

| Check | Exact observed result |
|---|---|
| Correction RED | `pnpm vitest run --project unit src/shared/tenancy/notificacionesDeTenant.test.ts 'src/app/(panel)/eventos/route.test.ts'` → exit 1; the hub expected two `listen` calls but got one, and a late subscription expected `cerrar` once but got zero. |
| Corrected unit | `pnpm vitest run --project unit src/shared/tenancy/notificacionesDeTenant.test.ts 'src/app/(panel)/eventos/route.test.ts' src/shared/ui/EstadoEnVivo.test.tsx` → exit 0; `Test Files 3 passed (3)`, `Tests 7 passed (7)`. |
| Prescribed focused unit | `pnpm vitest run --project unit src/shared/ui/EstadoEnVivo.test.tsx 'src/app/(panel)/eventos/route.test.ts'` → exit 0; `Test Files 2 passed (2)`, `Tests 5 passed (5)`. |
| Typecheck | `pnpm typecheck` → exit 0; `$ tsc --noEmit`. |

Tasks 4.1 and 4.2 remain unchecked because the real-Postgres integration test
is still blocked by sandbox socket `EPERM` and has no observed terminal pass.

### U7 final post-edit gate results

The independent post-edit gate ran after the race-condition fixes. These results
append to, rather than replace, the earlier focused evidence. Tasks 4.1 and 4.2
remain unchecked because the Postgres-backed proof and final gates have no
terminal green verdict in this environment.

| Check | Exact observed result |
|---|---|
| `pnpm typecheck` | exit 0; `$ tsc --noEmit`. |
| `pnpm reglas` | exit 1 before rules execute: tsx IPC `listen EPERM` on its temporary pipe. |
| `pnpm test` | exit 1; `113` files failed, `220` passed; `22` tests failed, `1256` passed, `375` skipped. Failures were database socket `EPERM` and resulting timeouts. |
| `pnpm vitest run --coverage` | exit 1 with the same database `EPERM`/timeout condition; no valid coverage-floor verdict was produced. |
| `pnpm check` | exit 1 after lint, typecheck, and dependency-cruiser completed; `pnpm reglas` then hit the tsx IPC `listen EPERM` blocker. |
| Focused U7 units after race fix | exit 0; `4` files passed, `14` tests passed. |
| Focused U7 integration | exit 1; database socket `EPERM` prevented the real LISTEN/isolation scenario. |

### U7 orchestrator verification and test hardening (supersedes the sandbox-blocked gate above)

The blocked gates above ran inside the writer's restricted sandbox. They were
rerun natively by the orchestrator with Postgres up and
`DATABASE_URL`/`MIGRATION_DATABASE_URL`/`SUPER_ADMIN_DATABASE_URL` exported
(port 55432); nothing ran through `rtk`.

The island test in the writer's version proved only the pre-connect label and
the three refresh calls. `renderToStaticMarkup` never observes state, so the
connected label, the error path, the 45 s heartbeat threshold and the unmount
cleanup had no test, and `not.toContain("setInterval")` on the HTML could not
fail. `EstadoEnVivo.test.tsx` was rewritten to observe `setConectado` and use
fake timers (5 tests). Each mutation below was applied to `EstadoEnVivo.tsx`
and killed by exactly one test; the component was restored byte for byte.

| Mutation | Test that failed |
|---|---|
| threshold `45_000` → `90_000` | 45 s without heartbeat, and a heartbeat resets the count |
| remove `eventos.close()` | unmount closes the source and cancels the count |
| remove `onerror` | live on open/heartbeat, disconnected on error |
| remove the `heartbeat` listener | 45 s without heartbeat, and a heartbeat resets the count |

| Check | Exact observed result |
|---|---|
| `pnpm reglas` | exit 0; `9 reglas y 2 metricas sobre 864 archivos: sin hallazgos.` |
| `pnpm typecheck` | exit 0. |
| `pnpm vitest run --coverage` | exit 0; `Test Files 333 passed (333)`, `Tests 1657 passed (1657)` on the final state (after the island test rewrite); `All files` 97.54% statements, 92.66% branches, 98.85% functions, 98.72% lines. Includes the real-Postgres LISTEN isolation test. |
| `pnpm check` | exit 0; Biome 56 warnings (unchanged), dependency-cruiser no violations (851 modules), `reglas` no findings. |
| `EstadoEnVivo.test.tsx` after the rewrite | exit 0; `Tests 5 passed (5)`. |

Review notes, not blockers for U7:

- **DB reconnect gap.** The SSE heartbeat is independent of the LISTEN
  connection. If the hub's Postgres connection drops and reconnects, events
  published in the gap are lost while the island keeps showing "live", and
  nothing forces a resync. The spec's "resync on (re)connect" is met only for
  the SSE connection. `postgres` exposes an `onlisten` callback per (re)listen
  that could emit a `resync`.
- **Double refresh on connect.** `onopen` and the server's initial `resync`
  event both call `router.refresh()`.
- **Unstyled island and copy without accents.** `EstadoEnVivo` renders bare
  elements and its labels ("Actualizacion desconectada") lack accents, which is
  operator-facing copy. It needs the `DESIGN.md` pass when U8 wires it in.
- **Proxy buffering.** The response has no `X-Accel-Buffering: no`; verify that
  the Railway proxy does not buffer `text/event-stream`.
