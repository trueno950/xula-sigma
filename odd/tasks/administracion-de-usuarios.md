# Administración de usuarios en el panel

Frente A del cierre de la Fase 0: el `ADMIN_MUNICIPAL` administra a la gente
de su ayuntamiento desde el panel. El backend ya existe
(`src/shared/auth/administracionDeUsuarios.ts`, `alta.ts`, `roles.ts`) y
ninguna ruta lo invoca. Rama `feat/administracion-de-usuarios`, un PR.
Runner: Vitest (integración sobre `xula_test`), Playwright y `pnpm check`.

## Specs

Requisitos citados de `openspec/specs/autorizacion-roles/spec.md`:

- **S1.** Alcance del rol: «`ADMIN_MUNICIPAL` | Administra usuarios de su
  propio ayuntamiento: alta, baja logica, restablecimiento de contrasenia;
  opera todos los modulos de su ayuntamiento». Escenario «OPERADOR no puede
  administrar usuarios»: «WHEN intenta dar de alta o dar de baja a otro
  usuario de ese mismo ayuntamiento THEN el caso de uso responde 403».
  `CONSULTA`: «no administra usuarios ni modifica registros». La pantalla y
  el enlace del panel solo existen para `ADMIN_MUNICIPAL`; las acciones
  vuelven a exigir el rol en el servidor.

- **S2.** Listado: la pantalla muestra a los usuarios del ayuntamiento con
  su nombre, correo, rol y si están activos o dados de baja. Lo lee bajo
  RLS (`withTenant`); nunca ve usuarios de otro municipio.

- **S3.** Alta. Decisión del usuario: «Operador y Consulta (Recomendado)» —
  «El municipio tiene un solo administrador. Si se traba, lo destraba el
  SUPER_ADMIN, como ya prevé la spec.» El alta solo ofrece y solo acepta los
  roles `OPERADOR` y `CONSULTA`; un rol distinto enviado a mano se rechaza
  en el servidor. Un correo ya registrado responde un mensaje para la
  operadora, nunca el texto de la excepción.

- **S4.** Contraseña. Decisión del usuario: «La genera el sistema
  (Recomendado)» — «El sistema genera una contraseña temporal fuerte y la
  muestra una sola vez para entregarla. No viaja en la URL ni queda en los
  logs.» Aplica al alta y al restablecimiento. La contraseña cumple
  `reglasDeClave.ts` (mínimo 12) y se genera con un generador
  criptográfico.

- **S5.** Restablecimiento: «`ADMIN_MUNICIPAL` MUST poder restablecer la
  contrasenia de cualquier usuario de su propio ayuntamiento.» «Cada
  restablecimiento de contrasenia MUST registrar en bitacora quien lo
  ejecuto y sobre que cuenta, en la misma transaccion que el cambio.»
  Escenario: «WHEN el ADMIN_MUNICIPAL restablece la contrasenia del OPERADOR
  THEN el OPERADOR puede iniciar sesion con la nueva contrasenia». Usa
  `restablecerContrasenia` existente.

- **S6.** Baja: «`ADMIN_MUNICIPAL` MUST poder dar de baja logica a un
  usuario de su propio ayuntamiento. La baja MUST NOT borrar la fila del
  usuario ni alterar registros de bitacora o documentos que lo
  referencian.» Usa `darDeBajaUsuario` existente; quien queda de baja pierde
  sus sesiones y no vuelve a entrar.

- **S7.** Aislamiento: «El sistema MUST responder 404 ante un recurso de
  otro ayuntamiento sin importar el rol del usuario.» Un `usuarioId` de otro
  municipio en cualquier acción responde «no encontrado», nunca 403.

## Tasks

- [x] **T1** (S1-S7) pantalla, acciones, enlace del panel y tests — worker — commit:
  `90fcfd9` (backend de auth) y las unidades de `src/modules/usuarios`,
  rutas, panel, AGENTS.md y E2E que registra el padre (ver L4)
- [ ] **T2** (S1-S7) verificación independiente, E2E y cierre — verify — commit:

## Log

- **L1** — 2026-11-12. Usuario: «si» a revisar el roadmap; eligió «A, luego
  B (Recomendado)»: «Primero la pantalla de usuarios del ADMIN_MUNICIPAL
  (alta, baja y restablecer contraseña), luego la pantalla de exportación de
  datos.» Decisiones: roles del alta «Operador y Consulta (Recomendado)»;
  contraseña «La genera el sistema (Recomendado)»; exportación (frente B)
  «ZIP con un CSV por tabla (Recomendado)».
