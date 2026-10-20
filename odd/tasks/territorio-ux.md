# territorio-ux

Rama: `feat/territorio-ux` (desde `main`, tras el merge de #93). Fuente de verdad visual: `DESIGN.md`. Auditoría previa: 33 pantallas capturadas en desktop y móvil (efímeras).

## Objetivo

Que Territorio, un flujo central del operador, deje de ser una pantalla de listas planas y confusas: contexto claro de dónde estás, acciones peligrosas distinguibles, confirmación de lo guardado, árbol que escala y rutas que hoy están escondidas enlazadas.

## Problema (auditoría)

P0: la pestaña "Calles" dice 0 en colonia, sector y manzana mientras muestra el catálogo heredado con filas; la baja de calle se ve igual que la acción principal (marca tono 25 vs error tono 27, ambos rojos y de ancho completo); el panel de calle se apila bajo cuatro botones de ancho completo; las altas no dan confirmación (solo existe `?error=`).
P1: el título es siempre "Territorio" y la migaja cambia de primer eslabón según la ruta; el árbol no tiene buscador ni cuentas y "N lugares más adentro" no es enlace; `/territorio/domicilios` y `/calles/[id]/historial` no tienen enlace desde Territorio; el historial no dice qué calle es; el alta de domicilio ofrece una lista plana de calles; en móvil la pestaña "Editar" queda cortada.
P2: fila seleccionada sin resaltar; patrones `<details>` inconsistentes; "S/N"; tipo de lugar en monoespaciada con fondo gris.

## Alcance autorizado

Presentación del módulo: `src/modules/territorio/ui/**`, `src/app/(panel)/territorio/**`, `src/app/(panel)/calles/**`, `src/modules/historial-de-calle/ui/**`, `src/shared/ui/**` cuando el cambio es una pieza compartida (variante de botón, aviso de éxito). Sin cambios de dominio, esquema ni migraciones. Cualquier consulta nueva (cuentas por fila del árbol, detalle de eventos del historial) requiere confirmar con el usuario antes de tocar `application`/`infrastructure`.

## Restricciones

- Reglas de AGENTS.md (≤200 líneas por archivo, ≤3 parámetros, comentarios solo con hecho no derivable, `ActionResult` / excepción documentada de formulario nativo con `redirect` + `searchParams`: una excepción nueva no entra sin agregarse a la tabla de AGENTS.md).
- Server Components por defecto; `"use client"` solo en hojas justificadas.
- `pnpm test` (con base local) y `pnpm check` en verde por tarea.
- Presupuesto de ~400 líneas por tarea como heurística, no tope.

## Tareas

- [x] U1 Base compartida: botón `peligro` con contorno (ya existía relleno), confirmación de éxito `?ok=` con 12 claves cerradas emitidas por las 12 acciones existentes (sin acción nueva en la tabla de excepciones de AGENTS.md), título con el nombre del lugar y etiqueta de tipo, migaja con primer eslabón "Territorio". Ruta: delegada (escritor). Evidencia: RED en peligro/ok/bajas (sin RED en redirects de acciones y tests de página); escritor: `pnpm test` 409 archivos/2098 tests, `pnpm check` exit 0; padre: 581 tests de unidad de `shared/ui`, `modules/territorio` y `(panel)/territorio` pasan, `pnpm check` exit 0; capturas revisadas. Commit: 201de54. Revisión nativa: riesgo medio, consentimiento concedido, aprobada y acuse quemado; frontera revisada = 201de54. Advertencias informativas a absorber: (a) `?ok=` vive en la URL, así que recargar o volver atrás repite el aviso (aceptado como costo de ser sin estado; evaluar limpiarlo con `history.replaceState` en una hoja cliente mínima o aceptarlo); (b) la aserción del tipo en `page.test.tsx:155` usa `toContain("Colonia")` y pasa por el nombre "Colonia Centro": hacerla específica; (c) el escritor dejó datos de prueba en la base demo ("Manzana Prueba U1*"): limpiar al final.
- [x] U2 Entrada y árbol: buscador `?q=` (servidor, sin acentos), filas colapsables con `<details>`, "N lugares más adentro" como enlace, entrada visible a `/territorio/domicilios`, y cuentas por fila con insignia "Sin calles" (decisión del usuario: consulta nueva permitida). Consulta: un puerto lector separado `LectorDeContenidoDeLugares.contarPorLugar` con SQL recursivo (baja_en IS NULL, profundidad < 8, sin parámetros), caso de uso `contarContenidoDeLugares` por `withTenant`; calles solo para cabecera y comisaría (regla de dominio en el caso de uso). Ruta: delegada (escritor). Evidencia: RED en unitarias/UI; escritor: `pnpm test` 416 archivos/2132 tests y `pnpm check` exit 0; padre: las 3 pruebas nuevas de la consulta (unidad, integración, aislamiento Motul/Ticul) pasan con la base local, `pnpm check` exit 0 (con `git add -N`); capturas revisadas. Pendiente menor: buscar descarta `?accion=` abierto (formulario GET plano). Commit: 80be7a0. Revisión nativa de U2: se concedió consentimiento; el revisor abrió una corrección por un hallazgo CRITICAL determinista (R3-001: `normalizarParaBusqueda` parecía perder la ñ). Verificado: funcionalmente falso positivo (la prueba pasa; el regex usaba `n`+tilde combinante escrito con caracteres idénticos a la ñ), pero el código era confuso: corregido con escapes `\u0303`/`\u00f1` y una prueba que distingue peña/pena (82803fa). Tras el plan de corrección, el STATUS devolvió `stop` terminal `captured_artifacts_unverifiable`: U2 queda SIN acuse de revisión nativa; la frontera revisada sigue en 201de54. Intentar una revisión nueva sobre el rango acumulado tras U3.
- [x] U3 Cabecera de lugar y pestañas: el contador de Calles cuenta lo que lista (heredado en colonia/sector/manzana); la pestaña Domicilios lista el subárbol (coincide con su contador) con enlace al lugar dueño; catálogo heredado enlazado al asentamiento con vacío explícito; pestaña Lugares con cuentas y pastilla de tipo reutilizando `FilaDeLugar`; pestañas que ya no se cortan en móvil (wrap + padding); "Registrar domicilio" arriba y a la derecha. Ruta: delegada (escritor). Evidencia: RED 9/16; escritor: `pnpm test` 417 archivos/2141 tests, `pnpm check` exit 0; padre: 380 tests de `territorio/ui`, `(panel)/territorio`, `shared/ui` pasan, `pnpm check` exit 0; capturas revisadas. Sin consulta nueva: reutiliza `contarContenidoDeLugares`. Sin captura del catálogo heredado vacío (cubierto por prueba unitaria). Commit: 09f2c33. Revisión nativa (rango acotado 82803fa..09f2c33, 431 líneas): consentimiento concedido, aprobada, acuse quemado; frontera revisada = 09f2c33 (U2 sigue sin acuse). Advertencias informativas para U7 (pulido): (a) `contarContenidoDeLugares` ahora corre también en vistas con `?raiz=` dentro de `Promise.all`: una falla o lentitud afecta toda pantalla de territorio; degradar con gracia o aislar; (b) falta una prueba de cableado de `conteos` hasta `TabDeLugares` en páginas con `raiz`; (c) la aserción de solo lectura en `territorioUx.test.tsx:138` se debilitó (`not.toContain("accion=calle")` en vez de no tener `<a`): hacerla específica; (d) `conteos` opcional en `TabDeLugares` renderiza vacío sin avisar: sin prueba del caso undefined.
- [x] U4 Calles: maestro-detalle (tabla y panel pegajoso a `lg`, fragmento `#panel-de-calle` en móvil), fila seleccionada con `aria-current`, acciones como acordeón nativo exclusivo (`details name`), baja con `peligro` separada y al final, enlaces a historial y mapa (el mapa no acepta parámetros: `/mapa-operativo` solo lee tipo/estado/área). Ubicar se abre por defecto solo sin punto; con punto es un enlace a `?accion=ubicarCalle` porque Leaflet mide 0px dentro de un `details` cerrado. Ruta: delegada (escritor). Evidencia: RED 10/14 en `callesU4.test.tsx`; escritor: `pnpm test` 418 archivos/2157 tests, `pnpm check` exit 0; padre: 396 tests de territorio/shared pasan, check exit 0; capturas revisadas. Copia unificada a usted ("Toque el mapa…", "Puede seguir agregando otro") para coincidir con la voz del producto. Pendiente: `SelectorDePunto` conserva su copia ("Haga clic…", ya en usted). Commit: 44d09d6. Revisión nativa (rango 09f2c33..44d09d6, 934 líneas): consentimiento concedido, aprobada, acuse quemado; frontera revisada = 44d09d6. Advertencias para U7: (a) `PanelDeCalle.test.tsx:55-56` pasó de no tener `<a` a comprobar `accion=`/`<details`: hacerla específica (solo los dos enlaces de contexto para OPERADOR); (b) el título de `callesU4.test.tsx:130` dice "cuatro details" y la aserción cuenta tres: alinear; (c) cambios de exports (`CeldasDeTabla`, `FormularioDeAccionDeCalle`): sin importadores rotos (tsc y check en verde).
- [x] U5 Domicilios: maestro-detalle igual que calles (filas enlace, `aria-current`, panel pegajoso, acordeón exclusivo con baja `peligro` al final) con `ItemDeAccion` compartido en `shared/ui` (reemplaza `ItemDeAccionDeCalle`); sin columna Lugar repetida (solo como línea cuando difiere); registro con chips de filtro individuales, vacío inicial y filtro-vacío que nombra todos los filtros; alta agrupada (Dónde / Entre qué calles / Referencia, calles en orden natural, colonia opcional etiquetada); "S/N" se lee "sin número". Ruta: delegada (escritor). Evidencia: RED 26 pruebas; escritor: `pnpm test` 424 archivos/2196 tests, `pnpm check` exit 0; padre: 435 tests de territorio/shared pasan, check exit 0; capturas revisadas. Pendiente (requiere datos): filas del registro sin `raizId` no enlazan si no hay filtro de asentamiento (añadir `raizId` a la consulta del registro); seleccionar un domicilio de un descendiente navega a su lugar (el loader exige `lugarId == nodo`); recomendación: selector de calle con búsqueda como hoja `use client` mínima; el domicilio de la entrada muestra un select de Colonia vacío (la pantalla de entrada no tiene zonas). Commit: d8378fc. Revisión nativa (rango 44d09d6..d8378fc, 2125 líneas): consentimiento concedido, aprobada, acuse quemado; frontera revisada = d8378fc. Advertencias para U7: (a) `filtroVisible` en `domicilios/page.tsx:49-55` ahora devuelve "" en vez de undefined sin filtros: verificar que no cambie de rama entre vacío inicial y vacío por filtro; (b) `VacioDeDomicilios.tsx:57-59` muestra la instrucción de agregar una calle a roles de solo lectura (`puedeActuar` sin revisar): corregir con prueba; (c) `RegistroDeDomicilios.enlaces.test.tsx:44-45` el helper `fila` devuelve "" si falta el marcador y la aserción negativa pasa en vacío: hacerla específica.
- [x] U7 Pulido de revisiones: conteo que degrada con log saneado (`contarSinRomper`), historial que degrada si falla `listarLugares` (callePorId sigue propagando), vacío de domicilios sin instrucción para solo lectura, `filtroVisible` honesto, cota de 16 niveles fijada por prueba, 8 aserciones endurecidas verificadas por mutación (11 mutaciones, todas rompen su prueba), `cargaDeEntrada.ts` extraído por la regla de 200 líneas. Ruta: delegada (escritor). Evidencia: RED en cada comportamiento; padre: `pnpm test` completo con base local 428 archivos/2226 tests, `pnpm check` exit 0. Decisiones: el aviso `?ok=` que se repite al recargar queda ACEPTADO (confirmación sin estado); el detalle de eventos del historial se difiere a un PR aparte (cambio de datos). Commit: 1ca5dff. Revisión nativa (rango 28e25ed..1ca5dff, 579 líneas): consentimiento concedido, aprobada, acuse quemado; frontera revisada = 1ca5dff. Advertencias aceptadas: (a) las degradaciones de conteo y de migaja capturan cualquier error (también permisos), con log saneado, siguiendo el precedente de `contarRecibidos`: la autorización y el tenant los resuelve `withTenant` en servidor y cualquier fallo se ve en el log; (b) `domicilios/page.tsx` sin prueba directa de ramas: el comportamiento lo cubre `estadoDeLista` (recorta y trata vacío como sin filtro); (c) `as never[]` en el fixture de `contextoDeCalle.test.ts`: tipar con el tipo real en una pasada futura. Datos demo: no quedan lugares "Prueba" (verificado con la búsqueda `?q=Prueba`).
- [x] U6 Historial de calle: título con el nombre de la calle, migaja Territorio > cadena de lugares > calle > Historial, "Volver a la calle", eventos como lista con ícono propio por naturaleza, fecha (`shared/lib/fecha`) y detalle fijo en español, enlaces "Ver reporte"/"Ver intervención" por id, vacío con ícono. Ruta: delegada (escritor). Evidencia: RED 9 fallos; escritor: `pnpm test` 426 archivos/2215 tests, `pnpm check` exit 0; padre: 152 tests de unidad pasan (la integración requiere env), check exit 0; capturas revisadas. LÍMITE DE DATOS: `EntradaDeHistorial` solo trae `{ id, naturaleza, ocurridoEn, precision }`: sin nombre anterior/nuevo, sin coordenadas, sin folio, sin lugar anterior/nuevo. Mostrarlos exige cambio de capa de datos (eventos de territorio, `EventoEstructuralDeCalle`, `EntradaDeHistorial`, `ReporteParaHistorial` con folio): decisión pendiente del usuario. Commit: 28e25ed. Revisión nativa (rango d8378fc..28e25ed, 502 líneas): consentimiento concedido, aprobada, acuse quemado; frontera revisada = 28e25ed. Advertencias para U7: (a) la página de historial ahora depende de `callePorId` y `listarLugares`: probar y definir qué pasa si fallan o se deniegan, y evaluar no cargar todos los lugares; (b) fijar con prueba el límite de 16 niveles de la cadena de migaja; (c) la aserción de "Volver a la calle" es un regex laxo: asegurar que es un ancla con esa etiqueta; (d) las aserciones negativas de `HistorialDeCalle.detalle.test.tsx:52-58` y `:83-86` pasan con render vacío: comprobar antes que las frases existen; (e) la fecha "22 sep 2026" depende del ICU: hacerla robusta; (f) `/intervenciones/[id]` existe (verificado por el escritor).

## Criterios de aceptación

- Capturas a 1366×768 y 390×844 de cada pantalla tocada sin regresiones y sin desbordes.
- Un operador distingue sin leer la acción principal de la baja; ninguna alta termina sin confirmación; el contador de pestañas coincide con la tabla que muestra.
- Nada bloquea la captura (principio 3); errores en español diciendo qué hacer.

## Progreso

U1 a U7 hechas. Revisión nativa aprobada y con acuse en U1, U3, U4, U5, U6 y U7; U2 sin acuse (stop terminal `captured_artifacts_unverifiable`; su único hallazgo fue un falso positivo ya corregido). Plan guardado en Engram (`odd/territorio-ux/plan`).

## Estrategia de entrega

Un solo PR hacia `main` con un commit por tarea; la revisión nativa corre por rango acotado (base = última frontera revisada).

## Siguiente paso

PR hacia `main` (decisión del usuario).

## Ronda 1 del revisor de IA en CI (PR #94)

Falló solo "Revisión de IA" con tres hallazgos reales contra las reglas del proyecto: `contextoDeCalle` de 46 líneas, `armarArbol` de 43 líneas (tope 30) e ids `string` sueltos en `contextoDeCalle` donde corresponde `LugarId`. Corregidos sin cambio de comportamiento. Otras funciones no JSX de más de 30 líneas en archivos tocados por la rama, ya existentes y no marcadas en la ronda 1: `cargaDeTerritorio.ts:96` (36), `lectorDeContenidoDeLugaresSql.ts:25` (43), acciones `altaDeCalle` (32), `altaDeDomicilio` (47), `altaDeLugar` (36), `corregirDomicilio` (51), `darDeBajaLugar` (33), `reparentearLugar` (37), `volverAlArbol:13` (33) y `vistaDePanel.ts:39` (48). Si la ronda 2 marca alguna, decide una persona (regla de dos rondas de CLAUDE.md).

## Ronda 2 del revisor de IA en CI (PR #94)

Trajo tres hallazgos distintos a los de la ronda 1; por la regla de dos rondas se detuvo y el usuario decidió corregirlos y correr una tercera. Verificados como reales: dos comentarios que este mismo PR dejó falsos (`volverAlArbol.ts`: el éxito sí redirige con clave; `contenido.ts`: `TabDeDomicilios` ya usa `domiciliosDelSubarbolDe`) y `contarPorLugar` de unas 40 líneas (la consulta SQL va ahora en la constante `CONSULTA_DE_CONTENIDO`). Corregidos; pruebas de unidad, integración y aislamiento de la consulta pasan. Si la ronda 3 trae hallazgos nuevos, se detiene y decide una persona.

## Ronda 3 del revisor de IA en CI (PR #94)

Trajo dos hallazgos nuevos; el usuario eligió corregir ambos. (1) La consulta de conteo inflaba domicilios ante un ciclo de `padre_id` (la CTE siembra todos los lugares y `count(*)` repetía el domicilio): ahora `count(DISTINCT dom.id)`, con prueba de integración que cierra el ciclo con un UPDATE bajo `withTenant` (el rol owner no puede: `lugares` tiene FORCE RLS con políticas `TO xula_app`) y que falló con `expected 4 to be 1` antes del arreglo. (2) Los `catch` amplios (antipatrón 14) de `contarSinRomper`, `lugaresDeLaMigaja` y `contarRecibidos`: ahora relanzan `NoAutorizadoError` (`@/shared/lib/errores`) y degradan solo con los demás fallos, con prueba por cada uno. Si la ronda 4 trae hallazgos nuevos, se propone parar y cerrar con revisión humana.

## Ronda 4 del revisor de IA en CI (PR #94)

Un hallazgo nuevo: `cadenaDe` (`cabeceraDeLugar.tsx`) sube por `padreId` sin guarda y "colgaría" con un ciclo. Verificación: NO es alcanzable con datos de `subarbol` (la consulta excluye la raíz del resultado y un nodo tiene un solo padre, así que cualquier ascenso termina en la raíz, que no está en el mapa); en la ronda 3 el revisor había dicho lo mismo. Se agregó igualmente una guarda de visitados (consistente con `cadenaDeZona`) y una prueba de ciclo directo sobre `cabeceraDeLugar` por decisión del usuario; sin RED observable porque el bucle original no termina. Si la ronda 5 trae hallazgos nuevos, ya no se corrige más: decide una persona cómo cerrar.

## Ronda 5 del revisor de IA y comentarios de Codex (PR #94)

Codex dejó 4 comentarios P1 sobre el commit 73c7020 (funciones de más de 30 líneas en `armarArbol`, `contextoDeCalle` y `contarPorLugar`, y un comentario falso de `contenido.ts`): ya estaban corregidos en f34bdab y 67d57b8; verificado contra el código actual (10, 24 y 11 líneas de código). La ronda 5 del revisor de IA pidió: una sola explicación de `NoAutorizadoError` (ahora vive en `shared/lib/errores.ts` y los tres sitios apuntan a ella), quitar un `as never` de `territorioU3.test.tsx` (usa `comoDomicilioId`) y una aserción de fecha independiente del ICU (compara con el helper del propio componente; verificada con una mutación). Respuestas en los hilos con el commit como evidencia.

## Ronda 6 del revisor de IA (PR #94)

El revisor pidió que toda función que no sea JSX tenga 30 líneas de código o menos; el usuario eligió dividir las 8 señaladas. `pestanasDePanel` (48) se apoya en `pestanaDeCuenta` y `hrefDePanel`; `rutaDelArbol` (33) recorre una lista de claves; las seis acciones (32 a 51) comparten `ejecutarEnContexto` (sesión, caso de uso con vuelta al árbol si falla, repintado) y las dos de domicilio extraen `comandoDe`. Sin cambio de comportamiento: el orden validar, navegación, sesión, caso de uso, revalidar y redirigir es el mismo y las pruebas existentes pasan sin tocarlas. Mayor resultado: 26 líneas de código (`reparentearLugarAction`).

## Cierre de la deuda de U5

Los tres puntos del "Pendiente (requiere datos)" de la rebanada U5 quedaron
resueltos:

- **`raizId` en el registro**: la consulta lo deriva subiendo por `padre_id`
  con tres `LEFT JOIN` (el `RANGO` 0..3 de `tipoDeLugar.ts`: de una manzana a
  su cabecera hay tres aristas) y `COALESCE` se queda con el ancestro más alto
  disponible. `hrefDeDomicilioDelRegistro(fila)` ya no recibe contexto ni
  puede devolver `undefined`: la fila siempre enlaza, con o sin filtro de
  asentamiento. Lo prueba una integración con la cadena real
  manzana→sector→colonia→cabecera.
- **Colonia vacía en la entrada**: el select se ofrece **deshabilitado**, con
  "Sin colonias registradas" y la salida nombrada, en vez de ocultarse.
  Ocultarlo haría que la forma del formulario dependiera de los datos y que la
  operadora no descubriera el campo; un control vacío sin frase se lee como
  roto.
- **Selector de calle con búsqueda**: `SelectorDeCalleConBusqueda` es una hoja
  `use client` mínima con un `type="search"` sin `name` que acorta la lista del
  `<select name="calleId">`. El SSR emite todas las opciones, así que sin
  JavaScript se elige igual. Va sólo en el campo Calle obligatorio.

## Cierre del limite de datos de U6

El "LÍMITE DE DATOS" de U6 queda resuelto: \`eventos_de_calles\` guarda ahora el
antes y el después de cada cambio estructural (migración \`0019\`, ocho columnas
nullable, sin tocar RLS, política ni \`GRANT\`).

- **Qué se guarda**: nombre anterior y nuevo, coordenadas anteriores y nuevas,
  y los **ids** de lugar anterior y nuevo. Los ids y no los nombres porque el
  nombre se resuelve al leer con dos \`LEFT JOIN lugares\` bajo RLS: así un
  lugar dado de baja sigue nombrando, y el evento no se queda con un nombre
  viejo. Sin \`FOREIGN KEY\` a propósito: \`scripts/migrar-sectores-a-zonas.sql\`
  borra \`lugares\` físicamente y una clave lo bloquearía.
- **Quién lo escribe**: \`renombrarCalle\`, \`reparentearCalle\` y \`ubicarCalle\`,
  dentro de la misma transacción y leyendo el «antes» de la fila bloqueada. No
  se inventa el valor previo.
- **Cómo se lee**: el discriminador de payload mira los **ids guardados**, no
  los nombres resueltos. Un lugar de otro municipio o borrado no resuelve el
  join y entonces el lado del cambio queda en \`null\` explícito —la prueba de
  aislamiento lo pinea con \`toStrictEqual\`—; antes se clasificaba como «evento
  sin payload» y la vista recibía un \`undefined\`.
- **Los eventos anteriores a la migración** no tienen de dónde sacar el cambio:
  siguen mostrando naturaleza y fecha. Ese dato no existe y no se reconstruye.
