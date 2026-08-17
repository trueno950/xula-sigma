# Tasks: Autenticacion y RBAC

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~1650 (PR0 no cuenta: desechable) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 0 (spike) -> PR 1 -> PR 2 -> PR 3 -> PR 4 -> PR 5 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

**Nota sobre PR 1.** El diseno agrego una quinta tabla (`intentos_acceso`) y
movio el esquema a `shared/auth/esquema.ts`. Reestimado contra el diseno
real: ~520 lineas solo en PR 1 (5 tablas + 1 migracion + 5 tests de
aislamiento), por encima del presupuesto de 400 **dentro del propio PR**.
El diseno pide "un solo archivo" de migracion (ADR 0001 §2, evita ventana
sin RLS).

**Resuelto 2026-08-16: se parte la migracion por tabla, no por concepto.**

Dos archivos, cada uno **completo** con sus tablas, su `ENABLE` + `FORCE`,
sus politicas y sus `GRANT`. No es una excepcion al ADR: el ADR pide un
archivo para que un diff que toque solo lo generado no se vea identico a
una migracion que se olvido del `FORCE`. Eso se rompe partiendo por
concepto —"crear tablas" en uno, "agregar RLS" en otro— y no partiendo por
tabla, donde cada archivo se lee entero y solo.

Tampoco deja ventana sin RLS: si el segundo archivo falla, quedan cuatro
tablas correctamente protegidas y la quinta sin existir.

Se descarto `size:exception`: 520 lineas de SQL y tests de aislamiento son
justo el material donde la revision se cansa, y es donde una politica mal
escrita pasa sin que nadie la vea.

**Estrategia de encadenado: `stacked-to-main`.** PR 1 apunta a `main` y
cada siguiente al anterior. Lo ya revisado entra sin esperar al resto.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 0 | Spike desechable: 4 tablas de scratch, `additionalFields`+hooks, p95 medido | PR 0 (no fusiona) | Vitest ad hoc contra los 5 criterios | Rama de spike, Postgres local, `auth.handler` real | Borrar la rama |
| 1 | 5 tablas, migracion unica, RLS, 5 tests de aislamiento | PR 1 | `pnpm test:integration -- shared/auth` | `pnpm db:local`, consultas reales sin filtro | Revert + migracion de bajada (drop 5 tablas y politicas) |
| 2 | Instancia por request, argon2id, sesion, sign-in cruzado | PR 2 | `pnpm test src/shared/auth` + `pnpm test:integration -- accesoCruzado` | `pnpm db:local`, alta/acceso real via `auth.handler` | Revert PR (instancia.ts, contrasenia.ts, sesion.ts, route.ts); tablas quedan sin uso |
| 3 | Regla de rol pura, verificacion en caso de uso, 403 vs 404, bitacora | PR 3 | `pnpm test src/shared/auth/roles.test.ts` | N/A — capa sin IO; el harness real llega con la UI en PR 5 | Revert PR (roles.ts, caso de uso, contextoActual) |
| 4 | Tercer rol Postgres, provision atomica, exclusion de plataforma | PR 4 | `pnpm test:integration -- esquema provision` | `SUPER_ADMIN_DATABASE_URL` contra Postgres real, alta de punta a punta | Revert PR + `REVOKE`; `DROP ROLE xula_super_admin` fuera de migracion |
| 5 | Rate limiting, ruta de acceso, pantalla, cookie por subdominio | PR 5 | `pnpm test src/shared/auth/ritmo.test.ts` | `pnpm test:e2e` (Playwright, dos subdominios en paralelo) | Revert PR (route.ts, page.tsx, ritmo.ts); tabla existente sin escritura |

Requisitos por codigo corto: `AM-1..6` = `autenticacion-municipal`,
`AR-1..6` = `autorizacion-roles`, `PA-1..4` = `provision-ayuntamientos`.

## PR 0: Spike y medicion (desechable, gate de decision)

