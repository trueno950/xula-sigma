# Refinamiento de UX de Marca y Exportación

Octava parada del recorrido de pulido pantalla por pantalla, después de
Usuarios (`usuarios-ux.md`) y su track de seguridad
(`usuarios-seguridad.md`).

**Método** (el mismo de los anteriores):
1. Auditoría con capturas a 1440 y 390.
2. El usuario elige qué se arregla.
3. Las pantallas que cambian de estructura pasan antes por gentle design:
   dos direcciones, y el usuario elige con «Implement».

**Dónde se trabaja:** rama `feat/marca-exportacion-ux`; capturas en
`/tmp/ux-marca/`.

## Specs

Cada spec cita el hallazgo de la auditoría (L2) que el usuario aprobó en L3.

**Marca: colores**
- **S1 (M1)** — En el celular, la muestra de colores se ve mientras se
  elige: no queda debajo de los dos grupos de colores.
- **S2 (M2)** — «Restablecer colores» es una sección con título, dice qué
  colores se pierden y pide una confirmación que el servidor exige; sin
  ella no cambia nada.
- **S3 (M3)** — La muestra no promete una legibilidad que el color no
  tiene: el acento se muestra como lo que es (relleno) o con texto de
  contraste suficiente.
- **S4 (M4)** — Los avisos de `/marca` no pintan texto que venga en la
  URL: viajan como código y la página los traduce.
- **S5 (M5)** — Cada sección de `/marca` (colores, restablecer, escudo)
  tiene su título.

**Marca: escudo**
- **S6 (E1)** — Subir el escudo funciona sin JavaScript, con el mismo
  mensaje de error en español que con JavaScript.
- **S7 (E2)** — La pantalla muestra el escudo actual (o «Sin escudo») y
  permite quitarlo, con confirmación.
- **S8 (E3)** — Los requisitos del archivo (PNG, hasta 1 MiB, entre 80×80
  y 2048×2048 píxeles) se leen antes de elegirlo.
- **S9 (E4)** — El error del archivo aparece junto al campo y el archivo
  rechazado no queda elegido.

**Exportación**
- **S10 (X1)** — Antes de descargar, la pantalla lista cada archivo que
  lleva el ZIP, incluidos los datos del personal (`usuarios.csv`) y la
  bitácora, y avisa que contiene datos del personal; el ZIP sigue completo.
- **S11 (X2)** — Cada conjunto dice cuántas filas lleva.
- **S12 (X3)** — Mientras se prepara y al terminar, la pantalla lo dice
  (con el nombre del archivo).
- **S13 (X4)** — Si la descarga falla, la operadora ve el error dentro del
  panel, no una página en blanco con texto.
- **S14 (X5)** — La pantalla no promete una bitácora que no se puede ver:
  dice dónde queda el registro o deja de prometerlo.

**Permiso**
- **S15 (P1)** — `/exportacion` sin permiso conserva el encabezado del
  panel (es raíz de sección: no lleva migaja, regla de
  `raicesSinMigaja.test.ts`).
- **S16 (P2)** — Las pantallas sin permiso de `/marca` y `/exportacion`
  dicen qué rol hace falta y a quién pedirlo.

Fuera de alcance (baja): M6, M7, M8, E5, E6, X6, X7, P3.

## Tasks

- [x] **T0** auditoría con capturas de `/marca` (escudo y colores) y de la exportación de datos — worker — commit: (sin cambios de código; capturas en `/tmp/ux-marca/`)

- [x] **T1** (S1-S5, S7-S16) diseño en gentle design: dos direcciones para `/marca` y dos para `/exportacion`; el usuario elige — design — commit:
- [x] **T2** (S6, S8, S9) el escudo se sube sin JavaScript — worker — commit: 7c88d4a
- [x] **T3** (S2, S4) restablecer con confirmación del servidor y avisos por código — worker — commit: 7c88d4a
- [x] **T4** (S1, S3, S5, S7) `/marca` según `design/marca/02-vista-previa-primero.html` (L5) — worker — commit: 6fa042a
- [x] **T5** (S10-S15, S16 en `/exportacion`) `/exportacion` según `design/exportacion/01-inventario-antes-de-descargar.html` (L6) — worker, worktree `.pi/wt-diseno-m` — commit: c692ba2, integrado como 653dc78
- [x] **T6** (S1-S16) verificación, revisión, PR y merge — verify — commit: e7158ff (ver L11)

## Log

- **L1** — Al abrir el track de seguridad de Usuarios el usuario pidió: «si
  sigue con el track luego continuas con el modulo de marca y
  exportacion». El track de seguridad cerró con #157-#161.
