# Propuesta: Capa territorial (Fase 1b)

**Cambio:** `capa-territorial` · **Base:** engram
`sdd/capa-territorial/explore` · **Precedente:** `openspec/changes/archive/2026-08-23-padron-ciudadano/`

## Intencion

`padron` ya sabe **quien**. Nadie sabe **donde**. La decision 11 de
`padron-ciudadano` cerro la puerta a cualquier forma de domicilio en
`personas` —con su propio escenario de test— precisamente para que el
domicilio aterrizara aca y no como un `text` suelto imposible de mapear
despues.

El problema de negocio no es guardar direcciones: es que **el municipio no
puede operar por zona**. La descacharrizacion y la fumigacion (Fase 6) no
recorren personas, recorren manzanas y calles. La constancia de vecindad
(Fase 2) no certifica un nombre, certifica que esa persona vive en ese lugar
desde una fecha. El reporte ciudadano (Fase 3) sin ubicacion es un texto sin
mapa.

Exito: el operador de Motul abre un domicilio, ve quien vive ahi hoy y quien
vivio antes; y puede pedir "todos los domicilios del sector 3" o "todos los
de la Calle 21" sin que nadie haya tenido que capturar el sector en cada
casa.

## Decision de secuencia: se construye ahora

El roadmap admite diferir 1.b hasta Fase 6 "con el costo de una migracion
posterior de domicilios", y Fase 2 —el primer ingreso— **no depende de esta
capa**. Aun asi se construye ahora, por decision del usuario: cerrar Fase 1
completa para que las constancias certifiquen vecindad contra domicilios
reales desde el dia uno, en vez de emitir constancias con un domicilio
tecleado a mano que despues haya que reconciliar contra la jerarquia.

**Lo que se paga:** Fase 2 se retrasa lo que dure este cambio. Esta escrito
para que nadie lo relea despues como un descuido.

## Bloqueantes

### 1 — Forma real del territorio. **RESUELTO, y rompio el modelo anterior**

La primera version de esta propuesta declaro este bloqueante y modelo
`comisaria > colonia > sector > manzana > calle` como un arbol de cinco
niveles. El usuario respondio con conocimiento de dominio y **la respuesta
tiro esa decision**:

- **Una calle cruza varias manzanas.** No es hija de una manzana.
- **`sector` si es un nivel real y propio**, entre colonia y manzana.

La consecuencia va mas lejos que "calle sube un nivel". En una cabecera
yucateca la numeracion de calles es **de todo el poblado**: la Calle 21
atraviesa el Centro y sigue de largo, asi que tampoco es hija de una colonia.
No cuelga limpiamente de **ningun** nivel de contencion. Meterla igual en la
jerarquia con `padreId` apuntando a la colonia no arregla el defecto: lo
muda un nivel mas arriba y lo vuelve mas dificil de ver.

Lo que hay debajo son **dos ejes distintos**: `lugares` son regiones que
**contienen** (una manzana esta dentro de un sector), y una calle es un
**eje lineal** que las **atraviesa**. Una manzana esta *delimitada por*
calles, no contenida en una. Modelar una interseccion como una contencion es
el error que produjo el bloqueante.

**Lo que sobrevive sin tocarse:** la jerarquia sigue siendo un arbol ragged
con orden estricto de tipos —`comisaria > colonia > sector > manzana`—, asi
que el argumento de aciclicidad de la decision 2 queda intacto y de hecho
mas limpio, porque el orden vuelve a ser total.

**Riesgo residual declarado:** la respuesta vino de conocimiento de dominio
del usuario, no de un padron territorial real del municipio piloto. La
*forma* esta confirmada; el *contenido* del catalogo no (ver preguntas
abiertas).

### 2 — `ltree` en Railway. **Condicional, sigue abierto**

Solo bloquea si `sdd-design` revierte la decision 1. Medido: `ltree` 1.3
aparece en `pg_available_extensions` de la imagen local `postgres:18`
(contenedor `xula-pg`), el mismo bundle contrib que trae `pg_trgm` 1.6 y
`unaccent` 1.1, **ya habilitadas en produccion** por
`drizzle/0004_padron.sql`. Eso es evidencia fuerte, **no es prueba**: nadie
ha corrido `CREATE EXTENSION ltree` contra la instancia de Railway con el rol
`xula_migrator`. Si el diseno termina dependiendo de `ltree`, esa
verificacion se hace antes de escribir codigo, no despues.

