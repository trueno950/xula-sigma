# Diseno: Padron ciudadano (Fase 1a)

**Cambio:** `padron-ciudadano` · **Base:** `openspec/changes/padron-ciudadano/proposal.md`
· **ADR:** `docs/adr/0002-busqueda-de-personas.md`, ADR 0001 §2 §5

Este documento no reabre ninguna decision de la propuesta ni del ADR 0002.
Resuelve las seis que quedaron abiertas: como se hace fallar la disciplina
del puerto, donde se escribe la columna normalizada, el algoritmo de
redireccion colapsada, la ubicacion de los puertos, el punto de composicion
de exportacion, y el umbral de la sugerencia, ya medido.

---

## 1. Enfoque tecnico

Modulo `src/modules/padron/` con las cuatro capas y `composicion.ts` en la
raiz, siguiendo `marca` y no el snippet ilustrativo de
`module-template.md`. `domain` es puro y ademas es donde vive la
normalizacion, porque la misma funcion tiene que correr sobre la fila que
se guarda y sobre la cadena que se busca: si fueran dos implementaciones,
la comparacion no significa nada.

El eje del diseno no es el esquema —el esquema ya lo fijo la propuesta— es
**que la identidad de una persona solo se resuelva por un camino**. Todo lo
que sigue existe para que el segundo camino no compile, o falle un test.

---

## 2. Decision 1 — Como se hace fallar el join crudo

La propuesta marca esto Alta y pide un mecanismo. La respuesta honesta
tiene tres capas y **la tercera no cierra del todo**; se declara.

| Capa | Mecanismo | Que cierra | Que no |
|---|---|---|---|
| A | `personas` vive en `padron/infrastructure/esquema.ts` y el barrel `padron/index.ts` exporta solo `application`, `types` y `ui` | La regla `modulo-no-importa-interior-de-otro` de `.dependency-cruiser.cjs:59` **ya** rompe el build ante `import { personas } from "@/modules/padron/infrastructure/esquema"`. No hace falta regla nueva | Nada, mientras el barrel no crezca |
| B | El FK compuesto de un modulo futuro hacia `personas` se escribe **a mano en la cola de la migracion**, no en Drizzle | Sin el objeto de tabla, `tx.select().from(personas)` y `.leftJoin(personas, ...)` **no se pueden escribir**: Drizzle exige el objeto. El FK existe en Postgres igual | Nada del lado tipado |
| C | Test de disciplina que escanea `src/**` fuera de `src/modules/padron/` buscando `persona_id` y `personas` dentro de plantillas `` sql`` `` | El SQL crudo por texto, que es lo unico que queda | Un nombre de tabla armado dinamicamente, y un `.sql` de `scripts/`. **Queda abierto y se declara** |

**Por que la capa B y no exportar la tabla.** Exportarla desde el barrel
para que `constancias` pueda declarar su FK compuesto vuelve inutil la capa
A: el dia que `padron/index.ts` diga `export * from "./infrastructure"`, la
regla de dependency-cruiser sigue verde —importar el `index.ts` de otro
modulo esta permitido— y el join crudo pasa a ser legal. Escribir el FK en
la cola de la migracion es el mismo mecanismo que ya usan `FORCE ROW LEVEL
SECURITY` y los `GRANT` (`drizzle/0001_auth.sql`), y sobrevive a
`db:generate` porque drizzle-kit diffea contra su snapshot, no contra la
base.

**Por que no una regla de dependency-cruiser nueva.** No existe. La regla
que haria falta ya esta escrita y ya cubre el caso; agregar una segunda que
diga lo mismo es una copia que diverge.

**Por que no un GRANT de Postgres.** Toda la aplicacion se conecta con un
solo rol (`withTenant.ts`). Postgres no distingue modulos dentro del mismo
rol. Un segundo rol seria una cuarta salida de tenancy, y AGENTS.md regla 2
la prohibe sin actualizar antes la regla y ADR 0001 §2.

**Lo que se agrega, entonces:** un test —no una regla— y una guarda sobre
el barrel.

- `padron/superficiePublica.test.ts`: afirma que el barrel no exporta
  ningun objeto de tabla Drizzle. Es la unica cosa que sostiene la capa A,
  y hoy nada la sostiene.
