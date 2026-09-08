# Apply progress: territorio-calles-coordenadas-y-reasignacion

## Estado

- Modo: Strict TDD.
- Slice: PR 3 — UI and integration.
- Estrategia: feature-branch-chain.
- Limite: mapa/UI de Fase 3, E2E, dependencias y documentacion; sin
  verificacion final/archive.
- Excepcion de tamano: autorizada por el maintainer para esta recuperacion
  como una unica slice PR3; no se abre otra slice por el registro previo de
  923 lineas.
- Intentos autorizados: `apply-pr2-20260906-001`, `apply-pr3-20260906-001`.

## Tareas

- [x] 1.1 — Pruebas RED/GREEN para punto nullable, caja, redondeo, CHECK
  parcial, guardas de activo, aislamiento Motul/Ticul y UPDATE cruzado.
- [x] 1.2 — Cobertura de foundation/repository completada: alta y lectura sin
  punto, bloqueo por domicilio principal/transversal sin contar referencias
  ajenas, duplicado, limpieza nullable y preservacion exacta del punto al
  cambiar de lugar.
- [x] 1.2-P2 — Convertir los TODO de aplicacion en pruebas RED/GREEN para
  reportes permitidos, destino invalido, bitacora, permiso y reparentear desde
  el caso de uso en la Fase 2.
- [x] 1.3 — Migracion `0011`, columnas nullable, CHECK de punto completo,
  `CAJA_DE_YUCATAN` y errores de dominio.
- [x] 1.4 — Puerto ensanchado y repositorio actualizado para lecturas,
  actualizaciones activas y conteo de las tres referencias de domicilio.
- [x] 2.1 — Tres casos de uso de calles con permiso de territorio, transaccion
  tenant, rerelectura, validacion de dependencias y bitacora id-only.
- [x] 2.2 — Composicion, permisos y rutas de exportacion actualizados para
  consumir el update ancho y exponer el punto de la calle.
- [x] 2.3 — Tres Server Actions con Zod en el primer paso, mensajes
  allowlisted, tenant derivado del contexto y destinos de redirect fijos.
- [x] 2.4 — Parametro `calle` aislado con `.catch(undefined)` y cobertura de
  una raiz valida junto a un valor de calle malformado.
- [x] 3.1 — Isla Leaflet con limites de Yucatan, attribution publica, marcador
  `circleMarker`, campos nativos visibles, fallback sin JavaScript y tiles
  bloqueables en CI.
- [x] 3.2 — Panel de calle con disclosure, formularios nativos de ubicacion,
  movimiento y baja, filas enlazadas y estado `Sin punto`.
- [x] 3.3 — Leaflet/types, guia de operacion, escenario Playwright y cobertura
  del flujo nativo de calles, errores de duplicado/domicilio y bitacora.

## Evidencia TDD

