# Diseno: Capa territorial (Fase 1b)

**Cambio:** `capa-territorial` · **Base:**
`openspec/changes/capa-territorial/proposal.md` · **Precedente:**
`openspec/changes/archive/2026-08-23-padron-ciudadano/design.md` · **ADR
0001 §2 §5**

Este documento no reabre las 18 decisiones de la propuesta. Resuelve el
como: en que capa vive cada pieza, la forma exacta del esquema, el
mecanismo que hace imposible un ciclo con **dos** tipos en el rango 0, el
FK compuesto entre modulos, que expone `padron` de verdad, y el camino de
lectura de una identidad fusionada.

Trae ademas **cuatro correcciones a la propuesta**, cada una argumentada
donde aparece: la lectura de `padron` no es una sino dos (§6), las
rebanadas 2–5 **no** dependen de la 1 (§14), `desdeEn`/`hastaEn` no son
`timestamptz` (§8), y la lista cerrada de `AGENTS.md` sobre
`ActionResult<T>` no se puede extender copiando ocho veces el mismo parrafo
(§11).

---

## 1. Enfoque tecnico

Modulo `src/modules/territorio/` con las cuatro capas y `composicion.ts` en
la raiz, igual que `padron` y `marca`.

El eje del diseno no es el esquema —la propuesta ya lo fijo en forma— es
**que la jerarquia no pueda tener un ciclo y que una identidad fusionada no
pueda tener dos domicilios en la respuesta**. Las dos garantias tienen la
misma estructura: la base no las puede expresar sola, asi que se reparten
entre una funcion de dominio pura, un punto de aplicacion que la invoca, y
una reja de Postgres que cubre el caso que si es expresable en una fila.
Todo lo demas de este documento es consecuencia de ese reparto.

---

## 2. Decision 1 — Capas del modulo, y la direccion de cada arista

| Pieza | Capa | Por que ahi |
|---|---|---|
| `identificadores.ts` (4 ids marcados), `tipoDeLugar.ts` (orden y `puedeContener`), `direccion.ts` (las tres calles distintas), `residencia.ts` (vigencia) | `domain` | Puro y sin imports. Es lo unico que se puede probar en milisegundos, y el orden de tipos es la pieza de la que depende la aciclicidad entera |
| `puertos.ts` (4 repositorios + `LecturaDePersonas`), un archivo por caso de uso | `application` | Precedente `padron` design §5: los puertos viven en `application`, no en `domain`. El dominio de `territorio` no necesita nada de afuera |
| `esquema.ts`, adaptadores SQL, CTE de subarbol, **adaptador de `padron`** | `infrastructure` | Otro modulo es el mundo exterior. `AGENTS.md` antipatron 8: puerto propio + adaptador |
| Paginas, formularios, Server Actions | `ui` | — |
| `composicion.ts`, `index.ts`, `types.ts` | raiz | Cableado y superficie, precedente `marca` y `padron` |

**Verificacion contra `.dependency-cruiser.cjs`, arista por arista:**

- `domain/` → nada. `dominio-no-importa-nada` (linea 12) permite solo
  `npm-dev`, o sea el propio `vitest` del test. Por eso `PATRON_UUID` se
  vuelve a escribir (§3) y por eso `PersonaId` **no entra al dominio de
  `territorio`** (§3).
- `infrastructure/` → `domain/`, `application/` (para los tipos de puerto),
  `shared/`. Permitido; solo `infrastructure-no-importa-ui` prohibe algo.
- `infrastructure/lectorDePersonasPorPadron.ts` → `@/modules/padron`.
  `modulo-no-importa-interior-de-otro` (linea 59) tiene un `pathNot` que
  deja pasar `^src/modules/[^/]+/index\.(ts|tsx)$`: el barrel si, el
  interior no. **Con `tsPreCompilationDeps: true` (opciones, linea 139) las
  aristas de solo-tipo tambien cuentan**, asi que un `import type` desde el
  interior de `padron` rompe el build igual que uno de valor. Es a favor
  nuestro: no hay forma silenciosa de saltarse el barrel.
- `application/` → `domain/`, `shared/` (menos `shared/ui`). Permitido.
- `ui/` → `application/`, `composicion.ts`, `domain/`, `shared/`. Nunca
  `infrastructure/`.
- `src/app/(panel)/territorio/**` → `@/modules/territorio`.
  `app-no-importa-infrastructure` mira aristas directas y la nuestra es al
  barrel — mismo camino que ya recorren `marca` y `padron`.
- `sin-ciclos`: `padron` no importa `territorio` en ninguna direccion. La
  pantalla que necesita las dos cosas se compone en `src/app` (§11).

**Sin dependencias nuevas.** Ni paquetes de npm ni extensiones de Postgres:
la decision 1 de la propuesta sigue vigente y el bloqueante 2 (`ltree` en
Railway) **no se toca** — este diseno no depende de `ltree` en ningun
punto, y el CTE recursivo del §7 corre sobre `WITH RECURSIVE`, que es SQL
estandar sin extension.

---

## 3. Decision 2 — Cuatro ids marcados, una sola implementacion

`padron` escribio `personaId.ts` a mano con el regex duplicado. Replicar
eso cuatro veces son ~50 lineas de las cuales 44 son la misma. El propio
repo tiene la regla que decide: *"se duplica la primera vez, se aguanta la
segunda, se abstrae la tercera"* (`AGENTS.md`, "Que NO es hallazgo").
`LugarId`, `CalleId`, `DomicilioId` y `ResidenciaId` son la tercera, la
cuarta, la quinta y la sexta.

`src/modules/territorio/domain/identificadores.ts`, un archivo:

```ts
declare const marca: unique symbol;

type Identificador<N extends string> = string & { readonly [marca]: N };

export type LugarId = Identificador<"LugarId">;
export type CalleId = Identificador<"CalleId">;
export type DomicilioId = Identificador<"DomicilioId">;
export type ResidenciaId = Identificador<"ResidenciaId">;

const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const constructor =
  <N extends string>(nombre: N) =>
  (valor: string): Identificador<N> => {
    if (!PATRON_UUID.test(valor)) {
      throw new Error(`${nombre} invalido: se esperaba un UUID.`);
    }
    return valor as Identificador<N>;
  };

export const comoLugarId = constructor("LugarId");
// ...tres mas
```

**El `as` es la contrapartida y esta acotado a una linea.** Es el precio de
no tener cuatro copias que puedan divergir; la version larga de `padron`
evita el cast a cambio de cuatro cuerpos identicos, y lo que diverge es el
cuerpo, no el cast.

**Por que no se colapsan en un solo id generico.** Porque el fallo que la
marca existe para atajar es concreto: `domicilios` referencia dos tablas
distintas por uuid (`lugarId` a `lugares`, `calleId` a `calles`), y
`crearDomicilio(lugar, calle)` invertido compila si los dos son `string`.
Con marcas distintas no compila. **Lo que la marca NO ataja, y se declara:**
invertir `entreCalleAId` con `entreCalleBId` — misma marca, mismo destino.
Eso lo cubre el invariante de dominio "las tres calles son distintas"
(decision 5 de la propuesta) y su CHECK (§4), no el tipo.

