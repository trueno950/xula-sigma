```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:0e15541cd7c1f25634f439da95a5b211c64e90b2bf474904052e5856a8e99dec
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 10/10
scenarios: 13/13
test_command: "DATABASE_URL=postgresql://xula_app:postgres@localhost:55432/xula_test MIGRATION_DATABASE_URL=postgresql://xula_migrator:postgres@localhost:55432/xula_test SUPER_ADMIN_DATABASE_URL=postgresql://xula_super_admin:postgres@localhost:55432/xula_test pnpm test"
test_exit_code: 0
test_output_hash: sha256:70575fe45b9508ffca6f52b0721451e5e1af9bb05da769a6e9444641a5da3f1e
build_command: "DATABASE_URL=postgresql://xula_app:postgres@localhost:55432/xula_test MIGRATION_DATABASE_URL=postgresql://xula_migrator:postgres@localhost:55432/xula_test SUPER_ADMIN_DATABASE_URL=postgresql://xula_super_admin:postgres@localhost:55432/xula_test pnpm build"
build_exit_code: 0
build_output_hash: sha256:9b77f82faea4c3ecf36e67a27190a272838221347a9bb2f7fb6c2e07b6a297cb
```

## Verification Report

**Cambio**: `territorio-calles-coordenadas-y-reasignacion`  
**Version**: N/A (cambio OpenSpec, sin version separada)  
**Modo**: Strict TDD  
**Estado**: PASS WITH WARNINGS. La remediacion autorizada cerro los tres bloqueos de cobertura de escenarios; no se modificaron codigo de produccion ni artefactos de planificacion durante esta verificacion.

### Resumen ejecutivo

La candidata cumple los 10 requisitos y los 13 escenarios MUST con evidencia runtime actual. Pasaron la suite completa de Vitest, la integracion separada contra Postgres real, coverage, build, `pnpm check` y los 11 escenarios E2E. Quedan advertencias informativas de safety net TDD historico, cobertura de ramas por archivo, aserciones acopladas y cobertura directa del listener de tiles; ninguna bloquea la admision.

### Completitud

| Metrica | Valor |
|---|---:|
| Tareas totales | 13 |
| Tareas completas | 13 |
| Tareas incompletas | 0 |
| Requisitos totales | 10 |
| Requisitos conformes | 10 |
| Escenarios totales | 13 |
| Escenarios conformes | 13 |

Los artefactos requeridos fueron leidos antes de juzgar: `proposal.md`, las dos especificaciones, `design.md`, `tasks.md` y `apply-progress.md`. `tasks.md` tiene las 13 tareas marcadas `[x]`. El `verify-report.md` anterior se trato solo como evidencia historica y este reporte lo reemplaza.

### Recuento autoritativo de specs

| Archivo | Requisitos | Escenarios |
|---|---:|---:|
| `specs/georreferenciacion-de-calles/spec.md` | 6 | 7 |
| `specs/jerarquia-territorial/spec.md` | 4 | 6 |
| **Total** | **10** | **13** |

### Ejecucion de build, tests y calidad

