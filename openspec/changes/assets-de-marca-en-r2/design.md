# Diseno: Assets de marca en R2

**Cambio:** `assets-de-marca-en-r2` · **Base:** `proposal.md` (nueve
decisiones cerradas, no se reabren) y engram
`sdd/assets-de-marca-en-r2/exploration`.

**Correccion post Fase 4 (revision GGA sobre el commit `2b5b622`).** Tres
secciones de este documento quedaron desactualizadas por hallazgos reales
de la revision automatica; el detalle completo esta en `tasks.md`, seccion
"Correccion de revision GGA". Resumen:

1. **§3 `AlmacenDeAssets.borrar`** — la firma documentada abajo
   (`borrar(url)`, no-op solo por prefijo de `R2_PUBLIC_URL`) no aislaba
   por tenant ni comparaba origen con `URL.parse`. La firma real ahora es
   `borrar(ayuntamientoId, url)`, respaldada por
   `domain/claveDesdeUrl.ts#claveTenantDesdeUrl`.
2. **§6 (`shared/ui/marca.ts` gana `validarMarca`)** — `validarMarca`,
   `leerMarca`, `ResultadoDeMarca`, `urlDeAsset` y el esquema de colores
   viven en `src/shared/marca/` (`validacion.ts`), no en `shared/ui/`:
   `application/cambiarEscudo.ts` no puede importar de `ui` bajo ningun
   nombre. `shared/ui/marca.ts` se queda solo con `variablesDeMarca`.
3. **§2 (tabla de archivos) `application/puertos.ts` solo tenia
   `AlmacenDeAssets`** —
   `cambiarEscudo.ts` componia el UPDATE de `ayuntamientos.marca` a mano
   (antipatron 7 de `AGENTS.md`). Se agrego `RepositorioDeMarca` al mismo
   archivo, implementado en
   `infrastructure/repositorioDeMarcaSql.ts` e inyectado en
   `crearCambiarEscudo(almacen, repositorio)`.

El resto del documento —el problema de composicion, `composicion.ts`, el
flujo de `cambiarEscudo`, exportacion— sigue vigente sin cambios.

**Supuesto declarado:** no se pudo consultar la documentacion de Next.js 16
en esta sesion (la herramienta de docs no estuvo disponible). Lo que se
asume de Server Actions es lo que ya esta escrito en el ADR 0001 seccion 4
y una regla del framework: en un archivo con `"use server"` la restriccion
cae sobre sus **exports** —todos funciones asincronas— y no sobre lo que
importa. El diseno de composicion depende de eso; si resultara falso, lo
que cambia es donde se cablea, no el resto del documento.

---

## 1. El problema de composicion, cerrado

El Server Action vive en `modules/marca/ui/actions/` y necesita el
adaptador de R2 de `modules/marca/infrastructure/`. Los dos lugares obvios
para cablearlos estan prohibidos y el tercero es un ciclo.

**Solucion: una raiz de composicion en `src/modules/marca/composicion.ts`**,
archivo de raiz del modulo, fuera de las cuatro capas.

```text
src/app/(acceso)/marca/page.tsx
  └─► @/modules/marca                    index.ts   (barril)
        └─► ./ui                          ui/index.ts
              └─► ui/actions/cambiarEscudo.action.ts   "use server"
                    └─► ../../composicion              composicion.ts
                          ├─► ./application/cambiarEscudo   fabrica
                          └─► ./infrastructure/almacenR2    adaptador
```

`composicion.ts` importa la fabrica y el adaptador, los une y exporta el
caso de uso ya cableado. **No importa `./ui` ni `./index`.** El barril
`index.ts` re-exporta `./application` y `./ui` como manda
`module-template.md`, y nunca `./composicion` ni `./infrastructure`.

### Por que pasa cada regla, una por una

