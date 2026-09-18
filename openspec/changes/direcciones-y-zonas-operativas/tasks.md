# Tareas: Direcciones y zonas operativas

## Pronostico de carga de revision

| Campo | Valor |
|---|---|
| Lineas autorales estimadas | 2,100-2,700 en ocho unidades; B2 estima 850-1,050 por el corte de CHECK, tipos y unos 40 archivos de tests |
| Presupuesto fijo | 400 lineas cambiadas por PR |
| Riesgo de 400 lineas | High; cada unidad se mantiene como PR propio y B2 requiere size:exception visible |
| Cadena | PR #1 A1a -> PR #2 A1b -> PR #3 A2 -> PR #4 A3 -> PR #5 B1 -> PR #6 B3d -> PR #7 B2 -> PR #8 B3u |
| Estrategia de entrega | ask-on-risk |
| Estrategia de cadena | feature-branch-chain: tracker de feature; cada PR hijo apunta a la rama del PR anterior |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

A1 usa la costura nombrada por el diseno: A1a contiene puerto, caso de uso,
repositorio, paginacion y tests sin UI; A1b contiene ruta, pantalla, etiqueta
de NodoDeSubarbol y desmontaje de la carga ansiosa en page.tsx. Esto mantiene
cada PR enfocado sin separar una prueba de su contrato. B2 no se parte: CHECK,
tipo y los tests que compilan contra ellos deben cambiar juntos; se marca
size:exception con la estimacion anterior y requiere aprobacion de mantenedor
antes de aplicar.

### Unidades de trabajo sugeridas

| Unidad / PR | Entrega autonoma y limites | Base de la cadena | Test enfocado | Runtime / rollback |
|---|---|---|---|---|
| A1a / PR #1 | Registro plano: contrato, paginacion, caso de uso, SQL y tests; sin UI | tracker de feature | pnpm vitest run --project unit src/modules/territorio/domain/paginacion.test.ts src/modules/territorio/application/registroDeDomicilios.test.ts; sin DB | N/A para runtime de UI; revertir puerto, caso de uso, repositorio y tests de A1a |
| A1b / PR #2 | Ruta /territorio/domicilios, pantalla, filtro GET, etiqueta de nodo y retiro de carga ansiosa en page.tsx | rama de PR #1 | pnpm vitest run --project unit src/modules/territorio/ui/RegistroDeDomicilios.test.tsx; sin DB | pnpm dev + abrir /territorio/domicilios; revertir ruta/pantalla y cambio de carga |
| A2 / PR #3 | Conteos inclusivos del subarbol y calles propias del nodo | rama de PR #2 | pnpm vitest run --project unit src/modules/territorio/ui/conteo.test.ts src/modules/territorio/ui/contenido.test.tsx; sin DB | pnpm dev + abrir panel de asentamiento/colonia; revertir conteo.ts y contenido.ts |
| A3 / PR #4 | Alta unica desacoplada del nodo y vocabulario lugarId/Colonia | rama de PR #3 | pnpm vitest run --project unit src/modules/territorio/application/verificacionDeDomicilio.test.ts; sin DB | pnpm dev + POST nativo de alta; revertir formulario, composicion y ruta |
| B1 / PR #5 | Tablas zonas/calles_de_zonas, migracion 0017, RLS/FK/GRANT, puertos, casos de uso y aislamiento | rama de PR #4 | pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts src/modules/territorio/callesDeZonas.isolation.test.ts; requiere Postgres | pnpm db:local && pnpm db:migrate; migracion inversa DROP TABLE calles_de_zonas, zonas y retirar unique de calles |
| B3d / PR #6 | Script operativo y runbook de migracion de datos, bitacora, salida, conteo e idempotencia | rama de PR #5 | pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts; requiere Postgres y base scratch | Ejecutar solo con ventana operativa autorizada; restaurar domicilios desde bitacora e insertar lugares desde salida |
| B2 / PR #7 | Corte de sector/manzana: CHECK, tipo, unos 40 archivos, deltas y AGENTS.md; no UI de zonas | rama de PR #6 | pnpm test; suite completa, sin rtk; cobertura con pnpm test -- --coverage | size:exception 850-1,050 lineas; migracion inversa del CHECK y revertir codigo/deltas |
| B3u / PR #8 | Rutas, pantallas, cinco acciones y cinco filas de AGENTS.md para zonas | rama de PR #7 | pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.ui.integration.test.ts; requiere Postgres | pnpm db:local + escenario Playwright de /territorio/zonas; revertir rutas, UI y acciones |

En cada PR de la cadena debe aparecer el diagrama de dependencia con el PR
actual marcado con el simbolo de ubicacion; se conserva el limite de 400 lineas
salvo el size:exception explicito de B2. Cada unidad conserva sus tests y
docs/runbook junto al cambio que prueban, y su rollback no revierte unidades
anteriores.

## Limites vinculantes de cada unidad

