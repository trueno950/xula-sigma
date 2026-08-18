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

- [x] 4.1 `scripts/bootstrap.sql`: rol `xula_super_admin` con los mismos
      atributos que los otros dos, en el mismo bloque `DO $$` idempotente.
      `scripts/db-local.sh` le pasa su clave y exporta
      `SUPER_ADMIN_DATABASE_URL`. [PA-3]

      **Pendiente tuyo:** `.env.example` no se pudo tocar (el harness
      bloquea `.env*`). Falta agregarle:
      `SUPER_ADMIN_DATABASE_URL="postgresql://xula_super_admin:cambiar@localhost:5432/xula"`.
- [x] 4.2 RED barrido `xula\_%` en vez de lista fija. El motivo del cambio
      no es cosmetico: con los dos roles nombrados a mano, un cuarto rol
      creado por comodidad —con BYPASSRLS para "resolver" un permiso—
      quedaba fuera del test. [PA-3]
- [x] 4.3 GREEN conjunto exacto de tres roles, ninguno super/bypassrls.
- [x] 4.4 RED+GREEN dos asserts de privilegios, no uno:
      `role_table_grants` como conjunto exacto, y `role_column_grants`
      aparte —el `GRANT SELECT (col, ...)` **no aparece** en la primera
      vista, asi que un solo assert dejaba el SELECT por columna sin
      cubrir. [PA-3]
- [x] 4.5 GREEN `drizzle/0002_super_admin.sql`: las cuatro politicas del
      diseno mas `usuarios_lectura_admin`, que el diseno no menciona y hace
      falta — `INSERT ... RETURNING` aplica tambien las politicas de SELECT,
      y `altaDePersona` usa `RETURNING`. Sin ella el alta falla.
- [x] 4.6 RED+GREEN alta atomica. [PA-1, PA-2]
- [x] 4.7 GREEN `shared/tenancy/provision.ts`. El id se genera en la
      aplicacion y no con `DEFAULT gen_random_uuid()`: leerlo de vuelta
      pediria `RETURNING`, que exige `SELECT` sobre `ayuntamientos`, y sin
      ese GRANT el rol puede crear municipios pero no recorrer el
      directorio de los que existen.
- [x] 4.8 RED+GREEN ni `SUPER_ADMIN` ni `OPERADOR`.

      **Un test no alcanzaba.** Por la API, `usuarios_alta_admin` y
      `usuarios_lectura_admin` cubren el mismo camino y dan **el mismo
      mensaje** de Postgres, verificado. Con la condicion `rol =
      'ADMIN_MUNICIPAL'` quitada a mano del `WITH CHECK`, los tests que van
      por `altaDePersona` **siguen verdes**: los salva el `RETURNING`. Lo
      aisla un test sin `RETURNING`, por SQL directo, en
      `superAdminAcotado.isolation.test.ts`.
- [x] 4.9 RED `plataformaReservada.isolation.test.ts`, archivo propio.
- [x] 4.10 GREEN **columna `es_plataforma`**, no constante de subdominio.

      Un `subdominio <> 'plataforma'` disperso por las consultas es una
      convencion de nombres y se olvida en la proxima. Un booleano se
      indexa: `ayuntamientos_una_plataforma`, indice unico parcial, impide
      que un seed corrido dos veces deje dos plataformas.
- [x] 4.11 `scripts/plataforma.sql` + `scripts/plataforma-admin.sql`.

      **Son dos pasos con dos roles, y no por descuido: ningun rol puede
      hacer los dos.** Comprobado contra Postgres, no deducido.
      `xula_migrator` es el unico que puede crear la fila de plataforma,
      pero **no puede escribir en `usuarios`** —FORCE RLS alcanza al dueno y
      ahi no tiene politica: `new row violates row-level security policy for
      table "usuarios"`. `xula_super_admin` tampoco, por
      `usuarios_alta_admin`. Queda `xula_app`. Los dos scripts se corrieron
      de punta a punta contra la base local antes de darlos por buenos.
- [x] 4.12 `shared/tenancy/index.ts` exporta `withAltaDeAyuntamiento`.
      Consecuencia documentada ahi: importar el barril ahora exige
      `SUPER_ADMIN_DATABASE_URL`, con el mismo criterio de fallo temprano
      que `DATABASE_URL` en `withTenant.ts`.