> **Primera corrida: 2026-08-16. La compuerta detuvo.** Encontro dos
> errores del diseno, ya corregidos en `design.md`:
>
> 1. `additionalFields` con `required: true` exige el `ayuntamientoId`
>    **al cliente** (`MISSING_FIELD`), aun con `input: false`. Va
>    `required: false` + `NOT NULL` en la base.
> 2. La bd guardada que solo permitia `.transaction()` **rompe el
>    acceso**: con `transaction: true` el adaptador enruta por la
>    transaccion solo las mutaciones; `findOne` usa `db` directo
>    (`index.mjs:377`). La transaccion ahora la abre la ruta y envuelve
>    todo el handler.
>
> El mecanismo `additionalFields` + `databaseHooks` quedo demostrado
> **viable**: el alta devuelve el usuario con su `ayuntamientoId` puesto
> por el hook, sin que el cliente lo mande nunca.
>
> **Segunda corrida: 2026-08-17 sobre el diseno corregido. La compuerta
> abrio.** 5/5 criterios, y p95 de construccion **0.227 ms** contra un
> umbral de 5. Sigue el diseno tal cual: AsyncLocalStorage no hace falta.
>
> Un hallazgo mas, que no invalida el criterio pero si el motivo que el
> diseno le atribuia: sin el hook, quien rechaza la fila es la **politica
> RLS** (`WITH CHECK` sobre NULL evalua a "no verdadero"), no el
> `NOT NULL`. Corregido en `design.md` seccion 2.
>
> Y una consecuencia de la forma corregida que PR 2 tiene que resolver: el
> error del adaptador **no** se convierte en respuesta HTTP, sale como
> excepcion de `manejarAuth`. Ver tarea 2.11.

- [x] 0.1 Rama de spike: 4 tablas de scratch + `additionalFields` +
      `databaseHooks` + argon2id, invocado por `auth.handler(request)`.
- [x] 0.2 Sembrar Motul y Ticul; habilitar `emailVerification` para forzar
      escritura en `verification` (sin `userId`).
- [x] 0.3 Criterio 1: filas de las 4 tablas visibles solo bajo su tenant
      tras alta/acceso reales, conteo exacto por tabla.
- [x] 0.4 Criterio 2 (duro): token de `verification` de Motul invisible y
      no consumible desde Ticul.
- [x] 0.5 Criterio 3: remover el hook a mano; el alta debe FALLAR en la
      base, no escribir la fila. **Falla por politica RLS, no por
      `NOT NULL`**; el `NOT NULL` queda como segunda reja y se verifica en
      el catalogo porque `FORCE RLS` no deja rol por el que observarlo.
- [x] 0.6 Criterio 4: cero `AccesoSinTenantError` en alta, acceso, cierre
      de sesion, refresco. Con control positivo: una instancia construida
      fuera de `withTenant` **si** lo levanta, o el criterio no es
      falseable.
- [x] 0.7 Criterio 5: mismo correo/contrasenia en Motul y Ticul, alta y
      acceso en ambos, cruzado falla.
- [x] 0.8 Medir p95 de `manejarAuth(request)` y del acceso completo
      (1000 iter, 100 de calentamiento). Construccion: p50 0.141 ms,
      p95 **0.227 ms**. Acceso completo: p50 23.6 ms, p95 26.2 ms —
      dominado por argon2id, no por el mecanismo de tenant.
- [x] 0.9 **Decision: sigue el diseno (PR 1).** 5/5 criterios y p95 22
      veces por debajo del umbral. No se activa el repliegue ni se abre la
      discusion de AsyncLocalStorage.
- [x] 0.10 Registrar el p95 en el ADR (seccion 7, tabla de medicion). La
      rama del spike se etiqueto como `spike-auth-rbac-pr0` antes de
      borrarla: los hallazgos ya viven en `design.md` y en el ADR, pero la
      evidencia de como se obtuvieron es irrecuperable si se pierde el
      codigo. Un tag la conserva sin dejar la rama estorbando.

## PR 1: Esquema, migracion, RLS, aislamiento

> **Cerrado 2026-08-17.** 22 tests de aislamiento en verde; 34 de
> integracion en total. `pnpm check` sin violaciones de capa.
>
> **Desvio del diseno, aceptado en revision:** `rol` y `tipo` se
> implementaron como conjuntos cerrados (`$type` + `CHECK`), no como
> `text` suelto. El motivo esta en `design.md` seccion 6. Aparecio con
> `ROLES`/`Rol` en `shared/auth/roles.ts`, que el diseno ubicaba en PR 3;
> las reglas puras siguen siendo de PR 3.
>
> `columnaTenant()` y `politicaTenant()` se movieron a
> `tenancy/esquema.ts`: son la forma de un invariante que repite **toda**
> tabla operativa, no una comodidad de auth. `bitacora` ya las usa.
>
> Las cinco tablas se escribieron juntas y los cinco tests tambien: el RED
> fue correrlos contra Postgres **antes** de aplicar la migracion —cinco
> archivos rojos con `relation "usuarios" does not exist`— porque la
> garantia que estos tests describen vive en Postgres, no en TypeScript.

