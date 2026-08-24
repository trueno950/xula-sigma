# Tasks: Capa territorial (Fase 1b)

## Review Workload Forecast

Presupuesto de revision de esta sesion: **800 lineas** (`review_budget_lines`
del preflight, igual al de `proposal.md`/`design.md`), no el default generico
de 400 del skill de tareas. Las etiquetas de abajo usan el nombre de campo
fijo del contrato (`400-line budget risk`) pero se evaluan contra 800.

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3.265 (180+950+640+370+495+490+140) |
| 400-line budget risk | High — Rebanada 2 sola queda ~19% sobre el presupuesto de 800; las otras 6 quedan holgadas |
| Chained PRs recommended | Yes |
| Suggested split | PR1→PR2→PR3→PR4→PR5→PR6→PR7, cada uno mergeado a `main` antes de abrir el siguiente |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main (secuencial, sin ramas apiladas — `CLAUDE.md`: "Un PR, un merge") |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

`auto-chain` resuelve solo a "No" cuando cada rebanada individual entra en
presupuesto. La Rebanada 2 no entra (~950 sobre 800) y **no se puede partir**
sin romper una regla que este mismo archivo trata como no negociable (ver
Nota 1). Por eso el "Yes" de arriba es acotado: las Rebanadas 1, 3, 4, 5, 6 y
7 proceden con `sdd-apply` sin pedir nada mas; la Rebanada 2 necesita que un
maintainer acepte `size:exception` **para esa rebanada sola** antes de
implementarla.

### Notas — dos contradicciones encontradas y reconciliadas

**1. Los tests de aislamiento se consolidan en la Rebanada 2, no se reparten
en 2·4·5·6 como escribe `design.md` §13.** La tabla de archivos del diseno
pone la migracion completa (4 tablas) en la Rebanada 2 pero deja los tests de
aislamiento de `calles`, `domicilios` y `residencias` para las rebanadas
donde llegan sus casos de uso. Eso choca con
`openspec/config.yaml` `rules.tasks`: *"Tabla nueva = tarea de RLS + tarea de
test de aislamiento en el mismo commit"* — regla declarada no negociable en
esta tarea. Si las cuatro tablas nacen juntas en un solo PR (tambien no
negociable: partirlo deja `residencias` sin su FK compuesto en un estado
intermedio, el mismo bypass entre municipios que este cambio existe para
cerrar), las cuatro pruebas de aislamiento tienen que nacer con ellas. Efecto
en el corte: la Rebanada 2 crece de los ~640 originales a ~950 y las
Rebanadas 4, 5 y 6 bajan la misma cantidad (~90, ~125 y ~110 lineas menos
respectivamente) porque ya no cargan su propio test de aislamiento. El total
del cambio no se mueve, solo donde vive cada pieza. Precedente exacto:
Slice 4 de `padron-ciudadano` acepto quedar ~12% sobre presupuesto por el
mismo tipo de razon (partir deja un estado intermedio peor que el diff
largo); aca el sobrepaso es mayor (~19%) porque son tres pruebas de
aislamiento las que se mueven, no una.

