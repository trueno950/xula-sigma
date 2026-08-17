# ADR 0001 — Decisiones técnicas de Fase 0

**Fecha:** 2026-08-16
**Estado:** Aceptado
**Contexto:** Cierra los huecos que bloqueaban el arranque de Fase 0.

Cada decisión aparece en la primera semana de trabajo. Sin definirlas, el
desarrollo asistido por IA las resuelve distinto en cada sesión y en tres
semanas conviven varias convenciones. Ese es el modo de falla que este
documento evita.

---

## 1. Autenticación — Better Auth

### Decisión

`better-auth` con adaptador de Drizzle. Solo email y contraseña. Sin OAuth.

### Por qué

El equipo de Auth.js se integró a Better Auth en septiembre de 2025.
Auth.js sigue recibiendo parches de seguridad, pero Better Auth es el
camino recomendado para proyectos nuevos. Lucia está deprecado desde marzo
de 2025 y hoy es material educativo, no una librería.

Sin OAuth porque el usuario es personal de un palacio municipal. Asumir que
tienen cuenta de Google es asumir de más, y cada proveedor externo es una
dependencia de disponibilidad que no controlamos.

### El tenant se resuelve antes que la sesión

Esta es la parte que importa y sale directo de nuestra arquitectura.

El login ocurre en `motul.xulasigma.mx`. El tenant ya está resuelto por
`proxy.ts` **antes** de que exista sesión. Por lo tanto la consulta de
autenticación corre dentro de `withTenant` como cualquier otra.

Consecuencias, todas deseadas:

- La tabla de usuarios lleva `ayuntamiento_id`, RLS y su test de
  aislamiento, igual que cualquier tabla operativa. No es un caso especial.
- El mismo correo puede existir en dos municipios y son dos usuarios
  distintos.
- Un usuario de Motul no puede iniciar sesión en el subdominio de Ticul.
  No porque se lo prohíba una regla de aplicación, sino porque RLS no le
  muestra su propio registro desde ese contexto.

### SUPER_ADMIN

No entra en ese modelo: no pertenece a ningún ayuntamiento. Vive en una
superficie propia, `admin.xulasigma.mx`.

Su cambio de contexto queda en bitácora y el contexto anterior no persiste
en ninguna capa. Ver [Seguridad §6](../05-seguridad.md).

#### Corrección — 2026-08-16, al diseñar `auth-rbac`

La primera versión de esta sección decía **tabla propia, fuera del padrón de
usuarios municipales**. Se cambió: el SUPER_ADMIN vive en un **ayuntamiento
reservado de plataforma**, y usa las mismas cuatro tablas de autenticación
que todos.

El motivo es que la tabla propia obligaba a un **segundo mecanismo de
sesión** —sus propias tablas de sesión y cuenta, su propia firma de cookie—
para dar un servicio que el existente ya da. Dos caminos de autenticación en
un sistema cuyo modo de falla grave es el cruce entre municipios es
exactamente la clase de duplicación que no conviene: el segundo camino no
hereda las defensas del primero, y hay que probarlo todo dos veces.

Con el ayuntamiento reservado, el SUPER_ADMIN queda sujeto al mismo RLS, al
mismo `withTenant` y a los mismos tests de aislamiento que cualquier usuario
municipal. No es una excepción al invariante raíz: es un caso más de él.

**Lo que esto obliga, y no es opcional:**

- La fila reservada **no es un municipio** y el directorio público tiene que
  excluirla. Si `resolverAyuntamientoPorSubdominio` la devolviera, la
  plataforma aparecería como un ayuntamiento más.
- Su alta no pasa por el flujo normal de provisión de municipios.

La autoridad del alta de municipios —el tercer rol de Postgres y sus
políticas— es idéntica en cualquiera de los dos caminos, así que esa parte
del diseño no cambió.

### Hash de contraseña

Se configura `argon2id` (`@node-rs/argon2`) reemplazando el hash por
defecto de la librería. **Verificar el nombre exacto de la opción contra la
documentación de la versión que instalemos** antes de dejarlo en el
código.

### Tablas que crea la librería

