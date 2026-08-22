---
name: XULA SIGMA
description: Sistema de gestión municipal para ayuntamientos pequeños de Yucatán. Herramienta de oficio, no trámite de gobierno.
colors:
  marca: "oklch(0.42 0.12 25)"
  marca-texto: "oklch(0.99 0 0)"
  acento: "oklch(0.55 0.1 25)"
  caliza-lienzo: "oklch(0.99 0.003 80)"
  caliza-superficie: "oklch(0.975 0.004 80)"
  caliza-relleno: "oklch(0.94 0.005 80)"
  caliza-divisor: "oklch(0.88 0.006 80)"
  caliza-borde: "oklch(0.62 0.008 80)"
  caliza-inhabilitado: "oklch(0.68 0.007 80)"
  caliza-apagada: "oklch(0.52 0.008 80)"
  caliza-tinta: "oklch(0.24 0.008 80)"
  senial-error: "oklch(0.46 0.17 27)"
  senial-exito: "oklch(0.46 0.11 150)"
  senial-aviso: "oklch(0.5 0.13 65)"
typography:
  display:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.3
  dato:
    fontFamily: "ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tabular-nums"
rounded:
  sm: "4px"
  md: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.marca-texto}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    typography: "{typography.title}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.caliza-lienzo}"
    textColor: "{colors.caliza-tinta}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    typography: "{typography.title}"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.caliza-apagada}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    typography: "{typography.title}"
    height: "44px"
  input:
    backgroundColor: "{colors.caliza-lienzo}"
    textColor: "{colors.caliza-tinta}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    typography: "{typography.body}"
    height: "44px"
  input-error:
    backgroundColor: "{colors.caliza-lienzo}"
    textColor: "{colors.caliza-tinta}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "44px"
  fila-tabla:
    backgroundColor: "{colors.caliza-lienzo}"
    textColor: "{colors.caliza-tinta}"
    typography: "{typography.body}"
    height: "44px"
    padding: "0 12px"
  encabezado-tabla:
    backgroundColor: "{colors.caliza-superficie}"
    textColor: "{colors.caliza-apagada}"
    typography: "{typography.label}"
    height: "36px"
    padding: "0 12px"
  filtro-activo:
    backgroundColor: "{colors.caliza-relleno}"
    textColor: "{colors.caliza-tinta}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
    typography: "{typography.label}"
    height: "32px"
---

# Design System: XULA SIGMA

## 1. Overview

**Creative North Star: "La herramienta del oficio"**

Una buena herramienta de mano no se presenta. No tiene pantalla de
bienvenida, no celebra que la usaste, no se pone adelante de la tarea. Está
gastada donde se la toca y lisa donde no. Pesa exactamente lo que necesita
pesar. Quien la usa todos los días deja de verla, y esa desaparición es el
elogio más alto que puede recibir.

Eso es lo que se está construyendo. Del otro lado del mostrador hay un
vecino esperando su constancia, y cada pixel que no ayuda a entregársela es
un pixel que estorba. La densidad de este sistema no es estética: es que
alguien espera. Pero la densidad se gana y no se asume — se aprieta lo que
el operador ya lee de un vistazo (nombre, fecha, estado) y se abre lo que
tiene que decidir. Una fila mide 44px, no 32px, porque el operador está en
un monitor viejo con escalado de Windows y porque esa misma fila tiene que
funcionar bajo un dedo en el celular.

Lo que este sistema rechaza explícitamente: **no se parece a un trámite de
gobierno.** Nada de formularios que imitan papel, campos en mayúsculas,
jerga legal, veinte campos "por si acaso". Tampoco al SaaS que compensa con
aire e ilustraciones, ni a una hoja de cálculo de celdas sin jerarquía. Y
hay una cosa más que rechaza, específica de este producto: **el sistema no
tiene color propio.** El color es del municipio. Lo que el sistema aporta es
la caliza, la forma y el orden.

**Key Characteristics:**

