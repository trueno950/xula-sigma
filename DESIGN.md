---
name: XULA SIGMA
description: Sistema de gestión municipal para ayuntamientos pequeños de Yucatán. Herramienta de oficio, bien terminada.
colors:
  marca: "oklch(0.42 0.12 25)"
  marca-texto: "oklch(0.99 0 0)"
  acento: "oklch(0.55 0.1 25)"
  marca-suave: "color-mix(in oklch, var(--color-marca) 10%, var(--color-caliza-lienzo))"
  marca-tenue: "color-mix(in oklch, var(--color-marca) 5%, var(--color-caliza-lienzo))"
  caliza-fondo: "oklch(0.962 0.005 80)"
  caliza-lienzo: "oklch(0.995 0.002 80)"
  caliza-superficie: "oklch(0.975 0.004 80)"
  caliza-relleno: "oklch(0.94 0.005 80)"
  caliza-divisor: "oklch(0.9 0.006 80)"
  caliza-borde: "oklch(0.62 0.008 80)"
  caliza-inhabilitado: "oklch(0.68 0.007 80)"
  caliza-apagada: "oklch(0.5 0.008 80)"
  caliza-tinta: "oklch(0.22 0.008 80)"
  senial-error: "oklch(0.46 0.17 27)"
  senial-error-suave: "oklch(0.96 0.025 27)"
  senial-exito: "oklch(0.46 0.11 150)"
  senial-exito-suave: "oklch(0.96 0.03 150)"
  senial-aviso: "oklch(0.5 0.13 65)"
  senial-aviso-suave: "oklch(0.965 0.035 85)"
typography:
  display:
    fontFamily: "Inter Variable, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter Variable, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter Variable, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter Variable, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter Variable, system-ui, 'Segoe UI', Roboto, sans-serif"
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
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.marca-texto}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    typography: "{typography.title}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.caliza-lienzo}"
    textColor: "{colors.caliza-tinta}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    typography: "{typography.title}"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.caliza-apagada}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    typography: "{typography.title}"
    height: "44px"
  input:
    backgroundColor: "{colors.caliza-lienzo}"
    textColor: "{colors.caliza-tinta}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    typography: "{typography.body}"
    height: "44px"
  tarjeta:
    backgroundColor: "{colors.caliza-lienzo}"
    textColor: "{colors.caliza-tinta}"
    rounded: "{rounded.lg}"
    padding: "20px"
  fila-tabla:
    backgroundColor: "{colors.caliza-lienzo}"
    textColor: "{colors.caliza-tinta}"
    typography: "{typography.body}"
    height: "48px"
    padding: "0 16px"
  encabezado-tabla:
    backgroundColor: "{colors.caliza-superficie}"
    textColor: "{colors.caliza-apagada}"
    typography: "{typography.label}"
    height: "40px"
    padding: "0 16px"
  insignia:
    backgroundColor: "{colors.caliza-relleno}"
    textColor: "{colors.caliza-tinta}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
    typography: "{typography.label}"
  filtro-activo:
    backgroundColor: "{colors.marca-suave}"
    textColor: "{colors.caliza-tinta}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
    typography: "{typography.label}"
    height: "32px"
  navegacion-activa:
    backgroundColor: "{colors.marca-suave}"
    textColor: "{colors.caliza-tinta}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    typography: "{typography.title}"
    height: "44px"
---

# Design System: XULA SIGMA

## 1. Overview

**Creative North Star: "El palacio bien atendido"**

El palacio municipal es una casa vieja y digna: piedra caliza, patio, gente
conocida detrás del mostrador. Un buen sistema para esa casa se siente igual:
ordenado, cálido, con cada cosa en su lugar y sin gritar. No es el trámite
frío de ventanilla ni el SaaS que se luce. Es una herramienta que alguien
cuidó, y se nota en que las cosas están donde uno las busca, en que el texto
se lee sin esfuerzo y en que nada se ve abandonado.

Esta versión corrige un error de la anterior. El sistema confundió **ligero**
con **austero**. Cada decisión se justificaba por la máquina vieja del
operador, y la suma dejó una pantalla correcta y sin carácter. Ligero es una
restricción de bytes y de JavaScript, y eso se mantiene entero. Austero fue
una opción estética que nadie pidió. Se puede ser rápido y agradable: una
fuente variable cacheada, dos sombras de CSS y el color del municipio bien
usado no cuestan nada medible.

