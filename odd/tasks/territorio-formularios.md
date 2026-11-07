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

- [ ] **T1** · S1,S3 · delegado (paralelo) — Alta de lugar sin select de un solo tipo; lista y confirmación.
- [ ] **T2** · S2,S4 · delegado (paralelo) — Corrección de domicilio a ancho completo; textos del destino.
- [ ] **T3** · S1-S4 · suite, E2E, capturas, revisión, PR con issue aprobado.

## Log

- **L1** — 2026-11-07. Respuesta «Si» a «¿Hago el merge del #126 cuando
  pase el CI y arranco con el PR B?», con el PR B descrito como «el
  formulario de lugar sin selector y la corrección a ancho completo» y los
  detalles menores «donde toquen esos mismos archivos». Pedido original en
  L1 de `odd/tasks/territorio-acciones.md`.