- `padron/identidadPorPuerto.test.ts`: la capa C. Hoy pasa en vacio; falla
  el dia que el primer modulo de Fase 2 escriba `persona_id` en SQL crudo.

**Declaracion honesta:** ninguna de las tres capas impide que un modulo
futuro llame al puerto y despues ignore el `id` resuelto. Eso no lo cierra
ningun mecanismo estatico; lo cierra el escenario de aislamiento que Fase 2
tenga que escribir. Se anota como limite, no como resuelto.

---

## 3. Decision 2 — Umbral y tope de la sugerencia: NO MEDIDOS

**Bloqueado.** Esta fase corrio sin herramienta de shell, asi que el spike
no se pudo ejecutar. Elegir 0.45 "porque suena razonable" seria exactamente
lo que el ADR 0002 existe para no hacer, asi que no se elige.

Lo que si se dejo listo: una extension de la medicion que responde las dos
preguntas. **No modifica `scripts/spike-busqueda-personas.sql`.**

Archivo: `spike-sugerencia-captura.sql` (scratch, ver el reporte de la
fase). Reproduccion:

```
docker exec -i xula-pg psql -U postgres -d postgres \
  -c "DROP DATABASE IF EXISTS spike_padron WITH (FORCE)" \
  -c "CREATE DATABASE spike_padron"
docker exec -i xula-pg psql -U postgres -d spike_padron \
  < scripts/spike-busqueda-personas.sql
docker exec -i xula-pg psql -U postgres -d spike_padron \
  < <ruta>/spike-sugerencia-captura.sql
```

Que mide, y por que no alcanzaba lo que ya midio el ADR: la tabla de la
seccion 5 del ADR pesa recall contra candidatos sobre **consultas de nombre
completo**, donde un falso positivo cuesta un scroll. La sugerencia corre
sobre lo que la operadora lleva tecleado y el falso positivo cuesta
atencion en cada alta. La extension agrega la clase `tecleando` —nombre de
pila + los primeros cuatro caracteres del apellido paterno— y reporta, por
umbral de 0.30 a 0.80: `lo_devuelve_pct`, `ruido_prom` (personas
equivocadas mostradas por alta), `altas_con_ruido_pct` y `candidatos_max`;
mas una tabla de tope 1..10 cruzada con umbral, sobre posicion pesimista.

**Regla de decision, fijada para que el numero no se elija por gusto:** el
umbral de sugerencia es el **mayor** valor que mantiene
`lo_devuelve_pct >= 95%` en la clase `tecleando`; el tope es el **menor** N
con `lo_ve_la_operadora_pct >= 95%` a ese umbral.

**Medido. Resultado: umbral 0.30, tope 5.**

| Umbral (clase `tecleando`) | Lo devuelve | Ruido promedio |
|---|---|---|
| **0.30** | **97.8%** | **0.32** |
| 0.35 | 81.0% | 0.06 |
| 0.40 | 50.8% | 0.03 |
| 0.45 | 24.0% | 0.02 |

Tope a 0.30: con 1 resultado la operadora ve al correcto en 96.6% de los
casos y con 2 en el 100%. Se fija 5, que cubre la cola sin costo.

**El supuesto que traia esta seccion era falso.** Decia que el umbral de
sugerencia seria *distinto* del 0.30 de busqueda porque los costos son
distintos. Los costos siguen siendo distintos; el numero no. Subirlo a 0.35
cuesta 17 puntos de recall sobre un nombre a medio escribir y ahorra 0.26
candidatos falsos por alta.

De donde salia el supuesto: el ruido promedio a 0.30 sobre **todas** las
clases es 3.33, y eso asusta. Lo carga la clase de nombre completo con
abreviaturas, que es la consulta de la busqueda. Desagregado, la clase que
manda aca tiene 0.32. Es la misma trampa que el ADR 0002 documenta en su
seccion 4 con el diccionario de abreviaturas.

Lo que si se sostiene de aquel parrafo: **el umbral de sugerencia vive en
su propio valor nombrado**, no en una constante compartida con la busqueda.
Hoy coinciden; son dos decisiones distintas y una puede moverse sin la
otra.

Este numero era prerrequisito de la rebanada de duplicados. Ya no bloquea.

---

## 4. Decision 3 — Redireccion colapsada