| Unidad | Posee | No posee (tambien es vinculante) |
|---|---|---|
| A1a | Puerto registro, registroDeDomicilios, domain/paginacion.ts, SQL de registro y tests de contrato | UI, rutas, conteos, alta, renombres de vocabulario |
| A1b | Ruta/screen /territorio/domicilios, filtro GET, etiqueta de NodoDeSubarbol, retiro de listarDomicilios en page.tsx | Caso de uso nuevo, conteos, alta, zonas |
| A2 | descendientesDe y cuentasDeLugar en UI | Consultas SQL nuevas, cambios de esquema, alta |
| A3 | Forma unica, zonaId a lugarId, textos Colonia/NivelDelFormulario | ZonaIncoherenteError/UbicacionIncoherenteError del corte, AGENTS.md, zonas operativas |
| B1 | Esquema, migracion, RLS/politica/GRANT, unique compuesto de calles, puertos, casos de uso, CalleEnZonaError y tests de aislamiento | UI, Server Actions, AGENTS.md, migracion de datos |
| B3d | scripts/migrar-sectores-a-zonas.sql, runbook, salida, bitacora y pruebas scratch | TypeScript de dominio/aplicacion, corte del catalogo, UI |
| B2 | TIPOS_DE_LUGAR, CHECK, codigo/tests afectados, deltas de spec y renombre en AGENTS.md | Tablas/puertos de zonas, migracion de datos, UI de zonas y acciones |
| B3u | Tres rutas hermanas, pantallas de zonas, cinco acciones y sus filas de AGENTS.md | Esquema/migracion de B1 y script de B3d |

## Fase 1: A1a — contrato y registro plano sin UI

- [x] A1a-RED-01 (A1a). Para el requisito exacto “Listado plano de domicilios con busqueda y paginado (Rebanada A1)”, escribir primero src/modules/territorio/domain/paginacion.test.ts con los bordes limite, limite+1 y cero para resolverPagina; escribir src/modules/territorio/application/registroDeDomicilios.test.ts con cada filtro por separado y los tres juntos, y que falle con el puerto/caso de uso ausentes. Test enfocado: pnpm vitest run --project unit src/modules/territorio/domain/paginacion.test.ts src/modules/territorio/application/registroDeDomicilios.test.ts (sin DB). Rollback: eliminar solo estos tests si el contrato de A1a se descarta.
- [x] A1a-GREEN-02 (A1a). Requisito: Listado plano de domicilios con busqueda y paginado (Rebanada A1). Implementar FiltrosDeRegistro, OpcionesDeRegistro, DomicilioDelRegistro y registro en src/modules/territorio/application/puertosDeDomicilios.ts, src/modules/territorio/domain/paginacion.ts y src/modules/territorio/application/registroDeDomicilios.ts; pedir limite + 1, aplicar resolverPagina, devolver { domicilios, hayMas }, validar raizId, calle con ILIKE y numero con igualdad recortada, sin COUNT(*). Test enfocado: pnpm vitest run --project unit src/modules/territorio/domain/paginacion.test.ts src/modules/territorio/application/registroDeDomicilios.test.ts (sin DB). Rollback: revertir esos tres contratos/caso de uso sin tocar UI ni esquema.
- [x] A1a-GREEN-03 (A1a). Requisito: Listado plano de domicilios con busqueda y paginado (Rebanada A1). Agregar el adaptador SQL de registro en src/modules/territorio/infrastructure/repositorioDeDomiciliosSql.ts y su wiring en src/modules/territorio/infrastructure/index.ts, reutilizando domicilios_lugar_idx/domicilios_calle_idx, orden determinista por lugar, calle, numero, subarbol para raizId y sin cargar la totalidad del municipio. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/registroDeDomicilios.integration.test.ts (requiere Postgres). Rollback: retirar únicamente el método SQL/wiring de A1a; conservar el contrato si A1b aún depende de él.
- [x] A1a-REFACTOR-04 (A1a). Requisito: Listado plano de domicilios con busqueda y paginado (Rebanada A1). Ejecutar limpieza de tipos y dependencias de A1a, verificar que domain no importe shared/Drizzle/Next y que no aparezca any, y documentar que listar(tx) sigue solo para el select de FormularioDeMudanza. Test enfocado: pnpm test y pnpm check (sin rtk; integración requiere Postgres). Rollback: revertir solo refactors, no contrato ni pruebas RED/GREEN.

### Evidencia TDD y de unidad: A1a

| Tarea | RED | GREEN | REFACTOR |
|---|---|---|---|
| A1a-RED-01 | `paginacion.test.ts` y `registroDeDomicilios.test.ts` fallaron por modulos ausentes | 7/7 unitarios en verde tras el contrato | Sin cambios de comportamiento |
| A1a-GREEN-02 | Correccion RED: 4 pruebas fallaron porque el caso abria tenant; raiz invalida tambien fallo antes de validar | 8/8 unitarios en verde; recibe `tx`, pide `limite + 1` y recorta | Tipos cerrados y helper puro sin imports |
| A1a-GREEN-03 | El test de integracion fallo dos veces de verdad: `calles_tenant_lugar_nombre_idx` por fixtures que repetian la calle, y `sql.empty` sin invocar, que rompia toda consulta sin filtro de calle ni numero | 5/5 de integracion en verde contra Postgres | Fixtures movidas a `lugarDePrueba.ts`; una sola cabecera por `lugares_una_cabecera` |
| A1a-REFACTOR-04 | `pnpm reglas` fallo: `composicion.ts` quedo en 213 lineas | `pnpm check` y `pnpm test` en verde (301 archivos, 1459 tests) | `composicionDeDomicilios.ts` separa las direcciones; `composicion.ts` la reexporta y baja a 178 lineas |

