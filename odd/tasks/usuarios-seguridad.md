# Seguridad de las cuentas de Usuarios

Track de seguridad que dejó pendiente el refinamiento de Usuarios
(`usuarios-ux.md`, L3 y L16): la contraseña temporal no caduca ni obliga a
cambiarla, una baja no se puede deshacer, y con JavaScript la contraseña
temporal queda en la caché del router de Next.

**Riesgo:** toca autenticación y, para la caducidad, probablemente el
esquema. Cada tarea lleva su commit, verificación independiente y revisión
nativa por unidad.

**Dónde se trabaja:** rama `feat/usuarios-seguridad`.

## Specs

- **S1 (C3)** — Una contraseña temporal (del alta, de un restablecimiento o
  de una reactivación) caduca a las 24 horas si no se usó. Entrar con una
  temporal caducada se rechaza con un mensaje que pide al administrador
  restablecerla; no revela si la cuenta existe.
- **S2 (C3)** — Al entrar con una contraseña temporal, la persona tiene que
  poner una contraseña propia antes de usar el panel; en ese momento la
  temporal deja de servir.
- **S3 (L3)** — El administrador puede reactivar una cuenta dada de baja de
  su municipio. Reactivar emite una contraseña temporal nueva, que se
  muestra una sola vez como la de un restablecimiento; la contraseña
  anterior no vuelve a servir. Aplican las mismas guardas que la baja: rol,
  404 para otro municipio y nunca la propia cuenta.
- **S4** — Con JavaScript, si la operadora sale de `/usuarios` sin pulsar
  «Ya la anoté», volver con «Atrás» no vuelve a pintar la contraseña
  temporal: la contraseña no queda en un payload que el router pueda
  restaurar sin pedirla al servidor.

## Tasks

- [x] **T1** (S1, S2) caducidad de 24 h y cambio obligatorio en el primer acceso — worker + verify, commit propio — commit: 45604a0
- [x] **T2** (S3) reactivar una cuenta con contraseña temporal nueva — worker + verify — commit: d1644c4
- [x] **T3** (S4) la contraseña temporal fuera de la caché del router — worker — commit: 73b91bb
- [x] **T4** (S1-S4) verificación, revisión, PR y merge — verify — commit: 4ea67ae (ver L14)

## Log

