# Diseno tecnico: Autenticacion y RBAC

**Cambio:** `auth-rbac` · **Base:** `proposal.md`, `exploration.md`
**Espejo:** Engram `sdd/auth-rbac/design`

---

## 1. Enfoque

La restriccion que gobierna todo el diseno es una sola: `sign-up.mjs:166`
llama `internalAdapter.findUserByEmail(normalizedEmail)`, un SELECT por
correo sin filtro de tenant en el codigo de la libreria. Ese SELECT es
correcto para nuestro modelo unicamente adentro de una transaccion con
`app.tenant` fijado.

De ahi sale la forma del diseno: no alcanza con que las llamadas pasen por
`withTenant`; tiene que ser **imposible** que alguna no pase. Se sostiene
con tres capas, ninguna de las cuales es un comentario.

| Capa | Mecanismo | Que pasa si alguien la esquiva |
|---|---|---|
| Compilacion / build | Regla de dependency-cruiser: `better-auth` y `@node-rs/argon2` solo se importan desde `src/shared/auth/`. | `pnpm layers` falla. No entra a `main`. |
| Modulo | La bd guardada y la fabrica son constantes privadas de `instancia.ts`. La unica exportacion es `autenticacionDelRequest()`, que **no recibe** `ayuntamientoId`: lo resuelve con `ayuntamientoActual()`. | No hay identificador que exportar: no existe otra puerta. Mismo criterio que la `const bd` de `withTenant.ts`. |
| Ejecucion | La bd que recibe `drizzleAdapter` implementa **solo** `.transaction()`, que delega en `withTenant`. Todo otro acceso (`select`, `insert`, `update`, `delete`, `execute`, `query`) lanza `AccesoSinTenantError`. | Falla ruidoso y en el acto. Nunca una consulta silenciosa sin tenant. |

La tercera capa es la que importa y esta verificada contra el adaptador
instalado: con `transaction: true`, `adapter.transaction` delega en
`db.transaction` y reconstruye el adaptador sobre el `tx`
(`@better-auth/drizzle-adapter/dist/index.mjs:578`). Fuera de transaccion
el adaptador usa `db` directo (lineas 514, 555). Esas son exactamente las
rutas de escape, y contra la bd guardada revientan en vez de filtrar.

```ts
// instancia.ts — privado al modulo
const bdGuardada = (ayuntamientoId: AyuntamientoId) =>
  new Proxy({} as BdDeAuth, {
    get(_, prop) {
      if (prop === "transaction") {
        return (cb: (tx: TransaccionTenant) => Promise<unknown>) =>
          withTenant(ayuntamientoId, cb);
      }
      throw new AccesoSinTenantError(String(prop));
    },
  });

// unica exportacion del archivo
export async function autenticacionDelRequest() {
  const { id } = await ayuntamientoActual(); // contexto de servidor, no parametro
  return betterAuth({ database: drizzleAdapter(bdGuardada(id), { ... }) });
}
```

---

## 2. Precondicion: el spike (PR 0, desechable)

El mecanismo `additionalFields` + `databaseHooks` esta aceptado **de forma
condicional**. El diseno no asume que pase.

Verificado hoy en la libreria instalada, y por eso el spike es viable: los
cuatro modelos (`user`, `session`, `account`, `verification`) aceptan
`additionalFields` (`init-options.d.mts:730, 797, 925, 1065`) y tienen
`databaseHooks.<modelo>.create.before` (lineas 1135, 1179, 1226, 1273). Lo
que **no** esta probado es que el hook se dispare en todos los caminos
reales, en particular los internos con `context: null`.

### Que cablea

Rama desechable con: las cuatro tablas en una migracion de scratch, la bd
guardada, `additionalFields: { ayuntamientoId }` en los cuatro modelos, los
cuatro `create.before`, el hasher argon2id, y las rutas HTTP reales de
Better Auth invocadas por `auth.handler(request)` — nunca el adaptador a
mano. Dos municipios sembrados con `municipiosDePrueba`.

Para forzar escritura en `verification`, el spike **habilita a proposito**
`emailVerification` aunque el alcance del cambio no la use: es la unica
forma de ejercitar la tabla que no tiene `userId` y cuyo tenant, por lo
tanto, no se puede derivar por join.