**2. El nombre de la regla de autorizacion es `puedeAdministrarTerritorio`,
no `puedeReestructurarTerritorio`.** `design.md` §9 la nombra
`puedeReestructurarTerritorio` en su prosa; `specs/autorizacion-roles/spec.md`
fija con MUST el nombre `puedeAdministrarTerritorio` como el contrato
publico. El spec manda sobre el nombre de superficie; se usa ese en las
tareas de abajo. No es una decision que se reabre — es una etiqueta que
diverge entre dos documentos, mismo tipo de hallazgo que la numeracion de
rebanadas de `padron-ciudadano`.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Puerto de lectura compuesto en `padron` (`personaPorId`, `identidadesDe`) | PR 1 | `pnpm test src/modules/padron/application` | `pnpm db:local`; `pnpm test:integration -- lecturaCompuesta` | Revertir PR; aditivo, no cambia ninguna firma existente |
| 2 | Esquema territorial completo: 4 tablas, RLS/`FORCE`/`GRANT`, FK a mano, dominio de tipos e ids, aislamiento de las 4 | PR 2 | `pnpm test src/modules/territorio/domain` + `pnpm test:integration -- isolation` (territorio) | `pnpm db:local`, exportar env vars de `scripts/db-local.sh`, nativo sin `rtk` | Revertir PR y bajar `drizzle/0007_territorio.sql`; las 4 tablas nacen vacias, nada mas las lee |
| 3 | Alta/edicion/baja/reparenteo de lugares, subarbol, arbol UI, `puedeAdministrarTerritorio`, reforma de `AGENTS.md` | PR 3 | `pnpm test src/modules/territorio/application -- Lugar` | `pnpm db:local`; `pnpm test:integration -- reparentear subarbol` | Revertir `application/{altaDeLugar,editarLugar,darDeBajaLugar,reparentearLugar,subarbol}.ts`+UI; esquema de PR2 intacto |
| 4 | Catalogo de calles: alta, renombre, selector | PR 4 | `pnpm test src/modules/territorio/application -- Calle` | `pnpm db:local`; `pnpm test:integration -- Calle` | Revertir `application/{altaDeCalle,renombrarCalle,listarCalles}.ts`+UI; tabla ya existe desde PR2 |
| 5 | Domicilios: direccion compuesta, consulta por zona y por calle | PR 5 | `pnpm test src/modules/territorio/domain -- direccion` + `application -- Domicilio` | `pnpm db:local`; `pnpm test:integration -- Domicilio` | Revertir `domain/direccion.ts`+`application/altaDeDomicilio.ts`+UI; catalogo de calles de PR4 intacto |
| 6 | Residencias: `shared/lib/fecha`, mudanza atomica, colapso de fusion, historial, adaptador de `padron` | PR 6 | `pnpm test src/shared/lib/fecha src/modules/territorio/application -- Residencia` | `pnpm db:local`; `pnpm test:integration -- mudanza historial` | Revertir `domain/residencia.ts`+`application/{registrarMudanza,historialDeResidencias,residentesDe}.ts`+adaptador; PR1 y PR2 intactos |
| 7 | Exportacion: 4 `PorcionExportable` | PR 7 | `pnpm test src/modules/territorio -- composicion` | N/A — sin sistema externo vivo; lo cubre el test de la propia composicion | Revertir `porcionesDeTerritorio`/`porciones.ts`; exportacion de otros modulos no se toca |

### Dependencia real (no una cadena lineal)

- **1** y **2** son independientes entre si; ninguna otra rebanada depende de
  la 1 salvo la 6 (correccion de `design.md` §17 a la propuesta original).
- **2** es la base de esquema: **3, 4, 5, 6 y 7** la necesitan (importan
  `territorio/infrastructure/esquema.ts`), pero no dependen entre si por
  codigo salvo el punto siguiente.
- **4 antes que 5**: un domicilio necesita el catalogo de calles poblable: se
  puede mergear el catalogo vacio y capturar despues, pero la UI de alta de
  domicilio (Fase 5) usa el selector de calles de la Fase 4.
- **1 antes que 6**: `registrarMudanza`/`historialDeResidencias` consumen el
  puerto de lectura de `padron` de la Fase 1.
- El orden 1→2→3→4→5→6→7 ya satisface las dos restricciones reales; se deja
  esa numeracion por conveniencia de secuencia a `main`, no porque las
  rebanadas 3, 4, 5 y 6 se bloqueen entre si.

---

## Phase 1: Rebanada 1 — Puerto de lectura compuesto en `padron` (~180 lineas)

Independiente. Requerida solo por la Fase 6.

- [x] 1.1 Modificar `padron/application/puertos.ts`: agregar
      `identidadesDe(tx, id: PersonaId): Promise<readonly PersonaId[]>` a
      `RepositorioDePersonas`.
- [x] 1.2 RED `padron/infrastructure/repositorioDePersonasSql.test.ts`:
      `identidadesDe` devuelve `[id]` sin fusion y `[perdedora, ganadora]`
      para una identidad fusionada, con el mismo COALESCE de `buscarPorId`.
- [x] 1.3 GREEN `repositorioDePersonasSql.ts`: `SELECT id WHERE id = $T OR
      fusionada_en = $T`, con `T` ya resuelto. Implementado con `terminalDe`,
      un helper compartido con `buscarPorId` para que las dos resuelvan
      exactamente igual (el mismo COALESCE, escrito una sola vez).