| Tarea | Test | Safety net | RED | GREEN | Triangulacion | Refactor |
|---|---|---|---|---|---|---|
| 1.1 | `domain/punto.test.ts`, `calles.integration.test.ts`, `calles.isolation.test.ts` | 69/69 unit tests existentes | ✅ Test escrito antes de `punto.ts` | ✅ 4 casos de caja, 2 de redondeo y 3 integracion/isolation | ✅ bordes, fuera de caja, nulidad y tenant cruzado | ✅ helpers y nombres de escenario |
| 1.2 | `calles.repository.integration.test.ts` | ✅ 10/10 integracion antes de ampliar cobertura | ✅ Dos casos de repository escritos antes de cambiar produccion; no requirieron cambio de implementacion | ✅ 5/5 repository tests | ✅ alta sin punto, principal/transversales, referencia ajena, duplicado, limpieza y punto exacto | ✅ nombres y datos independientes para evitar falsos verdes |
| 1.3 | `domain/punto.test.ts` + CHECK de integracion | N/A (archivos nuevos) | ✅ Import de `punto` fallo antes de crearlo | ✅ Pruebas enfocadas verdes | ✅ cuatro limites y valores fuera | ✅ constante y funcion pura |
| 1.4 | pruebas de repositorio e isolation | ✅ 69/69 unit tests existentes | ✅ Contratos y pruebas escritos antes del puerto/repo | ✅ Integracion enfocada verde | ✅ lectura, update, baja activa, count y duplicado | ✅ update unico de cuatro campos |
| 1.2-P2 | `application/callesFoundation.todo.test.ts` | ✅ 10/10 integracion antes de ampliar cobertura | ✅ TODOs reemplazados por pruebas de aplicacion | ✅ reportes permitidos, destino invalido, bitacora y permiso verdes | ✅ ubicacion, reparenteo y baja | ✅ aserciones de misma transaccion |
| 2.1 | `application/callesFoundation.todo.test.ts` | N/A (archivos nuevos) | ✅ Pruebas escritas antes de los tres casos de uso | ✅ 6 escenarios verdes | ✅ punto redondeado, destino ajeno, domicilios y reportes | ✅ update ancho compartido |
| 2.2 | pruebas existentes de `renombrarCalle` y composicion | ✅ 4/4 renombre | ✅ Pruebas de contrato existentes antes del cableado | ✅ typecheck y unit verdes | ➖ cambios estructurales | ✅ permisos clasificados por accion |
| 2.3 | `ui/actions/callesActions.test.ts` | N/A (archivos nuevos) | ✅ Pruebas RED de forma, tenant, 404, redirect y leak | ✅ 5/5 escenarios verdes | ✅ tres acciones y error inesperado | ✅ destinos fijos sin ids del formulario |
| 2.4 | `app/(panel)/territorio/parametros.test.ts` | ✅ 9/9 antes del cambio | ✅ Test de `calle=xx` escrito antes del parser | ✅ 10/10 parametros verdes | ✅ raiz valida sobrevive a campo ajeno invalido | ✅ `.catch` por campo |
| 3.1 | `ui/mapa.test.tsx` | N/A (archivos nuevos) | ✅ Configuracion de mapa, attribution, bounds y tile failure escritos antes de la isla | ✅ pruebas enfocadas verdes | ✅ coordenadas nativas y fallback sin tiles | ✅ hook separado de la vista |
| 3.2 | `ui/callesUI.test.ts` | N/A (archivos nuevos) | ✅ Cobertura de filas, disclosure, formularios y estado vacio antes del cableado | ✅ pruebas enfocadas verdes | ✅ acciones nativas y valores ocultos | ✅ `CalleParaPanel` y vista de calles aislados |
| 3.3 | `e2e/calles.spec.ts` | N/A (archivo nuevo) | ✅ Flujo Playwright escrito antes de los ajustes del arnes | ✅ 1 escenario E2E verde | ✅ mapa sin tiles, reparent, duplicado, domicilio, baja y bitacora | ✅ datos del escenario tipados y selectores por rol |

## Verificacion

### Comandos enfocados

- `pnpm exec vitest run --project unit` → **159 archivos pasaron, 1 skip;
  889 tests pasaron, 7 TODO**.
- `DATABASE_URL=... MIGRATION_DATABASE_URL=... SUPER_ADMIN_DATABASE_URL=...
  pnpm exec vitest run --project integration src/modules/territorio/calles.integration.test.ts src/modules/territorio/calles.repository.integration.test.ts src/modules/territorio/calles.isolation.test.ts`
  → **3 archivos pasaron, 12 tests pasaron**.
- `DATABASE_URL=... MIGRATION_DATABASE_URL=... SUPER_ADMIN_DATABASE_URL=...
  pnpm exec vitest run --project integration src/modules/territorio/calles.repository.integration.test.ts`
  → **1 archivo paso, 5 tests pasaron**.
- `pnpm typecheck` → **paso**.
- `pnpm layers` → **paso; 610 modulos, 2624 dependencias, sin violaciones**.
- `pnpm reglas` → **paso; 9 reglas y 2 metricas, sin hallazgos**.
- Biome sobre `src/modules/territorio/calles.repository.integration.test.ts`
  → **sin issues**.
- `pnpm exec vitest run --project unit` sobre los archivos de PR2 → **5
  archivos pasaron, 32 tests pasaron**.
