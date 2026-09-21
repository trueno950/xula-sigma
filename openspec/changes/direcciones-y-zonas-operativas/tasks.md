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
| Test enfocado | `pnpm vitest run --project unit src/modules/territorio/ui/conteo.test.ts src/modules/territorio/ui/contenido.test.ts src/modules/territorio/ui/cuentasDeLugar.test.ts` — en verde |
| Suite completa | `pnpm test` — 307 archivos, 1532 tests en verde con Postgres; `pnpm check` sin hallazgos |
| Presupuesto | ~190 lineas cambiadas contra el limite de 400: sin excepcion |
| Revision nativa | `review-19668e85448cf618`, lente `review-reliability`, aprobada y quemada. Un SUGGESTION atendido: faltaba el caso de ciclo sobre `cuentasDeLugar` misma -`descendientesDe` lo tenia, pero la primitiva probada y la composicion probada no son lo mismo-. Se verifico que el test tiene dientes corriendo la caminata sin la guarda de visitados: pasa las 1000 vueltas sin terminar. El segundo SUGGESTION no pide cambio: observa que la tabla de evidencia afirma el resultado de `pnpm test` dentro del mismo diff que se revisa, o sea que no es artefacto inspeccionable desde la revision |
| Particion por metrica | `contenido.test.ts` llego a 230 lineas con el caso de ciclo. Se partio por tema -contar contra seleccionar filas-: `cuentasDeLugar.test.ts` (97), `contenido.test.ts` (89) y `contenidoDePrueba.ts` (79) con el arbol compartido |
| Frontera de rollback | Revertir `conteo.ts`, `contenido.ts`, `vistaDePanel.ts` y sus tests; no hay SQL, migracion, ruta ni accion |

## Fase 4: A3 — alta unica desacoplada del nodo

- [x] A3-RED-01 (A3). Para el requisito exacto “Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2)”, ampliar primero src/modules/territorio/application/verificacionDeDomicilio.test.ts: alta sin lugarId deriva asentamiento de calle principal; un lugarId de otra cadena produce UbicacionIncoherenteError; la prueba debe fallar antes de cambiar forma. Test enfocado: pnpm vitest run --project unit src/modules/territorio/application/verificacionDeDomicilio.test.ts (sin DB). Rollback: retirar solo escenarios RED de A3.
- [x] A3-GREEN-02 (A3). Requisito: Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2). Servir una sola forma desde registro plano usando listarCallesDelMunicipio, eliminar hidden raiz/nodo de src/modules/territorio/ui/FormularioDeDomicilio.tsx y conservar derivación existente datos.lugarId ?? callePrincipal.lugarId; altaDeDomicilioAction mantiene POST nativo y redirect redactado. Test enfocado: pnpm vitest run --project unit src/modules/territorio/application/verificacionDeDomicilio.test.ts (sin DB). Rollback: revertir forma y composición de entrada, sin tocar verificacionDeDomicilio.ts fuera de lo probado.
- [x] A3-GREEN-03 (A3). Requisito: Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2). Renombrar exclusivamente vocabulario de formulario: name zonaId a name lugarId, Zona (opcional) a Colonia (opcional), ZonaDelFormulario a NivelDelFormulario, opcionesDeZona a opcionesDeNivel; no mover ZonaIncoherenteError/UbicacionIncoherenteError ni AGENTS.md (son B2). Test enfocado: pnpm vitest run --project unit src/modules/territorio/ui/FormularioDeDomicilio.test.tsx (sin DB). Rollback: revertir solo renombres de UI.
- [x] A3-REFACTOR-04 (A3). Requisito: Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2). Verificar que no queda punto de alta anclado al nodo en TabDeDomicilios.tsx, que la acción sigue fuera de useActionState y que la pantalla funciona sin JavaScript. Test enfocado: pnpm test y pnpm check. Rollback: restaurar enlace/formulario anterior sin revertir A1/A2.

### Evidencia TDD y de unidad: A3

| Tarea | RED | GREEN | REFACTOR |
|---|---|---|---|
| A3-RED-01 | `verificacionDeDomicilio.test.ts` no existia; se creo y corrio 4/4 en verde de inmediato -la derivacion `datos.lugarId ?? callePrincipal.lugarId` y el rechazo cross-chain ya estaban implementados en `verificacionDeDomicilio.ts` desde antes de A3, sin que ningun test unitario lo cubriera directo | No hizo falta tocar `verificacionDeDomicilio.ts`: el archivo caracteriza comportamiento vigente, no dispara un cambio | El plan nombraba `UbicacionIncoherenteError`; el codigo vigente usa `ZonaIncoherenteError`. Ese renombre es B2 (B2-GREEN-04) y no se adelanto aqui |
| A3-GREEN-02 | `page.test.tsx` y `formularioDeDomicilio.test.tsx` fallaban esperando los hidden `raiz`/`nodo` | Se quitaron los hidden y el segundo punto de alta -inline en `TabDeDomicilios`-, dejando el registro plano como unica entrada | `hrefAdministrarCalles` quedo sin nadie que lo pasara tras quitar el alta del nodo: se elimino el prop y su rama muerta de `FormularioDeDomicilio`, no solo comentado |
| A3-GREEN-03 | Tests de UI y de la Server Action esperaban `zonaId`; fallaron al cambiar el `name` | Renombrado `zonaId`→`lugarId`, `ZonaDelFormulario`→`NivelDelFormulario`, `opcionesDeZona`→`opcionesDeNivel`, texto "Zona (opcional)"→"Colonia (opcional)" | `callesHeredadas.test.tsx` tenia un test que solo verificaba la ausencia de un texto que ya no puede aparecer en ningun escenario -quedo vacuo tras quitar el alta del nodo- y se retiro junto con el escenario que perdio sentido |
| A3-REFACTOR-04 | Dos archivos quedaron con formato invalido tras el cambio (indentacion en `altaDeDomicilioAction.test.ts`, `formularioDeDomicilio.test.tsx` y una linea en blanco en `territorioUx.test.tsx`) -detectados por `pnpm check`, no por los tests- | `node_modules/.bin/biome check --write` los corrigio; sin cambios de comportamiento | La accion siguio siendo POST nativo sin `useActionState`; no se toco A1/A2 |