- Plano en reposo. La profundidad la dan el borde y el tono, no la sombra.
- Neutro cálido fijo del sistema; el único color variable es la marca.
- Tipografía del sistema operativo. Cero bytes de webfont.
- Fila de 44px: una sola definición para escritorio y para el dedo.
- Ningún estado se comunica solo por color, nunca.

## 2. Colors: la paleta de caliza

Un neutro cálido de piedra caliza —la del palacio municipal— sobre el que
el color del ayuntamiento cae como única voz saturada.

### Primary

- **Marca del municipio** (`oklch(0.42 0.12 25)` por defecto): no es un
  color, es una variable. Cada ayuntamiento carga el suyo y `leerMarca` lo
  rechaza si no alcanza razón 4.5 contra su texto. El valor del token es
  solo lo que se ve mientras un municipio no cargó marca. Se usa en la
  acción primaria de la pantalla, el foco del control activo y el escudo.
  En ningún lado más.
- **Texto sobre marca** (`oklch(0.99 0 0)` por defecto): también variable,
  también validado en par con el anterior.
- **Acento** (`oklch(0.55 0.1 25)` por defecto): variable. Reservado para
  enlaces y estados hover donde el primario sería demasiado peso.

### Neutral

- **Caliza lienzo** (`oklch(0.99 0.003 80)`): el fondo de la página y de la
  fila de tabla en reposo. Cálido por 0.003 de chroma, que no se nombra
  pero se siente. No es `#fff`.
- **Caliza superficie** (`oklch(0.975 0.004 80)`): encabezado de tabla,
  barra de filtros, panel lateral. Un escalón por debajo del lienzo: así se
  separa una zona sin dibujarle una caja alrededor.
- **Caliza relleno** (`oklch(0.94 0.005 80)`): chip de filtro activo, celda
  resaltada, fondo de control inhabilitado.
- **Caliza divisor** (`oklch(0.88 0.006 80)`): línea entre filas y entre
  secciones. **Decorativa** — nunca es el único indicador de nada, así que
  puede permitirse 1.39:1.
- **Caliza borde** (`oklch(0.62 0.008 80)`): el contorno de todo control
  interactivo. Es 3.54:1 contra el lienzo, y ese número no es decorativo:
  WCAG 1.4.11 exige 3:1 cuando el borde es lo único que dice que ahí hay un
  campo. El `border-neutral-300` que usaba el login daba **1.47:1** y no
  cumplía.
- **Caliza inhabilitado** (`oklch(0.68 0.007 80)`): texto de control
  inhabilitado y placeholder. Está por debajo de 4.5 a propósito: WCAG
  exime a los controles inhabilitados, y bajar el contraste es justamente
  cómo se comunica que no se puede tocar. Prohibido usarlo para texto que
  el operador tiene que leer.
- **Caliza apagada** (`oklch(0.52 0.008 80)`): etiqueta de campo,
  encabezado de columna, texto secundario. 5.35:1 — pasa AA como texto
  normal, que es el punto: una etiqueta de campo no es decoración.
- **Caliza tinta** (`oklch(0.24 0.008 80)`): todo el texto que importa.
  15.99:1. No es `#000`.

### Tertiary

Las tres señales. Fijas, del sistema, **jamás derivadas de la marca**.

- **Señal error** (`oklch(0.46 0.17 27)`): 6.93:1. Mensajes de rechazo,
  borde de campo inválido.
- **Señal éxito** (`oklch(0.46 0.11 150)`): confirmación de operación
  guardada.
- **Señal aviso** (`oklch(0.5 0.13 65)`): sugerencia de duplicado, dato que
  merece una segunda mirada sin ser un error.

### Named Rules

**La regla de la voz prestada.** El color saturado de la pantalla es de
otro. La marca ocupa menos del 10% de cualquier vista y solo en tres
lugares: acción primaria, anillo de foco y escudo. Un municipio pintó su
color ahí para reconocerse, no para que el sistema lo use de decoración.

