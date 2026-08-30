# Reglas de revisión — XULA SIGMA

Archivo de reglas para revisión automatizada de código. Condensado a
propósito. La versión completa vive en `docs/`.

**Contexto:** SaaS multi-tenant para ayuntamientos de Yucatán. Varios
municipios en una sola base de datos, aislados por `ayuntamiento_id` y RLS.
El código lo escribe una IA. Esta revisión es el control que reemplaza a la
lectura humana del diff.

**El modo de falla grave no es un bug visible: es que los datos de un
municipio se vean desde otro y nadie se entere.** Ante la duda en algo que
toca datos, marcá el hallazgo.

---

## Las 12 reglas que nadie rompe

1. `any` está prohibido. Se usa `unknown` + type guard.
2. **En `src/`**, todo acceso a base de datos pasa por `withTenant`. Hay
   **tres** excepciones sancionadas, las tres en `shared/tenancy`, y
   ninguna más:

   - `resolverAyuntamientoPorSubdominio`: resuelve el tenant antes de que
     exista uno, lee solo el directorio público de `ayuntamientos` y su
     garantía la da RLS, no la función.
   - `withAltaDeAyuntamiento` (`provision.ts`): da de alta un municipio,
     cuando el tenant todavía no existe porque se está creando. Corre bajo
     un **tercer rol de Postgres**, `xula_super_admin`, con su propio
     conjunto de políticas: no puede crear a nadie que no sea
     `ADMIN_MUNICIPAL`, no puede crear una segunda fila de plataforma, y de
     `usuarios` solo lee cuatro columnas del `ADMIN_MUNICIPAL` de su tenant.
     Ver ADR 0001 §2 y diseño D7.

   - `exigirRolSinPrivilegios` (`withTenant.ts`): pregunta con qué rol
     está conectada la aplicación. **Entró el 2026-08-21 por este mismo
     mecanismo**, que es el que la regla exige antes de abrir una salida
     nueva.

     Se nombra aparte porque no es de la misma clase que las otras dos: no
     lee una tabla del esquema sino `pg_roles`, el catálogo del sistema, y
     no devuelve datos sino un veredicto. No tiene tenant que poner porque
     corre antes de que exista uno —es, justamente, la afirmación de que
     va a haber filtrado— y ponerle uno sería circular. Su única salida es
     negarse: con `SUPERUSER` o `BYPASSRLS`, el proceso no sirve un
     request. Ver `rolDeAplicacion.ts` y ADR 0001 §2.

   **Ningún comentario de `src/shared/tenancy` cuenta ni enumera estas
   salidas.** Cada función explica la suya en su archivo; la lista es esta y
   solo esta. La regla existe porque esa lista llegó a estar copiada en seis
   comentarios del módulo y las seis quedaron viejas: cada vez que entró una
   salida nueva, ninguna copia falló, porque un comentario no tiene CI. Un
   comentario de ese módulo que diga "la única", "la segunda" o "y la
   última" es hallazgo **aunque el número esté bien hoy** — lo que no se
   escribe es el número, no el número equivocado.

   Las tres comparten forma: conexión privada del módulo, una sola salida, y
   el límite lo pone Postgres y no la función. Cualquier otro acceso sin
   tenant desde `src/` es hallazgo, incluido uno nuevo que invoque este
   precedente —que ya se usó tres veces y no se usa una cuarta sin
   actualizar esta regla.

   **`scripts/*.sql` es otra categoría y siempre lo fue.** Son actos de
   operación: los corre una persona con `psql` y credenciales del entorno,
   no hay proceso que los invoque y no son superficie alcanzable desde la
   aplicación. La regla de las dos puertas no los gobierna porque no son
   una puerta: nadie los cruza sin acceso a la base, y quien ya tiene ese
   acceso no necesita el script.

   Lo que sí los gobierna, y es hallazgo si falta:

   - Corren con el rol de **menor** privilegio que alcance, nunca con el
     superusuario ni con el owner salvo que la tarea lo exija.
   - El límite lo siguen poniendo las políticas, no el script: si RLS lo
     dejara hacer de más, el script está mal aunque hoy no lo haga.
   - Un `UPDATE` o `DELETE` frenado por RLS devuelve **cero filas sin
     error**. Todo script que escriba cuenta las filas afectadas y falla si
     no son las esperadas.
   - Ningún secreto adentro: contraseñas y hashes entran por `-v`.

   Los cuatro que existen: `bootstrap.sql` (roles, con el superusuario del
   proveedor), `plataforma.sql` y `plataforma-admin.sql` (siembra del
   ayuntamiento reservado) y `restablecer-admin.sql` (destraba a un
   `ADMIN_MUNICIPAL`, decisión de la tarea 4.16 de `auth-rbac`).

   **El andamiaje de los tests de aislamiento es una tercera categoría.**
   `*DePrueba.ts` y `*.isolation.test.ts` viven dentro de `src/` y abren
   conexión propia. No sirven ningún request, y la conexión cruda es
   justamente lo que prueban: `municipiosDePrueba.ts` expone `owner` —un rol
   que `xula_app` no tiene— y `appSinTenant`, cuyo único propósito es
   comprobar que una consulta sin tenant fijado no ve nada. Pedirle que pase
   por `withTenant` sería pedirle que pruebe RLS a través de lo que está
   probando. `esquema.isolation.test.ts` le pregunta a Postgres por el
   esquema real por la misma razón.

   Los que hoy abren conexión son `municipiosDePrueba.ts`,
   `superAdminDePrueba.ts` y `esquema.isolation.test.ts`, pero `pnpm reglas`
   reconoce la categoría por el nombre y no por una lista: un ayudante nuevo
   no debe obligar a editar el verificador. Es la diferencia con las salidas de producción, que sí se
   enumeran, y el motivo es el que separa a las dos categorías: una salida de
   producción es superficie alcanzable desde la aplicación y el andamiaje de
   tests no existe fuera de `pnpm test`.