## Alcance

**Dentro:** modulo nuevo `src/modules/territorio/` con sus cuatro capas;
tabla `lugares` (jerarquia ragged de contencion, auto-referenciada); tabla
`calles` (catalogo de ejes por asentamiento); tabla `domicilios` (direccion
compuesta: lugar + calle + numero + transversales); tabla `residencias`
(relacion temporal persona-domicilio con `desdeEn`/`hastaEn`); las cuatro con
RLS + `FORCE` + su test de aislamiento; FK compuesto a mano hacia
`personas(id, ayuntamiento_id)`; alta, edicion, baja y reparenteo de lugares;
administracion del catalogo de calles; alta de domicilio; mudanza (cerrar y
abrir residencia) atomica; consulta de subarbol y consulta por calle; caso de
uso nuevo **de lectura de persona por id compuesto en `padron`** (decision
14); `PorcionExportable` de `territorio` y su alta en
`src/app/exportacion/porciones.ts`.

**Fuera:** geolocalizacion, coordenadas, mapas y poligonos —esta capa es
direccion administrativa, no geografia—; que calle delimita que manzana (la
relacion muchos-a-muchos entre ejes y regiones: nadie la consume todavia);
importacion masiva del padron territorial; **operacion de "dividir una
colonia"** como funcionalidad propia (decision 8); numeracion catastral
oficial; codigo postal; consulta por proximidad; certificacion de vecindad
(Fase 2, consume esta capa); dos residencias abiertas simultaneas (decision
9); motivo estructurado de mudanza (decision 12); guarda tipo
`identidadPorPuerto` para `domicilios` (decision 16).

## Decisiones cerradas