**Escena de uso (de ahí sale el tema claro).** Una operadora a media mañana,
en un escritorio del palacio, frente a un monitor de 1366×768 con el escalado
de Windows puesto y luz de ventana pegándole al panel. Atiende a un vecino
parado frente a ella. Tema claro, contraste generoso, nada que dependa de un
gris fino. En campo, el mismo sistema bajo un dedo y bajo el sol.

**Lo que este sistema rechaza:**

- **El trámite de gobierno:** formularios que imitan papel, mayúsculas
  sostenidas, jerga legal, veinte campos por si acaso.
- **El SaaS que compensa con adorno:** gradientes, ilustraciones, vidrio
  esmerilado, tarjetas de métricas gigantes, microcopy simpático.
- **La hoja de cálculo:** celdas sin jerarquía.
- **La pantalla desnuda:** lo que había. Sin identidad, sin ritmo, con seis
  cajas idénticas de inicio. Sobriedad no es ausencia de diseño.

**Key Characteristics:**

- Cálido y apoyado: fondo de piedra, superficies claras encima, borde fino y
  una sombra tenue que las asienta.
- El color del municipio tiene presencia real (navegación, encabezados,
  selección) sin tomar nunca un rol semántico.
- Una sola familia tipográfica variable, autoalojada, con respaldo del sistema.
- Fila de 48px: una sola definición para escritorio y para el dedo.
- Ningún estado se comunica solo por color, nunca.

## 2. Colors: la paleta de caliza y el color prestado

Estrategia de color: **Restringida con presencia.** Neutros cálidos de caliza
y una voz saturada, la del municipio, que ahora sí se oye: entre el 10% y el
20% de una vista típica, en lugares definidos.

### Marca del municipio (variable)

- **Marca** (`oklch(0.42 0.12 25)` por defecto): cada ayuntamiento carga la
  suya y `leerMarca` la rechaza si no alcanza razón 4.5 contra su texto. El
  valor del token es solo lo que se ve mientras no hay marca cargada.
- **Marca texto:** variable, validada en par con la anterior.
- **Acento:** variable. Relleno de hover y énfasis secundario.
- **Marca suave / marca tenue:** derivados por `color-mix` de la marca sobre
  el lienzo, al 10% y al 5%. Son **fondos**: nunca llevan texto de marca.
  Texto de tinta sobre ellos pasa AA con holgura para cualquier marca
  razonable; un municipio con una marca muy clara degrada a un fondo casi
  blanco, nunca a uno ilegible.

**Dónde vive la marca (lista cerrada):**

1. Acción primaria de la pantalla.
2. Anillo de foco.
3. Escudo y nombre del municipio en el encabezado y en el login.
4. Elemento activo de la navegación (fondo marca suave, ícono en marca).
5. Chip de filtro aplicado (fondo marca suave).
6. Banda de bienvenida de Inicio y panel lateral del login (marca tenue).

**La marca no se usa como color de texto sobre claro.** `leerMarca` valida
marca contra *su* texto, no contra el lienzo: una marca clara podría no
alcanzar 4.5 como letra. Los enlaces van en tinta con subrayado; un ícono de
marca siempre acompaña a una etiqueta en tinta.

### Neutros

- **Fondo** (`oklch(0.962 0.005 80)`): el suelo de la página. Un escalón
  *debajo* de las superficies: así las tarjetas se apoyan y no hace falta
  dibujarles una jaula.
- **Lienzo** (`oklch(0.995 0.002 80)`): tarjetas, tablas, inputs, panel
  lateral. Es el papel sobre el suelo. No es `#fff`.
- **Superficie** (`oklch(0.975 0.004 80)`): encabezado de tabla, zonas
  internas de una tarjeta, hover de fila.
- **Relleno** (`oklch(0.94 0.005 80)`): control inhabilitado, insignia
  neutra, celda resaltada.
- **Divisor** (`oklch(0.9 0.006 80)`): líneas entre filas y secciones.
  Decorativo, nunca el único indicador de nada.
- **Borde** (`oklch(0.62 0.008 80)`): contorno de todo control interactivo,
  3.5:1 contra el lienzo. WCAG 1.4.11. No negociable.
- **Inhabilitado** (`oklch(0.68 0.007 80)`): solo para controles
  inhabilitados y placeholder. Prohibido para texto que se debe leer.
- **Apagada** (`oklch(0.5 0.008 80)`): etiquetas, encabezados de columna,
  texto secundario. Más de 5.5:1 sobre el lienzo y sobre el fondo.