| Regla de `.dependency-cruiser.cjs` | `from` que la dispara | Por que no dispara |
|---|---|---|
| `ui-no-importa-infrastructure` (l. 37) | `^src/modules/[^/]+/ui/` | El action importa `../../composicion`, que resuelve a `src/modules/marca/composicion.ts`. No matchea `^src/modules/[^/]+/infrastructure/`. Las reglas comparan **aristas directas**, no alcanzabilidad: no hay `reachable` en este archivo |
| `app-no-importa-infrastructure` (l. 65) | `^src/app/` | La ruta importa `@/modules/marca`, o sea `index.ts`. No es `infrastructure/` ni `domain/` |
| `application-no-importa-infra-ni-ui` (l. 22) | `^src/modules/[^/]+/application/` | `application/cambiarEscudo.ts` exporta `crearCambiarEscudo(almacen: AlmacenDeAssets)`. Recibe el puerto por parametro y jamas nombra el adaptador |
| `sin-ciclos` (l. 93) | cualquiera | La unica arista de vuelta posible seria `composicion.ts → ui`, y no existe. El grafo es un arbol: `index → ui → composicion → {application, infrastructure} → domain` |

Dos reglas mas que tambien se verificaron: `dominio-no-importa-nada`
(l. 18) —`domain/` solo importa de `domain/`— y
`modulo-no-importa-interior-de-otro` (l. 47), cuyo `pathNot` incluye
`^src/modules/$1/`, asi que todo lo intramodulo queda exento.

**El precio, dicho:** `composicion.ts` es el unico archivo del modulo que
ninguna regla de capa vigila. La contencion es que no tenga nada que
vigilar: solo cableado, cero condicionales, cero `await`. Si alguna vez
tiene una decision adentro, esa decision esta en el lugar equivocado.

### Alternativas descartadas

| Opcion | Por que no |
|---|---|
| Cablear en `index.ts` | El barril tiene que re-exportar `./ui` (template) y `ui` tiene que importar el caso de uso cableado: ciclo `index → ui → index`, que `sin-ciclos` rompe |
| El action importa el adaptador y lo inyecta el mismo | Es exactamente `ui-no-importa-infrastructure` |
| Cablear en `src/app/` | Es `app-no-importa-infrastructure` |
| Mover `"use server"` a `application/` | `application` importaria Next para `revalidatePath`; el ADR 0001 seccion 4 lo prohibe por escrito y es la razon de que las actions vivan en `ui/` |

---

## 2. Archivos del modulo

| Archivo | Responsabilidad, en una linea |
|---|---|
| `src/modules/marca/index.ts` | Barril: `export * from "./application"`, `export * from "./ui"`, `export type * from "./types"` |
| `src/modules/marca/types.ts` | Contratos publicos: `EntradaDeEscudo`, `EscudoCambiado` |
| `src/modules/marca/composicion.ts` | Raiz de composicion: une la fabrica con el adaptador de R2 |
| `domain/index.ts` | Barril de capa |
| `domain/png.ts` | Regla pura sobre bytes: firma, tamanio, `IHDR`, dimensiones |
| `domain/claveDeEscudo.ts` | `{ayuntamientoId}/escudo-{uuid}.png`, con el uuid inyectado |
| `application/index.ts` | Barril de capa |
| `application/puertos.ts` | `AlmacenDeAssets` |
| `application/cambiarEscudo.ts` | Caso de uso: rol, validacion, PUT, transaccion, borrado diferido |
| `application/almacenDePrueba.ts` | Fake en memoria del puerto, nombrado como `*DePrueba.ts` del repo |
| `infrastructure/index.ts` | Barril de capa |
| `infrastructure/almacenR2.ts` | Unico archivo del repo que importa `@aws-sdk/client-s3`; tambien lee y valida `R2_*` |
| `ui/index.ts` | Barril de capa |
| `ui/actions/cambiarEscudo.action.ts` | `"use server"`: Zod, contexto, `ActionResult`, `revalidatePath` |
| `ui/FormularioDeEscudo.tsx` | `"use client"`: input de archivo, RHF, pinta el error por campo |
| `src/app/(acceso)/marca/page.tsx` | Ruta fina: sin sesion redirige, compone el formulario |

`(acceso)` y no un grupo nuevo: ese layout ya exige
`superficie === "ayuntamiento"`, que es donde vive el panel de un
municipio.

---

## 3. El puerto, el adaptador y el fake

