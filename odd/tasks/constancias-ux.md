# Refinamiento de UX del módulo Constancias

Tercera parada del recorrido de pulido pantalla por pantalla, después de
Reportes (`odd/tasks/reportes-ux.md`) y Padrón (`odd/tasks/padron-ux.md`).

**Método:**
1. Auditoría con capturas a 1440 y 390.
2. El usuario elige qué arreglar.
3. La pantalla que cambia de estructura pasa antes por gentle design: dos
   direcciones, y el usuario elige con «Implement».

Los tokens salen de `design/system.md`.

**Patrones a reusar:**
- la tabla con columnas fijas, el conteo y los chips del listado de Padrón
  (`design/padron-listado/01-tabla-con-domicilio.html`);
- el acordeón `<details name>` de acciones (`AccionesDeReporte`,
  `AdministrarPersona`).

**Rama y bases:**
- Rama `feat/constancias-ux` en `.pi/wt-c`.
- Base de pruebas `xula_test_c`, más `xula_test` para el pre-push.
- Capturas de la auditoría en `/tmp/ux-constancias/`.

## Specs

Los textos entre comillas son los de la auditoría que el usuario aprobó en
L2: «1», que es prioridad alta y media, sin L4 ni C1.

### Listado `/constancias`

- **S1** (L1): «Cada fila solo muestra folio, estado y fecha. Falta **a
  quién se le emitió**, así que no se puede reconocer la constancia de una
  persona sin abrirla una por una.»
  - Cada fila muestra el nombre del titular.
- **S2** (L2): «El buscador no dice qué busca (¿folio?, ¿nombre?). No hay
  línea de «N constancias para «…»» ni etiqueta para quitar el filtro, como
  ya tienen Padrón y Reportes.»
- **S3** (L3): «No hay **«Emitir constancia»** en el listado: solo se puede
  emitir desde la ficha de una persona.»

### Emitir `/constancias/emitir`

- **S4** (E1): «Si entras sin una persona elegida, la pantalla es un
  callejón sin salida que solo dice «Ir al padrón». Debería dejarte
  **buscar a la persona ahí mismo**.»
- **S5** (E2): «No se ve **qué se va a imprimir** antes de confirmar: falta
  una vista previa con el texto de la constancia y quién firma.»
- **S6** (E3): «El aviso «El sistema no aplica un periodo mínimo…» está en
  letra chica. Debería destacarse como aviso y decir cuánto tiempo lleva la
  persona en su domicilio (por ejemplo, «1 mes y 17 días»), para que la
  operadora lo compruebe de un vistazo.»

### Detalle `/constancias/[id]`

- **S7** (D1): «El detalle **no muestra si la constancia está vigente o
  cancelada**; eso solo se ve en el listado.»
- **S8** (D2): «No hay enlace a la **ficha del titular** en Padrón.»
- **S9** (D3): «Reimprimir» y «Cancelar» van como tarjetas sueltas.
  Conviene usar el mismo acordeón de acciones que Reportes y Padrón, con
  «Cancelar» al final y en rojo.

### Transversal

- **S10:** se preservan los formularios nativos sin JavaScript (tabla de
  excepciones de `AGENTS.md`), los permisos, el aislamiento entre
  municipios (otro tenant da 404) y los folios. Las fechas civiles pasan
  por `shared/lib/fecha`.

## Tasks

- [x] **T0** (S1-S3, S7-S9) diseño en gentle design: dos direcciones para
  el listado y dos para el detalle; el usuario elige — design — commit:
- [x] **T1** (S1, S2, S7, S8) datos:
  - titular en el modelo de lectura del listado y búsqueda por nombre o
    folio;
  - estado y `personaId` del titular en el detalle;
  - mapa de lo que hay hoy.

  — worker — commit: 7fe219e
- [x] **T2** (S1-S3) listado según `design/constancias-listado/01-tabla-con-titular.html` (L3) — worker — commit: 1d3eed2
- [x] **T3** (S4-S6) emitir: buscador de persona en la página, vista previa
  y aviso con el tiempo de residencia — worker — commit: f58e399, 839fb24
- [x] **T4** (S7-S9) detalle según `design/constancias-detalle/02-hoja-sellada.html` (L5), reusando `HojaDeConstancia` de T3 — worker — commit: c9038d6
- [x] **T5** (S1-S10) verificación, PR y merge — verify — commit: PR #147, 836b64f

## Log

