# Territorio: corrección y acciones que no aplican

PR A de la auditoría de flujos del 2026-11-07: el error al corregir la
colonia de un domicilio, la baja de calles en zona y ocultar las acciones que
no pueden funcionar. Rama `fix/territorio-acciones-y-correccion`, un PR.
Runner: Vitest (`pnpm test`, integración sobre `xula_test`), Playwright y `pnpm check`.

## Specs

- **S1.** «al editar un domicilio que no tenia colonia le agregas o le quitas
  te da el siguiente error No encontramos eso. Puede que ya no exista.» Causa
  (auditoría): `corregirDomicilioAction` redirige con el `nodo` anterior y
  `cargaDeTerritorio.ts:34` responde 404 porque el domicilio ya cuelga de
  otro lugar. Tras corregir, la página vuelve al lugar nuevo del domicilio,
  con su panel abierto y `ok=domicilio-corregido`, sin aflojar el 404 de
  `cargaDeTerritorio`.

- **S2.** «hay opciones que no aplican en algunos casos es mejor validar y
  ocultar esas acciones asi no llenamos de acciones que no se pueden realizar
  para ciertos casos». Una acción que su caso de uso rechazaría por el estado
  ya cargado no se ofrece; en su lugar va el motivo y, si existe, el camino
  (p. ej. «Tiene 11 domicilios. Muévalos primero.»). Casos de la auditoría:
  baja de lugar con hijos, calles, zonas o domicilios; baja de domicilio con
  residentes (en su lugar, enlace a la ficha para la mudanza); baja y mover
  de calle con domicilios o en zona; «Mover» sin destinos válidos o en
  cabecera/comisaría; acciones de escritura de Zonas y «Agregar la primera»
  calle para roles que no pueden administrar territorio. El servidor sigue
  validando igual.

- **S3.** Hallazgo de la auditoría: se puede dar de baja una calle que
  pertenece a una zona y la zona queda apuntando a ella. `darDeBajaCalle`
  rechaza la baja de una calle en una zona activa con un error tipado y un
  mensaje para la operadora.

- **S4.** Hallazgo de la auditoría: en el alta general de domicilio
  (`/territorio?accion=domicilio` y desde la ficha), el select de colonia
  ofrece colonias de otros asentamientos que la calle elegida; elegir una
  termina en `UbicacionIncoherenteError` al enviar. Las colonias ofrecidas
  se limitan al asentamiento de la calle elegida (con y sin JavaScript el
  servidor sigue validando). Incluye el texto engañoso «Todavía no hay
  colonias en el municipio» en asentamientos sin colonias.

## Tasks

- [x] **T1** · S1,S3 · delegado (paralelo) — Redirección de la corrección y baja de calle en zona. Commit: `0867b6a`.
- [x] **T2** · S2 · delegado (paralelo) — Acciones que no aplican y permisos de Zonas. Commit: `4540411`.
- [x] **T3** · S4 · delegado (paralelo) — Colonias del alta según la calle. Commit: `5010ead`.
- [x] **T4** · S1-S4 · suite, E2E, verificador, PR con issue aprobado.

## Log

- **L1** — 2026-11-07. Pedido del usuario: «dos detalles, al ingresar a
  ingresar a cabecera, comisaria etc y no tiene lugares el boton nuevo le
  damos y nos muestra para seleccionar pero solo tenemos en el select una
  oocion siento que si solo tenemos una opcion es innecesario ese paso no
  crres? y al editar un domicilio que no tenia colonia le agregas o le quitas
  te da el siguiente error No encontramos eso. Puede que ya no exista. otra
  cosa hay opciones que no aplican en algunos casos es mejor validar y
  ocultar esas acciones asi no llenamos de acciones que no se pueden realizar
  para ciertos casos, siento que al corregir un domicilio es muy pequeno el
  espacio destinado para editar los campos podemos mejorar esas vistas. en
  general me gustaria que porbaras los flujos con casos de uso y
  determinaras mejoras para esa vista en ux/ui». Plan propuesto en tres PR
  (A: puntos 1-4; B: selector de un solo tipo y corrección a ancho
  completo; C: búsqueda por calle y número y vuelta de la mudanza). Respuesta
  a «¿Arranco con el PR A?»: «Dale». Este documento es el PR A.

- **L2** — 2026-11-07. Escritores. T1: `crearCorregirDomicilio` devuelve el `lugarId` resultante y la acción redirige con ese `nodo` (RED en agregar, quitar y cambiar colonia); `darDeBajaCalle` rechaza con `CalleEnZonaError` una calle en zona activa, con el método nuevo `contarZonasActivasQueLaUsan` (dar de baja una zona solo marca `baja_en` y deja sus `calles_de_zonas`; `contarZonasQueLaUsan` sigue contando todas porque el reparenteo las necesita); los conteos pasan a `puertosDeUsoDeCalle.ts` por el límite de 200 líneas. T2: baja de lugar, de calle y de domicilio, y mover lugar o calle, se reemplazan por el motivo cuando el estado cargado los bloquea; lectura nueva `usoDeCalle`; acciones de Zonas y «Agregar la primera» calle solo para quien puede; si un conteo falla, la acción se ofrece y decide el servidor. T3: colonias agrupadas por asentamiento (`<optgroup>`) y, con la calle elegida, solo las suyas (isla `SelectorDeColonia`); un solo «Sin colonia»; «Kiní no tiene colonias; el domicilio queda en Kiní.». El padre conectó `asentamientosDeCalles` en `TerritorioCargado`, pasó `usoDeCalle` al conteo de zonas activas, rompió un ciclo de tipos entre `coloniasDelAlta` y `zonaDelFormulario` y quitó un import sin uso. `pnpm check` exit 0; suite completa 516 archivos y 2661 tests; E2E 29/29 (sin JavaScript, lo que se abre, borrador, mudanza, calles, zonas, baja de lugar, sangría y dirección de reporte).

- **L3** — 2026-11-07. Revisiones nativas aprobadas y reconocidas: T1 `review-4d28fe4a57d85a1e`, T3 `review-1db1220ec432c001`, T2 `review-bcb0ce0e0d87ab7a`. La rama entera se detuvo con `lens_context_budget_exceeded`. Advertencias informativas: carrera entre la baja de una calle y la baja de su zona (el conteo no bloquea la zona); el filtro de destinos del reparenteo asume dos niveles; el E2E de calles no prueba el rechazo del servidor; colonias sin asentamiento conocido se omiten de los grupos.