```ts
// application/puertos.ts
export type AlmacenDeAssets = {
  /** Devuelve la URL publica absoluta del objeto guardado. */
  guardar(clave: string, bytes: Uint8Array): Promise<string>;
  /**
   * Recibe el `ayuntamientoId` de quien pide el borrado y la URL
   * guardada, no la clave. No-op si no es de este almacen o de otro
   * tenant.
   */
  borrar(ayuntamientoId: string, url: string): Promise<void>;
};

// application/puertos.ts — agregado en la correccion post Fase 4
export type RepositorioDeMarca = {
  leer(tx: TransaccionTenant, ayuntamientoId: AyuntamientoId): Promise<unknown>;
  escribir(
    tx: TransaccionTenant,
    ayuntamientoId: AyuntamientoId,
    marca: Record<string, unknown>,
  ): Promise<void>;
};
```

`guardar` devuelve la **URL**, no la clave: armarla es saber el dominio
publico, y eso es conocimiento de infraestructura. Por simetria `borrar`
recibe la URL guardada y el adaptador la mapea de vuelta a clave — es el
unico que sabe hacerlo en las dos direcciones.

**`borrar` no-opea en dos casos, los dos de seguridad y no de comodidad —
version corregida tras la revision GGA, ver el resumen al inicio del
documento.** Primero, si la URL no es de este almacen: comparacion de
**origen** exacto contra `R2_PUBLIC_URL` con `URL.parse`, nunca
`startsWith` sobre el string completo — `assets.example.com.evil.com`
comparte el prefijo de texto de `assets.example.com` sin ser el mismo
origen. Segundo, si la clave resultante no empieza con el
`ayuntamientoId` de quien pide el borrado: sin este chequeo,
`{urlPublica}/{otroAyuntamiento}/x.png` borraria el escudo de otro
municipio, porque el DELETE al bucket corre fuera de Postgres y RLS no
alcanza ahi. Las dos barreras las implementa la funcion pura
`domain/claveDesdeUrl.ts#claveTenantDesdeUrl`, testeada sin IO
(`domain/claveDesdeUrl.test.ts`) y ejercitada con `S3Client` mockeado en
`infrastructure/almacenR2.test.ts`.

`RepositorioDeMarca` evita que `cambiarEscudo.ts` componga el UPDATE de
`ayuntamientos.marca` a mano (antipatron 7 de `AGENTS.md`). Las dos
operaciones reciben la `tx` de `withTenant` por parametro — no abren su
propia transaccion — porque el UPDATE de `escribir` y el INSERT de la
bitacora tienen que confirmar juntos o fallar juntos. A diferencia de
`AlmacenDeAssets`, no hay un doble de prueba: Postgres esta disponible en
los tests de integracion, asi que `infrastructure/repositorioDeMarcaSql.ts`
es la unica implementacion, real siempre.

| Doble | Donde | Que hace |
|---|---|---|
| `almacenDePrueba` | `application/almacenDePrueba.ts` | `Map<clave, bytes>`, expone lo guardado y lo borrado, permite forzar falla en `guardar` y en `borrar` |
| `almacenR2` | `infrastructure/almacenR2.ts` | `PutObjectCommand` / `DeleteObjectCommand` contra R2 |

El fake vive en `application/` y no en `infrastructure/` por una razon
mecanica: un `application/cambiarEscudo.test.ts` **matchea**
`^src/modules/[^/]+/application/`, asi que importar el fake desde
`infrastructure/` haria fallar `application-no-importa-infra-ni-ui` en el
test mismo.

**Lo que necesita credenciales reales y por lo tanto queda fuera de CI:**
el PUT y el DELETE efectivos contra el bucket, y que
`R2_PUBLIC_URL/{clave}` responda 200 desde internet. Es una **tarea manual
documentada** —subir un escudo en un entorno con `R2_*` puesto y recargar
`{sub}.xulasigma.mx/acceso`—, no un test. No hay credenciales de R2 en CI y
no se ponen.

---

## 4. El validador de PNG

Vive en `domain/png.ts` porque es una regla pura sobre bytes: entra un
`Uint8Array`, sale un veredicto. Sin IO, sin imports, testeable en
milisegundos.

```ts
export type VeredictoPng =
  | { ok: true; ancho: number; alto: number }
  | { ok: false; motivo: MotivoDeRechazo };

export type MotivoDeRechazo =
  | "VACIO" | "DEMASIADO_GRANDE" | "NO_ES_PNG" | "SIN_IHDR" | "DIMENSIONES";
```

