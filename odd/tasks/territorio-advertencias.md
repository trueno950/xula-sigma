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

- [ ] **T1** (S1, S2) aviso del tope de palabras — worker — commit:
- [ ] **T2** (S3) bloqueo calle → zona — worker — commit:
- [ ] **T3** (S4) `regreso` en la corrección — worker — commit:
- [ ] **T4** (S1-S4) verificación independiente y cierre — verify — commit:

## Log

- **L1** — 2026-11-11. Usuario: «si corrige esas 3 luego con que seguimos?»
  (las tres advertencias: «silent 6-word cap, calle/zona baja race,
  «Corregir» drops regreso»).
- **L2** — 2026-11-11. Mapa del explorador con `path:line` resumido en
  S1-S4. Decisiones del usuario citadas en S1, S2 y S4.