### Criterios de aprobacion — los cinco, o falla

1. **Las cuatro tablas, por flujo real.** Tras alta y acceso en Motul, cada
   fila creada en `usuarios`, `sesiones`, `cuentas` y `verificaciones` se ve
   bajo `withTenant(motul)` y **no** se ve bajo `withTenant(ticul)`. El
   conteo por tenant iguala lo esperado en cada tabla.
2. **`verification`, explicito.** Un token emitido en Motul es invisible
   desde Ticul y su consumo desde Ticul falla. Es el criterio duro.
3. **El guardia es estructural, no incidental.** Con el hook removido a
   proposito, el alta **falla** con violacion de `NOT NULL`. Si en vez de
   fallar escribe la fila, el mecanismo no es de fiar y el spike se declara
   fallado aunque los otros criterios pasen.
4. **Cero escapes.** Ninguna invocacion levanta `AccesoSinTenantError` en
   los flujos de alta, acceso, cierre de sesion y refresco.
5. **Correo repetido entre municipios.** Mismo correo y misma contrasenia
   dan de alta en ambos; el acceso en cada uno devuelve su propio usuario; el
   cruzado falla.

### Medicion del costo por request

En la misma rama: `performance.now()` alrededor de `autenticacionDelRequest()`,
1000 iteraciones tras 100 de calentamiento, y p50/p95 tambien sobre el
request completo de acceso.

| Resultado | Que sigue |
|---|---|
| p95 de construccion <= 5 ms | Sigue el diseno tal cual. El numero queda registrado en el ADR. |
| p95 > 5 ms | **Vuelve a decision humana con el numero medido.** AsyncLocalStorage NO esta preaprobado: mete un segundo mecanismo de contexto asincronico conviviendo con el actual, y eso se decide viendo el dato. |

### Diseno de repliegue si el spike falla

Es una decision, no un rediseño. Si falla cualquiera de los cinco
criterios, Better Auth queda reducido a validacion y hasheo de credenciales
y sale del camino de datos:

| Pieza | Con Better Auth | En el repliegue |
|---|---|---|
| Tablas | `usuarios`, `sesiones`, `cuentas`, `verificaciones` | `usuarios` (con `hashContrasenia`) y `sesiones`. Dos, no cuatro. |
| Escritura | Adaptador de Drizzle + hooks | Repositorio propio en `shared/auth/`, siempre por `withTenant` |
| Sesion | Handler de la libreria | Token aleatorio de 32 bytes; se guarda `sha256(token)`, nunca el token. Cookie por subdominio, `HttpOnly`, `Secure`, `SameSite=Lax`. |
| Contrasenia | `emailAndPassword.password: { hash, verify }` | El mismo `contrasenia.ts`, invocado directo |
| Rutas | `/api/auth/[...all]` | Server Actions propias de acceso y cierre |

Lo que se pierde, aceptado por adelantado: los endpoints de la libreria y
su camino a 2FA u OAuth. Lo que se gana: cero codigo ajeno tocando la base.
Costo neto en lineas: PR 1 baja (dos tablas), PR 2 sube (~150). El spike
ocurre **antes** de escribir esquema, asi que si falla no hay nada que
revertir.

---

## 3. Decisiones de arquitectura

### D1 — Donde vive la autorizacion

`domain` no importa nada, ni `shared`. La regla se parte en dos y cada
mitad queda de su lado:

| Pieza | Donde | Por que |
|---|---|---|
| Regla pura (`puedeRestablecerContrasenia(rolActor, rolObjetivo)`) | `shared/auth/roles.ts` para las reglas de plataforma; en `modules/<mod>/domain/` para las reglas de cada modulo, sobre su propia union copiada | Sin IO, testeable en milisegundos |
| Obtener el rol actual | `shared/auth/sesion.ts` | Sale de la sesion: es infraestructura |
| Verificar | Caso de uso en `application` | `05-seguridad.md §6`: ocultar un boton no es autorizacion |

Consecuencia explicita, para que nadie la resuelva mal despues: cuando
`padron` necesite "¿este rol puede exportar el padron?", **no importa
`shared/auth`**. Declara la union de roles en su propio `domain` y la
duplica. Es lo que manda `estructura.md §3`: cuatro lineas duplicadas
cuestan menos que perder la pureza de la capa.