- [x] 4.13 RED bitacora registra el alta (actor, ayuntamiento_id,
      accion, momento). [PA-4]

      **El test ya existia y no probaba nada.** Escribia la traza adentro
      del propio `trabajo` y despues afirmaba encontrarla: probaba que podia
      leer una fila que el mismo habia puesto. Quedaba verde con
      `withAltaDeAyuntamiento` sin escribir una sola traza, que era el
      estado real del codigo. Reescrito sin ese insert, quedo en rojo con
      `expected [] to have a length of 1`.
- [x] 4.14 GREEN traza de bitacora dentro de `withAltaDeAyuntamiento`.

      Va en el alta y no en el llamador, y `actor` queda nulo. El porque de
      las dos decisiones esta en `provision.ts`, junto al INSERT que las
      aplica; repetirlo aca garantiza que una de las dos copias envejezca.

      Lo que si vive aca: el dia que el provisionamiento tenga un caso de
      uso con sesion, el actor sale de ahi. Hoy no hay ningun llamador de
      produccion — ver 4.16.
- [x] 4.15 Actualizar `AGENTS.md` y ADR 0001 §1 con la resolucion del
      SUPER_ADMIN (ya cerrada en el diseno). Hecho: ADR 0001 §1 documenta el
      ayuntamiento reservado y `AGENTS.md` nombra el tercer rol.
- [x] 4.16 **El camino real del SUPER_ADMIN no estaba cableado.** Lo
      encontro GGA revisando el PR 5.

      **Resuelto por script operado a mano** (`scripts/restablecer-admin.sql`),
      no por caso de uso. Decision tomada: un municipio pierde a su
      administrador pocas veces al anio, y cablearlo pedia una tercera puerta
      a la base cuya superficie estaria siempre y su uso casi nunca. El dia
      que se vuelva rutina se abre con datos de uso encima de la mesa, no por
      anticipacion.

      Lo que enseño escribirlo, y que ningun analisis anticipo: el rol tiene
      `UPDATE` sobre `cuentas` y **ni una columna de `SELECT`**, asi que
      cualquier `WHERE user_id = ...` muere con `permission denied for table
      cuentas` —filtrar es leer—. El UPDATE va **sin `WHERE`** y lo acota el
      `USING` de la politica. Era lo que el comentario de
      `politicasPlataforma.ts` ya decia; recien se entendio cuando Postgres
      lo nego.

      Tampoco puede resolver el subdominio: sin `SELECT` sobre
      `ayuntamientos`, el id va como parametro y se obtiene aparte con el rol
      de aplicacion. El script cuenta las filas afectadas y falla si no es
      exactamente una, porque un UPDATE frenado por RLS devuelve cero **sin
      error** y no hay forma de releer para verificar.

      Probado de punta a punta contra la base local: restablece al
      ADMIN_MUNICIPAL, deja al OPERADOR intacto pese al UPDATE sin `WHERE`,
      niega el correo de un OPERADOR y el de un admin de otro municipio con
      el mismo mensaje, y no deja traza cuando falla. Ademas quedaron dos
      tests de aislamiento que cubren el camino positivo de la politica —el
      que antes no ejecutaba nadie—, provocados aflojando el `USING`: sin el
      `EXISTS`, el OPERADOR sale con la clave cambiada y el test cae.

      Detalle historico del hallazgo original:

      `restablecerContrasenia` con un contexto de SUPER_ADMIN corre por
      `withTenant` bajo `xula_app`, que tiene `GRANT UPDATE` sobre
      `cuentas`. La politica `cuentas_restablece_admin` y el
      `GRANT UPDATE ON cuentas TO xula_super_admin` —que existen, estan
      migrados y tienen su test de que el rol queda acotado— **no tienen
      ningun camino de ejecucion que los use**.

      En produccion el SUPER_ADMIN vive en el ayuntamiento reservado, asi
      que `ayuntamientoActual()` resuelve la plataforma y `objetivoDe`
      devuelve `NO_ENCONTRADO`: el ADMIN_MUNICIPAL esta en otro tenant. El
      test que parecia cubrirlo fabricaba un SUPER_ADMIN dentro de Motul,
      cosa que no pasa; quedaba verde aunque la politica se borrara. Se le
      corrigio el nombre y el comentario para que diga lo que prueba —la
      regla de `roles.ts`— y no lo que no prueba.

      La alternativa descartada era abrir una conexion como
      `xula_super_admin` con el tenant del municipio objetivo: una **tercera
      puerta** a la base, que la regla 2 de `AGENTS.md` no deja entrar sin
      actualizar antes el ADR 0001 §2. **Sigue habiendo dos puertas.**