- [x] 1.4 RED `padron/application/personaPorId.test.ts` (puertos mockeados):
      id inexistente o de otro tenant -> `null`; id existente -> persona
      colapsada.
- [x] 1.5 GREEN `padron/application/personaPorId.ts`.
- [x] 1.6 RED `padron/application/identidadesDePersona.test.ts` (puertos
      mockeados): sin fusion -> `[id]`; fusionada -> ambos ids.
- [x] 1.7 GREEN `padron/application/identidadesDePersona.ts`.
- [x] 1.8 `padron/application/index.ts`, `padron/composicion.ts`: componer
      `crearPersonaPorId`, `crearIdentidadesDePersona`, sin guarda de rol en
      ninguna (precedente `listarPersonas`).
- [x] 1.9 `padron/index.ts`: reexport nombrado `{ comoPersonaId, esPersonaId,
      type PersonaId } from "./domain"` — nunca `export *`.
- [x] 1.10 RED `padron/superficiePublica.test.ts`: assertion "el barrel no
      exporta `normalizarParaBusqueda`" — provocar el rojo exportandolo
      temporalmente, confirmar el fallo, retirar el export temporal.
- [x] 1.11 GREEN: barrel solo con el reexport de 1.9; test en verde.
- [x] 1.12 RED `padron/lecturaCompuesta.integration.test.ts`: fusion A->B,
      `identidadesDe(A)` devuelve `[A,B]` en un salto (Postgres real, dos
      tenants).
- [x] 1.13 GREEN (ajustar 1.3 si falla). No hizo falta ajustar: 1.3 paso
      sin cambios contra Postgres real.
- [x] 1.14 RED mismo archivo: invocar `personaPorId` desde ADENTRO de un
      `withTenant` ya abierto, con `Promise.race` contra un timeout corto —
      confirma que nunca resuelve bajo `DB_POOL_MAX=1` (design §6, no medido
      hasta esta prueba). Sin GREEN de codigo de produccion: la prueba es la
      verificacion de por que el puerto se llama fuera de la transaccion.
      Confirmado empiricamente: la deduccion del diseno era correcta.
- [x] 1.15 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.
      228 unit + 149 integration.

## Phase 2: Rebanada 2 — Esquema territorial y aislamiento completo (~950 lineas, EXCEPCION — ver Nota 1)

Independiente (no depende de la 1). Requerida por las Fases 3, 4, 5, 6 y 7.

- [x] 2.1 RED `territorio/domain/identificadores.test.ts`: los 4
      constructores (`comoLugarId`, `comoCalleId`, `comoDomicilioId`,
      `comoResidenciaId`) rechazan no-UUID y aceptan UUID valido.
- [x] 2.2 GREEN `territorio/domain/identificadores.ts` (`Identificador<N>` +
      `PATRON_UUID` propio, tercera copia del regex — design §3).
- [x] 2.3 RED `territorio/domain/tipoDeLugar.test.ts`: `puedeContener(padre,
      hijo)` sobre las 25 combinaciones de `TIPOS_DE_LUGAR`, con los dos
      casos de rango 0 nombrados (`cabecera` y `comisaria` no se contienen
      entre si) y el resto del orden estricto.
- [x] 2.4 GREEN `territorio/domain/tipoDeLugar.ts`: tabla de rangos +
      `puedeContener`.