Union y no excepcion: el dominio no sabe de `ValidacionError` —no importa
`shared`— y el caso de uso traduce el motivo a un mensaje por campo.

Orden de los chequeos, del mas barato al mas caro:

1. `bytes.length === 0` → `VACIO`; `> 1 MiB` → `DEMASIADO_GRANDE`.
2. Offset 0..7 exactamente `89 50 4E 47 0D 0A 1A 0A`.
3. Offset 8..11 = longitud del primer chunk, que en un PNG es `13`; offset
   12..15 = `IHDR` en ASCII. Cualquier otra cosa → `SIN_IHDR`.
4. `ancho` = uint32 big-endian en 16..19, `alto` en 20..23. Fuera de
   `[80, 2048]` en cualquiera de los dos → `DIMENSIONES`.

**Fixtures: bytes construidos en el test, sin archivos binarios en el
repositorio.** Un helper `pngDe({ ancho, alto })` emite firma + `IHDR` con
esas dimensiones, y los casos negativos se obtienen mutando esa salida. Un
`.png` commiteado seria un blob que nadie puede leer en un diff, y la
propiedad que se prueba —"este byte concreto decide"— se pierde.

Casos que el test debe cubrir: truncado a 23 bytes, un byte de la firma
volteado, firma de JPEG (`FF D8 FF`), firma correcta con `IEND` en lugar de
`IHDR`, 79x80, 80x79, 80x80, 2048x2048, 2049x2048, exactamente 1 MiB,
1 MiB + 1, y la bomba: un archivo de 200 bytes que **declara** 20000x20000
y se rechaza sin decodificar nada.

---

## 5. El camino de escritura, de punta a punta

```text
FormularioDeEscudo  ──FormData{escudo:File}──►  cambiarEscudoAction
                                                      │
  1. esquemaDeEntrada.safeParse(formData.get("escudo"))   File, <= 1 MiB
  2. contextoActual()          ayuntamientoId, rol, origen — NUNCA por parametro
  3. bytes = new Uint8Array(await archivo.arrayBuffer())
  4. cambiarEscudo({ bytes }, contexto)  ◄── ya cableado por composicion.ts
  5. revalidatePath("/marca"); revalidatePath("/acceso")
  6. { ok: true, data: { escudo } }  |  mapearError(e)
```

Adentro del caso de uso:

```text
  a. puedeCambiarMarca(rol)                    no  ─► NoAutorizadoError
  b. validarPng(bytes)                     !ok     ─► ValidacionError{escudo}
  c. clave = claveDeEscudo(ayuntamientoId, crypto.randomUUID())
  d. url = await almacen.guardar(clave, bytes)      ── PUT primero (decision 4)
  e. anterior = await withTenant(ayuntamientoId, async (tx) => {
        crudo     = SELECT marca FROM ayuntamientos WHERE id = ayuntamientoId
        base      = esObjetoPlano(crudo) ? crudo : {}
        propuesta = validarMarca({ ...base, escudo: url })   ← MISMO validador
        if (!propuesta.ok) throw ValidacionError(propuesta.campos)  ← ROLLBACK
        UPDATE ayuntamientos SET marca = { ...base, escudo: url }
        registrar(tx, { accion: "CAMBIAR_MARCA", entidad: "ayuntamientos" })
        return urlAnteriorDe(base)
     })
  f. if (anterior && anterior !== url)          ── DESPUES del commit
       almacen.borrar(anterior).catch(log)      ── best-effort, no propaga
```

Cuatro cosas que el orden fija y que hay que leer despacio:

- **`e` escribe `{ ...base, escudo: url }`, el crudo, no `propuesta.marca`.**
  Zod descarta las claves que no conoce: escribir su salida borraria en
  silencio un campo futuro pegado a mano. Es el mismo defecto que motiva
  toda la seccion, un nivel mas abajo. `validarMarca` es **precondicion**,
  no normalizador.
- Si `crudo` no es un objeto plano (un `42`, un arreglo, `null`), `base` es
  `{}`: no hay campo que preservar, y `leerMarca` ya devuelve `{}` para ese
  valor hoy.
- El `throw` de `d` deja el objeto subido y sin referencia. Es el huerfano
  que la decision 4 acepta por escrito.