| # | Decision | Por que | Alternativa descartada |
|---|---|---|---|
| 1 | **Una sola tabla `lugares`, lista de adyacencia con `tipo` discriminador.** Sin `ltree`, sin tabla de cierre | La jerarquia es ragged: un `padreId` nullable en cualquier nivel lo expresa directo. El volumen es el argumento decisivo: municipios del orden de 8.000 habitantes —cientos de nodos, no millones—; un CTE recursivo sobre cientos de filas ya acotadas por RLS no es un problema de rendimiento, y **nadie lo ha medido** como si lo fuera. Es la unica opcion en la que reparentear cuesta un `UPDATE` de una fila. Y es reversible hacia adelante: si Fase 6 mide que el subarbol no rinde, una columna `ltree` o una tabla de cierre son **aditivas** sobre la misma adyacencia. **Ya se cobro:** el bloqueante 1 elimino un nivel entero del arbol y **no costo ni una linea de migracion**, porque los niveles son datos, no esquema — con una tabla por nivel habria sido dropear una tabla, su politica RLS y su test de aislamiento | Una tabla por nivel: la raggedness la mata sola y cuesta 5 tablas, 5 politicas y 5 tests, ninguno de los cuales sobrevive a un cambio de forma. `ltree`: extension no verificada en Railway y reescritura masiva de paths en cada reparenteo. Tabla de cierre: mismo costo de reescritura, sin precedente en el repo |
| 2 | **Ragged si, invertido no.** Cualquier nivel puede faltar, pero el orden de tipos nunca se invierte: `comisaria < colonia < sector < manzana`, estricto | Es lo que hace segura la opcion 1. Una lista de adyacencia no tiene invariante de aciclicidad nativo, y un ciclo convierte todo CTE recursivo en un cuelgue. Con el orden estricto sobre `tipo`, un ciclo es **estructuralmente imposible** sin necesitar un guard de recorrido. Al salir `calle` de la jerarquia (decision 3) el orden vuelve a ser **total**, no parcial: se acabo la rama suelta | Detectar ciclos recorriendo el arbol en cada escritura: mas caro y solo detecta, no impide |
| 3 | **`calle` no es un nivel de la jerarquia. Es un catalogo aparte (`calles`), por asentamiento** | Una calle **atraviesa** manzanas, no esta contenida en ninguna; y en una cabecera yucateca la numeracion es de todo el poblado, asi que tampoco esta contenida en una colonia. `lugares` modela contencion; una calle es un eje. Meterla igual con `padreId` a la colonia muda el defecto un nivel arriba y lo esconde. Un catalogo tambien le da a Fase 6 la consulta por ruta —"todos los domicilios de la Calle 21", un `WHERE` directo— al lado de la consulta por zona —"todos los del sector 3", el CTE recursivo— | Dejarla como quinto nivel del arbol (es la decision que el bloqueante 1 tiro). Un `calle text` en `domicilios`: reintroduce la deriva "Calle 21"/"calle 21"/"C. 21", hace imposible la consulta por ruta y obliga a un `UPDATE` masivo para renombrar una calle |
| 4 | **El catalogo de calles NO necesita la maquinaria de `padron`**: sin columna normalizada, sin `pg_trgm`, sin catalogo de abreviaturas. Se captura eligiendo de una lista, no escribiendo | Es la asimetria que decide: los nombres de personas son un conjunto **abierto** dictado de viva voz con variantes ilimitadas —por eso `padron` necesito el ADR 0002—. Las calles de un municipio son un conjunto **cerrado y chico**, del orden de cien filas, casi siempre numeradas, que el ayuntamiento enumera una vez. Un selector contra una lista cerrada **elimina la deriva en el origen**; no hace falta busqueda difusa para reparar lo que nunca se tecleo mal | Copiar la maquinaria de `padron` "por simetria": es un ADR entero, un indice GIN y una tabla de catalogo para resolver un problema que el selector ya no deja ocurrir. Texto libre con normalizacion posterior: paga la maquinaria **y** se queda con la deriva |
| 5 | **Las calles transversales ("x 20 y 22") se almacenan**, como dos referencias nullable al mismo catalogo (`entreCalleAId`, `entreCalleBId`) | En Yucatan eso **es** la direccion: "Calle 21 #145" sobre una calle larga con numeracion irregular no ubica la casa, y las transversales son lo que usa el vecino, el que entrega un apoyo (Fase 4) y el que verifica una vecindad (Fase 2). Si fueran presentacion habria que guardarlas como texto igual para poder imprimirlas, y ahi vuelve la deriva que la decision 4 acaba de cerrar. Dos FK nullable al catalogo que ya existe no cuestan tabla nueva ni test de aislamiento nuevo. Nullable a proposito: una comisaria rural puede no usarlas. Invariante: las tres calles de un domicilio son distintas entre si | Renderizarlas desde un texto libre; no guardarlas y perder la unica pieza que ubica la casa |
| 6 | **El domicilio cuelga del nivel conocido mas profundo** (`lugarId` a la manzana si se sabe, si no al sector, si no a la colonia, si no a la comisaria). `numero` es **texto nullable**, no entero | Es la raggedness aplicada hasta abajo, y no rompe el subarbol: "domicilios del sector 3" incluye los colgados directo del sector y los que cuelgan de sus manzanas, porque el CTE los alcanza igual. `numero` es texto porque "S/N" es lo normal en el area rural y porque hay numeros con letra; y es nullable porque **la ausencia de numero es un dato, no la cadena magica "S/N"**, que es exactamente la clase de valor centinela que despues nadie sabe si significa "sin numero" o "no capturado" | Obligar a que todo domicilio cuelgue de una manzana: inventa manzanas que no existen. `numero integer`: rechaza la mitad del padron rural |
| 7 | **`manzana` se queda, y se declara que su unico consumidor actual es Fase 6** | La fumigacion se recorre manzana por manzana; es un consumidor real, solo que futuro. Y por la decision 1 el nivel **no cuesta esquema**: es un valor de `tipo`, no una tabla. Si el piloto no tiene manzanas, el nivel simplemente no se usa y la raggedness ya lo absorbe. Se escribe aca para que nadie lo relea despues como un nivel que alguien puso sin razon | Sacarlo ahora y volver a meterlo en Fase 6. Con una tabla por nivel esta decision seria cara; con la decision 1 es gratis en las dos direcciones |
| 8 | **Renombrar y reparentear si; "dividir una colonia" no.** Se reparentea un nodo (un `UPDATE` de `padreId`) y se renombra | Dividir una colonia no es mover un subarbol: es decidir **casa por casa** cual queda de cada lado. Esa decision la tiene el operador que conoce el pueblo, no una regla —y el repo no tiene evidencia de cual seria—. Con crear el lugar nuevo y reparentear lo que corresponda, las operaciones que ya existen cubren el caso. **Renombrar una calle es igual de barato** y es un beneficio directo de la decision 3: los domicilios la referencian por id, asi que el `UPDATE` es de una fila | Una division automatica por criterio (rango de calles, mitad del padron): la clase de regla que no se inventa sin el municipio piloto |
| 9 | **Una persona tiene a lo sumo una residencia abierta** (`hastaEn IS NULL`), por indice unico parcial sobre `(ayuntamientoId, personaId)` | La certificacion de vecindad tiene que responder **un** domicilio; dos abiertas hacen la constancia ambigua justo en el documento oficial. Y el roadmap dice "una persona puede cambiar de domicilio", en singular. Se elige el lado restrictivo **porque es el reversible**: aflojar despues es soltar el indice; apretar despues es limpiar datos que ya se contradicen | Permitir residencias concurrentes desde ahora. **Limitacion declarada:** hay gente con dos casas. Si el piloto lo muestra, se afloja como cambio aditivo |
| 10 | **Cerrar y abrir es una sola transaccion.** Una mudanza no deja a la persona sin domicilio ni con dos | Mismo criterio que fusion + bitacora en `padron` (su decision 1): la operacion de negocio es una, la transaccion es una. Entre dos transacciones separadas, una constancia emitida ve a la persona sin domicilio | Cerrar y abrir como dos casos de uso independientes |
| 11 | **Ni el reparenteo de un lugar ni el renombre de una calle tocan ninguna fila de `domicilios` ni de `residencias`** | Una persona no se muda porque el ayuntamiento renombro su colonia, y una casa no cambia porque la calle cambio de nombre. Todo se referencia por id. Reescribir seria falsificar el historial. **Consecuencia que se hereda a Fase 2:** la constancia debe **congelar el texto de la direccion al emitir**, porque re-derivarla despues del arbol y del catalogo actuales daria otra cadena — y el invariante 2 dice que un documento emitido no se modifica. Con la direccion compuesta (decision 5) esa cadena depende ahora de la cadena de lugares **y** de tres filas de `calles`: mas partes moviles, mas razon para congelar | Cerrar y reabrir residencias en cada reparenteo; re-derivar la direccion de una constancia vieja |
| 12 | **La residencia no lleva motivo.** Fechas y domicilio, nada mas | Mismo razonamiento que la decision 5 de `padron` (baja sin motivo estructurado): un campo abierto sobre por que alguien dejo una casa recoge desalojos y pleitos familiares. Es dato sensible sin proteccion, sin importar como se llame la columna. El invariante 3 y el checklist de PRs criticos preguntan exactamente esto | Un `motivo text` "para que el operador anote". Es el que se queda |
| 13 | **La fusion de personas no cascadea sobre residencias.** El indice unico parcial es sobre el `personaId` **almacenado**; la lectura colapsa la identidad fusionada por el puerto de `padron` y resuelve la residencia abierta mas reciente | `padron` fusiona por redireccion no destructiva: la fila perdedora sobrevive y sus residencias siguen apuntandole. Cascadear obligaria a `padron` a escribir en tablas de `territorio`, que es exactamente lo que su decision 1 prohibio. **Efecto util:** revertir una fusion no requiere nada, porque ninguna residencia se reescribio. **Costo:** una identidad fusionada puede tener dos filas abiertas y la desempata la lectura, no la base. La regla de desempate exacta la fija `sdd-spec` | Cascada al fusionar (rompe la arquitectura); indice unico sobre la identidad colapsada (Postgres no la conoce) |
| 14 | **Este cambio agrega a `padron` un caso de uso compuesto de lectura por id.** `RepositorioDePersonas.buscarPorId` ya existe en `application/puertos.ts` y en `repositorioDePersonasSql.ts:83`, pero **`composicion.ts` no lo compone** —verificado leyendo el archivo—: no hay funcion publica que llamar | La decision 13 lo vuelve obligatorio: `territorio` no puede saber que dos `personaId` son la misma persona sin preguntarle a `padron`. Reparto de responsabilidades: **el FK compuesto guarda la escritura** ("existe y es de mi tenant"), **el puerto guarda la lectura** (colapso de fusion y datos de la persona). No se puede modelar la relacion para no preguntar | Que `territorio` haga un join crudo contra `personas`: lo prohibe `identidadPorPuerto.test.ts` y ademas se perderia las fusiones en silencio. No toca el esquema de `padron` —eso su spec lo prohibe—; un caso de uso compuesto nuevo no lo toca |
| 15 | **El FK compuesto `residencias → personas(id, ayuntamiento_id)` se escribe a mano en la cola de `drizzle/000X_territorio.sql`**, en el mismo archivo que crea las tablas. Nunca con el builder `foreignKey()` de Drizzle | Confirmado contra `design.md` decision 1 de `padron-ciudadano` (capas A/B/C): el objeto de tabla `personas` **no es alcanzable** fuera de `padron` —el barrel no lo exporta y `superficiePublica.test.ts` lo fija con `isTable()`—, asi que Drizzle no puede componerlo. El FK existe igual en Postgres. Va en el mismo archivo por ADR 0001 §2: un diff que solo toque lo generado se veria identico a una migracion que olvido el `FORCE`. En el esquema de `territorio`, `personaId` es `uuid().$type<PersonaId>()` **sin `.references()`**. Los otros FK compuestos —`lugares→lugares`, `calles→lugares`, `domicilios→lugares`, `domicilios→calles` (x3), `residencias→domicilios`— si son objetos Drizzle: viven en el mismo modulo. **Costo real:** la pantalla "domicilio y sus residentes" son dos viajes, no un join | FK simple contra `personas.id`: reabre el bypass de RLS que `personas_id_tenant_key` existe para cerrar |
| 16 | **No se crea una guarda `identidadPorPuerto` para `domicilios` ni para `calles`** | Esa guarda existe en `padron` por la **fusion**: un join crudo contra `personas.id` pierde el colapso en silencio. Ni `domicilios` ni `calles` tienen semantica de redireccion, asi que un join crudo contra ellos no pierde nada que dependency-cruiser no cubra ya con `modulo-no-importa-interior-de-otro` | Clonarla por simetria. Una guarda sin el fallo que la justifica es ceremonia |
| 17 | **Un domicilio puede existir sin residentes.** Una casa deshabitada es un registro valido | Fase 6 recorre **domicilios**, no personas: una casa vacia se descacharriza y se fumiga igual, y es justamente donde se junta el cacharro. Ademas el alta de domicilio y el alta de residencia son operaciones distintas de dos momentos distintos; exigir un residente al crear obligaria a inventar uno | Exigir al menos una residencia abierta por domicilio. *Se le ofrecio al usuario como supuesto declarado y no lo corrigio* |
| 18 | **`ADMIN_MUNICIPAL` reparentea lugares y administra el catalogo de calles.** El alta de domicilios y las mudanzas quedan en `puedeEscribir` | Reparentear reescribe la estructura del municipio y renombrar una calle cambia la direccion impresa de todos sus domicilios: mismo criterio que fusionar personas en `padron`, que tambien es `ADMIN_MUNICIPAL`. Capturar un domicilio o registrar una mudanza es trabajo de mostrador, no de estructura | Que cualquier operador reparentee. *Se le ofrecio al usuario como supuesto declarado y no lo corrigio* |