- [x] 2.5 `territorio/domain/index.ts`.
- [x] 2.6 `territorio/infrastructure/esquema.ts`: las 4 tablas con
      `columnaTenant()` + `politicaTenant()` + `.enableRLS()`;
      `unique(id, ayuntamientoId)` en `lugares`/`calles`/`domicilios`;
      `check("lugares_sin_autopadre")`, `uniqueIndex("lugares_una_cabecera")`,
      `check("domicilios_calles_distintas")`,
      `uniqueIndex("residencias_una_abierta_idx")` **con el builder de
      Drizzle, nunca `sql\`…\`\`** (evita disparar
      `identidadPorPuerto.test.ts`), `check("residencias_vigencia")`.
      `residencias.personaId` es `uuid().notNull()` sin `.references()` ni
      `$type<PersonaId>()` — importar el tipo de `padron` via el barrel es
      el antipatron 8 (hallazgo de GGA, ver design.md decision 4).
- [x] 2.7 `drizzle/0007_territorio.sql`: generar con `drizzle-kit generate`;
      en la cola, `FORCE ROW LEVEL SECURITY` + `GRANT` para las 4 tablas y el
      FK compuesto a mano `residencias_persona_tenant_fk` hacia
      `personas(id, ayuntamiento_id)`, con el comentario del design §5.
- [x] 2.8 `territorio/infrastructure/index.ts`;
      `territorio/{index,types,composicion}.ts` esqueleto minimo.
- [x] 2.9 RED `territorio/superficiePublica.test.ts`: el barrel no exporta
      ningun objeto de tabla Drizzle — provocar el rojo exportando `lugares`
      temporalmente, confirmar el fallo, retirarlo.
- [x] 2.10 GREEN: barrel limpio, test en verde.
- [x] 2.11 RED `territorio/lugares.isolation.test.ts`: sembrar dos
      municipios; sin filtro en Motul solo devuelve lugares de Motul (T1); un
      `padreId` de Ticul insertado desde Motul es rechazado por Postgres
      (T4).
- [x] 2.12 GREEN (ajustar RLS/FK de 2.6-2.7 si falla).
- [x] 2.13 RED integration: segunda fila `tipo=cabecera` en el mismo
      municipio rechazada por `lugares_una_cabecera`; `padre_id = id` por SQL
      directo rechazado por `lugares_sin_autopadre`.
- [x] 2.14 GREEN.
- [x] 2.15 RED `territorio/calles.isolation.test.ts`: sin filtro en Motul
      solo devuelve calles de Motul (T1); un `lugarId` de Ticul insertado
      desde Motul es rechazado por Postgres.
- [x] 2.16 GREEN.
- [x] 2.17 RED `territorio/domicilios.isolation.test.ts`: sin filtro en Motul
      solo devuelve domicilios de Motul (T1); un `calleId` de Ticul
      insertado desde Motul es rechazado por Postgres.
- [x] 2.18 GREEN.
- [x] 2.19 RED `territorio/residencias.isolation.test.ts` — la prueba mas
      critica del cambio: sin filtro en Motul solo devuelve residencias de
      Motul (T1); una residencia con `personaId` de una persona de Ticul
      insertada desde Motul es rechazada por Postgres nombrando
      `residencias_persona_tenant_fk`.
- [x] 2.20 GREEN (ajustar el FK a mano de 2.7 si el nombre no calza).
- [x] 2.21 Verificar (no asumir) que `identidadPorPuerto.test.ts` sigue en
      verde con `territorio/infrastructure/esquema.ts` presente.
- [x] 2.22 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde;
      confirmar piso 80/75 sobre `modules/territorio/domain`.

## Phase 3: Rebanada 3 — Casos de uso de lugares, arbol y regla de administracion (~640 lineas)

Depende de la Fase 2. Independiente de las Fases 1, 4, 5 y 6.

- [ ] 3.1 `territorio/application/puertos.ts`: `RepositorioDeLugares`
      (`crear`, `buscarPorId`, `actualizar`, `contarHijosActivos`,
      `contarDomiciliosColgados`, `subarbol`).
- [ ] 3.2 RED `shared/auth/roles.test.ts`: fila para
      `puedeAdministrarTerritorio` — `ADMIN_MUNICIPAL` si,
      `OPERADOR`/`CONSULTA`/`SUPER_ADMIN` no (nombre del spec — ver Nota 2).
- [ ] 3.3 GREEN `shared/auth/roles.ts`: `puedeAdministrarTerritorio = (rol)
      => rol === "ADMIN_MUNICIPAL"`.
- [ ] 3.4 RED `territorio/application/altaDeLugar.test.ts` (puertos
      mockeados): rechaza sin `puedeEscribir`; un sector cuyo padre es una
      comisaria sin colonias se crea sin fila de relleno.
- [ ] 3.5 GREEN `altaDeLugar.ts`.
- [ ] 3.6 RED `territorio/application/editarLugar.test.ts`:
      `DatosDeEdicionDeLugar` no tiene campo `tipo` — el caso de uso no
      puede recibirlo ni omitirlo, solo renombra.
- [ ] 3.7 GREEN `editarLugar.ts`.
- [ ] 3.8 RED `territorio/application/darDeBajaLugar.test.ts`: rechaza si el
      lugar tiene hijos activos o domicilios colgados (dos `count`
      mockeados).
- [ ] 3.9 GREEN `darDeBajaLugar.ts`.
- [ ] 3.10 RED `territorio/application/reparentearLugar.test.ts` (puertos
      mockeados): rechaza sin `puedeAdministrarTerritorio`; rechaza si
      `puedeContener(nuevoPadre.tipo, lugar.tipo)` es falso (comisaria no
      puede ser hija de cabecera; un sector no puede volverse padre de su
      propia colonia); `nuevoPadreId = null` salta el chequeo de tipo.
- [ ] 3.11 GREEN `reparentearLugar.ts`: `UPDATE` de una sola fila +
      `registrar(REPARENTEAR_LUGAR, solo ids)`.
- [ ] 3.12 RED `territorio/infrastructure/repositorioDeLugaresSql.test.ts`:
      CTE de subarbol con el builder de Drizzle (no `sql\`…\``, mismo motivo
      que 2.6) devuelve descendientes a cualquier profundidad con `WHERE
      profundidad < 8` como cinturon.