| Evidencia de unidad | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project unit src/modules/territorio/application/verificacionDeDomicilio.test.ts src/modules/territorio/ui/formularioDeDomicilio.test.tsx src/modules/territorio/ui/callesHeredadas.test.tsx src/modules/territorio/ui/territorioUx.test.tsx src/modules/territorio/ui/vistaDeDomicilios.test.ts src/modules/territorio/ui/actions/altaDeDomicilioAction.test.ts src/app/(panel)/territorio/page.test.tsx` — 7 archivos, 35 pruebas en verde |
| Suite completa | `pnpm vitest run --project unit` — 208 archivos, 1180 tests en verde (integracion no corrida en esta unidad: no toca DB) |
| Typecheck/capas/reglas | `pnpm typecheck`, `pnpm layers`, `pnpm reglas` — sin hallazgos |
| `pnpm check` | 0 errores en los archivos de A3; quedan 2 errores y 48 warnings preexistentes fuera del alcance (`direccionVigenteDePersona.test.ts`, `domicilios.isolation.test.ts`, y `noNonNullAssertion` disperso en tests de otros modulos) |
| Presupuesto | ~207 lineas cambiadas entre los dos commits, contra el limite de 400: sin excepcion |
| Frontera de rollback | Revertir `1609704` y `fa04f00`; ningun cambio de esquema, migracion ni Server Action fuera de renombrar un campo de entrada |

Nota de ejecucion: la implementacion corrio con `opencode` (`openai/gpt-5.6-luna`, agente `build`) como escritor delegado; esta sesion (Claude) hizo la revision de diff completo exigida por el flujo -encontro y corrigio la rama muerta de `hrefAdministrarCalles`, un test vacuo y dos errores de formato antes de aceptar- y ejecuto los commits.

## Fase 5: B1 — esquema y dominio de zonas

Frontera de commit: las tablas, RLS/GRANT y los dos tests de aislamiento
entran en el mismo commit, aunque las pruebas se escriban y verifiquen en
tareas distintas. No se crea ninguna fila de producción sin ambas pruebas.

- [x] B1-RED-01 (B1). Para el requisito exacto “Una zona es un conjunto de calles de un unico asentamiento (Rebanada B1)”, escribir src/modules/territorio/zonas.isolation.test.ts y tests de caso de uso para zona con dos calles del asentamiento y rechazo de calle de otro asentamiento; la prueba de aislamiento comprueba cero filas cruzadas. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts (requiere Postgres). Rollback: retirar solo fixtures/tests RED sin tocar esquema.
- [x] B1-RED-02 (B1). Para el requisito exacto “Aislamiento de zonas y de su pertenencia por ayuntamiento (Rebanada B1)”, escribir src/modules/territorio/callesDeZonas.isolation.test.ts antes de crear tablas: tenant cruzado en cero filas, INSERT con calle de otro asentamiento rechazado por FK compuesto y UPDATE de calles.lugar_id con pertenencia viva rechazado. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/callesDeZonas.isolation.test.ts (requiere Postgres). Rollback: retirar esta prueba y fixtures.
- [x] B1-GREEN-03 (B1). Requisito: Aislamiento de zonas y de su pertenencia por ayuntamiento (Rebanada B1). El unique por asentamiento es un supuesto propuesto pendiente de confirmacion. Crear src/modules/territorio/infrastructure/esquemaDeZonas.ts y src/modules/territorio/infrastructure/esquemaDeCallesDeZonas.ts, y drizzle/0017_zonas_operativas.sql con ayuntamiento_id, ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY, politica de tenant, GRANT al rol de aplicacion, claves compuestas contra (id, ayuntamiento_id), zonas y calles_de_zonas según D7, más unique compuesto (id, lugar_id, ayuntamiento_id)/unique por asentamiento. Agregar el unique compuesto requerido a calles; no usar rol owner ni BYPASSRLS. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts src/modules/territorio/callesDeZonas.isolation.test.ts (requiere Postgres). Rollback: migracion inversa, retirar esquemas y unique de calles.
- [x] B1-GREEN-04 (B1). Requisito: Aislamiento de zonas y de su pertenencia por ayuntamiento (Rebanada B1). Hacer pasar tests de aislamiento en el mismo commit verificando GRANT SELECT, INSERT, UPDATE para zonas, GRANT SELECT, INSERT, DELETE para calles_de_zonas, y que no hay acceso sin withTenant en producción. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts src/modules/territorio/callesDeZonas.isolation.test.ts (requiere Postgres, sin rtk). Rollback: revertir commit completo de esquema/RLS/tests como unidad.

### Evidencia TDD y de unidad: B1-RED-01/02 y B1-GREEN-03/04

| Tarea | RED | GREEN |
|---|---|---|
| B1-RED-01/02 | Ambos archivos fallaron por `Cannot find module './infrastructure/esquemaDeCallesDeZonas'` -el esquema aun no existia-, no por otra razon; Vitest reporto `0 test` en los dos, confirmando que el fallo ocurrio antes de tocar Postgres | — |
| B1-GREEN-03/04 | — | Creadas `zonas` y `calles_de_zonas` con FK compuestos de 3 columnas; drizzle-kit genero el FK de `calles_de_zonas` antes del `UNIQUE` que le hacia falta a `calles`, asi que ese `ALTER TABLE ... ADD CONSTRAINT` se reordeno a mano en la migracion antes de los FK. `FORCE ROW LEVEL SECURITY` y los dos `GRANT` (uno por tabla) se agregaron a mano, igual que documenta el comentario de `esquemaDeCalles.ts` sobre `0015_eventos_de_calles.sql` |

| Evidencia de unidad | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts src/modules/territorio/callesDeZonas.isolation.test.ts` — 2 archivos, 7 pruebas en verde, corrido dos veces (por el escritor delegado y por esta sesion) |
| Suite completa | `pnpm test` — 311 archivos, 1551 tests en verde |
| Typecheck/capas/reglas | `pnpm typecheck`, `pnpm layers`, `pnpm reglas` — sin hallazgos |
| Verificacion RLS, sin `rtk` (ADR 0001 §8) | `psql` directo contra el contenedor: `\d+ zonas` y `\d+ calles_de_zonas` muestran `Policies (forced row security enabled)`; `pg_class.relforcerowsecurity = t` en ambas, dueño `xula_migrator` (no `xula_app`, no owner de la app); `pg_roles` confirma `rolsuper = f` y `rolbypassrls = f` en `xula_app`/`xula_migrator`/`xula_super_admin`; `information_schema.role_table_grants` confirma exactamente `SELECT, INSERT, UPDATE` en `zonas` y `SELECT, INSERT, DELETE` en `calles_de_zonas` para `xula_app`, sin `DELETE` ni `UPDATE` cruzados |
| `pnpm check` | El escritor delegado dejo un import sin usar (`sql` en `esquemaDeZonas.ts`) y varios errores de formato -detectados por esta sesion, no por el escritor-, corregidos antes de commitear; 0 errores propios al cerrar, quedan los 48 warnings preexistentes de `noNonNullAssertion` dispersos en el repo |
| Presupuesto | Un solo commit (`3e092ea`), 11 archivos, ~4270 lineas -la mayoria generada por drizzle-kit en `drizzle/meta/0017_snapshot.json`, no manuscrita-; ningun archivo de codigo manuscrito se acerca a 200 lineas |
| Frontera de rollback | `3e092ea` es una sola unidad: revertirlo saca migracion, esquemas, `ZonaId`/`CalleEnZonaError` y los dos tests de aislamiento juntos, tal como exige la frontera de commit de esta fase |

