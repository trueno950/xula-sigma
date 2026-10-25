# Territorio: direcciones legibles

Rediseño de la navegación de Territorio en tres pasos encadenados: sacar el
ruido de las vistas que no aplican, decir con claridad dónde se guarda un
domicilio, y convertir la dirección en la unidad que reportes y constancias
seleccionan. Rama: `feat/territorio-direcciones`, un PR por paso.

## Specs

- **S1.** «si selecciono una colonia me muestra este mensaje "Una colonia es
  el último nivel: no lleva lugares adentro, solo domicilios." para mi lo
  mejor seria ocultar eso sino aplica no crees? asi metemos menos ruido».
  La pestaña **Lugares** no se renderiza cuando el tipo de lugar no admite
  hijos: una colonia nunca va a tener lugares adentro, así que no hay nada
  que la operadora pueda decidir ahí.

- **S2.** «esta vista es otro ejemplo mostramos datos de otros lugares sin
  mucha claridad», sobre la captura de Colonia Centro con la pestaña
  **Calles 6** listando las seis calles de Buenavista. Estar parado en la
  colonia y ver el catálogo del asentamiento rompe la jerarquía que la
  migaja acaba de declarar. Las calles del asentamiento se ofrecen **dentro
  del formulario** de alta de dirección, rotuladas con su origen, no como
  listado de la colonia.

- **S3.** «al crear un domicilio puedo hacerlo desde cabecera, tambien por
  colonias no se en donde se guarda este domicilio hay que revisar en donde
  se usa el domiclio para ver si realmente se seleecionan bien». El
  formulario declara el destino antes de los campos: el lugar donde se
  guarda y el asentamiento dueño del catálogo de calles. Si el asentamiento
  tiene colonias, la colonia deja de ser una omisión silenciosa.

- **S4.** «hay que tener una mejor jerarquia». Las vistas de un lugar no
  ofrecen pestañas que no aplican a su tipo, y los datos de otro nivel se
  nombran con el nivel al que pertenecen.

- **S5.** «este modulo es para que cuando se haga el alta de un reporte se
  puede seleccionar los datos del lugar usando este modulo, lo mismo para
  las constancias». Un único selector de dirección —buscable por texto,
  con la dirección ya escrita— es el que usan reportes y constancias, en
  lugar de que cada uno arme su propia selección de lugar y calle.

- **S6.** «Los tres pasos completos», decisión de alcance del 2026-10-24: se
  implementan los tres pasos, en PRs encadenados y no en uno solo.

## Tasks

- [x] **T1** · S1,S4 · directo — La pestaña Lugares no se renderiza cuando el
  tipo no admite hijos, y su mensaje de "último nivel" desaparece. Commit:
  `62c8b2a`. Verificado en vivo: Colonia Centro muestra solo Domicilios 6 y
  Editar.
- [x] **T2** · S2,S4 · directo — En un lugar sin catálogo propio, las calles
  del asentamiento dejan de listarse como pestaña de la colonia; se ofrecen
  dentro del formulario con su origen rotulado. Commit: `62c8b2a`.
  Verificado: enlace «Ver el catálogo de calles de Buenavista» en su lugar.
- [x] **T3** · S2 · directo — La tabla de calles deja de mostrar coordenadas
  crudas: dice si está ubicada o no, y enlaza al mapa. Commit: `2fa598e`.
  Verificado: «Ubicada»/«Sin ubicar», 0 coordenadas crudas en la vista.
- [ ] **T4** · S3 · delegado — El formulario de alta declara, antes de los
  campos, dónde se guarda la dirección y de qué asentamiento es el catálogo
  de calles. Commit:
- [ ] **T5** · S3 · delegado — Con colonias en el asentamiento, el alta no
  guarda un domicilio en la cabecera por omisión: se pregunta o se explica
  el rechazo. Más un script de auditoría que lista los domicilios ya
  guardados en un asentamiento que tiene colonias, sin moverlos. Commit:
- [ ] **T6** · S5 · delegado — `SelectorDeDireccion`: un buscador que
  devuelve la dirección escrita, usado primero por el alta de reporte.
  Commit:
- [ ] **T7** · S5 · delegado — Constancias y Territorio usan el mismo
  selector; el árbol queda como administración. Commit:

## Log

- **L1** — Pedido original, textual: «Vale lo siguiente es refinar mas
  territorio, aun falta tener una interfaz mejor, facil e intuitiva para el
  usuario, lo primero que veo es que si selecciono una colonia me muestra
  este mensaje Una colonia es el último nivel: no lleva lugares adentro,
  solo domicilios. para mi lomejor seria ocultar eso sino aplica no crees?
  asi metemos menos ruido, este ejemplo puede ser que este en mas vistas de
  territorio, /Users/joelmay/Desktop/Screenshot 2026-10-24 at 7.47.31 p.m..png
  esta vista es otro ejemplo mostramos datos de otros lugares sin mucha
  claridad, otra detalle al crear un domicilio puedo hacerlo desde cabecera,
  tambien por colonias no se en donde se guarda este domicilio hay que
  revisar en donde se usa el domiclio para ver si realmente se seleecionan
  bien, hay que tener una mejor jerarquia, este modulo es para que cuando se
  haga el alta de un reporte se puede seleccionar los datos del lugar usando
  este modulo, lo mismo para las constancias, pero si tienen una mejor idea
  exponla, te paso estos comentarios par un analisis y hacer una mejor
  interfaz».

- **L2** — Evidencia del diagnóstico (2026-10-24, `xula_dev`): un domicilio
  guarda `calleId` —la calle siempre pertenece al asentamiento— y `lugarId`
  —el asentamiento o una colonia—. 0 direcciones duplicadas entre lugares;
  3 domicilios guardados en la cabecera Buenavista teniendo 3 colonias, uno
  llamado «Calle 20 de la Colonia 104-B». El problema de S3 es real.

- **L3** — Decisión de alcance: los tres pasos completos (S6), en PRs
  encadenados. Los domicilios existentes en el lugar equivocado no se
  migran automáticamente: se listan con un script de auditoría y los corrige
  una persona, mismo criterio que `scripts/auditar-raices.sql`.

- **L4** — Frontera del primer slice (2026-10-24): `62c8b2a` + `2fa598e`,
  403 líneas sobre `main`. Cierra T1–T3 y va como PR propio; T4 en adelante
  abre el siguiente. Verificación del padre: `pnpm check` en 0 errores,
  unitarios 86 archivos / 587 tests del worker, y comprobación en navegador
  contra `xula_dev` de las tres tareas.
