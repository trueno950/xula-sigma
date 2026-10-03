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
- [x] U4 Calles: maestro-detalle (tabla y panel pegajoso a `lg`, fragmento `#panel-de-calle` en móvil), fila seleccionada con `aria-current`, acciones como acordeón nativo exclusivo (`details name`), baja con `peligro` separada y al final, enlaces a historial y mapa (el mapa no acepta parámetros: `/mapa-operativo` solo lee tipo/estado/área). Ubicar se abre por defecto solo sin punto; con punto es un enlace a `?accion=ubicarCalle` porque Leaflet mide 0px dentro de un `details` cerrado. Ruta: delegada (escritor). Evidencia: RED 10/14 en `callesU4.test.tsx`; escritor: `pnpm test` 418 archivos/2157 tests, `pnpm check` exit 0; padre: 396 tests de territorio/shared pasan, check exit 0; capturas revisadas. Copia unificada a usted ("Toque el mapa…", "Puede seguir agregando otro") para coincidir con la voz del producto. Pendiente: `SelectorDePunto` conserva su copia ("Haga clic…", ya en usted).
- [ ] U5 Domicilios: filas con enlace, alta con búsqueda de calle, quitar la columna repetida.
- [ ] U7 Pulido de revisiones (ver notas de U1 y U3): degradar el conteo si falla, pruebas de cableado y aserciones específicas, aviso `?ok=` que no se repite al recargar (evaluar), limpiar datos de prueba de la base demo.
- [ ] U6 Historial de calle: nombre de la calle en el título. Detalle de eventos: pendiente de decisión (verificar payload).

## Criterios de aceptación

- Capturas a 1366×768 y 390×844 de cada pantalla tocada sin regresiones y sin desbordes.
- Un operador distingue sin leer la acción principal de la baja; ninguna alta termina sin confirmación; el contador de pestañas coincide con la tabla que muestra.
- Nada bloquea la captura (principio 3); errores en español diciendo qué hacer.

## Progreso

U1 a U4 hechas. Plan guardado en Engram (`odd/territorio-ux/plan`).

## Estrategia de entrega

Un solo PR hacia `main` con un commit por tarea; la revisión nativa corre por rango acotado (base = última frontera revisada).

## Siguiente paso

Delegar U5 (domicilios).
