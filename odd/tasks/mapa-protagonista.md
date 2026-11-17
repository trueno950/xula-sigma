# Mapa protagonista: rediseño de `/mapa-operativo`

Implementa la dirección elegida en el lienzo de gentle design: `design/mapa-operativo/01-mapa-protagonista.html`. Las alternativas `02-resumen-y-mapa.html` y `03-vistas-de-trabajo.html` quedan como referencia. Los tokens salen de `design/system.md`, que a su vez cita `DESIGN.md` y `src/app/globals.css`. Ningún dato nuevo: la página muestra lo mismo que hoy, ordenado de otra manera.

## Specs

- **S1** — Orden y cabecera.
  - El título «Mapa operativo» lleva la descripción «Dónde están los reportes y las obras abiertas del municipio, qué lleva demasiado tiempo y qué no se puede dibujar todavía.»
  - La actualización en vivo deja de ser una tarjeta propia en esta página y queda en una línea bajo la descripción, con su botón «Actualizar ahora». Ninguna otra página cambia de aspecto.
  - Siguen, en este orden:
    1. la barra de filtros en una sola fila (Territorio, Tipo, Estado, Área y «Filtrar», con `<form method="get">` como hoy);
    2. una fila con los filtros aplicados como chips removibles (`ChipDeFiltro`) y el resumen con números fuertes: «N hechos · N calles en el mapa · N atrasados · N sin ubicar»;
    3. el mapa y su panel.
  - Desaparecen las dos líneas grises sueltas: «Ubicación aproximada de la calle» pasa a la cabecera del mapa y los conteos, al resumen.
- **S2** — El mapa es lo primero.
  - Desde 1024 px de ancho, el mapa y el panel van lado a lado: el mapa a la izquierda, con todo el alto útil (mínimo 560 px), y el panel a la derecha, de unos 380 px.
  - Por debajo de 1024 px todo se apila. El mapa va primero, con unos 60 % del alto de la pantalla, y los filtros se pliegan detrás de un `<details>` «Filtros (N)», donde N cuenta los filtros puestos.
  - La cabecera del mapa dice «Ubicación aproximada de la calle» y «N calles con hechos».
- **S3** — La leyenda vive dentro del mapa, como una capa compacta y plegable (`<details>` abierta por defecto en escritorio).
  - Muestra el total de hechos, «Por tipo» (ícono, etiqueta sin el «(reporte)» repetido, conteo), «Por estado» (color con su etiqueta escrita y conteo) y «Atrasados» (aro rojo y conteo).
  - Sin JavaScript se sigue leyendo, como HTML del servidor.
- **S4** — El panel lateral tiene dos pestañas: «En el mapa (N)» y «Sin ubicar (N)».
  - Sin JavaScript las dos listas siguen en el HTML y se pueden alcanzar. La pestaña elegida viaja en la URL (`?panel=sin-ubicar`) o equivalente sin JS.
  - Cada fila de «En el mapa» es una calle: su número de orden, el nombre de la calle, el territorio y sus hechos. Cada hecho lleva:
    - el ícono del tipo sobre el color de su estado;
    - el folio o tipo enlazado;
    - la insignia de estado con su texto;
    - el tipo, la fecha civil y «Atrasado · N días» cuando aplica.
  - Cada calle termina con «Ver historial de calle».
- **S5** — La fila y su marcador están ligados.
  - El marcador lleva el mismo número de orden que su fila, en la insignia del pin.
  - Cuántos hechos lleva la calle se dice en la fila y en la ventana del marcador.
  - Elegir una fila (clic o teclado) resalta su marcador y abre su ventana. Elegir un marcador resalta su fila.
  - El atraso sigue marcado con el aro rojo y `data-atrasado`.
- **S6** — «Sin ubicar» junta en un solo lugar lo que hoy son dos secciones, «Calles sin ubicar» y «Cobertura faltante»:
  - las calles sin punto por territorio, con su enlace para ubicarlas;
  - los hechos sin calle o con calle sin punto, con su enlace.

  Desaparecen las dos secciones sueltas de debajo del mapa.
- **S7** — Se conserva todo lo que ya funciona:
  - el camino sin JavaScript (la lista es la alternativa al mapa);
  - el aviso «Sin calles ubicadas en X. El mapa muestra todo Yucatán.»;
  - el estado vacío para filtros sin resultados, ahora con `EstadoVacio` y la forma de quitar los filtros;
  - el XSS-safe de la ventana;
  - los colores de estado del servidor;
  - el aislamiento por municipio.
  Los tests existentes que afirman comportamiento siguen pasando, o se actualizan solo donde el comportamiento cambió a propósito por esta spec.