- [x] 1.1 RED `usuarios.isolation.test.ts` — fila de Motul invisible bajo
      `withTenant(ticul)` sin filtro. [AM-6]
- [x] 1.2 GREEN tabla `usuarios` en `shared/auth/esquema.ts` (campos
      Better Auth + `rol`, `bajaEn`) + `uniqueIndex(ayuntamientoId, email)`.
- [x] 1.3 RED `sesiones.isolation.test.ts`. [AM-6]
- [x] 1.4 GREEN tabla `sesiones`.
- [x] 1.5 RED `cuentas.isolation.test.ts`. [AM-6]
- [x] 1.6 GREEN tabla `cuentas`. **Sin las columnas de OAuth**: el
      adaptador solo valida contra el esquema los campos que escribe
      (`checkMissingFields` recorre `values`, no el modelo —
      `drizzle-adapter/dist/index.mjs:286`), y el alta por correo no
      escribe ninguna.
- [x] 1.7 RED `verificaciones.isolation.test.ts` — caso sin `userId`,
      tenant no derivable por join. [AM-6]
- [x] 1.8 GREEN tabla `verificaciones`.
- [x] 1.9 RED `intentosAcceso.isolation.test.ts`. [AM-5]
- [x] 1.10 GREEN tabla `intentos_acceso` (`clave` sha256, `tipo`,
      `ocurridoEn`) + indice `(ayuntamientoId, clave, ocurridoEn)`.
- [x] 1.11 Migracion `drizzle/0001_auth.sql`: 5 tablas, ENABLE+FORCE RLS,
      politica `FOR ALL TO xula_app`, GRANT por tabla (`usuarios` sin
      DELETE). [T1, T4]
- [x] 1.12 Modificar `tenancy/esquema.ts`: exportar `tenantActual`.
- [x] 1.13 Confirmar los 5 tests en rojo con la politica alterada a mano.
      **La provocacion util no es quitar la politica** —eso rompe hasta la
      siembra y el rojo no dice nada— sino aflojar el `USING` a `true`
      dejando el `WITH CHECK` intacto: la fuga de lectura sin ruido. Los
      cinco archivos en rojo, 12 tests. Entre ellos, Motul borro la sesion
      de Ticul y **consumio su token de restablecimiento**.
- [x] 1.14 `pnpm test:integration` en verde para las 5 tablas.

## PR 2: shared/auth — instancia, contrasenia, sesion

- [x] 2.1 RED `contrasenia.test.ts` — hash/verify argon2id, rechazo
      < 12 caracteres.
- [x] 2.2 GREEN `shared/auth/contrasenia.ts`.
- [x] 2.3 Regla dependency-cruiser: `better-auth` y `@node-rs/argon2`
      solo se importan desde `shared/auth`.
- [x] 2.4 GREEN `shared/auth/instancia.ts` — `manejarAuth(request)` abre
      `withTenant` y corre **todo** `auth.handler(request)` adentro; el
      Proxy enruta TODAS las operaciones al `tx` ambiente y `transaction`
      reusa esa misma transaccion en vez de anidar. Sin parametro de
      tenant: lo resuelve `ayuntamientoActual()`. [T1, T2]
      **Corregido por el spike PR 0**: la version anterior permitia solo
      `.transaction()`, y eso rompe el acceso — `findOne` del adaptador usa
      `db` directo (`index.mjs:377`) y no pasa por la transaccion.
- [x] 2.5 GREEN `shared/auth/sesion.ts` — lee la sesion del request.
- [x] 2.6 GREEN `shared/auth/index.ts` — superficie publica (`ROLES`),
      no exporta la fabrica ni la bd.
- [x] 2.7 RED `accesoCruzado.integration.test.ts` — mismo correo y
      contrasenia en Motul y Ticul, alta y acceso en ambos sentidos,
      cruzado falla. [AM-1, AM-4]
- [x] 2.8 GREEN `app/api/auth/[...all]/route.ts` delega a
      `auth.handler(request)` via `manejarAuth(request)`.
