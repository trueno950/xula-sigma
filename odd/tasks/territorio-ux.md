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

- [x] U1 Base compartida: botón `peligro` con contorno (ya existía relleno), confirmación de éxito `?ok=` con 12 claves cerradas emitidas por las 12 acciones existentes (sin acción nueva en la tabla de excepciones de AGENTS.md), título con el nombre del lugar y etiqueta de tipo, migaja con primer eslabón "Territorio". Ruta: delegada (escritor). Evidencia: RED en peligro/ok/bajas (sin RED en redirects de acciones y tests de página); escritor: `pnpm test` 409 archivos/2098 tests, `pnpm check` exit 0; padre: 581 tests de unidad de `shared/ui`, `modules/territorio` y `(panel)/territorio` pasan, `pnpm check` exit 0; capturas revisadas. Nota: el escritor dejó datos de prueba en la base demo (lugares "Manzana Prueba U1*").
- [ ] U2 Entrada y árbol: buscador de lugares, colapso, "N lugares más adentro" como enlace, entrada visible a `/territorio/domicilios`. Cuentas por fila: pendiente de decisión (consulta nueva).
- [ ] U3 Cabecera de lugar y pestañas: contador de calles correcto (heredadas), pestañas con desplazamiento visible en móvil, tipo de lugar como etiqueta legible.
- [ ] U4 Calles: panel de calle en lugar fijo, fila seleccionada resaltada, acciones jerarquizadas, enlaces a mapa e historial.
- [ ] U5 Domicilios: filas con enlace, alta con búsqueda de calle, quitar la columna repetida.
- [ ] U6 Historial de calle: nombre de la calle en el título. Detalle de eventos: pendiente de decisión (verificar payload).

## Criterios de aceptación

- Capturas a 1366×768 y 390×844 de cada pantalla tocada sin regresiones y sin desbordes.
- Un operador distingue sin leer la acción principal de la baja; ninguna alta termina sin confirmación; el contador de pestañas coincide con la tabla que muestra.
- Nada bloquea la captura (principio 3); errores en español diciendo qué hacer.

## Progreso

U1 hecha. Plan guardado en Engram (`odd/territorio-ux/plan`).

## Estrategia de entrega

Un solo PR hacia `main` con un commit por tarea; la revisión nativa corre por rango acotado (base = última frontera revisada).

## Siguiente paso

Delegar U2 (preguntar antes si las cuentas por fila del árbol pueden usar una consulta nueva).