- **L1** — El usuario, al cerrar Padrón (PR #146), recibió la
  recomendación de seguir con Constancias y respondió: «dale».
- **L2** — Auditoría con capturas en `/tmp/ux-constancias/`, de listado,
  emitir, detalle y configuración a 1440 y 390. El usuario eligió «1»:
  - «L1–L3, E1–E3 y D1–D3», con diseño primero para el listado y el
    detalle;
  - L4, que es «Bloque de firma» antes del buscador en el celular, y C1,
    la vista previa de la firma, quedan fuera.
- **L3** — El usuario eligió el listado desde el lienzo: «Implement the
  design artboard design/constancias-listado/01-tabla-con-titular.html».
  - `01-tabla-con-titular.html` es la dirección elegida;
    `02-fichas-por-titular.html` queda como alternativa.
  - La columna «Tipo» no se implementa mientras exista un solo tipo,
    `vecindad-v1`: repetiría el mismo valor en cada fila. Fue recomendación
    del orquestador y el usuario no la objetó.
  - T2 arranca cuando T1 entregue el titular en el modelo del listado.
- **L4** — T1 hecho.
  - **Modelo de lectura:** `ConstanciaGuardada` suma `nombreDelTitular`,
    leído del snapshot de emisión, y `estado`, derivado de `canceladaEn`.
    El snapshot es el registro legal y no se lee el padrón vivo.
  - **Búsqueda:** encuentra por folio o por el nombre del titular, sin
    distinguir acentos, con una consulta por página.
  - **Detalle:** `personaId` y los datos de cancelación ya estaban en el
    modelo.
  - **Verificado:** unit 173, integración 43, `pnpm layers` y
    `pnpm reglas`.
  - **Mapa para T3:**
    - `buscarPersonas` de `padron` ya es alcanzable, y la dependencia
      `constancias → padron` ya existe.
    - La vista previa reusa los puertos de titular y dirección, más
      `documentosDelAyuntamiento` para la firma.
    - La duración de la residencia, de S6, necesita una función nueva en
      `shared/lib/fecha`.
  - **Riesgo anotado:** `textoDeBusquedaSql` quedó duplicado de
    `territorio`, como en el precedente de `escaparComodinesDeLike`.
- **L5** — El usuario eligió el detalle desde el lienzo: «Implement the
  design artboard design/constancias-detalle/02-hoja-sellada.html».
  - `02-hoja-sellada.html` es la dirección elegida;
    `01-ficha-y-acciones.html` queda como alternativa.
  - El tradeoff del tablero pide que «la vista previa de emitir y esta hoja
    deben decir lo mismo». Por eso T3 construye la hoja como un solo
    componente de servidor, `HojaDeConstancia`, con props con forma de
    snapshot y un sello opcional. T4 lo reusa en el detalle, leyendo el
    snapshot guardado.
  - T4 arranca cuando termine T3.
- **L6** — El usuario, sobre `02-hoja-sellada.html`: «solo el label del
  estatus se repite arriba y en lap vista previa».
  - **Decisión del orquestador:** el estado se muestra una sola vez, como
    sello sobre la hoja, que es la idea del tablero elegido. Se quita la
    insignia de la cabecera, junto al folio.
  - En una constancia cancelada, la hoja lleva el sello «Cancelada» con la
    fecha y el motivo, como en el tablero.
  - S7 queda: el estado se ve en el detalle, una vez.
- **L7** — T3 hecho en `2c2afa3` y `b8ea1fc`, en la rama
  `feat/constancias-emitir`, que sale de `7fe219e` y se integra a
  `feat/constancias-ux`.
  - **S4:** sin persona, emitir busca en el padrón con un GET nativo y no
    ofrece personas dadas de baja.
  - **S5:** `HojaDeConstancia` repite la redacción de la plantilla
    `ConstanciaDeVecindadV1` y lleva la firma.
  - **S6:** el aviso `duracionCivil` dice, por ejemplo, «Reside ahí desde
    el 9 oct 2026: 1 mes y 9 días.».
  - **Verificado:**
    - E2E: emitir 4, títulos 3 y cancelada 5;
    - unit completa en verde;
    - integración 43;
    - `pnpm layers`, `pnpm reglas` y el build.
  - El orquestador agregó `vistaPreviaDeConstancia` al mock de
    `recursoAjeno.test.tsx`.
  - T4 corre en `.pi/wt-c3`, encima de T3, porque reusa `HojaDeConstancia`.
    Hereda tal cual su redacción, que es la de la plantilla del PDF y no la
    paráfrasis del tablero.
- **L8** — T2 y T4 terminados e integrados en `feat/constancias-ux`.
  - **Commits:**
    - `1d3eed2`: el listado, T2;
    - `f58e399` y `839fb24`: emitir, T3, traídos de la rama de emitir;
    - `c9038d6`: el detalle, T4.
  - **Detalle:**
    - `SelloDeConstancia` lleva el estado una sola vez (L6);
    - `AccionesDeConstancia` usa `<details name>`, con «Cancelar» al
      final;
    - `HistorialDeConstancia` se arma del modelo de lectura.
    - Una cancelada ofrece «Emitir una constancia nueva». Se borró
      `AccionColegable.tsx`, que quedó sin uso.
  - **Verificado:**
    - T2: unit completa 3098 y E2E 16;
    - T4: unit completa 3126 y E2E 28 en 6 specs.