## Forma del esquema (indicativa — el detalle es de `sdd-design`)

```
lugares                       -- regiones que CONTIENEN
  id, ayuntamientoId, tipo, nombre
  padreId  uuid null          -- ragged; tipo(padre) < tipo(hijo), estricto
  tipo in (comisaria, colonia, sector, manzana)
  foreignKey([padreId, ayuntamientoId]) -> [id, ayuntamientoId]
  unique(id, ayuntamientoId)

calles                        -- ejes que ATRAVIESAN; catalogo cerrado
  id, ayuntamientoId, nombre  -- "21", "Principal"
  lugarId  uuid null          -- asentamiento; null = cabecera (pregunta 1)
  unique(id, ayuntamientoId)
  uniqueIndex(ayuntamientoId, lugarId, nombre)

domicilios
  id, ayuntamientoId
  lugarId                     -- nivel conocido mas profundo (decision 6)
  calleId, numero text null   -- "S/N" es NULL, no una cadena (decision 6)
  entreCalleAId, entreCalleBId  uuid null   -- distintas entre si y de calleId
  referencia text null
  unique(id, ayuntamientoId)

residencias
  id, ayuntamientoId, personaId, domicilioId, desdeEn, hastaEn null
  foreignKey([domicilioId, ayuntamientoId])       -- Drizzle, mismo modulo
  FK compuesto -> personas(id, ayuntamiento_id)   -- a mano, en el .sql
  uniqueIndex(ayuntamientoId, personaId) WHERE hastaEn IS NULL
```

