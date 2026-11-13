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
  no datos del municipio. Ningún conjunto lleva `ayuntamiento_id`.

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

- [ ] **T1** (S3, S7) escritor ZIP y CSV en `shared/exportacion` — worker — commit:
- [ ] **T2** (S2) porciones que faltan — worker — commit:
- [ ] **T3** (S1, S4, S5, S6) descarga, pantalla, enlace del panel, escudo y E2E — worker — commit:
- [ ] **T4** (S1-S7) verificación independiente, revisión y cierre — verify — commit:

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