**Por que no vive en `shared`.** `dominio-no-importa-nada`. Es la misma
razon por la que `personaId.ts` reescribe el regex, y este es el **tercer**
lugar del repo donde vive el mismo patron de UUID
(`shared/tenancy/ayuntamientoId.ts`, `padron/domain/personaId.ts`, este).
No se arregla dentro de este cambio: arreglarlo es aflojar la regla que
sostiene la pureza del dominio.

### `PersonaId` cruza el limite, y el barrel de `padron` tiene que abrirse

`territorio` no puede declarar su propio `PersonaId`: el `unique symbol` de
`padron/domain/personaId.ts` es local a ese archivo, asi que un tipo de
forma identica declarado aca **no es asignable** al parametro del puerto que
`padron` va a exponer. Y declarar el parametro como `string` revierte el
commit `d447653` ("id de persona viaja marcado, no string suelto").

`padron/index.ts` suma **un reexport nombrado, no un `export *`**:

```ts
export { comoPersonaId, esPersonaId, type PersonaId } from "./domain";
```

Nombrado a proposito: `Persona`, `normalizarParaBusqueda` y `normalizarCurp`
siguen inalcanzables. La capa A de `padron` design §2 se sostiene igual —lo
que esa capa protege es el **objeto de tabla**, y `superficiePublica.test.ts`
lo fija con `isTable()`, que un validador de uuid no dispara.

Pero abrir el barrel abre un modo de falla nuevo que ese test **no** ve: el
dia que alguien cambie el reexport nombrado por `export * from "./domain"`,
`normalizarParaBusqueda` queda alcanzable y otro modulo puede normalizar con
otro diccionario — exactamente la divergencia que `padron` design §5 existe
para impedir, y `superficiePublica.test.ts` sigue verde porque no hay tabla.
Se agrega **una assertion** a ese test: el barrel no exporta
`normalizarParaBusqueda`. Especifica y atada al fallo real; una lista blanca
de todos los exports seria un test que se rompe con cada caso de uso nuevo
sin describir ninguna regla.

**`PersonaId` no entra a `territorio/domain/`.** El dominio de `territorio`
sabe de fechas de vigencia, no de quien vive; el `personaId` aparece recien
en `application/puertos.ts` y en `infrastructure/esquema.ts`. Es lo que
mantiene `dominio-no-importa-nada` sin excepcion.

---

## 4. Decision 3 — Esquema

`src/modules/territorio/infrastructure/esquema.ts`, ese nombre exacto:
`drizzle.config.ts:31` globea solo `esquema.ts` y "anuncia un conteo de
tablas menor y sigue" (`padron` design §5). Las cuatro tablas en el mismo
archivo.

```
lugares
  id            uuid PK defaultRandom  $type<LugarId>
  ayuntamientoId  columnaTenant()
  tipo          text notNull $type<TipoDeLugar>
  nombre        text notNull
  padreId       uuid null   $type<LugarId>
  bajaEn        timestamptz null
  creadoEn / actualizadoEn  timestamptz notNull defaultNow

  unique("lugares_id_tenant_key").on(id, ayuntamientoId)
  foreignKey([padreId, ayuntamientoId] -> [id, ayuntamientoId])
  check("lugares_tipo_valido", enumerado("tipo", TIPOS_DE_LUGAR))
  check("lugares_sin_autopadre", sql`padre_id <> id`)
  uniqueIndex("lugares_una_cabecera").on(ayuntamientoId)
    .where(sql`tipo = 'cabecera'`)
  index("lugares_padre_idx").on(ayuntamientoId, padreId)
  politicaTenant("lugares")

calles
  id, ayuntamientoId, nombre text notNull
  lugarId       uuid NOT NULL  -- asentamiento; ver abajo
  bajaEn        timestamptz null
  unique("calles_id_tenant_key").on(id, ayuntamientoId)
  foreignKey([lugarId, ayuntamientoId] -> lugares[id, ayuntamientoId])
  uniqueIndex("calles_tenant_lugar_nombre_idx").on(ayuntamientoId, lugarId, nombre)
  politicaTenant("calles")

domicilios
  id, ayuntamientoId
  lugarId       uuid notNull   -- nivel conocido mas profundo
  calleId       uuid notNull
  numero        text null      -- "S/N" es NULL, nunca la cadena
  entreCalleAId, entreCalleBId  uuid null
  referencia    text null
  unique("domicilios_id_tenant_key").on(id, ayuntamientoId)
  foreignKey([lugarId, ayuntamientoId] -> lugares)
  foreignKey([calleId, ayuntamientoId] -> calles)        x3
  check("domicilios_calles_distintas", ...)
  index("domicilios_lugar_idx").on(ayuntamientoId, lugarId)
  index("domicilios_calle_idx").on(ayuntamientoId, calleId)
  politicaTenant("domicilios")

residencias
  id, ayuntamientoId
  personaId     uuid notNull $type<PersonaId>   -- SIN .references()
  domicilioId   uuid notNull $type<DomicilioId>
  desdeEn       date notNull    -- fecha civil, no instante (§8)
  hastaEn       date null
  creadoEn      timestamptz notNull defaultNow  -- desempate (§8)
  foreignKey([domicilioId, ayuntamientoId] -> domicilios)
  uniqueIndex("residencias_una_abierta_idx")
    .on(ayuntamientoId, personaId).where(isNull(hastaEn))
  check("residencias_vigencia", sql`hasta_en IS NULL OR hasta_en >= desde_en`)
  politicaTenant("residencias")
```

Las cuatro con `columnaTenant()` + `politicaTenant()` + `.enableRLS()`, y
`FORCE ROW LEVEL SECURITY` + `GRANT` en la cola del mismo archivo de
migracion.

**`unique(id, ayuntamientoId)` en tres tablas, no en cuatro.** `lugares`,
`calles` y `domicilios` lo llevan porque Postgres lo exige para ser destino
de un FK compuesto y los tres lo son. `residencias` **no**: nada la
referencia y nada la va a referenciar —una residencia es un hecho hoja, no
una entidad que otro modulo cite—. `personas_id_tenant_key` entro
anticipadamente porque tenia un consumidor con nombre (Fase 2), y este no lo
tiene; una restriccion unica de mas es un indice que se mantiene en cada
escritura de la tabla con mas churn del modulo. Es reversible hacia adelante:
agregarla despues es una migracion aditiva de una linea.

**`calles.lugarId` es `NOT NULL`, y esa es la ganancia concreta de que la
cabecera tenga su propio `tipo`.** La pregunta abierta de la propuesta
—`NULL` significando a la vez "de la cabecera" y "todavia no se sabe"— se
cerro: la cabecera es una fila de `lugares` con `tipo = 'cabecera'`, asi que
toda calle cuelga de un asentamiento real y `NULL` deja de significar nada.
`lugares_una_cabecera` fija que hay a lo sumo una, con el mismo patron de
indice unico parcial sobre condicion que `ayuntamientos_una_plataforma`
(`shared/tenancy/esquema.ts:77`).