Las cuatro con `columnaTenant()` + `politicaTenant()` + `enableRLS()`, y en
el mismo archivo de migracion el `FORCE ROW LEVEL SECURITY` y los `GRANT` que
Drizzle no emite, siguiendo la cola de `drizzle/0004_padron.sql`.

## Capabilities

### New Capabilities

- `jerarquia-territorial`: alta, edicion, baja y reparenteo de lugares;
  jerarquia ragged de contencion con orden estricto de tipos; consulta de
  subarbol; catalogo de calles por asentamiento; traza en bitacora.
- `domicilios`: direccion compuesta (lugar al nivel conocido mas profundo,
  calle, numero opcional, transversales opcionales, referencia); consulta por
  zona y por calle; presencia en la exportacion por ayuntamiento.
- `residencias`: relacion temporal persona-domicilio; mudanza atomica; una
  residencia abierta por persona; historial consultable por persona y por
  domicilio; resolucion de identidad fusionada por el puerto de `padron`.

### Modified Capabilities

- `padron-ciudadano`: se agrega a la superficie publica del modulo un caso de
  uso compuesto de lectura de persona por id (decision 14). **No cambia el
  esquema de `personas`.**

## Enfoque

- `domain`: tipos marcados (`LugarId`, `CalleId`, `DomicilioId`), orden
  estricto de tipos de lugar, reglas de la direccion compuesta, reglas de
  vigencia de una residencia. Sin imports —ni de `shared`—, siguiendo el
  precedente de `personaId.ts`.