3. `SET LOCAL` dentro de transacción. Nunca `SET` suelto.
4. `ayuntamiento_id` sale del contexto del servidor, nunca del cliente.
5. Tabla nueva = RLS + test de aislamiento, en el mismo commit.
6. `domain` no importa nada. Ni Drizzle, ni Next, ni React.
7. Folio consecutivo por ayuntamiento, con lock en transacción.
8. Recurso de otro tenant devuelve 404, nunca 403.
9. Dato sensible = categoría cerrada. Jamás texto libre.
10. Assets a object storage. El filesystem del contenedor es efímero.
11. El test se escribe antes que el código.
12. El diff se lee completo antes de aceptar.

---

## Antipatrones que bloquean

| # | Antipatrón | Alternativa |
|---|---|---|
| 1 | `any` | `unknown` + type guard |
| 2 | Conexión a base de datos sin `withTenant` | Siempre por `shared/tenancy` |
| 3 | `SET` en vez de `SET LOCAL` | `SET LOCAL` dentro de transacción |
| 4 | `ayuntamiento_id` recibido del cliente | Del contexto de sesión del servidor |
| 5 | Tabla nueva sin RLS | Política RLS + test de aislamiento |
| 6 | `domain/` importando Drizzle, Next o React | Puertos e inversión de dependencias |
| 7 | SQL en el caso de uso | Repositorio |
| 8 | Importar `modules/x/domain` desde otro módulo | Puerto propio + adaptador |
| 9 | Secuencia de base de datos para folios | Contador por tenant con lock |
| 10 | 403 al pedir recurso de otro tenant | 404 |
| 11 | Texto libre donde puede ir dato sensible | Categoría cerrada tipada |
| 12 | Asset subido al filesystem del contenedor | Object storage |
| 13 | Colores de marca aplicados en cliente | Inyección en servidor |
| 14 | `try/catch` que traga el error | Manejo específico o re-throw |
| 15 | Más de 3 niveles de anidación | Early returns |
| 16 | Nombres vagos: `data`, `temp`, `info` | Nombre del concepto |
| 17 | Comentario que reformula el código | Borrarlo |
| 18 | `"use client"` por defecto | Server Component salvo justificación |
| 19 | Entrada sin validar con Zod | Esquema Zod en el borde |
| 20 | Acentos o eñes en identificadores | Sin diacríticos |
| 21 | Módulo creado con capas incompletas | Las cuatro capas desde el inicio |
| 22 | Dependencia nueva sin justificar | Justificar en el PR |
| 23 | La misma explicación en dos archivos | Dejarla en uno, el resto apunta |
| 24 | Comentario que afirma comportamiento sin test | Escribir el test |
| 25 | Cita a línea de un paquete sin la versión | `archivo:línea` + versión |

---

## Revisión de migraciones SQL

Toda migración que crea una tabla hace **cuatro** cosas. Falta una, es
hallazgo:

1. Columna `ayuntamiento_id`
2. `ENABLE` + `FORCE ROW LEVEL SECURITY`
3. Política de tenant
4. `GRANT` al rol de aplicación

Falta el `GRANT` y falla ruidosamente en el primer request. **Falta el RLS
y no falla nunca** — hasta que hay un segundo municipio en producción.

Marcá también: `BYPASSRLS` en cualquier rol, y el rol de aplicación como
owner de una tabla.

### La única excepción: catálogos de plataforma

Una tabla puede entrar sin `ayuntamiento_id`, sin RLS y sin política
**solo** si no guarda ningún dato de un municipio. Hoy hay una:

- `abreviaturas` (`padron`): el diccionario `ma` → `maria` que expande
  nombres antes de normalizarlos. No cambia entre Motul y Ticul, así que no
  hay dato municipal que pueda fugarse. **Entró el 2026-08-22 por este
  mismo mecanismo.**

  Lo que la protege no es una política sino el `GRANT`: `SELECT` para el
  rol de aplicación y **nunca** `INSERT` ni `UPDATE`. El catálogo se cura a
  mano. Una tabla de esta clase con permiso de escritura para `xula_app` es
  hallazgo aunque no tenga dato de municipio.

`ayuntamientos` también entra sin `ayuntamiento_id`, y no por esta
excepción: no es un catálogo sino la raíz del tenant —su propio `id` ES el
municipio— y su política filtra por esa columna. Se nombra acá porque
`pnpm reglas` la lleva en la misma lista, y una excepción que no está
escrita se lee como un olvido.

**Una segunda no entra sin agregarse a esta lista**, igual que las salidas
a la base de la regla 2 y por la misma razón: la excepción anterior se
escribió en `docs/architecture/invariantes-criticos.md`, que no es un
archivo de reglas, y esta revisión no la vio. Una excepción que vive fuera
de las reglas es indistinguible de un olvido, que es exactamente el modo de
falla que este documento existe para evitar.

---

## Revisión de tests

Los tests entran a la revisión a propósito.

- ¿El test **falla** si se rompe la implementación? Un test que pasa
  siempre no es un test. Es el modo de falla número uno del código
  generado por IA.
- ¿Testea comportamiento o implementación? Un spy sobre `padStart` no
  aporta nada y se rompe al refactorizar.
- ¿Mockea el puerto, o mockea el sujeto del test?
- Tabla con `ayuntamiento_id` sin su `*.isolation.test.ts` = hallazgo.
- Nombres que describen la regla, no `it("funciona")`.

---

## Capas

```
ui ──► application ──► domain ◄── infrastructure
```

| Capa | Importa de | Nunca importa de |
|---|---|---|
| `domain` | nada | application, infrastructure, ui, shared |
| `application` | domain, shared | infrastructure, ui |
| `infrastructure` | domain, application, shared | ui |
| `ui` | application, domain, shared | infrastructure |

Un módulo no importa de otro módulo: va por un puerto de su propio dominio.

---

## Server Actions

- Nunca reciben `ayuntamientoId` por parámetro. Sale de
  `getTenantContext()`. Es una superficie pública: recibe lo que el cliente
  quiera mandarle.
- Validan con Zod `safeParse` en la primera línea.
- No propagan excepciones al cliente. Devuelven `ActionResult<T>`.
- El mensaje de error está redactado para un operador municipal, en
  español. Nunca el texto de la excepción.

### La única excepción: formulario nativo sin `use client`

Una Server Action puede transportar el error por `redirect` +
`searchParams` en vez de devolver `ActionResult<T>` **solo** si es el
`action` de un `<form>` nativo y ningún componente cliente media *esa*
Server Action -nadie la envuelve con `useActionState` para leer su
retorno-. La condición es sobre la acción, no sobre el árbol entero del
formulario: una hoja `"use client"` puede convivir adentro del mismo
`<form>` para otra cosa, mientras el envío siga siendo el POST nativo del
navegador y nada intercepte esa acción en particular.

Lo que protege a todas las filas de esta tabla es lo mismo: el `redirect`
sigue redactando el mensaje para la operadora con la misma lista blanca de
tipos de error que usaría `ActionResult<T>` — la regla de arriba no se
relaja, solo cambia el transporte. `ActionResult<T>` solo lo puede leer
`useActionState`, y esa API exige `"use client"` alrededor de la propia
acción; una acción sin ese límite de cliente no tiene quién lea el valor
que devuelva, y devolverlo sería código muerto.

