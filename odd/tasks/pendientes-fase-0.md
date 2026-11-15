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

- [x] **T1** (S3) clasificar los avisos — explore — ver L3
- [x] **T2** (S1) escudo antes de confirmar la traza — worker — commit: `8010c11`
- [x] **T3** (S2) consumo de la contraseña temporal en el servidor — worker — commits: `07422f7`, y ver L6
- [x] **T4** (S3) correcciones de los avisos que proceden — worker — commits: `8a71d3f`, `7845040`, `8010c11`
- [x] **T5** (S1-S3) verificación independiente, revisión, PR y merge — verify — commits: `01c67d2`, `fbe17ac`, y ver L6-L7

## Log

- **L1** — 2026-11-13. Usuario: «resuelve lo pendiente», sobre los tres
  pendientes citados en S1-S3.
- **L2** — 2026-11-13. El texto completo de los avisos de la revisión nativa
  no se conserva después de quemar la autoridad: solo quedan el id, el lente,
  la ubicación y la severidad que devolvió cada cierre. La clasificación de
  T1 parte de esas ubicaciones y relee el código.
- **L3** — 2026-11-13. T1, clasificación del explorador. Se corrigen:
  `idDeAlta` sin uso en `directorioDePrueba.ts`; la contraseña que no se pudo
  guardar para mostrarla tras crear o restablecer la cuenta (alta y
  restablecimiento); el correo pegado con espacios; el `sesionActual`
  exportado sin la comprobación de baja; la carrera de correos que solo
  difieren en mayúsculas; el id del municipio que se filtraba en
  `manifiesto.json` por la URL del escudo; y la razón «ZIP que parece
  completo» repetida en cinco comentarios. Quedan obsoletos con S2: los dos
  avisos de `DescartarClaveAlMostrar`, los dos de la excepción en
  `AGENTS.md` y el del E2E que recargaba sin el token. Se descartan, con su
  motivo: la documentación de `filas` y la guarda de `tx` del doble de
  pruebas (no es código de producción); las aserciones por claves del test de
  aislamiento (intencionales y comentadas); más formas de error en
  `violacionDeRestriccion` (especulación: el driver es `postgres` y ya trae
  `constraint_name`); el `toEqual` del alta (es el puerto, no un espía); los
  formularios por botón con `usuarioId` oculto (patrón sancionado, se
  resuelve bajo RLS); el ternario de texto en `ListadoDeUsuarios`; la tabla
  de casos de `claveMostrada` y su unión cerrada; conservar lo escrito tras un
  error del alta (sobreingeniería para tres campos); el orden de parámetros
  de `destinoDeUsuarios` (es su contrato); el arnés `REDIRECT:`; la
  duplicación de 12 líneas entre alta y restablecimiento (primera vez); el
  `size===0` del test de integración (limpio en `beforeEach`); el comentario
  de `fecha.ts` (hecho externo, filtro 4); la fecha DOS fija del ZIP
  (mínimo del formato, probado); el salto del test cuando no hay `unzip`; más
  aserciones espejo en aislamiento; la configuración perezosa de R2
  (documentada, por contrato); el orden de guardas repetido en la ruta (los
  Route Handlers no pasan por el layout); los dos tests de 404 casi iguales;
  y el E2E que vacía la marca de Motul (un solo worker y `afterAll` corre
  aunque falle).