### Forma

Dos columnas, no una:

```
fusionadaEn         uuid null   -- LA RESPUESTA: el ganador terminal
fusionadaDirectoEn  uuid null   -- EL REGISTRO: contra quien se fusiono
```

Ambas con FK compuesto `(columna, ayuntamientoId) -> (id, ayuntamientoId)`.

**Por que dos.** Con una sola, la reversion es silenciosamente incompleta:
si A→B y despues B→C colapsa A a C, revertir B→C no puede devolver A a B
porque ese dato ya no existe en ninguna parte. La propuesta promete
"reversible"; con una columna la promesa se cumple solo en el caso simple.
`fusionadaDirectoEn` es lo que se necesita para des-colapsar, y nunca se
lee en el camino de lectura.

### Invariante

> Toda fila con `fusionadaEn` no nulo apunta a una fila cuyo `fusionadaEn`
> **es** nulo.

Ese enunciado es a la vez la garantia de un salto y la prueba de
aciclicidad: cada arista siempre termina en un nodo sin arista de salida,
asi que no se puede formar un ciclo; y ningun camino tiene largo 2.

No es expresable como `CHECK` (mira otra fila). Se sostiene con un test de
integracion que lo consulta directamente despues de una cadena:

```sql
SELECT count(*) FROM personas p JOIN personas g ON g.id = p.fusionada_en
 WHERE g.fusionada_en IS NOT NULL   -- tiene que dar 0
```

### Algoritmo

`fusionar(perdedoraId, ganadoraId, contexto)`, todo dentro de un solo
`withTenant`:

1. Resolver **las dos** por el resolutor. Se opera sobre los terminales, no
   sobre lo que mando la UI. Elimina el caso "fusionar contra alguien que
   ya es perdedor" sin tener que rechazarlo.
2. Si los terminales coinciden → ya estan fusionadas, no-opera. Cubre la
   auto-fusion (ciclo de largo 1).
3. `UPDATE personas SET fusionada_en = G WHERE fusionada_en = P` — el
   colapso. Reengancha a los que ya apuntaban a P.
4. `UPDATE personas SET fusionada_en = G, fusionada_directo_en = G WHERE id = P`.
5. `registrar(tx, { accion: "FUSIONAR_PERSONA", entidad: "personas",
   entidadId: P })`, en la misma `tx`. Solo ids.

O(filas que apuntaban a P) al escribir, un salto al leer.

### Reversion

`revertirFusion(perdedoraId)`:

1. `UPDATE personas SET fusionada_en = NULL, fusionada_directo_en = NULL WHERE id = P`
2. `UPDATE personas SET fusionada_en = P WHERE fusionada_directo_en = P AND id <> P`
   — des-colapsa a los que se habian reenganchado.
3. Traza `REVERTIR_FUSION`.

El invariante se restablece en cada paso porque P vuelve a ser terminal
antes de que nadie lo apunte.

**Limite declarado, que no se puede arreglar aca:** revertir devuelve las
dos personas, no des-calcula lo que otro modulo ya decidio con la identidad
fusionada.

### Cruce de municipios

Imposible por dos mecanismos independientes: el FK compuesto obliga a que
el destino comparta el `ayuntamiento_id` **de la propia fila**, y el UPDATE
corre bajo RLS con `app.tenant` fijado, asi que la fila del otro municipio
ni se ve. El escenario va igual al test de aislamiento: el FK compuesto de
`usuarios` existe porque el bypass entraba de verdad.

---

## 5. Decision 4 — Donde se escribe la columna normalizada

**El puerto de escritura no tiene la columna.** Esa es la costura, y no es
una convencion: es el tipo.

```ts
// application/puertos.ts
type PersonaParaGuardar = {          // NO lleva nombreNormalizado
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
  curp: string | null;
};

type RepositorioDePersonas = {
  guardar(tx, id, ayuntamientoId, persona: PersonaParaGuardar,
          expansiones: ReadonlyMap<string, string>): Promise<void>;
  actualizar(tx, id, persona: PersonaParaGuardar,
             expansiones: ReadonlyMap<string, string>): Promise<void>;
  // ...
};
```

Ni `altaDePersona` ni `editarPersona` pueden suministrarla: no existe en el
tipo que aceptan. La escribe el adaptador —una funcion, en un archivo—
llamando a la funcion de dominio.