- **L2** — Auditoría (T0) con 18 capturas en `/tmp/ux-marca/`. Colores
  del demo restaurados (Verde + acento #e07800); no se subió escudo; se
  generó un ZIP de exportación (borrado después: lleva correos del personal).
  26 hallazgos:
  - **Colores:** M1 la muestra queda fuera de pantalla en el celular
    (alta), M2 «Restablecer colores» sin confirmación ni título (alta), M3
    el chip «Acento» con contraste 3.01:1 / 1.61:1, M4 `?error=` y `?ok=`
    se pintan desde la URL, M5 tres tarjetas sin títulos, M6 18 controles
    sin «Actual», M7 el selector exacto no arranca del color actual, M8
    `?ok=` a mano.
  - **Escudo:** E1 sin JavaScript no se puede subir y falla en silencio
    (alta), E2 sin vista previa ni «Quitar escudo» (alta), E3 requisitos
    solo al fallar, E4 el error no va junto al campo, E5 «Escudo
    actualizado.» solo en el cliente, E6 «Choose File» en inglés.
  - **Exportación:** X1 el ZIP lleva `usuarios.csv` (correos del personal)
    y `bitacora.csv` sin decirlo (alta), X2 sin conteos ni tamaño, X3 sin
    estado durante ni después, X4 los fallos son texto plano, X5 promete
    bitácora que no se puede ver, X6 nombre sin hora, X7 sin migaja.
  - **Permiso:** P1 `/exportacion` sin encabezado, P2 no dice qué rol ni a
    quién pedirlo, P3 (correcto: el menú se oculta por rol).
  - Candidatas a gentle design: `/marca` y `/exportacion`.
  - No comprobado: operador/consulta (sus claves temporales), teclado,
    lector de pantalla, 403/500 de la descarga.
- **L3** — El usuario eligió «Alta y media (recomendado)», «Mantenerlos y
  decirlo claro (recomendado)» para X1 y «Sí, las dos (recomendado)» para
  gentle design: 16 hallazgos (S1-S16).
- **L4** — T1: direcciones de diseño en `design/marca/`
  (`01-colores-con-la-muestra-fija.html`, `02-vista-previa-primero.html`) y
  `design/exportacion/` (`01-inventario-antes-de-descargar.html`,
  `02-acta-de-entrega.html`). Los conteos de filas son de ejemplo; los 19
  conjuntos salen del código de la exportación. No se renderizaron en un
  navegador (solo verificación estructural).
- **L5** — El usuario eligió desde el lienzo el diseño de `/marca`:
  «Implement the design artboard design/marca/02-vista-previa-primero.html».
  - `01-colores-con-la-muestra-fija.html` queda como alternativa.
  - T4 toca los mismos archivos que T2/T3 (`src/modules/marca/ui`):
    arranca cuando esas terminen.
- **L6** — El usuario eligió desde el lienzo el diseño de `/exportacion`:
  «Implement the design artboard
  design/exportacion/01-inventario-antes-de-descargar.html».
  - `02-acta-de-entrega.html` queda como alternativa.
  - T5 corre en el worktree `.pi/wt-diseno-m` (archivos de exportación,
    distintos de los de marca); la parte de S16 en `/marca` va con T4.
- **L7** — T2/T3 implementadas por el worker. Corrección de S8: el código
  nunca exigió un escudo cuadrado (`domain/png.ts` acepta 80×80 a
  2048×2048 por lado); «cuadrado» venía de la auditoría, no del usuario, y
  la spec se corrige a la regla real en vez de endurecer la validación.
- **L8** — Caso «sin JavaScript, archivo de más de 2 MB»: Next corta el
  cuerpo de la Server Action antes de invocarla y responde con su propia
  página; ni la acción ni `error.tsx` lo pueden redactar. Con JavaScript se
  resolvió en el navegador (`CampoDeArchivoDeEscudo` descarta el archivo y
  muestra el mensaje) y `/marca/error.tsx` reemplaza la página en inglés.
  Decisión del orquestador: limitación conocida y escrita (S8 avisa el
  límite antes de elegir); no se sube `bodySizeLimit` (superficie de abuso
  de memoria en todo el panel) ni se pasa la subida a un Route Handler.
- **L9** — T5 terminado en el worktree (rama
  `feat/marca-exportacion-diseno`, por integrar). Lista y conteos salen de
  la misma fuente que el ZIP (`conjuntosDePlataforma` + `porciones`,
  `count(*)` bajo RLS), fijados por `inventarioDeExportacion.isolation`.
  Sin JavaScript un fallo de la descarga responde 303 a
  `/exportacion?error=<código>`; con JavaScript una isla muestra el estado.
  Corrección de S15: `/exportacion` es raíz de sección y no lleva migaja.
  Pendiente al integrar: la E2E vieja `exportacionDeDatos.spec.ts` espera
  un evento `download`, y con JavaScript la descarga ahora es por blob.
- **L10** — T4 terminado en `6fa042a`: vista previa de la marca guardada
  (servidor), tres secciones plegables con título, la muestra primero, el
  acento con su contraste medido, «Quitar escudo» (`quitarEscudoAction`,
  `confirmar=si` en el servidor; borra la referencia en la transacción y
  después el objeto, sin fallar si el borrado del objeto falla). E2E de
  marca 30/30. T5 integrado como `653dc78`.
- **L11** — T6: la E2E nueva del inventario fallaba por la prueba (el
  municipio de prueba trae un escudo que no es de object storage y el
  anunciador de rutas de Next es un segundo `alert`); corregida en
  `e7158ff`, 10/10 ×2. Verificador independiente del track: S1-S16
  cumplidas, sin bloqueos; unit 3746, integración 56, `check` limpio.
  - Seguimientos: el 404 de la descarga ahora lleva `content-type:
    text/plain` (antes sin cabecera); sondas sugeridas para el 404 sin
    navegación, `quitarEscudoAction` sin `ambito`, y `totalDeArchivos`
    contra el ZIP; S1 (viewport), S6 (subida real sin JS) y S12 (estado
    final con JS) solo con E2E; los hallazgos de baja M6-M8, E5, E6, X6, X7.