`contextoActual()` en `shared/auth/index.ts` compone `ayuntamientoActual()`
y `sesionActual()` y devuelve `{ ayuntamientoId, usuario: { id, rol } }`.
Es el `getTenantContext()` que nombran los documentos; el nombre real es
este.

### D2 — Las tablas viven en `shared/auth/esquema.ts`

`tenancy/esquema.ts` tiene 123 lineas y el limite del proyecto son 200:
cinco tablas con sus politicas no entran. Ademas las tablas de auth son de
auth. Se modifica `tenancy/esquema.ts` en una sola linea: **exportar
`tenantActual`**. Duplicar ese fragmento seria duplicar la sutileza del
`NULLIF`, que es exactamente lo que no puede divergir.

La direccion es `auth → tenancy` y nunca al reves: la regla `sin-ciclos` de
dependency-cruiser lo sostiene. `drizzle.config.ts` ya barre
`./src/shared/**/esquema.ts`, asi que no se toca.

### D3 — Nombres de tabla en español, campos de la libreria en ingles

`modelName` mapea a `usuarios`, `sesiones`, `cuentas`, `verificaciones`.
Ademas de seguir la nomenclatura, evita `"user"`, que es palabra reservada
en Postgres y obliga a citarla siempre.

Los **campos** de la libreria (`userId`, `expiresAt`, `providerId`) se
dejan como vienen. Un `fields:` que los tradujera seria un mapa mas donde
un desajuste falla en runtime y en silencio. Nuestras columnas agregadas si
van en español: `ayuntamientoId`, `rol`, `bajaEn`.

`advanced.database.generateId: "uuid"` — verificado en
`init-options.d.mts:312`, en Postgres usa `gen_random_uuid()`. Importa: sin
esto los ids serian `text` y `bitacora.actor`, que es `uuid`, dejaria de
poder referenciarlos.

### D4 — Unicidad compuesta y baja logica

`uniqueIndex().on(ayuntamientoId, email)`, no `unique()` global. El
adaptador de Drizzle **no emite DDL** (verificado: cero `CREATE TABLE` en
su bundle), asi que el `unique: true` hardcodeado de `get-tables.mjs:142`
no llega a Postgres. La restriccion real es la nuestra.

`bajaEn timestamptz` vive en `usuarios`, no en `cuentas`: se da de baja a
una persona, no a una credencial. Nunca `DELETE` — la tabla no tiene ese
`GRANT`, asi que el borrado no se puede olvidar de prohibir. Sus
constancias emitidas conservan quien las firmo.

Un usuario dado de baja no autentica: `databaseHooks.session.create.before`
rechaza si `bajaEn` no es nulo. Los cuatro rechazos —correo inexistente,
contrasenia incorrecta, usuario dado de baja, usuario de otro municipio—
se mapean al **mismo** codigo `CREDENCIALES_INVALIDAS` y al mismo texto.

### D5 — argon2id

```ts
// shared/auth/contrasenia.ts
import { hash, verify } from "@node-rs/argon2";
export const contrasenia = {
  hash: (clave: string) => hash(clave, { algorithm: Algorithm.Argon2id }),
  verify: ({ hash: digest, password }) => verify(digest, password),
};
```

Se pasa a `emailAndPassword.password` (opcion confirmada en
`init-options.d.mts:650-652`), reemplazando Scrypt. Minimo 12 caracteres,
validado con Zod en el borde. El mismo modulo es el que sobrevive intacto
en el repliegue.

### D6 — Limitacion de ritmo

No se usa el limitador de Better Auth. Dos razones: su almacen en memoria
muere con la instancia, y construimos una por request; y su almacen en base
crearia una tabla `rateLimit` sin `ayuntamiento_id`, es decir fuera de todo
el regimen RLS del proyecto.

Limitador propio en el borde de la ruta, antes de construir la instancia,
sobre la tabla `intentos_acceso`: bajo el tenant, con RLS, politica, GRANT
y su test de aislamiento como cualquier otra.