- **Tinta** (`oklch(0.22 0.008 80)`): todo el texto que importa. No es `#000`.

### Señales

Fijas, del sistema, **jamás derivadas de la marca**. Cada una tiene un tono
fuerte (texto e ícono) y uno suave (fondo de insignia o aviso):

- **Error** `oklch(0.46 0.17 27)` / suave `oklch(0.96 0.025 27)`.
- **Éxito** `oklch(0.46 0.11 150)` / suave `oklch(0.96 0.03 150)`.
- **Aviso** `oklch(0.5 0.13 65)` / suave `oklch(0.965 0.035 85)`.

### Named Rules

**La regla de la voz prestada.** El color saturado es del municipio. Tiene
presencia, pero solo en los seis lugares de la lista. Nunca decora un
elemento fuera de ella ni se usa como indicador semántico.

**La regla del tono ocupado.** La marca por defecto es tono 25 y el error es
tono 27: un escudo rojo es lo común en Yucatán. Por eso **todo estado lleva
texto o ícono, siempre**. Es el caso base, no una precaución.

**La regla de los dos neutros.** Un neutro para leer (tinta, apagada) y uno
para separar (divisor, borde, relleno). Nunca se cruzan.

## 3. Typography

**Familia:** `Inter Variable`, autoalojada, con respaldo
`system-ui, "Segoe UI", Roboto, sans-serif`.
**Dato:** `ui-monospace, "Cascadia Mono", Consolas, monospace`.

**Por qué una fuente propia ahora.** Segoe UI y Roboto son correctas, pero
cambian de una máquina a otra, y la jerarquía que se diseña se ve distinta
en cada una. Una sola fuente variable fija el resultado: los pesos
intermedios (600, 650) existen y las cifras tabulares funcionan igual en
todas. Es una decisión de calidad, y el costo está acotado:

- **Un solo archivo**, `woff2` variable, subconjunto latino (cubre español),
  unos 50 KB. Descarga única; después sale de caché.
- **Autoalojada** con `next/font/local`, desde el repositorio: sin Google
  Fonts, sin petición a un tercero, sin depender de red externa al construir.
- **`font-display: swap`** y respaldo de sistema con métricas ajustadas
  (`adjustFontFallback`): el texto aparece de inmediato con la fuente del
  sistema y no salta al cambiar.
- **Ninguna otra.** Ni una segunda familia ni pesos estáticos extra. La
  monoespaciada de `dato` sigue siendo la del sistema: cero bytes.

### Jerarquía

- **Display** (650, 1.75rem / 28px, 1.15, -0.02em): título de la pantalla.
  Uno por vista.
- **Headline** (600, 1.25rem / 20px, 1.3, -0.01em): sección dentro de la
  pantalla. Razón 1.4 contra display.
- **Title** (600, 0.9375rem / 15px, 1.4): mismo tamaño que el cuerpo, con
  peso. Nombres en listas, botones, ítems de navegación.
- **Body** (400, 0.9375rem / 15px, 1.55): todo el texto corrido. Máximo 70ch.
- **Label** (500, 0.8125rem / 13px, 1.3): etiquetas de campo, encabezados de
  columna, insignias. **Sin mayúsculas.**
- **Dato** (400, 0.875rem / 14px, tabular-nums, mono): CURP, folios, fechas.

### Named Rules

**La regla del oficio, no del acta.** Nada en mayúsculas sostenidas, ni
siquiera en insignias o títulos de sección. Es la firma del formulario
oficial.

**La regla de los quince píxeles.** 15px es el piso del texto que se debe
leer. El único texto de 13px es etiqueta o metadato que acompaña a uno de 15.

## 4. Elevation

El sistema pasa de plano a **apoyado**. Una superficie descansa sobre el
fondo con tres ayudas coordinadas, en este orden de importancia:

1. **Escalón de tono**: el lienzo es más claro que el fondo.
2. **Borde fino** de 1px en divisor.
3. **Sombra de reposo**, tenue, que solo asienta.

La sombra **nunca es el único separador**. Si se quitara, la superficie debe
seguir leyéndose por tono y borde. Eso importa por el panel viejo de mal
gamma, donde una sombra suave se confunde con suciedad: por eso es baja en
alcance y opacidad, tinte cálido y no gris.

### Vocabulario

- **Reposo** (`0 1px 2px oklch(0.24 0.008 80 / 0.06), 0 1px 1px oklch(0.24 0.008 80 / 0.04)`):
  tarjetas, tablas y paneles apoyados en la página.