**`check("domicilios_calles_distintas")` y la semantica de NULL.** El CHECK
es `calle_id <> entre_calle_a_id AND calle_id <> entre_calle_b_id AND
entre_calle_a_id <> entre_calle_b_id`. Con una transversal nula la
comparacion da NULL y un CHECK solo rechaza cuando evalua **FALSE**: la fila
pasa. Es exactamente lo que se quiere —las transversales son nullable a
proposito (decision 5)— y es un hecho de Postgres, no del archivo, asi que
va comentado ahi (filtro 4).

**`tipo` con doble declaracion.** `$type<TipoDeLugar>()` lo cierra en
TypeScript y `enumerado("tipo", TIPOS_DE_LUGAR)` en Postgres, precedente
`usuarios_rol_valido` (`shared/auth/esquema.ts:91`). `TIPOS_DE_LUGAR` vive en
`domain/tipoDeLugar.ts` e `infrastructure` lo importa — direccion permitida,
mismo camino que `esquema.ts` de `auth` con `ROLES`.

**Sin `DELETE` en ningun `GRANT`.** La baja es logica (`bajaEn`) en `lugares`
y `calles`, y el cierre de una residencia es `hastaEn`. El motivo esta escrito
en `drizzle/0004_padron.sql:42` y no se repite: borrar la fila deja huerfanos
los ids que otro modulo ya guardo. `domicilios` no lleva `bajaEn` en esta
rebanada —nadie pidio dar de baja una casa y la casa no desaparece— y esa
ausencia es aditiva.

**El objeto de tabla no sale del modulo.** `territorio/index.ts` exporta
`application`, `composicion`, `types` y `ui`, nunca `infrastructure`. Se
copia el `superficiePublica.test.ts` de `padron` con su `isTable()`: aca no
lo justifica una fusion, lo justifica que el CTE de subarbol y el indice
parcial son la unica implementacion correcta de dos consultas, y un
`.from(lugares)` desde otro modulo las esquiva. Cuesta 6 lineas.

---

## 5. Decision 4 — El FK compuesto entre modulos, escrito a mano

`residencias → personas(id, ayuntamiento_id)` es el primer FK del repo que
cruza un limite de modulo. El objeto de tabla `personas` es deliberadamente
inalcanzable fuera de `padron` (`padron` design §2 capa A), y el builder
`foreignKey()` de Drizzle exige el objeto de la tabla destino. Entonces
Drizzle no puede expresarlo, y no se le abre el barrel para que pueda:
exportar la tabla anula la capa A entera.

En `esquema.ts`, `personaId` es `uuid().notNull().$type<PersonaId>()`
**sin `.references()`**. En la cola de `drizzle/0007_territorio.sql`, en el
mismo archivo que crea las tablas (ADR 0001 §2: un diff que solo toque lo
generado se veria identico a una migracion que se olvido del `FORCE`):

```sql
-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no puede emitir.
--
-- El objeto de tabla `personas` no es alcanzable fuera de `padron`
-- (su design.md, decision 1, capa A), asi que este FK no existe como
-- `foreignKey()` de Drizzle. En Postgres existe igual, y es lo que
-- impide que una residencia apunte a una persona de otro municipio:
-- el compuesto obliga a que el destino comparta el ayuntamiento_id de
-- la propia fila. Destino: personas_id_tenant_key (0004_padron.sql:17).
-- ---------------------------------------------------------------------
ALTER TABLE "residencias"
  ADD CONSTRAINT "residencias_persona_tenant_fk"
  FOREIGN KEY ("persona_id","ayuntamiento_id")
  REFERENCES "public"."personas"("id","ayuntamiento_id")
  ON DELETE no action ON UPDATE no action;
```

Nombre segun el patron de `sesiones_usuario_tenant_fk` y
`personas_fusionada_en_tenant_fk`. Sobrevive a `db:generate` porque
drizzle-kit diffea contra su snapshot y no contra la base (`padron` design
§2), y no hace falta repetir el argumento aca.

### `identidadPorPuerto.test.ts` no dispara sobre la migracion — verificado

Se leyo el archivo, no se asumio.
`src/modules/padron/identidadPorPuerto.test.ts:14` fija `RAIZ = "src"` y su
`archivosTs` (linea 18) filtra con `/\.tsx?$/`. `drizzle/0007_territorio.sql`
**no esta bajo `src/` y no es `.ts`**: queda fuera del recorrido por las dos
condiciones, no por una. El test corre **sin cambios** y la propuesta acierta
en ese punto.

**Lo que si escanea es `src/modules/territorio/**/*.ts`**, y ahi hay una
trampa concreta que este diseno tiene que evitar por construccion: el regex
es `/\bpersona_id\b|\bpersonas\b/` aplicado a lo que haya dentro de una
plantilla `` sql`…` ``. El indice unico parcial de `residencias` es sobre
`(ayuntamiento_id, persona_id)`, y escrito como
`` sql`(ayuntamiento_id, persona_id) WHERE hasta_en IS NULL` `` **dispara el
test**. Se escribe con el builder:
`uniqueIndex("residencias_una_abierta_idx").on(t.ayuntamientoId, t.personaId).where(isNull(t.hastaEn))`.
Misma regla para el CTE de subarbol y para los tests de aislamiento de
`residencias`: ninguna plantilla `sql` de `territorio` nombra `personas` ni
`persona_id`. No es una convencion — hay un test que lo hace fallar, y ese es
el punto.

---

## 6. Decision 5 — Lo que `padron` expone son DOS lecturas, no una

**Correccion a la decision 14 de la propuesta.** `buscarPorId` compuesto
resuelve la direccion "id cualquiera → terminal". La decision 13 pide algo
mas: *"consultar el historial de una persona fusionada devuelve las
residencias de **ambos** ids"*. Eso es la direccion inversa —"terminal → todos
los ids que colapsan en el"— y `buscarPorId` no la puede dar por ninguna
composicion del llamador. Con una sola lectura, el criterio de exito
"historial de una persona fusionada" no es implementable.

Lo que se agrega a `padron`:

| Pieza | Archivo | Firma |
|---|---|---|
| Metodo de puerto | `application/puertos.ts` | `identidadesDe(tx, id: PersonaId): Promise<readonly PersonaId[]>` |
| Implementacion | `infrastructure/repositorioDePersonasSql.ts` | `SELECT id WHERE id = T OR fusionada_en = T`, con `T` ya resuelto por el mismo COALESCE de `buscarPorId` |
| Caso de uso | `application/personaPorId.ts` | `(id, contexto) => Promise<PersonaGuardada \| null>` |
| Caso de uso | `application/identidadesDePersona.ts` | `(id, contexto) => Promise<readonly PersonaId[]>` |
| Composicion | `composicion.ts` | `crearPersonaPorId(repositorioDePersonasSql)` y su par |
| Superficie | `index.ts` | ya sale por `export * from "./composicion"` |