- Se guarda `sha256(valor + pimienta)`, nunca el correo ni la IP en claro.
- Ventana corrediza: 5 intentos por correo y 20 por IP cada 15 minutos.
- **No existe columna `bloqueadoHasta`.** Decision 8: solo ritmo, nunca
  bloqueo persistente. Sin la columna, el bloqueo no se puede introducir
  por configuracion.
- Solo se aplica a la ruta de acceso, no al resto del catch-all.

### D7 — Tercer rol Postgres y autoridad del alta

`xula_super_admin`, `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
NOINHERIT`, creado en `scripts/bootstrap.sql` con el mismo bloque `DO $$`
idempotente que los otros dos y su propia `:'clave_super_admin'`. Nueva
variable de entorno `SUPER_ADMIN_DATABASE_URL`.

Su conexion es una **segunda constante privada de modulo**, en
`shared/tenancy/provision.ts`, con una unica puerta que hace todo el alta
en una transaccion:

```ts
export async function withAltaDeAyuntamiento<T>(
  datos: { subdominio: string; nombre: string },
  trabajo: (tx: TransaccionTenant, id: AyuntamientoId) => Promise<T>,
): Promise<T>;
// INSERT en ayuntamientos -> set_config('app.tenant', nuevoId, true) -> trabajo
```

El primer `ADMIN_MUNICIPAL` y la traza en bitacora se crean adentro de
`trabajo`, en la misma transaccion. Un municipio sin nadie que pueda entrar
no puede existir ni por fallo parcial.

Lo que hace fuerte esta parte es que **la decision 6 se enforza en
Postgres, no en el caso de uso**:

```sql
CREATE POLICY "usuarios_alta_admin" ON "usuarios" FOR INSERT
  TO "xula_super_admin"
  WITH CHECK (ayuntamiento_id = <tenantActual> AND rol = 'ADMIN_MUNICIPAL');

CREATE POLICY "cuentas_restablece_admin" ON "cuentas" FOR UPDATE
  TO "xula_super_admin"
  USING (ayuntamiento_id = <tenantActual> AND EXISTS (
    SELECT 1 FROM usuarios u
     WHERE u.id = cuentas.user_id AND u.rol = 'ADMIN_MUNICIPAL'))
  WITH CHECK (ayuntamiento_id = <tenantActual>);
```

El SUPER_ADMIN no es llave maestra: no puede crear un `OPERADOR`, no puede
restablecer la contrasenia de nadie que no sea el `ADMIN_MUNICIPAL`, y no
tiene `SELECT` sobre ninguna tabla operativa. El `SELECT` sobre `usuarios`
es por columna —`GRANT SELECT (id, ayuntamiento_id, rol, email)`— porque la
subconsulta lo exige y no hace falta nada mas.

`ayuntamientos_provision` (la excepcion de `xula_migrator`) se conserva:
`municipiosDePrueba.sembrar` la usa.

### D8 — El test de esquema, ampliado sin dejar puerta

Hoy afirma sobre `('xula_app', 'xula_migrator')`. Una lista de tres a mano
deja escapar al cuarto rol el dia que exista. El barrido pasa a ser por
patron:

```sql
SELECT rolname, rolsuper, rolbypassrls
  FROM pg_roles WHERE rolname LIKE 'xula\_%' ORDER BY rolname
```

Se afirman dos cosas: que el conjunto es exactamente los tres esperados
—un `xula_*` nuevo rompe el test hasta que alguien lo agregue a
proposito— y que ninguno tiene `rolsuper` ni `rolbypassrls`.

Se agrega un tercer assert: los privilegios de tabla de
`xula_super_admin` son exactamente el conjunto esperado, leidos de
`information_schema.role_table_grants`. Sin eso, un `GRANT` de mas entra
sin que nada se ponga en rojo.

---

## 4. Flujo de datos

```
Navegador  motul.xulasigma.mx/api/auth/sign-in/email
    |
proxy.ts            borra cabeceras entrantes, escribe x-xula-subdominio
    |
route.ts            limitarRitmo()  -> withTenant -> intentos_acceso
    |               autenticacionDelRequest()
    |                   ayuntamientoActual()  -> subdominio -> AyuntamientoId
    |                   betterAuth({ database: drizzleAdapter(bdGuardada(id)) })
    |
auth.handler(request)
    |
adapter.transaction  ->  bdGuardada.transaction  ->  withTenant(id)
    |                                                   set_config('app.tenant', id, true)
    |
findUserByEmail  /  create user  /  create session
    |                                RLS filtra: la libreria solo ve su municipio
    v
Cookie por subdominio (sin crossSubDomainCookies) — no viaja a ticul
```

