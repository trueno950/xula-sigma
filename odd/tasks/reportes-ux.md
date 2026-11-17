# Refinamiento de UX del módulo Reportes

Primera parada del recorrido de pulido pantalla por pantalla (L1). El método lo eligió el usuario en L2: primero una auditoría con capturas reales, después los arreglos que elija, y diseño en gentle design solo cuando cambia la estructura de una pantalla. Los tokens salen de `design/system.md`. El mapa operativo (`odd/tasks/mapa-protagonista.md`) es el precedente de patrones: filtros plegables en «Filtros (N)», chips que se pueden quitar y resumen con números fuertes.

## Specs

Los textos entre comillas son los de la auditoría que el usuario aprobó en L3 («1»: todo lo de prioridad alta y media).

### Bandeja `/reportes`

- **S1 (B1)** — «En el celular no se ve ningún reporte al entrar».
  - La lista tiene que aparecer en la primera pantalla de un teléfono de 390×844, con los filtros plegados y el resumen compacto.
  - Nada importante queda debajo de la barra de navegación inferior.
- **S2 (B2)** — «El resumen (Total / Por estado / Por área) es una tarjeta grande que no se puede tocar».
  - Pasa a ser una franja compacta de contadores, y cada número aplica su filtro, por ejemplo «2 Recibidos», «1 atrasado» o «5 sin área».
  - Los conteos siguen los filtros elegidos, igual que hoy (bloque C, S2).
- **S3 (B3)** — «Hay que pulsar Buscar después de cada cambio, y en escritorio ese botón y Solo atrasados quedan solos en una segunda fila».
  - En escritorio, los filtros van en una fila.
  - En el celular, se pliegan en «Filtros (N)».
  - Los filtros puestos aparecen como chips que se pueden quitar.
  - Sin JavaScript se sigue filtrando con el `<form method="get">`. Filtrar al cambiar es una mejora progresiva, no un requisito.
- **S4 (B4)** — «La tabla no dice dónde ocurrió cada reporte»: se agrega el lugar y la calle de cada reporte (o el domicilio, si el reporte se registró así).
- **S5 (B5)** — «Configurar atraso» pasa a ser una acción secundaria, sin el peso de «Registrar reporte». Solo la ve quien hoy tiene permiso.
- **S6 (B6)** — «Atrasado · N días» deja de agregar un renglón bajo el estado. En el celular, cada reporte es una fila compacta que claramente se puede tocar.

### Registrar `/reportes/alta`

- **S7 (A1)** — El orden de los campos es Tipo → Dónde → Detalle.
- **S8 (A2)** — En el celular, la ayuda de «Descripción» y el botón «Registrar reporte» no quedan tapados por la barra inferior.
- **S9 (A3)** — Las opciones «Lugar y calle / Domicilio registrado» tienen un área de toque de al menos 44 px y explican en qué se diferencian.
- **S10 (A4)** — «Calle» no muestra «Ninguna» antes de elegir el lugar. Los campos obligatorios se marcan. La ayuda de «Referencia» se acorta.

### Detalle `/reportes/detalle/[id]`

- **S11 (D1)** — El detalle muestra dónde ocurrió (lugar y calle, o domicilio) y la fecha de registro. Enlaza al historial de la calle y al mapa operativo cuando hay calle.
- **S12 (D2)** — El estado se muestra con la misma insignia que la bandeja, junto con el atraso cuando aplica.
- **S13 (D3)** — Las acciones dejan de estar todas abiertas a la vez.
  - El paso siguiente válido es la acción principal.
  - «Rechazar…», «Asignar área…» y «Programar obra…» van plegados.
  - «Rechazar», que es una acción destructiva, nunca queda junto a la acción principal.
  - Mismas acciones, mismos permisos y mismas reglas de transición que hoy.
- **S14 (D4)** — «Programar obra» deja de ser una tarjeta dentro de otra tarjeta y su título no se repite.
- **S15 (D5)** — Los datos van en filas compactas, con el estado visible sin desplazarse en el teléfono. El historial no queda detrás de los formularios.

### Transversal

- **S16** — Se conserva lo que ya funciona:
  - los formularios nativos sin JavaScript;
  - los mensajes de error de las acciones;
  - las mismas reglas y permisos;
  - el aislamiento por municipio;
  - los conteos iguales al listado.

  Los tests existentes siguen pasando, o cambian solo donde S1-S15 cambian el comportamiento a propósito.

## Tasks

- [ ] **T0** (S1-S3, S6, S13-S15) diseño en gentle design: dos direcciones para la bandeja y dos para el detalle; el usuario elige — design — commit:
- [x] **T1** (S4, S11) lugar, calle o domicilio, y fecha, en la lectura de la bandeja y del detalle — worker — commit: `cf8da6c`
- [ ] **T2** (S1-S6) bandeja según la dirección elegida — worker — commit:
- [x] **T3** (S7-S10) formulario de alta — worker — commit: siguiente
- [ ] **T4** (S11-S15) detalle según `design/reportes-detalle/01-ficha-y-acciones.html` (L7) — worker — commit:
- [ ] **T5** (S1-S16) verificación, revisión nativa, PR y merge — verify — commit:

## Log