**Una consulta, no un recorrido.** El invariante de `padron` design §4 —toda
fila con `fusionadaEn` no nulo apunta a una terminal— garantiza que la clase
de equivalencia completa esta a un salto: no hay cadena que recorrer.

**Dos funciones y no una que devuelva las dos cosas.** El camino de escritura
(mudanza) necesita el terminal y nunca el conjunto; el de lectura (historial)
necesita el conjunto y nunca el nombre. Un retorno fusionado acopla dos
consumidores que no comparten nada y obliga a cada uno a leer de mas — el
mismo criterio por el que `RepositorioDePersonas` tiene `listar`, `buscar` y
`buscarPorId` separados en vez de un metodo con banderas.

**Sin guarda de rol, las dos.** Precedente exacto y unico:
`listarPersonas.ts:6`, *"leer el padron no es escribirlo"*, con `CONSULTA`
como rol de solo lectura legitimo. `identidadesDePersona` es ademas la
lectura mas inocua del modulo: devuelve uuids y ni un dato personal.
Ninguna de las dos lanza — devuelven `null` y `[]` cuando RLS esconde la
fila, y quien decide que eso es un 404 es el borde (§8).

### El puerto se llama FUERA de `withTenant`, y esto no es estilo

`territorio` declara su propio puerto en `application/puertos.ts`:

```ts
export type LecturaDePersonas = {
  terminalDe(id: PersonaId): Promise<PersonaId | null>;
  identidadesDe(id: PersonaId): Promise<readonly PersonaId[]>;
};
```

Sin `tx` en la firma, **a proposito**. El adaptador
(`infrastructure/lectorDePersonasPorPadron.ts`) llama a los casos de uso de
`padron`, que abren su propio `withTenant`. Si `territorio` lo invocara desde
adentro de su transaccion, seria un `withTenant` anidado: `withTenant.ts:39`
construye un `postgres()` con `max: Number(process.env.DB_POOL_MAX ?? 10)`, y
`vitest.config.ts:64` fija `DB_POOL_MAX: "1"` en el proyecto `integration`.
Con una sola conexion, la transaccion externa la tiene tomada y la interna
espera a que se libere, que es despues de que la interna resuelva. **Se
traba.** En produccion con `max: 10` no se traba: consume dos conexiones del
pool por operacion y se degrada bajo carga, que es peor porque no falla en
CI.

**No medido** — se deduce del `max: 1` y del contrato de un pool, no se
corrio. El test que lo confirma es barato y va en la rebanada 1: una lectura
compuesta invocada desde adentro de un `withTenant` abierto, con timeout.

El orden queda: **primero el puerto, despues la transaccion.** No pierde
nada, y el motivo lo escribio la propia propuesta en su decision 14: *"el FK
compuesto guarda la escritura, el puerto guarda la lectura"*. Si la persona
desaparece entre las dos llamadas, el INSERT lo rechaza
`residencias_persona_tenant_fk` — que es la respuesta correcta, no una
carrera sin cubrir.

---

## 7. Decision 6 — Aciclicidad con dos tipos en el rango 0

La cabecera municipal tiene su propio `tipo`, arriba de todo. El orden deja
de ser una cadena y pasa a ser un **rango**:

| `tipo` | rango |
|---|---|
| `cabecera` | 0 |
| `comisaria` | 0 |
| `colonia` | 1 |
| `sector` | 2 |
| `manzana` | 3 |

Regla, una sola: **`rango(padre) < rango(hijo)`, estricto.**

De ahi salen las tres cosas que hacen falta, sin regla adicional:

1. `cabecera` no puede colgar de `comisaria` ni al reves —`0 < 0` es
   falso—, que es justo lo que se queria: son dos asentamientos hermanos y
   ninguno contiene al otro.
2. Un nodo de rango 0 **nunca es hijo de nadie**, porque no hay rango
   menor. Es raiz por construccion, sin columna `esRaiz` ni convencion.
3. **No hay ciclos.** Toda arista aumenta el rango estrictamente; un ciclo
   tendria que volver a un rango menor o igual, y ninguna arista lo permite.
   Corolario util: la profundidad maxima es 4, porque hay cuatro rangos
   distintos y cada salto consume uno.

El paso de una cadena total a un rango con empate en la cima **no debilita
el argumento**: la propuesta lo sostenia en "el orden es total", y lo que de
verdad lo sostiene es que la relacion sea *estricta*, no que sea total.

### Donde vive el chequeo, y por que no en los otros tres lados

| Candidato | Veredicto |
|---|---|
| **`domain/tipoDeLugar.ts`: `puedeContener(padre, hijo)`** | **Si.** Es la tabla de rangos y una comparacion. Pura, sin base, y su test recorre las 25 combinaciones enteras contra `TIPOS_DE_LUGAR` —forma de `roles.test.ts:15`— para que un sexto tipo **falte** en el test en vez de heredar un permiso por descarte |
| **`application`: `altaDeLugar` y `reparentearLugar`** | **Si, es el punto de aplicacion.** Lee las dos filas dentro del mismo `withTenant` y llama a la funcion de dominio. Es el unico lugar que tiene los dos `tipo` a la vez |
| `CHECK` en Postgres | **No puede.** Un CHECK ve solo su propia fila y el `tipo` del padre esta en otra. Mismo limite que el invariante de un salto de `padron` design §4, que por eso vive en un test de integracion y no en un CHECK |
| Trigger | **No.** Pondria la tabla de rangos en PL/pgSQL mientras el dominio la tiene en TypeScript: dos copias de la misma regla, y la comparacion solo significa algo si las dos salieron del mismo codigo (mismo argumento por el que `padron` design §5 rechaza el trigger de normalizacion). Ademas seria el primer trigger del repo — una clase de mecanismo nueva, sin precedente ni forma de revision acordada, para una regla que ya tiene dueno |

**Lo que si hace Postgres**, porque si cabe en una fila:
`check("lugares_sin_autopadre", sql`padre_id <> id`)`. Es el ciclo de largo 1,
el mas facil de producir con un `UPDATE` a mano y el unico expresable.

**Limite declarado:** un `UPDATE` directo por `psql` puede armar un ciclo de
largo ≥ 2 y ningun mecanismo de este diseno lo impide. La mitigacion no es
otra reja sino que la consecuencia sea acotada: el CTE de subarbol lleva
`WHERE profundidad < 8` (el maximo real es 4, §7 punto 3), asi que un ciclo
hecho a mano degrada en una respuesta incompleta en vez de colgar la
conexion. Es una linea y convierte el riesgo "Media" de la propuesta —*"un
ciclo cuelga todo CTE recursivo"*— en un resultado equivocado y visible.

### `tipo` es inmutable despues del alta

Regla derivada que la propuesta no enuncia y que este diseno necesita:
`editarLugar` **renombra y nada mas**. Si el `tipo` se pudiera cambiar, se
podria invertir una arista existente sin tocar `padreId`, o sea sin pasar por
la unica guarda que hay. Se cierra por tipo, con la costura de `padron`
design §5: `DatosDeEdicionDeLugar` no tiene campo `tipo`, asi que el caso de
uso no puede suministrarlo ni omitirlo — no lo conoce.