Cualquier acceso que no pase por la flecha del medio choca con
`AccesoSinTenantError`.

---

## 5. Archivos

| Archivo | Accion | Que hace |
|---|---|---|
| `src/shared/auth/index.ts` | Crear | Superficie publica: `contextoActual`, `sesionActual`, `ROLES`, reglas puras. No exporta la fabrica. |
| `src/shared/auth/instancia.ts` | Crear | Punto unico de construccion. Bd guardada y fabrica privadas; exporta `autenticacionDelRequest()`. |
| `src/shared/auth/esquema.ts` | Crear | Las cinco tablas, indices, politicas |
| `src/shared/auth/roles.ts` (+`.test.ts`) | Crear | `ROLES`, `Rol`, reglas puras sin IO |
| `src/shared/auth/contrasenia.ts` (+`.test.ts`) | Crear | argon2id |
| `src/shared/auth/sesion.ts` | Crear | Lee la sesion del request |
| `src/shared/auth/ritmo.ts` | Crear | Ventana corrediza sobre `intentos_acceso` |
| `src/shared/auth/*.isolation.test.ts` | Crear | Uno por tabla: cinco |
| `src/shared/auth/accesoCruzado.integration.test.ts` | Crear | Mismo correo y contrasenia en dos municipios, en ambos sentidos |
| `src/shared/tenancy/esquema.ts` | Modificar | Exportar `tenantActual` |
| `src/shared/tenancy/provision.ts` | Crear | Segunda conexion privada; `withAltaDeAyuntamiento` |
| `src/shared/tenancy/index.ts` | Modificar | Exportar la segunda puerta y documentar por que no es una excepcion |
| `src/shared/tenancy/esquema.isolation.test.ts` | Modificar | Barrido `xula\_%` + privilegios del tercer rol |
| `src/app/api/auth/[...all]/route.ts` | Crear | Ritmo y delegacion al handler |
| `src/app/(acceso)/acceso/page.tsx` | Crear | Pantalla de acceso (RSC + form) |
| `drizzle/0001_auth.sql` | Crear | Cinco tablas, `FORCE`, politicas y `GRANT` en un solo archivo (ADR 0001 §2) |
| `scripts/bootstrap.sql` | Modificar | Tercer rol |
| `.dependency-cruiser.cjs` | Modificar | `better-auth` y `@node-rs/argon2` solo desde `shared/auth` |
| `AGENTS.md`, `docs/adr/0001` | Modificar | Segunda puerta de tenancy; cierre del pendiente "Rol del panel SUPER_ADMIN" |

## 6. Esquema

Las cinco llevan `ayuntamientoId uuid NOT NULL REFERENCES ayuntamientos(id)`,
`ENABLE` + `FORCE ROW LEVEL SECURITY`, politica `FOR ALL TO xula_app` con
`USING` y `WITH CHECK` sobre `tenantActual`, y su test de aislamiento.

| Tabla | Columnas propias | GRANT a `xula_app` |
|---|---|---|
| `usuarios` | Better Auth (`id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`) + `rol text NOT NULL`, `bajaEn timestamptz` | SELECT, INSERT, UPDATE. **Sin DELETE**: baja logica |
| `sesiones` | `id`, `token` (unico), `expiresAt`, `ipAddress`, `userAgent`, `userId`, fechas | SELECT, INSERT, UPDATE, DELETE |
| `cuentas` | `id`, `accountId`, `providerId`, `userId`, `password`, fechas | SELECT, INSERT, UPDATE |
| `verificaciones` | `id`, `identifier`, `value`, `expiresAt`, fechas | SELECT, INSERT, UPDATE, DELETE (el adaptador consume por borrado) |
| `intentos_acceso` | `id`, `clave text` (sha256), `tipo text` (`correo`\|`ip`), `ocurridoEn` | SELECT, INSERT, DELETE |

Indices: `uniqueIndex(ayuntamientoId, email)` en `usuarios`;
`(ayuntamientoId, clave, ocurridoEn)` en `intentos_acceso`;
`(ayuntamientoId, identifier)` en `verificaciones`.