**La regla del tono ocupado.** La marca por defecto es
`oklch(0.42 0.12 25)` —tono 25— y la señal de error es tono 27. Un
ayuntamiento con escudo rojo, que en Yucatán es lo común, deja error y
botón primario indistinguibles por tono. Por eso el color nunca comunica
solo: **todo estado lleva texto o icono, siempre**, y la marca tiene
prohibido aparecer en un rol semántico. No es una precaución por
daltonismo; es el caso base.

**La regla de los dos neutros.** Hay un neutro para leer (tinta, apagada) y
un neutro para separar (divisor, borde, relleno). Nunca se cruzan: un texto
en el tono de un borde es texto que nadie lee, y un borde en el tono de la
tinta es una jaula.

## 3. Typography

**Display Font:** ninguna. `system-ui, "Segoe UI", Roboto, sans-serif`
**Body Font:** la misma.
**Label/Mono Font:** `ui-monospace, "Cascadia Mono", Consolas, monospace`

**Character:** la fuente del sistema operativo, y eso es una decisión, no
una omisión. El operador está en Windows con Segoe UI, que su máquina ya
tiene cargada y sabe rasterizar en un monitor viejo. Una webfont costaría
entre 40 y 120 KB sobre una red móvil rural para cambiar la forma de la "a"
en una pantalla que existe para entregar constancias. La herramienta del
oficio no trae tipografía propia.

### Hierarchy

- **Display** (600, 1.5rem / 24px, 1.2, tracking -0.01em): el título de la
  pantalla. Uno por vista. No hay nada más grande.
- **Headline** (600, 1.1875rem / 19px, 1.3): título de sección dentro de la
  pantalla. Razón 1.26 contra display.
- **Title** (600, 0.9375rem / 15px, 1.4): el mismo tamaño que el cuerpo, con
  peso. **Acá la jerarquía la lleva el peso y no la escala**, a propósito:
  seguir bajando de tamaño terminaba en texto de 12px que el operador no
  lee.
- **Body** (400, 0.9375rem / 15px, 1.5): todo el texto corrido. 15px y no
  14px porque el usuario no es experto y el monitor es viejo. Máximo 70ch.
- **Label** (500, 0.8125rem / 13px, 1.3): etiqueta de campo y encabezado de
  columna. **Sin mayúsculas**: los campos en mayúsculas son literalmente la
  anti-referencia del trámite de gobierno.
- **Dato** (400, 0.875rem / 14px, tabular-nums, monoespaciada): CURP,
  folios, fechas, identificadores. Monoespaciada porque una CURP se
  verifica carácter por carácter contra un papel, y `tabular-nums` porque
  una columna de fechas que baila es una columna que no se puede escanear
  con la vista.

### Named Rules

**La regla del oficio, no del acta.** Nada en mayúsculas sostenidas. Ni
etiquetas, ni encabezados, ni botones. La mayúscula sostenida es la firma
visual del formulario oficial y es la anti-referencia declarada.

**La regla de los quince píxeles.** 15px es el piso del texto que el
operador tiene que leer. Si un diseño necesita bajar de ahí para que algo
entre, no entra: se rediseña la densidad, no la tipografía.

## 4. Elevation

Este sistema es **plano en reposo**. No hay sombras en ninguna superficie
apoyada en la página: ni en tarjetas, ni en filas, ni en paneles, ni en
botones. La profundidad la dan tres escalones de tono —lienzo, superficie,
relleno— y una línea divisoria. Un panel se distingue del fondo porque es
un tono más oscuro, no porque flote.

La razón es doble. Una es de identidad: una herramienta no levita. La otra
es material: sombras suaves sobre un panel LCD viejo con mal gamma se ven
como suciedad gris, y el operador termina limpiando la pantalla.

Hay exactamente **una** sombra en todo el sistema, y existe porque hay un
caso donde el tono no alcanza: lo que se despega de la página de verdad y
tapa contenido —un diálogo, un menú, el popover de sugerencias de
duplicados—. Ahí la sombra no decora, informa que hay algo debajo.

### Shadow Vocabulary

