# Colores de marca del ayuntamiento

Pantalla `/marca`: hoy solo deja subir el escudo, aunque `ayuntamientos.marca` ya guarda, valida y pinta `primario`, `primarioTexto` y `secundario`. Lo que falta es poder elegirlos. Rama `feat/marca-colores`, desde `main` en `fa1464e`.

## Specs

- **S1** — «Paleta sugerida + color libre»: unos 8 colores primarios ya probados con buen contraste, que se eligen de un clic. Si ninguno sirve, un selector de color libre. Lo que se elija se valida en el servidor con `validarMarca` (`src/shared/marca/validacion.ts`).
- **S2** — «Automático: blanco o negro»: el color del texto sobre el primario no es un campo. El servidor escoge blanco o negro, el que tenga más contraste con el primario elegido, y lo guarda en `primarioTexto`.
- **S3** — También se elige el color `secundario` (`--accent`), con la misma paleta y el mismo selector libre. No tiene reja de contraste (ver `validacion.ts`).
- **S4** — «Muestra en vivo + funciona sin JS»: con JavaScript, un botón y un encabezado de ejemplo cambian al momento mientras se elige. Sin JavaScript, el formulario se guarda igual con un POST nativo y la muestra se ve después. La isla cliente solo pinta la muestra; nunca intercepta la acción de guardar.
- **S5** — «Sí» al botón para volver a los colores por defecto de XULA: borra `primario`, `primarioTexto` y `secundario` de la marca y conserva el escudo.
- **S6** — Solo un rol con `puedeCambiarMarca` puede guardar o restablecer; cualquier otro recibe `NoAutorizadoError`. El ayuntamiento sale del contexto del servidor, nunca del formulario. Los colores se aplican desde el servidor (`variablesDeMarca` en el layout, antipatrón 13 de `AGENTS.md`).
- **S7** — Guardar colores conserva el escudo, y cambiar el escudo conserva los colores: cada escritura compone sobre la marca existente y valida el resultado completo antes de guardar.
- **S8** — Los errores se redactan para la operadora, en español, sin el texto de la excepción. Las acciones van por `<form action>` nativo + `redirect` con `?error=`, y se agregan a la tabla de excepciones de `AGENTS.md` con su nota.

## Tasks

- [x] **T1** (S1-S3, S5-S7) casos de uso `cambiarColores` y `restablecerColores`, con texto automático, más tests unitarios y de integración/aislamiento — worker — commit: `4bc09db`
- [x] **T2** (S1, S3, S4, S5, S8) formulario con paleta, selector libre, muestra en vivo y botón de restablecer; acciones, página `/marca`, `AGENTS.md` y E2E con y sin JS — worker — commit: `3e3b994`, corrección `a4bdd42`
- [ ] **T3** (S1-S8) verificador independiente, revisión, PR y merge — verify — commit:

## Log