- **L2** — 2026-11-12. Mapa del explorador: el backend existe con tests
  (`administracionDeUsuarios.ts:73,107`, `roles.ts:43,54,67`) pero ninguna
  ruta o acción lo invoca; el grupo «Administración» del panel solo tiene
  Marca (`src/shared/ui/modulosDelPanel.ts:39-95`).
- **L3** — 2026-11-12. T1 implementado en el árbol de trabajo. El worker no
  ejecuta git: los commits en unidades revisables los hace el padre, y hasta
  entonces esta rama no tiene hash que anotar.

  **Backend reusado, no duplicado**: `restablecerContrasenia`,
  `darDeBajaUsuario` y `altaDePersona` ya estaban; `roles.ts` ganó
  `ROLES_ASIGNABLES`/`esRolAsignable` (S3) y se agregaron
  `listarUsuarios` (S2, bajo `withTenant`, sin `WHERE ayuntamiento_id`: lo
  acota RLS), `altaDeUsuario` (S3/S4) y `generarClaveTemporal`
  (`randomInt` sobre 57 símbolos sin `0/O/1/l/I`, 16 posiciones: 16 ≥ 12 de
  `reglasDeClave`).

  **S4, transporte elegido**: `<form>` nativo + `redirect` con un token
  opaco (`?clave=<uuid>`) y la contraseña en una cookie httpOnly de 120 s,
  solo para `/usuarios`; la página la lee únicamente cuando el token de la
  URL coincide (`src/modules/usuarios/ui/claveTemporalEnCookie.ts`, mismo
  molde que `borradorEnCookie.ts`). Se descartó `ActionResult<T>` + hoja
  cliente porque habría metido `"use client"` en una pantalla que no lo
  necesita. Las tres acciones entraron a la tabla de excepciones de
  `AGENTS.md`. Límite conocido: recargar la misma URL con el token vigente
  la vuelve a mostrar hasta que la cookie vence —borrarla exigiría un Server
  Component que escribe cookies, que Next 16 no permite—.

  **RED/GREEN observado** (cada S): S1/S2 `listadoDeUsuarios.isolation.test.ts`
  —con la guarda de rol quitada fallan «un OPERADOR no puede listar» y las
  cuatro de listado, y con ella pasan—; S3 `altaDeUsuario.integration.test.ts`
  —sin `esRolAsignable` fallan los cuatro «rechaza el rol …», con él pasan—
  más `opcionesDeRol.test.ts`; S4 `claveTemporal.test.ts` (largo, alfabeto,
  sin ambiguos, sin repetir) y `altaDeUsuarioAction.test.ts` («el éxito deja
  la clave en una cookie httpOnly y no en la URL»); S5
  `restablecerContraseniaAction.test.ts` («la clave que se muestra es la que
  quedó guardada») y `bajaYRestablecimientoActions.integration.test.ts`
  (verifica contra el hash); S6 la misma integración («marca la baja sin
  borrar la fila»); S7 las dos integraciones («la cuenta de otro municipio
  no se toca y se responde no encontrado»). Antes de implementar, los cinco
  archivos de test del borde fallaron por módulo inexistente.

  **Cadenas visibles exactas**: «Su rol no tiene permiso para administrar
  usuarios.», «Faltan el nombre o el correo.», «Desde el panel solo se dan
  de alta operadores y consultas.», «Ya hay una persona con ese correo en
  este ayuntamiento.», «No tiene permiso para esta operación.», «El recurso
  no existe.» (S7), «Falta la persona a la que restablecer.», «Falta la
  persona a la que dar de baja.», «No se pudo completar el alta. Intente de
  nuevo.», «No se pudo restablecer la contraseña. Intente de nuevo.», «No se
  pudo dar de baja a la persona. Intente de nuevo.», «Contraseña temporal de
  <nombre>», «Nueva contraseña temporal de <nombre>», «Anótela ahora: esta
  pantalla no la vuelve a mostrar.», «La cuenta quedó creada.», «La
  contraseña quedó restablecida.», «La persona quedó dada de baja y ya no
  puede entrar.», «Activo», «De baja», «Sin acciones: la cuenta ya no
  entra.».

  **Pendiente, fuera de la superficie autorizada del worker**:
  `src/app/(panel)/raicesSinMigaja.test.ts` pide `"/usuarios":
  "usuarios/page.tsx"` en `ARCHIVO_DE_RAIZ`, y `src/app/titulos.test.ts` pide
  las dos rutas nuevas con sus títulos «Usuarios» y «Nuevo usuario». Los dos
  son inventarios de rutas: fallan hasta que se agreguen, y el worker no
  puede escribirlos sin autorización.