| Evidencia de unidad | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit src/modules/territorio/domain/paginacion.test.ts src/modules/territorio/application/registroDeDomicilios.test.ts` — 2 archivos, 8 tests en verde |
| Harness de runtime | `pnpm db:local` mas `pnpm vitest run --project integration src/modules/territorio/registroDeDomicilios.integration.test.ts` — 5 tests en verde |
| Suite completa | `pnpm test` — 301 archivos, 1459 tests en verde; `pnpm check` sin hallazgos |
| Presupuesto | 541 lineas cambiadas contra el limite de 400: pide `size:exception` de mantenedor |
| Frontera de rollback | Revertir puerto, helper, caso de uso, adaptador SQL, wiring y tests de A1a; no hay migracion, UI ni rutas |

## Fase 2: A1b — pantalla y ruta del registro

- [x] A1b-RED-01 (A1b). Para el requisito exacto “Listado plano de domicilios con busqueda y paginado (Rebanada A1)”, escribir src/modules/territorio/ui/RegistroDeDomicilios.test.tsx y el test de ruta correspondiente para filtros q, raiz, numero, limite: debe fallar si la pantalla no existe, si no conserva hayMas o si acepta parametros no validados. Test enfocado: pnpm vitest run --project unit src/modules/territorio/ui/RegistroDeDomicilios.test.tsx (sin DB). Rollback: retirar solo pruebas de UI de A1b.
- [x] A1b-GREEN-02 (A1b). Requisito: Listado plano de domicilios con busqueda y paginado (Rebanada A1). Crear src/app/(panel)/territorio/domicilios/page.tsx y la pantalla necesaria bajo src/modules/territorio/ui/, con filtros GET validados con Zod en el borde, listado paginado y enlace ?limite= para Ver mas; cargar listarRaices solo para el filtro y no propagar ayuntamientoId del cliente. Test enfocado: pnpm vitest run --project unit src/modules/territorio/ui/RegistroDeDomicilios.test.tsx (sin DB). Rollback: revertir ruta y pantalla sin tocar A1a ni A2.
- [x] A1b-GREEN-03 (A1b). Requisito: Listado plano de domicilios con busqueda y paginado (Rebanada A1). Ajustar la variante domicilio de NodoDeSubarbol para llevar id, lugarId, calle y numero, y retirar de src/app/(panel)/territorio/page.tsx la llamada ansiosa a listarDomicilios(contexto) y cualquier prop que solo alimentaba esa carga; la pantalla principal debe seguir cargando arbol/calles, no el registro completo. Test enfocado: pnpm vitest run --project unit src/modules/territorio/ui/RegistroDeDomicilios.test.tsx src/modules/territorio/ui/contenido.test.tsx (sin DB). Rollback: restaurar únicamente carga de page.tsx y etiqueta de nodo si la ruta se revierte.
- [x] A1b-REFACTOR-04 (A1b). Requisito: Listado plano de domicilios con busqueda y paginado (Rebanada A1). Añadir migaja hasta /territorio, mantener Server Components y justificar cualquier hoja sin use client nuevo; leer el diff completo de A1b. Test enfocado: pnpm check. Rollback: revertir solo navegación y limpieza visual.

### Evidencia TDD y de unidad: A1b

| Tarea | RED | GREEN | REFACTOR |
|---|---|---|---|
| A1b-RED-01 | `RegistroDeDomicilios.test.tsx`, `domicilios/parametros.test.ts` y `domicilios/page.test.tsx` fallaron por pantalla y ruta ausentes | 11 + 7 + 7 unitarios en verde | Sin cambios de comportamiento |
| A1b-GREEN-02 | Correccion RED: `el segundo Ver mas parte del limite vigente` fallo con `href=".../?limite=100"` estando ya en 100 -la pantalla no recibia `limite` y el link recalculaba desde el default, asi que la tercera pagina era inalcanzable-. Y `un asentamiento sin domicilios es vacio por filtro` fallo con "Todavia no hay domicilios registrados": `estadoDeLista` recibia `calle ?? numero` y omitia `raizId` | `limite` viaja de la ruta a la pantalla; `filtroVisible` agrega el nombre del asentamiento | `limite` documentado como el vigente y no el proximo |
| A1b-GREEN-03 | Correccion RED: `la baja logica esconde la fila de las cinco lecturas` fallo porque el subarbol nunca filtro `dom.baja_en IS NULL` -no hacia falta mientras sus filas se cruzaban contra `listar`, que si lo filtra; leyendo la direccion del nodo, un domicilio dado de baja volvia a la pestana, a los contadores y a los hermanos- | `WHERE dom.baja_en IS NULL` en la rama de domicilios del `UNION ALL`; 3/3 de `subarbolDeDomicilios.integration.test.ts` en verde | `hermanosDeDireccion` y `domiciliosDirectosDe` leen del nodo; `cuentasDeLugar` reusa el filtro |
| A1b-REFACTOR-04 | `pnpm reglas` habria fallado: `puertos.ts` quedaba en 213 lineas con el tipo ampliado | `pnpm check` y `pnpm test` en verde (307 archivos, 1524 tests) | `nodoDeSubarbol.ts` separa el nodo del arbol; `puertos.ts` lo reexporta y baja a 177 lineas |

| Evidencia de unidad | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit src/modules/territorio/ui/RegistroDeDomicilios.test.tsx` — 11 tests en verde |
| Harness de runtime | `pnpm db:local` mas `pnpm vitest run --project integration src/modules/territorio/subarbolDeDomicilios.integration.test.ts src/modules/territorio/domiciliosBaja.integration.test.ts` — 6 tests en verde |
| Suite completa | `pnpm test` — 307 archivos, 1524 tests en verde; `pnpm check` sin hallazgos |
| Presupuesto | 1,387 lineas cambiadas contra el limite de 400, ~778 de ellas tests: pide `size:exception` de mantenedor |
| Invariante verificado | `hermanos` acotado al subarbol se sostiene en `verificacionDeDomicilio.ts` (`exigirCallesDelAsentamiento`) mas `listarRaices` = `padreId IS NULL`: el asentamiento de una calle es la raiz abierta o un descendiente suyo, nunca un ancestro. Fijado por `subarbolDeDomicilios.integration.test.ts` |
| Revision nativa | `review-00f7319e493f3149`, lente `review-reliability`, aprobada y quemada. Dos WARNING corregidos con test en RED primero: "Ver mas" pasaba `LIMITE_MAXIMO` y el `.max()` del esquema lo descartaba con `.catch(undefined)`, reiniciando a la primera pagina en silencio; y `filtroVisible` se rendia cuando `?raiz=` no estaba en `listarRaices` -una colonia, otro municipio, un id inexistente-, devolviendo el vacio inicial por otra puerta |
| Frontera de rollback | Revertir ruta, pantalla, filtros, hrefs, el tipo del nodo, el SQL del subarbol y sus tests; no hay migracion ni Server Action |