- [x] 2.9 RED+GREEN `databaseHooks.session.create.before` rechaza si
      `bajaEn` no es nulo; los 4 rechazos (inexistente, contrasenia,
      baja, otro municipio) mapean al mismo `CREDENCIALES_INVALIDAS`.
      [AM-1, AM-2]
- [x] 2.10 `pnpm test` y `pnpm test:integration` en verde.
- [x] 2.11 RED+GREEN borde de error en `route.ts`: con el handler adentro
      de la transaccion, un error del adaptador **no** vuelve como
      respuesta de Better Auth — sale como excepcion de `manejarAuth`
      (verificado en el spike). El borde lo convierte en 500 generico y
      **no** deja salir el motivo: `new row violates row-level security
      policy for table "usuarios"` en un cuerpo de respuesta es filtracion
      de esquema. El detalle va a bitacora, no al cliente. [AM-2]
- [x] 2.12a `cuentas` — **cerrado por construccion, no por test.** El alta
      dejo de pasar por el adaptador (ver correccion abajo): la escribe
      `altaDePersona` con Drizzle. `checkMissingFields` solo corre en
      `create`, y el adaptador ya no crea cuentas — lee y actualiza. La
      suposicion sobre las columnas de OAuth dejo de existir.
- [x] 2.12b `verificaciones` — cubierto por
      `verificacionPorAdaptador.integration.test.ts`. Sin `userId` su tenant
      no se deriva por join: lo fija `create.before` y nada mas. El test no
      espera al envio de correo porque no hace falta: la ruta real
      (`api/routes/password.mjs:75` en 1.6.29) llama `createVerificationValue`
      **antes** de mandar el correo, asi que llamarla directo ejercita el
      mismo `createWithHooks`. [AM-1, AM-2]

      Lo que aparecio al escribirlo: `findVerificationValue` busca **solo
      por `identifier`, sin filtro de tenant**
      (`db/internal-adapter.mjs:600` en 1.6.29) y resuelve con
      `createdAt desc limit 1`. Es el mismo agujero que `findUserByEmail`
      —el que justifica la forma de `instancia.ts`— y hasta ahora nadie lo
      habia provocado. Con la politica aflojada a `USING (true)`, **Motul
      recibio el token de restablecimiento de Ticul** por ser el ultimo
      escrito. Dos provocaciones lo dejan falseable: neutralizar el gancho
      manda el INSERT sin tenant y `ExecWithCheckOptions` lo rechaza;
      aflojar el `USING` pone en rojo los dos casos de aislamiento.

      **Sigue sin escritor de produccion.** Restablecimiento de contrasenia
      y verificacion de correo necesitan envio de correo, que no existe
      todavia. Cuando entre, el gancho ya esta cubierto; lo que falta
      probar entonces es la ruta HTTP completa.

### Correccion de PR 2 — el registro publico estaba abierto

Las tareas 2.4 y 2.7 daban por hecho que el alta iba por el endpoint de
Better Auth. **Cablearlo asi deja `/api/auth/sign-up/email` abierto en cada
subdominio**: cualquiera que visite `motul.dominio` se crea una cuenta en
Motul y queda adentro del municipio. Contradice D7, donde el alta la
autoriza alguien.

Se apago con `emailAndPassword.disableSignUp` y el alta paso a
`shared/auth/alta.ts` (`altaDePersona`), que corre bajo `withTenant` y
exige un `rol` explicito, sin valor por defecto. Better Auth se queda con
el acceso y la sesion. Hay test de que el endpoint responde distinto de 200
y no deja fila.

Lo destapo `rol` NOT NULL: el alta por el endpoint fallaba porque la
libreria no conoce esa columna, y al preguntarme que rol asignarle quedo
claro que la pregunta correcta era otra — quien tiene derecho a dar de
alta.

### Correccion de PR 2 — `modelName` faltaba en el diseno

D3 dice que traducir los **campos** con `fields:` seria un mapa de mas. No
menciona los **modelos**, y esos si necesitan mapa: el adaptador resuelve
la tabla con `schema[model]`, busqueda por clave directa
(`@better-auth/drizzle-adapter/dist/index.mjs:92` en 1.6.29). Sin
`modelName: "usuarios"` busca `schema["user"]`, no lo encuentra, y **todo
endpoint responde 500 con cuerpo vacio**. El motivo solo aparece pasandole
un `logger` a `betterAuth`.

## PR 3: Roles — regla pura, verificacion, contexto

