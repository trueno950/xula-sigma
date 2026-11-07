# Territorio: pendientes de la auditoría

Corregir los cinco pendientes que quedaron tras los cuatro bloques de la
auditoría de territorio. Rama `fix/territorio-pendientes`, un PR.
Runner: Vitest (`pnpm test`, integración sobre `xula_test`), Playwright y `pnpm check`.

## Specs

- **S1.** «`/territorio` no funciona sin JavaScript, porque el contenido se
  transmite dentro de `<Suspense>` y sin script queda oculto.» Decisión del
  usuario: «Quitar el Suspense (Recomendado)» — «La página espera los datos
  antes de mandar el HTML, como /territorio/zonas. Funciona igual con y sin
  JavaScript; se pierde el esqueleto mientras carga».
- **S2.** «En móvil, el panel del domicilio sigue saliendo después de la
  lista.» El panel de domicilio abierto va primero en móvil, como el panel de
  calle (L5 de `territorio-visual.md`).
- **S3.** «La búsqueda de Domicilios no ignora acentos («Jose» no encuentra
  «José»).» El `?q=` de Domicilios (pestaña y `/territorio/domicilios`) ignora
  mayúsculas y acentos, como la de Calles.
- **S4.** «Advertencias menores de las revisiones: si falla la lectura de
  residentes, no carga el panel del domicilio; el borrador se recorta sin
  avisar; y mover un lugar no bloquea el lugar de destino.»
- **S5.** «El nombre completo de una persona se arma igual en tres módulos
  (reportes, constancias, territorio); conviene un ayudante en padrón.»

## Tasks

- [ ] **T1** · S1,S2,S4 (residentes, borrador) · delegado (paralelo) — Página y panel de territorio.
- [ ] **T2** · S3,S4 (destino del reparenteo) · delegado (paralelo) — Búsqueda sin acentos y bloqueo del destino. Risk: item 4.
- [ ] **T3** · S5 · delegado (paralelo) — Ayudante de nombre completo en padrón.
- [ ] **T4** · S1-S5 · suite, E2E, verificador (item 4), PR con issue aprobado.

## Log

- **L1** — 2026-11-06. Pedido textual: «corrige los 5», sobre la lista de
  pendientes 1-5 citada en S1-S5. Decisión de S1: «Quitar el Suspense
  (Recomendado)». Escritores en paralelo con superficies disjuntas (motivo:
  tres unidades independientes y contexto largo de la sesión principal).