## Fase 3: A2 — conteos inclusivos y calles propias

- [x] A2-RED-01 (A2). Para el requisito exacto “Consulta de subarbol incluye lo colgado directo de cada nivel (Rebanada 3)”, escribir primero src/modules/territorio/ui/conteo.test.ts y src/modules/territorio/ui/contenido.test.tsx: una colonia cuenta domicilios solo bajo hijos, un nodo sin catalogo propio cuenta cero calles, y un ciclo de padreId termina sin colgarse. Test enfocado: pnpm vitest run --project unit src/modules/territorio/ui/conteo.test.ts src/modules/territorio/ui/contenido.test.tsx (sin DB). Rollback: retirar únicamente pruebas RED de conteos.
- [x] A2-GREEN-02 (A2). Requisito: Consulta de subarbol incluye lo colgado directo de cada nivel (Rebanada 3). Generalizar descendientesDe en src/modules/territorio/ui/conteo.ts con conjunto de visitados y hacer que cuentasDeLugar en src/modules/territorio/ui/contenido.ts reciba el subarbol de la raiz, cuente domicilios inclusivamente y cuente calles solo con lugarId === nodo.id; dejar lugares como hijos directos y no agregar SQL. Test enfocado: pnpm vitest run --project unit src/modules/territorio/ui/conteo.test.ts src/modules/territorio/ui/contenido.test.tsx (sin DB). Rollback: revertir solo conteo.ts/contenido.ts; no tocar A1.
- [x] A2-REFACTOR-03 (A2). Requisito: Consulta de subarbol incluye lo colgado directo de cada nivel (Rebanada 3). Confirmar que la pestana de un nodo sin catalogo propio puede mostrar catalogo heredado de solo lectura mientras su contador de calles queda en cero, y que el diff no introduce consultas, imports de infraestructura ni duplicación de reglas. Test enfocado: pnpm test y pnpm check. Rollback: revertir refactor de UI sin cambiar conteos.

### Evidencia TDD y de unidad: A2

| Tarea | RED | GREEN | REFACTOR |
|---|---|---|---|
| A2-RED-01 | 8 pruebas fallaron: `descendientesDe is not a function` x4, y en `cuentasDeLugar` `expected +0 to be 1` -la colonia con todas sus direcciones en las manzanas contaba cero-, `expected 1 to be +0` y `expected 2 to be 1` -el catalogo entero del asentamiento contado en cada nodo- | 156/156 unitarios de `territorio/ui` en verde | Las pruebas de `masAdentroDe` pasaron sin cambios: la caminata se reuso, no se reescribio |
| A2-GREEN-02 | El plan pedia "generalizar `descendientesDe`", que no existia: existia `masAdentroDe`, que ya llevaba el conjunto de visitados y su prueba de ciclo | `descendientesDe` devuelve los ids y `masAdentroDe` se expresa sobre el; `cuentasDeLugar` cuenta domicilios por subarbol y calles por `lugarId === nodo.id` | `domiciliosDirectosDe` conserva su significado -que filas lista la pestana-, que es otra pregunta que el contador |
| A2-REFACTOR-03 | Correccion RED: dos `aria-label` de `vistaDePanel.ts` quedaron falsos con el conteo nuevo -"Calles (catalogo del asentamiento)" cuando ya no es el catalogo, y "Domicilios (de este lugar)" cuando ya cuenta el subarbol-. Una etiqueta que sobrevive al cambio del numero que describe le miente a quien no ve la pantalla | "Calles (de este lugar)" y "Domicilios (de este lugar y lo que contiene)"; 8/8 de `vistaDePanel.test.ts` en verde | El comentario de `cuentasDeLugar` documentaba la decision contraria y se reescribio con la separacion nueva |