- El borrado de `f` corre fuera de la transaccion y su falla no cambia el
  resultado: la accion devuelve `ok: true` y el huerfano queda en el log
  con `datosSegurosDeError`.

**Consecuencia de UX aceptada:** si el municipio tiene hoy un color
invalido en su `jsonb`, subir el escudo falla nombrando el campo hasta que
alguien lo corrija — y este cambio no trae pantalla para corregirlo. El
mensaje tiene que decir cual es el campo y a quien pedirle que lo arregle.
Es preferible a revertir los colores en silencio, que es la alternativa que
existe hoy.

---

## 6. `marca.ts`: el descarte total, sin cambiar comportamiento

`src/shared/ui/marca.ts` gana dos exports y `leerMarca` se reconstruye
encima:

```ts
export type ResultadoDeMarca =
  | { ok: true; marca: Marca }
  | { ok: false; campos: Record<string, string> };

export const validarMarca = (valor: unknown): ResultadoDeMarca;
export const leerMarca = (valor: unknown): Marca => {
  const r = validarMarca(valor);
  return r.ok ? r.marca : {};
};
export { urlDeAsset };
```

`validarMarca` corre el esquema **y** la reja de contraste. Las claves de
`campos` son `primario`, `primarioTexto`, `secundario`, `escudo` y
`contraste` — esta ultima porque una falla de contraste no es de un campo
sino del par, y atribuirsela a uno de los dos seria mentir sobre cual esta
mal.

`urlDeAsset` se exporta para que el modulo no rederive el chequeo
http/https (decision 9, filtro 3 de `CLAUDE.md`).

**Contrato de regresion: los quince tests de `marca.test.ts` siguen
pasando sin tocarlos.** Son la definicion de "no cambia el comportamiento",
y por eso se corren antes de escribir una linea de `validarMarca`:

`leerMarca` — "acepta una marca bien formada", "no deja pasar un color que
trae CSS adentro", "un escudo que no es URL no se pinta", "una marca
invalida cae entera a los valores por defecto", "aguanta lo que venga de
una columna jsonb", "un color con nombre no entra, porque no se puede
medir", "un hex con transparencia tampoco, por la misma razon", "un oklch
con forma valida pero no medible tampoco entra".

`leerMarca y el contraste` — "guinda con texto blanco pasa", "guinda con
texto negro cae entera al defecto", "un primario solo se mide contra el
texto por defecto", "los valores por defecto son los mismos que declara
globals.css".

`variablesDeMarca` — "solo declara las variables que el municipio
definio", "sin marca no declara ninguna", "el acento se declara sin pasar
por la reja de contraste".

Los tests nuevos de `validarMarca` se agregan en un `describe` propio y
prueban lo unico que `leerMarca` no puede distinguir: `{}` devuelve
`ok: true` con marca vacia, mientras que `{ primario: "url(//x)" }`
devuelve `ok: false` nombrando `primario`. Los dos casos que hoy colapsan
en el mismo `{}`.

Los dos consumidores existentes —`src/app/(acceso)/layout.tsx` y
`src/app/(acceso)/acceso/page.tsx`— **no se tocan**: siguen llamando
`leerMarca`, con la misma firma y el mismo resultado.

### Correccion a la propuesta: el layout no cambia

La propuesta lista `src/app/(acceso)/layout.tsx` con "pinta el escudo a
80x80". Verificado contra el codigo: el layout solo inyecta las variables
CSS, y **`acceso/page.tsx` ya pinta el escudo** con `h-20 w-20` —80px— y su
`biome-ignore` explicando por que no usa `next/image`. Ninguno de los dos
necesita cambio. Son unas quince lineas menos que la estimacion de la
propuesta.

---

## 7. `marca` en la exportacion

`src/shared/exportacion/exportar.ts`:

- `Exportacion["ayuntamiento"]` gana `marca: Marca`.
- `municipioDe` suma `marca: ayuntamientos.marca` a su lista explicita de
  columnas y devuelve `{ ...municipio, marca: leerMarca(municipio.marca) }`.

Se exporta la marca **validada** y no el `jsonb` crudo porque
`Exportacion` es un contrato tipado y un `unknown` ahi es un agujero.
**Limitacion declarada**, de la misma familia que la decision 8: un color
invalido pegado a mano no aparece en el archivo. Es un valor que la
plataforma nunca uso.