Better Auth genera su propio esquema. Cada una de sus tablas pasa por la
misma regla que el resto: si tiene `ayuntamiento_id`, tiene RLS y test de
aislamiento en el mismo commit. Sin excepción por venir de una librería.

### Costo de la instancia por request — medido 2026-08-17

El ADR dejó abierto si construir la instancia de Better Auth en cada
request salía caro. Medido en el spike PR 0 del cambio `auth-rbac`, con
1000 iteraciones tras 100 de calentamiento contra Postgres 18 local:

| Qué | p50 | p95 |
|---|---|---|
| Construir la instancia sobre la transacción | 0.141 ms | **0.227 ms** |
| Acceso completo (`manejarAuth`, con sign-in real) | 23.6 ms | 26.2 ms |

El umbral que habilitaba discutir AsyncLocalStorage era 5 ms de
construcción. Quedó 22 veces por debajo, así que **no se discute**: un
segundo mecanismo de contexto asincrónico conviviendo con el actual no se
paga con este número. El p95 del acceso completo lo domina argon2id, que es
lento a propósito.

---

## 2. Migraciones — drizzle-kit en el Pre-deploy Command de Railway

### Decisión

`drizzle-kit migrate` en el **Pre-deploy Command** del servicio, con el rol
de migraciones.

### Por qué ahí

Railway ejecuta el pre-deploy entre el build y el arranque, en un contenedor
aparte con las variables de entorno del servicio. **Si falla, el deploy
falla** y la versión anterior sigue sirviendo. Es exactamente la semántica
que queremos: no hay ventana con código nuevo contra esquema viejo.

La alternativa —correr migraciones desde CI— obliga a exponer la base al
runner y desacopla la migración del deploy que la necesita. Peor en las dos
dimensiones.

### Tres URLs, no una

```ts
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),             // rol de aplicación
  MIGRATION_DATABASE_URL: z.string().url(),   // rol owner
  SUPER_ADMIN_DATABASE_URL: z.string().url(), // alta de municipios
});
```

El pre-deploy usa `MIGRATION_DATABASE_URL`. La aplicación nunca la ve.

**Actualizado 2026-08-17 (PR 4 de `auth-rbac`): entró un tercer rol.**
`xula_super_admin` da de alta municipios y destraba al `ADMIN_MUNICIPAL`
que quedó afuera. Se creó porque el alta ocurre cuando el tenant todavía no
existe —se está creando— y ninguno de los otros dos puede hacerla:
`xula_app` no tiene `INSERT` sobre `ayuntamientos` a propósito, y el owner
tendría privilegios de sobra para una operación que hace un panel.

Lo que lo mantiene honesto es que **no es una llave maestra, y eso lo
sostiene Postgres**: políticas propias en `0002_super_admin.sql` le impiden
crear a nadie que no sea `ADMIN_MUNICIPAL`, restablecer la contraseña de
nadie más, leer el directorio de municipios o crear una segunda fila de
plataforma. Su único `SELECT` es por columna sobre cuatro campos de
`usuarios`, y existe porque una subconsulta de política lo exige.

### La segunda puerta a la base, y por qué no rompe el patrón

`shared/tenancy/provision.ts` expone `withAltaDeAyuntamiento`. Es el
segundo —y último— punto de acceso a datos que no pasa por `withTenant`.

No es una excepción al invariante sino una superficie distinta:
`withTenant` es la puerta de la **operación**, entra con un tenant ya
resuelto y corre bajo `xula_app`; esta es la puerta del **alta**, donde el
tenant no existe todavía y corre bajo otro rol con otras políticas.

Comparte la forma que hace confiable a la primera: la conexión es una
constante privada del módulo que nadie fuera puede alcanzar, y la única
salida es la función. El invariante lo sostiene el lenguaje, no la
disciplina de quien revisa.

`AGENTS.md` regla 2 las nombra a las dos. Una tercera no entra sin
actualizar esa regla primero.

Verificado el 2026-08-16: el template de Postgres de Railway entrega **un
solo rol**, `postgres`, con `rolsuper` y `rolbypassrls` en `t`. Si la app
se conecta con la `DATABASE_URL` que Railway entrega tal cual, RLS no hace
absolutamente nada.

### Los roles se crean en `scripts/bootstrap.sql`, no en una migración