## Tasks

- [x] **T1** (S1-S7) implementar el rediseño con TDD, tests y E2E — worker + orquestador — commit: `976edc3` (agregado), `e3909b5` (pantalla), siguiente (E2E, spec y Log)
- [ ] **T2** (S1-S7) verificador independiente, revisión nativa, PR y merge — verify — commit:

## Log

- **L1** — Pedido del usuario: «dale una revision a mapa operativo aun veo que puede mejorar el diseno, metele mas prioridad a esa parte, usa gentle design».
- **L2** — Diseño en `design/mapa-operativo/`, con las direcciones 01, 02 y 03 y el sistema en `design/system.md`. El usuario eligió `01-mapa-protagonista.html` desde el lienzo («Implement the design artboard design/mapa-operativo/01-mapa-protagonista.html»). 02 y 03 quedan como alternativas.
- **L3** — Decisión del orquestador, al interpretar el tablero: la insignia del pin pasa de contar los hechos de la calle a llevar el número de orden de su fila, que es lo que liga la fila con el marcador. El conteo de hechos se mueve a la fila y a la ventana del marcador. Es un cambio a propósito sobre el S5 del bloque B (`odd/tasks/mapa-territorial.md`).
- **L4** — T1 implementado con TDD (S1-S7). La pantalla queda en el orden de
  S1: descripcion en la cabecera de `PaginaDePanel`, `EstadoEnVivo` en una
  linea (variante `compacta` nueva, el default `tarjeta` intacto para el resto
  del panel), barra de filtros en una fila y plegada bajo «Filtros (N)» por
  debajo de 1024px, fila de chips + resumen con numeros fuertes, y el mapa con
  su panel. El mapa y la lista van lado a lado desde 1024px
  (`MapaYCalles`, el unico componente cliente, que liga fila y pin) y la
  leyenda es ahora una capa plegable dentro del mapa. El panel tiene las dos
  pestanas de S4, con `?panel=sin-ubicar` validado con Zod en
  `app/(panel)/mapa-operativo/parametros.ts`; «Sin ubicar» junta las calles
  sin punto y la cobertura faltante en un solo lugar (S6), y las dos listas
  siguen en el HTML del servidor. L3 aplicado: el dominio del mapa gana
  `orden`, `calleNombre` y `territorioNombre` por marcador -el territorio se
  resuelve con una lectura de subarbol por raiz, no con una consulta nueva-,
  el pin lleva el numero de fila en su insignia y el conteo de hechos se dice
  en la fila y en la ventana. Tests actualizados a proposito:
  `MapaOperativo.test.tsx` (se parte en `.test.tsx`, `.panel.test.tsx` y
  `.vacio.test.tsx` por la metrica de archivo), `MapaVisual.test.tsx`,
  `MapaOperativo.territorio.test.tsx` (props nuevas y el subarbol por raiz),
  `LeyendaDelMapa.test.tsx` (sin «(reporte)», con total y dentro de
  `details`), `htmlDeMarcador.test.ts` y `.xss.test.ts` (`data-orden` en vez
  de `data-hechos`, cabecera de la ventana), `mapaLeaflet.test.ts` (se parte
  con los dobles compartidos en `mapaLeafletDePrueba.ts`),
  `agregarMapa.territorio.test.ts` (el subarbol por raiz) y el E2E del mapa.
- **L5** — 2026-11-17. Ajustes del orquestador tras comparar las capturas con
  el tablero:
  - En escritorio sin JavaScript, el `<summary>` «Filtros (N)» quedaba
    oculto y el `<details>` cerrado, sin forma de abrirlo. El E2E «sin
    JavaScript, el territorio elegido filtra la lista del mapa» lo atrapó.
    Ahora el resumen se oculta en escritorio solo cuando el pliegue está
    abierto: `lg:[[open]>&]:hidden`.
  - En el teléfono, la leyenda abierta tapaba casi todo el mapa.
    `PliegueDeLeyenda` la pliega al montar por debajo de 1024px y la deja
    abierta en escritorio y sin JavaScript. Comparte
    `useAbiertoEnEscritorio` con `PliegueDeFiltros`.
  - Las caídas de E2E con «This page couldn't load» no venían del código: un
    `next start` huérfano de una corrida anterior seguía en el puerto 3107
    sirviendo chunks de otro build (`ChunkLoadError`, 500 en
    `/_next/static`).
  - Verificado:
    - unit 476/2877;
    - tipos;
    - biome;
    - `pnpm reglas` sin hallazgos;
    - integración del mapa 8/8;
    - E2E de mapa y reportes 14/14;
    - capturas a 1440 y 390 contra el tablero.
