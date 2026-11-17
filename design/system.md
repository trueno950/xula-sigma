# Design system — XULA SIGMA

Sincronizado por `gentle-design` el 2026-11-16. No es un sistema propuesto: el
proyecto ya tenía tokens y reglas de componente escritas, y este archivo las
recoge. Cada entrada nombra su fuente, y solo se registran valores que existen
en ella.

Fuentes leídas:

- `DESIGN.md` — front-matter (líneas 1–143) para los tokens; §2–§7 para usos,
  reglas y vocabulario de elevación y movimiento.
- `src/app/globals.css` — `@theme` y `@theme inline`: los tokens compilados.
- `PRODUCT.md` — audiencia, principios, accesibilidad.
- `src/shared/ui/estilos.ts` — clases de botón, campo, tarjeta, etiqueta, dato,
  enlace y anillo de foco.
- `src/shared/ui/PaginaDePanel.tsx`, `InsigniaDeEstado.tsx`, `ChipDeFiltro.tsx`,
  `Aviso.tsx`, `EstadoVacio.tsx`, `CampoDeLista.tsx`, `EstadoEnVivo.tsx`,
  `modulosDelPanel.ts`.
- `src/app/(panel)/layout.tsx`, `NavegacionDeModulos.tsx`,
  `NavegacionInferior.tsx`, `BloqueDeMunicipio.tsx`.
- `src/modules/mapa-operativo/domain/coloresDeEstado.ts`,
  `src/modules/mapa-operativo/ui/iconosDelMapa.ts`,
  `src/modules/mapa-operativo/ui/htmlDeMarcador.ts`,
  `src/modules/mapa-operativo/ui/LeyendaDelMapa.tsx`.

---

## 1. Color

### Marca del municipio (variable, 6 tokens)

La marca la elige cada ayuntamiento y llega por `--primary`; el valor de abajo
es el del `:root` mientras no hay marca cargada. Fuente: `DESIGN.md` §2,
`src/app/globals.css` (`@theme inline`).

| Token | Valor | Para qué |
| --- | --- | --- |
| `marca` | `oklch(0.42 0.12 25)` | fondo de la acción primaria, ícono del ítem de navegación activo |
| `marca-texto` | `oklch(0.99 0 0)` | texto sobre `marca` |
| `acento` | `oklch(0.55 0.1 25)` | relleno de hover y énfasis secundario |
| `marca-suave` | `color-mix(in oklch, marca 10%, caliza-lienzo)` | fondo del ítem de navegación activo y del chip de filtro aplicado |
| `marca-tenue` | `color-mix(in oklch, marca 5%, caliza-lienzo)` | bloque del municipio (escudo + nombre) |
| `marca-hover` | `color-mix(in oklch, marca 92%, caliza-tinta)` | hover del botón primario |