- `application`: `puertos.ts` con los repositorios y el puerto de lectura que
  Fase 2/3/4/6 consumiran; un archivo por caso de uso; todo lo que toca base
  dentro de un solo `withTenant`, con el INSERT de bitacora en la misma
  transaccion.
- `infrastructure`: `esquema.ts` —el nombre exacto, por
  `drizzle.config.ts:31` (decision 7 de `padron`)— y adaptadores como objeto
  literal.
- `ui`: Server Components; el arbol navegable es la unica hoja candidata a
  `"use client"` y se justifica cuando llegue.
- Tests de aislamiento en la raiz del modulo, forma canonica de
  `invariantes-criticos.md` Capa 2, **uno por tabla: cuatro**.

## Invariantes que toca

| Invariante / escenario | Como lo toca |
|---|---|
| 1 — Aislamiento | **Cuatro** tablas nuevas con `ayuntamiento_id`, `FORCE RLS` y su test de aislamiento cada una. Ninguna califica como catalogo de plataforma: `calles` **si** guarda dato municipal —la Calle 21 de Motul no es la de Ticul—, a diferencia de `padron.abreviaturas`. Sin excepciones nuevas en `AGENTS.md` regla 2. T1, T3, T4, T5 |
| 2 — Documentos oficiales | No emite documentos, pero **le impone una regla a Fase 2**: la constancia congela el texto de la direccion al emitir (decision 11) |
| 3 — Datos personales | El historial de domicilios de una persona es dato personal, y arguiblemente mas sensible que su nombre. Sin motivo de mudanza (decision 12). `domicilios.referencia` es el unico texto libre y es orientacion ("casa azul junto a la tienda"), no categoria de motivo — **se revisa en `sdd-spec` si necesita acotarse** |
| 5 — Auditoria | Alta, edicion, baja y reparenteo de lugares, alta y renombre de calles, alta de domicilio y toda apertura/cierre de residencia, en la misma transaccion, **solo ids** |
| T11 — Exportacion | `territorio` aporta su `PorcionExportable` con columnas listadas una por una, nunca `select()` pelado |

## Riesgos