| Evidencia de unidad | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit src/modules/territorio/ui/conteo.test.ts src/modules/territorio/ui/contenido.test.ts` — en verde |
| Suite completa | `pnpm test` — 307 archivos, 1532 tests en verde con Postgres; `pnpm check` sin hallazgos |
| Presupuesto | ~190 lineas cambiadas contra el limite de 400: sin excepcion |
| Revision nativa | `review-19668e85448cf618`, lente `review-reliability`, aprobada y quemada. Un SUGGESTION atendido: faltaba el caso de ciclo sobre `cuentasDeLugar` misma -`descendientesDe` lo tenia, pero la primitiva probada y la composicion probada no son lo mismo-. Se verifico que el test tiene dientes corriendo la caminata sin la guarda de visitados: pasa las 1000 vueltas sin terminar. El segundo SUGGESTION no pide cambio: observa que la tabla de evidencia afirma el resultado de `pnpm test` dentro del mismo diff que se revisa, o sea que no es artefacto inspeccionable desde la revision |
| Particion por metrica | `contenido.test.ts` llego a 230 lineas con el caso de ciclo. Se partio por tema -contar contra seleccionar filas-: `cuentasDeLugar.test.ts` (97), `contenido.test.ts` (89) y `contenidoDePrueba.ts` (79) con el arbol compartido |
| Frontera de rollback | Revertir `conteo.ts`, `contenido.ts`, `vistaDePanel.ts` y sus tests; no hay SQL, migracion, ruta ni accion |

## Fase 4: A3 — alta unica desacoplada del nodo

- [ ] A3-RED-01 (A3). Para el requisito exacto “Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2)”, ampliar primero src/modules/territorio/application/verificacionDeDomicilio.test.ts: alta sin lugarId deriva asentamiento de calle principal; un lugarId de otra cadena produce UbicacionIncoherenteError; la prueba debe fallar antes de cambiar forma. Test enfocado: pnpm vitest run --project unit src/modules/territorio/application/verificacionDeDomicilio.test.ts (sin DB). Rollback: retirar solo escenarios RED de A3.
- [ ] A3-GREEN-02 (A3). Requisito: Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2). Servir una sola forma desde registro plano usando listarCallesDelMunicipio, eliminar hidden raiz/nodo de src/modules/territorio/ui/FormularioDeDomicilio.tsx y conservar derivación existente datos.lugarId ?? callePrincipal.lugarId; altaDeDomicilioAction mantiene POST nativo y redirect redactado. Test enfocado: pnpm vitest run --project unit src/modules/territorio/application/verificacionDeDomicilio.test.ts (sin DB). Rollback: revertir forma y composición de entrada, sin tocar verificacionDeDomicilio.ts fuera de lo probado.
- [ ] A3-GREEN-03 (A3). Requisito: Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2). Renombrar exclusivamente vocabulario de formulario: name zonaId a name lugarId, Zona (opcional) a Colonia (opcional), ZonaDelFormulario a NivelDelFormulario, opcionesDeZona a opcionesDeNivel; no mover ZonaIncoherenteError/UbicacionIncoherenteError ni AGENTS.md (son B2). Test enfocado: pnpm vitest run --project unit src/modules/territorio/ui/FormularioDeDomicilio.test.tsx (sin DB). Rollback: revertir solo renombres de UI.
- [ ] A3-REFACTOR-04 (A3). Requisito: Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2). Verificar que no queda punto de alta anclado al nodo en TabDeDomicilios.tsx, que la acción sigue fuera de useActionState y que la pantalla funciona sin JavaScript. Test enfocado: pnpm test y pnpm check. Rollback: restaurar enlace/formulario anterior sin revertir A1/A2.

## Fase 5: B1 — esquema y dominio de zonas

Frontera de commit: las tablas, RLS/GRANT y los dos tests de aislamiento
entran en el mismo commit, aunque las pruebas se escriban y verifiquen en
tareas distintas. No se crea ninguna fila de producción sin ambas pruebas.

- [ ] B1-RED-01 (B1). Para el requisito exacto “Una zona es un conjunto de calles de un unico asentamiento (Rebanada B1)”, escribir src/modules/territorio/zonas.isolation.test.ts y tests de caso de uso para zona con dos calles del asentamiento y rechazo de calle de otro asentamiento; la prueba de aislamiento comprueba cero filas cruzadas. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts (requiere Postgres). Rollback: retirar solo fixtures/tests RED sin tocar esquema.
- [ ] B1-RED-02 (B1). Para el requisito exacto “Aislamiento de zonas y de su pertenencia por ayuntamiento (Rebanada B1)”, escribir src/modules/territorio/callesDeZonas.isolation.test.ts antes de crear tablas: tenant cruzado en cero filas, INSERT con calle de otro asentamiento rechazado por FK compuesto y UPDATE de calles.lugar_id con pertenencia viva rechazado. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/callesDeZonas.isolation.test.ts (requiere Postgres). Rollback: retirar esta prueba y fixtures.
- [ ] B1-GREEN-03 (B1). Requisito: Aislamiento de zonas y de su pertenencia por ayuntamiento (Rebanada B1). El unique por asentamiento es un supuesto propuesto pendiente de confirmacion. Crear src/modules/territorio/infrastructure/esquemaDeZonas.ts y src/modules/territorio/infrastructure/esquemaDeCallesDeZonas.ts, y drizzle/0017_zonas_operativas.sql con ayuntamiento_id, ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY, politica de tenant, GRANT al rol de aplicacion, claves compuestas contra (id, ayuntamiento_id), zonas y calles_de_zonas según D7, más unique compuesto (id, lugar_id, ayuntamiento_id)/unique por asentamiento. Agregar el unique compuesto requerido a calles; no usar rol owner ni BYPASSRLS. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts src/modules/territorio/callesDeZonas.isolation.test.ts (requiere Postgres). Rollback: migracion inversa, retirar esquemas y unique de calles.
- [ ] B1-GREEN-04 (B1). Requisito: Aislamiento de zonas y de su pertenencia por ayuntamiento (Rebanada B1). Hacer pasar tests de aislamiento en el mismo commit verificando GRANT SELECT, INSERT, UPDATE para zonas, GRANT SELECT, INSERT, DELETE para calles_de_zonas, y que no hay acceso sin withTenant en producción. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts src/modules/territorio/callesDeZonas.isolation.test.ts (requiere Postgres, sin rtk). Rollback: revertir commit completo de esquema/RLS/tests como unidad.
- [ ] B1-RED-05 (B1). Para el requisito exacto “La pertenencia de calle a zona es muchos a muchos y no exige particion (Rebanada B1)”, escribir tests para una calle en dos zonas y una zona vacia; para “Los domicilios de una zona se derivan de sus calles, nunca se declaran (Rebanada B1)”, escribir src/modules/territorio/domiciliosDeZona.integration.test.ts que incluya calle principal y excluya entreCalleA/B. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/domiciliosDeZona.integration.test.ts (requiere Postgres). Rollback: retirar solo tests de puertos/casos.
- [ ] B1-GREEN-06 (B1). Requisitos: La pertenencia de calle a zona es muchos a muchos y no exige particion (Rebanada B1); Los domicilios de una zona se derivan de sus calles, nunca se declaran (Rebanada B1); Administrar zonas exige el mismo permiso que administrar el territorio (Rebanada B1). Implementar puertos y adaptadores en src/modules/territorio/application/puertosDeZonas.ts, src/modules/territorio/application/zonas.ts, src/modules/territorio/application/domiciliosDeZona.ts, src/modules/territorio/infrastructure/repositorioDeZonasSql.ts y src/modules/territorio/infrastructure/repositorioDeCallesDeZonasSql.ts; exigir puedeAdministrarTerritorio, bajaEn IS NULL, CalleEnZonaError, bitacora de ids en misma transaccion y derivar domicilios solo por domicilios.calle_id. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/domiciliosDeZona.integration.test.ts (requiere Postgres). Rollback: retirar puertos/casos/adaptadores de zonas, conservando tablas solo hasta rollback de esquema.
- [ ] B1-REFACTOR-07 (B1). Requisito: Una zona es un conjunto de calles de un unico asentamiento (Rebanada B1). Revisar dependencias por capas, tipar IDs, verificar FORCE RLS y leer el diff completo de migracion, esquemas, casos, bitacora y tests; no agregar UI, acciones ni AGENTS.md. Test enfocado: pnpm test y pnpm check; aislamiento adicional con pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts src/modules/territorio/callesDeZonas.isolation.test.ts (sin rtk). Rollback: revertir solo limpieza, sin deshacer frontera de commit.

## Fase 6: B3d — migracion operativa de datos

Precondicion bloqueante (no es una tarea): antes de ejecutar el script debe
existir una ventana operativa aprobada para cada municipio afectado. Si falta,
B3d se detiene y se solicita esa coordinacion; ninguna tarea, valor por defecto
o automatizacion puede inferirla.

- [ ] B3d-RED-01 (B3d). Para el requisito exacto “Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3)”, preparar base scratch con sectores, manzanas y domicilios en src/modules/territorio/migrarSectoresAZonas.integration.test.ts; provocar UPDATE bloqueado por RLS sin tenant y comprobar cero filas sin error, y exigir que el test falle si el script no cuenta filas/aborta. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts (requiere Postgres; psql nativo, sin rtk). Rollback: destruir solo base scratch/fixtures.
- [ ] B3d-GREEN-02 (B3d). Requisito: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3). Crear scripts/migrar-sectores-a-zonas.sql con rol de menor privilegio, sin secretos, set_config('app.tenant', id, true) dentro de transaccion, temp table de candidatos, bitacora MIGRACION_DOMICILIO antes de UPDATE domicilios, GET DIAGNOSTICS y RAISE EXCEPTION si filas afectadas no coinciden, preservando lugarId anterior en origen. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts (requiere Postgres; psql nativo, sin rtk). Rollback: no ejecutar parcialmente; una excepcion revierte transaccion entera.
- [ ] B3d-GREEN-03 (B3d). Requisito: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3). Completar script con una zona por sector (incluidas zonas vacias como supuesto explicito), pertenencias de calles principales, rechazo contado/listado de calles de otro asentamiento por FK, DELETE de filas sector/manzana (nunca baja_en), bitacora de baja con padre y salida de domicilios/lugares/zonas/calles rechazadas. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts (requiere Postgres). Rollback: restaurar domicilios desde bitacora.origen y filas de lugares desde salida guardada.
- [ ] B3d-RED-04 (B3d). Requisito: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3). Añadir escenarios de rollback e idempotencia: una segunda corrida encuentra cero candidatos; rollback restaura cada lugarId leyendo solo bitacora y reconstituye filas desde salida. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts (requiere Postgres; psql nativo, sin rtk). Rollback: revertir únicamente escenarios de prueba.
- [ ] B3d-GREEN-05 (B3d). Requisito: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3). Escribir runbook scripts/README-migrar-sectores-a-zonas.md con precondicion de ventana operativa, rol/comandos, captura obligatoria de salida, comprobacion de conteos, procedimiento de rollback y prohibicion de credenciales embebidas. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts (requiere Postgres); runbook por lectura estructural, sin runtime adicional. Rollback: retirar runbook y conservar script para revisión explícita.
- [ ] B3d-REFACTOR-06 (B3d). Requisito: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3). Ejecutar corrida controlada solo después de la precondicion, guardar salida, revisar pnpm reglas y confirmar segunda corrida idempotente; no alterar TypeScript ni CHECK. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts; sin rtk. Rollback: usar procedimiento del runbook, no DELETE manual.

## Fase 7: B2 — corte de tipos y contratos (size:exception)

Frontera inseparable: estimacion visible de 850-1,050 lineas cambiadas, por
encima de 400. Se autoriza solo como size:exception aprobado por mantenedor; no
se finge una costura entre CHECK, union de TypeScript y los aproximadamente 40
archivos/tests que deben compilar juntos. B3d debe haber terminado antes de
aplicar este cambio.

- [ ] B2-RED-01 (B2). Para el requisito exacto “Orden estricto y total de tipos, con dos tipos en el rango superior (Rebanada 2)”, actualizar primero tests de dominio/integración para cabecera/comisaria como raices, rechazo de comisaria bajo cabecera, colonia sin hijos y ciclo rechazado; conservar RED antes de editar TIPOS_DE_LUGAR. Test enfocado: pnpm test (suite completa, sin rtk; integración requiere pnpm db:local). Rollback: revertir tests B2 sin tocar B3d.
- [ ] B2-RED-02 (B2). Para “Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2)” y “Direccion compuesta como texto imprimible”, actualizar tests de src/modules/territorio/domain/direccion.test.ts, alta/correccion y fixtures que aún usan sector/manzana; deben fallar por contrato vigente antes de cambiarlo. Test enfocado: pnpm test. Rollback: revertir únicamente fixtures/tests del contrato de domicilios.
- [ ] B2-GREEN-03 (B2). Requisito: Orden estricto y total de tipos, con dos tipos en el rango superior (Rebanada 2). Cambiar src/modules/territorio/domain/tipoDeLugar.ts a TIPOS_DE_LUGAR = [cabecera, comisaria, colonia], derivar RANGO vigente, regenerar drizzle/0018_corte_tipos_lugar.sql con CHECK tipo IN (cabecera, comisaria, colonia) y actualizar los aproximadamente 40 archivos de territorio/tests afectados; DELETE de B3d debe haber eliminado filas incompatibles antes de aplicar CHECK. Test enfocado: pnpm test y pnpm check. Rollback: migracion inversa que restituya ambos tipos al CHECK y revertir commit inseparable.
- [ ] B2-GREEN-04 (B2). Requisitos: Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2); Direccion compuesta como texto imprimible. Actualizar cadenaHastaAsentamiento, direccion.ts, fixtures y validaciones para que lugarId acepte solo asentamiento/colonia; renombrar ZonaIncoherenteError a UbicacionIncoherenteError donde corresponda, y editar deltas de specs/jerarquia-territorial/spec.md y specs/domicilios/spec.md sin cambiar decisiones aprobadas. Test enfocado: pnpm test. Rollback: revertir codigo y deltas junto con B2-GREEN-03.
- [ ] B2-GREEN-05 (B2). Requisito: Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2). Actualizar en AGENTS.md la referencia al error renombrado y conservar reglas de Server Actions sin agregar todavía las cinco filas de zonas (son B3u); verificar que no se enumeren salidas nuevas ni se contradiga el límite de unidades. Test enfocado: pnpm reglas && pnpm check. Rollback: revertir cambio de nomenclatura de AGENTS.md junto con B2 si el mantenedor rechaza la excepción.
- [ ] B2-REFACTOR-06 (B2). Requisitos: Orden estricto y total de tipos, con dos tipos en el rango superior (Rebanada 2); Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2). Ejecutar suite completa con cobertura y confirmar pisos CI: 80% statements en shared/** y modules/**/{domain,application}, 75% branches, sin rtk en tests/psql; leer el diff completo antes de aceptar size:exception. Test enfocado: pnpm db:local && pnpm test:integration && pnpm check; cobertura con vitest run --coverage. Rollback: revertir commit completo B2 y ejecutar migracion inversa.

## Fase 8: B3u — UI y acciones de zonas

- [ ] B3u-RED-01 (B3u). Para el requisito exacto “Aislamiento de zonas y de su pertenencia por ayuntamiento (Rebanada B1)”, escribir primero test de integración de ruta src/modules/territorio/zonas.ui.integration.test.ts: parametros ?zona/?raiz invalidos o de otro tenant deben responder 404, nunca 403 ni lista vacia; la pantalla inexistente tambien debe fallar. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.ui.integration.test.ts (requiere Postgres). Rollback: retirar solo test RED y fixtures UI.
- [ ] B3u-RED-02 (B3u). Para el requisito exacto “Administrar zonas exige el mismo permiso que administrar el territorio (Rebanada B1)”, escribir tests de Server Actions para OPERADOR rechazado y ADMIN_MUNICIPAL autorizado con bitacora solo de ids, cubriendo alta/renombrar/baja/agregar/quitar. Test enfocado: pnpm vitest run --project unit src/modules/territorio/application/accionesDeZonas.test.ts (sin DB; integración RLS en B1). Rollback: retirar únicamente pruebas de acciones.
- [ ] B3u-GREEN-03 (B3u). Requisito: Aislamiento de zonas y de su pertenencia por ayuntamiento (Rebanada B1). Crear rutas hermanas src/app/(panel)/territorio/zonas/page.tsx y composición de detalle ?zona=, con Pestanas, migaja a /territorio, Server Components y cargas separadas listarZonas, callesDeZona, domiciliosDeZona; validar Zod en borde y responder 404 para recurso ajeno. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.ui.integration.test.ts (requiere Postgres). Rollback: revertir ruta/pantallas sin tocar B1.
- [ ] B3u-GREEN-04 (B3u). Requisito: Administrar zonas exige el mismo permiso que administrar el territorio (Rebanada B1). Implementar acciones nativas altaDeZonaAction, renombrarZonaAction, darDeBajaZonaAction, agregarCalleAZonaAction y quitarCalleDeZonaAction, sin ayuntamientoId de cliente, con mensajes de operador en español y lista blanca de NoAutorizadoError, NoEncontradoError, NombreDeZonaDuplicadoError y CalleFueraDelAsentamientoError; agregar sus cinco filas a AGENTS.md. Test enfocado: pnpm vitest run --project unit src/modules/territorio/application/accionesDeZonas.test.ts (sin DB). Rollback: revertir acciones y filas de reglas como unidad.
- [ ] B3u-GREEN-05 (B3u). Requisitos: La pertenencia de calle a zona es muchos a muchos y no exige particion (Rebanada B1); Los domicilios de una zona se derivan de sus calles, nunca se declaran (Rebanada B1). Renderizar creación, renombre, baja, pertenencias M:N y zona vacía, mostrando domicilios derivados solo por calle principal; no pedir zona al alta/correccion de domicilio. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.ui.integration.test.ts (requiere Postgres). Rollback: retirar componentes de zonas y enlaces de Pestanas.
- [ ] B3u-REFACTOR-06 (B3u). Requisitos: Aislamiento de zonas y de su pertenencia por ayuntamiento (Rebanada B1); Administrar zonas exige el mismo permiso que administrar el territorio (Rebanada B1). Ejecutar escenario real de /territorio/zonas, comprobar navegación de tres rutas, 404 cross-tenant y formularios POST sin JavaScript; leer completo el diff y confirmar que cargas no vuelven a ser ansiosas. Test enfocado: pnpm db:local && pnpm test:e2e --grep "zonas operativas" y pnpm check. Rollback: revertir B3u completo sin revertir B1/B3d/B2.

## Supuestos y bloqueadores que no se convierten en tareas

- Supuesto propuesto (pendiente de confirmacion): nombre de zona unico por
  asentamiento, mediante uniqueIndex (ayuntamiento_id, lugar_id, nombre)
  WHERE baja_en IS NULL, no unico en todo el municipio.
- Supuesto propuesto (pendiente de confirmacion): un sector sin calles usadas
  por domicilios se convierte igual en una zona vacia y se reporta en la salida
  para curacion municipal.
- Precondicion bloqueante, no tarea: B3d requiere una ventana operativa aprobada
  por municipio; sin ella no se corre ni se marca B3d.
- Coordinacion: B1 espera que mapa-operativo-territorial cierre U3 o asiente
  migracion de eventos_de_calles, para no crear linajes hermanos en
  drizzle/meta/_journal.json.

## Cierre y verificacion transversal

Despues de B3u, correr sin compresion pnpm test, pnpm db:local && pnpm
test:integration, pnpm test:e2e, pnpm check y cobertura. Confirmar pisos de CI (80% statements
para shared/** y modules/**/{domain,application}, 75% branches), que cada tabla
nueva mantiene ayuntamiento_id + ENABLE/FORCE RLS + politica + GRANT +
aislamiento, que no hay BYPASSRLS, y que el diff completo fue leido.

## Orden de implementacion

A1a -> A1b -> A2 -> A3 -> B1 -> B3d -> B2 -> B3u. A1 se divide solo por la
costura del diseno para que el contrato de lectura sea revisable antes de la
pantalla. B3d va antes de B2 porque PostgreSQL valida el CHECK contra filas
existentes y el DELETE de sector/manzana evita dejar filas incompatibles; el
rollback depende de bitacora y salida. B3u queda al final porque consume el
esquema, contratos y tipos ya cortados.