| Acción | Módulo | Forma del formulario |
|---|---|---|
| `altaDePersonaAction` | `padron` | Server Component, `<form action={...}>` |
| `fusionarPersonasAction` | `padron` | Server Component, `<form action={...}>` |
| `altaDeLugarAction` | `territorio` | Server Component, `<form action={...}>` |
| `editarLugarAction` | `territorio` | Server Component, `<form action={...}>` |
| `darDeBajaLugarAction` | `territorio` | Server Component, `<form action={...}>` |
| `reparentearLugarAction` | `territorio` | Server Component, `<form action={...}>` |
| `altaDeCalleAction` | `territorio` | Server Component, `<form action={...}>` |
| `renombrarCalleAction` | `territorio` | Server Component, `<form action={...}>` |
| `altaDeDomicilioAction` | `territorio` | Server Component, `<form action={...}>` |
| `registrarMudanzaAction` | `territorio` | Server Component, `<form action={...}>` |
| `configurarDocumentosAction` | `constancias` | Server Component, `<form action={...}>` |
| `emitirConstanciaAction` | `constancias` | Server Component, `<form action={...}>` |

Notas que no caben en la tabla, una por fila que las necesita:

- `altaDePersonaAction`: desde la rebanada 4, `FormularioDeAltaDePersona`
  también renderiza `<SugerenciaDeDuplicados />` (`"use client"`), pero esa
  hoja llama a `sugerirDuplicadosAction` -la otra excepción, abajo-, no a
  `altaDePersonaAction`: el envío del formulario sigue sin JavaScript de
  por medio para *esta* acción, funciona igual en la red móvil rural que
  describe `PRODUCT.md`.
- `fusionarPersonasAction` (rebanada 4): `FusionarPersonas.tsx` es un
  `<form action={...}>` sin `"use client"` en ningún componente de por
  medio, y `redirect(\`/padron?error=...\`)` redacta con la misma lista
  blanca (`NoAutorizadoError`, `NoEncontradoError`).
- `altaDeLugarAction`/`editarLugarAction`/`darDeBajaLugarAction`
  (`capa-territorial`, rebanada 3): mismo motivo exacto que
  `altaDePersonaAction`, sin una segunda hoja cliente que complique el
  árbol. Redactan con `NoAutorizadoError`/`NoEncontradoError`; la de alta
  también `JerarquiaInvalidaError` -el rechazo de dominio cuando
  `puedeContener` da falso- y la de baja, `LugarConDependientesError`.
- `reparentearLugarAction` (`capa-territorial`, rebanada 3): mismo motivo,
  y también redacta `JerarquiaInvalidaError`.
- `altaDeCalleAction`/`renombrarCalleAction` (`capa-territorial`, rebanada
  4): mismo motivo exacto que `altaDeLugarAction`. Las dos redactan
  `NoEncontradoError` y `NombreDeCalleDuplicadoError` -el choque contra
  `calles_tenant_lugar_nombre_idx`, que tanto `crear` como `actualizar`
  traducen en `repositorioDeCallesSql`- y `altaDeCalleAction` ademas por
  un `lugarId` de otro municipio o inexistente, que `altaDeCalle.ts` lee
  bajo RLS antes de insertar (mismo patron que `padreId` en
  `altaDeLugarAction`).

**Una segunda no entra sin agregarse a esta tabla**, misma razón que la
excepción de catálogos de plataforma: una excepción que vive solo en un
comentario de código es indistinguible de un olvido.

### La única excepción: lectura no bloqueante invocada desde cliente

Una Server Action puede devolver su tipo directo en vez de `ActionResult<T>`
**solo** si (a) la invoca directamente un componente `"use client"` -no un
`<form action>`- y (b) no existe ningún error de negocio que redactar para
la operadora: sin rol que exigir, sin escritura que pueda rechazarse, y el
spec exige explícitamente que la función sea "nunca bloqueante". Sin esas
tres condiciones juntas, la acción vuelve a `ActionResult<T>`. Hoy hay una:

- `sugerirDuplicadosAction` (`padron`, rebanada 4): `SugerenciaDeDuplicados`
  la llama directo, no por `<form>`. Es sugerencia informativa mientras se
  escribe -catálogo de personas parecidas-, nunca falla de forma que la
  operadora deba enterarse: valida con Zod, resuelve el contexto y atrapa su
  propia caída de infraestructura, así que ante cualquier tropiezo devuelve
  lista vacía en vez de un `ActionResult<T>` con éxito o error que nadie va
  a mostrar como error.