- **L4** — 2026-11-13. T3 (S2) y la parte de `usuarios` de T4.

  **S2, consumo de la contraseña temporal en el servidor.** `cookies().delete`
  solo es legal en una Server Function o un Route Handler (doc de `cookies` de
  Next 16, «Good to know»), así que el único lugar donde la cookie se puede
  consumir antes de pintar es el proxy. Nuevo `claveMostradaEnTransito.ts`
  (`usuarios/ui`, puro: sin `next/headers` ni `node:crypto`, para que el proxy
  pueda importarlo — ninguna regla de `.dependency-cruiser.cjs` lo prohíbe
  porque el proxy no está bajo `src/modules/`): declara una sola vez el nombre
  y la ruta de la cookie, la cabecera `x-xula-clave-mostrada` y
  `claveATrasladar({ruta, token, cookie})`, que devuelve el valor solo en
  `/usuarios`, con `?clave=` presente y cookie no vacía. El proxy borra la
  cabecera entrante siempre —igual que las de tenant, contra la inyección—, y
  en la rama de ayuntamiento pone el valor y borra la cookie con
  `path: "/usuarios"` en la misma respuesta. `claveMostradaDeLaPeticion` lee
  `headers()` y ya no la cookie. Se retiran `DescartarClaveAlMostrar.tsx`, su
  acción, su test y la excepción «descarte sin resultado invocado desde
  cliente» de `AGENTS.md` (S2 lo pedía si quedaban sin uso).

  RED/GREEN: `claveMostradaEnTransito.test.ts` (4 casos: coincidencia, otra
  ruta, sin token, sin cookie), `proxyClaveMostrada.test.ts` (4: traslado +
  borrado con `Path=/usuarios` y `Expires=Thu, 01 Jan 1970`, recarga sin token
  que no toca nada, cabecera inyectada descartada, cabecera + token sin cookie
  que no muestran nada) y `claveTemporalEnCookie.test.ts` (4: lee la cabecera,
  sin cabecera no muestra nada aunque la cookie siga ahí, token ajeno, sin
  token en la URL). Los tres en rojo por módulo inexistente antes del cambio y
  verdes después. El E2E que recargaba sin el token —y por eso no probaba
  nada— se reemplaza por «sin JavaScript, la contraseña temporal se ve una vez
  y no vuelve al recargar»: el alta entera corre con `javaScriptEnabled: false`
  y `storageState`, ve la clave y recarga la misma URL. Rojo verificado
  desactivando el borrado en el proxy: `toHaveCount` esperaba 0 y recibió 1.

  **T4, avisos de `usuarios`.** (1) Si `guardarClaveMostrada` falla después de
  crear o restablecer la cuenta, la acción redirige con código nuevo en vez de
  terminar en un 500: `clave-no-mostrada` —«La cuenta quedó lista, pero la
  contraseña no se pudo mostrar. Restablézcala para generar otra.»— y
  `clave-no-mostrada-restablecimiento` —«La contraseña quedó restablecida,
  pero no se pudo mostrar. Restablézcala para generar otra.»—. El listado se
  revalida antes de guardar la clave, porque el cambio sí ocurrió. Tests:
  `set` de la cookie que lanza → el redirect lleva el código y el caso de uso
  corrió una vez. (2) `email: z.string().trim().pipe(z.email())`: un correo
  pegado con espacios ya no cae en «Faltan el nombre o el correo.», y el caso
  de uso recibe el correo limpio. (3) `shared/auth/index.ts` deja de exportar
  `sesionActual`, que no mira `bajaEn`; el comentario de `instancia.ts` dice
  ahora por qué. (4) `directorioDePrueba.ts`: se borra `idDeAlta`, declarado y
  nunca usado. (5) La carrera del correo: el alta del panel normaliza a
  minúsculas, así que por esa puerta el índice exacto alcanza; la primitiva
  `altaDePersona` —provisión del primer administrador, siembras— no normaliza,
  y dos altas simultáneas dejan dos cuentas, una de ellas muda. Migración
  `0024_usuarios_email_lower_unico.sql`: índice único
  `usuarios_tenant_email_lower_idx` sobre `(ayuntamiento_id, lower(email))`,
  traducido a `CorreoYaRegistradoError` por nombre en
  `directorioDeUsuariosSql` junto con el exacto. Tests en
  `correoUnico.integration.test.ts`: dos altas simultáneas del panel que solo
  difieren en mayúsculas dejan una cuenta y la otra responde
  `CORREO_YA_REGISTRADO`; con `enTransaccionParalela` —la fila en conflicto
  existe sin confirmar— el alta espera el índice (sondeo de `pg_locks`; a
  `pg_stat_activity` no se le puede preguntar: sin `pg_read_all_stats` las
  columnas de otra sesión llegan en `NULL`) y falla por
  `usuarios_tenant_email_lower_idx`; y la prueba secuencial de que el índice
  compara por `lower(email)`. Los dos últimos en rojo con el índice dropeado a
  mano y verdes con él puesto; el índice se recreó con el SQL exacto de la
  migración.

  **Decisiones de forma, por la métrica de 200 líneas.** `proxy.test.ts`
  estaba en 168 y el bloque nuevo lo pasaba: los cuatro casos viven en
  `proxyClaveMostrada.test.ts`. `altaDeUsuarioAction.test.ts` estaba en 199:
  el transporte de la clave se va a `altaDeUsuarioActionClave.test.ts`.
  `esquema.ts` estaba en 199 y el índice nuevo no entraba: la tabla
  `verificaciones` se parte a `shared/auth/verificaciones.ts` —como
  `intentosAcceso`, reexportada desde `esquema.ts`, que es lo único que
  `drizzle.config.ts` mira— y la explicación larga del índice queda en la
  migración, su único hogar.

  Verificación: `pnpm check` verde (biome sin errores; las 52 advertencias son
  previas y de archivos que este cambio no toca; `tsc`, dependency-cruiser y
  `pnpm reglas` sin hallazgos), `pnpm vitest run` 571 archivos / 3043 tests en
  verde, `pnpm test:e2e` 81 en verde. `next-env.d.ts` se devolvió al contenido
  de HEAD después del build del E2E.