Nota de ejecucion: RED (B1-RED-01/02) y GREEN (B1-GREEN-03/04) corrieron con `opencode` (`openai/gpt-5.6-luna`, agente `build`) como escritor delegado, en dos llamadas separadas -la segunda solo lanzada despues de revisar el RED de la primera-. Esta sesion (Claude) verifico el RED, escribio la especificacion exacta de columnas/indices/GRANT para el GREEN citando `design.md` seccion 4 y `drizzle/0015_eventos_de_calles.sql` como precedente, y antes de aceptar: releyo los dos esquemas nuevos completos, repitio la verificacion de RLS/GRANT por `psql` directo sin `rtk`, corrio la suite completa por su cuenta, y corrigio un import sin usar mas errores de formato que el escritor delegado no habia detectado.
- [x] B1-RED-05 (B1). Para el requisito exacto “La pertenencia de calle a zona es muchos a muchos y no exige particion (Rebanada B1)”, escribir tests para una calle en dos zonas y una zona vacia; para “Los domicilios de una zona se derivan de sus calles, nunca se declaran (Rebanada B1)”, escribir src/modules/territorio/domiciliosDeZona.integration.test.ts que incluya calle principal y excluya entreCalleA/B. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/domiciliosDeZona.integration.test.ts (requiere Postgres). Rollback: retirar solo tests de puertos/casos.
- [x] B1-GREEN-06 (B1, alcance recortado — ver nota). Requisitos: La pertenencia de calle a zona es muchos a muchos y no exige particion (Rebanada B1); Los domicilios de una zona se derivan de sus calles, nunca se declaran (Rebanada B1). Implementados src/modules/territorio/application/puertosDeZonas.ts, src/modules/territorio/application/crearDomiciliosDeZona.ts y src/modules/territorio/infrastructure/repositorioDeCallesDeZonasSql.ts; contarZonasQueLaUsan en RepositorioDeCalles hace que reparentearCalle rechace con CalleEnZonaError. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/domiciliosDeZona.integration.test.ts (requiere Postgres). Rollback: retirar puertos/casos/adaptadores de zonas, conservando tablas solo hasta rollback de esquema.
- [x] B1-REFACTOR-07 (B1). Requisito: Una zona es un conjunto de calles de un unico asentamiento (Rebanada B1). Revisar dependencias por capas, tipar IDs, verificar FORCE RLS y leer el diff completo de migracion, esquemas, casos, bitacora y tests; no agregar UI, acciones ni AGENTS.md. Test enfocado: pnpm test y pnpm check; aislamiento adicional con pnpm db:local && pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts src/modules/territorio/callesDeZonas.isolation.test.ts (sin rtk). Rollback: revertir solo limpieza, sin deshacer frontera de commit.

### Evidencia TDD y de unidad: B1-RED-05/GREEN-06/REFACTOR-07

Nota de alcance (decision tomada durante la unidad, no en la planificacion
original): el texto de B1-GREEN-06 tambien menciona `application/zonas.ts`
con alta/renombrar/baja/agregar/quitar calle de una zona. No se implemento:
ningun test RED lo exige todavia -B1-RED-05 solo cubrio `domiciliosDeZona` y
el rechazo de `CalleEnZonaError`- y ese CRUD completo tiene su propio ciclo
RED/GREEN en la Fase 8 (B3u), junto a sus Server Actions
(`B3u-RED-02`/`B3u-GREEN-04`). Escribir ese codigo ahora sin un test que lo
pida habria violado la regla 11 de AGENTS.md.

| Tarea | RED | GREEN |
|---|---|---|
| B1-RED-05 | `domiciliosDeZona.integration.test.ts` fallo por `Cannot find module './application/domiciliosDeZona'`; el test de `CalleEnZonaError` (`reparentearCalleEnZona.integration.test.ts`) fallo con el 23503 crudo de Postgres, `update or delete on table "calles" violates foreign key constraint "calles_de_zonas_calle_tenant_fk"` -confirmando que `reparentearCalle` no traducia el error, no que rechazaba distinto | — |
| B1-GREEN-06 | El escritor delegado peleo con un ciclo de dependencias real (`pnpm layers` lo detecto) y lo resolvio separando fabrica/wiring, pero dejo un archivo `application/domiciliosDeZona.ts` que reimportaba desde `composicionDeDomicilios.ts` -application dependiendo de la raiz de composicion, invertido: `pnpm layers` no lo marca porque su regla es sobre `infrastructure/`, no sobre la raiz del modulo. Se elimino ese archivo y el test paso a instanciar `crearDomiciliosDeZona(repositorioDeCallesDeZonasSql)` directo, igual que cualquier otro test de integracion del modulo (`mudanzas.integration.test.ts`, mismo patron) | `contarZonasQueLaUsan` tambien quedo opcional (`?`) en `RepositorioDeCalles` para no tocar los diez mocks existentes del modulo; se lo volvio obligatorio y se actualizaron los diez, para que una implementacion futura incompleta del puerto no compile en silencio |
| B1-REFACTOR-07 | — | Diff completo releido (31 archivos, 728 lineas contra `main`, fuera de `openspec/`/`drizzle/meta/`); sin UI, sin acciones, sin `AGENTS.md` |

| Evidencia de unidad | Resultado |
|---|---|
| Test enfocado | `pnpm vitest run --project integration src/modules/territorio/domiciliosDeZona.integration.test.ts src/modules/territorio/reparentearCalleEnZona.integration.test.ts src/modules/territorio/calles.integration.test.ts` — 3 archivos, 10 pruebas en verde |
| Suite completa | `pnpm test` — 313 archivos, 1555 tests en verde, corrido dos veces (escritor delegado y esta sesion) |
| Typecheck/capas/reglas | `pnpm typecheck`, `pnpm layers` (795 modulos, sin ciclos tras la correccion), `pnpm reglas` — sin hallazgos |
| `pnpm check` | 0 errores propios; 41 warnings preexistentes de `noNonNullAssertion` |
| Aislamiento, sin `rtk` (ADR 0001 §8) | `pnpm vitest run --project integration src/modules/territorio/zonas.isolation.test.ts src/modules/territorio/callesDeZonas.isolation.test.ts` — 2 archivos, 7 pruebas en verde, corrido de nuevo al cierre de la fase |
| Presupuesto | Un commit (`0241589`), 22 archivos, 288 lineas |
| Frontera de rollback | Revertir `0241589`; no toca esquema ni migracion, solo capa de aplicacion |