- **Elevada** (`0 4px 12px -2px oklch(0.24 0.008 80 / 0.1), 0 2px 4px oklch(0.24 0.008 80 / 0.05)`):
  hover de tarjeta accionable y navegación móvil abierta.
- **Flotante** (`0 8px 24px -6px oklch(0.24 0.008 80 / 0.22), 0 2px 6px oklch(0.24 0.008 80 / 0.08)`):
  únicamente lo que tapa contenido: diálogo, menú, popover de sugerencias.

### Named Rules

**La regla del apoyo.** Tarjeta y tabla llevan *reposo*. Botón, fila, chip,
campo y navegación **no llevan sombra**: se diferencian por tono y borde. Las
sombras suben solo con la altura real (reposo, elevada, flotante).

**La regla de la prueba mental.** Si al quitar la sombra el elemento sigue
entendiéndose, la sombra está bien puesta. Si deja de entenderse, faltaba
borde o tono.

## 5. Forma, espacio y movimiento

### Forma

Esquinas más amables, en cuatro valores: `sm` 6px (insignias pequeñas,
casillas), `md` 8px (botones, campos, ítem de navegación), `lg` 12px
(tarjetas, tablas, paneles), `pill` (chips e insignias). Un elemento hijo
nunca tiene el mismo radio que su contenedor: el radio interior es el del
contenedor menos el relleno.

### Espacio

Ritmo variable a propósito. Entre secciones 32 a 48px; dentro de una
tarjeta 20px; entre campos 16px; entre etiqueta y campo 6px. Lo relacionado
se junta y lo que no, se separa con claridad. Mismo relleno en todas partes
es monotonía.

### Movimiento

Antes prohibido; ahora **permitido con propósito**, y solo para dar
retroalimentación.

- **Qué se anima:** color, fondo, borde, sombra y `transform` (traslación de
  1 a 2px o escala de 0.98 al presionar). **Nunca** propiedades de layout.
- **Cuánto:** 120 a 180ms, `cubic-bezier(0.25, 1, 0.5, 1)` (ease-out-quart).
  Sin rebote ni elástico.
- **Dónde:** hover y foco de controles, aparición de menú y popover, cambio
  de pestaña. No hay animación de entrada de página ni escalonada.
- **`prefers-reduced-motion`:** apaga todo. La guarda global de `globals.css`
  se conserva.

## 6. Components

### Estructura de la aplicación (shell)

- **Fondo de página:** caliza-fondo. Todo el contenido vive en superficies
  lienzo encima.
- **Navegación lateral (≥1024px):** panel lienzo de 264px con borde derecho.
  Arriba, el **bloque del municipio**: escudo (40px) y nombre en Title, sobre
  marca tenue. Debajo, los módulos agrupados con un título de grupo en Label
  apagada (por ejemplo "Atención", "Territorio", "Administración"). El ítem
  activo es un bloque con fondo marca suave, texto en tinta y el ícono en
  marca. **Nunca** una franja lateral de color. Abajo, el usuario y el rol.
- **Barra superior:** delgada, con la migaja a la izquierda y a la derecha el
  usuario y cerrar sesión. Sin bloque de marca (ya está en el lateral).
- **Móvil (<1024px):** el lateral se convierte en una barra inferior de
  cinco destinos más "Más", con ícono y texto siempre. Zona táctil de 48px.
- **Contenido:** ancho máximo 1200px en listas, 720px en formularios.
  Centrado a partir de 1280px.

### Encabezado de página

Título en Display, línea de descripción en Body apagada, y a la derecha la
**acción primaria** (una sola). Debajo, el buscador y los filtros. Sin
banda de color: el encabezado es tipografía sobre el fondo.

### Botones

- **Primario:** marca, texto marca-texto, 8px, 44px de alto. Una sola por
  pantalla.
- **Secundario:** lienzo, texto tinta, borde caliza-borde.
- **Ghost:** sin fondo, texto apagada. Cancelar, volver.
- **Hover:** el primario baja un escalón de tono (`color-mix` con tinta al
  8%); el secundario pasa a superficie.
- **Presionado:** `scale(0.98)`, 80ms.
- **Foco:** `outline: 2px solid var(--color-marca); outline-offset: 2px`.
  **`outline` y no `box-shadow`**: sobrevive al alto contraste de Windows.