**Una segunda no entra sin agregarse a esta lista**, mismo motivo que la de
arriba.

---

## Datos personales

Categorías cerradas, nunca `string`, en: motivo de apoyo de traslado, tipo
de asunto del juzgado, tipo de apoyo social.

Un diagnóstico o un pleito familiar en un campo abierto es dato sensible
sin protección, sin importar cómo se llame el módulo.

**En logs no va nunca:** nombre, CURP, domicilio, motivo de traslado, tipo
de asunto del juzgado, programa de apoyo. Un log no tiene RLS ni bitácora
de acceso. Se referencia por ID.

---

## Fecha y hora

- Columnas de momento: `timestamptz`, en UTC.
- Fecha civil (la del calendario, la que ve una persona) siempre por
  `shared/lib/fecha`, que resuelve en `America/Merida`.
- **Nadie llama `getFullYear()`, `getMonth()` ni `getDate()`
  directamente.** El servidor corre en UTC: una constancia emitida el 31 de
  diciembre a las 19:00 hora local caería con el año siguiente en el folio.

---

## Métricas

| Métrica | Límite |
|---|---|
| Líneas por función | ≤ 30 |
| Líneas por archivo de código | ≤ 200 |
| Profundidad de anidación | ≤ 3 |
| Parámetros por función | ≤ 3 (más, va objeto) |

---

## Nomenclatura

- Dominio en español (`constancia`, `padron`, `apoyoTraslado`), andamiaje
  técnico en inglés (`domain`, `repository`, `useCase`).
- Sin acentos ni eñes en identificadores: `campanias`, `montoMinimo`.
- Interfaces sin prefijo `I`.
- Booleanos con `is`/`has`/`should`/`can`.
- IDs tipados con marca, no `string` suelto.
- Uniones de strings, no `enum` de TypeScript.

---

## Comentarios

Un comentario no tiene CI. El día que deja de ser cierto nada falla: sigue
ahí, afirmando con autoridad algo que ya no pasa. Por eso se escribe el que
carga algo que ningún test puede cargar, y solo ese.

Cinco filtros, en orden. El primero que dispara decide:

1. **¿Reformula el código?** → hallazgo. Se borra.
2. **¿Describe comportamiento?** → hallazgo. Es un test, no un comentario.
3. **¿Ya está dicho en otro archivo?** → hallazgo. Queda en uno, el resto
   apunta ahí.
4. **¿Trae un hecho de afuera del archivo** —línea de un bundle,
   comportamiento de Postgres, regla de negocio— **o documenta una
   ausencia?** → NO es hallazgo, por largo que sea. Es su único hogar.
5. **¿Cita una versión o una línea de un paquete?** → hallazgo si no lleva
   la versión al lado.

---

## Qué NO es hallazgo

No marques:

- **Un comentario largo que pasa el filtro 4.** El código no puede explicar
  por qué una columna NO existe, ni por qué un `unique` de una librería
  nunca llega a Postgres. Ese comentario es la única copia de ese hecho:
  marcarlo por extenso o por densidad borra lo que no está en ningún otro
  lado. Se marca por reformular, duplicar o afirmar sin test — nunca por
  largo. La proporción de comentarios de un archivo **no** es hallazgo.
- **La ausencia de un archivo que no está en el diff.** Ves el diff, no el
  repositorio. Un test de aislamiento, un esquema o una migración pueden
  existir en un commit anterior de esta misma rama y no aparecer acá. Si
  falta algo obligatorio *en un archivo que sí estás viendo*, marcalo; si lo
  que falta es un archivo entero, escribilo como "no lo veo en el diff" y no
  como "no existe". La diferencia importa: lo segundo se corrige duplicando
  lo que ya estaba.
- Preferencias de estilo que Biome ya formatea
- Falta de abstracción especulativa. La duplicación es más barata que la
  abstracción equivocada: se duplica la primera vez, se aguanta la segunda,
  se abstrae la tercera.
- Ausencia de manejo de casos que el roadmap declara fuera de alcance
  (cobros, CFDI, contabilidad, nómina, cálculo de plazos del juzgado)
- Capas o patrones que no resuelven un problema que ya existe

La arquitectura existe para resolver problemas, no para crear trabajo
extra. **Sugerir sobre-ingeniería es un hallazgo tan malo como no ver un
bug.** La única excepción es el aislamiento entre tenants: ahí se agregan
capas de más a propósito, porque el modo de falla no admite segundas
oportunidades.