- **L1** — 2026-11-15. Pedido del usuario: «mejora el modulo de cutomizacion donde subimos el logo y no hay nada para elegir los colored»
- **L2** — 2026-11-15. Decisiones del usuario: «Paleta sugerida + color libre (Recomendado)»; «Automático: blanco o negro (Recomendado)»; «Muestra en vivo + funciona sin JS (Recomendado)»; «Sí (Recomendado)» al botón de restablecer. Supuesto del orquestador, no preguntado: también se edita `secundario` (S3), porque el modelo ya lo tiene y se pinta como `--accent`.
- **L3** — 2026-11-15. T1. `textoSobre` (`shared/marca/textoAutomatico.ts`) compara las dos razones contra blanco y negro en vez de decidir por un umbral de luminancia; la paleta de ocho colores vive en `shared/marca/paleta.ts`. Los dos casos de uso, `cambiarColores` y `restablecerColores`, componen sobre la marca existente y validan el resultado completo dentro de la misma transacción, por un camino único (`application/escrituraDeMarca.ts`) que ahora también usa `cambiarEscudo`: las tres escrituras comparten la validación y la traza, y no hay tres copias que puedan divergir. Dato que salió de la reja y quedó escrito en `docs/06-frontend.md`: con texto automático **todo** color medible alcanza 4.5:1 —para cualquier fondo, una de las dos razones blanco/negro siempre supera el piso—, así que lo que la reja rechaza es el valor que no se puede medir, nunca un color legible; el E2E de la reja prueba ese caso y no una combinación ilegible, que con S2 no existe. Evidencia: `pnpm vitest run src/shared/marca src/modules/marca` en verde (22 archivos, 132 pruebas), incluidos los seis archivos de escudo que ya existían y los nuevos `colores.integration.test.ts`, `coloresRechazos.integration.test.ts` y `colores.isolation.test.ts`; RED observado antes de implementar (módulos inexistentes). `pnpm check` sin hallazgos.
- **L4** — 2026-11-15. T2. `/marca` pasa a titularse «Marca del ayuntamiento» y suma dos formularios nativos (colores y restablecer) junto al del escudo. La paleta son radios —elegir no es guardar— más la opción «Otro color», que es la que le da voz al `<input type="color">`: el servidor lee el selector solo cuando esa opción está marcada. La única hoja cliente de la pantalla, `MuestraDeColores`, no dibuja campos ni envuelve acción alguna: escucha los `input`/`change` del `<form>` que la contiene y repinta un botón, un encabezado y el acento de ejemplo con el mismo `FormData` que va a viajar en el POST. El E2E hace clic en la pastilla visible y no en el radio, que vive recortado con `sr-only`. Evidencia: `pnpm build` en verde; `pnpm test:e2e e2e/marca.spec.ts` con el servidor en `3107`, 12/12 en verde (las seis del escudo incluidas, más paleta, color libre, restablecer, reja y sin JavaScript); `pnpm check` sin hallazgos; `pnpm vitest run src/shared/marca src/modules/marca` 132/132. RED observado con el mismo comando antes de la pantalla (7 fallos, entre ellos los dos tests del escudo que esperaban el título viejo).
- **L5** — 2026-11-15. Pendiente del orquestador, que es quien tiene autoridad sobre git en este flujo: los dos commits (`feat(ui): colores de marca en el dominio` y `feat(ui): elegir los colores de marca en /marca`), el hash en las casillas de `## Tasks` —no puede existir antes del commit— y `git checkout -- next-env.d.ts`, que `next build` reescribió y el flujo de trabajo del worker no toca.
- **L6** — 2026-11-15. Verificador independiente: S1-S8 cumplen.
  - Suites: `pnpm check` 0; Vitest 583 archivos y 3100 tests; build 0; E2E 86/86, con las 12 de `marca.spec.ts`.
  - Mutaciones que muerden: quitar la guarda de rol, saltar `validarMarca`, no componer sobre la marca, borrar el escudo al restablecer y texto siempre blanco.
  - El refactor del escudo no cambia nada observable: sus 6 archivos dan 28/28 antes y después.
  - Bloqueantes, los dos de documentación, corregidos por el padre:
    - (B1) la nota de `AGENTS.md` decía que `MuestraDeColores` era «la única hoja cliente» de `/marca`, y `FormularioDeEscudo` también lo es;
    - (B2) el comentario de `FormularioDeEscudo.tsx` seguía diciendo que era «lo unico `"use client"`».
  - Avisos:
    - (A3) la nota daba a las dos acciones como redactoras de `ValidacionError`; solo lo hace `cambiarColoresAction`. Corregido.
    - (A4) ningún test fallaba si la acción leía el municipio o el `primarioTexto` del formulario. Lo fija `cambiarColoresActionBorde.test.ts`: con la mutación que lee `ayuntamientoId` del formulario falla solo el test nuevo, y el resto de la suite sigue verde.
    - (A1) el test de contraste de la paleta casi no puede fallar, porque con texto automático siempre gana un lado; lo que de verdad prueba es que el color se puede medir. Queda como está.
    - (A2) y (A6) son patrones que ya existían.
- **L7** — 2026-11-15. Revisión nativa en tres partes.
  - Parte 1 (`4bc09db`, dominio): aprobada; un aviso que no bloquea en `escrituraDeMarca.ts`.
  - Parte 2 (`3e3b994`, pantalla): el refutador confirmó un hallazgo CRÍTICO. El selector «Color exacto» siempre estaba disponible, pero el servidor solo lo lee con «Otro color» marcado. Elegir un color exacto con un color de la paleta todavía marcado guardaba el de la paleta y avisaba éxito.
  - Corrección `a4bdd42` (25 líneas, presupuesto 200): el selector exacto se esconde con CSS (`:has`) mientras «Otro color» no esté marcado. Vale también sin JavaScript; un navegador sin `:has` lo deja visible, como antes.
  - E2E nuevo «el selector exacto solo se ofrece con «Otro color» marcado»: RED (seguía visible), luego GREEN. `pnpm check` 0, Vitest de marca 134/134, E2E de marca 13/13. El validador aprobó la corrección en su segundo intento: el primero devolvió un JSON cortado y el controlador lo rechazó sin gastar el lugar.
  - Avisos que no bloquean y quedan para después: el `?error=` de la URL se pinta tal cual, aunque React lo escapa (patrón ya existente); y si el color guardado no está en la paleta, el selector exacto arranca con un valor por defecto.

