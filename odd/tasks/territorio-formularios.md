# Territorio: formularios de lugar y corrección de domicilio

PR B de la auditoría de flujos del 2026-11-07. Rama
`feat/territorio-formularios`, un PR. Runner: Vitest, Playwright y `pnpm check`.

## Specs

- **S1.** «al ingresar a cabecera, comisaria etc y no tiene lugares el boton
  nuevo le damos y nos muestra para seleccionar pero solo tenemos en el
  select una oocion siento que si solo tenemos una opcion es innecesario ese
  paso». Cuando solo cabe un tipo de lugar (hoy siempre «colonia» dentro de
  un asentamiento, y «comisaría» en la raíz cuando ya existe una cabecera),
  el formulario no muestra el select: manda el tipo oculto y el título y el
  botón dicen el tipo («Nueva colonia en Kiní», «Agregar colonia»). Con más
  de un tipo posible, el select queda como hoy.

- **S2.** «siento que al corregir un domicilio es muy pequeno el espacio
  destinado para editar los campos podemos mejorar esas vistas». Medido en
  la auditoría: campos de 340 px a 1366×768 y 292 px a 390×844, contra 670 px
  del alta. La corrección se abre a ancho completo, con la misma disposición
  que el alta (dos columnas en escritorio para campos cortos, una en móvil),
  sin quedar dentro del panel angosto ni de un `<details>`. El panel del
  domicilio conserva el resumen y un enlace «Corregir». Sin JavaScript sigue
  funcionando, y conserva borrador, regreso y anclas.

- **S3.** Detalles de la auditoría en los mismos archivos: la colonia recién
  creada queda al final de una lista sin orden y la confirmación no lleva a
  ella; la columna «Tipo» repite «Colonia» en cada fila. La lista de lugares
  se ordena alfabéticamente, la confirmación del alta enlaza a la colonia
  nueva, y la columna «Tipo» se omite cuando todas las filas son del mismo
  tipo.

- **S4.** Detalle de la auditoría: textos duplicados o torpes al elegir
  colonia, «Se guarda en Colonia Colonia Prueba UX» y «Sin cambiar la
  colonia, se guarda en Colonia Centro · Motul». El nombre del lugar no
  repite el prefijo del tipo cuando ya lo contiene, y la frase se lee
  natural.

## Tasks

- [x] **T1** · S1,S3 · delegado (paralelo) — Alta de lugar sin select de un solo tipo; lista y confirmación. Commit: `a520889`.
- [x] **T2** · S2,S4 · delegado (paralelo) — Corrección de domicilio a ancho completo; textos del destino. Commit: `5b9fce7`.
- [x] **T3** · S1-S4 · suite, E2E, capturas, revisión, PR con issue aprobado.

## Log

- **L1** — 2026-11-07. Respuesta «Si» a «¿Hago el merge del #126 cuando
  pase el CI y arranco con el PR B?», con el PR B descrito como «el
  formulario de lugar sin selector y la corrección a ancho completo» y los
  detalles menores «donde toquen esos mismos archivos». Pedido original en
  L1 de `odd/tasks/territorio-acciones.md`.

- **L2** — 2026-11-07. T1: con un solo tipo posible el formulario manda `tipo` oculto y dice «Nueva colonia en Kiní» / «Agregar colonia» (en la raíz con cabecera, «Nueva comisaría» / «Agregar comisaría»; con dos tipos sigue el select y «Agregar asentamiento»); la lista de lugares se ordena con `localeCompare("es")` y omite «Tipo» cuando todas las filas son del mismo tipo; el alta redirige con `?ok=lugar-creado&nuevo=<uuid>` y `ConfirmacionDeExito` enlaza al lugar con el nombre tomado de los lugares cargados, nunca de la URL. T2: la corrección abre su propia vista (`?accion=corregirDomicilio`) a ancho completo, con dos columnas desde `md` (la calle supera 600 px a 1366×768), «Cancelar» y el panel solo con el enlace «Corregir»; un rechazo vuelve a esa vista con el borrador; el éxito vuelve al panel; el destino dice «Se guarda en la colonia Centro.» sin repetir el prefijo. Desvío: el enlace va junto al `Aviso`, que solo acepta texto. `pnpm check` exit 0; suite completa 522 archivos y 2693 tests; E2E 34/34. Revisiones nativas aprobadas y reconocidas: T1 `review-6c9615ce5a41c452`, T2 `review-a981eb75b07a7113`, rama completa `review-392732d1b461e9a4`. Advertencias: E2E con selección de tipo condicional; «Corregir» no conserva `regreso`.