- **L4** — 2026-11-12. Cierre de T1: los dos inventarios de rutas entraron
  por el padre, y el pre-commit de `pnpm reglas` rechazó el módulo por el
  antipatrón 21 («capas incompletas»). `src/modules/usuarios` quedó con sus
  cuatro capas y `shared/auth` volvió a ser solo lo de la plataforma.

  **Qué se movió de `shared/auth` y por qué**:

  - `ROLES_ASIGNABLES`/`esRolAsignable` (S3) → `modules/usuarios/domain/rolesAsignables.ts`.
    No es una regla de la plataforma: el `SUPER_ADMIN` provisiona municipios y
    el `ADMIN_MUNICIPAL` los administra, y ninguno de los dos se crea desde
    esta pantalla. Un rol que solo esta pantalla asigna no tiene por qué
    estar disponible para todo el sistema.
  - `altaDeUsuario` (S3/S4) → `modules/usuarios/application/altaDeUsuario.ts`
    (guarda de rol, rol asignable y generación de la clave) +
    `infrastructure/directorioDeUsuariosSql.ts` (llama a `altaDePersona` bajo
    la transacción del caso de uso y traduce el choque contra
    `usuarios_tenant_email_idx`).
  - `listarUsuarios` (S2) → `application/listarUsuarios.ts` (guarda +
    `withTenant`) + `infrastructure/directorioDeUsuariosSql.ts` (el `select`
    sin `WHERE ayuntamiento_id`, que sigue acotando RLS).
  - `CorreoYaRegistradoError`/`RolNoAsignableError` → `domain/errores.ts`;
    `violaRestriccionUnica` (SQLSTATE `23505`) → `infrastructure/`, porque es
    un hecho de Postgres.

  **Qué se quedó en `shared/auth`, a propósito**: `hashDeClave`,
  `reglasDeClave`, `generarClaveTemporal`, `puedeAdministrarUsuarios`,
  `restablecerContrasenia`, `darDeBajaUsuario`, `altaDePersona` y las
  sesiones. Son primitivas de credencial y de plataforma, las usan otras
  pantallas y ya tienen sus tests de aislamiento; el módulo las consume.

  **Capas finales** (patrón de `marca`/`padron`): `domain/`
  (`rolesAsignables`, `usuarioDelPanel`, `errores`), `application/` (`puertos`
  con `DirectorioDeUsuarios`, `listarUsuarios`, `altaDeUsuario`, más el doble
  `directorioDePrueba`), `infrastructure/` (`directorioDeUsuariosSql`,
  `violacionDeRestriccion`), `ui/` (sin cambios de comportamiento) y
  `composicion.ts`, que cablea las fábricas con el adaptador; `ui` no importa
  `infrastructure`: pide al caso de uso por el barril y por `../../composicion`.
  Tests movidos con su código: `rolesAsignables.test.ts` (dominio),
  `altaDeUsuario.integration.test.ts` y `usuarios.isolation.test.ts` (raíz del
  módulo), más dos unitarios nuevos sobre el puerto (`application/*.test.ts`).
  `domain` no importa `shared` —lo hace cumplir `.dependency-cruiser.cjs`—, así
  que `UsuarioDelPanel.rol` es texto y no la unión de `shared/auth`; nada de
  esa capa decide por el rol.

  **Renombre**: el alta pasó de «Nueva persona» a «Nuevo usuario» (título,
  migaja, botón de la cabecera y `titulos.test.ts`) para no chocar con «Alta
  de persona» del padrón. El E2E no dependía de esa cadena.

  **Verificación**: `pnpm check` verde con el índice del commit (1297
  archivos, 9 reglas y 2 métricas sin hallazgos); `pnpm vitest run` 549
  archivos / 2895 tests verdes; `pnpm test:e2e` 78 pasados. Con el índice a
  medio camino —los archivos nuevos sin `git add`— `pnpm reglas` sigue viendo
  el módulo sin capas: la regla lee `git ls-files`, así que el orden del
  commit importa.