---

## 8. Decision 7 — Residencias: temporalidad, concurrencia, colapso

### `date`, no `timestamptz`

**Correccion a la forma indicativa de la propuesta.** `AGENTS.md` dice
"columnas de momento: `timestamptz`" y en el mismo bloque "fecha civil
siempre por `shared/lib/fecha`". Una residencia empieza en una **fecha
civil**: la operadora teclea "3 de marzo de 2019" y la constancia de vecindad
la imprime. Guardada como `timestamptz`, el servidor en UTC la escribe
`2019-03-03T00:00:00Z` y `America/Merida` la lee **2019-03-02** — el bug
exacto que esa seccion de `AGENTS.md` describe con el folio del 31 de
diciembre, sobre un dato que va en un documento oficial.

`date({ mode: "string" })` en Drizzle: `"2019-03-03"`, sin zona que
reinterpretar en ningun borde. El CHECK de vigencia, el orden y el indice
parcial funcionan igual sobre `date`.

**Consecuencia:** hace falta "hoy en Merida", y `shared/lib/fecha` **no
existe** —se verifico: `src/shared/lib/` tiene solo `errores.ts` y
`registroDeError.ts`—, aunque `AGENTS.md` ya lo prescribe. Este cambio lo
crea: `hoyEnMerida(): string` con `Intl.DateTimeFormat("en-CA", { timeZone:
"America/Merida" })`, ~25 lineas con su test. No es dependencia nueva
(`Intl` es del runtime) y no es alcance inventado: es la pieza que la regla
ya exigia y que nadie habia necesitado todavia.

**`creadoEn timestamptz` ademas de `desdeEn`.** Con granularidad de dia, dos
residencias abiertas el mismo dia empatan y la regla de desempate de la
decision 13 —"la mas reciente"— no tiene con que resolver. `creadoEn` es lo
que la hace determinista. La regla exacta la fija `sdd-spec`; este diseno
aporta la columna sin la cual ninguna regla es implementable.

### Mudanza: una transaccion, y la concurrencia la resuelve el indice

`registrarMudanza(personaId, domicilioId, contexto)`:

1. **Fuera de la transaccion:** `lecturaDePersonas.terminalDe(personaId)`.
   `null` → `NoEncontradoError` (404, nunca 403 — invariante 1).
2. `withTenant(ayuntamientoId, tx => {`
   1. `UPDATE residencias SET hasta_en = $hoy WHERE persona_id = $T AND hasta_en IS NULL RETURNING id`
   2. `INSERT residencias (persona_id = $T, domicilio_id = $D, desde_en = $hoy) RETURNING id`
   3. `registrar(tx, { accion: "CERRAR_RESIDENCIA", entidadId: <id cerrada> })` si hubo
   4. `registrar(tx, { accion: "ABRIR_RESIDENCIA", entidadId: <id nueva> })`
   `})`

Se guarda **el terminal**, no lo que mando la UI — mismo criterio que
`fusionarPersonas` (`padron` design §4 paso 1): se opera sobre terminales y
el caso "mudar a alguien que ya es perdedor" desaparece sin rechazarlo.

**Concurrencia: sin lock explicito.** Dos mudanzas simultaneas de la misma
persona se serializan solas. Si habia una residencia abierta, el segundo
`UPDATE` bloquea sobre la misma fila hasta que el primero confirma. Si no
habia ninguna, los dos `INSERT` compiten y el segundo bloquea sobre
`residencias_una_abierta_idx` hasta el COMMIT del primero y despues falla con
violacion de unicidad. En los dos caminos, el estado final es una sola
abierta y el segundo llamador recibe un error, que es la respuesta correcta.
El indice parcial **es** el mecanismo de concurrencia; un advisory lock seria
una segunda garantia de la misma cosa, con el riesgo de que las dos se
crucen.

**Dos trazas y no una.** `bitacora.entidadId` es un uuid y una mudanza toca
dos filas; una traza `MUDANZA` solo puede citar una y pierde cual se cerro.
Contrasta a proposito con `padron`, que registra un solo `FUSIONAR_PERSONA`
para dos UPDATE: ahi las dos escrituras son una decision sobre **una**
entidad (la perdedora); aca son dos filas con vigencias distintas que Fase 2
va a tener que citar por separado cuando se cuestione una constancia. Efecto
util: la primera residencia de alguien produce exactamente una traza, asi que
la forma es uniforme.

### El camino de lectura del colapso, concreto

`historialDeResidencias(personaId, contexto)`:

1. Fuera de la transaccion: `identidades = await lecturaDePersonas.identidadesDe(personaId)`.
   Vacio → `NoEncontradoError`.
2. `withTenant(… tx => repositorio.historialDe(tx, identidades))`, que es un
   `WHERE persona_id IN (…)` con join a `domicilios`, ordenado por
   `desde_en DESC, creado_en DESC`.
3. La "residencia vigente" es la primera fila con `hasta_en IS NULL` de ese
   mismo orden. **Ninguna escritura**: si una identidad fusionada tiene dos
   abiertas, la base las conserva y la lectura elige. Revertir la fusion no
   necesita nada porque nada se reescribio (decision 13).

Es un `IN` sobre una lista de tamano "cuantas personas se fusionaron en
esta", que en la practica es 1 o 2. **No medido**, y no hay razon para
medirlo a este volumen.

---

## 9. Decision 8 — Reparenteo y renombre: el mecanismo de no tocar nada

`reparentearLugar(lugarId, nuevoPadreId | null, contexto)`, todo en un
`withTenant`:

1. `puedeReestructurarTerritorio(rol)` → `NoAutorizadoError`. Funcion nueva
   en `shared/auth/roles.ts` junto a `puedeFusionarPersonas`, misma forma
   (`rol === "ADMIN_MUNICIPAL"`), y su fila en la tabla de `roles.test.ts`
   que recorre `ROLES` entero.
2. Leer las dos filas. Cualquiera ausente → `NoEncontradoError`. RLS ya
   garantiza que un lugar de otro municipio "no existe".
3. `puedeContener(padre.tipo, hijo.tipo)` → `JerarquiaInvalidaError`
   (dominio). Con `nuevoPadreId = null` el paso se saltea: cualquier tipo
   puede ser raiz (raggedness), y los de rango 0 solo pueden serlo.
4. `UPDATE lugares SET padre_id = $nuevo, actualizado_en = now() WHERE id = $lugar`
   — **una fila**.
5. `registrar(tx, { accion: "REPARENTEAR_LUGAR", entidadId: lugarId })`.

`renombrarCalle` es el mismo esqueleto con un `UPDATE nombre` y
`RENOMBRAR_CALLE`. El unico rechazo propio es el choque contra
`calles_tenant_lugar_nombre_idx`.