- [ ] 3.13 GREEN `repositorioDeLugaresSql.ts`.
- [ ] 3.14 RED integration: sector con dos manzanas y un domicilio colgado
      directo del sector — el subarbol devuelve las tres filas.
- [ ] 3.15 GREEN.
- [ ] 3.16 RED integration: reparentear una colonia para que su padre sea su
      propio sector (ciclo de largo 2) es rechazado por el caso de uso.
- [ ] 3.17 GREEN.
- [ ] 3.18 RED integration: reparentear deja intacto el conteo y el `xmin`
      de `domicilios`/`residencias` del subarbol movido, y el subarbol del
      nuevo padre incluye los domicilios movidos.
- [ ] 3.19 GREEN.
- [ ] 3.20 `territorio/ui/ArbolDeLugares.tsx` (Server Component,
      `<details>/<summary>` nativo, cero `"use client"`);
      `ui/actions/{altaDeLugar,editarLugar,darDeBajaLugar,reparentearLugar}Action.ts`;
      `src/app/(panel)/territorio/page.tsx`.
- [ ] 3.21 `AGENTS.md`: reformar "Server Actions" — la justificacion de la
      excepcion queda escrita una vez como condicion y el padron de acciones
      pasa a tabla (`accion | modulo | forma del formulario`), migrando
      `altaDePersonaAction`/`fusionarPersonasAction` sin perder sus notas y
      agregando las cuatro de esta rebanada. Tarea independiente y
      revertible sin tocar codigo (decision del usuario, confirmada).
- [ ] 3.22 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde;
      cobertura sobre `modules/territorio/application`.

## Phase 4: Rebanada 4 — Catalogo de calles (~370 lineas)

Depende de la Fase 2. Debe mergearse antes que la Fase 5.

- [ ] 4.1 `territorio/application/puertos.ts` (modificar): agregar
      `RepositorioDeCalles` (`crear`, `actualizar`, `listarPorLugar`).
- [ ] 4.2 RED `territorio/application/altaDeCalle.test.ts` (puertos
      mockeados): rechaza sin `puedeAdministrarTerritorio`; una "Calle 21"
      de la cabecera y otra de una comisaria distinta conviven.
- [ ] 4.3 GREEN `altaDeCalle.ts`.
- [ ] 4.4 RED `territorio/application/renombrarCalle.test.ts`: rechaza sin
      `puedeAdministrarTerritorio`; choque contra
      `calles_tenant_lugar_nombre_idx` es el unico rechazo propio.
- [ ] 4.5 GREEN `renombrarCalle.ts`.
- [ ] 4.6 RED `territorio/application/listarCalles.test.ts`: sin guarda de
      rol (lectura de catalogo para el selector, precedente
      `listarPersonas`).
- [ ] 4.7 GREEN `listarCalles.ts`.
- [ ] 4.8 RED integration: renombrar la Calle 21 no cambia ninguna fila de
      `domicilios` — conteo y `xmin` intactos.
- [ ] 4.9 GREEN.
- [ ] 4.10 `territorio/ui/SelectorDeCalle.tsx` (`<select>` nativo poblado en
      servidor); `ui/actions/{altaDeCalle,renombrarCalle}Action.ts`; alta en
      la pagina de `territorio`.