El test que ya existe, `exportar.isolation.test.ts`, gana un caso: la
exportacion de un municipio con escudo lo trae, y la de uno sin marca trae
`{}`.

---

## 8. Entorno y arranque

| Variable | Que es |
|---|---|
| `R2_ENDPOINT` | Endpoint S3 de la cuenta de Cloudflare |
| `R2_BUCKET` | Bucket de un solo proposito, nombrado por su contenido |
| `R2_ACCESS_KEY_ID` | Token de API |
| `R2_SECRET_ACCESS_KEY` | Token de API |
| `R2_PUBLIC_URL` | Base del dominio propio; prefijo de la URL guardada y de la que `borrar` acepta |

Hoy `grep -i "R2_" src/` no devuelve nada: las cinco son nuevas. Van a
`.env.example` con el mismo estilo explicativo que las existentes.

**Se leen y se validan de forma perezosa, dentro de `almacenR2`, en la
primera llamada — no al importar el modulo.** Esto **diverge a proposito**
de `withTenant.ts`, `ritmo.ts` e `instancia.ts`, que lanzan al tope del
archivo, y la razon es concreta: `next build` compila los modulos alcanzados
por las rutas, y un `throw` en alcance de modulo puede tumbar el build de
un despliegue que todavia no tiene bucket. Esas tres variables estan en el
camino de **cada** peticion; `R2_*` esta en el camino de una sola pantalla.

Que pasa sin las variables, dicho como consecuencia y no como intencion:

- La aplicacion arranca. Un municipio sin escudo ve su pantalla de acceso
  igual que hoy — el camino de lectura (`leerMarca` en `(acceso)/`) no
  importa nada del modulo `marca` ni de R2.
- La pantalla de cambio de escudo carga.
- El primer intento de subida devuelve `ERROR_INTERNO` al operador y deja
  en el log del servidor cual variable falta.

---

## 9. Taxonomia de errores

Ninguna excepcion cruza al cliente (ADR 0001 seccion 4). `mapearError`
despacha por `codigo`, nunca por `instanceof`.

| Falla | Donde se detecta | `ActionResult` |
|---|---|---|
| Sin archivo, no es `File`, o mas de 1 MiB | `safeParse` del action | `VALIDACION`, `campos.escudo` |
| Sin sesion (`contextoActual()` nulo) | Action | `NO_AUTORIZADO` |
| Rol distinto de `ADMIN_MUNICIPAL` | Caso de uso, `puedeCambiarMarca` | `NO_AUTORIZADO` |
| Bytes que no son PNG, dimensiones o tamanio | `domain/png.ts` | `VALIDACION`, `campos.escudo` con el motivo traducido |
| La marca resultante no validaria | Caso de uso, `validarMarca` | `VALIDACION`, con el campo culpable |
| El municipio no existe | Caso de uso, dentro de `withTenant` | `TENANT_NO_RESUELTO` |
| PUT a R2, o `R2_*` ausente | Adaptador | `ERROR_INTERNO` + log con `datosSegurosDeError` |
| UPDATE, RLS o bitacora fallan | `withTenant` | `ERROR_INTERNO`; queda un huerfano (decision 4) |
| **El borrado del anterior falla** | Despues del commit | **Ninguno: `ok: true`.** Log del huerfano y nada mas |

`ActionResult<T>` y `mapearError` **no existen todavia en el codigo** —
solo estan escritos en el ADR. Este cambio los crea, en
`src/shared/lib/errores.ts`, que es el `shared/lib/errors` que nombra el
ADR y ya es el hogar de los cinco `codigo`. Es alcance que la propuesta no
lista y suma alrededor de treinta lineas; se compensa con las quince que
ahorra la correccion del layout.

No se agrega una clase `ConfiguracionError`: el adaptador lanza un `Error`
comun con el detalle para el log, y `mapearError` lo cae en `ERROR_INTERNO`
con un mensaje redactado para un operador municipal. Decirle al cliente que
falta una variable de entorno es filtracion de configuracion.

---

## 10. Regla de dependency-cruiser para el cliente S3

Espejo de `auth-solo-desde-shared-auth`, incluida su leccion ya verificada:

