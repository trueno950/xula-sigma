# Propuesta: Autenticacion y RBAC

**Cambio:** `auth-rbac` · **Base:** `openspec/changes/auth-rbac/exploration.md`

## Intencion

Hoy el sistema aisla datos por municipio pero no sabe quien opera. Sin
identidad no hay forma de cumplir lo que el producto ya promete: bitacora
con usuario, exportacion masiva autorizada por rol, y un panel de alta de
municipios que hoy solo existe como script con el rol de migraciones.

Ningun modulo operativo puede arrancar sin esto. Constancias, padron,
apoyos y juzgado guardan datos personales de vecinos de municipios chicos,
donde el personal del palacio se conoce entre si: "quien vio este
registro" no es metrica, es responsabilidad legal del ayuntamiento como
sujeto obligado.

Exito: una persona de Motul entra en `motul.xulasigma.mx`, opera segun su
rol, y su intento de entrar en `ticul.xulasigma.mx` falla como si no
existiera.

## Alcance

**Dentro:** email y contrasenia; sesion; los cuatro roles (`SUPER_ADMIN`,
`ADMIN_MUNICIPAL`, `OPERADOR`, `CONSULTA`); verificacion de rol en el caso
de uso; las cuatro tablas de Better Auth (`user`, `session`, `account`,
`verification`) con `ayuntamiento_id`, `FORCE RLS`, politica, `GRANT` y
test de aislamiento; tercer rol Postgres para SUPER_ADMIN; rate limiting
de login; test del flujo real de sign-in cruzado entre municipios.

**Fuera:** OAuth; recuperacion de contrasenia por correo (sin proveedor de
mail decidido); 2FA; UI del panel SUPER_ADMIN mas alla del alta de
municipios; matriz de permisos por modulo mas fina que los cuatro roles;
bloqueo persistente de cuenta por intentos fallidos.

Entra ademas, por las decisiones de operacion de la seccion siguiente:
restablecimiento de contrasenia operado por administrador (no por correo),
y baja logica de usuarios.

## Decisiones de operacion municipal

Cerradas con el responsable del producto. No son supuestos.

| Decision | Resuelto | Por que |
|---|---|---|
| Primer administrador de un municipio | Lo crea el alta, en el mismo paso | Un municipio dado de alta sin nadie que pueda entrar no sirve |
| Restablecer una contrasenia olvidada | El `ADMIN_MUNICIPAL` de ese municipio | Cada ayuntamiento se resuelve solo, sin depender del proveedor |
| Si el trabado es el propio `ADMIN_MUNICIPAL` | El `SUPER_ADMIN` lo restablece, y **solo** esa cuenta | Sin esto, un municipio con un unico administrador queda tapiado. En un ayuntamiento chico es una sola persona, no un equipo |
| Persona que deja el ayuntamiento | Baja logica, nunca borrado | Sus constancias emitidas conservan quien las firmo. Un borrado real deja documentos oficiales huerfanos, y la bitacora no se toca |
| Intentos fallidos de acceso | Solo limitacion de ritmo por IP y correo | Un bloqueo persistente se puede usar para dejar afuera a un companiero justo el dia que hay que emitir |
| Si el costo por request sale alto | Vuelve a decision humana con el numero medido | Cambiar a AsyncLocalStorage mete dos mecanismos de contexto conviviendo; no se toma sin ver el dato |

Consecuencias que el spec tiene que recoger:

- Todo restablecimiento de contrasenia —del `ADMIN_MUNICIPAL` sobre su gente
  y del `SUPER_ADMIN` sobre el `ADMIN_MUNICIPAL`— deja traza en bitacora con
  quien lo hizo y sobre quien.
- El `SUPER_ADMIN` puede restablecer **unicamente** la cuenta del
  `ADMIN_MUNICIPAL`. No es una llave maestra sobre cualquier usuario.
- La baja logica necesita su columna y su efecto en el acceso: un usuario
  dado de baja no autentica, y falla con el mismo mensaje generico que uno
  inexistente.

## Capabilities

### New Capabilities

- `autenticacion-municipal`: alta y acceso por email/contrasenia dentro
  del tenant, sesion por subdominio, rate limiting, aislamiento del flujo.
- `autorizacion-roles`: los cuatro roles, regla pura en `domain`,
  verificacion en `application`, 403 de rol frente a 404 de tenant.
- `provision-ayuntamientos`: alta de municipios operada por la aplicacion
  bajo el tercer rol Postgres, con traza en bitacora.

### Modified Capabilities

Ninguna. No existen specs previos en `openspec/specs/`.

## Enfoque

1. **Una cuenta pertenece a un solo ayuntamiento.** Cookie por
   subdominio, el default de Better Auth sin `crossSubDomainCookies`. Es
   decision de producto: nadie opera dos municipios con una cuenta.
2. **Instancia de Better Auth por request.** La ruta resuelve
   `ayuntamientoActual()` y recien despues construye `betterAuth({...})`
   con un `db` cuyo `.transaction()` delega en `withTenant`. El costo por
   request no esta medido: medirlo es trabajo explicito de este cambio,
   con fallback a AsyncLocalStorage si resulta inaceptable.
3. **Spike antes del diseno.** Probar punta a punta que
   `additionalFields` + `databaseHooks` deja `ayuntamiento_id` en las
   cuatro tablas por los flujos reales, incluida `verification`, que no
   tiene `userId`. Si falla, las cuatro tablas pasan a repositorio propio.
