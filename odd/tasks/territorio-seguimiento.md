# Territorio: seguimiento de las advertencias

Los cuatro pendientes no bloqueantes que dejó el cierre de
`territorio-advertencias.md`. Rama `fix/territorio-seguimiento`, apilada sobre
`fix/territorio-advertencias`; un PR después del merge de aquel. Runner:
Vitest (integración sobre `xula_test`), Playwright y `pnpm check`.

## Specs

- **S1.** Pendiente 1: «El segundo test de concurrencia pasa también sin el
  arreglo, porque las pruebas de integración usan una sola conexión a la
  base. Solo el primer test protege de verdad la carrera.» El test de orden
  inverso de `callesDeZonas.concurrencia.integration.test.ts` sostiene el
  bloqueo con una conexión propia (`enTransaccionParalela`), de modo que la
  espera que observa es la del bloqueo de fila y no la del pool. Si por
  construcción no puede fallar con el código anterior, se declara como test
  de preservación (nombre y comentario), no como prueba de la carrera.

- **S2.** Pendiente 2: «`reparentearCalle` lee el lugar destino sin
  bloquearlo, aunque su comentario dice que bloquea calle y luego lugar. Ya
  pasaba antes de este cambio.» El lugar destino se bloquea después de la
  calle (orden calle → lugar). Un `darDeBajaLugar` concurrente sobre el
  destino no deja una calle activa colgando de un lugar de baja. Test de
  concurrencia de integración que falla sin el arreglo.

- **S3.** Pendiente 3: «La revisión dejó un aviso informativo en
  `padron/domain/criteriosDeBusqueda.ts:31-32`.» El conteo de palabras
  ignoradas del padrón se hace sobre la cadena escrita, y la búsqueda corre
  sobre la normalizada (`normalizarParaBusqueda` quita los puntos y descarta
  los tokens vacíos). El conteo usa la misma partición que la búsqueda: un
  token de solo puntos no cuenta como palabra ignorada.

- **S4.** Pendiente 4: «"Cerrar", los hermanos y la migaja del árbol siguen
  sin conservar `regreso`.» Con un `regreso` válido, esos enlaces lo
  conservan como ya lo hace «Corregir»; sin `regreso`, no cambian.

## Tasks

- [x] **T1** (S1) test de orden inverso con conexión propia — commit: `655ae41`
- [x] **T2** (S2) bloqueo del lugar destino en `reparentearCalle` — commit: `cebdb65`
- [x] **T3** (S3) conteo del padrón sobre la partición de la búsqueda — commit: `3bee6df`
- [x] **T4** (S4) `regreso` en «Cerrar», hermanos y migaja — commit: `6d5283e`
- [x] **T5** (S1-S4) suite completa, verificación de S2 y cierre — PR #134 (`992d899`)

## Log

- **L1** — 2026-11-12. Usuario: «haz los pendientes», sobre la lista
  «Pendientes no bloqueantes para después» citada en S1-S4.
- **L2** — 2026-11-12. Bloqueo de entorno: la máquina está en el límite de
  procesos por usuario (`ulimit -u` 330, unos 339 abiertos, casi todos de
  Brave, VS Code, Docker y el `pnpm dev` de `invitame`); `fork` falla y no se
  pueden correr tests, workers ni el push del PR anterior.
- **L3** — 2026-11-12. T1: el test de orden inverso pasa a una sonda dentro
  de la conexión paralela que ya retiene la calle
  (`iniciarCarreraConSonda`, `carrerasDeCalleDePrueba.ts`): con la calle
  tomada, la sonda pide la zona con `FOR UPDATE NOWAIT` y espera encontrarla
  libre. Una tercera transacción no servía: `enTransaccionParalela` es una
  sola conexión y habría medido el pool. RED con el orden viejo (zona →
  calle) de `agregarCalleAZona`: «expected 'la zona ya estaba tomada: could
  not obtain lock on r…' to be 'la zona seguia libre'». `iniciarBloqueoDeZona`
  se retiró con él: su test quedó como preservación («después del alta, la
  baja ve la pertenencia y la rechaza»), porque con `DB_POOL_MAX=1` una baja
  concurrente solo hace cola por el pool y no distingue el código anterior.
  T2: `exigirDestinoValido` bloquea el destino con `bloquearPorId` (calle →
  lugar); RED `expected undefined to be an instance of NoEncontradoError`,
  GREEN cinco corridas 1/1. Orden de bloqueos sin ciclo: calle → lugar
  (`reparentearCalle`, `verificacionDeDomicilio`), calle → zona
  (`agregarCalleAZona`), lugar → zona (`altaDeZona`), y `altaDeCalle` toma el
  lugar sin lock de calle: ninguna ruta toma el lugar y después la calle.
  T3: `palabrasDeLaCadena` quita los puntos, la misma partición que
  `normalizarParaBusqueda`; RED 4 fallidos («expected 1 to be +0», «expected
  11 to be 10», el aviso y el del buscador del padrón), GREEN 27/27. T4:
  `regreso` en «Cerrar» de los dos paneles (domicilio y calle), en los
  hermanos de dirección y en la migaja del árbol; `conRegreso`
  (`regresoEnRuta.ts`) y `cabeceraDeLugar` pasa a objeto por la métrica de
  parámetros. RED 7 fallidos, GREEN 24/24, unidad de territorio y `src/app`
  1175/1175. `pnpm check` 0; Vitest completo 534 archivos y 2792 tests.