Corrección a lo que decía la primera versión de este ADR. Los roles no
pueden crearse en la migración inicial, por tres razones que aparecieron al
implementarlo:

1. `drizzle-kit migrate` se conecta con `MIGRATION_DATABASE_URL`, que es
   justamente el rol que habría que crear. No puede crearse a sí mismo.
2. Crear roles no es un cambio de esquema versionado. Se hace una vez por
   base, no se replica como parte de la historia.
3. Las contraseñas son por entorno. Una contraseña en una migración es una
   contraseña en git, para siempre y en cada clon.

El script se corre una vez por entorno con el superusuario de Railway:

```
psql "$SUPERUSER_URL" -v clave_migrator=... -v clave_app=... \
  -f scripts/bootstrap.sql
```

Crea `xula_migrator` (dueño del esquema, **no superusuario**) y `xula_app`,
ambos con `NOSUPERUSER NOBYPASSRLS`. El dueño no es `postgres` a propósito:
un superusuario ignora RLS siempre, incluso con `FORCE`. Con un dueño
común, una consulta que saliera por la conexión equivocada sigue sujeta a
las políticas.

También otorga `CREATE ON DATABASE` a `xula_migrator`: `drizzle-kit` guarda
su journal en un esquema propio y lo crea en la primera corrida. Sin ese
permiso la migración **falla callada** — se queda en `applying
migrations...` y sale con código 1 sin imprimir el error de Postgres.

### El silencio de `drizzle-kit migrate` no es un caso, es su modo de falla

**Corrección al 2026-08-17.** Una primera versión de esta sección decía que
`drizzle-kit migrate` sale con código 1 cuando no hay nada que aplicar. Es
falso: con la base al día sale con código **0**. Lo que había atrás era
otra cosa.

Lo verificado es esto: **cuando `drizzle-kit migrate` no puede llegar a la
base que cree, sale con código 1 y no imprime ni una línea del error.** Se
queda en `applying migrations...` y termina. La misma pantalla exacta que
el caso del `CREATE ON DATABASE` de arriba, que es un problema
completamente distinto.

Reproducido dos veces con dos causas diferentes:

| Causa | Lo que se ve |
|---|---|
| Falta `CREATE ON DATABASE` para el journal | `applying migrations...`, exit 1 |
| `MIGRATION_DATABASE_URL` no resuelve a la base esperada | `applying migrations...`, exit 1 |

La segunda apareció corriendo `pnpm db:migrate` a secas mientras
`scripts/db-local.sh` —que exporta la variable antes de invocarlo— aplicaba
lo mismo sin problema. **La variable se exporta siempre; no se confía en
que el runner cargue `.env`.** Vitest, por ejemplo, no lo carga.

Consecuencia para el Pre-deploy Command de Railway: `drizzle-kit migrate` a
secas no alcanza como señal. El exit code distingue bien éxito de fracaso,
pero el fracaso no dice de qué. Cuando falle, la primera pregunta es a qué
base se estaba conectando.

### Toda migración que crea tabla hace cuatro cosas

1. Columna `ayuntamiento_id`
2. `ENABLE` + `FORCE ROW LEVEL SECURITY`
3. La política de tenant
4. `GRANT` al rol de aplicación

Hay una asimetría útil acá: **olvidar el `GRANT` falla ruidosamente** —
error de permisos en el primer request. **Olvidar RLS falla en silencio.**

Por eso el test de esquema solo necesita vigilar el punto 2: el 4 se
delata solo.

Por la misma razón no hay `ALTER DEFAULT PRIVILEGES`. Sería cómodo, pero se
llevaría puesta esa asimetría: el `GRANT` explícito obliga a escribir una
línea por tabla, y esa línea es el momento en que alguien se pregunta si
también puso la política.

### Lo que drizzle-kit no emite

`drizzle-orm` sabe generar `ENABLE ROW LEVEL SECURITY` y las políticas
desde `pgPolicy()`, pero **no emite `FORCE ROW LEVEL SECURITY`** — se
verificó contra la versión instalada. Sin `FORCE`, el dueño de la tabla
queda exento de sus propias políticas y todo el aislamiento es decorativo
para esa conexión.