- `pnpm typecheck` → **paso**.
- `pnpm layers` → **paso; 617 modulos, 2688 dependencias, sin violaciones**.
- `pnpm reglas` → **paso; 9 reglas y 2 metricas, sin hallazgos**.
- Biome enfocado sobre los archivos de PR2 → **sin issues**.
- `pnpm exec vitest run src/modules/territorio/ui/permisos.test.ts src/modules/territorio/ui/mapa.test.tsx src/modules/territorio/ui/callesUI.test.ts src/app/(panel)/territorio/parametros.test.ts` → **4 archivos pasaron, 37 tests pasaron**.
- `pnpm typecheck` → **paso** después de tipar `reporteCalleId` en el escenario E2E.
- `pnpm layers` → **paso; 629 módulos, 2736 dependencias, sin violaciones**.
- `pnpm reglas` → **paso; 9 reglas y 2 métricas, sin hallazgos**.
- Biome enfocado sobre los archivos de PR3 → **sin issues**.

### Comandos no verdes

- `pnpm check` → **fallo preexistente en `pnpm lint`**: 4 errores y 64
  advertencias en archivos no tocados por este slice, principalmente
  `src/app/(acceso)/acceso/page.tsx` y tests existentes de `constancias`,
  `reportes` y `territorio`. El lint de los archivos del slice pasa.
- `pnpm test` → **timeout a los 120 s** al intentar la suite combinada sin
  variables de Postgres exportadas en ese proceso. La suite unit y la
  integracion enfocada si fueron ejecutadas y pasaron con su harness.
- Primeras ejecuciones del E2E encontraron fallos del propio escenario: el
  consecutivo basado en `Date.now()` excedía `integer`, los locators de
  `role=alert` incluían el route announcer, y la consulta de bitácora usaba el
  id del reporte en vez del id de la calle. Se corrigieron en el test.

## Runtime harness

- `pnpm db:local` → **paso**: contenedor local recreado, roles provisionados y
  migraciones `0000`–`0011` aplicadas.
- La integracion enfocada verifico en Postgres real RLS, CHECK parcial, NULL,
  baja activa, count de domicilios principal/transversal, punto exacto y
  update cruzado en cero filas.
- `pnpm db:local` → **paso**: base local recreada y migraciones 0000–0011
  aplicadas.
- Integracion de territorio en Postgres real → **19 archivos pasaron, 63 tests
  pasaron**.
- `./node_modules/.bin/playwright test e2e/calles.spec.ts` → **1 escenario
  pasó en 35.4 s**; el route de tiles OSM fue abortado deliberadamente.

## Archivos del slice

- `drizzle/0011_calles_coordenadas.sql`
- `drizzle/meta/_journal.json`
- `src/modules/territorio/domain/punto.ts`
- `src/modules/territorio/domain/punto.test.ts`
- `src/modules/territorio/domain/errores.ts`
- `src/modules/territorio/domain/index.ts`
- `src/modules/territorio/infrastructure/esquema.ts`
- `src/modules/territorio/infrastructure/repositorioDeCallesSql.ts`
- `src/modules/territorio/application/puertos.ts`
- `src/modules/territorio/application/renombrarCalle.ts` y su prueba
- `src/modules/territorio/application/{ubicarCalle,reparentearCalle,darDeBajaCalle}.ts`
- `src/modules/territorio/application/callesFoundation.todo.test.ts`
- `src/modules/territorio/ui/actions/{ubicarCalle,reparentearCalle,darDeBajaCalle}Action.ts`
- `src/modules/territorio/ui/actions/callesActions.test.ts`
- `src/modules/territorio/ui/{PanelDeNodo,permisos}.ts*`
- `src/app/(panel)/territorio/parametros.ts` y su prueba
- fixtures y pruebas de aislamiento/integracion de calles

## Rollback boundary

Revertir PR3 elimina `SelectorDePunto`, `useMapaDePunto`, el panel y los tres
formularios nativos de calles, el cableado de `TabDeCalles`, la dependencia y
tipos de Leaflet, la guia de operacion y `e2e/calles.spec.ts`. No revierte PR1,
PR2 ni sus contratos, acciones, casos de uso o parametro `calle`.

## Recuperacion de apply

La recuperacion del 2026-09-06 confirmo que las tareas 3.1, 3.2 y 3.3 ya
estaban presentes en el arbol y en los artefactos. No se inventaron cambios ni
se modifico codigo de produccion: se revalidaron los archivos de mapa, panel,
formularios, acciones nativas, dependencia Leaflet, guia de operacion y
escenario Playwright. La tarea 4.1 permanece pendiente y no se ejecuto esta
fase de verificacion final.

