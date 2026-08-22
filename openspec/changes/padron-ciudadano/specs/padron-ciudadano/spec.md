# Padron Ciudadano — Specification

## Purpose

Una persona por vecino, no una fila por captura. El padron resuelve
duplicados por variante de escritura sin bloquear el alta, aisla cada
municipio, y expone un puerto de lectura que ninguna fusion rompe.

Cada requisito lleva su rebanada de entrega entre parentesis (1 a 5, ver
design.md seccion 13) para que `sdd-tasks` corte sin releer esta decision.

## Requirements

### Requirement: Identidad de la persona en tres campos (Rebanadas 1 y 2)

El sistema MUST guardar `nombres`, `primerApellido` y `segundoApellido`
(opcional) como campos separados, y MUST escribir `nombreNormalizado`
—minusculas, sin acentos, sin puntos, abreviaturas expandidas— en la
aplicacion en cada alta y cada edicion, nunca como columna generada.

#### Scenario: Alta guarda los tres campos y su normalizado

- GIVEN una operadora captura "Maria Guadalupe Kumul Pech"
- WHEN se da de alta la persona
- THEN `nombres`, `primerApellido`, `segundoApellido` quedan separados
- AND `nombreNormalizado` existe y no depende de una columna generada

#### Scenario: Editar el nombre recalcula el normalizado

- GIVEN una persona existente
- WHEN se corrige `primerApellido`
- THEN `nombreNormalizado` se reescribe en la misma operacion

### Requirement: Aislamiento de personas por ayuntamiento (Rebanada 1)

La tabla `personas` MUST llevar `ayuntamientoId` con `FORCE ROW LEVEL
SECURITY`, y todo FK futuro hacia `personas` MUST ser compuesto contra
`unique(id, ayuntamientoId)`, nunca contra `id` solo.

#### Scenario: Consulta sin filtro solo devuelve el tenant activo

- GIVEN personas sembradas en Motul y en Ticul
- WHEN se consulta `personas` con contexto en Motul y sin `where` de tenant
- THEN solo aparecen filas de Motul

#### Scenario: Otro municipio por ID directo responde 404, no 403

- GIVEN una persona de Ticul y un usuario autenticado en Motul
- WHEN ese usuario pide esa persona por su id
- THEN la respuesta es 404 y no revela que el id existe en Ticul

#### Scenario: Un FK simple sobre personas.id reabre el bypass de RLS

- GIVEN una tabla dependiente que declarara `personaId` con FK simple
  sobre `personas.id`
- WHEN esa fila lleva su propio `ayuntamientoId` y un `personaId` de otro
  municipio
- THEN el `WITH CHECK` de RLS la rechaza solo si el FK es compuesto contra
  `(id, ayuntamientoId)`; un FK simple la deja pasar

### Requirement: CURP opcional y unica por municipio (Rebanada 1)

CURP MUST ser opcional, MUST normalizarse a `NULL` cuando llega vacia
desde el dominio (nunca `''`), y MUST ser unica por `ayuntamientoId`
cuando esta presente. CURP MUST NOT ser el mecanismo de deduplicacion.

#### Scenario: Dos personas sin CURP conviven

- GIVEN dos personas del mismo municipio sin CURP
- WHEN se dan de alta ambas
- THEN las dos existen sin violar la unicidad

#### Scenario: Misma CURP en el mismo municipio se rechaza

- GIVEN una persona con CURP ya registrada en Motul
- WHEN se intenta dar de alta otra con la misma CURP en Motul
- THEN el alta falla por la restriccion de unicidad

### Requirement: Edicion, baja logica y bitacora de solo escritura (Rebanada 2)

Alta, edicion, fusion y baja MUST dejar una fila de bitacora con solo ids
(actor, persona, ayuntamiento, momento, accion) en la misma transaccion.
La baja MUST ser logica, con fecha, invisible en busqueda por defecto, sin
motivo estructurado. El sistema MUST NOT registrar lecturas a nivel
registro en esta fase.

#### Scenario: La bitacora no lleva nombre ni CURP

- GIVEN una edicion de persona
- WHEN se confirma la operacion
- THEN la fila de bitacora existe y no contiene nombre ni CURP

#### Scenario: Una persona dada de baja no aparece en busqueda por defecto