| Riesgo | Sev. | Mitigacion |
|---|---|---|
| Un modulo futuro guarda `persona_id` con FK simple y reabre el bypass entre municipios | **Alta** | FK compuesto a mano desde el dia uno + escenario de aislamiento explicito en el spec |
| Un join crudo contra `personas` desde `territorio` se pierde las fusiones | **Alta** | `identidadPorPuerto.test.ts` ya escanea `src/**` fuera de `padron` y cubre este modulo **sin cambios** — verificarlo, no asumirlo |
| La forma se confirmo por conocimiento de dominio, **no** contra un padron territorial real del piloto. El contenido sigue sin muestra: cuantas calles, si las comisarias numeran aparte, como se llama la cabecera | Media | El catalogo es datos, no esquema (decisiones 1 y 3): equivocarse en el contenido se corrige capturando, no migrando. Se pide la muestra igual antes de la rebanada 4 |
| Tres selectores de calle por domicilio: el operador se cansa y captura todo en un domicilio generico | Media | Transversales nullable, `numero` nullable, `lugarId` ragged: el camino minimo es calle + lugar. **Sin medir** — se observa en el piloto |
| El catalogo de calles vacio bloquea toda alta de domicilio el dia uno | Media | Por eso el catalogo (rebanada 4) va **antes** que domicilios (rebanada 5), no en el mismo PR |
| Sin invariante de aciclicidad, un ciclo cuelga todo CTE recursivo | Media | Decision 2: el orden estricto y total de tipos lo hace imposible. Con test |
| El presupuesto de revision se desborda ~3,7x | Media | Siete rebanadas secuenciales, ninguna por encima de 800 lineas |
| La identidad fusionada con dos residencias abiertas se desempata mal | Media | Decision 13 con regla de desempate explicita en el spec y su test |
| El CTE recursivo de subarbol rinde mal en Fase 6 | Baja | **No medido, y a proposito**: cientos de nodos. Si se mide mal, `ltree` o tabla de cierre son aditivos (decision 1) — y ahi si aplica el bloqueante 2 |

## Presupuesto de revision

`delivery_strategy: auto-chain`, presupuesto **800 lineas**. Estimacion
honesta, ya con la reforma del bloqueante 1 (una tabla mas, un nivel menos):

| Tramo | Lineas aprox. |
|---|---|
| Esquema + migracion (4 tablas, `FORCE`, `GRANT`, FK a mano) | 250 |
| Dominio de jerarquia y de direccion + tests | 350 |
| Casos de uso de lugares + tests | 400 |
| Catalogo de calles: casos de uso + tests | 200 |
| Infraestructura (adaptadores, CTE de subarbol, consulta por calle) | 220 |
| Tests de aislamiento (4 tablas) + integracion | 320 |
| Domicilios y residencias: casos de uso + tests | 500 |
| Lectura de persona por id en `padron` + tests | 80 |
| UI (arbol, calles, domicilio, mudanza, historial) | 550 |
| Exportacion + docs | 100 |
| **Total** | **~2.970** |

Casi **cuatro veces** el presupuesto. Y la regla del repo es "Un PR, un
merge. Las ramas no se apilan": la forma compatible **no** es una cadena de
PRs apilados sino rebanadas secuenciales contra `main`, como en
`padron-ciudadano`. Corte propuesto (lo afina `sdd-tasks`):

1. **Puerto de lectura en `padron`** (~80) — va sola y primero: es un cambio
   en otro modulo y su diff debe leerse como lo que es.
2. **Jerarquia: esquema y aislamiento** (~600) — `lugares`, migracion con
   RLS/`FORCE`/`GRANT`, dominio, orden de tipos, test de aislamiento. Es la
   rebanada que toca tenancy y va sola a proposito.
3. **Jerarquia: casos de uso y arbol** (~600) — alta, edicion, reparenteo,
   subarbol, UI del arbol.
4. **Catalogo de calles** (~450) — tabla, RLS, test de aislamiento, alta y
   renombre, selector. **Antes que domicilios, no con ellos.**
5. **Domicilios y direccion compuesta** (~600) — tabla, RLS, test de
   aislamiento, las tres referencias a calles, consulta por calle y por zona.
6. **Residencias** (~540) — tabla, RLS, test de aislamiento, mudanza atomica,
   colapso de fusion, historial.
7. **Exportacion** (~100).

## Plan de rollback

Toca tenancy, datos personales y auditoria, asi que es obligatorio y tiene
dos regimenes:

- **Antes de que el piloto capture territorio real:** revertir el PR y bajar
  la migracion. Las cuatro tablas se dropean sin perdida. El FK compuesto cae
  con ellas; `personas` no se toca en ningun momento.
- **Despues:** revertir el codigo y **dejar las tablas**. Son aditivas y nadie
  mas las lee; dropearlas destruye el padron territorial y el historial de
  residencias, que no se reconstruye.
- **Rollback del puerto de lectura en `padron`** (rebanada 1): es aditivo y no
  cambia ninguna firma existente; se revierte solo, sin migracion.