- **L5** — T2 (S1) y la parte de exportación de T4 (S3), sin tocar las
  casillas de `## Tasks`.

  **S1 — el escudo antes de la traza.** `exportarAyuntamiento` recibe un
  tercer parámetro opcional, `lectorEscudo` (puerto estructural
  `LectorDeEscudo`, declarado en `shared/exportacion/escudo.ts` porque
  `shared` no puede importar `modules/marca`), y devuelve
  `ExportacionConEscudo` —`Exportacion` más `escudo?: Uint8Array | undefined`,
  aditivo, así que ningún llamador existente cambia—. El orden dentro de
  `withTenant` pasa a ser: `municipioDe` → `conjuntosDe` → lectura del escudo
  (solo si `marca.escudo` y hay lector, con el id que leyó RLS) →
  `registrar(EXPORTAR_AYUNTAMIENTO)` → retorno. Un fallo del almacenamiento
  ocurre antes de la traza, así que el ROLLBACK no deja nada.

  Decisión: la lectura se mueve **adentro** de la transacción aunque eso
  sujeta una conexión del pool al viaje de red de R2, que es lo que el
  comentario anterior de `descargaDeDatos.ts` evitaba a propósito. Se acepta
  el costo porque la alternativa —leer afuera— es exactamente la traza sin
  archivo que S1 cierra; el porqué queda escrito una sola vez, en
  `exportar.ts`, y los demás archivos apuntan ahí.

  `descargaDeDatos.ts` deja de leer el escudo (se va `escudoDe` y su
  rationale, que ya era falso) y arma el ZIP con `exportacion.escudo`. La
  barrera de tenant no se tocó: sigue en `claveTenantDesdeUrl`, dentro de
  `lectorR2`.

  RED observado en `descargaDeDatos.test.ts`: «el escudo que trae la
  exportación viaja dentro del ZIP» fallaba con `expected "vi.fn()" to not
  be called at all, but actually been called 1 times` —la descarga todavía
  leía el almacenamiento— y «la exportación recibe el lector…» fallaba
  porque no había tercer argumento. GREEN después del cambio: 6 de 6.

  Tests de integración **escritos y no corridos** (la base `xula_test` la
  está usando otro worker):
  `src/shared/exportacion/exportarEscudo.isolation.test.ts` (escudo que
  falla → cero trazas nuevas; escudo que lee → una sola y los bytes viajan;
  sin `marca.escudo` → no consulta el almacenamiento y deja una; sin lector
  → sin escudo y con traza) y
  `src/app/(panel)/exportacion/descarga/escudo.integration.test.ts` («el
  escudo que falla deja 500 y ninguna traza nueva»). Este último va en
  archivo propio y no como un caso más de `route.integration.test.ts`, que
  ya tenía 196 líneas: sumarle el caso pasaba las 200 por archivo.

  **S3 — exportación.** (1) `manifiesto.json` serializaba `marca` entera, y
  con ella la URL del escudo `R2_PUBLIC_URL/{ayuntamientoId}/escudo-<uuid>.png`,
  que lleva el id que S2 deja afuera. Ahora va `marcaSinEscudo` —campo por
  campo, para que un campo nuevo de `Marca` no entre solo— más
  `tieneEscudo`, derivado de los bytes que de verdad van en el ZIP y no de
  `marca.escudo`. Test fortalecido: una marca cuyo escudo incrusta el
  `exportacion.ayuntamiento.id` real; antes del cambio el manifiesto lo
  contenía (`not to contain '<uuid>'` fallaba) y ahora no. (2) El rationale
  del «ZIP que parece completo» estaba repetido en cinco lugares: queda solo
  en `exportar.ts`, donde fuerza el orden de S1, y `route.ts`, `zip.ts`,
  `marca/application/puertos.ts` y `descargaDeDatos.test.ts` lo dejan en una
  línea que apunta o lo pierden.

  Dos archivos se partieron por la métrica de 200 líneas:
  `conjuntosDePlataforma.ts` (los conjuntos de la plataforma y el porqué de
  qué no se exporta, sacados de `exportar.ts`) y
  `nombreDelArchivo.test.ts` (el `describe` del nombre del ZIP, sacado de
  `archivoDeExportacion.test.ts`). Deuda conocida que deja el primero, fuera
  de la superficie autorizada de esta tarea: `modules/padron/composicion.ts`
  (líneas 55 y 59) y `modules/padron/composicion.test.ts` (línea 13) siguen
  diciendo «en `exportar.ts`» donde ahora dice `conjuntosDePlataforma.ts`.
  Son tres líneas de comentario; las corrigió el padre al integrar
  (`8010c11`).