Tres cierres, y hacen falta los tres:

1. **Tipo:** el caso de uso no puede pasarla ni omitirla; no la conoce.
2. **Base:** `nombreNormalizado` es `text().notNull()` **sin default**. Un
   INSERT por un camino nuevo que la olvide falla ruidoso en Postgres, no
   guarda vacio.
3. **Test:** integracion que, despues de un alta y despues de una edicion,
   compara la columna contra `normalizarParaBusqueda(...)` recalculado.
   Nada mas prueba que las dos siguen de acuerdo.

**La funcion vive en `domain/normalizarParaBusqueda.ts`** y recibe el
diccionario por parametro —`domain` no importa nada, menos aun un
repositorio—:

```ts
normalizarParaBusqueda(texto: string,
                       expansiones: ReadonlyMap<string, string>): string
```

Se usa en dos lugares y **tiene que ser la misma**: el adaptador al
persistir, y `buscarPersonas` sobre la cadena de consulta, una sola vez
antes de armar el SQL (ADR 0002 §6: en el `WHERE` cuesta 317 ms contra 29).

**Por que no un trigger.** El diccionario de abreviaturas es la mitad de la
normalizacion. Un trigger lo pondria en PL/pgSQL mientras el lado de la
consulta sigue en TypeScript: dos implementaciones de la misma regla, y la
comparacion de trigramas solo significa algo si los dos lados salieron del
mismo codigo. `unaccent` no es el bloqueo aca —un trigger si puede llamar
funciones volatiles— el bloqueo es la duplicacion.

**El catalogo se memoiza por proceso.** Es seguro precisamente porque es
tabla de plataforma sin `ayuntamiento_id`: no hay nada que se pueda filtrar
entre municipios en un mapa `ma→maria`. Es el unico lugar donde la
excepcion paga, y por eso la excepcion se escribe en
`invariantes-criticos.md` en este mismo cambio.

---

## 6. Decision 5 — Puertos, y las correcciones al doc

| Punto | Decision | Por que |
|---|---|---|
| Ubicacion de puertos | **`application/puertos.ts`** | Unico precedente real (`marca`). Un puerto es lo que el caso de uso necesita; `domain` de `padron` no necesita nada de afuera |
| Nombre del esquema | **`infrastructure/esquema.ts`**, exacto | `drizzle.config.ts:31` globea solo ese nombre y "anuncia un conteo de tablas menor y sigue" |
| Adaptador | Objeto literal `repositorioDePersonasSql`, no clase | Precedente `repositorioDeMarcaSql` |

`module-template.md` se corrige en el mismo cambio, en tres lugares, porque
un doc que contradice al codigo es la fuente del cuarto convenio:

- linea 27 y 50: `domain/ports.ts` → `application/puertos.ts`
- linea 35: `schema.ts` → `esquema.ts`, con la razon al lado

La linea 154 (ejemplo con `class`) se anota como divergencia conocida y
**no** se toca en este cambio: es un snippet ilustrativo, no una
prescripcion, y ampliar el alcance del doc infla la rebanada.

---

## 7. Decision 6 — El punto de composicion de exportacion

Un arreglo, no un `switch`.

```ts
// src/app/exportacion/porciones.ts
import { porcionDePadron } from "@/modules/padron";

export const porciones: readonly PorcionExportable[] = [porcionDePadron];
```

Agregar un modulo es un import y un elemento. No hay rama que crezca, no
hay nombre que registrar en dos lados. `src/app` es la unica capa que
conoce todos los modulos (`exportar.ts:161`), y `shared` no puede
importarlos.

`porcionDePadron` se construye en `padron/composicion.ts` —que es donde
vive el cableado— y sale por el barrel como **valor**, no como tabla: el
modulo aporta su porcion sin abrir su interior, que es la capa A de la
seccion 2 otra vez.

`app-no-importa-infrastructure` no se rompe: la regla mira aristas
directas, y `src/app` importa `padron/index.ts`. Es el mismo camino que ya
recorre `marca` (ui → Server Action → `composicion.ts` → infrastructure).

