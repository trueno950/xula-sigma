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

- [x] **T1** · S1,S2,S4 (residentes, borrador) · delegado (paralelo) — Página y panel de territorio. Commit: `90d7452`.
- [x] **T2** · S3,S4 (destino del reparenteo) · delegado (paralelo) — Búsqueda sin acentos y bloqueo del destino. Risk: item 4. Commit: `2b896d8`; test de reportes en el commit de cierre.
- [x] **T3** · S5 · delegado (paralelo) — Ayudante de nombre completo en padrón. Commit: `22c7dab`.
- [x] **T4** · S1-S5 · suite, E2E, verificador (item 4), PR con issue aprobado.

## Log

- **L1** — 2026-11-06. Pedido textual: «corrige los 5», sobre la lista de
  pendientes 1-5 citada en S1-S5. Decisión de S1: «Quitar el Suspense
  (Recomendado)». Escritores en paralelo con superficies disjuntas (motivo:
  tres unidades independientes y contexto largo de la sesión principal).

- **L2** — 2026-11-06. Escritores. T1: sin `Suspense` (`TerritorioCargado` recibe `carga`; `EsqueletoDeTerritorio` borrado), E2E nuevo `territorioSinJavaScript` con alta de domicilio sin JavaScript hasta la base; panel de domicilio primero en el HTML y a la columna derecha desde 1024 px; falla de residentes con «No se pudo cargar quién vive aquí. Recargue la página.» y log solo con `domicilioId` y `datosSegurosDeError` (`NoAutorizadoError` se propaga); el borrador marca `recortado` y el formulario avisa «Parte de lo capturado era demasiado largo y se recortó; revise los campos.», porque ni el formulario ni Zod ni la base limitan `numero` ni `referencia`. RED/GREEN por regla salvo los E2E nuevos (sin RED observado). T2: `textoDeBusquedaSql.ts` compara como `normalizarParaBusqueda` (sin `unaccent`, que convierte la ñ en n), sin migración; `reparentearLugar` bloquea el lugar y el nuevo padre en orden de id y rechaza un padre dado de baja con `NoEncontradoError`; RED de la carrera observado con concurrencia real. T3: las cuatro copias eran `[nombres, primerApellido, segundoApellido].filter(Boolean).join(" ")`; `nombreCompletoDe` en el dominio de padrón; el padre cambió además la quinta copia, `padron/ui/ListaDeSugerencias.tsx`. Comprobación del padre: `tsc` exit 0 y los tres commits pasaron el pre-commit.

- **L3** — 2026-11-06. Verificador independiente (`f478433..2b896d8`): S1-S5 cumplen; sin camino de deadlock (solo `reparentearLugar` toma dos lugares, ordenados; el resto toma uno, después de las calles); concurrencia 5/5 corridas; helper SQL igual a `normalizarParaBusqueda` en 19 de 20 cadenas (la diferencia es un macrón, fuera del español); `pnpm check` exit 0; suite completa 504 archivos y 2606 tests; E2E 27/27; diferencial unitario sin regresiones. Hallazgo de alcance: la consulta es compartida y la búsqueda sin acentos llega también al buscador de direcciones de reportes y al selector de la mudanza. Decisión del usuario: «Aceptarlo en los tres (Recomendado)». Test nuevo `reportes/busquedaDeDireccionesSinAcentos.integration.test.ts`: RED con el `registroDeDomiciliosSql.ts` de la base («jose perez» no encuentra «José Pérez»), GREEN 3/3. Advertencias: en escritorio el panel de domicilio pasa a la columna ancha izquierda, igual que el de calle; el padre anterior de un reparenteo no se bloquea (una baja concurrente lo rechaza igual).