- [ ] 4.11 `AGENTS.md`: agregar `altaDeCalleAction`/`renombrarCalleAction` a
      la tabla de 3.21.
- [ ] 4.12 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

## Phase 5: Rebanada 5 — Domicilios: direccion compuesta (~495 lineas)

Depende de las Fases 2 y 4. Independiente de las Fases 1, 3 y 6.

- [ ] 5.1 RED `territorio/domain/direccion.test.ts`: `calleId`,
      `entreCalleAId`, `entreCalleBId` distintas entre si cuando las tres
      estan presentes; nullable a proposito para una comisaria rural.
- [ ] 5.2 GREEN `territorio/domain/direccion.ts`.
- [ ] 5.3 `territorio/application/puertos.ts` (modificar): agregar
      `RepositorioDeDomicilios` (`crear`, `porLugarYSubarbol`, `porCalle`).
- [ ] 5.4 RED `territorio/application/altaDeDomicilio.test.ts` (puertos
      mockeados): rechaza sin `puedeEscribir`; `numero` ausente queda
      `null`, nunca la cadena `"S/N"`; transversal repetida
      (`entreCalleAId === calleId`) se rechaza antes de escribir.
- [ ] 5.5 GREEN `altaDeDomicilio.ts`.
- [ ] 5.6 RED `territorio/infrastructure/repositorioDeDomiciliosSql.test.ts`:
      `porLugarYSubarbol` reusa el CTE de 3.12; `porCalle` es un `WHERE
      calleId = $calle` directo, sin CTE.
- [ ] 5.7 GREEN `repositorioDeDomiciliosSql.ts`.
- [ ] 5.8 RED integration: domicilio sin manzana conocida, colgado directo
      de una colonia, se crea correctamente.
- [ ] 5.9 GREEN.
- [ ] 5.10 RED integration: los domicilios de un sector incluyen el colgado
      directo del sector y los de sus manzanas, en una sola consulta.
- [ ] 5.11 GREEN.
- [ ] 5.12 RED integration: los domicilios de la Calle 21 incluyen los de
      todas las manzanas que atraviesa.
- [ ] 5.13 GREEN.
- [ ] 5.14 RED integration: un domicilio sin residentes aparece igual en la
      consulta por zona.
- [ ] 5.15 GREEN.
- [ ] 5.16 `territorio/ui/FormularioDeDomicilio.tsx` (Server Component,
      `<form action>` con `SelectorDeCalle` x3 de la Fase 4);
      `ui/actions/altaDeDomicilioAction.ts`.
- [ ] 5.17 `AGENTS.md`: agregar `altaDeDomicilioAction` a la tabla.
- [ ] 5.18 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

## Phase 6: Rebanada 6 — Residencias: mudanza y colapso de fusion (~490 lineas)

Depende de las Fases 1 y 2. Sin dependencia de codigo con las Fases 3, 4 y 5
(sus pruebas de integracion siembran el domicilio por SQL directo).

- [ ] 6.1 RED `shared/lib/fecha.test.ts`: `hoyEnMerida()` devuelve
      `"YYYY-MM-DD"` en `America/Merida`, no en UTC (bug del design §8:
      medianoche UTC del 3 de marzo es 2 de marzo en Merida). Archivo nuevo
      — `shared/lib/` solo tiene `errores.ts`/`registroDeError.ts` hoy.
- [ ] 6.2 GREEN `shared/lib/fecha.ts`: `hoyEnMerida()` con
      `Intl.DateTimeFormat("en-CA", { timeZone: "America/Merida" })`.
- [ ] 6.3 RED `territorio/domain/residencia.test.ts`: vigencia — `hastaEn IS
      NULL` o `hastaEn >= desdeEn`.
- [ ] 6.4 GREEN `territorio/domain/residencia.ts`.
- [ ] 6.5 `territorio/application/puertos.ts` (modificar):
      `RepositorioDeResidencias` (`cerrarAbierta`, `abrir`, `historialDe`) y
      `LecturaDePersonas` (`terminalDe`, `identidadesDe`) SIN `tx` en la
      firma (design §6 — se llama fuera de `withTenant`).
- [ ] 6.6 `territorio/infrastructure/lectorDePersonasPorPadron.ts`: adaptador
      que llama a `padron.personaPorId`/`padron.identidadesDePersona` (Fase
      1) via el barrel; verificar que `identidadPorPuerto.test.ts` sigue en
      verde con este archivo presente.
