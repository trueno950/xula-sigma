# Refinamiento de UX del módulo Intervenciones

Sexta parada del recorrido de pulido pantalla por pantalla, después de
Reportes (`reportes-ux.md`), Padrón (`padron-ux.md`), Constancias
(`constancias-ux.md`), Territorio (`territorio-ux.md`) y Mapa
(`mapa-protagonista.md`).

**Método** (el mismo de los anteriores):
1. Auditoría con capturas a 1440 y 390.
2. El usuario elige qué se arregla.
3. Las pantallas que cambian de estructura pasan antes por gentle design:
   dos direcciones, y el usuario elige con «Implement».

Los tokens salen de `design/system.md`; se reusan los patrones de listado,
acciones y filtros de los tracks anteriores.

**Dónde se trabaja:** rama `feat/intervenciones-ux`; capturas en
`/tmp/ux-intervenciones/`.

## Specs

Cada spec cita el hallazgo de la auditoría (L2) que el usuario aprobó en L3.

**Bandeja `/intervenciones`**
- **S1 (B1)** — En el celular los filtros no ocupan media pantalla: van en
  «Filtros (N)» plegable, como la bandeja de reportes, con chips para
  quitar cada uno; las filas son compactas y tocables.
- **S2 (B2)** — La bandeja dice cuántas hay: conteos por estado y el total
  mostrado. El orden es explícito y coincide con la fecha que se ve.
- **S3 (B3)** — Cada fila se distingue de otra igual: lleva un
  identificador estable y un trozo de la descripción, y dice si viene de
  un reporte.
- **S4 (B4)** — La etiqueta accesible de la fila incluye tipo, estado,
  lugar y fecha.
- **S5 (B5)** — El vacío por filtro usa las etiquetas («Cancelada»,
  «Fuga»), nunca el valor de enum.

**Alta `/intervenciones/alta`**
- **S6 (A1)** — La calle depende del lugar: solo se ofrecen calles del
  asentamiento elegido, y el servidor rechaza una calle de otro
  asentamiento con un mensaje para la operadora, sin guardar nada.
- **S7 (A2)** — El mínimo de la descripción se explica en español antes de
  escribir, y el error sale en español, nunca el mensaje del navegador.
- **S8 (A3)** — Si el servidor rechaza el alta, el formulario vuelve con lo
  capturado (borrador en cookie, como territorio), no vacío.
- **S9 (A4)** — Sin lugar no se ofrece «Sin calle»; los obligatorios se
  marcan; el aviso «No anote nombres…» vive en un solo lugar.

**Detalle `/intervenciones/[id]`**
- **S10 (D1)** — El título lleva el identificador de la intervención y el
  estado va como insignia, la misma de la bandeja.
- **S11 (D2)** — El detalle muestra el historial de cambios que guarda
  `revisiones_de_intervenciones`: qué cambió, quién y cuándo.
- **S12 (D3)** — Las acciones tienen jerarquía: el siguiente paso es la
  acción primaria; «Cancelar» va plegado al final, como peligro, y pide
  confirmación.
- **S13 (D4)** — «Corregir intervención» va plegada, no compite con las
  acciones.
- **S14 (D5)** — La ficha agrupa los datos del hecho y deja los metadatos
  de sistema aparte; todas las fechas con el mismo formato.
- **S15 (D6)** — Con calle, el detalle ofrece «Ver historial de la calle» y
  «Ver en el mapa», y el lugar es un enlace.

**Programar obra (detalle del reporte)**
- **S16 (P1)** — Al programar, la pantalla confirma con un aviso y un
  enlace «Ver la obra»; si el reporte ya tiene obra, la muestra.
- **S17 (P2)** — El formulario dice que la fecha será hoy y que el lugar se
  copia del reporte.

Fuera de alcance (baja, anotados): B6, B7, B8, D7, D8, P3.

## Tasks

- [x] **T0** auditoría con capturas de bandeja, alta y detalle — worker — commit: (sin cambios de código; capturas en `/tmp/ux-intervenciones/`)

- [x] **T1** (S1-S5, S10-S15) diseño en gentle design: dos direcciones para la bandeja y dos para el detalle; el usuario elige — design — commit: (bandeja en L5, detalle en L12)
- [x] **T2** (S6) la calle depende del lugar, en la pantalla y en el servidor — worker + verify, commit propio (riesgo: dato guardado sin validar) — commit: 35ab05c
- [x] **T3** (S7-S9) alta: mensajes en español, borrador y orden de campos — worker — commit: 1b52723
- [x] **T4** (S16-S17) programar obra: confirmación y aclaraciones — worker — commit: 6f39042 (E2E `e2e/programarObra.spec.ts` por correr; nota de AGENTS.md por aplicar después de T2)
- [x] **T5** (S1-S5) bandeja según `design/intervenciones-bandeja/02-tablero-por-estado.html` (L5) — worker, worktree `.pi/wt-diseno` — commit: 8847551 en `feat/intervenciones-ux-diseno`, integrado por cherry-pick en `feat/intervenciones-ux`
- [x] **T6** (S10-S15) detalle según `design/intervenciones-detalle/01-ficha-historial-y-acciones.html` (L12) — worker — commit: f0b70b3
- [x] **T7** (S1-S17) verificación, PR y merge — verify — commit: (ver L14)