## PR 5: Rate limiting y pantalla de acceso

- [x] 5.1 RED `ritmo.test.ts` — la clave y la regla del limite, sin base.
      [AM-5]
- [x] 5.2 GREEN **dos archivos, no uno.** `ritmo.ts` es la regla pura
      —`claveDe`, `LIMITES`, `superaElLimite`, `RitmoExcedidoError`— y
      `limitarRitmo.ts` el efecto contra Postgres. El corte no es estetico:
      importar `withTenant` exige `DATABASE_URL` al cargarse, y con todo
      junto la suite `unit` —que por contrato corre sin base— dejaba de
      poder cargar hasta el test del borde de la ruta. Mismo corte que
      separa `contexto.ts` de `withTenant.ts`.

      Nueva variable: `PIMIENTA_INTENTOS`. Sin ella la tabla de conteo es un
      directorio de quien tiene cuenta en cada municipio —basta hashear un
      correo y comparar.
- [x] 5.3 RED+GREEN `ritmo.isolation.test.ts`, 7 casos. [AM-5]

      **Dos hallazgos al escribirlo, los dos por contar filas:**

      1. `limitarRitmo` recibia el `tx` y lanzaba **adentro** de la
         transaccion: el `throw` se la llevaba y con ella el registro del
         intento, asi que el que corta nunca se contaba. Un intento que no
         se cuenta es un intento gratis. Ahora abre su propia transaccion y
         lanza afuera. Provocado devolviendo el `throw` adentro: rojo.
      2. El helper del test envejecia los intentos con un `UPDATE` del rol
         owner. **Afecta 0 filas en silencio**: `intentos_acceso` no tiene
         `GRANT UPDATE` para nadie y FORCE RLS alcanza tambien al dueno. El
         test pasaba a probar otra cosa. Se siembran los intentos ya viejos.
- [x] 5.4 GREEN `route.ts` limita solo `/api/auth/sign-in/email`, antes de
      construir la instancia. 429 sin decir cual ventana se lleno —"para
      este correo" confirmaria que la cuenta existe.

      **El request se clona.** Leer el cuerpo para sacar el correo lo
      consume; sin el clon `manejarAuth` recibe un cuerpo vacio y ningun
      acceso funciona. Provocado: `Body has already been read`.
- [x] 5.5 GREEN pantalla de acceso. [AM-3]

      **Arrastro el arranque del frontend**, que no estaba en esta lista:
      no habia `layout.tsx`, ni CSS, ni Tailwind instalado. Entraron
      `tailwindcss` 4 + `@tailwindcss/postcss` y `@hookform/resolvers`.
      Decision del usuario ante el fork.

      `page.tsx` es RSC y solo `FormularioDeAcceso.tsx` es `"use client"`.
      El formulario habla con `/api/auth/sign-in/email` y **no** con una
      Server Action: la ruta es la superficie con limitacion de ritmo, y una
      Server Action seria una segunda puerta al acceso que habria que
      acordarse de limitar tambien.

      `shared/ui/marca.ts` valida `ayuntamientos.marca` con Zod antes de
      pintarla: esos colores van a un atributo `style` y salen de una
      columna que alguien edita. `z.url()` **no alcanzo** —
      `javascript:alert(1)` es una URL valida y pasaba el esquema; el test
      lo agarro y el protocolo se acoto a http/https.

      `LARGO_MINIMO` se movio a `reglasDeClave.ts`: importarlo del barril
      `shared/auth` metia argon2 nativo y Postgres en el bundle del
      navegador y **rompia el build**. `tsc` no lo ve; `pnpm build` si.
