# Exploración — Autenticación y RBAC

**Cambio:** `auth-rbac`
**Fase:** exploración (no decide, mapea)
**Fecha:** 2026-08-16

---

## 1. Estado actual

`src/shared/tenancy/` está completo y probado: `withTenant` es el único acceso
a Postgres, con `set_config('app.tenant', ..., true)`; `esquema.ts` define
`ayuntamientos` y `bitacora`, ambas con `FORCE ROW LEVEL SECURITY`;
`contexto.ts` expone `ayuntamientoActual()` leyendo la cabecera que escribe
`proxy.ts`; `ayuntamientoId.ts` aporta el tipo marcado.

`better-auth@1.6.29` está en `package.json` y **nada lo importa todavía**.
`src/shared/auth/` no existe.

---

## 2. Restricciones duras, con fuente

| Restricción | Fuente |
|---|---|
| `ayuntamiento_id` efectivo sale siempre del contexto de servidor | invariante 1 |
| Toda tabla operativa: `ayuntamiento_id` + `FORCE RLS`, sin excepción por venir de una librería | invariante 1; ADR 0001 §1 |
| Recurso de otro tenant = 404, nunca 403 | invariante 1, escenario T3 |
| Al cambiar de municipio, el contexto anterior no persiste en ninguna capa | escenario T9 |
| `domain` no importa nada, ni siquiera `shared` | `estructura.md` §3 |
| Acceso a BD solo por `withTenant`; única excepción `resolverAyuntamientoPorSubdominio` | `AGENTS.md` regla 2 |
| Contraseñas: argon2id, mínimo 12 caracteres | `05-seguridad.md` §2 |
| Rate limiting obligatorio en login | `05-seguridad.md` §10 |

---

## 3. Hechos verificados contra Better Auth 1.6.29 instalado

Verificados leyendo `node_modules`, no documentación ni memoria del modelo.

1. **Opción del hasher:** `emailAndPassword.password: { hash?, verify? }`.
   Confirmado en `@better-auth/core/dist/types/init-options.d.mts:650-652`.
   El ADR pedía verificar esto antes de escribir código; queda verificado.
2. **El default es Scrypt**, no bcrypt (mismo archivo, línea 645).
3. **El hash NO vive en `user`:** vive en `account.password`, en la fila con
   `providerId: "credential"`. Confirmado en `api/routes/sign-up.mjs:236`.
4. **Tablas generadas:** `user`, `session`, `account`, `verification`. Más
   `rateLimit` solo si `rateLimit.storage === "database"`.
5. **`verification` no tiene `userId`.** Es una tabla de tokens sueltos, así
   que el tenant no se puede derivar por join.
6. **`email` está marcado `unique: true` hardcodeado** en
   `@better-auth/core/dist/db/get-tables.mjs:142`. El `fieldName` es
   configurable; el `unique` no.
7. **Pero el adaptador de Drizzle no genera DDL.** Verificado: cero
   ocurrencias de `CREATE TABLE`/`createTable`/`migrate` en
   `@better-auth/drizzle-adapter/dist/index.mjs`. Solo hace
   `select/insert/update/delete` contra el esquema que nosotros le pasamos.
   **La restricción real en Postgres la define nuestro `pgTable`.**

---

## 4. El hallazgo que cambia el ADR

El ADR 0001 §1 asumió que el mismo email en dos municipios son dos usuarios
distintos, y que eso se resuelve con RLS sobre la tabla de usuarios.

Eso sigue siendo cierto **a nivel de esquema**: podemos declarar
`uniqueIndex().on(ayuntamientoId, email)` en vez de `unique()` global, porque
la restricción es nuestra.

Lo que el ADR no anticipó es que **el chequeo de duplicado es lógica de
aplicación de la librería**: `sign-up.mjs:166` hace
`internalAdapter.findUserByEmail(normalizedEmail)` — un SELECT por email sin
filtro de tenant en el código de Better Auth.

Eso funciona correctamente para nuestro modelo **solo si esa consulta corre
dentro de una transacción con `app.tenant` fijado**. Ahí RLS filtra
transparentemente y la librería solo ve las filas de su municipio.