**Que le pasa a domicilios y residencias: nada, y es estructural, no una
promesa.** `domicilios.lugarId` guarda el id del lugar y `domicilios.calleId`
el id de la calle. Reparentear cambia `lugares.padreId`; renombrar cambia
`calles.nombre`. Ninguna de las dos columnas aparece en `domicilios` ni en
`residencias`, asi que **no hay UPDATE que omitir** — no es que se decidio no
propagar, es que no hay nada que propagar. La direccion compuesta se
**deriva** en la lectura recorriendo hacia arriba desde `lugarId` y
resolviendo los tres `calleId`; nunca se almacena como texto.

El test que lo fija no es "verificar que el caso de uso no escribe" —eso es
testear la implementacion— sino de integracion y por comportamiento: contar
filas de `domicilios` y `residencias` y comparar `xmin` antes y despues de un
reparenteo, y verificar que el subarbol del nuevo padre ahora incluye los
domicilios del nodo movido. Lo primero prueba que no se toco; lo segundo, que
el movimiento surtio efecto igual.

**La consecuencia que se hereda a Fase 2 (decision 11)** —la constancia
congela el texto de la direccion al emitir— es exactamente porque la
direccion es derivada: re-derivarla despues de un reparenteo da otra cadena, y
el invariante 2 dice que un documento emitido no se modifica. Queda escrito
aca porque es donde se ve el mecanismo; Fase 2 apunta a este parrafo.

**La baja de un lugar** rechaza si tiene hijos activos o domicilios
colgados. Vive en `application` y no en un FK: la comprobacion son dos
`SELECT count`, y un `ON DELETE RESTRICT` no aplica porque la baja es logica
y Postgres no la ve como un DELETE.

---

## 10. Decision 9 — Exportacion: cuatro porciones planas

```ts
// territorio/composicion.ts
export const porcionesDeTerritorio: readonly PorcionExportable[] = [
  { nombre: "lugares", leer: (tx) => tx.select({ /* una por una */ }).from(lugares) },
  { nombre: "calles", … }, { nombre: "domicilios", … }, { nombre: "residencias", … },
];

// src/app/exportacion/porciones.ts
export const porciones: readonly PorcionExportable[] = [
  porcionDePadron,
  ...porcionesDeTerritorio,
];
```

**Cuatro y no una vista compuesta "domicilio con residentes".** El archivo es
el archivo municipal y un join denormalizado **pierde filas**: un domicilio
sin residentes desaparece de un inner join, y la decision 17 dice que una casa
deshabitada es un registro valido. Cuatro conjuntos planos conservan cada fila
y los joins se reconstruyen por id, que es ademas la forma que ya tiene
`conjuntosDePlataforma` en `exportar.ts` — un conjunto por tabla.

**El guard de `nombre` duplicado** (`agregarPorciones.ts:37`, que lanza) se
respeta: `lugares`, `calles`, `domicilios` y `residencias` no chocan con
`usuarios`, `bitacora` ni `personas`. Se verifico contra
`conjuntosDePlataforma`. Un `select()` pelado esta prohibido y hay test
—clonar `composicion.test.ts` de `padron`, con su `tx` fabricado a mano, sin
Postgres.

`residencias` exporta `personaId` crudo: es un uuid, el conjunto `personas`
ya va en el mismo archivo, y esconderlo dejaria un historial que no se puede
leer. `domicilios.referencia` va tal cual — es texto libre de orientacion
("casa azul junto a la tienda") y es del propio municipio. Sin guarda de rol
nueva: `puedeExportar` ya cierra la exportacion entera aguas arriba.

---

## 11. Decision 10 — Cero `"use client"`, y la lista cerrada de `AGENTS.md`

`docs/06-frontend.md` §2 pide justificar cada `"use client"` y ponerlo en la
hoja. Este cambio **no necesita ninguno**, y las dos piezas que parecian
exigirlo no lo hacen:

- **El arbol navegable.** Expandir y colapsar es `<details>/<summary>`, HTML
  nativo, cero JavaScript. Un arbol con estado en Zustand es la alternativa
  descartada: agrega bundle a la pantalla mas cargada del modulo para
  reimplementar un elemento que el navegador ya trae, contra el objetivo de
  "< 2.5 s en 3G/4G rural" de `06-frontend.md` §10.
- **Los tres selectores de calle.** La decision 4 dice "se captura eligiendo
  de una lista, no escribiendo": `<select>` nativo poblado en servidor desde
  el catalogo cerrado, dentro de un `<form action>` nativo. Sin hook, sin
  fetch de cliente.

**Y eso obliga a tocar `AGENTS.md`, explicitamente.** Con formularios nativos
en Server Components y ningun componente cliente leyendo el retorno, las
Server Actions no pueden devolver `ActionResult<T>` de forma util —solo
`useActionState` lo lee y esa API exige `"use client"` alrededor de la propia
accion—, asi que transportan el error por `redirect` + `searchParams`. Eso es
la excepcion "formulario nativo sin `use client`", que es una **lista
cerrada**: hoy tiene dos entradas y "una segunda no entra sin agregarse a esta
lista".

`territorio` agrega **ocho**: `altaDeLugar`, `editarLugar`, `darDeBajaLugar`,
`reparentearLugar`, `altaDeCalle`, `renombrarCalle`, `altaDeDomicilio`,
`registrarMudanza`.

Ocho bullets nuevos copiando el mismo parrafo es el antipatron 23 del propio
archivo —la misma explicacion repetida— y ademas vuelve la lista ilegible
justo cuando mas hace falta poder contarla. **Se propone reformar esa seccion
de `AGENTS.md`:** la justificacion queda escrita **una vez** como condicion
(`<form action>` nativo en Server Component, ninguna hoja cliente leyendo
*esa* accion) y el padron pasa a ser una **tabla** `accion | modulo | forma
del formulario`, donde las dos entradas actuales se mudan sin perder sus
notas —el caso interesante de `altaDePersonaAction`, que convive con una hoja
`"use client"` que llama a *otra* accion, se conserva como nota de su fila.
La propiedad que la lista tiene que preservar se preserva: una accion que no
esta en la tabla sigue siendo hallazgo, y agregar la novena sigue exigiendo
tocar el archivo.

Es una reforma de un archivo de reglas y por eso se declara en vez de
hacerse callado: mismo criterio con el que `padron` design §6 corrigio
`module-template.md`. ~30 lineas, en la rebanada 3, con la primera Server
Action del modulo. **Si el usuario prefiere los ocho bullets, la decision se
revierte sin tocar codigo.**

**Composicion de pantallas.** El historial de residencias de una persona
necesita `padron` y `territorio` a la vez. No lo compone ninguno de los dos
modulos —seria una arista entre modulos que hoy no existe y que fabricaria
una direccion de dependencia permanente— sino
`src/app/(panel)/padron/[id]/page.tsx`, importando los dos barrels.
`src/app` es la unica capa que conoce todos los modulos (`padron` design §7,
mismo argumento que la composicion de exportacion).

---

## 12. Flujo de datos