Nota de ejecucion: igual que el resto de B1, RED y GREEN corrieron con `opencode` (`openai/gpt-5.6-luna`) como escritor delegado. Esta sesion encontro y corrigio, antes de aceptar, una inversion de capas real que el escritor introdujo para resolver un ciclo (`application` reimportando de la raiz de composicion) y un campo de puerto vuelto opcional para evitar tocar mocks -las dos cosas pasaban `pnpm layers`/`pnpm typecheck` igual, asi que no alcanzaba con confiar en las herramientas automaticas: hizo falta leer el codigo.

## Fase 6: B3d — migracion operativa de datos

Precondicion bloqueante (no es una tarea): antes de ejecutar el script debe
existir una ventana operativa aprobada para cada municipio afectado. Si falta,
B3d se detiene y se solicita esa coordinacion; ninguna tarea, valor por defecto
o automatizacion puede inferirla.

- [x] B3d-RED-01 (B3d). Para el requisito exacto “Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3)”, preparar base scratch con sectores, manzanas y domicilios en src/modules/territorio/migrarSectoresAZonas.integration.test.ts; provocar UPDATE bloqueado por RLS sin tenant y comprobar cero filas sin error, y exigir que el test falle si el script no cuenta filas/aborta. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts (requiere Postgres; psql nativo, sin rtk). Rollback: destruir solo base scratch/fixtures.

### Evidencia TDD y de unidad: B3d-RED-01

| Item | Resultado |
|---|---|
| RED | 2 tests: "un UPDATE sin tenant queda bloqueado por RLS con cero filas y sin error" en verde de entrada -caracteriza RLS vigente, no dispara cambio-; "mueve todos los domicilios contados y preserva cada lugar anterior" falla con `ENOENT: no such file or directory, open '.../scripts/migrar-sectores-a-zonas.sql'` -razon correcta: el script de B3d-GREEN-02 todavia no existe |
| Correccion durante RED | El escritor delegado (codex, `gpt-5.6-sol`) invoco `execFileSync("psql", [databaseUrl, ...])` asumiendo `psql` en el PATH del host; esta sesion encontro que el host no tiene cliente `psql` -Postgres corre solo en el contenedor Docker `xula-pg` de `scripts/db-local.sh`- asi que el RED fallaba con `spawnSync psql ENOENT`, razon equivocada. Se corrigio a `readFileSync` + `execFileSync("docker", ["exec", "-i", "xula-pg", "psql", urlInterna, ...], { input: guionDelScript })`, con el puerto interno 5432 en vez del 55432 publicado al host |
| `pnpm check` | 1 error de formato en el archivo nuevo, corregido con `biome check --write`; 0 errores propios al cerrar |
| `pnpm typecheck` / `pnpm reglas` | Sin hallazgos (815 archivos, 9 reglas + 2 metricas) |
| Frontera de rollback | Revertir unicamente `migrarSectoresAZonas.integration.test.ts`; no toca esquema, script ni migracion |

Nota de ejecucion: RED corrio con `codex` (`openai/gpt-5.6-sol`, plugin `codex:codex-rescue`) como escritor delegado. Esta sesion (Claude) verifico el fallo, encontro y corrigio el supuesto de PATH equivocado sobre `psql`, y confirmo RED por la razon correcta antes de continuar. Despues de esta tarea se reconfiguro `~/.codex/config.toml` a `gpt-5.6-luna` con `model_reasoning_effort = "max"` para las proximas delegaciones.
- [x] B3d-GREEN-02 (B3d). Requisito: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3). Crear scripts/migrar-sectores-a-zonas.sql con rol de menor privilegio, sin secretos, set_config('app.tenant', id, true) dentro de transaccion, temp table de candidatos, bitacora MIGRACION_DOMICILIO antes de UPDATE domicilios, GET DIAGNOSTICS y RAISE EXCEPTION si filas afectadas no coinciden, preservando lugarId anterior en origen. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts (requiere Postgres; psql nativo, sin rtk). Rollback: no ejecutar parcialmente; una excepcion revierte transaccion entera.

### Evidencia TDD y de unidad: B3d-GREEN-02

| Item | Resultado |
|---|---|
| GREEN | `scripts/migrar-sectores-a-zonas.sql`: candidatas via `WITH RECURSIVE` que trepa `lugares.padre_id` desde cada domicilio colgado de sector/manzana hasta el primer ancestro cabecera/comisaria/colonia; bitacora `MIGRACION_DOMICILIO` insertada antes del UPDATE con `origen = 'script:migrar-sectores-a-zonas:' \|\| lugar_anterior_id`; dos `GET DIAGNOSTICS`/`RAISE EXCEPTION` independientes -uno para bitacora, uno para el UPDATE- para no confundir cual paso freno RLS. 2/2 tests en verde |
| Suite completa | `pnpm test` -315 archivos, 1558 tests en verde | `pnpm check` -0 errores, 56 warnings preexistentes de `noNonNullAssertion`- y `pnpm reglas` -816 archivos, sin hallazgos |
| Alcance | Solo `scripts/migrar-sectores-a-zonas.sql`; no toca zonas/calles_de_zonas ni DELETE de sector/manzana -eso es B3d-GREEN-03 |
| Frontera de rollback | El script no se ejecuta parcialmente: cualquier mismatch de conteo revierte la transaccion entera del bloque `DO` |

Nota de ejecucion: GREEN corrio con `codex` (`openai/gpt-5.6-luna`, `model_reasoning_effort = "max"`, plugin `codex:codex-rescue`) como escritor delegado. Esta sesion (Claude) leyo el script completo antes de aceptar, verifico el CTE recursivo contra la topologia del test (manzana bajo sector bajo colonia, y sector bajo colonia directo) y confirmo GREEN, suite completa y `pnpm check`/`pnpm reglas` en verde.
- [x] B3d-GREEN-03 (B3d). Requisito: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3). Completar script con una zona por sector (incluidas zonas vacias como supuesto explicito), pertenencias de calles principales, rechazo contado/listado de calles de otro asentamiento por FK, DELETE de filas sector/manzana (nunca baja_en), bitacora de baja con padre y salida de domicilios/lugares/zonas/calles rechazadas. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts (requiere Postgres). Rollback: restaurar domicilios desde bitacora.origen y filas de lugares desde salida guardada.

### Evidencia TDD y de unidad: B3d-GREEN-03