### Evidencia fresca de la recuperacion

- `pnpm exec vitest run --project unit 'src/modules/territorio/ui/permisos.test.ts' 'src/modules/territorio/ui/mapa.test.tsx' 'src/modules/territorio/ui/callesUI.test.ts' 'src/modules/territorio/ui/actions/callesActions.test.ts' 'src/app/(panel)/territorio/parametros.test.ts'`
  → 5 archivos pasaron, 42 tests pasaron.
- `./node_modules/.bin/playwright test e2e/calles.spec.ts`
  → 1 escenario paso en 19.0 s; el arnes bloqueo deliberadamente los tiles
  OSM y verifico el flujo nativo de calles, estados vacios, reparentear,
  duplicado, bloqueo por domicilio, baja con reporte y bitacora.
- La relectura final de `tasks.md` confirma `[x]` en 3.1, 3.2 y 3.3, y
  `[ ]` en 4.1.

## Siguiente fase

Esta recuperacion no inicia `sdd-verify` ni archive. PR3 queda documentada y
revalidada; el siguiente paso recomendado, cuando el estado nativo lo
permita, es ejecutar `sdd-verify`.

## Work Unit Evidence

| Evidencia | Resultado |
|---|---|
| Test enfocado | Recuperacion PR3 → 5 archivos, 42/42 tests; la evidencia previa conserva typecheck, layers, reglas y Biome enfocados en verde |
| Runtime harness | `./node_modules/.bin/playwright test e2e/calles.spec.ts` → 1/1 en 19.0 s; tiles OSM bloqueados, flujo nativo completo y bitacora verificada |
| Rollback boundary | Revertir PR3 elimina UI/mapa, dependencia Leaflet, documentacion y E2E; conserva PR1/PR2 y sus contratos |
| Siguiente fase | **No iniciada**: `sdd-verify` sigue pendiente; archive no se declara |

## Verificación final de 4.1 — 2026-09-06

- **Estado:** bloqueada. La tarea 4.1 permanece `[ ]` en `tasks.md` porque
  `pnpm check` no termina en verde.
- **Modo:** verification-only. No se modificaron código de producción, tests,
  migraciones, package files ni documentación del cambio para ocultar fallos.
- **Base local:** `pnpm db:local` pasó y aplicó las migraciones `0000`–`0011`.