Si alguna vez corre por una conexión sin tenant, el comportamiento con emails
duplicados entre municipios queda indefinido.

**Consecuencia:** toda llamada a Better Auth tiene que correr dentro de
`withTenant`. No es una recomendación, es la condición de corrección.

---

## 5. Opciones para enhebrar el tenant

`runWithTransaction()` envuelve cada endpoint en `adapter.transaction(cb)`.
Para Drizzle eso solo abre transacción real si `config.transaction: true`, y
esa transacción no es `withTenant`: no fija `app.tenant`. Better Auth está
diseñado para un `db` ambiente único, no para uno por request y por tenant.

| Opción | Descripción | Contra |
|---|---|---|
| **A. Instancia por request** | Resolver `ayuntamientoActual()` en la ruta y construir `betterAuth({...})` por invocación, con un `db` cuyo `.transaction()` delega en `withTenant` | Costo de reconstruir la config en cada request, sin medir |
| **B. Wrapper con AsyncLocalStorage** | Una sola instancia; el `db` lee el tenant de un ALS poblado antes | Dos mecanismos de contexto async conviviendo |
| **C. Better Auth solo para hashing** | Repositorio propio para las tablas, siempre por `withTenant` | Pierde el valor de adoptar la librería; contradice el ADR |

---

## 6. Otras preguntas

**Tablas bajo RLS.** Las cuatro llevan tenant vía `additionalFields`, poblado
por `databaseHooks.<model>.create.before` — nunca por input del cliente. Las
cuatro necesitan `FORCE RLS`, política, `GRANT` y su test de aislamiento. El
test de esquema existente barre por columna, así que las cubre en cuanto
existan, sin tocarlo.

**Cookies entre subdominios.** Por subdominio (el default, sin
`crossSubDomainCookies`) refuerza T9: el navegador ni siquiera manda la cookie
de Motul a Ticul. Wildcard sobre el dominio padre daría "un solo login" pero
contradice el modelo de datos y amplía la superficie.

**404 vs 403.** No colisionan. RLS convierte "recurso de otro tenant" en
inexistente antes de que corra cualquier chequeo de rol. Un 403 solo aparece
sobre un recurso del propio municipio que el rol no puede tocar, y ahí no
revela nada que el usuario no supiera.

**Dónde vive la autorización.** La regla pura ("¿este rol puede exportar el
padrón?") es dominio, función sin IO. Obtener el rol actual es
infraestructura, sale de la sesión, y la consumen `application` y `ui`, nunca
`domain`.

---

## 7. Riesgos

1. **El grave:** cualquier llamada interna de Better Auth que corra fuera de
   una transacción con tenant fijado rompe el aislamiento en el propio flujo
   de autenticación. No es hipotético: es consecuencia directa de que el
   chequeo de duplicado sea lógica de aplicación.
2. El costo de instanciar `betterAuth()` por request no está medido.
3. `verification` sin `userId` hace que inyectar el tenant dependa del hook,
   en todos los flujos.
4. `additionalFields` + `databaseHooks` como mecanismo de multi-tenancy por
   fila es composición de piezas soportadas, no un patrón documentado por
   Better Auth para este uso. Conviene una prueba de punta a punta antes de
   comprometerse en diseño.

---

## 8. Decisiones que debe tomar una persona

1. Estrategia para enhebrar el tenant (A, B o C de la sección 5).
2. Rol de SUPER_ADMIN en Postgres: tercer rol, o tabla `super_admins` con
   excepción documentada. El ADR difirió esto explícitamente a esta fase.
3. Alcance de la cookie de sesión — es también decisión de producto: si una
   persona puede operar en dos municipios con un solo ingreso.
4. Aceptar el riesgo de `additionalFields` + `databaseHooks`, o mover las
   tablas a repositorio propio y dejar Better Auth solo para credenciales.

---

## 9. Decisiones ya tomadas

Better Auth + adaptador Drizzle, solo email y contraseña; argon2id vía
`@node-rs/argon2` reemplazando Scrypt; cuatro roles; mismo email en dos
municipios son dos usuarios; todo acceso a base por `withTenant`.