| Item | Resultado |
|---|---|
| RED | Extendido el mismo archivo: zona por sector (con nombre heredado), zona vacia para un sector sin calles/domicilios, calle de otro asentamiento rechazada -no forzada-, DELETE fisico de sector/manzana, bitacora BAJA_LUGAR con el padre_id perdido. Fallo inicial: `xula_app` sin GRANT DELETE en lugares (ver bloqueo abajo) |
| Bloqueo real, no de diseño | El escritor delegado (codex) se freno solo al toparse con que `lugares` no concede DELETE a `xula_app` (drizzle/0007_territorio.sql:94-98, decision deliberada: "Ninguna con DELETE"). Pidio autorizacion en vez de forzar una salida -correcto- |
| Error propio corregido | Mi primera recomendacion -correr el script como `xula_migrator`- era incorrecta: `politicaTenant()` (`shared/tenancy/esquema.ts:178`) escribe cada politica `to: "xula_app"` exclusivamente; con `FORCE RLS` y sin politica aplicable, `xula_migrator` no ve ninguna fila -ni siquiera siendo dueno del schema. Verificado con `SELECT count(*) FROM ayuntamientos` por rol: 0 para `xula_migrator`, filas reales para `xula_app`. El script corrio "exitoso" sin tocar nada (0 candidatos, cero excepciones) |
| Decision final, autorizada | `drizzle/0018_grant_baja_fisica_lugares.sql`: `GRANT DELETE ON lugares TO xula_app`. Corrio la migracion de B2 de `0018_corte_tipos_lugar.sql` a `0019_corte_tipos_lugar.sql`, ya actualizado en B2-GREEN-03. Comentario de `0007_territorio.sql` actualizado para nombrar la excepcion en vez de dejar "ninguna con DELETE" desactualizado. Verificado: reportes/intervenciones referencian `lugarId` sin FK declarado (`de forma generica`), asi que no bloquean el DELETE -solo `calles` puede, y el script ya lo reporta sin forzar |
| GREEN | 2/2 tests en verde. Helper `migracionDeZonasDePrueba.ts` nuevo -`sembrarEscenarioDeMigracion`, `leerDomiciliosMigrados`, `leerZonasYBajas`- para bajar el archivo de test de 284 a 188 lineas (metrica AGENTS.md <= 200), mismo patron que uso A2 |
| Suite completa | `pnpm test` -315 archivos, 1558 tests en verde |
| `pnpm check` / `pnpm typecheck` / `pnpm reglas` | 0 errores propios (56 warnings preexistentes), sin hallazgos, 817 archivos sin hallazgos |
| Alcance | 5 archivos: `scripts/migrar-sectores-a-zonas.sql`, `migrarSectoresAZonas.integration.test.ts`, `migracionDeZonasDePrueba.ts` (nuevo), `drizzle/0018_grant_baja_fisica_lugares.sql` (nuevo), `drizzle/0007_territorio.sql` (comentario) + `drizzle/meta/_journal.json` |
| Frontera de rollback | Domicilios: `split_part(origen, ':', 3)::uuid` de la bitacora `MIGRACION_DOMICILIO`. Lugares borrados: reconstruir desde la salida guardada del script (tipo/nombre/padre_id) mas la bitacora `BAJA_LUGAR` para el padre. El GRANT DELETE no se revierte: es permanente, acotado por RLS igual que el resto de los verbos de `xula_app` |

Nota de ejecucion: GREEN corrio con `codex` (`gpt-5.6-luna`/`max`, plugin `codex:codex-rescue`) siguiendo la spec de `design.md` seccion 6 al pie de la letra. Esta sesion (Claude) leyo el diff completo, verifico el CTE de ancestro-asentamiento contra la topologia del test, encontro y corrigio un error propio (recomendacion de rol equivocada), diagnostico la causa real (RLS scoped `to: xula_app` sin cobertura para otros roles) y autorizo con el usuario el unico cambio de esquema necesario (GRANT DELETE, migracion 0018) antes de aplicarlo.
- [x] B3d-RED-04 (B3d). Requisito: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3). Añadir escenarios de rollback e idempotencia: una segunda corrida encuentra cero candidatos; rollback restaura cada lugarId leyendo solo bitacora y reconstituye filas desde salida. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts (requiere Postgres; psql nativo, sin rtk). Rollback: revertir únicamente escenarios de prueba.

### Evidencia TDD y de unidad: B3d-RED-04

| Item | Resultado |
|---|---|
| Idempotencia | Segunda corrida del mismo script: `leerEstadoDeIdempotencia` (bitacora de migracion/baja, zonas, lugares sector/manzana) da exactamente igual antes y despues; cero filas sector/manzana en ambas lecturas. Paso sin tocar el script -emerge de que la primera corrida ya borro todo lo que la segunda buscaria |
| Rollback | Nuevo helper `migracionDeZonasRollbackDePrueba.ts`: agrega `\pset format unaligned` + `json_agg` sobre la temp table `lugares_borrados` al mismo stdin del script -sin parsear texto de tabla psql y sin tocar el script- para capturar `lugaresBorrados` estructurado. `revertirMigracion` reinserta lugares en orden padre-primero (evita el FK auto-referencial) y aplica `split_part(origen, ':', 3)::uuid` de la bitacora `MIGRACION_DOMICILIO` sobre `domicilios.lugar_id`, exactamente la expresion documentada en design.md seccion 6. Restauracion verificada: 3 lugares y 3 domicilios de vuelta a su estado anterior |
| Alcance respetado | Zonas/calles_de_zonas fuera del rollback -el texto de la tarea solo pide domicilios+lugares- |
| GREEN | 2/2 tests en verde, sin cambios en scripts/migrar-sectores-a-zonas.sql |
| Suite completa | `pnpm test` -315 archivos, 1558 tests en verde |
| `pnpm check` / `pnpm typecheck` / `pnpm reglas` | 0 errores propios (56 warnings preexistentes), sin hallazgos, 819 archivos sin hallazgos |
| Metricas | `migrarSectoresAZonas.integration.test.ts` 199 lineas, `migracionDeZonasRollbackDePrueba.ts` 198 -ambos bajo el limite de 200 |
| Frontera de rollback | Revertir unicamente el archivo de test y el helper nuevo; el script y su comportamiento de produccion no cambiaron |

Nota de ejecucion: corrio con `codex` (`gpt-5.6-luna`/`max`). Esta sesion (Claude) leyo el helper completo antes de aceptar: confirmo que el truco de `\pset unaligned` + JSON no modifica el script en ejecucion -corre en el mismo stream de stdin, despues de las SELECT propias del script, contra la misma temp table que sigue viva en la sesion- y que el orden topologico de reinsercion de lugares es correcto para el FK auto-referencial de `lugares.padre_id`.