4. **Tercer rol Postgres** (`xula_super_admin`, `NOSUPERUSER
   NOBYPASSRLS`) con `GRANT INSERT` sobre `ayuntamientos` y politica
   propia, en `scripts/bootstrap.sql`. El test de esquema hoy solo cubre
   `xula_app` y `xula_migrator`: se amplia a los tres.
5. `emailAndPassword.password: { hash, verify }` con argon2id reemplaza
   Scrypt. La restriccion en Postgres es nuestra:
   `uniqueIndex().on(ayuntamientoId, email)`, no unicidad global.

## Invariantes que toca

| Invariante / escenario | Como lo toca |
|---|---|
| 1 — Aislamiento | Cuatro tablas nuevas con `ayuntamiento_id`, RLS y politica |
| T1, T2 | Toda llamada a Better Auth corre dentro de `withTenant` |
| T3 | Login de otro municipio falla como inexistente, no como prohibido |
| T4 | Las cuatro tablas entran al barrido del test de esquema |
| T9 | Cookie por subdominio: el contexto ni siquiera viaja |
| 5 — Auditoria | Acceso, cambio de contexto y alta de municipio en bitacora |

## Areas afectadas

| Area | Impacto | Que cambia |
|---|---|---|
| `src/shared/auth/` | Nueva | Instancia por request, hooks de tenant, sesion, roles |
| `src/shared/tenancy/esquema.ts` | Modificada | Las cuatro tablas y sus politicas |
| `drizzle/` | Nueva | Migracion con `FORCE`, politicas y `GRANT` |
| `scripts/bootstrap.sql` | Modificada | Tercer rol |
| `src/shared/tenancy/esquema.isolation.test.ts` | Modificada | Barrido de tres roles |
| `src/app/` | Nueva | Ruta de Better Auth y pantalla de acceso |

## Riesgos

| Riesgo | Prob. | Mitigacion |
|---|---|---|
| Una llamada de Better Auth corre fuera de `withTenant`: `findUserByEmail` sin filtro de tenant deja indefinido el duplicado de email entre municipios | Media | Riesgo primario. Un solo punto de construccion de la instancia; test de integracion con el mismo email y la misma contrasenia en dos municipios, en ambos sentidos |
| El costo de construir `betterAuth()` por request resulta alto | Media | Medirlo antes de cerrar el diseno; fallback a AsyncLocalStorage |
| `additionalFields` + `databaseHooks` no cubre todos los caminos de `verification` | Media | Spike punta a punta previo; fallback a repositorio propio |
| Tercer rol amplia la superficie de credenciales | Baja | `NOSUPERUSER NOBYPASSRLS`, un solo `GRANT`, cubierto por el test de esquema |

## Plan de rollback

El cambio es aditivo: no altera `ayuntamientos`, `bitacora` ni
`withTenant`. Revertir es revertir los PR mas una migracion de bajada que
elimina las cuatro tablas y sus politicas. El tercer rol se retira fuera
de migracion (`REVOKE` + `DROP ROLE`), igual que se creo.

En produccion con usuarios reales el rollback no es el `DROP`: es
desactivar la superficie de acceso y dejar el esquema en su lugar. Si el
spike falla, no hay nada que revertir: se cambia el mecanismo antes de
escribir esquema.

## Dependencias

- `better-auth@1.6.29` (instalada, sin uso todavia).
- `@node-rs/argon2` (nueva, ya justificada en `05-seguridad.md` §2).
- Postgres local (`pnpm db:local`) para la suite de integracion.

## Tamano frente al presupuesto de 400 lineas

**No entra.** La estimacion realista es de 1,000 a 1,500 lineas: solo el
esquema con sus cuatro migraciones y sus cuatro tests de aislamiento ya
consume el presupuesto entero. Fingir que cabe obliga a cortar tests de
aislamiento, que es exactamente lo que no se corta.

Cortes naturales, encadenados:

| PR | Contenido | Estimado |
|---|---|---|
| 0 | Spike y medicion (desechable, no entra a `main`) | — |
| 1 | Esquema, migracion, RLS y cuatro tests de aislamiento | ~380 |
| 2 | `shared/auth`: instancia por request, argon2id, sesion, test de sign-in cruzado | ~350 |
| 3 | Roles: regla pura en `domain`, verificacion en `application`, contexto de sesion | ~250 |
| 4 | Tercer rol Postgres, provision de municipios, test de esquema ampliado | ~200 |
| 5 | Rate limiting de login y pantalla de acceso | ~250 |

Cada PR arranca y termina solo, con su verificacion y su rollback.

## Criterios de exito

- [ ] El spike demuestra `ayuntamiento_id` correcto en las cuatro tablas
      por los flujos reales de alta y acceso.
- [ ] El costo de construir la instancia por request esta medido y
      registrado.
- [ ] Un usuario de Motul con la misma contrasenia que su homonimo de
      Ticul no autentica en Ticul, y falla con el mensaje generico.
- [ ] Las cuatro tablas pasan el test de esquema y su test de aislamiento.
- [ ] El test de esquema cubre los tres roles Postgres.
- [ ] Un caso de uso rechaza por rol con 403 sin convertir un 404 de
      tenant en 403.
- [ ] `pnpm test`, `pnpm test:integration` y `pnpm check` en verde.