- **L1** — Pedido del usuario: «ya tenemos gran avance en los flujos, como siguiente paso seria afinar mas las pantallas para tener un mejor ux/ui y flujos y pantallas adecuadas con las herramientas necesarias, filtros, botones adecaudos, selects etc, orden y ajuste necesario para un usuario que lo utilice podemos ir pantalla por pantalla para refinar esos modulos a su vez detectar mejoras».
- **L2** — El usuario eligió «Reportes (Recomendado)» como primer módulo y «Auditoría y luego arreglos (Recomendado)» como método.
- **L3** — Auditoría con capturas a 1440 y 390 de `/reportes`, `/reportes/alta`, `/reportes/detalle/[id]` y `/reportes/configuracion` (B1-B6, A1-A4, D1-D5, C1). El usuario eligió «1»: todo lo de prioridad alta y media; C1 queda fuera. Por el método de L2, la bandeja y el detalle pasan por gentle design antes del código, porque cambia su estructura.
- **L4** — T1 hecho, solo datos y sin tocar UI. `listarReportes`/`buscarReportes` devuelven `ReporteDeBandeja` (`ReporteGuardado` + `ubicacion`) y hay un caso de uso nuevo, `detalleDeReporte`, con `ubicacion` y `fechaDeRegistro` (`YYYY-MM-DD` en Merida, por `fechaCivilDeInstante`). `ubicacion` es `{ modo: "CALLE" | "DOMICILIO", lugar, calleId, calle, domicilio, raizId }`: `calleId` es el de `/calles/[id]/historial` y `raizId` el de `/mapa-operativo?lugar=`, porque la UI no puede armar la URL del mapa sin la raíz. Los nombres los resuelve `territorio` por su API pública en una sola lectura por página (`listarLugares`, `callesParaMapa`, `listarDomicilios`), después de cerrar la transacción de `reportes` —anidar `withTenant` traba el pool de una conexión—. T2 y T4 los pintan; `ListadoDeReportes` sigue compilando sin cambios porque la fila es un supertipo de `ReporteGuardado`.
- **L5** — T0, diseño en gentle design. Los tableros se escribieron en
  `design/` del árbol principal, que es el que lee el lienzo:
  - Bandeja, en `design/reportes-bandeja/`:
    - `01-tabla-con-contadores.html`;
    - `02-pestanas-por-estado.html`.
  - Detalle, en `design/reportes-detalle/`:
    - `01-ficha-y-acciones.html`;
    - `02-encabezado-de-trabajo.html`.

  Se esperan las elecciones del usuario. Nota para la implementación: el
  tablero de la bandeja marca «Atrasado» también a un reporte en «En
  atención», pero la regla vigente (S1 de `gestion-municipal`) solo marca
  los `RECIBIDO`, y se sigue la regla. El detalle usa el catálogo cerrado
  real de motivos de rechazo, sin «Otro» (regla 9 de `AGENTS.md`).
- **L6** — T3 hecho. El alta va en el orden Tipo → Dónde → Detalle, bajo
  el grupo «Qué pasó y dónde».
  - Las dos formas de ubicar llevan una explicación de un renglón y un
    área de toque de 44 px. La etiqueta envuelve al radio, y la
    explicación queda fuera del nombre accesible.
  - «Calle» dice «Elija primero el lugar» en vez de «Ninguna» y conserva
    la lista completa, que es el camino sin JavaScript.
  - La ayuda de «Referencia» ocupa un renglón.
  - Los obligatorios se marcan con una línea: «Todos los campos son
    obligatorios, salvo la calle y la referencia». No se usó un asterisco
    por etiqueta, porque cambiaría el nombre accesible que
    `e2e/direccionDeReporte.spec.ts` busca con `exact: true`.
  - S8 no tuvo RED: el layout ya reservaba el espacio de la barra
    inferior, y el E2E con cajas a 390×844 queda como verificación.
  - Verificado: unit 134, E2E `reportes` 8/8, `direccionDeReporte` 2/2,
    tipos, biome y `pnpm reglas`.
- **L7** — El usuario eligió el detalle desde el lienzo: «Implement the
  design artboard design/reportes-detalle/01-ficha-y-acciones.html».
  `01-ficha-y-acciones.html` es la dirección elegida;
  `02-encabezado-de-trabajo.html` queda como alternativa. Arranca T4. La
  bandeja todavía no tiene elección, así que T2 sigue esperando.
- **L8** — T4 hecho según `01-ficha-y-acciones.html`.
  - Desde 1024 px son dos columnas. A la izquierda, ficha e historial
    (`FichaDeReporte` y `HistorialDeReporte`). A la derecha, el panel
    `PanelDeAcciones`, pegado arriba.
  - El panel lleva el primer paso válido como primario, el otro como
    secundario, «Programar obra…» y «Asignar área…» como `<details>`, y
    «Rechazar reporte…» al final, tras un divisor.
  - `ProgramarObra` gana `embebido`: sin tarjeta propia ni título
    duplicado. Por defecto no cambia.
  - `PaginaDePanel` gana `ancho="detalleAmplio"` (1040 px). Los anchos
    existentes no cambian.
  - Se actualizó a propósito `e2e/intervenciones.spec.ts`: abre el
    desplegable «Programar obra…» en vez de esperar un encabezado visible.
  - Verificado:
    - unit 482 archivos / 2933 tests;
    - E2E de reportes, detalle, intervenciones y dirección de reporte:
      18/18;
    - tipos, biome y `pnpm reglas`;
    - capturas a 1440 y 390 contra el tablero.