```
MUDANZA
  ui/FormularioDeMudanza  (Server Component, <form action>)
    └─► registrarMudanzaAction  (Server Action)
          ├─ Zod safeParse en la primera linea      ids como uuid
          ├─ contextoActual()                        tenant del servidor
          └─► registrarMudanza                      application/
                ├─ puedeEscribir(rol)?          →  NoAutorizadoError
                ├─ lecturaDePersonas.terminalDe(id)   FUERA de withTenant (§6)
                │    └─ padron.personaPorId → su propio withTenant
                │       null → NoEncontradoError (404, nunca 403)
                └─ withTenant(tx =>                UNA transaccion
                     UPDATE residencias SET hasta_en = hoy … RETURNING id
                     INSERT residencias (… desde_en = hoy) RETURNING id
                       └─ residencias_una_abierta_idx  ← la concurrencia
                       └─ residencias_persona_tenant_fk ← el otro municipio
                     registrar(CERRAR_RESIDENCIA) + registrar(ABRIR_RESIDENCIA))

SUBARBOL  ("todos los domicilios del sector 3")
  WITH RECURSIVE descendientes AS (
    SELECT id, 0 AS profundidad FROM lugares WHERE id = $raiz
    UNION ALL
    SELECT l.id, d.profundidad + 1 FROM lugares l
      JOIN descendientes d ON l.padre_id = d.id
     WHERE d.profundidad < 8                      ← cinturon, no la garantia
  )
  SELECT … FROM domicilios WHERE lugar_id IN (SELECT id FROM descendientes)
  -- RLS acota las dos ramas: la semilla y el paso recursivo corren con
  -- app.tenant fijado, asi que el arbol no puede cruzar municipios.

POR CALLE  ("todos los domicilios de la Calle 21")
  SELECT … FROM domicilios WHERE calle_id = $calle    ← sin CTE, atraviesa
                                                        las manzanas que sea

HISTORIAL DE UNA IDENTIDAD FUSIONADA
  identidadesDe(id)  →  [A, B]      un salto, invariante de padron §4
    └─ withTenant(tx => WHERE persona_id IN (A,B)
                        ORDER BY desde_en DESC, creado_en DESC)
       vigente = primera con hasta_en IS NULL       la lectura desempata,
                                                    la base no reescribe nada
```

---

## 13. Archivos

| Archivo | Accion | Rebanada |
|---|---|---|
| `padron/application/puertos.ts` (`identidadesDe`) · `infrastructure/repositorioDePersonasSql.ts` | Modificar | 1 |
| `padron/application/{personaPorId,identidadesDePersona,index}.ts` + tests | Crear/Modificar | 1 |
| `padron/composicion.ts` · `padron/index.ts` (reexport nombrado de `PersonaId`) | Modificar | 1 |
| `padron/superficiePublica.test.ts` (assertion de `normalizarParaBusqueda`) | Modificar | 1 |
| `padron/lecturaCompuesta.integration.test.ts` (colapso + no anidar `withTenant`) | Crear | 1 |
| `territorio/{index,types,composicion}.ts` | Crear | 2 |
| `territorio/domain/{identificadores,tipoDeLugar,index}.ts` + tests | Crear | 2 |
| `territorio/infrastructure/{esquema,index}.ts` | Crear | 2 |
| `drizzle/0007_territorio.sql` (4 tablas, `FORCE`, `GRANT`, FK a mano) | Crear | 2 |
| `territorio/{lugares,calles,domicilios,residencias}.isolation.test.ts` | Crear | 2·4·5·6 |
| `territorio/superficiePublica.test.ts` | Crear | 2 |
| `territorio/application/{puertos,altaDeLugar,editarLugar,darDeBajaLugar,reparentearLugar,subarbol}.ts` + tests | Crear | 3 |
| `territorio/infrastructure/repositorioDeLugaresSql.ts` (CTE) | Crear | 3 |
| `territorio/ui/` arbol + acciones · `src/app/(panel)/territorio/page.tsx` | Crear | 3 |
| `shared/auth/roles.ts` (`puedeReestructurarTerritorio`) + su fila en `roles.test.ts` | Modificar | 3 |
| `AGENTS.md` (excepcion de `ActionResult<T>` como tabla, §11) | Modificar | 3 |
| `territorio/application/{altaDeCalle,renombrarCalle,listarCalles}.ts` + UI | Crear | 4 |
| `territorio/domain/direccion.ts` · `application/altaDeDomicilio.ts` · consultas por zona y calle + UI | Crear | 5 |
| `shared/lib/fecha.ts` (`hoyEnMerida`) + test | Crear | 6 |
| `territorio/domain/residencia.ts` · `application/{registrarMudanza,historialDeResidencias,residentesDe}.ts` + UI | Crear | 6 |
| `territorio/infrastructure/lectorDePersonasPorPadron.ts` | Crear | 6 |
| `src/app/(panel)/padron/[id]/page.tsx` (composicion de los dos barrels) | Crear | 6 |
| `porcionesDeTerritorio` · `src/app/exportacion/porciones.ts` | Crear/Modificar | 7 |

---

## 14. Estrategia de pruebas

| Capa | Que | Como |
|---|---|---|
| Unit (domain) | `puedeContener` sobre las **25** combinaciones recorriendo `TIPOS_DE_LUGAR`, con los dos casos de rango 0 nombrados (`cabecera↛comisaria` y al reves); constructores de id rechazando no-UUID; tres calles distintas; vigencia `hastaEn >= desdeEn` | Sin base. Forma de tabla de `roles.test.ts`: un sexto tipo hace **faltar** una fila, no heredar un permiso |
| Unit (application) | Guardas de rol (`puedeReestructurarTerritorio` vs `puedeEscribir`); `null` del puerto → `NoEncontradoError`; **orden de llamada: el puerto de `padron` se invoca antes de abrir `withTenant`** (§6); `tipo` ausente del tipo de edicion | Puertos mockeados. El test de orden es el que protege contra el anidamiento |
| Integration | Un `residencias` con `persona_id` del otro municipio lo **rechaza Postgres** nombrando `residencias_persona_tenant_fk`; dos mudanzas concurrentes → una falla nombrando `residencias_una_abierta_idx`; subarbol devolviendo los domicilios del propio sector **y** los de sus manzanas; consulta por calle cruzando manzanas; reparenteo/renombre con conteo y `xmin` intactos en `domicilios`/`residencias`; ciclo intentado por el caso de uso → rechazo; `padre_id = id` por SQL directo → rechazo; segunda `cabecera` → rechazo; historial de identidad fusionada devolviendo ambos ids ordenados; reversion de la fusion devolviendo cada residencia | Postgres real, `sembrar()`, dos tenants |
| Aislamiento | **Cuatro** archivos, uno por tabla, forma canonica de `invariantes-criticos.md` Capa 2 | Consulta deliberadamente sin filtro + id conocido del otro tenant |
| Disciplina | `identidadPorPuerto.test.ts` **sin cambios** sigue verde con `territorio` presente (verificar, no asumir); `territorio/superficiePublica.test.ts`; `porcion.nombre` unicos; `pnpm layers` | Tests de repo |