Hallazgo adicional, corregido en la misma unidad: `pnpm reglas` marco el `*DePrueba.ts` nuevo por el antipatron 12 (filesystem del contenedor) -`comunes.ts:esTest` solo excluia `*.test.ts`, no `*DePrueba.ts`, que ya esta sancionado como andamiaje de test para la regla 2 en `tenancia.ts`. Se arreglo la regla (TDD: test RED en `codigo.test.ts` primero, luego `esTest` reconoce tambien `DePrueba.ts$`), no el archivo -la reja estaba incompleta, no el codigo.
- [x] B3d-GREEN-05 (B3d). Requisito: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3). Escribir runbook scripts/README-migrar-sectores-a-zonas.md con precondicion de ventana operativa, rol/comandos, captura obligatoria de salida, comprobacion de conteos, procedimiento de rollback y prohibicion de credenciales embebidas. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts (requiere Postgres); runbook por lectura estructural, sin runtime adicional. Rollback: retirar runbook y conservar script para revisión explícita.

### Evidencia de unidad: B3d-GREEN-05

Origen atipico: el runbook aparecio ya escrito en el disco (`scripts/README-migrar-sectores-a-zonas.md`, sin tracking en git, sin commit ni pedido explicito en esta sesion que lo explique) antes de delegar esta tarea. En vez de confiar en el, se delego su **verificacion** contra el script real y `design.md` seccion 6 -no su escritura- a `codex:codex-rescue` (`gpt-5.6-luna`/`max`). Ese job quedo colgado ~1h30 sin actividad -laptop suspendida por tapa cerrada, conexion cortada- despues de ya haber aplicado sus correcciones; esta sesion tomo el archivo en el estado en que quedo, lo verifico linea por linea contra el script y cerro la tarea sin seguir esperando el proceso.

| Punto verificado | Resultado |
|---|---|
| Rol `xula_app`, nunca `xula_migrator`/superusuario | Correcto, y nombra explicitamente `drizzle/0018_grant_baja_fisica_lugares.sql` como precondicion bloqueante |
| Comandos de produccion vs. del test | Correcto: usa `psql "$DATABASE_URL" -f ...` generico, no el `docker exec` que solo aplica al Postgres local del test |
| Columnas exactas de los 4 grupos de salida | Verificadas contra `scripts/migrar-sectores-a-zonas.sql:527-556` -domicilios movidos, lugares borrados, zonas creadas, calles rechazadas (conteo + detalle)- coinciden exactas |
| Comprobacion de conteos post-ejecucion | Fija `app.tenant` por municipio antes de contar sector/manzana restantes -no una consulta sin tenant, que bajo RLS daria 0 filas sin significar nada |
| Rollback | `split_part(origen, ':', 3)::uuid` citado igual que `migracionDeZonasRollbackDePrueba.ts`; aclara que `BAJA_LUGAR` solo guarda `padre_id`, no `tipo`/`nombre` -esos vienen de la salida guardada |
| Sin credenciales embebidas | `DATABASE_URL` solo por variable de entorno, prohibicion explicita en texto |
| Zonas/calles_de_zonas fuera del rollback | Declarado explicito: "no forman parte del camino de reversion automatizado" |
| `pnpm check` / test enfocado | 0 errores propios (56 warnings preexistentes); 2/2 tests en verde, sin tocar script ni tests |

Frontera de rollback: retirar unicamente el runbook; el script y su comportamiento no cambiaron.
- [ ] B3d-REFACTOR-06 (B3d). Requisito: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3). Ejecutar corrida controlada solo después de la precondicion, guardar salida, revisar pnpm reglas y confirmar segunda corrida idempotente; no alterar TypeScript ni CHECK. Test enfocado: pnpm db:local && pnpm vitest run --project integration src/modules/territorio/migrarSectoresAZonas.integration.test.ts; sin rtk. Rollback: usar procedimiento del runbook, no DELETE manual.

## Fase 7: B2 — corte de tipos y contratos (size:exception)

Frontera inseparable: estimacion visible de 850-1,050 lineas cambiadas, por
encima de 400. Se autoriza solo como size:exception aprobado por mantenedor; no
se finge una costura entre CHECK, union de TypeScript y los aproximadamente 40
archivos/tests que deben compilar juntos. B3d debe haber terminado antes de
aplicar este cambio.

- [ ] B2-RED-01 (B2). Para el requisito exacto “Orden estricto y total de tipos, con dos tipos en el rango superior (Rebanada 2)”, actualizar primero tests de dominio/integración para cabecera/comisaria como raices, rechazo de comisaria bajo cabecera, colonia sin hijos y ciclo rechazado; conservar RED antes de editar TIPOS_DE_LUGAR. Test enfocado: pnpm test (suite completa, sin rtk; integración requiere pnpm db:local). Rollback: revertir tests B2 sin tocar B3d.
- [ ] B2-RED-02 (B2). Para “Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2)” y “Direccion compuesta como texto imprimible”, actualizar tests de src/modules/territorio/domain/direccion.test.ts, alta/correccion y fixtures que aún usan sector/manzana; deben fallar por contrato vigente antes de cambiarlo. Test enfocado: pnpm test. Rollback: revertir únicamente fixtures/tests del contrato de domicilios.
- [ ] B2-GREEN-03 (B2). Requisito: Orden estricto y total de tipos, con dos tipos en el rango superior (Rebanada 2). Cambiar src/modules/territorio/domain/tipoDeLugar.ts a TIPOS_DE_LUGAR = [cabecera, comisaria, colonia], derivar RANGO vigente, regenerar drizzle/0019_corte_tipos_lugar.sql (numero corrido por B3d-GREEN-03: 0018 ya lo uso drizzle/0018_grant_baja_fisica_lugares.sql) con CHECK tipo IN (cabecera, comisaria, colonia) y actualizar los aproximadamente 40 archivos de territorio/tests afectados; DELETE de B3d debe haber eliminado filas incompatibles antes de aplicar CHECK. Test enfocado: pnpm test y pnpm check. Rollback: migracion inversa que restituya ambos tipos al CHECK y revertir commit inseparable.
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
- Decision diferida a B3u (revision local del PR #65, `pnpm revision:local:pr`,
  verificada antes de descartarla): `repositorioDeCallesDeZonasSql.domiciliosDeZona`
  no filtra `zonas.bajaEn IS NULL` -una zona dada de baja seguiria devolviendo
  sus domicilios. No se agrega el filtro en B1 porque hoy no hay ningun caller
  real (B3u es quien construye la pantalla que llama a `domiciliosDeZona`, y
  ahi se decide si el 404 de "zona dada de baja" va antes de llegar a esta
  funcion o si ademas hace falta el filtro aca). `contarZonasQueLaUsan` -que
  bloquea `reparentearCalle`- tampoco filtra `zonas.bajaEn`, pero eso SI se
  reviso y se dejo a proposito: `contarDomiciliosQueLaUsan`, el metodo hermano
  que ya existia y que este imita, tampoco filtra `domicilios.bajaEn`. Cambiar
  uno sin el otro habria sido la inconsistencia real.

## Revision local previa al PR (B3d completo)

Antes de abrir el PR #6, `pnpm revision:local:pr` (gga, gpt-5.6-luna/max,
sin cache, diff completo contra `main`) sobre las ~1500 lineas acumuladas
de B3d. Encontro 5 hallazgos reales, ninguno ruido:

