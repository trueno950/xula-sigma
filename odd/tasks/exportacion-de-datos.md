# Exportación de datos del ayuntamiento

Frente B del cierre de la Fase 0: el `ADMIN_MUNICIPAL` descarga todos los
datos de su municipio en un ZIP. El backend existe
(`src/shared/exportacion/exportar.ts`, `src/app/exportacion/porciones.ts`) y
ninguna ruta lo consume. Rama `feat/exportacion-de-datos`, un PR. Runner:
Vitest (integración sobre `xula_test`), Playwright y `pnpm check`.

## Specs

- **S1.** `ROADMAP.md`: «**Exportación completa por ayuntamiento** en formato
  abierto.» y «Cuando cambia la administración y no renuevan, el municipio
  necesita su información — y probablemente esté obligado a conservarla por
  normativa de archivo. Si no se puede entregar limpia, sus datos quedan
  secuestrados.» Decisión del usuario sobre el formato: «ZIP con un CSV por
  tabla (Recomendado)». La pantalla y su enlace del panel solo existen para el
  rol que `puedeExportar` permite (`ADMIN_MUNICIPAL`); la descarga vuelve a
  exigirlo en el servidor.

- **S2.** Decisión del usuario: «Sí, exportación completa (Recomendado)» —
  «El ZIP sale con todo lo del municipio. Con los folios, quien reciba los
  datos puede seguir la numeración sin repetirla.» Se agregan las porciones
  que faltan: `zonas`, `calles_de_zonas`, `eventos_de_calles`,
  `intervenciones`, `revisiones_de_intervenciones`, `reimpresiones`,
  `configuracion_de_documentos`, `folios_de_documentos` y
  `folios_de_reportes`. Siguen fuera, a propósito (`exportar.ts`), `cuentas`,
  `sesiones`, `verificaciones` e `intentos_acceso`: credenciales y telemetría,
  no datos del municipio. Ningún conjunto nuevo lleva `ayuntamiento_id`
  (`bitacora` ya lo llevaba antes de este frente: es el id del propio
  municipio).

- **S3.** Decisión del usuario: «Para abrir en Excel (Recomendado)» — «UTF-8
  con BOM, separados por coma y fechas en hora de Mérida legibles (2026-11-13
  18:05). Así Excel muestra bien los acentos al abrirlos con doble clic.» Un
  CSV por conjunto, con encabezado; comillas, comas y saltos de línea se
  escapan según RFC 4180. Las fechas pasan por `shared/lib/fecha`.

- **S4.** Decisión del usuario: «Sí, incluir la imagen» — el ZIP lleva
  también el escudo del municipio, leído del almacenamiento de objetos,
  además de un `manifiesto.json` con subdominio, nombre, marca y momento de
  generación. Si el municipio no tiene escudo, el ZIP sale sin él; si el
  almacenamiento falla, la descarga falla con un mensaje para la operadora,
  nunca con un ZIP incompleto que parezca completo.

- **S5.** Invariante (`docs/architecture/invariantes-criticos.md`): «Toda
  exportación masiva queda en bitácora con usuario, momento, alcance y
  cantidad de registros.» El spec vigente
  (`openspec/specs/padron-ciudadano/spec.md`) ya retiró «alcance y cantidad»
  y pide «actor, origen y la accion `EXPORTAR_AYUNTAMIENTO`, en la misma
  transaccion que la lectura»; eso no cambia en este frente.

- **S6.** Aislamiento y bordes: la descarga es un Route Handler `GET` que
  repite las guardas del panel (superficie, ayuntamiento, sesión). El
  `ayuntamientoId` sale del contexto del servidor, nunca de la URL. Sin
  sesión → 401; rol sin permiso → 403; tenant no resuelto → 404. La
  respuesta es `application/zip`, `Content-Disposition: attachment`,
  `Cache-Control: no-store`. El ZIP nunca contiene hashes ni tokens
  (`$argon2`, `password`, `token`), y no se loguean nombres, CURP ni
  domicilios.

- **S7.** Sin dependencia nueva salvo justificación (AGENTS, antipatrón 22):
  el contenedor ZIP lo arma un escritor propio de solo almacenamiento
  (sin compresión) en `shared/exportacion`, con CRC32 probado contra bytes
  conocidos y abierto por `unzip` real en un test.

## Tasks

- [x] **T1** (S3, S7) escritor ZIP y CSV en `shared/exportacion` — worker — commit: `b57dd55` `b57dd55`
- [x] **T2** (S2) porciones que faltan — worker — commits: `89b4a4d`, `7222c89`
- [x] **T3** (S1, S4, S5, S6) descarga, pantalla, enlace del panel, escudo y E2E — worker — commits: `b194e8e`, `d5de30f`
- [x] **T4** (S1-S7) verificación independiente, revisión y cierre — verify — ver L6

## Log

- **L1** — 2026-11-13. Usuario: «A, luego B (Recomendado)»; formato «ZIP con
  un CSV por tabla (Recomendado)».
- **L2** — 2026-11-13. Mapa del explorador: `exportarAyuntamiento` guarda el
  rol, abre `withTenant`, lee todo en memoria y registra
  `EXPORTAR_AYUNTAMIENTO` en la misma transacción; conjuntos actuales
  `usuarios`, `bitacora`, `personas`, `lugares`, `calles`, `domicilios`,
  `residencias`, `constancias`, `reportes`, `movimientos_de_reportes`. Sin
  dependencia ZIP ni helper CSV en el repo. Precedente de Route Handler con
  guardas propias: `src/app/(panel)/constancias/[id]/pdf/route.ts`.