Cobertura sobre `unit` + `integration` juntas, en el job con base.
`vitest.config.ts:94` incluye `src/modules/**/{domain,application}/**`, asi que
todo `territorio/domain` y `territorio/application` cuenta —
`infrastructure/esquema.ts` no, porque el `include` no lo alcanza (a
diferencia de `shared`, que si necesita su `exclude` explicito). Piso 80/75.
Cada caso de uso es una funcion delgada con una o dos ramas; se cubren con
sus tests unitarios de puertos mockeados, y por TDD estricto cada uno llega
en el mismo commit que su test.

---

## 15. Matriz de amenazas

`N/A` — el cambio no toca routing de shell, subprocesos, automatizacion de
git/PR, clasificacion de archivos ejecutables ni integracion de procesos.
Las cinco filas de `references/threat-matrix.md` son de esa clase. Las rutas
nuevas son paginas de App Router y su frontera —tenant desde el contexto de
servidor, 404 y no 403 por id ajeno— es el invariante 1, probado en los
escenarios de aislamiento y no aca.

---

## 16. Migracion y despliegue

Sin migracion de datos: las cuatro tablas nacen vacias. **Sin extensiones
nuevas** —`WITH RECURSIVE` es SQL estandar—, asi que el bloqueante 2 de la
propuesta sigue condicional y sin verificar, y este diseno **no lo activa**.
`FORCE ROW LEVEL SECURITY`, los `GRANT` y el FK compuesto a mano van en el
**mismo** `drizzle/0007_territorio.sql` que crea las tablas, nunca en uno
posterior. Rollback segun la propuesta, en sus dos regimenes.

---

## 17. Verificacion del corte

**Un hallazgo sobre el orden.** La propuesta dice *"Rebanadas 2–7 dependen de
la 1 mergeada"*. No es cierto por este diseno: el puerto de lectura de
`padron` lo consume **solo** `registrarMudanza`/`historialDeResidencias`, o
sea la rebanada 6. Las rebanadas 2, 3, 4 y 5 —jerarquia, calles, domicilios—
no lo tocan. La dependencia real es **1 antes de 6**, y **4 antes de 5**. La 1
se deja igual en primer lugar por el argumento que ya dio la propuesta (es un
diff en otro modulo y tiene que leerse como lo que es), pero ahora se sabe que
puede correrse si algo la traba, sin bloquear cinco rebanadas.

Ajustes de tamano que introduce este diseno: la rebanada 1 crece (dos
lecturas, no una: +80); el generico de ids ahorra ~60 en la 2; las rejas
nuevas —`lugares_una_cabecera`, `domicilios_calles_distintas`,
`lugares_sin_autopadre`, tope de profundidad, el quinto tipo— suman ~105
entre esquema y tests; `AGENTS.md` suma ~30 en la 3; `shared/lib/fecha.ts`
suma ~50 en la 6; cero `"use client"` con `<details>`/`<select>` nativos
resta ~80 de UI.

| # | Contenido | Lineas |
|---|---|---|
| 1 | `personaPorId` + `identidadesDePersona` + reexport de `PersonaId` + assertion de superficie + test de no-anidamiento | ~180 |
| 2 | `lugares` + `calles` + `domicilios` + `residencias` en esquema, migracion con RLS/`FORCE`/`GRANT`/FK a mano, dominio de tipos e ids, aislamiento de `lugares` | ~640 |
| 3 | Casos de uso de lugares, CTE de subarbol, arbol UI, `puedeReestructurarTerritorio`, reforma de `AGENTS.md` | ~640 |
| 4 | Catalogo de calles: casos de uso, selector, aislamiento | ~460 |
| 5 | Domicilios: direccion compuesta, consulta por zona y por calle, aislamiento | ~620 |
| 6 | `shared/lib/fecha`, mudanza atomica, colapso de fusion, historial, adaptador de `padron`, aislamiento | ~600 |
| 7 | Cuatro porciones + composicion + guarda de `select()` pelado | ~140 |
| | **Total** | **~3.280** |

Siete rebanadas, ninguna sobre 800, **secuenciales contra `main` y no
apiladas** (`CLAUDE.md`: "Un PR, un merge. Las ramas no se apilan").

La rebanada 2 es la unica que crea cuatro tablas de golpe. Se deja asi a
proposito: partirla dejaria una migracion intermedia donde `residencias`
existe sin el FK compuesto contra `personas`, que es exactamente el bypass
entre municipios que este cambio existe para cerrar. Un diff largo que toca
tenancy una sola vez se revisa mejor que dos diffs cortos con una ventana
insegura en medio.

---

## 18. Supuestos y lo que no se midio

- **No medido: el anidamiento de `withTenant` se traba con `DB_POOL_MAX=1`**
  (§6). Deducido de `withTenant.ts:39` y `vitest.config.ts:64`, no ejecutado.
  El test que lo decide va en la rebanada 1 y es barato. Si resulta que no se
  traba, la decision de llamar al puerto fuera de la transaccion **se sostiene
  igual** por el consumo de dos conexiones del pool en produccion.
- **No medido: el CTE recursivo.** A proposito — cientos de nodos por
  municipio (decision 1 de la propuesta). Si Fase 6 mide mal, `ltree` o una
  tabla de cierre son aditivos y **ahi** aplica el bloqueante 2.
- **No medido: el `IN` del historial de una identidad fusionada.** El tamano
  esperado de la lista es 1 o 2.
- **No medido: `personas.fusionada_en` no tiene indice** y
  `identidadesDe` filtra por ahi. Acotado por RLS al tenant y por el volumen
  del padron municipal. Un indice parcial es aditivo si alguna vez se mide.
- **Supuesto declarado: la cabecera es una sola por municipio.** Es lo que
  fija `lugares_una_cabecera`. Viene de la decision del usuario, no de una
  muestra territorial del piloto.
- **Sigue sin muestra el contenido del catalogo** (cuantas calles, si las
  comisarias numeran aparte). No bloquea: son datos, no esquema. La forma ya
  no depende de la muestra porque la pregunta que si dependia —como se
  representa la cabecera— quedo cerrada.
- **Reforma de `AGENTS.md` (§11): decision de este diseno, revertible.** Si
  se prefieren ocho bullets, no cambia una linea de codigo.

## 19. Preguntas abiertas

- [x] **Como se representa la cabecera municipal.** Cerrada por decision del
      usuario: `tipo = 'cabecera'`, rango 0 junto a `comisaria`,
      `calles.lugarId` pasa a `NOT NULL`. Supera la pregunta abierta de la
      propuesta.
- [ ] **La regla de desempate exacta** entre dos residencias abiertas de una
      identidad fusionada. Este diseno aporta la columna que la hace
      determinista (`creadoEn`) y propone `desde_en DESC, creado_en DESC`; la
      fija `sdd-spec` con su escenario.
- [ ] **Si `domicilios.referencia` necesita acotarse** (invariante 3). El
      diseno la deja como texto libre de orientacion, sin categoria: la
      propuesta remite a `sdd-spec`.