| Dimension | Comando exacto | Exit code | Resultado / hash de salida |
|---|---|---:|---|
| Runtime Postgres (evidencia histórica) | `pnpm db:local` | 0 | Migraciones `0000`-`0011` aplicadas antes de `0012`; `sha256:0869204d5d1267a54cafc89bd75204d895397d64fbb8b03bcb76066105aa3161` |
| Remediacion unit/UI | `DATABASE_URL=postgresql://xula_app:postgres@localhost:55432/xula_test MIGRATION_DATABASE_URL=postgresql://xula_migrator:postgres@localhost:55432/xula_test SUPER_ADMIN_DATABASE_URL=postgresql://xula_super_admin:postgres@localhost:55432/xula_test pnpm exec vitest run --project unit src/modules/territorio/application/callesFoundation.todo.test.ts src/modules/territorio/ui/mapa.test.tsx` | 0 | 2 archivos, 11 tests; `sha256:54a1fb57e67afd23d2c29cc49b66dc7e23a25a319bea1f2175fc65064697edea` |
| Remediacion Postgres | `DATABASE_URL=postgresql://xula_app:postgres@localhost:55432/xula_test MIGRATION_DATABASE_URL=postgresql://xula_migrator:postgres@localhost:55432/xula_test SUPER_ADMIN_DATABASE_URL=postgresql://xula_super_admin:postgres@localhost:55432/xula_test pnpm exec vitest run --project integration src/modules/territorio/calles.integration.test.ts` | 0 | 1 archivo, 5 tests; `sha256:a8bd9e73e069565a5449348380786aa0f97dfac7d6dda64dd49b7d571635c618` |
| Tests completos | `DATABASE_URL=postgresql://xula_app:postgres@localhost:55432/xula_test MIGRATION_DATABASE_URL=postgresql://xula_migrator:postgres@localhost:55432/xula_test SUPER_ADMIN_DATABASE_URL=postgresql://xula_super_admin:postgres@localhost:55432/xula_test pnpm test` | 0 | 241 archivos, 1204 tests; `sha256:70575fe45b9508ffca6f52b0721451e5e1af9bb05da769a6e9444641a5da3f1e` |
| Integracion completa | `DATABASE_URL=postgresql://xula_app:postgres@localhost:55432/xula_test MIGRATION_DATABASE_URL=postgresql://xula_migrator:postgres@localhost:55432/xula_test SUPER_ADMIN_DATABASE_URL=postgresql://xula_super_admin:postgres@localhost:55432/xula_test pnpm test:integration` | 0 | 78 archivos, 289 tests; `sha256:09103a64d2b025536f8f940d90eca118fdcf68425462e0f83d59491a026e6758` |
| Coverage | `DATABASE_URL=postgresql://xula_app:postgres@localhost:55432/xula_test MIGRATION_DATABASE_URL=postgresql://xula_migrator:postgres@localhost:55432/xula_test SUPER_ADMIN_DATABASE_URL=postgresql://xula_super_admin:postgres@localhost:55432/xula_test pnpm test --coverage` | 0 | 1204 tests; `sha256:f33c03cd7bd8024c2c696bc26df5384eb8a96fc44fa990218587f1a8d3ee0a4d` |
| Build | `DATABASE_URL=postgresql://xula_app:postgres@localhost:55432/xula_test MIGRATION_DATABASE_URL=postgresql://xula_migrator:postgres@localhost:55432/xula_test SUPER_ADMIN_DATABASE_URL=postgresql://xula_super_admin:postgres@localhost:55432/xula_test pnpm build` | 0 | Next.js 16.3.1/Turbopack; 14 paginas generadas; `sha256:9b77f82faea4c3ecf36e67a27190a272838221347a9bb2f7fb6c2e07b6a297cb` |
| Quality gate | `pnpm check` | 0 | Biome 0 errores, TypeScript 0 errores, capas sin violaciones y reglas sin hallazgos; 51 warnings preexistentes fuera de la candidata; `sha256:b57f045d80cc6ae8214c773fd1528aa3243cd33e54fb8f60b5583f7aaa7b2d67` |
| E2E | `CI=1 E2E_PUERTO=3001 DATABASE_URL=postgresql://xula_app:postgres@localhost:55432/xula_test MIGRATION_DATABASE_URL=postgresql://xula_migrator:postgres@localhost:55432/xula_test SUPER_ADMIN_DATABASE_URL=postgresql://xula_super_admin:postgres@localhost:55432/xula_test pnpm test:e2e` | 0 | 11 tests; servidor fresco `next build` + `next start`; tiles OSM abortados deliberadamente; `sha256:1d82bdd4b94c055d57bc649710c5f378ec5a7ea4d3473db207189e35452c9a19` |
| Biome de remediacion | `pnpm exec biome check src/modules/territorio/application/callesFoundation.todo.test.ts src/modules/territorio/ui/mapa.test.tsx src/modules/territorio/calles.integration.test.ts --max-diagnostics=200` | 0 | 3 archivos, sin issues; `sha256:edde77a2123e70db04a3ac21d47ad06e7e7281f937fd9816c693128f1aec04bf` |
| Whitespace | `git diff --check` | 0 | Salida vacia; `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

El hash `evidence_revision` del envelope es el digest del manifiesto de evidencia de estos comandos y de los conteos autoritativos `10/13`.

### Coverage

El piso configurado es 80% para statements, functions y lines, y 75% para branches. La ejecucion completa obtuvo:

- Statements: **97.75%** (1261/1290)
- Branches: **92.69%** (584/630)
- Functions: **98.96%** (384/388)
- Lines: **98.86%** (1132/1145)

#### Coverage de archivos modificados medidos por V8

| Archivo | Statements | Branches | Functions | Lines | Lineas no cubiertas reportadas |
|---|---:|---:|---:|---:|---|
| `src/modules/territorio/domain/punto.ts` | 100% | 100% | 100% | 100% | — |
| `src/modules/territorio/domain/errores.ts` | 100% | 100% | 100% | 100% | — |
| `src/modules/territorio/application/ubicarCalle.ts` | 87.50% | 80% | 100% | 100% | 29-38 |
| `src/modules/territorio/application/reparentearCalle.ts` | 78.57% | 62.50% | 100% | 90.91% | 19 |
| `src/modules/territorio/application/darDeBajaCalle.ts` | 78.57% | 62.50% | 100% | 90.91% | 15 |
| `src/modules/territorio/application/renombrarCalle.ts` | 90.91% | 83.33% | 100% | 100% | 36 |
| **Promedio simple** | — | **81.39%** | — | **96.97%** | — |

`vitest.config.ts` excluye del reporte de coverage las declaraciones de infraestructura, migracion, UI, tipos, barrels y fixtures. Esas superficies se verificaron con las pruebas de Postgres, SSR/UI, E2E, TypeScript, capas y reglas.

### TDD Compliance

| Check | Resultado | Detalle |
|---|---|---|
| Evidencia TDD reportada | ✅ | `apply-progress.md` contiene la tabla para las 13 tareas. |
| Todas las tareas tienen prueba o suite | ✅ | 13/13 filas tienen archivo o suite de evidencia; 4.1 es verification-only. |
| RED confirmado | ✅ | 12/12 tareas de comportamiento tienen archivos de test existentes; 4.1 es N/A. |
| GREEN confirmado | ✅ | Los archivos referenciados pasan en la ejecucion actual; las tres remediaciones tambien pasan enfocadas. |
| Triangulacion adecuada | ✅ | Los escenarios MUST tienen casos distintos para nulidad, limites, permisos, destino, domicilios, reportes, tenant y bitacora; las tareas estructurales/verification-only son N/A. |
| Safety net de archivos modificados | ⚠️ | 3.2 y 3.3 declaran `N/A (new)` aunque tambien modifican `TabDeCalles.tsx`, `FormularioDeRenombreDeCalle.tsx` y `e2e/preparar.ts`. |

**TDD Compliance**: 5/6 checks en verde; una advertencia historica de safety net, sin bloquear escenarios.

### Distribucion de capas de tests

| Capa | Tests | Archivos | Herramienta |
|---|---:|---:|---|
| Unit | 72 | 10 | Vitest, puertos mockeados o funciones puras |
| Integration | 17 | 4 | Vitest; Postgres real y SSR de `SelectorDePunto` |
| E2E | 1 | 1 | Playwright Chromium, servidor `next build` + `next start` |
| **Total** | **90** | **15** | |

`mapa.test.tsx` corre en el proyecto unit de Vitest pero se clasifica como integration por renderizar el componente real con `renderToStaticMarkup`. Las suites de aislamiento se ejecutaron sin `rtk` contra Postgres real.

### Assertion Quality

| Archivo | Linea | Asercion | Problema | Severidad |
|---|---:|---|---|---|
| `src/modules/territorio/calles.isolation.test.ts` | 105 | `expect(afectadas).toEqual([])` | Coleccion vacia sin una asercion no-vacia en el mismo setup; es necesaria para demostrar que RLS frena el UPDATE cruzado, pero el patron queda fragil. | WARNING |
| `src/modules/territorio/ui/mapa.test.tsx` | 50, 52-57 | Aserciones sobre `class`, `hidden`, `visible/invisible` y `visibility` | Acoplamiento a detalle de implementacion de la inicializacion React/Leaflet, no solo a resultado de usuario. | WARNING |

**Assertion quality**: 0 CRITICAL, 2 WARNING. No se encontraron tautologias, ghost loops, aserciones sin llamada a produccion ni smoke tests puros.

### Matriz de cumplimiento de specs

| Requisito | Escenario | Test / evidencia runtime actual | Resultado |
|---|---|---|---|
| Coordenada opcional por calle | Alta sin punto | `calles.repository.integration.test.ts > crea y relee una calle sin punto`; Postgres real | ✅ COMPLIANT |
| Rango valido — bounding box de Yucatan | Punto dentro del estado se acepta | `callesFoundation.todo.test.ts > ubica y redondea el punto`; caso de uso real con fake repository | ✅ COMPLIANT |
| Rango valido — bounding box de Yucatan | Punto fuera del estado se rechaza sin escribir | `callesFoundation.todo.test.ts > rechaza un punto fuera de Yucatan y no escribe la calle`; espera `PuntoFueraDeYucatanError` y `actualizar` no llamado | ✅ COMPLIANT |
| Ubicar o corregir el punto exige administrar territorio | Operador de mostrador no puede ubicar el pin | `callesFoundation.todo.test.ts > rechaza ubicar sin permiso y no abre transaccion`; `NoAutorizadoError` y cero escritura | ✅ COMPLIANT |
| El punto no se mueve al reparentear | Reparenteo conserva el punto | `callesFoundation.todo.test.ts > reparentear escribe solo la calle` + `calles.repository.integration.test.ts > conserva exactamente el punto al cambiar de lugar` | ✅ COMPLIANT |
| Estado vacio visible cuando falta el punto | Calle sin coordenada muestra estado vacio en ficha/listado | `mapa.test.tsx > muestra campos de coordenadas vacios cuando no existe un punto`; render real de `SelectorDePunto` con `punto: null`, labels y valores vacios | ✅ COMPLIANT |
| Columnas nuevas heredan el aislamiento de calles | Un municipio no ve el punto de otro | `calles.isolation.test.ts > una consulta sin filtro solo devuelve las calles del tenant activo`; Postgres/RLS real, punto de Ticul invisible desde Motul | ✅ COMPLIANT |
| Reparentear una calle mueve solo su fila | Reparenteo no toca domicilios | `calles.integration.test.ts > reparentear una calle conserva intactos sus domicilios`; Postgres real, compara el domicilio completo antes/despues y confirma `lugarId` original | ✅ COMPLIANT |
| Reparentear una calle mueve solo su fila | Lugar destino invalido se rechaza | `callesFoundation.todo.test.ts > reparentear conserva el punto y rechaza un destino ajeno o inexistente`; `NoEncontradoError`, sin update ni bitacora | ✅ COMPLIANT |
| Reparentear rechaza nombre duplicado en el destino | Lugar destino ya tiene ese nombre | `calles.repository.integration.test.ts > traduce el nombre duplicado cuando la actualizacion cambia de lugar` + escenario E2E; error tipado/redactado y fila no escrita | ✅ COMPLIANT |
| Baja logica de una calle, bloqueada solo por domicilios | Calle con domicilios no se da de baja | `callesFoundation.todo.test.ts > bloquea la baja cuando existe un domicilio principal o transversal` + repository/E2E | ✅ COMPLIANT |
| Baja logica de una calle, bloqueada solo por domicilios | Calle con reportes activos si se da de baja | `callesFoundation.todo.test.ts > permite la baja si solo hay reportes` + escenario E2E con reporte real | ✅ COMPLIANT |
| Reparentear y baja de calle exigen administrar territorio y dejan bitacora | Reparenteo y baja dejan traza | `callesFoundation.todo.test.ts` + E2E; acciones `REPARENTEAR_CALLE` y `BAJA_CALLE` consultadas en `bitacora` | ✅ COMPLIANT |

**Resumen de cumplimiento**: **13/13 escenarios conformes; 10/10 requisitos completos**. Los tres escenarios que estaban incompletos en el reporte anterior ahora tienen evidencia runtime independiente y pasada: rechazo de coordenada invalida sin escritura, estado vacio real de `SelectorDePunto`, y reparenteo con domicilio existente preservado.

### Correctness (evidencia estatica y runtime)

| Requisito / decision | Estado | Notas |
|---|---|---|
| Columnas nullable y CHECK de punto completo | ✅ Implementado | `0011_calles_coordenadas.sql` agrega dos columnas nullable y el CHECK de par completo; no crea tabla ni RLS adicional. |
| Bounding box y redondeo | ✅ Implementado | `CAJA_DE_YUCATAN` vive en dominio; el caso de uso valida y redondea antes de abrir `withTenant`; el rechazo invalido tiene test conductual. |
| Update ancho y guardia de calle activa | ✅ Implementado | `actualizar` escribe nombre, lugar, punto y baja, filtra `bajaEn IS NULL`; los casos de uso releen la calle. |
| Conteo de domicilios | ✅ Implementado | El repositorio cuenta `calleId`, `entreCalleAId` y `entreCalleBId` bajo el tenant activo. |
| Baja sin dependencia de reportes | ✅ Implementado | `territorio` no importa ni consulta `reportes`; el E2E confirma baja con reporte apuntando. |
| RLS heredado por `calles` | ✅ Implementado | Las columnas viven en la tabla existente con `FORCE RLS`, politica tenant y FK compuesto. |
| Bitacora atomica | ✅ Implementado | Ubicar, reparenteo y baja llaman `registrar` con el mismo `tx` de `withTenant`. |
| Limites de Server Actions | ✅ Implementado | Las tres acciones hacen `safeParse` antes de sesion, derivan tenant del contexto y redactan errores permitidos. |
| Isla Leaflet | ✅ Implementado | Import dinamico, `circleMarker`, `maxBounds`, attribution OSM, campos nativos y fallback de tiles. |
| Estado vacio | ✅ Implementado | `SelectorDePunto` deja inputs visibles y vacios con `punto: null`; listado y panel muestran `Sin punto`. |

### Coherencia con el diseño

| Decision | Seguida? | Notas |
|---|---|---|
| D1 — `doublePrecision` nullable + CHECK de par completo | ✅ Si | Migration, esquema y round-trip coinciden con la decision. |
| D2 — puerto ancho y relectura antes de escribir | ✅ Si | Ubicar, reparenteo y baja preservan las columnas no modificadas; el repositorio bloquea calles dadas de baja. |
| D3 — baja cuenta principal y transversales, no reportes | ✅ Si | El conteo usa OR sobre las tres referencias y no agrega dependencia a `reportes`. |
| D4 — Leaflet directo, OSM, `circleMarker`, bounds | ✅ Si | `useMapaDePunto` usa import dinamico, `circleMarker`, attribution y la misma caja de dominio. |
| D5 — isla cliente con campos nativos y degradaciones | ✅ Si, con ajuste de inicializacion | `visibility:hidden` conserva dimensiones durante la medicion; los campos siguen SSR-eados y `hidden` solo se activa cuando falla el import. |
| D6 — panel de calle y navegacion `?calle=` | ✅ Si | Las filas enlazan al panel y las cuatro acciones viven en disclosure progresivo. |

### Coherencia con tareas

Las 13 tareas estan marcadas `[x]`. La implementacion contiene las cuatro capas afectadas, tests RED/GREEN documentados en `apply-progress.md`, la migracion, casos de uso, acciones, panel/UI, E2E y quality gates. La tarea 4.1 tiene evidencia de suites completas, rollback local y checks; esta fase repitio de forma independiente tests, coverage, build, E2E y calidad.

### Dimensiones omitidas o no aplicables

- **Click real sobre Leaflet y guardado desde ese click**: el E2E bloquea tiles OSM deliberadamente, tal como define el diseño; los campos nativos, el render vacio, el caso de uso y el flujo POST se verifican, pero no se atribuye cobertura E2E a la red ni al click.
- **Listener `tileerror` en navegador**: se verifica el mensaje/fallback y la configuracion, pero no se monta Leaflet real para disparar el evento; queda como advertencia de cobertura de UI.
- **Rollback de migracion**: no se repitio en esta fase; `apply-progress.md` conserva la evidencia nativa de retirar/restaurar columnas y CHECK preservando bitacora. No es un escenario MUST de las dos specs.
- **Settlement nativo, receipt y archive**: no se ejecutaron; corresponden al orquestador y a la siguiente fase, respectivamente.
- **Superficie shell/subprocess/VCS del producto**: N/A; el cambio no agrega esa superficie.

### Issues Found

**CRITICAL**: Ninguno.

**WARNING**:

1. `apply-progress.md` marca `N/A (new)` como safety net en tareas 3.2/3.3 aunque tambien se modificaron archivos existentes; queda como advertencia de evidencia historica.
2. Coverage de ramas por archivo esta en 62.50% en `reparentearCalle.ts` y `darDeBajaCalle.ts`; el piso global de branches (75%) pasa y la cobertura de lineas de ambos archivos es 90.91%.
3. `calles.isolation.test.ts:105` usa una asercion de coleccion vacia y `mapa.test.tsx:50,52-57` aserciones de clases/visibilidad; son advertencias de calidad de asercion, no falsos verdes detectados.
4. La prueba de `tileerror` no dispara el listener Leaflet y `callesUI.test.ts` prueba helpers de presentacion en lugar de montar `PanelDeCalle`; E2E cubre los formularios nativos y no depende de tiles.

**SUGGESTION**:

1. Cuando exista un arnes de tiles controlado, agregar una prueba de browser del listener `tileerror` sin convertir la red OSM en dependencia CI.
2. Mantener separados los 51 warnings de Biome preexistentes fuera de la candidata para que un `pnpm check` verde no se interprete como cero warnings globales.

### Verdict

**PASS WITH WARNINGS**

Los 10 requisitos y 13 escenarios MUST estan cubiertos por pruebas que pasaron en runtime, incluidos los tres casos remediados. La candidata compila, pasa las suites completas, coverage, E2E y quality gates; las advertencias restantes son de trazabilidad TDD y profundidad de pruebas, no bloqueadores de admision. El siguiente paso recomendado es `sdd-archive` despues del settlement nativo del intento ya adquirido.

## Addendum de migraciones — 2026-09-08

La evidencia histórica anterior precede a la migración `0012`. Una ejecución
fresca de `pnpm db:local` aplicó la cadena completa `0000`–`0012` sin error;
`drizzle.__drizzle_migrations` confirmó los identificadores `13`, `12` y `11`
para `0012`, `0011` y `0010`. Hash de salida:
`sha256:7ba93dc12fecaf298610e56083be27499000f299f728bd92bb570b2327f35c73`.