- **L3** — 2026-11-13. Decisiones del usuario citadas en S2, S3 y S4.
- **L4** — 2026-11-13. T1: `aCsv` (BOM, coma, CRLF, RFC 4180, fechas por
  el nuevo `fechaYHoraIsoEnMerida`, «2026-11-13 18:05»), `crc32` ("123456789"
  → 0xCBF43926) y `armarZip` (solo almacenamiento, bit UTF-8, rechaza nombres
  repetidos, `..` y `/` inicial; sin ZIP64). RED por módulo inexistente,
  GREEN 79 tests unitarios; `unzip -t` y `unzip -p` del sistema abren el
  archivo y devuelven los bytes idénticos. El Info-ZIP 6.00 de macOS no
  selecciona por nombre UTF-8: el test lo documenta y verifica el nombre
  guardado por bytes.
- **L5** — 2026-11-13. T3. RED por módulo inexistente en
  `archivoDeExportacion` y en `descargaDeDatos`/`route`, y por inventario en
  `titulos.test.ts`, `raicesSinMigaja.test.ts`, `NavegacionDeModulos.test.tsx`
  y `modulosDelPanel.test.ts` (6 fallos visibles). GREEN: 3026 tests en 567
  archivos y 80 E2E, incluidos los dos nuevos.
  - `archivoDeExportacion.ts`: un `<conjunto>.csv` por conjunto —incluso
    vacío, que sale con el BOM solo— más `manifiesto.json` y `escudo.png`
    cuando hay escudo. El manifiesto lleva subdominio, nombre, marca,
    `generadaEn` en ISO, `generadaEnMerida` en la forma de S3 y la lista de
    conjuntos con su número de filas; no lleva `ayuntamientoId` (S2).
  - El escudo no tenía lectura en el almacén: entró `LectorDeAssets`
    (`modules/marca/application/puertos.ts`), su adaptador `lectorR2`
    (`GetObjectCommand`, misma barrera `claveTenantDesdeUrl` que `borrar`) y
    `lectorDeEscudo` en la raíz de composición, que es lo único que `src/app`
    puede importar (`app-no-importa-infrastructure`). Una URL que no es del
    almacén de ese ayuntamiento falla en vez de omitirse: S4 prohíbe un ZIP
    que parezca completo. Se lee después de que `exportarAyuntamiento`
    devuelve —transacción cerrada— y su fallo se propaga.
  - Ruta `src/app/(panel)/exportacion/descarga/route.ts`, `runtime =
    "nodejs"`, con las guardas del precedente de constancias: superficie,
    `exigirAyuntamiento`, sesión (401), `NoAutorizadoError` (403),
    `TenantNoResueltoError`/`NoEncontradoError` (404), y 500 con
    `datosSegurosDeError`. El ZIP se arma entero antes de responder.
  - Textos exactos que ve la operadora: 403 «Su rol no tiene permiso para
    descargar los datos del ayuntamiento.»; 500 «No se pudo preparar la
    descarga. Vuelva a intentarlo en un momento.»; pantalla sin permiso «Su
    rol no tiene permiso para exportar los datos del ayuntamiento.»; botón
    «Descargar los datos del ayuntamiento»; pestaña «Exportación». Nombre del
    archivo: `<subdominio>-<YYYY-MM-DD>.zip`, con la fecha civil de Mérida
    (los diez primeros caracteres del formato ya probado de
    `fechaYHoraIsoEnMerida`; `shared/lib/fecha` no expone la fecha civil de
    un instante y esa carpeta estaba fuera de la superficie de T3).
  - `/exportacion` es raíz de sección, así que `PaginaDePanel` va **sin**
    `migaja` y la ruta entra en `raicesSinMigaja.test.ts`; la pantalla es
    `ancho="detalle"`. El botón es un `<a href="/exportacion/descarga"
    download>` nativo con las clases de `clasesDeBoton("primaria")`:
    descargar no es navegar y funciona sin JavaScript.
  - Entrada «Exportación» en «Administración» con `permite: puedeExportar`,
    así que solo la ve el `ADMIN_MUNICIPAL`.
  - El E2E no puede probar el escudo: no hay bucket en CI y
    `MUNICIPIOS.motul.marca.escudo` apunta a `/api/salud` de la propia
    aplicación —una URL que no es del almacén, que la descarga rechaza a
    propósito—. El spec limpia la marca de Motul antes y la restaura en
    `afterAll` para no cambiar lo que ven los demás specs; el escudo con
    bytes reales queda cubierto por `route.integration.test.ts` y
    `descargaDeDatos.test.ts` con el puerto falso.
- **L6** — 2026-11-13. Verificador independiente: S1-S7 cumplen, sin
  bloqueantes. Ninguna tabla con `ayuntamiento_id` queda fuera del ZIP salvo
  las cuatro excluidas a propósito; el ZIP real pasa `unzip -t` y
  `zipfile.testzip()`; un escudo que apunte a la carpeta de otro municipio
  falla sin llamar al almacenamiento. Mutaciones que muerden: quitar
  `puedeExportar`, la guarda de superficie o el `Cache-Control`, desactivar
  RLS en `zonas`, tragar el error del escudo y quitar BOM/CRLF. Suite: 567
  archivos / 3026 tests; E2E 80/80. Decisiones sobre sus avisos: S2 se
  precisa (la `bitacora` ya traía el id del propio municipio antes de este
  frente). Si el escudo falla después de la lectura, la traza
  `EXPORTAR_AYUNTAMIENTO` queda aunque el ZIP no se entregue: se acepta,
  porque la lectura sí ocurrió y S5 exige registrarla en la misma
  transacción. Quedan como avisos el E2E que vacía la marca de Motul hasta su
  `afterAll` y la razón «ZIP que parece completo» repetida en varios
  comentarios.