- **Rollback de un reparenteo o de un renombre de calle equivocado:**
  deshacerlo con la misma operacion, en transaccion, con su entrada en
  bitacora. Ni domicilios ni residencias se movieron (decision 11), asi que no
  hay nada mas que deshacer. Sin migracion ni deploy.

## Dependencias

- Sin paquetes nuevos. Sin extensiones nuevas de Postgres **con la decision 1
  vigente** (ver bloqueante 2 si se revierte). La decision 4 confirma que
  tampoco entra `pg_trgm` por el lado de las calles.
- Rebanadas 2–7 dependen de la 1 mergeada; la 5 depende de la 4.

## Criterios de exito

- [ ] Una calle cruza varias manzanas **sin que el modelo la obligue a elegir
      una**.
- [ ] Una comisaria sin colonias y un domicilio colgado directo de la colonia
      —sin sector ni manzana— conviven en el mismo arbol sin columnas nulas
      de relleno.
- [ ] Pedir "todos los domicilios del sector 3" devuelve tambien los colgados
      del propio sector y los de sus manzanas, en una sola consulta.
- [ ] Pedir "todos los domicilios de la Calle 21" devuelve los de toda la
      calle, atraviese las manzanas que atraviese.
- [ ] Renombrar la Calle 21 no cambia **ninguna** fila de `domicilios`.
- [ ] Reparentear una colonia no cambia **ninguna** fila de `residencias`.
- [ ] Un domicilio sin numero se distingue de uno cuyo numero no se capturo.
- [ ] Un domicilio sin residentes es un registro valido y aparece en una
      campana por zona.
- [ ] Una mudanza cierra la residencia anterior y abre la nueva en la misma
      transaccion; en ningun instante la persona tiene cero ni dos abiertas.
- [ ] Consultar el historial de una persona fusionada devuelve las residencias
      de **ambos** ids, colapsadas, ordenadas.
- [ ] Revertir esa fusion devuelve cada residencia a su persona original.
- [ ] Un `residencias` con `persona_id` de otro municipio es **rechazado por
      Postgres**, no solo por la aplicacion.
- [ ] Un usuario del municipio A no ve, ni por id directo, un lugar, calle,
      domicilio o residencia de B.
- [ ] Ninguna tabla de `territorio` guarda la direccion como texto libre, ni
      tiene un campo de motivo.
- [ ] `pnpm test`, `pnpm test:integration` y `pnpm check` en verde.

## Ronda de preguntas de propuesta

### Primera ronda — las cuatro, respondidas

1. **?La calle cuelga de la manzana, o las cruza?** → **Cruza.** Tiro la
   decision 1 original y produjo las decisiones 3, 5 y 6. Es el bloqueante 1,
   ahora resuelto.
2. **?"Sector" es un nivel real?** → **Si, propio**, entre colonia y manzana.
   Se queda en el orden estricto de la decision 2.
3. **?Un domicilio puede existir sin residentes?** → no corregido. Promovido a
   **decision 17** con su motivo.
4. **?Quien reparentea?** → no corregido. Promovido a **decision 18** con su
   motivo.

### Pregunta nueva que abrio la reforma — pendiente

La decision 3 dejo `calles` con alcance de **asentamiento**, y ahi aparece una
pregunta que no estaba antes y que **no se puede contestar con evidencia del
repo**:

1. **?Como se representa la cabecera municipal?** Una comisaria es un poblado
   aparte con su propia numeracion de calles, asi que "Calle 3" de la
   comisaria X y "Calle 3" de la cabecera son calles distintas y el catalogo
   necesita separarlas. Pero **la cabecera no es una comisaria**. Las dos
   salidas son: (a) la cabecera es una fila de `lugares` de tipo `comisaria`,
   con el costo de que el tipo mienta sobre lo que es; (b) la cabecera es la
   raiz implicita y sus calles llevan `lugarId = NULL`, con el costo de que
   `NULL` signifique dos cosas distintas —"de la cabecera" y "todavia no se
   sabe"—.

   **No se elige aca a proposito.** Cualquiera de las dos se puede defender y
   la que corresponde depende de si el piloto tiene comisarias con calles
   propias o solo cabecera. **Es lo primero que hay que mirar en la muestra
   territorial del piloto, antes de la rebanada 4.** Si la muestra no llega,
   `sdd-design` la decide por escrito y la deja marcada como no verificada —
   pero no se decide por omision en el `esquema.ts`.