### Evidencia de comandos obligatorios

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm test` | **Pasó con el harness configurado** | 241 archivos, 1200 tests; la primera invocación sin las variables de Postgres falló al importar 78 suites, y se repitió después de levantar la base y exportar las tres URLs locales. |
| `pnpm test:integration` | **Pasó con el harness configurado** | 78 archivos, 288 tests. Incluye las suites de aislamiento sin `rtk`. |
| `pnpm test:e2e` | **Bloqueado por el entorno del primer intento** | El puerto 3000 ya tenía un proceso escuchando (PID 42209) y Playwright reutilizó ese servidor: 9 de 11 escenarios fallaron. La repetición controlada `CI=1 E2E_PUERTO=3001 pnpm test:e2e` levantó `next build` + `next start` frescos y pasó 11/11 en 36.8 s. |
| `pnpm check` | **Falló** | `pnpm lint` terminó con 38 errores y 74 advertencias. Los errores visibles incluyen aserciones no nulas y orden de imports en el nuevo `e2e/calles.spec.ts`, además del formato de `e2e/preparar.ts`; son archivos dentro del cambio y requieren corrección antes de completar 4.1. |
| `pnpm typecheck` | **Pasó** | `tsc --noEmit` terminó sin errores. |
| `pnpm layers` | **Pasó** | 629 módulos, 2736 dependencias, sin violaciones. Se ejecutó por separado porque `pnpm check` se detuvo en lint. |
| `pnpm reglas` | **Pasó** | 9 reglas y 2 métricas sobre 617 archivos, sin hallazgos. |
| `git diff --check` | **Pasó** | Sin errores de whitespace en el diff. Se revisó el diff completo combinado de archivos tracked y untracked (3897 líneas). |

### Verificación del rollback

Se ejecutó sobre la base local con `psql` nativo dentro del contenedor, sin
`rtk`:

1. `xula_app` insertó una fila de bitácora `ROLLBACK_VERIFY` bajo el tenant de
   Motul.
2. `xula_migrator` confirmó que puede retirar `calles_punto_completo`,
   `latitud` y `longitud` en una transacción confirmada.
3. La consulta con `xula_app` observó `0` columnas nuevas, `0` CHECK y `1` fila
   de bitácora después del retiro.
4. `xula_migrator` restauró las dos columnas y el CHECK; la consulta final
   observó `2` columnas, `1` CHECK y la misma fila de bitácora.
5. `pnpm db:local` recreó la base local y eliminó el dato sentinel de
   verificación.

### TDD Cycle Evidence para 4.1

| Tarea | Test | Safety net | RED | GREEN | Triangulación | Refactor |
|---|---|---|---|---|---|---|
| 4.1 | Suites existentes de Vitest, Playwright y quality gates | ✅ Suites completas ejecutadas | N/A — tarea de verificación-only, no se escribieron tests | ✅ Suites configuradas de Vitest e integración; E2E fresco 11/11 | N/A — no se agregó comportamiento | N/A — no se modificó producción |

### Work Unit Evidence de 4.1

| Evidencia | Resultado |
|---|---|
| Test enfocado y resultado exacto | `pnpm test` → 241/241 archivos y 1200/1200 tests; `pnpm test:integration` → 78/78 archivos y 288/288 tests. |
| Runtime harness y resultado exacto | `CI=1 E2E_PUERTO=3001 pnpm test:e2e` → 11/11 escenarios en 36.8 s; el intento literal en el puerto ocupado quedó bloqueado por el entorno. |
| Rollback boundary | Solo se añadió esta evidencia a `apply-progress.md`; no hay cambios de código que revertir. El ensayo de rollback se limitó a la base local y se restauró el esquema. |
| Estado | **Bloqueada** por `pnpm check`; 4.1 no está lista para `sdd-verify` ni archive. |

### Bloqueo accionable

Corregir los errores de lint de `e2e/calles.spec.ts` y `e2e/preparar.ts`,
repetir `pnpm check` y volver a ejecutar la verificación final. Mantener
`tasks.md` con 4.1 en `[ ]` hasta que el quality gate completo termine en
verde.

## Corrección acotada y repetición de 4.1 — 2026-09-06

- **Estado:** bloqueada. La tarea 4.1 sigue `[ ]` en `tasks.md`.
- **Alcance autorizado:** solo `e2e/calles.spec.ts` y `e2e/preparar.ts`.
  No se modificó producción, migraciones, dependencias, tests ajenos ni se
  desactivó ninguna regla.
- **Corrección aplicada:** se eliminaron las aserciones no nulas del escenario
  mediante filas requeridas con error explícito, se ordenó el import de
  Playwright y se aplicó el formato de Biome únicamente a los dos archivos.
  `e2e/calles.spec.ts` quedó en 200 líneas y `e2e/preparar.ts` en 55.
- **Comprobación enfocada:**
  `pnpm exec biome check e2e/calles.spec.ts e2e/preparar.ts --max-diagnostics=200`
  → **pasó; 0 errores y 0 advertencias**.

### Evidencia de comandos obligatorios repetidos

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm db:local` | **Pasó** | Base `xula_test` recreada; roles provisionados y migraciones `0000`–`0011` aplicadas. Se repitió al final para retirar el sentinel del rollback. |
| `pnpm test` | **Pasó** | 241 archivos, 1200 tests; duración 306.29 s, con las tres URLs locales de Postgres exportadas. |
| `pnpm test:integration` | **Pasó** | 78 archivos, 288 tests; duración 297.07 s. Incluye aislamiento por tenant sin `rtk`. |
| Primer `pnpm test:e2e` | **Falló por harness** | 2/11 pasaron y 9/11 fallaron porque el intento literal reutilizó el servidor/proceso existente del puerto 3000; no fue una ejecución fresca. |
| `CI=1 E2E_PUERTO=3001 pnpm test:e2e` | **Pasó** | Build y start frescos; 11/11 escenarios pasaron en 1.0 min. El escenario de calles conservó el bloqueo deliberado de tiles OSM. |
| `pnpm check` | **Falló** | `pnpm lint` ya no reporta los archivos E2E, pero el repositorio conserva 35 errores y 56 advertencias fuera de la corrección autorizada, en archivos existentes de acceso, territorio, constancias y reportes; el comando se detiene antes de typecheck/layers/reglas. |
| `pnpm typecheck` | **Pasó** | `tsc --noEmit` terminó sin errores. |
| `pnpm layers` | **Pasó** | 629 módulos, 2736 dependencias, sin violaciones. Se ejecutó por separado porque `pnpm check` se detuvo en lint. |
| `pnpm reglas` | **Pasó** | 9 reglas y 2 métricas sobre 617 archivos, sin hallazgos. |
| Revisión completa del diff | **Pasó** | Se revisó el diff de la slice, incluidos archivos tracked y untracked; la corrección posterior quedó limitada a los dos archivos E2E. |
| `git diff --check` | **Pasó** | Sin errores de whitespace en el diff tracked; los dos archivos E2E también pasaron el chequeo enfocado de Biome. |