**Lista cerrada de dónde vive la marca** (`DESIGN.md` §2, "La regla de la voz
prestada"): acción primaria · anillo de foco · escudo y nombre del municipio ·
ítem activo de la navegación · chip de filtro aplicado · banda de bienvenida.
Ningún otro elemento. **Nunca como color de texto sobre claro**: los enlaces
van en tinta con subrayado (`src/shared/ui/estilos.ts`, `CLASES_DE_ENLACE`) y
el ícono de marca siempre acompaña una etiqueta en tinta.

### Neutros (9 tokens)

Fuente: `DESIGN.md` §2, `src/app/globals.css`.

| Token | Valor | Para qué |
| --- | --- | --- |
| `caliza-fondo` | `oklch(0.962 0.005 80)` | suelo de la página |
| `caliza-lienzo` | `oklch(0.995 0.002 80)` | tarjetas, tablas, campos, panel lateral. **No es `#fff`** |
| `caliza-superficie` | `oklch(0.975 0.004 80)` | encabezado de tabla, zona interna de tarjeta, hover de fila |
| `caliza-relleno` | `oklch(0.94 0.005 80)` | control inhabilitado, insignia neutra, celda resaltada |
| `caliza-divisor` | `oklch(0.9 0.006 80)` | líneas entre filas y secciones; decorativo |
| `caliza-borde` | `oklch(0.62 0.008 80)` | contorno de todo control interactivo (3.5:1 contra lienzo) |
| `caliza-inhabilitado` | `oklch(0.68 0.007 80)` | solo controles inhabilitados y placeholder |
| `caliza-apagada` | `oklch(0.5 0.008 80)` | etiquetas, encabezados de columna, texto secundario |
| `caliza-tinta` | `oklch(0.22 0.008 80)` | todo el texto que importa. **No es `#000`** |

### Señales (6 tokens, fijas, jamás derivadas de la marca)

Fuente: `DESIGN.md` §2, `src/app/globals.css`, `presentacionDeAviso` en
`src/shared/ui/estilos.ts`.

| Token | Valor | Suave | Para qué |
| --- | --- | --- | --- |
| `senial-error` | `oklch(0.46 0.17 27)` | `oklch(0.96 0.025 27)` | error: borde, ícono, texto, `role="alert"` |
| `senial-exito` | `oklch(0.46 0.11 150)` | `oklch(0.96 0.03 150)` | éxito, conexión en vivo |
| `senial-aviso` | `oklch(0.5 0.13 65)` | `oklch(0.965 0.035 85)` | aviso, queja de dato, `role="status"` |

### Color de estado del mapa (dato del servidor, no token de UI)

Estos valores **no** son roles de color de interfaz: los decide
`domain/coloresDeEstado.ts` en el servidor y viajan como dato; el cliente no
los elige (`AGENTS.md`, antipatrón 13). Dos estados del mismo recurso no
comparten color; entre recursos sí se repiten y la leyenda los separa por
etiqueta. Fuente: `src/modules/mapa-operativo/domain/coloresDeEstado.ts`.

| Estado | Valor | Recurso |
| --- | --- | --- |
| RECIBIDO | `#b45309` | reporte |
| EN_ATENCION | `#1d4ed8` | reporte |
| RESUELTO | `#15803d` | reporte |
| RECHAZADO | `#6b7280` | reporte |
| PLANIFICADA | `#7c3aed` | intervención |
| EN_EJECUCION | `#0e7490` | intervención |
| FINALIZADA | `#15803d` | intervención |
| CANCELADA | `#6b7280` | intervención |
| desconocido | `#4b5563` | cualquiera (`COLOR_DE_ESTADO_DESCONOCIDO`) |

### Pin del mapa (valores de componente)

Fuente: `src/modules/mapa-operativo/ui/htmlDeMarcador.ts` (estilos en línea
porque la cadena se arma en tiempo de ejecución).

| Pieza | Valor | Nota |
| --- | --- | --- |
| pin | 30×30, `border-radius: 999px`, borde 2px `#fff`, `box-shadow: 0 1px 4px rgba(0,0,0,.45)` | el color de fondo es el del estado |
| contador | badge 18px, fondo `#111827`, texto `#fff`, radio pill, solo si agrupa más de un hecho | |
| aro de atraso | `box-shadow: 0 0 0 3px #b91c1c` | el atraso se dice además con texto: `Atrasado · N días` |

Los dos `#fff` y el `#b91c1c` están en el código de producción, no en
`DESIGN.md`; `DESIGN.md` §7 los prohíbe como superficie. **Los artboards de
`design/mapa-operativo/` los sustituyen por `caliza-lienzo` (borde del pin) y
`senial-error` (aro)**, que son los tokens del rol. Ver "Diferencias
registradas".

---

## 2. Tipografía

Familia única `Inter Variable`, autoalojada por `next/font/local`, con respaldo
`system-ui, "Segoe UI", Roboto, sans-serif`; dato en mono del sistema. Fuente:
`DESIGN.md` §3 y front-matter, `src/app/globals.css` (`--font-sans`,
`--font-mono`). **Ninguna segunda familia ni pesos estáticos extra.**

| Rol | Tamaño / peso / interlínea | Uso |
| --- | --- | --- |
| display | `1.75rem` / 650 / 1.15 / `-0.02em` | título de la pantalla, uno por vista |
| headline | `1.25rem` / 600 / 1.3 / `-0.01em` | sección dentro de la pantalla |
| title | `0.9375rem` / 600 / 1.4 | nombres en listas, botones, ítems de navegación |
| body | `0.9375rem` / 400 / 1.55 | texto corrido, máximo 70ch |
| label | `0.8125rem` / 500 / 1.3 | etiqueta de campo, encabezado de columna, insignia. **Sin mayúsculas** |
| dato | `0.875rem` / 400 / 1.4, `tabular-nums`, mono | CURP, folios, fechas, conteos alineados |

Reglas nombradas: **la regla del oficio, no del acta** (nada en mayúsculas
sostenidas) y **la regla de los quince píxeles** (15px es el piso del texto que
se debe leer; 13px solo como etiqueta o metadato que acompaña a uno de 15).

---

## 3. Espacio

Fuente: `DESIGN.md` §5 "Espacio" y front-matter (`spacing`).

| Token | Valor |
| --- | --- |
| `xs` | `4px` |
| `sm` | `8px` |
| `md` | `12px` |
| `lg` | `16px` |
| `xl` | `24px` |
| `xxl` | `32px` |
| `xxxl` | `48px` |

Relaciones que fija el documento, y que no son un token más: entre secciones
32–48px; dentro de una tarjeta 20px (24px en página completa, ver
`src/shared/ui/estilos.ts`, `CLASES_DE_FORMULARIO`); entre campos 16px; entre
etiqueta y campo 6px (`campo` de `CampoDeLista`: `gap-1.5`).

---

## 4. Radio

Fuente: `DESIGN.md` §5 "Forma", `src/app/globals.css`.

| Token | Valor | Uso |
| --- | --- | --- |
| `sm` | `6px` | insignias pequeñas, casillas |
| `md` | `8px` | botones, campos, ítem de navegación |
| `lg` | `12px` | tarjetas, tablas, paneles |
| `xl` | `16px` | superficie grande |
| `pill` | `999px` | chips, insignias, pastillas |

**Un hijo nunca tiene el mismo radio que su contenedor**: el radio interior es
el del contenedor menos su relleno.

---

## 5. Elevación

Fuente: `DESIGN.md` §4, `src/app/globals.css`.

| Token | Valor | Uso |
| --- | --- | --- |
| `sombra-reposo` | `0 1px 2px oklch(0.24 0.008 80 / .06), 0 1px 1px oklch(0.24 0.008 80 / .04)` | tarjetas, tablas, paneles apoyados |
| `sombra-elevada` | `0 4px 12px -2px oklch(0.24 0.008 80 / .1), 0 2px 4px oklch(0.24 0.008 80 / .05)` | hover de tarjeta accionable, navegación móvil abierta |
| `sombra-flotante` | `0 8px 24px -6px oklch(0.24 0.008 80 / .22), 0 2px 6px oklch(0.24 0.008 80 / .08)` | solo lo que tapa contenido: diálogo, menú, popover |

**La regla del apoyo:** tarjeta y tabla llevan *reposo*; **botón, fila, chip,
campo y navegación no llevan sombra**. La sombra nunca es el único separador:
si se quita, la superficie se sigue leyendo por tono y borde (*la regla de la
prueba mental*).

---

## 6. Movimiento

Fuente: `DESIGN.md` §5 "Movimiento", `src/app/globals.css`.

- Se animan color, fondo, borde, sombra y `transform` (traslación 1–2px o
  `scale(0.98)` al presionar). **Nunca** propiedades de layout.
- 120–180 ms, `cubic-bezier(0.25, 1, 0.5, 1)` (`--ease-salida`). Sin rebote.
- Solo retroalimentación: hover y foco de controles, aparición de menú y
  popover, cambio de pestaña. Sin animación de entrada de página.
- `prefers-reduced-motion` apaga todo con una guarda global.

---

## 7. Componentes

### Shell del panel

Fuente: `DESIGN.md` §6 "Estructura de la aplicación", `src/app/(panel)/layout.tsx`,
`NavegacionDeModulos.tsx`, `NavegacionInferior.tsx`, `BloqueDeMunicipio.tsx`.

- Fondo de página `caliza-fondo`; todo el contenido en superficies `lienzo`.
- Lateral de 264px a partir de 1024px: `lienzo`, `border-right` 1px divisor,
  pegado a la ventana (`h-dvh`), grid `264px 1fr`.
- Arriba del lateral, **bloque del municipio**: escudo 40px + nombre en Title,
  fondo `marca-tenue`, mínimo 64px de alto.
- Módulos agrupados con título de grupo en Label apagada: "Atención"
  (Padrón, Reportes, Constancias), "Territorio" (Territorio, Mapa operativo,
  Intervenciones), "Administración" (Usuarios, Marca, Exportación). Un grupo sin
  módulos visibles no se pinta.
- Ítem de navegación: 44px, radio `md`, ícono 20px + etiqueta 15px/600. Activo:
  fondo `marca-suave`, texto tinta, ícono en `marca` y `aria-current="page"`.
  **Nunca una franja lateral de color.**
- Al pie, el rol en Label apagada y "Cerrar sesión".
- Móvil (<1024px): encabezado con el bloque del municipio y **barra inferior
  fija** con hasta cuatro destinos y "Más" (`<details>` nativo), ícono y texto
  siempre, celdas de 56px y `env(safe-area-inset-bottom)`.

### Encabezado de página (`PaginaDePanel`)

Fuente: `src/shared/ui/PaginaDePanel.tsx`, `DESIGN.md` §6. Título en Display,
descripción en Body apagada (máx. 70ch), acción primaria a la derecha; sin banda
de color. Relleno `px-4 py-6`, `md:px-6`, `lg:px-8 lg:py-8`; separación entre
bloques 24px. Anchos: listas `max-w-[1200px]`, detalle y formularios `720px`.
Bajo 640px la acción baja a su línea y ocupa el ancho.

### Botones

Fuente: `src/shared/ui/estilos.ts` (`clasesDeBoton`), `DESIGN.md` §6.

- Base: 44px de alto, radio `md`, relleno `10px 18px`, 15px/600, gap 8px,
  `active:scale(.98)`, transición 150ms.
- `primaria`: fondo `marca`, texto `marca-texto`, hover `marca-hover`. Una sola
  por pantalla. `secundaria`: `lienzo` + borde `caliza-borde`, hover
  `superficie`. `fantasma`: sin fondo, texto `caliza-apagada`. `peligro`: borde
  y texto `senial-error`, fondo `lienzo`, hover `senial-error-suave`.
- **Foco**: `outline: 2px solid marca; outline-offset: 2px`, nunca `box-shadow`
  (sobrevive al alto contraste de Windows).
- **Inhabilitado**: fondo `caliza-relleno`, texto `caliza-inhabilitado`, sin
  opacidad.

### Tarjetas

Fuente: `estilos.ts` (`CLASES_DE_TARJETA`), `DESIGN.md` §6. `lienzo`, radio
`lg`, borde 1px `caliza-divisor`, `sombra-reposo`, relleno 20px. **Prohibido
anidar**: dentro de una tarjeta la jerarquía la dan título, espacio y zonas en
`caliza-superficie`.

### Campos

Fuente: `src/shared/ui/CampoDeLista.tsx`, `estilos.ts` (`clasesDeCampo`),
`DESIGN.md` §6. `lienzo`, borde 1px `caliza-borde` (3.5:1), radio `md`, 44px de
alto, relleno `10px 12px`, texto 15px. Etiqueta **siempre visible** arriba en
Label, a 6px. Ayuda debajo en Label apagada; error con borde `senial-error` y
mensaje con ícono. El `<select>` estiliza el control cerrado y deja la lista al
sistema operativo.

### Insignias de estado

Fuente: `src/shared/ui/InsigniaDeEstado.tsx`, `DESIGN.md` §6. Pastilla de 24px,
radio pill, ícono 14px + palabra 13px/500, fondo suave de la señal y texto en la
señal fuerte. Cuatro tonos con ícono propio: `neutro` (relleno/tinta), `exito`,
`aviso`, `error`. **Siempre ícono y palabra.**

### Tablas

Fuente: `DESIGN.md` §6 "Tablas". Contenedor tarjeta con `overflow-clip`; fila
48px; encabezado 40px en `caliza-superficie` con Label apagada; **sin cebra**;
texto a la izquierda, folios y fechas en `dato`; fila accionable con hover en
`superficie` y chevron. Móvil: dos renglones, mínimo 56px, sin `overflow-x`.

### Chips de filtro aplicado

Fuente: `src/shared/ui/ChipDeFiltro.tsx`. Pastilla de 32px, fondo
`marca-suave`, texto tinta, cierre "×" dentro, y es un enlace (navegación, no
estado de cliente) con `sr-only` "Quitar filtro: …".

### Avisos

Fuente: `src/shared/ui/Aviso.tsx`. Bloque con ícono, radio `md`, relleno
`12px`, fondo suave y texto en la señal. `role="alert"` solo en error;
`role="status"` en éxito y aviso.

### Estados de lista

Fuente: `src/shared/ui/EstadoVacio.tsx`, `DESIGN.md` §6. Dos vacíos distintos:
**vacío por primera vez** (ícono de línea 40px en `caliza-apagada`, una frase que
dice qué es la pantalla y la acción primaria) y **vacío por filtro** (nombra el
filtro y ofrece quitarlo). Cargando: esqueleto de la altura exacta de las filas
con pulso lento, sin spinner.

### Enlaces en texto

Fuente: `estilos.ts` (`CLASES_DE_ENLACE`). Tinta con subrayado y
`underline-offset: 2px`; el subrayado es lo que distingue el enlace del dato que
lo rodea. La marca no se usa como color de texto.

### Estado en vivo

Fuente: `src/shared/ui/EstadoEnVivo.tsx`. Superficie `lienzo` con borde divisor,
`sombra-reposo`, relleno 12px, ícono wifi (éxito) o wifi tachado (apagada),
texto 15px, `aria-live="polite"`, y un botón secundario "Actualizar ahora".

### Mapa operativo: pin, leyenda, lista

Fuente: `src/modules/mapa-operativo/ui/htmlDeMarcador.ts`,
`LeyendaDelMapa.tsx`, `ListaDeMarcadores.tsx`, `iconosDelMapa.ts`,
`domain/coloresDeEstado.ts`.

- **Un pin por calle**, en el punto de la calle; los hechos que comparten calle
  van agrupados en su ventana. El ícono dice qué es, el color cómo está, el aro
  rojo dice que lleva demasiado tiempo.
- Íconos: trazos de 24×24 en el propio código, uno por tipo (BACHE, ALUMBRADO,
  FUGA, BASURA, PARQUE, OBRA, REPAVIMENTACION, PAVIMENTACION, MEJORA,
  MANTENIMIENTO, OTRO). Un tipo desconocido cae a OTRO.
- Ventana del pin: folio (o tipo, si es intervención) como enlace, tipo, estado,
  fecha civil, "Atrasado · N días", y "Ver historial de calle". Sin datos de la
  persona que reportó.
- Leyenda: conteo por tipo (con su ícono) y por estado (con su color), más el
  renglón de atrasados. Es HTML del servidor: sin JavaScript se lee igual.
- Lista de marcadores: el camino sin JavaScript y la alternativa accesible al
  mapa; dice lo mismo que el mapa, incluida la señal de atraso con texto.

---

## 8. Reglas que un artboard tiene que cumplir

1. La marca solo en los seis lugares de la lista, y nunca como texto.
2. Todo estado lleva texto o ícono además del color (*la regla del tono
   ocupado*): la marca por defecto es tono 25 y el error es tono 27.
3. Foco visible con `outline` de 2px en `marca` y offset 2px.
4. Contornos de control en `caliza-borde`; el resto de las líneas en
   `caliza-divisor`.
5. Texto legible con piso de 15px; 13px solo de etiqueta o metadato.
6. Nada en mayúsculas sostenidas; sin `#fff` ni `#000`; sin cebra; sin degradados;
   sin tarjetas anidadas; sin sombra en botones, filas, chips, campos ni
   navegación.
7. Blancos táctiles de 44px o más; filas de 48px.
8. `prefers-reduced-motion` respetado.

---

## 9. Diferencias registradas (token que la fuente no tiene)

- **Borde del pin y aro de atraso.** `htmlDeMarcador.ts` escribe `#fff` y
  `#b91c1c` en línea. `DESIGN.md` §7 prohíbe `#fff` como superficie y no existe
  un token de "aro de atraso". Los artboards usan `caliza-lienzo` para el borde
  del pin y `senial-error` para el aro. Es la misma función con tokens del rol.
- **Relleno de tarjeta de 20px y separación etiqueta–campo de 6px** no están en
  la escala de `spacing` (4/8/12/16/24/32/48): viven en §5/§6 y en
  `CLASES_DE_TARJETA`/`CampoDeLista`.
- **No hay token de tamaño para el pin** (30px, contador 18px): están en el
  estilo en línea de `htmlDeMarcador.ts`.
- **No hay token de duración de transición**: §5 fija el rango 120–180 ms y
  `--ease-salida`; los componentes usan 150 ms.