```js
{
  name: "s3-solo-desde-el-almacen-de-assets",
  severity: "error",
  from: { pathNot: "^src/modules/marca/infrastructure/" },
  to: {
    dependencyTypes: ["npm"],
    // Se compara contra `resolved`, que con pnpm es
    // node_modules/.pnpm/@aws-sdk+client-s3@X/node_modules/@aws-sdk/client-s3/…
    // Un patron anclado al nombre del paquete no matchea nunca.
    path: "node_modules/@aws-sdk/client-s3/",
  },
}
```

La regla se **provoca una vez** —un import del cliente desde otro archivo,
`pnpm check` en rojo, se revierte— antes de darla por buena. Es lo que
hicieron con la de `argon2` y es la unica forma de saber que no quedo
decorativa.

---

## 11. Cambios fuera del modulo

| Archivo | Accion | Que |
|---|---|---|
| `src/shared/ui/marca.ts` | Modificar | `validarMarca`, `ResultadoDeMarca`, `urlDeAsset`; `leerMarca` encima |
| `src/shared/ui/marca.test.ts` | Modificar | `describe` nuevo para `validarMarca`; los quince existentes intactos |
| `src/shared/auth/roles.ts` | Modificar | `puedeCambiarMarca = rol === "ADMIN_MUNICIPAL"`, con el comentario de por que `SUPER_ADMIN` queda afuera |
| `src/shared/auth/roles.test.ts` | Modificar | Los cuatro roles contra la regla nueva |
| `src/shared/lib/errores.ts` | Modificar | `ActionResult<T>` y `mapearError` |
| `src/shared/exportacion/exportar.ts` | Modificar | `marca` en `Exportacion["ayuntamiento"]` y en `municipioDe` |
| `src/shared/exportacion/exportar.isolation.test.ts` | Modificar | Con escudo y sin marca |
| `src/app/(acceso)/marca/page.tsx` | Crear | Ruta fina |
| `.dependency-cruiser.cjs` | Modificar | La regla del cliente S3 |
| `.env.example` | Modificar | Las cinco `R2_*` |
| `package.json` | Modificar | `@aws-sdk/client-s3` |
| `docs/06-frontend.md` | Modificar | La correccion de `shared/ui/branding/`, abajo |
| `docs/adr/0001-decisiones-tecnicas-fase-0.md` | Modificar | Seccion nueva: bucket de un proposito, clave opaca, PNG unicamente, borrado diferido |
| `docs/architecture/invariantes-criticos.md` | Modificar | T10 deja de estar sin test |
| `src/app/(acceso)/layout.tsx` | **Sin cambio** | Ya inyecta las variables; no pinta el escudo |
| `src/app/(acceso)/acceso/page.tsx` | **Sin cambio** | Ya pinta el escudo a 80x80 |

### La correccion de `docs/06-frontend.md`

El arbol de `src/shared/ui/` (lineas 197-201) promete tres carpetas
—`primitives/`, `layout/` y `branding/ Proveedor de marca blanca`— y
ninguna de las tres existe. `branding/` es la que este cambio contradice de
frente: la marca blanca no va a quedar en un proveedor de `shared/ui`, sino
repartida entre `shared/ui/marca.ts` —validacion y variables CSS, que se
consumen antes de que exista sesion— y `src/modules/marca/` —la escritura,
que necesita las cuatro capas y las rejas que solo existen bajo
`^src/modules/`.

Corregir el arbol es parte del trabajo, no una nota al pie. Un documento
que describe una carpeta inexistente no tiene CI que lo desmienta: es el
filtro 1 de `CLAUDE.md` aplicado a la documentacion, y el commit anterior
de esta rama ya trato ese caso igual.

---

## 12. Estrategia de pruebas

TDD estricto: cada fila se escribe en rojo antes de la implementacion.