- **Flotante** (`box-shadow: 0 6px 16px -4px oklch(0.24 0.008 80 / 0.18)`):
  únicamente para superficies que tapan contenido. Tinte de caliza, no
  negro: una sombra neutra sobre un fondo cálido se ve sucia.

### Named Rules

**La regla del plano.** Si una superficie no tapa a otra, no lleva sombra.
La prueba de una línea: si al quitarle la sombra el elemento sigue
entendiéndose, la sombra sobraba.

## 5. Components

### Buttons

- **Shape:** esquinas apenas quebradas (4px). Alto fijo 44px.
- **Primary:** fondo de marca del municipio, texto de marca-texto, padding
  10px 16px. Una sola acción primaria por pantalla — es la voz prestada.
- **Secondary:** fondo lienzo, texto tinta, borde caliza-borde de 1px. La
  acción que se usa seguido pero no es la principal.
- **Ghost:** sin fondo ni borde, texto caliza-apagada. Cancelar, volver.
- **Hover / Focus:** el hover baja el fondo un escalón de tono. El foco es
  un anillo de 2px en el color de marca con 2px de separación
  (`outline: 2px solid var(--color-marca); outline-offset: 2px`) —
  **`outline` y no `box-shadow`**, para que sobreviva al modo de alto
  contraste de Windows, que es un usuario real acá.
- **Inhabilitado:** fondo caliza-relleno, texto caliza-inhabilitado, sin
  cambio de opacidad. Bajar la opacidad de un botón entero también apaga su
  texto contra un fondo impredecible; cambiar los tokens es medible.

### Cards / Containers

- **Corner Style:** 6px.
- **Background:** caliza-superficie sobre caliza-lienzo.
- **Shadow Strategy:** ninguna. Ver Elevation.
- **Border:** 1px caliza-divisor. Solo cuando el escalón de tono no alcanza
  para separarla del fondo.
- **Internal Padding:** 16px (lg), 24px (xl) en paneles de página completa.
- **Prohibido anidar.** Una tarjeta dentro de otra tarjeta significa que la
  jerarquía se resolvió con cajas en vez de con tipografía.

### Inputs / Fields

- **Style:** fondo caliza-lienzo, borde 1px caliza-borde (3.54:1, no
  negociable), 4px de radio, alto 44px, padding 10px 12px.
- **Etiqueta:** siempre visible, arriba del campo, en Label. **Nunca
  placeholder como etiqueta** — desaparece al escribir y el operador que se
  distrajo pierde el contexto.
- **Focus:** borde a color de marca más el mismo anillo de `outline` del
  botón.
- **Error:** borde en señal-error **más** un mensaje debajo con icono. El
  borde rojo solo no alcanza: en un municipio de marca roja no se distingue
  del foco.
- **Ayuda:** una línea en Label, color caliza-apagada, debajo del campo.
  Existe antes del error, no después.

### Tablas

- **Fila:** 44px, fondo lienzo, divisor de 1px abajo. **Sin cebra** — el
  divisor ya separa, y el rayado le compite a la señal de estado.
- **Encabezado:** 36px, fondo caliza-superficie, texto Label en
  caliza-apagada, pegajoso al hacer scroll.
- **Hover de fila:** fondo a caliza-superficie. Es la única
  retroalimentación de que la fila es accionable.
- **Alineación:** texto a la izquierda; números, fechas y CURP en tipografía
  Dato.
- **Móvil:** la tabla **no hace scroll horizontal**. Por debajo de 640px la
  misma fila se reordena en dos renglones: identificador arriba en Title,
  datos de apoyo abajo en Label. La fila sigue midiendo 44px de alto
  mínimo. Ambos dispositivos por igual significa dos formas reales, no una
  forma con barra de scroll.
- **Sin cálculo de negocio.** La tabla recibe los datos ya resueltos.

### Filtros

- **Chip activo:** fondo caliza-relleno, texto tinta, 4px de radio, alto
  32px, con la "x" de quitar dentro del chip.
