# Territorio: búsqueda por calle y número, y vuelta de la mudanza

PR C de la auditoría de flujos del 2026-11-07. Rama
`feat/territorio-busqueda-y-mudanza`, un PR. Runner: Vitest (integración
sobre `xula_test`), Playwright y `pnpm check`.

## Specs

- **S1.** Hallazgo 11 de la auditoría: «"Calle 22 265" no da resultados»;
  en `/territorio/domicilios` «"22 265", "Calle 22 #265" y "265" devuelven 0
  filas»; en la ficha «"Calle 14 88" y "14 88"» fallan aunque la ayuda diga
  «calle, número, colonia». La búsqueda de domicilios compartida (registro,
  pestaña Domicilios, mudanza y reportes) parte la consulta en palabras,
  ignora `#` y signos sueltos, y exige que cada palabra coincida con la
  calle, el número, la colonia o el asentamiento, sin mayúsculas ni acentos
  como hoy. `/territorio/domicilios` usa esa búsqueda general en su campo
  principal (rotulado para calle y número), y el filtro de número sigue
  aparte.

- **S2.** Hallazgo 11: la entrada de `/territorio` solo busca lugares por
  nombre. La entrada ofrece además «Buscar domicilio» (calle y número), un
  formulario GET que lleva a `/territorio/domicilios?q=`, sin JavaScript.

- **S3.** Hallazgo 12: tras «Registrar un domicilio nuevo» desde la mudanza
  y guardarlo, la ficha dice «Búsquelo abajo para asignarlo» y el domicilio
  no queda elegido. La vuelta a la ficha lleva el id del domicilio nuevo
  (uuid validado, nunca la dirección en la URL) y el formulario de mudanza
  lo trae preseleccionado, con y sin JavaScript.

- **S4.** Hallazgo 17: la ficha escribe las residencias sin «#» («Calle 38
  157») mientras las listas dicen «Calle 22 #265-A». La ficha usa la misma
  etiqueta de domicilio que el resto.

## Tasks

- [x] **T1** · S1,S2 · delegado (paralelo) — Búsqueda por palabras y búsqueda de domicilio en la entrada. Commit: `4aa9181`.
- [x] **T2** · S3,S4 · delegado (paralelo) — Domicilio nuevo preseleccionado en la mudanza; etiqueta en la ficha. Commit: `9fcd88d`.
- [x] **T3** · S1-S4 · suite, E2E, revisión, PR con issue aprobado.

## Log

- **L1** — 2026-11-07. Pedido textual: «haz el merge y sigue con el PR C»,
  con el PR C descrito como «búsqueda por calle y número, y que el domicilio
  nuevo quede preseleccionado al volver a la mudanza». Pedido original en L1
  de `odd/tasks/territorio-acciones.md`. Efecto esperado y aceptado en L3 de
  `odd/tasks/territorio-pendientes.md`: la búsqueda compartida también
  cambia en reportes y mudanza.

- **L2** — 2026-11-07. T1: `busquedaPorPalabras.ts` parte la consulta (sin `#` ni `,`; separadores sueltos se descartan; un token de solo `%`/`_` se busca literal; tope de 6 palabras, las demás se ignoran) y cada palabra debe coincidir con calle, número, colonia o asentamiento, con parámetros y el mismo plegado; `/territorio/domicilios` manda `?q=` a esa búsqueda general («Buscar domicilio (calle y número)», chip «Búsqueda: …»); la entrada ofrece «Buscar domicilio» dentro de `<search>`. T2: `altaDeDomicilioAction` vuelve a la ficha con `?ok=domicilio-creado&domicilio=<uuid>`; la ficha solo preselecciona un id que esté en sus domicilios cargados bajo RLS; mensaje «Domicilio registrado y elegido para la mudanza. Revise la fecha y guarde.»; las residencias de la ficha usan `etiquetaDeDomicilio`. `pnpm check` exit 0; suite completa 526 archivos y 2728 tests; E2E 34/34 (incluye la ida y vuelta de la mudanza). Revisiones aprobadas y reconocidas: T1 `review-5012ac0112d102ce`, T2 `review-4a7173f8ca7b9a92`, rama `review-78fa9203cfbd4910`.

- **L3** — 2026-11-07. Advertencia de la revisión: la ficha deja de usar el formato de la constancia, que antes se eligió para que la ficha no dijera una dirección y el documento otra. Decisión del usuario: «1», sobre «Como quedó (recomendado): la ficha muestra "Calle 38 #157, Centro, Motul", con el mismo formato de las listas, y la constancia impresa no cambia», «Volver atrás» y «Cambiar también la constancia». Otras advertencias: el tope de palabras es silencioso; `?q=` en el registro ahora es más amplio que el filtro de calle.