- [ ] 6.7 RED `territorio/application/registrarMudanza.test.ts` (puertos
      mockeados): rechaza sin `puedeEscribir`; `terminalDe` -> `null` lanza
      `NoEncontradoError` **antes** de abrir `withTenant`; verifica el orden
      de llamada (protege contra el anidamiento de 1.14).
- [ ] 6.8 GREEN `registrarMudanza.ts`: cerrar+abrir en una transaccion, dos
      trazas (`CERRAR_RESIDENCIA`/`ABRIR_RESIDENCIA`).
- [ ] 6.9 RED integration: mudanza exitosa cierra la anterior y abre la
      nueva en la misma transaccion; una apertura que falla revierte sin
      huella parcial.
- [ ] 6.10 GREEN.
- [ ] 6.11 RED integration: dos mudanzas concurrentes de la misma persona —
      la segunda falla nombrando `residencias_una_abierta_idx`.
- [ ] 6.12 GREEN.
- [ ] 6.13 RED `territorio/application/historialDeResidencias.test.ts`
      (puertos mockeados): `identidadesDe` vacio lanza `NoEncontradoError`;
      orden `desdeEn DESC, creadoEn DESC`.
- [ ] 6.14 GREEN `historialDeResidencias.ts`.
- [ ] 6.15 RED integration: fusion A->B, historial por el id de A devuelve
      las residencias de A y de B colapsadas.
- [ ] 6.16 GREEN.
- [ ] 6.17 RED integration: A con residencia abierta el 1 de marzo y B (su
      fusion) con una abierta el 10 de marzo — la vigente es la del 10 de
      marzo; la de A sigue en el historial, no vigente.
- [ ] 6.18 GREEN (ajustar el `ORDER BY` si el desempate no calza).
- [ ] 6.19 RED integration: revertir la fusion de A devuelve su historial
      sin las residencias de B, sin que ninguna fila de `residencias` haya
      cambiado nunca.
- [ ] 6.20 GREEN (debe pasar sin cambios si 6.16-6.18 estan bien).
- [ ] 6.21 `territorio/application/residentesDe.ts` + test: personas con
      residencia vigente en el subarbol de un lugar (reusa el CTE de 3.12
      combinado con `residencias.personaId` — **con el builder de Drizzle,
      no `sql\`…\``**, mismo motivo que 2.6).
- [ ] 6.22 `territorio/ui/FormularioDeMudanza.tsx` +
      `ui/actions/registrarMudanzaAction.ts`;
      `territorio/ui/HistorialDeResidencias.tsx`.
- [ ] 6.23 `src/app/(panel)/padron/[id]/page.tsx`: composicion de los
      barrels de `padron` y `territorio` (ninguno importa al otro).
- [ ] 6.24 `AGENTS.md`: agregar `registrarMudanzaAction` a la tabla.
- [ ] 6.25 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde;
      cobertura sobre `modules/territorio/{domain,application}` y
      `shared/lib/fecha`.

## Phase 7: Rebanada 7 — Exportacion (~140 lineas)

Depende de la Fase 2 (solo necesita los objetos de tabla). Se secuencia al
final por conveniencia de revision, no por dependencia de codigo con las
Fases 3-6.

- [ ] 7.1 RED `territorio/composicion.test.ts` (clon de
      `padron/composicion.test.ts`, `tx` fabricado a mano, sin Postgres):
      las cuatro `PorcionExportable` devuelven columnas listadas una por
      una, nunca `select()` pelado; `residencias` incluye `personaId` crudo.
- [ ] 7.2 GREEN `porcionesDeTerritorio` en `territorio/composicion.ts`.
- [ ] 7.3 RED verificar que `nombre` de las cuatro porciones no choca con
      `usuarios`, `bitacora`, `personas` en `conjuntosDePlataforma`.
- [ ] 7.4 GREEN (ajustar nombres si hay colision).
- [ ] 7.5 `src/app/exportacion/porciones.ts`: `export const porciones:
      readonly PorcionExportable[] = [porcionDePadron,
      ...porcionesDeTerritorio]`.
- [ ] 7.6 `pnpm check` + `pnpm test` en verde.