- **L6** — 2026-11-13. Verificador independiente: S1, S2, S3 y la migración
  `0024` cumplen, sin bloqueantes. Mutaciones que muerden: leer el escudo
  fuera de la transacción, quitar el borrado de la cabecera en el proxy,
  borrar la cookie con otro `Path` y quitar el índice nuevo de la traducción
  de restricciones. `drizzle-kit check` limpio; la migración aplica desde
  cero con RLS y permisos intactos. Avisos y su destino: (1) el proxy
  consumía la cookie con cualquier método y con un `?clave=` de otra alta,
  así que volver a una URL vieja quemaba la contraseña nueva; corregido por
  el padre: solo un `GET` cuyo token coincide con el de la cookie la
  consume (RED 3 tests, GREEN 136/136 en usuarios y proxy). (2) La migración
  falla, y lo dice, si ya existen correos que solo difieren en mayúsculas;
  hoy no hay datos de producción, y si los hubiera hay que unificarlos a
  mano antes de aplicarla. (3) La nota de L5 sobre los comentarios del
  padrón estaba vieja; corregida.
- **L7** — 2026-11-14. Revisión nativa en cinco rebanadas. La 1 (`07422f7`)
  tuvo un hallazgo CRÍTICO confirmado: con JavaScript, la primera vista de
  la contraseña es el render sintético del `redirect` de la Server Action, y
  el borrado de cookie de ese render nunca llega al navegador; recargar la
  misma URL con `?clave=` la volvía a mostrar. Corrección `01c67d2` (90
  líneas): quedan los dos consumidores, el proxy para el `GET` real sin
  JavaScript y la hoja cliente `DescartarClaveAlMostrar` con su acción para
  el render sintético. Volvió a `AGENTS.md` la excepción «descarte sin
  resultado invocado desde cliente», y el E2E con JavaScript ahora recarga la
  URL (RED y luego GREEN). El validador confirmó que cierra el hallazgo. Las
  rebanadas 2 (avisos + índice `0024`), 3 (snapshot), 4 (escudo) y 5 (`GET`
  con token) quedaron aprobadas; los hallazgos graves de la 2 y la 4 los
  refutó el refutador. Rama rehecha sobre la corrección:
  `fix/pendientes-fase-0-v3`, con `pnpm check` 0, Vitest 574/3051 y E2E
  81/81. La nota de `altaDeUsuarioAction` en `AGENTS.md`, que todavía daba
  al proxy como único consumidor, se corrigió en el mismo commit que este
  registro. Avisos que no bloquean y quedan para después: no hay test unitario de `descartarClaveMostrada`; la lectura
  del escudo retiene una conexión del pool mientras va al almacenamiento;
  la prueba de carrera del índice no fuerza el entrelazado.
