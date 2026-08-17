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
- [ ] 0.10 Registrar el p95 en el ADR. Borrar la rama del spike.

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

- [ ] 2.1 RED `contrasenia.test.ts` — hash/verify argon2id, rechazo
      < 12 caracteres.
- [ ] 2.2 GREEN `shared/auth/contrasenia.ts`.
- [ ] 2.3 Regla dependency-cruiser: `better-auth` y `@node-rs/argon2`
      solo se importan desde `shared/auth`.
- [ ] 2.4 GREEN `shared/auth/instancia.ts` — `manejarAuth(request)` abre
      `withTenant` y corre **todo** `auth.handler(request)` adentro; el
      Proxy enruta TODAS las operaciones al `tx` ambiente y `transaction`
      reusa esa misma transaccion en vez de anidar. Sin parametro de
      tenant: lo resuelve `ayuntamientoActual()`. [T1, T2]
      **Corregido por el spike PR 0**: la version anterior permitia solo
      `.transaction()`, y eso rompe el acceso — `findOne` del adaptador usa
      `db` directo (`index.mjs:377`) y no pasa por la transaccion.
- [ ] 2.5 GREEN `shared/auth/sesion.ts` — lee la sesion del request.
- [ ] 2.6 GREEN `shared/auth/index.ts` — superficie publica (`ROLES`),
      no exporta la fabrica ni la bd.
- [ ] 2.7 RED `accesoCruzado.integration.test.ts` — mismo correo y
      contrasenia en Motul y Ticul, alta y acceso en ambos sentidos,
      cruzado falla. [AM-1, AM-4]
- [ ] 2.8 GREEN `app/api/auth/[...all]/route.ts` delega a
      `auth.handler(request)` via `manejarAuth(request)`.
- [ ] 2.9 RED+GREEN `databaseHooks.session.create.before` rechaza si
      `bajaEn` no es nulo; los 4 rechazos (inexistente, contrasenia,
      baja, otro municipio) mapean al mismo `CREDENCIALES_INVALIDAS`.
      [AM-1, AM-2]
- [ ] 2.10 `pnpm test` y `pnpm test:integration` en verde.
- [ ] 2.11 RED+GREEN borde de error en `route.ts`: con el handler adentro
      de la transaccion, un error del adaptador **no** vuelve como
      respuesta de Better Auth — sale como excepcion de `manejarAuth`
      (verificado en el spike). El borde lo convierte en 500 generico y
      **no** deja salir el motivo: `new row violates row-level security
      policy for table "usuarios"` en un cuerpo de respuesta es filtracion
      de esquema. El detalle va a bitacora, no al cliente. [AM-2]

## PR 3: Roles — regla pura, verificacion, contexto

- [ ] 3.1 RED `roles.test.ts` — `puedeRestablecerContrasenia(rolActor,
      rolObjetivo)`: ADMIN sobre su gente, SUPER_ADMIN sobre
      ADMIN_MUNICIPAL, SUPER_ADMIN sobre otro rol rechazado. [AR-4]
- [ ] 3.2 GREEN `shared/auth/roles.ts` — `ROLES`, `Rol`, reglas puras
      sin IO. [AR-1, AR-2]
- [ ] 3.3 GREEN `contextoActual()` en `shared/auth/index.ts` compone
      `ayuntamientoActual()` + `sesionActual()`.
- [ ] 3.4 RED caso de uso: OPERADOR administrando usuarios y CONSULTA
      escribiendo reciben 403. [AR-1]
- [ ] 3.5 GREEN caso de uso en `application` verifica rol; nunca en
      `domain`. [AR-2]
- [ ] 3.6 RED recurso de otro ayuntamiento responde 404 sin importar el
      rol; no se evalua rol antes de resolver tenant. [AR-3]
- [ ] 3.7 GREEN orden de verificacion: aislamiento de tenant antes que
      rol. [AR-3]
- [ ] 3.8 RED bitacora registra actor y afectado en la misma transaccion
      del restablecimiento. [AR-5]
- [ ] 3.9 GREEN escritura en `bitacora` dentro de la transaccion del
      caso de uso.
- [ ] 3.10 RED usuario con `bajaEn` no autentica (mismo mensaje
      generico); constancias previas conservan la autoria. [AR-6]
- [ ] 3.11 GREEN caso de uso de baja logica (`ADMIN_MUNICIPAL` sobre su
      propio ayuntamiento).

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