Por eso a lo que genera `drizzle-kit` se le **agrega `FORCE` y los `GRANT`
en el mismo archivo**, no en una migración aparte.

Lo aparte se intentó primero y lo detuvo la revisión, con razón: cuando las
cuatro cosas viven en dos archivos, un diff que toca solo el generado se ve
idéntico a una migración que se olvidó del `FORCE`. Ni una persona ni una
revisión automática pueden distinguir una omisión real del ruido, porque a
ninguna de las dos le llega el archivo que falta.

Una migración, las cuatro cosas, un solo diff que leer.

### `NULLIF`, y por qué no es cosmético

La política no compara contra `current_setting('app.tenant', true)::uuid`
sino contra `NULLIF(current_setting('app.tenant', true), '')::uuid`.

Verificado contra Postgres 18: cuando una transacción fija la variable con
`set_config(..., true)` y termina, el valor **no vuelve a NULL — vuelve a
cadena vacía.** Y `''::uuid` lanza `invalid input syntax for type uuid`.

Sin el `NULLIF`, toda consulta que salga fuera de `withTenant` por una
conexión ya reciclada del pool revienta al evaluar la política. No hay
fuga —falla cerrado— pero es un error latente que aparece recién en
producción, cuando el pool empieza a reusar conexiones.

### Alta de municipios: provisionamiento, no operación

Con `FORCE` puesto, ni el dueño puede insertar en `ayuntamientos`. Es
correcto: `xula_app` no da de alta municipios, eso es del panel de
SUPER_ADMIN.

La política `ayuntamientos_provision` abre esa excepción **solo sobre esa
tabla y solo para `xula_migrator`**. Se justifica barato: sus columnas de
lectura ya son públicas —el escudo se pinta antes del login— y quien tiene
esa conexión ya puede hacer `DROP TABLE`.

`bitacora` y toda tabla operativa que venga después se quedan con `FORCE`
sin escape para nadie. Ahí están los datos que no pueden cruzarse.

---

## 3. Errores — dominio por módulo, transversales en `shared`

### Decisión

| Dónde | Qué vive ahí | Quién lo lanza |
|---|---|---|
| `modules/<mod>/domain/errors.ts` | Errores de negocio del módulo: `FolioInvalidoError`, `PersonaNoEnPadronError` | `domain` |
| `shared/lib/errors` | Transversales: `NoAutorizadoError`, `TenantNoResueltoError`, `ValidacionError` | `application`, `infrastructure`, `ui` |

Todo error lleva un `readonly codigo: string`.

### Por qué así y no una base compartida

Una jerarquía de errores en `shared` obligaría a que `domain` importe de
`shared`, y `domain` no importa nada. Esa regla es la que sostiene la
arquitectura entera; no se debilita para ahorrar una clase base.

Los errores de dominio extienden `Error` nativo. El mapeo en el borde
despacha por `codigo`, no por `instanceof`, así que no hace falta un
ancestro común y ningún módulo necesita conocer los errores de otro.

Los transversales no son de dominio: no los lanza una regla de negocio sino
la infraestructura de la plataforma. Viven en `shared` con toda razón.

### Clarificación a `estructura.md §3`

La tabla de capas no menciona `shared`. Queda explícito:

| Capa | ¿Puede importar de `shared`? |
|---|---|
| `domain` | **No.** No importa nada. |
| `application` | Sí |
| `infrastructure` | Sí |
| `ui` | Sí |

Va a `.dependency-cruiser.js` junto con el resto.

---

## 4. Server Actions — en `ui/actions/`, con resultado tipado

### Decisión

Ubicación: `modules/<mod>/ui/actions/<verbo><Entidad>.action.ts`

Viven en `ui/` porque son un **mecanismo de entrega**, no un caso de uso.
Necesitan `revalidatePath`, y eso es Next.js: si vivieran en `application/`
esa capa importaría el framework.

### Forma canónica

```ts
"use server";

export async function emitirConstanciaAction(
  input: unknown,
): Promise<ActionResult<{ folio: string }>> {
  const datos = EmitirConstanciaSchema.safeParse(input);
  if (!datos.success) return errorDeValidacion(datos.error);

  const { ayuntamientoId, usuario } = await getTenantContext();

  try {
    const constancia = await emitirConstancia(datos.data, { usuario });
    revalidatePath("/constancias");
    return { ok: true, data: { folio: constancia.folio.toString() } };
  } catch (error) {
    return mapearError(error);
  }
}
```