- **Los filtros aplicados se ven siempre**, en una fila arriba de la tabla.
  Un filtro escondido en un panel plegado es un resultado vacío que el
  operador no sabe explicar.
- **Ninguno bloquea.** Filtrar no recarga la pantalla ni pierde el scroll.

### Estados de lista

Tres, y son componentes, no ausencias.

- **Cargando:** esqueleto con la altura exacta de las filas que va a haber.
  Sin spinner: en la red rural el spinner gira medio minuto y no dice nada.
- **Vacío por primera vez:** una línea que dice qué es esta pantalla y el
  botón primario que la llena. Sin ilustración.
- **Vacío por filtro:** distinto del anterior. Dice qué filtro lo dejó
  vacío y ofrece quitarlo. Confundir los dos manda al operador a crear un
  registro que ya existe.

### Sugerencia de duplicados (componente de firma)

El patrón que define este producto. Mientras la operadora escribe el
nombre, aparece debajo del campo una lista de hasta 5 personas parecidas.

- Superficie flotante: caliza-lienzo, 6px, sombra Flotante, ancho del campo.
- Cada fila: nombre en Title, y debajo en Label los datos que permiten
  descartar.
- Marcada con señal-aviso **y la palabra "posible duplicado"**. Nunca solo
  el color.
- **No roba el foco. No frena el envío. No hay un "confirme que no es
  duplicado".** El operador puede escribir hasta el final y guardar sin
  mirarla. Esto es el principio 3 hecho componente: una validación que
  bloquea manda el trámite al papel, y el papel no tiene RLS ni bitácora.
- Navegable con flechas y Enter, cerrable con Escape, anunciada por lector
  de pantalla como región viva y educada (`aria-live="polite"`).

## 6. Do's and Don'ts

### Do:

- **Do** usar `outline: 2px solid var(--color-marca); outline-offset: 2px`
  para el foco de todo control. Sobrevive al alto contraste de Windows.
- **Do** poner el borde de todo control interactivo en caliza-borde
  (`oklch(0.62 0.008 80)`), que da 3.54:1. WCAG 1.4.11.
- **Do** acompañar todo estado con texto o icono además del color. La marca
  del municipio puede ser del mismo tono que la señal.
- **Do** mantener las filas en 44px: es el blanco táctil mínimo y el
  renglón cómodo del escritorio en un solo número.
- **Do** separar el vacío-inicial del vacío-por-filtro. Son mensajes
  distintos porque son problemas distintos.
- **Do** usar tipografía Dato con `tabular-nums` para CURP, folios y fechas.
- **Do** redactar los errores para el operador, en español, diciendo qué
  hacer.

### Don't:

- **Don't** escribir etiquetas, encabezados ni botones en mayúsculas
  sostenidas. Es la firma del **trámite de gobierno**, la anti-referencia
  declarada.
- **Don't** usar el placeholder como etiqueta.
- **Don't** meter veinte campos en una pantalla "por si acaso". Cada campo
  justifica que existe.
- **Don't** poner sombra en nada que no tape contenido. Una tarjeta apoyada
  es plana.
- **Don't** anidar tarjetas. Nunca.
- **Don't** usar `border-left` o `border-right` de más de 1px como franja
  de color en filas, alertas o tarjetas.
- **Don't** usar el color de marca en un rol semántico (error, éxito,
  aviso). Es de otro y puede ser rojo.
- **Don't** resolver la tabla en móvil con `overflow-x`. Se reordena en dos
  renglones.
- **Don't** poner rayado de cebra en las tablas.
- **Don't** animar nada por decoración. Antipatrón 12 de
  `docs/06-frontend.md`.
- **Don't** usar `#fff` ni `#000`. Existen caliza-lienzo y caliza-tinta.
- **Don't** bloquear el alta con la sugerencia de duplicados, ni con un
  diálogo de confirmación. Nada bloquea la captura.
- **Don't** cargar una webfont. Ninguna.
- **Don't** llenar el vacío con ilustraciones ni microcopy simpático. Nadie
  quiere una experiencia; quieren terminar.