**Un agujero que se encontro de paso:** `conjuntosDe` (`exportar.ts:119`)
asigna por `porcion.nombre` sobre un `Record`. Dos modulos que reclamen el
mismo nombre se pisan **en silencio** y el archivo entregado pierde un
conjunto. Se agrega una guarda en la rebanada 4: un test que afirma que los
`nombre` de `porciones` son unicos. Es tres lineas y hoy no existe.

**Que exporta una persona fusionada:** su fila, con `fusionadaEn` como
columna. El archivo es el archivo municipal; esconder los tombstones borra
la evidencia de que la fusion ocurrio. Columnas listadas una por una,
nunca `select()` pelado.

---

## 8. Flujo de datos

```
ALTA
  ui/FormularioDePersona (Server Component)
    └─► altaDePersona (Server Action)          application/
          ├─ puedeEscribir(rol)?           →  NoAutorizadoError
          ├─ Persona.crear(...)                domain/   curp "" → null
          └─ withTenant(tx =>                  UNA transaccion
               catalogo.leer(tx)               memoizado
               repositorioDePersonasSql.guardar(...)
                 └─ normalizarParaBusqueda()   domain/  ← unica escritura
               registrar(tx, ALTA_PERSONA))    solo ids

SUGERENCIA (hoja "use client", no bloquea)
  input ──► buscarSimilares ──► expandir UNA vez ──► similarity() >= UMBRAL_SUGERENCIA
                                                     LIMIT TOPE, GIN

LECTURA POR ID (lo que consumen las fases 2/3/4/7)
  puerto.buscarPorId(id)
    └─ SELECT ... WHERE id = COALESCE((SELECT fusionada_en FROM personas
                                        WHERE id = $1), $1)     un salto
```

---

## 9. Archivos

| Archivo | Accion | Rebanada |
|---|---|---|
| `src/modules/padron/index.ts` · `types.ts` | Crear | 1 |
| `src/modules/padron/domain/{persona,curp,normalizarParaBusqueda,permisos,index}.ts` | Crear | 1 |
| `src/modules/padron/application/puertos.ts` | Crear | 1 |
| `src/modules/padron/infrastructure/{esquema,repositorioDePersonasSql,catalogoDeAbreviaturasSql,index}.ts` | Crear | 1 |
| `src/modules/padron/personas.isolation.test.ts` | Crear | 1 |
| `src/modules/padron/superficiePublica.test.ts` | Crear | 1 |
| `drizzle/000X_padron.sql` (+`FORCE`, `GRANT`, `pg_trgm`, `unaccent`, semilla) | Crear | 1 |
| `docs/architecture/module-template.md` (27, 35, 50) | Modificar | 1 |
| `docs/architecture/invariantes-criticos.md` (excepcion del catalogo) | Modificar | 1 |
| `src/modules/padron/application/{altaDePersona,editarPersona,darDeBajaPersona,index}.ts` | Crear | 2 |
| `src/modules/padron/ui/` (alta, edicion, listado) | Crear | 2 |
| `src/modules/padron/composicion.ts` | Crear | 2 |
| indice GIN, `application/buscarPersonas.ts`, UI de busqueda | Crear | 3 |
| `fusionadaEn` / `fusionadaDirectoEn`, `fusionarPersonas.ts`, `revertirFusion.ts`, resolutor, sugerencia | Crear | 4 |
| `src/modules/padron/identidadPorPuerto.test.ts` | Crear | 4 |
| `src/app/exportacion/porciones.ts` + `porcionDePadron` | Crear | 5 |

---

## 10. Estrategia de pruebas

| Capa | Que | Como |
|---|---|---|
| Unit (domain) | Normalizacion, expansion, CURP `""`→`null`, permisos | Sin base. Piso 80% |
| Unit (application) | Rol, validacion, orden de la transaccion | Puertos mockeados |
| Integration | Aislamiento (T1/T3/T4/T5), CURP unica por municipio, columna normalizada tras alta y edicion, invariante de un salto, cadena A→B→C, reversion, redireccion que no cruza municipios | Postgres real, dos tenants, `sembrar()`/`sembrarGente()` |
| Integration | Plan de ejecucion con `Bitmap Index Scan` sobre el GIN | `EXPLAIN` en el test de busqueda |
| Disciplina | Barrel sin tablas; sin `persona_id` en SQL crudo fuera de `padron`; nombres de porcion unicos | Tests de repo (§2, §7) |