### Reglas

- **Nunca recibe `ayuntamientoId` por parámetro.** Sale de
  `getTenantContext()`. Un Server Action es una superficie pública: recibe
  lo que el cliente quiera mandarle.
- Valida con Zod en la primera línea, con `safeParse`. El esquema es el
  mismo que usa React Hook Form en el cliente.
- **No propaga excepciones al cliente.** Devuelve `ActionResult`:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; codigo: string; mensaje: string; campos?: Record<string, string> };
```

- El `mensaje` está redactado para un operador municipal, en español. Nunca
  el texto de la excepción. Ver
  [Frontend, antipatrón 7](../06-frontend.md#11-antipatrones).
- `mapearError` vive en `shared/lib/errors` y despacha por `codigo`. Es el
  único lugar donde un error se convierte en texto de usuario.

---

## 5. Logging — Pino, y nunca dato personal

### Decisión

`pino`. Salida JSON a stdout, que es lo que Railway recolecta.

Reemplaza a `console.log`, que está prohibido por lint
(`noConsoleLog: "error"`).

### Log y bitácora no son lo mismo

Es la confusión que hay que evitar desde el primer día.

| | Bitácora | Log |
|---|---|---|
| Dónde vive | Tabla en Postgres | stdout, retención de la plataforma |
| Para qué | Requisito del producto y evidencia legal | Operación y diagnóstico |
| Contenido | Quién, qué, cuándo, sobre qué registro | Qué pasó técnicamente |
| Se borra | Nunca, es de solo agregado | Sí, con la retención |

Una traza de auditoría **jamás** se escribe con el logger.

### Qué lleva cada línea

```ts
log.info({ ayuntamientoId, usuarioId, modulo: "constancias", accion: "emitir" });
```

### Qué no lleva, nunca

Nombre, CURP, domicilio, motivo de traslado, tipo de asunto del juzgado,
programa de apoyo recibido.

El razonamiento es el mismo de
[Seguridad §5](../05-seguridad.md): el motivo de un traslado revela
condición de salud. Un log no tiene RLS, no tiene bitácora de acceso y sale
del sistema hacia la plataforma. Escribir ahí un dato sensible lo saca de
todos los controles que construimos, de una.

Se referencia por ID. Quien tenga autorización lo resuelve contra la base.

---

## 6. Fecha y hora — UTC en la base, `America/Merida` para lo civil

### Decisión

- Todas las columnas de momento son `timestamptz`. Se guarda UTC.
- `TZ=UTC` fijado explícitamente en Railway.
- Toda fecha **civil** —la del calendario, la que ve una persona— se deriva
  en `America/Merida`.

### El bug que esto evita

Yucatán es UTC-6 todo el año. México eliminó el horario de verano en 2022,
así que no hay salto estacional. Verificado contra la base de datos IANA el
2026-08-16: `America/Merida` da GMT-6 en enero, abril, julio y octubre.

Ahora el caso que rompe:

```
Constancia emitida el 31 de diciembre de 2026, 19:00 hora de Mérida
  = 2027-01-01T01:00Z