- GIVEN una persona con `bajaEn` fijado
- WHEN se busca por su nombre sin pedir explicitamente inactivas
- THEN no aparece en los resultados

### Requirement: Ninguna forma de domicilio en personas en esta fase (Rebanada 1)

El esquema de `personas` MUST NOT tener ninguna columna con forma de
domicilio, ni siquiera texto libre temporal.

#### Scenario: El esquema no tiene columna de domicilio

- GIVEN el esquema de `personas` de esta fase
- WHEN se revisan sus columnas
- THEN ninguna representa direccion, colonia, sector o calle

### Requirement: Busqueda tolerante a variantes con trigramas (Rebanada 3)

La busqueda MUST usar el operador `%` de `pg_trgm` sobre `nombreNormalizado`
con el umbral fijado en la transaccion vía
`set_config('pg_trgm.similarity_threshold', '0.30', true)` — el tercer
argumento en `true` importa: `set_limit()`, el wrapper habitual de
`pg_trgm`, hace un `SET` de sesion completa sin equivalente `LOCAL`, y esa
sesion es la misma conexion del pool que el siguiente request puede
heredar de otro municipio (mismo T2 que `withTenant.ts` documenta para
`app.tenant`). El umbral MUST NOT heredarse de la configuracion de
servidor, y MUST expandir abreviaturas una sola vez sobre la cadena de
busqueda antes de armar la consulta. El indice GIN sobre `nombreNormalizado` MUST existir
para que la consulta sea sargable — que el planner efectivamente lo elija
en un municipio dado es una decision de costo de Postgres, no una garantia
de esta consulta: RLS agrega siempre `ayuntamiento_id = tenant`, y esa
condicion por si sola ya identifica "todas las filas del municipio", asi
que el planner prefiere su propio btree de tenant antes que el GIN a
cualquier volumen razonable de un ayuntamiento chico — medido con 2.000,
50.000 y 200.000 filas de un solo tenant. Sin RLS de por medio (una
consulta sin filtro de tenant) el mismo GIN si se elige solo, lo que
confirma que el indice funciona; la competencia es con el btree de tenant,
no una consulta mal escrita.

#### Scenario: Variante abreviada encuentra a la persona

- GIVEN "Maria Guadalupe Kumul" ya registrada
- WHEN se busca "gpe kumul"
- THEN la persona aparece por encima del umbral 0.30

#### Scenario: El operador % es sargable sobre el indice GIN

- GIVEN la tabla `personas` con datos, RLS deshabilitada dentro de una
  transaccion que la vuelve a habilitar antes del COMMIT (aislando la
  consulta del filtro de tenant que RLS agregaria, que de otro modo
  siempre gana por costo — ver el requisito de mas arriba) y
  `enable_seqscan` forzado a `off`
- WHEN se ejecuta `EXPLAIN` sobre `nombreNormalizado % cadena`
- THEN el plan usa `Bitmap Index Scan` sobre
  `personas_nombre_normalizado_trgm_idx` — nunca un `Seq Scan` — lo que
  prueba que el operador no quedo detras de una funcion opaca al planner.
  Un `enable_seqscan=off` **con RLS activa** no alcanza: el btree de
  tenant satisface igual "no es un Seq Scan" aunque `%` este roto, y el
  test no discriminaria nada

#### Scenario: La expansion no corre por fila

- GIVEN una busqueda con abreviaturas
- WHEN se ejecuta la consulta
- THEN la cadena llega ya expandida a Postgres como constante, sin llamar
  a la funcion de expansion en el `WHERE`

### Requirement: Catalogo de abreviaturas como tabla de plataforma (Rebanada 1)

La tabla de abreviaturas MUST NOT llevar `ayuntamientoId` y MUST ser de
solo lectura para el rol de aplicacion. Esta excepcion a "toda tabla
operativa lleva ayuntamiento_id" MUST quedar escrita en
`docs/architecture/invariantes-criticos.md` en el mismo cambio.

#### Scenario: El rol de aplicacion no puede escribir el catalogo

- GIVEN el rol de aplicacion conectado
- WHEN intenta insertar o modificar una fila del catalogo
- THEN la base lo rechaza por permisos

### Requirement: Fusion no destructiva por redireccion (Rebanada 4)