- [x] 5.6 E2E, 6 casos en Playwright. [AM-3, T9]

      **Dos bugs que ningun test anterior podia encontrar:**

      1. `manejarAuth` armaba el `baseURL` desde `request.url` y `sesion.ts`
         desde el header `Host`. En el servidor de produccion no coinciden:
         Better Auth rechaza con `Invalid origin` y **ningun acceso
         funciona**. Los tests de integracion no podian verlo porque ahi las
         peticiones se construyen a mano con la URL ya correcta. Provocado
         revirtiendo el arreglo: 2 de 6 en rojo.
      2. `/acceso` en el dominio pelado respondia **500** en vez de 404: el
         layout llamaba `ayuntamientoActual()` sin municipio. Un 500 en una
         superficie publica delata que ahi adentro se espera un tenant.

      Tambien entro `/api/salud`, que no toca la base: Playwright arranca el
      servidor antes de sembrar, asi que el chequeo de arranque no puede
      depender de datos. Sirve igual como healthcheck de Railway.
- [x] 5.7 `pnpm test` (180), `pnpm test:e2e` (6) y `pnpm check` en verde.

      **Pendiente tuyo:** `pnpm exec playwright install chromium` falla con
      `EACCES` porque `~/Library/Caches/ms-playwright/.links` es de `root`
      —alguien corrio `sudo playwright install` alguna vez. Se arregla con
      `sudo chown -R "$USER" ~/Library/Caches/ms-playwright`. La suite se
      verifico usando `PLAYWRIGHT_BROWSERS_PATH` a un directorio propio.
- [x] 5.8 La reja de cobertura, que no existia. La encontro GGA y se
      confirmo midiendo, no leyendo:

      1. `@vitest/coverage-v8` **no estaba instalado**. `pnpm vitest run
         --project unit --coverage` cortaba con `MISSING DEPENDENCY` y
         codigo 1: el job `unitarios` de CI fallaba en cada PR.
      2. Con el proveedor puesto, `coverage.include` apuntaba solo a
         `src/modules/**`, que esta **vacio**. Resultado medido: `0/0`,
         "Unknown%", **exit 0**. El piso de 80% se evaluaba sobre cero
         archivos y pasaba siempre — el mismo defecto que `docs/04-calidad.md`
         denuncia para los tests, una capa mas arriba.

      Arreglado: `include` suma `src/shared/**`, `exclude` saca las
      declaraciones (`esquema.ts`, `configuracion.ts`, `politicasPlataforma.ts`,
      `*DePrueba.ts`) porque no tienen caminos de decision y su prueba es el
      test de aislamiento. La medicion pasa a la **suite completa** y al job
      que tiene Postgres: midiendo solo `unit`, `withTenant` y `provision`
      daban 0% con sus tests de aislamiento en verde, y la unica forma de
      subir el numero habria sido escribir tests unitarios que no prueban RLS.

      Medido: 92.56 sentencias / 78.18 ramas / 92.75 funciones / 93.05 lineas.
      Piso: 80/75/80/80. **Provocado**: con `branches=85` sale
      `ERROR: Coverage for branches (78.18%) does not meet global threshold`
      y codigo 1. Un piso que no se vio fallar no es un piso.

      **Deuda declarada:** las ramas van en 75 y no en 80. Lo que falta son
      las guardas de variable de entorno (`if (!url) throw`) que corren al
      importar el modulo; cubrirlas pide `resetModules` y reimportar con el
      entorno roto. Son caminos reales y el piso sube el dia que se escriban.
- [x] 5.9 CI, dos roturas que dejo PR 4 y nadie vio porque la rama nunca
      llego a `main`:

      1. `bootstrap.sql` pide `-v clave_super_admin` y `ci.yml` pasaba solo
         `clave_migrator` y `clave_app`. Con `\set ON_ERROR_STOP on` puesto,
         el paso "Provisionar roles" **muere**, y con el todo el job de
         aislamiento — el que `ci.yml` llama "el que no se negocia".
      2. Al job de integracion le faltaba `SUPER_ADMIN_DATABASE_URL`, que
         `provision.ts` y el barril de `tenancy` exigen al importarse.

      **Brecha declarada:** el E2E no tiene job en CI. Necesita Postgres,
      build y navegadores; no lo agrego sin poder verificarlo, y en esta
      maquina `playwright install` esta roto por el `EACCES` de 5.7.