- **L5** — 2026-11-12. Dos bloqueos y seis avisos de la verificación
  independiente sobre `611d1f2..113fb86`, corregidos con test primero (rojo
  observado, después verde). Todo queda **sin commitear**: el padre commitea.

  **B1 (S6) — la baja no revocaba sesiones.** `darDeBajaUsuario` marca
  `bajaEn` y ahora **borra las filas de `sesiones` del objetivo en la misma
  transacción** (`xula_app` tiene `GRANT DELETE` sobre `sesiones`,
  `drizzle/0001_auth.sql`). `soloSiSigueActiva` solo corría al crear sesión,
  así que la abierta seguía sirviendo hasta vencer. Además, defensa en
  profundidad barata: `contextoActual` consulta `usuarios.bajaEn` por clave
  primaria y devuelve `null` si la cuenta está de baja, así una fila de
  sesión que sobreviva (la carrera, otro camino) tampoco opera. Test de
  regresión agregado a `darDeBajaUsuario.integration.test.ts` y caso nuevo en
  `contexto.integration.test.ts` (+ dos unitarios en `contexto.test.ts` con
  `withTenant` mockeado). RED: sin el `DELETE`, la sesión insertada seguía
  viva; sin el chequeo, el contexto resolvía con `bajaEn` puesto.

  **B2 (S6) — el administrador podía darse de baja.** Es un bloqueo
  permanente: un solo `ADMIN_MUNICIPAL` por municipio y ninguna ruta limpia
  `bajaEn`. El caso de uso rechaza la propia cuenta con `NoAutorizadoError`
  (`darDeBajaUsuarioSiMismo.integration.test.ts`, RED: antes la fila quedaba
  con `bajaEn`) y la pantalla ya no ofrece el botón en la fila propia (A2).

  **A1 — el correo se comparaba con mayúsculas.** El alta normaliza
  `trim().toLowerCase()` en `application/altaDeUsuario.ts` y el adaptador
  compara `lower(email)` antes de insertar, así una fila vieja con mayúsculas
  también choca. Better Auth 1.6.29 busca en minúsculas
  (`node_modules/better-auth/dist/db/internal-adapter.mjs:483-487`,
  `value: email.toLowerCase()`), así que una cuenta guardada en minúsculas
  sigue entrando. RED: los dos tests de colisión creaban una segunda cuenta.

  **A2 — botones que el servidor iba a rechazar.** `ListadoDeUsuarios` recibe
  al actor y decide por fila con `puedeRestablecerContrasenia`,
  `puedeDarDeBaja`, `esRol` (nuevo en `shared/auth/roles.ts`) y la regla de la
  propia cuenta; `AccionesDeUsuario` pinta solo lo permitido. Un
  `SUPER_ADMIN` queda sin acciones y una fila sin nada dice «Sin acciones.»
  (o «Sin acciones: la cuenta ya no entra.» si está de baja). Test de
  componente `listadoDeUsuarios.test.tsx` (RED antes de los permisos) y
  aserción en el E2E para la fila del propio administrador.

  **A3 —** se eliminó `descartarClaveMostrada`, que no se usaba.

  **A4 — el error se reflejaba desde la URL.** La URL lleva un **código**
  (`?error=no-encontrado`, etc.) de un vocabulario cerrado
  (`ui/mensajesDeError.ts`) y la pantalla pone el texto;
  `codigoDeErrorParaLaOperadora` reemplaza a `mensajeParaLaOperadora` y
  `esquemaDeParametros.error` es `z.enum(...)`, así un `?error=<lo que sea>`
  no muestra nada. Aplica al listado y al formulario de alta.

  **A6 —** sin rol elegido ahora responde «Elija un rol.» en vez de «Faltan
  el nombre o el correo.».

  **Cadenas visibles nuevas o cambiadas**: «Elija un rol.», «Falta la
  persona.» (reemplaza a «Falta la persona a la que restablecer.» y «Falta la
  persona a la que dar de baja.»), «Sin acciones.». El resto de los mensajes
  no cambia de texto: ahora se derivan de un código.

  **Verificación**: `pnpm check` verde con el índice del commit (1301
  archivos, 9 reglas y 2 métricas sin hallazgos; 52 warnings preexistentes);
  `pnpm vitest run` 552 archivos / 2935 tests verdes; `pnpm test:e2e` 78
  pasados.