- [x] 3.1 RED `roles.test.ts` — 12 tests. Las tablas se recorren enteras
      contra `ROLES` en vez de enumerar casos: un quinto rol deja el test
      rojo en vez de heredar un permiso por descarte. [AR-4]
- [x] 3.2 GREEN `shared/auth/roles.ts` — `puedeAdministrarUsuarios`,
      `puedeEscribir`, `puedeRestablecerContrasenia`, `puedeDarDeBaja`.
      Sin IO. [AR-1, AR-2]

      **Desvio del spec, deliberado:** dice que `ADMIN_MUNICIPAL`
      administra "cualquier usuario de su propio ayuntamiento", escrito
      pensando en un municipio normal. El ayuntamiento reservado de
      plataforma si tiene `SUPER_ADMIN` (tarea 4.11), y ahi la lectura
      literal es una escalada: su `ADMIN_MUNICIPAL` le restablece la
      contrasenia al `SUPER_ADMIN` y se queda con la plataforma. Ningun rol
      toca a un `SUPER_ADMIN`. Se cierra por rol y no por ayuntamiento
      porque la regla es pura y no sabe en que municipio corre.
- [x] 3.3 GREEN `contextoActual()` — en `shared/auth/contexto.ts`, no en
      `index.ts` como decia el diseno: ese archivo declara ser superficie y
      nada mas. Se reexporta desde el barril. Test de punta a punta en
      `contexto.integration.test.ts`; lo unico mockeado es `next/headers`.

      **Encontrado al escribirlo:** para que el rol viaje en la sesion hay
      que declararlo en `additionalFields`, y con el valor por defecto
      —`input: true`— la libreria lo vuelve escribible por
      `POST /api/auth/update-user`. Provocado: un `CONSULTA` respondio 200
      y quedo `ADMIN_MUNICIPAL` **en la base**. Lo corta `input: false`,
      que hace fallar a `parseInputData` con `FIELD_NOT_ALLOWED` antes de
      tocar la base (`db/schema.mjs:65` en 1.6.29). Hay test para `rol` y
      para `ayuntamientoId`.
- [x] 3.4 RED `restablecerContrasenia.integration.test.ts` y
      `darDeBajaUsuario.integration.test.ts`. [AR-1]
- [x] 3.5 GREEN `shared/auth/administracionDeUsuarios.ts`.

      **Los casos de uso de plataforma no son un modulo.** La lista de
      `estructura.md` seccion 2 es cerrada y no incluye administracion, y
      dependency-cruiser confirma la lectura: sus reglas de capas aplican
      solo a `^src/modules/`. Van planos en `shared/auth/`, que es lo que
      `estructura.md` describe como "sesion y roles".

      Abren su propia transaccion en vez de recibirla —al reves que
      `altaDePersona`, que es una primitiva usada adentro de otras— porque
      asi el ayuntamiento sale del contexto del actor y no hay forma de que
      la transaccion sea de un municipio y el actor de otro.
- [x] 3.6 RED dos casos, no uno. [AR-3]
- [x] 3.7 GREEN el objetivo se resuelve **antes** de evaluar el rol.
      Provocado invirtiendo el orden: el caso del `ADMIN_MUNICIPAL` sobre un
      id ajeno **sigue verde** —ese rol pasa la verificacion y cae igual en
      la busqueda—, y lo caza el segundo caso, el del rol sin permiso, que
      pasa a responder `NO_AUTORIZADO`. Ahi el codigo de error se vuelve un
      oraculo de en que municipio vive cada id. Un solo test no alcanzaba.

      `NoEncontradoError` es nuevo en `shared/lib/errores.ts`.
- [x] 3.8 RED traza con actor, afectado, entidad y ayuntamiento. [AR-5]
- [x] 3.9 GREEN `registrar()` escribe en `bitacora` con el mismo `tx`.

      **Lo que quedo sin cubrir, declarado:** que la traza y el cambio
      compartan transaccion no tiene test, porque no se pudo escribir uno
      que fallara. Tres mutaciones —bitacora en otra transaccion, el fallo
      tragado con `catch`, y el orden de escrituras invertido— quedaron las
      tres verdes: la traza es la ultima escritura, asi que nada falla
      despues de ella, y Postgres aborta la transaccion entera al primer
      statement que falla. El primer intento de test usaba una clave debil y
      era vacio por la misma razon. Se borro en vez de dejarlo decorando.
