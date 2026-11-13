# Pendientes del cierre de la Fase 0

Lo que quedó abierto tras los PRs #135 (administración de usuarios) y #136
(exportación de datos). Rama `fix/pendientes-fase-0`. Runner: Vitest
(integración sobre `xula_test`), Playwright y `pnpm check`.

## Specs

- **S1.** Pendiente 1: «Si el escudo falla después de leer los datos, la
  exportación queda registrada en la bitácora aunque el ZIP no se entregue.»
  La lectura del escudo ocurre antes de que se confirme la traza
  `EXPORTAR_AYUNTAMIENTO`, de modo que un fallo del almacenamiento deshace la
  transacción completa: sin ZIP no hay traza. Una exportación exitosa sigue
  dejando exactamente una traza en la misma transacción que la lectura
  (`exportacion-de-datos.md`, S5). La barrera de tenant de la lectura del
  escudo no cambia.

- **S2.** Pendiente 2: «Si la página se abre sin JavaScript, la contraseña
  temporal vuelve a mostrarse al recargar, hasta que vence a los 120
  segundos.» La contraseña temporal se muestra una sola vez también sin
  JavaScript: la primera petición a `/usuarios` con el token consume la cookie
  en el servidor antes de pintar la página, y una recarga o un regreso no la
  vuelve a mostrar. Ninguna cabecera que mande el cliente puede inyectar una
  contraseña. Si el mecanismo nuevo deja sin uso la hoja cliente
  `DescartarClaveAlMostrar`, su acción y su excepción en `AGENTS.md`, se
  retiran.

- **S3.** Pendiente 3: «Quedaron unos 40 avisos menores de los revisores,
  sobre legibilidad y pruebas.» Cada aviso de la revisión nativa y del
  verificador de #135 y #136 queda clasificado: corregido (con su test cuando
  aplica), obsoleto por S1/S2, o descartado con un motivo escrito en el Log.
  Ninguno se descarta en silencio.

## Tasks

- [ ] **T1** (S3) clasificar los avisos — explore — commit:
- [ ] **T2** (S1) escudo antes de confirmar la traza — worker — commit:
- [ ] **T3** (S2) consumo de la contraseña temporal en el servidor — worker — commit:
- [ ] **T4** (S3) correcciones de los avisos que proceden — worker — commit:
- [ ] **T5** (S1-S3) verificación independiente, revisión, PR y merge — verify — commit:

## Log

- **L1** — 2026-11-13. Usuario: «resuelve lo pendiente», sobre los tres
  pendientes citados en S1-S3.
- **L2** — 2026-11-13. El texto completo de los avisos de la revisión nativa
  no se conserva después de quemar la autoridad: solo quedan el id, el lente,
  la ubicación y la severidad que devolvió cada cierre. La clasificación de
  T1 parte de esas ubicaciones y relee el código.