## 7. Pruebas

| Capa | Que | Como |
|---|---|---|
| Unit | Reglas de rol, longitud minima de contrasenia, ventana de ritmo | Vitest, sin IO |
| Aislamiento | Cinco tablas, forma canonica de `invariantes-criticos.md` Capa 2 | Postgres real, `withTenant`, consulta deliberadamente sin filtro |
| Esquema | RLS+FORCE, politicas huerfanas, tres roles `xula_*`, privilegios del tercero | Rol owner contra `pg_class`, `pg_roles`, `role_table_grants` |
| Integracion | Alta y acceso por `auth.handler`; correo repetido entre municipios en ambos sentidos; los cuatro rechazos con el mismo codigo; baja logica; alta de municipio con su primer admin en una transaccion | `pnpm test:integration`, sin `rtk` (ADR 0001 §8) |
| E2E | Sesion en dos municipios en paralelo; la cookie de Motul no llega a Ticul | Playwright |

Un test que no se pone en rojo al romper la implementacion no cuenta. En
particular, el de aislamiento se corre una vez con la politica quitada a
mano para confirmar que falla.

## 8. Matriz de amenazas

`N/A` en las cinco filas de la matriz de referencia: el cambio no toca
comandos de shell, subprocesos, seleccion de repositorio git, estado de
commit/push, ni automatizacion de PR. Es routing HTTP y base de datos.

Los escenarios adversarios que si aplican ya son los invariantes del
proyecto y estan cubiertos arriba: T1 (consulta sin filtro), T2 (conexion
reciclada del pooler), T3 (404 y no 403), T4 (tabla nueva sin RLS), T9
(cookie por subdominio).

## 9. Despliegue y rollback

Aditivo: no altera `ayuntamientos`, `bitacora` ni `withTenant`. Orden:
`scripts/bootstrap.sql` (una vez por entorno, con el superusuario) antes de
`drizzle-kit migrate` en el Pre-deploy, porque las politicas nombran a
`xula_super_admin` y un rol inexistente hace fallar el `CREATE POLICY`.

| Momento | Como se revierte |
|---|---|
| El spike falla | No hay nada que revertir: se cambia el mecanismo antes de escribir esquema |
| Antes de usuarios reales | Revertir los PR + migracion de bajada que borra las cinco tablas y sus politicas. El tercer rol se retira fuera de migracion: `REVOKE ... ; DROP ROLE xula_super_admin`, igual que se creo |
| Con usuarios reales | El rollback **no** es el DROP. Se desactiva la superficie de acceso y el esquema se deja en su lugar. Borrar `usuarios` borra la identidad de quien firmo documentos oficiales |

## 10. Preguntas abiertas

- [x] **Donde vive la identidad del SUPER_ADMIN — RESUELTO 2026-08-16.**
      Se eligio el **ayuntamiento reservado de plataforma**: el SUPER_ADMIN
      reusa las cuatro tablas de autenticacion y queda sujeto al mismo RLS,
      al mismo `withTenant` y a los mismos tests de aislamiento que
      cualquier usuario municipal.
      La alternativa (tabla propia, que era lo que decia el ADR 0001 §1)
      obligaba a un segundo mecanismo de sesion completo para dar un
      servicio que el existente ya da. Dos caminos de autenticacion en un
      sistema cuyo modo de falla grave es el cruce entre municipios es
      duplicacion cara: el segundo no hereda las defensas del primero.
      **El ADR 0001 §1 quedo corregido con esta decision y su motivo.**

      Obligaciones que arrastra, y entran al alcance:
      - La fila reservada **no es un municipio**: el directorio publico
        tiene que excluirla. Si `resolverAyuntamientoPorSubdominio` la
        devolviera, la plataforma apareceria como un ayuntamiento mas.
        Esto necesita su propio test.
      - Su alta no pasa por el flujo normal de provision de municipios.
- [ ] Numero real de p95 de construccion por request. Sale del spike y
      define si el diseño sigue o vuelve a decision humana.
- [ ] Retencion de `intentos_acceso`: purga en cada escritura o tarea
      periodica. Se decide con el volumen real, no antes.