- **Inhabilitado:** fondo relleno, texto inhabilitado, sin opacidad.

### Tarjetas

- **Fondo** lienzo, **radio** 12px, **borde** 1px divisor, **sombra** reposo,
  **relleno** 20px (24px en página completa).
- La tarjeta se usa para agrupar contenido que se decide junto: un
  formulario, una ficha, un bloque de configuración. No para decorar listas
  de ítems iguales.
- **Prohibido anidar.** Dentro de una tarjeta, la jerarquía la dan el
  título, el espacio y las zonas en tono superficie, no otra caja.
- **Tarjeta accionable** (enlace completo): hover sube a *elevada* y el
  borde pasa a borde. Foco con el anillo estándar.

### Campos

- Fondo lienzo, borde 1px caliza-borde (3.5:1), 8px, 44px de alto.
- **Etiqueta** siempre visible, arriba, en Label. Nunca placeholder como
  etiqueta.
- **Foco:** borde en marca más el anillo de `outline`.
- **Error:** borde en señal-error, fondo suave de error en el mensaje,
  ícono y texto debajo. Nunca solo el borde.
- **Ayuda:** una línea en Label apagada, debajo, antes de que exista el
  error.
- Campos relacionados se agrupan en una tarjeta con un título (Headline); no
  hay un formulario largo de una sola columna sin cortes.

### Insignias de estado

Pastilla de 24px: ícono 14px + texto en Label, fondo suave de la señal,
texto en la señal fuerte. Se usan para estado de reporte, de intervención,
de constancia y baja de registro. **Siempre ícono y palabra.** Estado
neutro (borrador, sin asignar): fondo relleno y texto tinta.

### Tablas

- Contenedor: tarjeta de borde y sombra reposo, con `overflow: hidden` para
  el radio. **No es un `overflow-x`.**
- **Encabezado:** 40px, fondo superficie, Label apagada, pegajoso.
- **Fila:** 48px, fondo lienzo, divisor de 1px. **Sin cebra.**
- **Hover de fila accionable:** fondo superficie y un ícono de chevron que
  aparece a la derecha, para indicar que abre.
- **Alineación:** texto a la izquierda; CURP, folios y fechas en Dato.
  Estados en insignia.
- **Móvil (<640px):** la fila se reordena en dos renglones: identificador en
  Title y datos de apoyo en Label, más la insignia a la derecha. Mínimo 56px
  de alto, sin scroll horizontal.
- **Sin cálculo de negocio.** La tabla recibe los datos ya resueltos.

### Filtros, buscador y orden

Sin cambios de comportamiento: todo es GET resuelto en el servidor, sin
estado de cliente.

- **Buscador:** un campo con ícono, `?q=`, espera Enter. Convive con filtros.
- **Filtros aplicados:** siempre visibles en una fila sobre la tabla, como
  chips pill con fondo marca suave y la "x" para quitar. Un select de lista
  cerrada se pinta igual como chip.
- **Orden:** encabezado que es un link; flecha de dirección en la columna
  activa (nunca solo peso). `?ordenar=` y `?direccion=` en la URL.
  `@tanstack/table-core` en servidor; `@tanstack/react-table` no se usa.
- **Paginación:** "Ver más" por link (`?limite=`), de 50 en 50, con aspecto de
  botón secundario. Desaparece cuando ya no hay más.

### Estados de lista

Tres, y son componentes:

- **Cargando:** esqueleto con la altura exacta de las filas (48px), con un
  pulso de opacidad lento. Sin spinner.
- **Vacío por primera vez:** un ícono de línea grande en caliza-apagada, una
  frase que dice qué es la pantalla y la acción primaria que la llena. Esto
  reemplaza a la prohibición total de ilustración: se admite **un ícono de
  línea del mismo set**, nunca una ilustración ni un dibujo.
- **Vacío por filtro:** distinto del anterior. Dice qué filtro lo dejó vacío
  y ofrece quitarlo.

### Inicio

La pantalla de entrada deja de ser una lista de seis cajas iguales. Tiene
tres zonas, en este orden:

1. **Saludo:** "Buenos días, [nombre]" en Display y el nombre del municipio en
   Body apagada, sobre una banda de marca tenue con el escudo.
2. **Pendientes de hoy** (solo si hay): una lista corta, de filas de 48px,
   con lo que pide atención: reportes sin asignar, constancias por emitir.
   Cada fila lleva texto, un conteo en Dato y va al listado filtrado. No es un
   tablero de métricas: es una lista de cosas por hacer, y si no hay nada,
   no aparece.
