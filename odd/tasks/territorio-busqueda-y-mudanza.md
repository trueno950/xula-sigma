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

- [ ] **T1** · S1,S2 · delegado (paralelo) — Búsqueda por palabras y búsqueda de domicilio en la entrada.
- [ ] **T2** · S3,S4 · delegado (paralelo) — Domicilio nuevo preseleccionado en la mudanza; etiqueta en la ficha.
- [ ] **T3** · S1-S4 · suite, E2E, revisión, PR con issue aprobado.

## Log

- **L1** — 2026-11-07. Pedido textual: «haz el merge y sigue con el PR C»,
  con el PR C descrito como «búsqueda por calle y número, y que el domicilio
  nuevo quede preseleccionado al volver a la mudanza». Pedido original en L1
  de `odd/tasks/territorio-acciones.md`. Efecto esperado y aceptado en L3 de
  `odd/tasks/territorio-pendientes.md`: la búsqueda compartida también
  cambia en reportes y mudanza.