- **L1** — Al cerrar Usuarios (#155, #156) el orquestador recomendó este
  track. El usuario respondió: «si sigue con el track luego continuas con el
  modulo de marca y exportacion».
- **L2** — Decisiones del usuario: «24 horas (recomendado)», «Obliga a
  cambiarla antes de seguir (recomendado)» y «Con una contraseña temporal
  nueva (recomendado)».
- **L3** — T1 implementada por el worker. Marca `cuentas.clave_temporal_en`
  (`timestamptz` nulo, migración `drizzle/0027_clave_temporal_caduca.sql`,
  aplicada a `xula_test`). S1 en el hook `session.create.before` de Better
  Auth (rechazo con código propio después de verificar la contraseña); S2
  con `contextoActual()` devolviendo `null` mientras la marca siga puesta y
  la pantalla `/cambiar-contrasenia`. El orquestador agregó la línea de la
  pantalla nueva en `src/app/titulos.test.ts`.
- **L4** — Verificación independiente de T1 sin bloqueos: el mensaje de
  «caducó» solo sale con la contraseña correcta (sin oráculo), ningún
  punto del servidor deja pasar una sesión marcada a datos, el cambio es
  una transacción, la migración es aditiva y segura (`xula_app` y
  `xula_super_admin` ya tienen el permiso por la `GRANT` de tabla). Unit
  3581, integración 152. Se sumaron sus sondas del borde de 24 h y de la
  clave equivocada sobre una temporal caducada.
  - Seguimientos: una sesión marcada todavía puede llamar
    `POST /api/auth/change-password` de Better Auth (no evita S2, pero no
    borra la marca ni deja bitácora; conviene desactivarlo);
    `scripts/restablecer-admin.sql` y `scripts/plataforma-admin.sql`
    escriben contraseñas sin la marca.
- **L5** — T1 terminado en `45604a0`. E2E completa 200/202: dos pruebas
  corregidas (selector ambiguo de «Contraseña nueva», y el helper de
  `reportes.spec.ts` que entra con una temporal ahora completa el cambio
  obligatorio); después 15/15. Migración `0027` aplicada también a
  `xula_dev` con las credenciales locales de `scripts/db-dev.sh`. T2 en
  curso, con el seguimiento de `change-password` de Better Auth.
- **L6** — T2 implementada por el worker: `reactivarUsuario`
  (`src/shared/auth/reactivacionDeUsuario.ts`, una transacción) y
  `reactivarUsuarioAction` en «Cuentas de baja», con el transporte de la
  clave del restablecimiento. Better Auth: `disabledPaths:
  ["/change-password"]` y un `hooks.before` que rechaza `/update-user` para
  cuentas marcadas. RED reconstruido rompiendo guardas a propósito.
  Verificación independiente en curso.
- **L7** — Verificación independiente de T2 sin bloqueos: S3 cumplida, sin
  oráculo en las guardas, transporte de la clave igual al restablecimiento,
  17 variantes de endpoints de Better Auth probadas sin tocar la
  credencial. Unit 3598, integración 129. Se suman sus sondas (título de
  reactivación, endpoints de autoservicio, orden de las guardas) y se
  corrige una cita de `better-call` con versión equivocada.
- **L8** — E2E de reactivar falló en la segunda repetición. Causa probada:
  el limitador en memoria de Better Auth estaba encendido (`enabled ??
  isProduction`, 3 accesos / 10 s por ip y ruta; en producción, detrás de
  un proxy con más de un salto, un único cupo para todo el proceso, con un
  429 en inglés). Se apaga (`RITMO_DE_BETTER_AUTH` en `configuracion.ts`);
  el inicio de sesión sigue limitado por el nuestro
  (`limitarRitmoDeAcceso`, por correo e IP en Postgres, en
  `src/app/api/auth/[...all]/route.ts:69`). Prueba nueva
  `ritmoDeBetterAuth.integration.test.ts`. El helper `accederConClave`
  espera `load` y falla con el estado de la pestaña. Repetición ×3: 12/12.
  A revisar de nuevo en la verificación de T4.
- **L9** — T2 terminado en `d1644c4`. E2E completa 204/204. T3 en curso.
- **L10** — T3 terminado en `73b91bb`: con JavaScript la clave llega por
  `POST /usuarios/clave-temporal` (una vez, `no-store`) a la isla
  `ClaveTemporalAlMostrar`; el proxy distingue el pedido del payload
  (`rsc:1` o `Accept: text/x-component`, que usa el redirect de una
  Server Action) y no consume la cookie ahí. `<noscript>` descartado
  porque va en el payload. E2E de usuarios 15/15, incluida la nueva de
  «Atrás». Residual: una navegación de documento con `?clave=` vivo
  (recargar antes de que termine el POST) todavía inlinea la clave.
- **L11** — T4: verificador independiente del track. S1-S4 cumplidas (S4
  con la conducta de «Atrás» cubierta por E2E). Unit 3614, integración 179.
  **Bloqueante:** `scripts/restablecer-admin.sql` cambia el hash sin tocar
  `clave_temporal_en`; con la marca caducada que deja toda alta del panel,
  el script no destraba a nadie (reproducido: 403). Decisión del
  orquestador: el script marca la clave como temporal nueva (`now()`),
  porque una clave dictada por un operador es temporal (24 h y cambio
  obligatorio). Seguimientos que entran: apagar
  `/api/auth/verify-password` (oráculo de clave con sesión, sin límite),
  corregir el comentario de `contexto.ts` sobre los Route Handlers, quitar
  `marcarClaveTemporal` sin uso, y sumar las sondas del verificador.
  Quedan fuera: validar `Origin` en el Route Handler (otro subdominio solo
  podría quemar la cookie), y el residual de L10.
- **L12** — Arreglos del verificador en `495bd96`: el script de destrabe
  deja una temporal marcada (su prueba ejecuta el bloque real del `.sql`;
  RED 403 → GREEN 200 con cambio obligatorio), `/verify-password` apagado,
  comentario de `contextoActual` corregido, `marcarClaveTemporal`
  eliminada, sondas sumadas. E2E completa en curso.
- **L13** — Entrega encadenada. La rama entera y T1 sola exceden el
  presupuesto de la revisión nativa por el snapshot de Drizzle (4005
  líneas). Tramo A (#157, solo `drizzle/` 0027): sin revisión requerida,
  mergeado `7ff86bb`. Tramo B (#158, `esquema.ts` + código de T1): su CI
  falló porque el limitador en memoria de Better Auth (apagado en T2) está
  prendido en el build de producción; se movió ese apagado y los arreglos
  de la E2E al tramo B (`db4cea8`, `cba4ef4`), revisión nativa aprobada,
  E2E local 202/202. Tramo C (T2): la revisión pidió corregir una carrera
  crítica, dos reactivaciones simultáneas de la misma cuenta pisan la
  contraseña; se rearma sobre el nuevo B con la corrección.
  - Avisos de las revisiones para el tramo final: restablecer debe cerrar
    las sesiones de la persona (una sesión previa queda en la pantalla de
    cambio y puede poner clave sin conocer ninguna); el cambio debe volver
    a comprobar la marca y la sesión dentro de su transacción; la
    constante del código de rechazo arrastra el esquema de auth al bundle
    de `/acceso`; el hash fuera de la transacción.
- **L14** — Entrega en cinco tramos: A #157 (migración, `7ff86bb`), B #158
  (caducidad + limitador, `86bea81`), C #159 (reactivar + carrera,
  `1adad14`), D1 #160 (clave fuera del payload, destrabe por script,
  `/verify-password`) y D2 (este cierre). Cada tramo con revisión nativa
  aprobada salvo A (no requerida).
  - D2 (`4ea67ae`), avisos de las revisiones: restablecer cierra las
    sesiones de la persona; la pantalla de cambio solo admite sesiones
    abiertas con la temporal vigente; el cambio bloquea la credencial y
    revalida marca, hash y sesión; el argon2 fuera de la transacción;
    restablecer y dar de baja se serializan con reactivar; el código de
    rechazo sale del bundle de `/acceso`. Unit 416, integración 37, E2E de
    usuarios y acceso 24/24.
  - Seguimientos que quedan: reintentar si falla la red al pedir la clave;
    `keepalive` al salir de la pantalla; validar `Origin` en el Route
    Handler de la clave; el residual de L10 (recargar antes del POST);
    `scripts/plataforma-admin.sql` escribe la clave inicial sin marca
    (correcto: es la propia de la plataforma).