1. Typo: el header del script citaba `drizzle/0018_grant_baja_lugares.sql`,
   el archivo real es `..._grant_baja_fisica_lugares.sql`. Corregido a mano.
2. `zonas.bajaEn` no heredaba `lugares.bajaEn` del sector origen: un sector
   ya dado de baja resucitaba como zona activa. Igual en el rollback.
3. Una calle cuyo propio `lugar_id` es directamente un sector/manzana -sin
   ningun domicilio que la referencie- no aparecia en `calles_rechazadas`
   y el `DELETE` abortaba sin reporte. `calles.lugar_id` no tiene CHECK en
   Postgres que lo impida, solo `altaDeCalle`/`reparentearCalle` en la app.
4. El test solo sembraba Motul: nada probaba que la migracion no tocara
   otro municipio.
5. Varias funciones/cuerpos de test superaban las 30 lineas -metrica que
   `pnpm reglas` deja a proposito al revisor de IA (AGENTS.md).

Corregido con `codex` (`gpt-5.6-luna`/`max`, `codex:codex-rescue`):
`zonas.bajaEn`/`lugares_borrados.baja_en` propagados end-to-end (script,
rollback, runbook); nueva deteccion de calles huerfanas de sector/manzana
va a `calles_rechazadas` con dedupe (`ON CONFLICT DO NOTHING`) y se emite
por `RAISE NOTICE` **antes** del `DELETE` -un `NOTICE` sobrevive al abort
de la transaccion, a diferencia del `SELECT` final, asi que la operadora
ve el reporte aunque la reja FK frene todo; test con Motul+Ticul
independientes probando aislamiento; helpers partidos por tema
(`migracionDeZonasAsercionesDePrueba.ts`, `...LecturasDePrueba.ts`,
`...RollbackEstadoDePrueba.ts`, `...RollbackLecturasDePrueba.ts`,
`...RollbackReversionDePrueba.ts`).

**El escritor delegado corrio sin Docker** (su sandbox no lo tenia
disponible): typecheck y biome pasaron, pero la integracion nunca corrio
de verdad. Esta sesion la corrio por primera vez y encontro 3 tests
rotos -todos bugs mecanicos del lado del test, no del script SQL:

- `expect(salida).toContain("23503")`: psql en verbosity default nunca
  imprime el codigo SQLSTATE. Cambiado a buscar el texto real del mensaje
  (`violates foreign key constraint "calles_lugar_tenant_fk"`). Esa
  asercion fallida abortaba el test ANTES de su limpieza
  (`quitarBloqueoDirecto()`), lo que arrastraba en cascada los dos tests
  siguientes -causa raiz unica, tres fallos.
- `toEqual(arrayContaining([...]))` con objetos de forma parcial: `toEqual`
  exige igualdad exacta por elemento, no hace partial-match -se corrigio
  para comparar la forma completa (`tipo`/`nombre`/`padreId`/`bajaEn`).
- `bajaEn` comparado como string contra el `Date` que devuelve Drizzle al
  leer la columna. Normalizado con `new Date(bajaEn)`.

Verificado por esta sesion, no por el escritor: `pnpm test` (315
archivos, 1561 tests), `pnpm check`/`pnpm typecheck`/`pnpm reglas` (0
hallazgos propios), leida completa la logica SQL de los tres hallazgos
1-3 linea por linea contra el script real antes de aceptar.

### Ronda 2 de revision local

Segunda corrida de `pnpm revision:local:pr` sobre el fix anterior: trajo
8 hallazgos nuevos. Por la disciplina del proyecto -"si la segunda trae
un hallazgo nuevo, se para y lo decide una persona"- esta sesion freno
antes de una ronda 3 y verifico cada uno antes de corregir:

| # | Hallazgo | Veredicto |
|---|---|---|
| 1 | `GRANT DELETE` a `xula_app` amplia el rol de la aplicacion | **No es nuevo**: es la misma decision ya tomada y autorizada por el usuario en B3d-GREEN-03 (ver esa evidencia), el revisor la repite sin el contexto de esa conversacion. No se toco entonces; **cerrado en la revision oficial de CI** (ver esa seccion abajo): documentado como excepcion en `AGENTS.md` |
| 2 | Calle bajo una `manzana` directa (sin domicilio) no se detecta | **Falso positivo**, verificado empiricamente: se agrego el escenario exacto al test (`calleDirectaEnManzanaTiculId`) y `sectores_de_lugares_borrados` ya la detecta -el CTE propaga `origen_id` correctamente al trepar de manzana a sector |
| 3 | Falta test para el caso de manzana directa | Cerrado por el mismo agregado del punto 2 |
| 4 | Las aserciones de Motul/Ticul solo cubren un domicilio y omiten bitacora/`BAJA_LUGAR` | **Real**: el split de archivos perdio la asercion exacta de `origen` que si tenia B3d-GREEN-03/RED-04. Restaurada en `migracionDeZonasAsercionesDePrueba.ts` -`verificarDomicilioMigrado`, `verificarBajasDeLugares` |
| 5 | `CalleRechazadaDeSalida.calleId` sin marca de tipo | **Real**: era `string` suelto. Corregido a `CalleId` via `comoCalleId` |
| 6 | `sembrarDomicilios`/`leerZonasYBajas` superan 30 lineas | **Real**: partidas por tema (`sembrarDomiciliosPropios`/`sembrarDomicilioConCalleAjena`; `leerLugaresBorrados` extraida) |
| 7 | El runbook afirma que la salida capturada conserva el codigo `23503` | **Real**: `psql` en verbosity default no lo imprime, solo el mensaje con el nombre de la restriccion. Corregido para decir eso y nombrar `calles_lugar_tenant_fk` como lo que hay que buscar |
| 8 | Mismo razonamiento del `GRANT` repetido en `0007` y `0018` | **Real**: `0007` ahora solo apunta a `0018`, que queda como unica copia de la razon completa |

Corregido con Claude directo (sin delegar: mecanico, ya entendido).
Verificado de nuevo: `pnpm test` (315/1561), `pnpm check`/`pnpm typecheck`/
`pnpm reglas` (0 hallazgos propios; el unico error de `pnpm check` es
`.pi/gentle-ai/sdd-preflight.json`, ajeno a este cambio).

### Ronda 3 de revision local

A pedido del usuario ("una vez mas"), tercera corrida de
`pnpm revision:local:pr`. Las primeras dos intentonas se mataron solas por
memoria de la maquina -~7 procesos `codegraph serve` duplicados y ajenos
a este cambio, acumulados de otras sesiones- sin llegar a revisar nada; a
la tercera corrio completa y trajo 7 hallazgos, todos reales -esta vez no
sobre el script sino sobre la propia rigurosidad de los tests que la
ronda 2 dejo:

| # | Hallazgo | Correccion |
|---|---|---|
| 1 | `appSinTenant` nunca cierra su conexion en `afterAll` | Agregado `await appSinTenant.end()`, mismo patron que otros `*.isolation.test.ts` del repo |
| 2 | Nada prueba que el sector vacio produzca zona ni que `membresiasDeZonaVacia` este vacio | Agregado `zonaNombrada(..., "Sector vacio")` -tira si falta- mas el `toHaveLength(0)` para ambos tenants |
| 3 | Solo 2 de 3 domicilios de Motul y 1 de 3 de Ticul verificados | Extraido `domiciliosDelEscenario`/`verificarDomiciliosDeUnTenant`: los 3 domicilios de cada tenant (sector, manzana, calle ajena) pasan por la misma asercion completa (movimiento + bitacora) |
| 4 | El rollback pide restaurar `domicilioConCalleAjenaId` pero no lo verifica | Agregada su aserticion de restauracion faltante |
| 5 | `bajaEn` de la zona verificado solo con `expect.any(Date)`, no el valor exacto | La fecha exacta (`bajaEnDelSectorMotul`) ahora viaja desde el test hasta la aserticion |
| 6 | Tipos de dominio (`DomicilioId`/`LugarId`) ensanchados a `string` en varios lados | Corregido donde el dato sale tipado de Drizzle (`domiciliosMigrados`); donde sale de `bitacora.entidadId` -columna generica sin marca, compartida entre entidades- se dejo `string \| null` a proposito, es el tipo real de esa columna |
| 7 | `leerZonasYBajas` seguia arriba de 30 lineas tras el split de la ronda 2 | Extraida `leerZonasDelAsentamiento` |

Verificado: `pnpm test` (315/1561), `pnpm check`/`pnpm typecheck`/
`pnpm reglas` sin hallazgos propios.

### Revision oficial de CI (PR #66)

Con las 3 rondas locales cerradas se abrio el PR #66. El job "Revision de
IA" (`gga run --pr-mode` via OpenCode, mismo mecanismo que
`pnpm revision:local:pr` pero corriendo en el runner) fallaba antes de
revisar una sola linea, por dos causas ajenas al codigo de este cambio:

- El test de migracion asumia `docker exec -i xula-pg psql` a fuerzas
  -unico camino disponible en esta maquina de desarrollo, que no tiene
  `psql` nativo-. En CI, Postgres corre como *service container* nativo y
  no existe ningun contenedor `xula-pg`. Corregido para detectar `psql`
  nativo primero y caer a Docker solo si no esta disponible
  (`migracionDeZonasRollbackDePrueba.ts`).
- `Homebrew/actions/setup-homebrew@master` ya no resuelve -esa rama se
  renombro a `main` upstream-, y una vez arreglado eso, `opencode.json`
  referenciaba prompts de agentes `sdd-*` que solo existen si
  `gentle-ai install` corrio antes en la maquina -nunca corria en CI-.
  Ninguno de los dos es un cambio de esta rama: son bytes identicos a
  `main`, rotos para cualquier PR. Corregidos en `.github/workflows/ci.yml`
  (pin de version + paso nuevo que instala `gentle-ai` y sincroniza los
  prompts de SDD antes de revisar).

Con el reporter corriendo completo, encontro hallazgos reales en 3 rondas
sucesivas, todos verificados contra el codigo antes de corregir:

| # | Hallazgo | Correccion |
|---|---|---|
| 1 | `reportes`/`intervenciones` colgando de un sector/manzana abortan el `DELETE` con un error crudo de FK, sin reporte de curacion | Mismo mecanismo que `calles_rechazadas`: precheck + `NOTICE __B3D_REGISTROS_DEPENDIENTES_JSON__` antes del `DELETE`. Test propio (`migrarSectoresAZonasRegistrosDependientes.integration.test.ts`) |
| 2 | Nombres de sector duplicados en el mismo asentamiento chocan contra `zonas_tenant_lugar_nombre_idx` con un error crudo de Postgres | Mismo mecanismo: precheck + `NOTICE __B3D_ZONAS_DUPLICADAS_JSON__` antes del `INSERT`. Test propio (`migrarSectoresAZonasNombresDuplicados.integration.test.ts`) |
| 3 | Una sola transaccion para todos los municipios (no se puede `COMMIT` dentro de un `DO`) | **No es un bug**: mismo patron que el precedente `baja-calles-fuera-de-asentamiento.sql`, no se toco. Runbook corregido donde afirmaba lo contrario ("la transaccion del municipio se revierte") |
| 4 | El precheck de duplicados no filtraba por `baja_en`, pero el indice real es parcial (`WHERE baja_en IS NULL`) | **Real**: reportaba colisiones que el indice no iba a rechazar (un sector de baja con el mismo nombre que uno activo). Filtro agregado; runbook precisado |
| 5 | Una `manzana` puede colgar directo de una `colonia`/`cabecera` sin sector intermedio (`puedeContener` es por rango); esas calles nunca entraban a `calles_rechazadas` | **Real**: el CTE recursivo solo captura cuando la cadena llega a `tipo = 'sector'`. Se reportan ahora como `registros_dependientes` (`entidad: "calles"`). Test propio (`migrarSectoresAZonasCalleSinSector.integration.test.ts`) |
| 6 | Falta `drizzle/meta/0018_snapshot.json`: el journal tiene la entrada pero no su snapshot | **Real**: regenerado con el procedimiento de `openspec/changes/mapa-operativo-territorial/design.md` (journal truncado a 0017, base scratch, `pnpm db:generate` confirma "No schema changes" porque el GRANT no toca el esquema de Drizzle, snapshot = copia de 0017 con `id`/`prevId` nuevos). Journal real restaurado, verificado sin diff |
| 7 | Dos funciones de test superaban 30 lineas (el `it` de idempotencia, el `beforeAll` de registros dependientes) | **Real**: partidas (`verificarRestauracion`; `sembrarArbolConDependientes`/`sembrarReporteYIntervencion`) |
| 8 | `GRANT DELETE` a `xula_app` sigue marcado como pendiente en este mismo archivo (ronda 2, hallazgo 1) | **Cerrado con el usuario**: documentado como excepcion sancionada en `AGENTS.md` ("La unica excepcion: ampliacion de privilegio para un script operativo"), mismo formato que `abreviaturas` y las excepciones de Server Actions |

Verificado en cada ronda: `pnpm test` (317-318 archivos, 1564 tests),
`pnpm check`/`pnpm typecheck`/`pnpm reglas` sin hallazgos propios, los 4
checks restantes de CI (lint/tipos/capas, tests unitarios, integracion y
aislamiento, links de documentacion) en verde.

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