## Log

- **L1** — Al cerrar el mapa (PR #152) y la spec de reportes (PR #153), el
  usuario pidió: «luego sigue con el sieguiente modulo». Eligió
  «Intervenciones (recomendado)» y «Auditoría y luego arreglos
  (recomendado)».
- **L2** — Auditoría (T0) con 23 capturas en `/tmp/ux-intervenciones/`,
  sembrando por la UI del demo 13 intervenciones (7 planificadas, 2 en
  ejecución, 2 finalizadas, 2 canceladas; 2 programadas desde reportes).
  23 hallazgos:
  - **Bandeja:** B1 filtros sin pliegue en el celular (alta), B2 sin
    conteos ni total y orden por captura con fecha de ocurrencia visible
    (alta), B3 filas indistinguibles sin folio (alta), B4 etiqueta
    accesible incompleta, B5 vacío por filtro en enum, B6 sin buscador ni
    acción en el vacío, B7 tres nombres para dos conceptos, B8 párrafo
    repetido.
  - **Alta:** A1 la calle no depende del lugar y el servidor guarda una
    calle de otro asentamiento (alta; `partesDe` de
    `src/modules/territorio/infrastructure/lectorDeUbicacionesSql.ts`, vía
    `src/modules/intervenciones/infrastructure/lectorDeUbicacionesPorTerritorio.ts`),
    A2 mensaje de longitud en inglés (alta), A3 el formulario vuelve vacío
    tras un rechazo (alta), A4 «Sin calle» antes de lugar y obligatorios
    sin marcar.
  - **Detalle:** D1 sin identificador ni insignia (alta), D2 sin historial
    aunque `revisiones_de_intervenciones` lo guarda (alta), D3 acciones sin
    jerarquía ni confirmación (alta), D4 corrección siempre abierta, D5
    ficha con metadatos y dos formatos de fecha, D6 sin enlaces a calle y
    mapa, D7 tarjeta vacía en estado terminal, D8 `<title>` genérico.
  - **Programar obra:** P1 no confirma ni enlaza la obra creada (alta), P2
    no dice que copia lugar y fecha, P3 dos controles homónimos.
  - Candidatas a gentle design: bandeja (B1-B4) y detalle (D1-D7).
  - No comprobado: roles OPERADOR/CONSULTA, sin JavaScript, teclado,
    contraste.
- **L3** — El usuario eligió «Alta y media (recomendado)» y «Sí, bandeja y
  detalle (recomendado)»: los 17 hallazgos de prioridad alta y media;
  bandeja y detalle pasan por gentle design; alta y programar obra, directo.
- **L4** — T1: direcciones de diseño en `design/intervenciones-bandeja/`
  (`01-pestanas-y-fila-con-identificador.html`,
  `02-tablero-por-estado.html`) y `design/intervenciones-detalle/`
  (`01-ficha-historial-y-acciones.html`, `02-linea-de-vida.html`).
  - El identificador visible (`INT-3F1C`) es el prefijo del `id`, no un
    folio: el módulo no tiene folio. Un folio consecutivo por municipio
    sería una tarea aparte.
  - El historial afirma «antes → después» solo donde la revisión lo
    sostiene: `revisiones_de_intervenciones` guarda `valores_anteriores`,
    `usuario_id` y `ocurrido_en`.
- **L5** — El usuario eligió desde el lienzo el diseño de la bandeja:
  «Implement the design artboard
  design/intervenciones-bandeja/02-tablero-por-estado.html».
  - `01-pestanas-y-fila-con-identificador.html` queda como alternativa.
  - T5 corre en el worktree `.pi/wt-diseno` porque T2 sigue tocando la
    infraestructura del módulo; se integra a `feat/intervenciones-ux`.
- **L6** — T5 terminado en `8847551`, en `.pi/wt-diseno`.
  - Unit 186 en verde; integración de intervenciones 60/60, con la nueva
    prueba de aislamiento de conteos y orden; reglas sin hallazgos.
  - Desvíos del artboard: sin buscador (B6 fuera de alcance), la tarjeta
    no nombra la calle (pediría un lector nuevo), «Ver las N …» lleva a
    `?estado=` sin tope.
  - El commit incluye los artboards de `design/`, por eso pasa de 400
    líneas.
  - E2E `e2e/intervencionesBandeja.spec.ts` pendiente de correr al integrar.
- **L7** — Verificador independiente sobre T2: bloqueante. La regla en
  `partesDe` cambia el contrato de territorio (`ubicacionDeLugar` de
  integración falla) y, tras `reparentearLugar`, impediría corregir
  intervenciones guardadas. Se mueve a una comprobación solo al guardar.
- **L8** — T4 terminado en `6f39042`. Decisión del orquestador: si el
  reporte ya tiene obra, se muestra arriba del formulario sin quitarlo
  (S16 pide mostrarla, no impedir otra). El `?obra=` solo se confirma si
  el id está entre las obras leídas bajo RLS (`obraConfirmada`). Unit 167
  en verde; pruebas de página en `page.obra.test.tsx` por el límite de 200
  líneas. T2 relanzado con la regla solo al guardar (L7).
- **L9** — T2 rehecho y re-verificado sin bloqueos (`35ab05c`): la regla
  vive en `territorio/application/calleDelLugar.ts`, solo al guardar;
  `partesDe` intacto. Unit 1496, integración 21 en verde.
  - Seguimientos fuera de S6: `programarObraDeReporte` copia la calle del
    reporte sin `calleDelLugar`, y el alta de reportes sigue aceptando una
    calle de otro asentamiento (ya pasaba antes); sin JavaScript el alta
    ofrece todas las calles agrupadas por asentamiento y el servidor
    rechaza la incoherente.
  - T5 integrado por cherry-pick sin conflictos.
- **L10** — Integración verificada en `feat/intervenciones-ux`: unit 1570,
  E2E completa 180/180. La E2E de programar obra usaba el nombre de la
  calle como id del reporte y agotaba el límite de acceso; corregida en
  `31360e0`. Handoff de la bandeja marcado como implementado. T3 en curso.
- **L11** — T3 terminado en `1b52723`.
  - S7: sin `minLength`; el mínimo lo exige el servidor con mensaje en
    español y una ayuda visible antes de escribir (un mensaje del
    navegador en español pediría JavaScript).
  - S8: borrador en cookie generalizado a `src/shared/ui/borradorEnCookie.ts`;
    territorio queda como adaptador con su API y su comportamiento
    (comparación diferencial sin diferencias).
  - S9: «Elija primero el lugar» en vez de «Sin calle»; línea de
    obligatorios; `avisoDePrivacidad.tsx` único.
  - E2E: alta 3/3, ubicación 3/3, borrador de domicilio 2/2,
    territorio domicilios 5/5.
  - Seguimientos: la corrección y programar obra conservan `minLength`;
    `e2e/territorioDomicilios.spec.ts` puede fallar si la marca hex
    contiene «101» (~1 en 1000 corridas).
- **L12** — El usuario eligió desde el lienzo el diseño del detalle:
  «Implement the design artboard
  design/intervenciones-detalle/01-ficha-historial-y-acciones.html».
  - `02-linea-de-vida.html` queda como alternativa.
  - Seguimiento de L9 que entra aquí: la corrección (D4, plegada) usa el
    aviso de privacidad único y redacta `CalleFueraDelLugarError`.
- **L13** — T6 terminado en `f0b70b3`. Unit 274, integración 6/6 (historial
  aislado por municipio), E2E completa 185/185.
  - El historial muestra las correcciones; los cambios de estado no dejan
    revisión (`aplicarTransicion` solo actualiza `estado`), y la bitácora
    guarda quién y cuándo pero no de qué estado a cuál. Seguimiento:
    escribir una revisión en cada transición.
  - `e2e/calles.fixture.ts` reusa la cabecera viva en vez de insertar una
    segunda (`lugares_una_cabecera`).
  - Una E2E con `next dev` corriendo a la vez tarda ~14 min en vez de ~8.
- **L14** — T7: verificador independiente del track completo, S1-S17
  cumplidas, sin bloqueos. Unit 3407, integración 163, typecheck y reglas
  limpios; la E2E completa ya había pasado 185/185 en `f0b70b3`.
  - Corregidos al cierre: el comentario de `TableroDeIntervenciones` que
    prometía «sin tope» y la nota de AGENTS.md que apuntaba al archivo
    equivocado del borrador.
  - Seguimientos: prueba de aislamiento para `obrasDeReporteSql`; cambios
    de estado en el historial (L13); regla de la calle en reportes y
    programar obra (L9); `minLength` de programar obra (L11); la marca
    hex de `territorioDomicilios.spec.ts` (L11).