- [x] 3.10 RED baja logica: la fila sobrevive, las trazas que la referencian
      tambien. Que un usuario con `bajaEn` no autentique ya estaba cubierto
      por `soloSiSigueActiva` y `accesoCruzado` en PR 2. [AR-6]
- [x] 3.11 GREEN `darDeBajaUsuario`. `SUPER_ADMIN` no da de baja a nadie:
      restablecer al `ADMIN_MUNICIPAL` lo destraba, darlo de baja dejaria al
      municipio sin quien lo administre, y esa decision no es de plataforma.

## PR 4: Tercer rol Postgres, provision de municipios

- [ ] 4.1 Modificar `scripts/bootstrap.sql`: rol `xula_super_admin`
      (`NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT`),
      mismo bloque `DO $$` idempotente, `SUPER_ADMIN_DATABASE_URL`. [PA-3]
- [ ] 4.2 RED ampliar `esquema.isolation.test.ts`: barrido `xula\_%`
      exige exactamente 3 roles, ninguno super/bypassrls. [PA-3]
- [ ] 4.3 GREEN query por patron reemplaza la lista fija de 2 roles.
- [ ] 4.4 RED assert de privilegios de tabla de `xula_super_admin`
      contra `role_table_grants` (conjunto exacto). [PA-3]
- [ ] 4.5 GREEN migracion adicional: politicas `usuarios_alta_admin`,
      `cuentas_restablece_admin`, `GRANT INSERT` en `ayuntamientos`,
      `GRANT SELECT` por columna en `usuarios`.
- [ ] 4.6 RED `withAltaDeAyuntamiento` crea ayuntamiento + primer
      `ADMIN_MUNICIPAL` en una transaccion; fallo en el segundo paso no
      deja el ayuntamiento huerfano. [PA-1, PA-2]
- [ ] 4.7 GREEN `shared/tenancy/provision.ts` — segunda conexion privada
      de modulo, `withAltaDeAyuntamiento`.
- [ ] 4.8 RED crear un `SUPER_ADMIN` via `withAltaDeAyuntamiento` falla
      por `usuarios_alta_admin` (`WITH CHECK rol = 'ADMIN_MUNICIPAL'`).
- [ ] 4.9 RED `resolverAyuntamientoPorSubdominio` devuelve null para el
      subdominio reservado de plataforma — no aparece como un municipio
      mas. Test propio, ver diseno §10.
- [ ] 4.10 GREEN exclusion de la fila reservada (constante de subdominio
      reservado o columna dedicada — decision de implementacion a
      documentar en el PR).
- [ ] 4.11 Seed unico del ayuntamiento reservado + primer `SUPER_ADMIN`,
      fuera de `withAltaDeAyuntamiento`, documentado como paso manual
      por entorno.
- [ ] 4.12 Modificar `shared/tenancy/index.ts`: exportar
      `withAltaDeAyuntamiento`, documentar por que no rompe el patron de
      una sola puerta.
- [ ] 4.13 RED bitacora registra el alta (actor, ayuntamiento_id,
      accion, momento). [PA-4]
- [ ] 4.14 GREEN traza de bitacora dentro de `withAltaDeAyuntamiento`.
- [ ] 4.15 Actualizar `AGENTS.md` y ADR 0001 §1 con la resolucion del
      SUPER_ADMIN (ya cerrada en el diseno).

## PR 5: Rate limiting y pantalla de acceso

- [ ] 5.1 RED `ritmo.test.ts` — ventana corrediza, 5/correo y 20/IP en
      15 min, sin `bloqueadoHasta`. [AM-5]
- [ ] 5.2 GREEN `shared/auth/ritmo.ts` sobre `intentos_acceso` (clave =
      sha256(valor + pimienta)).
- [ ] 5.3 RED integracion: intento tras expirar la ventana autentica con
      normalidad. [AM-5]
- [ ] 5.4 GREEN `route.ts` aplica `limitarRitmo()` antes de construir la
      instancia, solo en la ruta de acceso.
- [ ] 5.5 GREEN `app/(acceso)/acceso/page.tsx` — RSC + formulario, sin
      `crossSubDomainCookies`. [AM-3]
- [ ] 5.6 E2E sesion en Motul y Ticul en paralelo; la cookie de Motul no
      llega a Ticul. [AM-3, T9]
- [ ] 5.7 `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`,
      `pnpm check` en verde.