Fusionar dos personas MUST marcar a la perdedora, sin borrarla, en la
misma transaccion que su entrada de bitacora. El puerto de lectura MUST
resolver la redireccion **colapsada** al ganador final y MUST devolver los
datos actuales de la ganadora, no una foto del momento de la fusion.

La marca son DOS columnas y no una: `fusionadaEn`, que es la respuesta ya
colapsada, y `fusionadaDirectoEn`, que es contra quien se fusiono de
verdad. Con una sola, fusionar A hacia B y despues B hacia C deja a A
apuntando a C, y revertir B→C no puede devolver A a B: la reversion seria
lossy justo en el caso encadenado.

Todo `fusionadaEn` no nulo MUST apuntar a una fila cuyo `fusionadaEn` es
nulo. Ese invariante es a la vez la garantia de un salto y la prueba de
que no hay ciclos.

#### Scenario: Consulta por el id perdedor sigue resolviendo tras editar al ganador

- GIVEN A fusionada hacia B
- WHEN se edita el apellido de B y luego se consulta por el id de A
- THEN el resultado trae el apellido nuevo de B

#### Scenario: Cadena de fusiones resuelve en un salto

- GIVEN A fusionada hacia B, y B fusionada hacia C
- WHEN se consulta por el id de A a traves del puerto de lectura
- THEN el resultado es C en una sola resolucion, sin seguir dos saltos

#### Scenario: Revertir la fusion devuelve ambas personas

- GIVEN A fusionada hacia B
- WHEN se revierte la fusion de A
- THEN A y B vuelven a existir por separado sin migracion adicional

#### Scenario: Revertir una fusion encadenada devuelve a su destino directo

- GIVEN A fusionada hacia B, y despues B fusionada hacia C
- WHEN se revierte la fusion de B hacia C
- THEN A queda apuntando a B, no a C

### Requirement: El puerto de lectura es la unica entrada valida a personas (Rebanada 4)

Cualquier lectura de una persona desde otro modulo MUST pasar por el
puerto de lectura de `padron`. Un acceso que lea `personas` sin pasar por
ese puerto pierde la resolucion de fusiones sin aviso.

#### Scenario: Leer por el puerto tras una fusion trae al ganador

- GIVEN A fusionada hacia B
- WHEN otro modulo resuelve el id de A a traves del puerto de lectura
- THEN recibe los datos de B, no un registro huerfano

### Requirement: Sugerencia de duplicados en captura, nunca bloqueante (Rebanada 4)

Mientras se captura un nombre, el sistema MUST mostrar personas similares
con umbral 0.30 y un tope de 5 resultados, y MUST permitir continuar el
alta sin elegir ninguna sugerencia.

El umbral es el mismo de la busqueda y eso esta medido, no heredado.
Sobre nombres a medio escribir, 0.30 recupera 97.8% y 0.35 cae a 81.0%,
a cambio de ahorrar 0.26 candidatos falsos por alta. El ruido promedio a
0.30 en esa clase es 0.32 candidatos.

#### Scenario: Un nombre a medio escribir ya trae a la persona existente

- GIVEN "Maria Guadalupe Kumul Sanchez" existe
- WHEN la operadora lleva tecleado el nombre de pila y las primeras letras
  del apellido paterno
- THEN esa persona aparece entre las sugerencias

#### Scenario: La operadora ignora la sugerencia y completa el alta

- GIVEN una persona similar ya existe
- WHEN la operadora ve la sugerencia y sigue capturando datos nuevos
- THEN el alta se completa sin bloqueo

### Requirement: Exportacion por ayuntamiento incluye el padron (Rebanada 5)

`padron` MUST aportar una `PorcionExportable` con columnas listadas una
por una, nunca `select()` pelado, y toda exportacion masiva MUST quedar
en bitacora con usuario, alcance y cantidad de registros.

#### Scenario: La exportacion no trae columnas no declaradas

- GIVEN la `PorcionExportable` de `padron`
- WHEN se genera una exportacion
- THEN solo aparecen las columnas listadas explicitamente

#### Scenario: La exportacion masiva queda registrada

- GIVEN una exportacion completa del padron de un municipio
- WHEN termina
- THEN la bitacora tiene una fila con usuario, momento, alcance y cantidad
  de registros