### Verificación del rollback repetida

Se usó `psql` nativo dentro de `xula-pg`, sin `rtk`, con el rol de menor
privilegio para cada operación:

1. `xula_app` insertó una fila `ROLLBACK_VERIFY` para Motul y la consulta
   tenant-scoped observó **1** fila.
2. `xula_migrator` retiró en una transacción `calles_punto_completo`,
   `latitud` y `longitud`; bajo `app.tenant` Motul, `xula_app` observó **0**
   columnas nuevas, **0** CHECK y **1** fila de bitácora.
3. `xula_migrator` restauró las dos columnas y el CHECK en otra transacción;
   la consulta final observó **2** columnas, **1** CHECK y la misma **1** fila
   de bitácora.
4. `pnpm db:local` recreó la base y eliminó el sentinel de verificación.

La primera consulta de la etapa intermedia se ejecutó sin fijar el tenant y
observó cero filas por RLS; se repitió correctamente con `SET LOCAL` antes de
considerar verificada la conservación de la bitácora.

### TDD Cycle Evidence de la corrección

| Tarea | Test | Safety net | RED | GREEN | Triangulación | Refactor |
|---|---|---|---|---|---|---|
| 4.1 — corrección de lint | Biome enfocado sobre `e2e/calles.spec.ts` y `e2e/preparar.ts` | ✅ 4.1 anterior conservada; suites completas repetidas después | N/A — no cambió comportamiento ni se agregó test | ✅ 0 errores y 0 advertencias en ambos E2E | N/A — corrección determinista de lint/formato | ✅ guardia explícita de filas y formato, con E2E 11/11 posterior |

### Work Unit Evidence actualizado

| Evidencia | Resultado |
|---|---|
| Test enfocado y resultado exacto | `pnpm test` → 241/241 archivos y 1200/1200 tests; `pnpm test:integration` → 78/78 archivos y 288/288 tests. |
| Runtime harness y resultado exacto | Primer `pnpm test:e2e` → 9 fallos por servidor reutilizado en 3000; `CI=1 E2E_PUERTO=3001 pnpm test:e2e` → 11/11 en 1.0 min con servidor fresco. |
| Rollback boundary | Solo `e2e/calles.spec.ts` y `e2e/preparar.ts`; revertir la corrección devuelve el escenario al estado de lint bloqueado sin tocar PR1–PR3. El ensayo de base restauró columnas, CHECK y bitácora. |
| Estado | **Bloqueada** por los 35 errores y 56 advertencias restantes de `pnpm check`, fuera del alcance autorizado; 4.1 permanece `[ ]`. |

### Bloqueo accionable actualizado

El lint enfocado de los dos archivos E2E está limpio y el runtime completo pasa,
pero `pnpm check` todavía no termina en verde por diagnósticos fuera de esta
corrección. No se marca 4.1 ni se inicia `sdd-verify`/archive. El siguiente
paso requiere una autorización separada para ampliar el alcance del lint o
corregir esos diagnósticos fuera de los dos archivos E2E.

## Repetición final de 4.1 — 2026-09-06

