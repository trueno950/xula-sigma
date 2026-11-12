# Territorio: las tres advertencias del cierre de la auditoría

Advertencias que quedaron tras los PRs #126-#132. Rama
`fix/territorio-advertencias`, un PR. Runner: Vitest (integración sobre
`xula_test`), Playwright y `pnpm check`.

## Specs

- **S1.** Advertencia «silent 6-word cap»: la búsqueda de domicilios usa
  solo las primeras 6 palabras (`MAXIMO_DE_PALABRAS`,
  `territorio/infrastructure/busquedaPorPalabras.ts`) y descarta el resto sin
  avisar; el chip repite la consulta cruda. Decisión del usuario: «Buscar y
  avisar (Recomendado)» — «Se busca con las 6 primeras y el filtro de
  búsqueda muestra «se ignoraron N palabras», como ya se hace con lo que se
  recorta de un borrador.» Aplica en `/territorio/domicilios` y en la
  pestaña Domicilios del árbol.

- **S2.** El buscador del padrón tiene el mismo tope silencioso (8 palabras,
  `padron/domain/criteriosDeBusqueda.ts`). Decisión del usuario: «Sí, los dos
  (Recomendado)» — «La misma regla en los dos buscadores, para que la
  operadora vea lo mismo en ambos.»

- **S3.** Advertencia «calle/zona baja race»: `agregarCalleAZona` bloquea la
  zona y lee la calle sin bloquearla; una `darDeBajaCalle` concurrente cuenta
  cero zonas activas, da de baja y confirma, y la pertenencia se inserta
  después: queda una zona activa con una calle de baja. La calle se bloquea
  antes que la zona (calle → zona, como `reparentearCalle` calle → lugar);
  tras la espera, el alta en la zona ve la baja y responde
  `NoEncontradoError`. Test de concurrencia de integración que falla sin el
  arreglo.

- **S4.** Advertencia ««Corregir» drops regreso»: el «Corregir» de
  `AccionesDeDomicilio` (vía `rutaDe`) y el formulario de corrección no
  llevan `regreso`, así que quien llegó desde la ficha de una persona lo
  pierde. Decisión del usuario: «Árbol + «Volver a la ficha» (Recomendado)» —
  «Se queda en territorio, confirma el cambio y ofrece un enlace para volver
  a la ficha. Es lo que pide la advertencia, sin cambiar lo que ya pasa
  hoy.» `regreso` sigue validado con `esquemaDeRegreso` en cada borde.

## Tasks

- [x] **T1** (S1, S2) aviso del tope de palabras — worker — commit: `b137906`
- [x] **T2** (S3) bloqueo calle → zona — worker — commit: `e451dc0`
- [x] **T3** (S4) `regreso` en la corrección — worker — commit: `2244ba2`
- [x] **T4** (S1-S4) verificación y cierre — padre — commit: este cierre

## Log

- **L1** — 2026-11-11. Usuario: «si corrige esas 3 luego con que seguimos?»
  (las tres advertencias: «silent 6-word cap, calle/zona baja race,
  «Corregir» drops regreso»).
- **L2** — 2026-11-11. Mapa del explorador con `path:line` resumido en
  S1-S4. Decisiones del usuario citadas en S1, S2 y S4.
- **L3** — 2026-11-11. T2: `agregarCalleAZona` bloquea la calle
  (`bloquearCalleActivaPorId`, `FOR UPDATE` con `baja_en IS NULL`) antes que
  la zona. RED: `expected undefined to be an instance of NoEncontradoError`
  en `callesDeZonas.concurrencia.integration.test.ts`; GREEN 9/9, cinco
  corridas 2/2, concurrencia vecina 15/15. Orden de bloqueos: calle → zona;
  ninguna otra ruta toma zona y luego calle. T1 y T3 corren en worktrees
  aparte (`../xula-sigma-wt/t1`, `t3`) porque el verificador de superficies
  trata las rutas con `(panel)` como si se solaparan con todo.
- **L4** — 2026-11-11. T1: tope y partición movidos a
  `territorio/domain/busquedaPorPalabras.ts` (el test del tope pasó a
  `domain/busquedaPorPalabras.tope.test.ts`, sin reexportación en
  `infrastructure`). Textos: «Se busca con las 6 primeras palabras; se
  ignoraron N palabras.», singular «…; se ignoró 1 palabra.»; el padrón, igual
  con 8. La pestaña Calles no avisa (filtra por subcadena, sin tope). RED 12
  fallidos, GREEN 66/66, unit de territorio y padrón 1052/1052. El texto queda
  duplicado en los dominios de territorio y padrón: es la primera duplicación,
  aceptada. T3: `regreso` baja por `PropsDeContenido` hasta «Corregir», el
  input oculto del formulario y «Cancelar»; `ConfirmacionDeExito` lo
  revalida con `regresoValido` y ofrece «Volver a la ficha» solo en
  `domicilio-corregido`. RED 6 fallidos, GREEN 51/51, unit de territorio y
  `src/app` 1151/1151. Fuera de S4: «Cerrar», los hermanos y la migaja siguen
  sin `regreso`. Corte de entrega: un PR de unas 1,000 líneas en tres commits
  de unidad (`e451dc0`, `b137906`, `2244ba2`), que se revisa commit por commit.
- **L5** — 2026-11-11. Usuario: «1 luego 2 haz todo el pr y los merge». Los
  dos frentes propuestos ya estaban en `main` (`territorio-deuda-tecnica`
  fusionado; de `tres-frentes-pendientes` solo faltaba marcar T5, marcada
  aquí). El verificador independiente no fue admitido (la tarea no declaró
  `Risk: item 4`); verificación del padre: orden de bloqueos sin ciclo
  (calle → zona, calle → lugar, lugar → zona; el resto toma uno), `pnpm
  check` 0, Vitest 532/532 archivos y 2777 tests (11 omitidos), E2E 77/77.
  Entorno local: `xula-pg` en el puerto 55432, `E2E_PUERTO=3107`.