| Suite | Que se prueba | Como |
|---|---|---|
| `unit` — `domain/png.test.ts` | Los once casos de la seccion 4 | Bytes armados con `pngDe(...)`, sin fixtures binarios |
| `unit` — `domain/claveDeEscudo.test.ts` | El prefijo es el `ayuntamientoId`; el uuid entra por parametro | Asercion de la cadena exacta |
| `unit` — `shared/ui/marca.test.ts` | `validarMarca` distingue vacia de invalida; los quince tests viejos siguen verdes | Sin base |
| `unit` — `shared/auth/roles.test.ts` | `puedeCambiarMarca` para los cuatro roles | Sin base |
| `unit` — `application/almacenDePrueba.test.ts` | `borrar` no-opea sobre una URL ajena | Fake contra si mismo |
| `integration` — `application/cambiarEscudo.integration.test.ts` | Rol; orden PUT antes de la transaccion; la clave lleva el id del **contexto**; la traza queda en la misma transaccion; el borrado del anterior corre despues del commit; un borrado que falla no cambia `ok: true`; una marca previa con color invalido no escribe nada y los colores no se tocan | `almacenDePrueba` + Postgres real, porque el caso de uso llama `withTenant`. Mismo patron que `exportar.isolation.test.ts` |
| `integration` — `escudo.isolation.test.ts` | El escenario T10: el `ADMIN_MUNICIPAL` de Motul no cambia la marca de Ticul; RLS lo corta aunque el id se falsee | Dos municipios sembrados, `withTenant` por cada uno |
| `integration` — `exportar.isolation.test.ts` | La exportacion trae `marca` | Caso agregado al archivo existente |
| Manual, documentado | PUT y DELETE reales; `R2_PUBLIC_URL/{clave}` responde 200; el escudo sigue ahi despues de un redeploy | Entorno con `R2_*`; **no es CI** |

El caso de uso queda en `integration` y no en `unit` porque llama
`withTenant`, igual que `exportarAyuntamiento`. No estorba a la reja: la
cobertura se mide sobre las dos suites, y `src/modules/**/application/**`
esta en el `include` de `vitest.config.ts` con piso de 80%.

`infrastructure/` y `ui/` **no** entran en ese `include`, asi que el
adaptador de R2 no aporta ni resta cobertura. `almacenDePrueba.ts` si
entra, y lo ejercitan sus propios tests.

---

## 13. Matriz de amenazas

**N/A.** Las cinco filas de la matriz —rutas tipo documentacion, seleccion
de repositorio git, estado del indice, estado del push y composicion de
comandos de PR— cubren limites de shell, subproceso y automatizacion de
control de versiones. Este cambio no toca ninguno: no ejecuta comandos, no
lanza procesos y no automatiza git.

La superficie adversaria que si tiene —bytes que un usuario sube diciendo
que son un PNG— esta cubierta en la seccion 4 y en la estrategia de
pruebas, que es su lugar propio. Inventarle filas a una matriz que no
aplica seria ruido con forma de rigor.

---

## 14. Migracion y despliegue

**Sin migracion.** La columna `marca` ya existe, es `jsonb notNull
default {}`, y `ayuntamientos_escritura_propia` ya acota el UPDATE a la
fila propia. No hay tabla nueva, asi que tampoco hay politica RLS nueva que
escribir — lo que si hay es el test T10, que prueba la politica que ya
estaba.

Orden de despliegue: las `R2_*` se ponen en Railway **antes** del deploy.
Si no estan, todo funciona salvo la subida, que devuelve `ERROR_INTERNO` —
por eso el arranque es perezoso y no fatal.

Rollback: revertir el PR. El campo `escudo` vuelve a estar validado y sin
escribir, como hoy, y los objetos quedan en R2 sin costo relevante. Si lo
que se desmonta es el bucket, revertir el codigo no alcanza: hace falta un
UPDATE que vacie `marca.escudo` en la decena de filas afectadas.

---

## 15. Preguntas abiertas

- [ ] `Exportacion["ayuntamiento"]` exporta la marca validada y no el
      `jsonb` crudo. Se toma como decision de este diseno por el contrato
      tipado; si el criterio de archivo es "todo lo que hay en la columna",
      la llamada cambia y son dos lineas.
- [ ] `ActionResult` y `mapearError` entran a `src/shared/lib/errores.ts`.
      Cabe discutir un `src/shared/lib/accion.ts` aparte cuando haya un
      segundo Server Action; con uno solo, un archivo nuevo es prematuro.
- [ ] Falta confirmar contra la documentacion de Next.js 16 que un archivo
      `"use server"` puede importar valores no-funcion. Se asume que si
      (ver el encabezado). No bloquea el diseno: si no fuera cierto, el
      cableado se mueve a una llamada perezosa dentro de la accion y el
      resto del documento no cambia.