- **Estado:** completada. La tarea 4.1 quedó `[x]` en `tasks.md`.
- **Alcance:** se corrigieron únicamente diagnósticos de lint en archivos del
  candidato autorizado. `src/modules/territorio/infrastructure/esquema.ts`
  quedó en el límite de 200 líneas sin alterar su comportamiento; los tres
  separadores vacíos retirados son la única corrección adicional de métrica.
- **Lint:** la comprobación enfocada de los archivos candidatos pasó sin
  errores ni advertencias. La comprobación global revisó 636 archivos y dejó
  solo 51 advertencias preexistentes fuera del candidato, sin errores; por eso
  `pnpm check` terminó con código 0.

### Evidencia fresca de comandos obligatorios

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm db:local` | **Pasó** | Base `xula_test` recreada, roles provisionados y migraciones `0000`–`0011` aplicadas; se repitió al final para limpiar el sentinel. |
| `DATABASE_URL=... MIGRATION_DATABASE_URL=... SUPER_ADMIN_DATABASE_URL=... pnpm test` | **Pasó** | 241 archivos y 1200 tests; duración 291.81 s. |
| `DATABASE_URL=... MIGRATION_DATABASE_URL=... SUPER_ADMIN_DATABASE_URL=... pnpm test:integration` | **Pasó** | 78 archivos y 288 tests; duración 256.98 s; incluye aislamiento tenant sin `rtk`. |
| `CI=1 E2E_PUERTO=3001 ... pnpm test:e2e` | **Pasó** | Build/start frescos, 11/11 escenarios en 1.1 min; tiles OSM bloqueados deliberadamente. |
| `pnpm check` | **Pasó** | Biome sin errores, `tsc --noEmit` sin errores, dependency-cruiser sin violaciones y `pnpm reglas` sin hallazgos; Biome conserva 51 warnings fuera del candidato. |
| `pnpm reglas` | **Pasó** | 9 reglas y 2 métricas sobre 617 archivos, sin hallazgos. |
| `git diff --check` | **Pasó** | Sin errores de whitespace; se revisó el diff completo tracked/untracked. |

### Verificación final del rollback

Se ejecutó con `docker exec ... psql` nativo, sin `rtk`, usando el rol de
menor privilegio para cada operación:

1. `xula_app` insertó `ROLLBACK_VERIFY_NATIVE3` bajo el tenant de Motul.
2. `xula_migrator` retiró en una transacción `calles_punto_completo`,
   `latitud` y `longitud`.
3. La consulta tenant-scoped de `xula_app` observó `0` columnas nuevas, `0`
   CHECK y `1` fila de bitácora conservada.
4. `xula_migrator` restauró las dos columnas y el CHECK; la consulta final
   observó `2` columnas, `1` CHECK y la misma `1` fila de bitácora.
5. `pnpm db:local` recreó la base y eliminó el sentinel.

### TDD Cycle Evidence de 4.1

| Tarea | Test | Safety net | RED | GREEN | Triangulación | Refactor |
|---|---|---|---|---|---|---|
| 4.1 | Suites completas de Vitest, integración, Playwright y quality gates | ✅ 241/241 archivos y 1200/1200 tests; 78/78 archivos y 288/288 tests | N/A — verificación y corrección de lint sin comportamiento nuevo | ✅ Todas las suites frescas pasaron | N/A — no se agregó comportamiento | ✅ Corrección mecánica de lint/métrica, validada nuevamente |

### Work Unit Evidence actualizado

| Evidencia | Resultado |
|---|---|
| Test enfocado y resultado exacto | Suite completa: `pnpm test` → 241/241 y 1200/1200; integración → 78/78 y 288/288. |
| Runtime harness y resultado exacto | `CI=1 E2E_PUERTO=3001 pnpm test:e2e` → 11/11; rollback nativo → 0/0/1 al retirar y 2/1/1 después de restaurar. |
| Rollback boundary | Correcciones de lint del candidato y separadores de `esquema.ts`; el ensayo de base restauró columnas, CHECK y bitácora, sin tocar PR1–PR3 fuera del candidato. |
| Estado | **Completada**; `4.1` está `[x]`. No se inició `sdd-verify` ni archive. |

## Siguiente fase

La implementación y la verificación de apply están completas. El siguiente
paso recomendado es `sdd-verify`; archive queda para después de esa fase.