Servidor en UTC:  new Date().getFullYear()  →  2027
Fecha civil real:                           →  2026
```

El folio sale `MOT-2027-000001` el 31 de diciembre, y el 1 de enero el
contador arranca de nuevo. Dos documentos con el mismo folio, en un
documento oficial con serie consecutiva.

No es hipotético: está reproducido arriba con la tzdb del sistema.

### Regla

`shared/lib/fecha` expone la fecha civil y **nadie llama a
`getFullYear()`, `getMonth()` ni `getDate()` directamente.**

```ts
export function fechaCivil(instante: Date): { anio: number; mes: number; dia: number };
```

Implementado con `Intl.DateTimeFormat` y `timeZone: "America/Merida"`. Sin
dependencia nueva.

Aplica a: año del folio, fecha impresa en el documento, corte de reportes
por día, y el sello de la bitácora cuando se muestra.

---

## 7. Hooks de git — Husky es el dueño, GGA es una línea adentro

### Decisión

| Herramienta | Rol | Dónde vive |
|---|---|---|
| **Husky** | Dueño de los hooks | `devDependency` + `.husky/`, commiteado |
| **GGA** | Revisión de IA sobre lo generado | Una línea en `.husky/pre-commit` |
| **commitlint** | Formato del mensaje de commit | `commit-msg` |

### No se corre `gga install`

Este es el punto que hay que respetar, y no es obvio.

Husky 9 fija `core.hooksPath` en `.husky/_`. GGA resuelve su destino con
`git rev-parse --git-path hooks`, que **sí respeta** `core.hooksPath`
(verificado el 2026-08-16). O sea que `gga install` no queda huérfano:
escribe adentro de `.husky/_`.

El problema es que `.husky/_/.gitignore` contiene `*` y husky regenera ese
directorio en cada `prepare`. Un hook instalado ahí:

- no viaja con el repositorio
- desaparece en el próximo `pnpm install`

Funciona en la máquina de quien lo instaló, hasta que deja de funcionar, y
no avisa.

GGA va como una línea del archivo que sí commiteamos:

```sh
# .husky/pre-commit
pnpm biome check --staged
pnpm typecheck
pnpm test --changed
gga run
```

### Por qué GGA está en este proyecto

`04-calidad.md §7` pide *"leí el diff completo, entiendo cada línea"*. Con
el código escrito por IA y una sola persona orquestando, ese control no se
sostiene a escala: se saltea, y se saltea temprano.

GGA lo reemplaza por algo que sí escala. Su `RULES_FILE` apunta a un
archivo de reglas del proyecto, así que revisa lo generado contra nuestros
propios antipatrones antes de que entren.

**Archivo de reglas: `AGENTS.md` en la raíz**, condensado. Las 12 reglas de
[docs/README.md](../README.md) más la tabla de 25 antipatrones de
[03-antipatrones.md](../03-antipatrones.md).

No se le pasa `docs/` completo: son más de 2,000 líneas por revisión, sale
caro y le diluye el foco.

### commitlint, no GGA, para el mensaje de commit

GGA ofrece un hook de `commit-msg`. No lo usamos.

Validar que un mensaje arranque con `feat(padron):` es determinista y lo
resuelve una expresión regular. Pagar latencia y tokens de un modelo por
eso contradice
[Principios](../01-principios.md): si se puede automatizar, se automatiza —
con la herramienta más simple que alcance.

### Los hooks locales no son el gate

`git commit --no-verify` saltea husky entero. Los hooks son comodidad: dan
la señal donde arreglar es barato.

La reja que no se puede saltar es CI, y ahí GGA corre sobre el PR completo:

```sh
gga run --pr-mode --diff-only
```

### Proveedor: opencode

Configuración en `.gga`, commiteada:

| Clave | Valor | Por qué |
|---|---|---|
| `PROVIDER` | `opencode:deepseek/deepseek-v4-pro` | Modelo fijado, ver abajo |
| `OPENCODE_AGENT` | `gga-reviewer` | Agente propio, ver abajo |
| `FILE_PATTERNS` | `*.ts,*.tsx,*.sql` | Los `.sql` entran a propósito, ver abajo |
| `EXCLUDE_PATTERNS` | `*.d.ts` | Los tests **no** se excluyen, ver abajo |
| `STRICT_MODE` | `true` | Una revisión ambigua se lee como aprobada |
| `PR_BASE_BRANCH` | `main` | Explícito en vez de autodetección |

Dos desvíos deliberados de la plantilla por defecto de GGA:

- **Se revisan los `.sql`.** Una migración que olvida
  `FORCE ROW LEVEL SECURITY` es el error más caro del proyecto y no vive en
  un `.ts`.
- **No se excluyen los tests.** La plantilla los excluye; acá el test es la
  especificación, y un test que pasa siempre es el modo de falla número uno
  del código generado por IA. Si el revisor no ve los tests, no puede
  detectarlo.

`OPENCODE_VARIANT` queda sin fijar para que el pre-commit local corra
rápido. CI lo sube con `GGA_OPENCODE_VARIANT=high`.

### El modelo se fija, no se hereda

Con `PROVIDER="opencode"` a secas, GGA invoca `opencode run` **sin
`--model`** y la revisión queda a merced del default de opencode, que es
configuración personal de la máquina y puede cambiar sin aviso.

Una revisión de código tiene que ser reproducible: el modelo se fija en
`.gga`, que está commiteado.

Modelo elegido: `deepseek/deepseek-v4-pro`.

### El agente también se fija

Esto pesa más que la elección del modelo.

Sin `OPENCODE_AGENT`, opencode usa su agente primario por defecto. En esta
máquina ese agente es `gentle-orchestrator`, **con un prompt de 64,180
caracteres** de instrucciones de orquestación SDD que viajarían en cada
revisión de cada commit.

Y el problema no es solo el costo: ese agente está escrito para *coordinar
y delegar trabajo*, no para revisar un diff. Es la herramienta equivocada
apuntando al problema equivocado.

Agente propio en `.opencode/agents/gga-reviewer.md`, versionado con el
repositorio:

- Prompt corto: revisa y reporta, no coordina ni propone refactors
- `temperature: 0.1` para que la revisión sea estable entre corridas
- `permission: edit deny, bash deny, webfetch deny`

Ese último punto no es cosmético. El revisor corre dentro de un hook de
pre-commit: **no debe poder tocar el repositorio que está revisando.**

### Requisito de entorno: bash 5

**GGA no carga ninguna configuración bajo bash 3.2**, que es el que trae
macOS. Su `load_config` usa `source <(...)`, y esa construcción devuelve
vacío en 3.2 sin emitir ningún error: reporta los valores por defecto como
si el archivo no existiera.

Verificado el 2026-08-16. El síntoma es `PROVIDER: Not configured` aunque
`.gga` y el config global estén bien escritos.

```sh
brew install bash   # deja bash 5.x en /opt/homebrew/bin, antes que /bin en PATH
```

En CI no aplica: los runners de Linux ya traen bash 5.

---

## 8. rtk — para el ruido, nunca para el aislamiento

### Decisión

`rtk` comprime la salida de comandos antes de que llegue al contexto del
modelo. Se adopta, con una frontera explícita.

**No es dependencia del proyecto.** Es herramienta de la máquina: no entra a
`package.json`, no viaja en el repositorio, no afecta lo que se despliega.

### Dónde sí

`rtk tsc`, `rtk pnpm`, `rtk git`, `rtk ls`, `rtk tree`, `rtk diff`.

Salida voluminosa y de bajo riesgo. Con el proyecto escrito por IA, el
ahorro se acumula todos los días.

### Dónde no

**El comando nativo, sin `rtk`, en todo lo que verifica aislamiento entre
municipios.**

| Comando | Qué hace rtk | Por qué no acá |
|---|---|---|
| `rtk test` | *"show only failures"* | No distingue "el test de aislamiento pasó" de "no corrió". `04-calidad.md §7` exige confirmar que el test se pone en rojo al romper el código, y eso necesita el conteo, no solo las fallas |
| `rtk psql` | *"strip borders, compress tables"* | Al verificar qué filas ve un tenant, una tabla truncada puede ocultar justo la fila del otro municipio |

### El razonamiento, que es el mismo de siempre

El modo de falla grave de este proyecto es silencioso. Un compresor de
salida es, por diseño, una máquina de volver cosas silenciosas.

En el 90% del output eso es ahorro. En el camino que verifica el
aislamiento es el riesgo exacto que el resto de este documento existe para
evitar.

### Cómo queda configurado

- **No se instala el hook de rtk.** Sin interceptación automática: `rtk` se
  invoca a mano donde conviene. Un interceptor transparente sería
  precisamente el mecanismo silencioso que no queremos.
- Además, `exclude_commands` en la config de rtk protege `vitest`, `psql`,
  `drizzle-kit` y `pnpm test`, por si alguien instala el hook más adelante.

---

## 9. Cadena de herramientas — Node 26, pnpm 11 y espera de 24h

### Decisión

`.nvmrc` fija **Node 26.7.0** y `packageManager` fija **pnpm 11.22.0**. Los
ajustes de pnpm viven en `pnpm-workspace.yaml`, no en `package.json`.

### Node 26, aunque hoy la LTS activa sea la 24

Del calendario oficial de releases:

| Línea | LTS activa | Mantenimiento | Fin |
|---|---|---|---|
| 24 (Krypton) | 2025-10-28 | **2026-10-20** | 2028-04-30 |
| 26 | **2026-10-28** | 2027-10-20 | 2029-04-30 |

En octubre de 2026 la 24 pasa a recibir solo parches de seguridad y la 26
entra en LTS activa, con una semana de diferencia. XULA SIGMA sale a
producción después de eso. Fijar la LTS de hoy era nacer en una línea que
muere antes que el sistema.

Verificado antes de subir: Next 16 pide `>=20.9.0`, Vitest 4 acepta `>=24`,
y `@node-rs/argon2` compila contra N-API, que es estable entre majors y no
exige recompilar.

El punto de `.nvmrc` no es la preferencia de versión: es que local, CI y
Railway lean el mismo número y no puedan divergir en silencio.

### pnpm 11 y los 1440 minutos

pnpm 11 rechaza cualquier versión publicada hace menos de 24 horas
(`minimumReleaseAge`). Al reconstruir el lockfile bajo esta política,
`nanostores@1.5.0` — publicada veinte horas antes, dependencia transitiva de
`@better-auth/core` — quedó afuera y resolvió a `1.4.2`.

Esa ventana de horas es donde vive un ataque de cadena de suministro:
comprometen la cuenta de un mantenedor, publican una versión con payload, y
el daño ocurre antes de que alguien lo note. Esperar un día no elimina el
riesgo, corta la mayoría.

**Costo real, y se paga:** una dependencia recién publicada no se instala
hoy. Cuando aparezca, se espera. No se baja el número.

### Dos cambios de pnpm 11 que fallan distinto

- El campo `pnpm` de `package.json` **ya no se lee**. Avisa y sigue. Nuestro
  `onlyBuiltDependencies` quedó ignorado sin romper nada visible: los
  binarios nativos simplemente no se compilaban. Ahora es `allowBuilds` en
  `pnpm-workspace.yaml`.
- Un script de postinstall bloqueado **ahora es error**, no aviso. Mejor
  así: corta la instalación en vez de dejar un binario ausente que aparece
  mucho después y lejos de su causa.

---

## Consecuencias sobre documentos existentes

Este ADR agrega. No contradice ninguna regla vigente.

Los tres pendientes que dejó quedaron cerrados:

- ✅ `estructura.md §3` — la tabla de capas incluye `shared`, y se explica
  por qué `domain` es la única capa que no puede tocarlo (decisión 3)
- ✅ `04-calidad.md §1` — el test de esquema documenta lo que vigila
  realmente: `FORCE`, políticas huérfanas y los **dos** roles. Se agregó
  que las tablas de Better Auth pasan por la misma regla (decisión 1)
- ✅ `CLAUDE.md` — el piso del 80% ahora está donde se lee cada sesión, con
  la aclaración de que es reja y no objetivo

De paso se corrigieron dos desalineaciones que dejó la implementación:
`estructura.md` decía `.dependency-cruiser.js` (es `.cjs`) y el ejemplo
canónico del test de aislamiento llamaba al helper `conTenant` cuando se
llama `withTenant`. Un ejemplo canónico equivocado se copia.

### Abierto

- **Rol del panel SUPER_ADMIN.** Hoy el alta de municipios se apoya en la
  política `ayuntamientos_provision`, abierta solo sobre esa tabla y solo
  para `xula_migrator`. Se cierra al diseñar auth y RBAC.
- **Node 26 en el builder de Railway.** Local y CI están verificados; el
  tercero se confirma en el primer despliegue.
- **`typescript@7`** cuando dependency-cruiser publique soporte.

---

## Fuentes

- [Railway — Pre-deploy Command](https://docs.railway.com/deployments/pre-deploy-command)
- [Better Auth — adaptador de Drizzle](https://www.better-auth.com/docs/adapters/drizzle)
- Roles de Postgres: verificación empírica contra un Postgres de Railway
  (`postgres-ssl:18`, PostgreSQL 18.4), 2026-08-16
- Desplazamiento de `America/Merida`: base de datos IANA del sistema,
  2026-08-16