Cobertura sobre `unit` + `integration` juntas, en el job con base.

---

## 11. Matriz de amenazas

`N/A` — el cambio no toca routing de shell, subprocesos, automatizacion de
git/PR, clasificacion de archivos ejecutables ni integracion de procesos.
Las cinco filas de `references/threat-matrix.md` son de esa clase. Las
rutas nuevas son paginas de Next.js App Router; su frontera de seguridad
—tenant desde el contexto de servidor, 404 y no 403 por id ajeno— es el
invariante 1 y se prueba en los escenarios de aislamiento, no aca.

---

## 12. Migracion y despliegue

Sin migracion de datos: el padron nace vacio. `pg_trgm` y `unaccent`,
`FORCE ROW LEVEL SECURITY`, los `GRANT` y la semilla del catalogo van en el
**mismo archivo generado**, nunca en uno posterior. Prerrequisito
operativo: `xula_migrator` tiene que poder `CREATE EXTENSION` en Railway.
Rollback segun la propuesta.

---

## 13. Verificacion del corte

**La costura de la propuesta no se sostiene tal cual.** Un hallazgo:

> "2. Busqueda tolerante — catalogo de abreviaturas y su semilla... La
> columna ya se venia escribiendo, asi que no hay backfill."

El ADR 0002 §9 dice que la columna guardada es "normalizada **y
expandida**". La expansion necesita el catalogo. Si el catalogo entra en la
rebanada 2, la rebanada 1 guarda una columna sin expandir y la 2 **si**
necesita backfill — de la misma columna que este diseno declara
app-escrita, que es el peor lugar posible para un `UPDATE` masivo fuera de
la costura.

**Correccion:** `abreviaturas` y su semilla se mueven a la **rebanada 1**.
Es la entrada de la columna, no de la consulta. La rebanada 2 se queda con
el indice GIN, la consulta con umbral 0.30 y la UI. Desplaza unas 40 lineas
de la 2 a la 1.

Con eso, el resto de la costura si se sostiene:

- La rebanada 4 agrega dos columnas nullable y **no cambia ninguna firma**
  de las anteriores. `buscarPorId` mantiene su tipo; cambia su
  comportamiento, y todavia no hay consumidor externo que dependa del
  anterior.
- La rebanada 5 es aditiva sobre las cuatro.
- La rebanada 3 no reforma a las anteriores porque la columna ya llega
  poblada y expandida.

**Presupuesto con el catalogo movido:** 1 ≈ 520 · 2 ≈ 310 · 3 ≈ 450 ·
4 ≈ 60. La rebanada 1 pasaba las 400 tanto antes como despues de la
correccion.

**Resuelto: el corte final es de cinco rebanadas.** La 1 se parte en dos, y
el criterio no es la aritmetica sino que la parte que toca tenancy se revise
sola:

| # | Contenido | Lineas |
|---|---|---|
| 1 | Esquema, migracion con RLS/`FORCE`/`GRANT` y extensiones, catalogo de abreviaturas, test de aislamiento, dominio, guarda de CURP | ~300 |
| 2 | Alta, edicion, bitacora, UI de alta y listado | ~250 |
| 3 | Indice GIN, expansion, consulta con umbral 0.30, UI de busqueda | ~310 |
| 4 | `fusionadaEn` + `fusionadaDirectoEn`, resolucion colapsada, fusion con traza, sugerencia al capturar, reversion | ~450 |
| 5 | `PorcionExportable`, composicion en `src/app`, guarda de unicidad de `porcion.nombre` | ~60 |

La rebanada 4 sigue arriba de 400 por unas 50 lineas. Se deja asi: partir
la fusion de su propia reversion daria una rebanada intermedia donde la
fusion existe y no se puede deshacer, que es peor que un diff 12% largo.

---

## 14. Preguntas abiertas

- [x] **Umbral y tope de la sugerencia** (§3). Medido: 0.30 y tope 5. El
      supuesto de que seria mayor que el de busqueda era falso.
- [ ] `personas` fusionadas en la busqueda: ¿el perdedor se muestra? El
      diseno asume que **no** —la busqueda solo devuelve terminales sin
      `bajaEn`—, coherente con la baja logica. Confirmar contra el spec.