3. **Módulos:** tarjetas accionables agrupadas por área, con ícono de línea,
   nombre en Title y una línea de descripción. Las tarjetas **no** son todas
   iguales: la de mayor uso por rol va primero y más ancha.

### Acceso (login)

Dos mitades a partir de 960px: a la izquierda una superficie de marca tenue
con el escudo grande, el nombre del municipio en Display y una línea de
bienvenida; a la derecha, el formulario en una tarjeta de 400px. En móvil,
una sola columna con el escudo arriba. Foco al primer campo, error redactado
para el operador sobre el botón, y el botón de ingreso en marca.

### Sugerencia de duplicados (componente de firma)

Mientras se escribe el nombre aparece debajo del campo una lista de hasta 5
personas parecidas.

- Superficie flotante: lienzo, 12px, sombra *flotante*, ancho del campo.
- Cada fila: nombre en Title y, en Label, los datos que permiten descartar.
- Marcada con señal-aviso **y la palabra "posible duplicado"**.
- **No roba el foco, no frena el envío, no pide confirmación.** El operador
  puede guardar sin mirarla. Es el principio 3 hecho componente.
- Navegable con flechas y Enter, cerrable con Escape, región viva
  `aria-live="polite"`.

### Navegación (migas de pan)

Toda pantalla que no es raíz de su sección lleva `<Migaja>`, **por el prop
`migaja` de `PaginaDePanel`**, en la barra superior. El último paso nunca es
un enlace. Las raíces (`/padron`, `/territorio`, `/constancias`) no llevan.

### Divulgación progresiva

Acciones raras o irreversibles (reimprimir, dar de baja, cancelar) van en
`<details>`/`<summary>` nativo, nunca una isla de cliente nueva. El
disparador lleva ícono y texto. El giro de la flecha es instantáneo.

### Formularios de configuración

Un formulario que configura cómo se ve un documento lleva al lado, o debajo,
una vista previa renderizada en servidor de la última configuración
guardada, con la misma estructura que la plantilla real. Dentro de una
tarjeta propia, titulada "Vista previa".

## 7. Do's and Don'ts

### Do:

- **Do** poner el color del municipio en la lista cerrada de seis lugares y
  en ningún otro.
- **Do** asentar las superficies con tono, borde y sombra de reposo, en ese
  orden de importancia.
- **Do** acompañar todo estado con ícono y texto, además del color.
- **Do** usar `outline: 2px solid var(--color-marca); outline-offset: 2px`
  como foco de todo control.
- **Do** poner el borde de todo control en caliza-borde (3.5:1).
- **Do** mantener las filas en 48px y los blancos táctiles en 44px o más.
- **Do** separar el vacío inicial del vacío por filtro.
- **Do** usar Dato con `tabular-nums` para CURP, folios y fechas.
- **Do** redactar los errores para el operador, en español, diciendo qué
  hacer.
- **Do** animar solo retroalimentación (120 a 180ms, ease-out-quart) y
  respetar `prefers-reduced-motion`.

### Don't:

- **Don't** escribir etiquetas, encabezados, botones ni insignias en
  mayúsculas sostenidas.
- **Don't** usar la marca como color de texto sobre claro ni en un rol
  semántico (error, éxito, aviso).
- **Don't** usar `border-left` o `border-right` de más de 1px como franja de
  color en filas, alertas, tarjetas o ítems de navegación.
- **Don't** anidar tarjetas.
- **Don't** poner sombra a botones, filas, chips ni campos, ni usar la
  sombra como único separador.
- **Don't** usar degradados, texto con degradado, vidrio esmerilado ni
  blur decorativo.
- **Don't** hacer una rejilla de tarjetas idénticas ícono, título y texto
  como pantalla de inicio, ni una tarjeta de métrica gigante.
- **Don't** usar el placeholder como etiqueta.
- **Don't** meter veinte campos "por si acaso".
- **Don't** resolver la tabla en móvil con `overflow-x`.
- **Don't** poner cebra en las tablas.
- **Don't** animar propiedades de layout ni animar por decoración.
- **Don't** usar `#fff` ni `#000`.
- **Don't** cargar una segunda familia tipográfica ni pesos estáticos extra.
- **Don't** bloquear el alta con la sugerencia de duplicados.
- **Don't** llenar el vacío con ilustraciones ni microcopy simpático. Un
  ícono de línea sí; un dibujo no.
