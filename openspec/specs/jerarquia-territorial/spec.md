# Jerarquia Territorial — Specification

## Purpose

El municipio no puede operar por zona porque nadie modela el territorio.
`lugares` resuelve la contencion ragged (comisaria, cabecera, colonia,
sector, manzana) con una sola tabla de lista de adyacencia, sin `ltree` ni
tabla de cierre, y con un orden de tipos que hace imposible un ciclo por
construccion. `calles` resuelve el eje que atraviesa esa contencion —una
calle no cuelga de ninguna manzana— como catalogo cerrado por asentamiento.

Cada requisito lleva su rebanada de entrega entre parentesis (1 a 7, ver
proposal.md "Presupuesto de revision") para que `sdd-tasks` corte sin
releer esta decision.

## Requirements

### Requirement: Lugares es una unica tabla de lista de adyacencia (Rebanada 2)

La tabla `lugares` MUST modelar la jerarquia territorial como lista de
adyacencia auto-referenciada (`padreId` nullable hacia la misma tabla) con
una columna `tipo` discriminadora, sin `ltree` y sin tabla de cierre. El
sistema MUST permitir que cualquier nivel intermedio falte: un lugar hijo
o un domicilio puede colgar directo de un nivel superior sin filas de
relleno para los niveles ausentes.

#### Scenario: Comisaria sin colonias

- GIVEN una comisaria sin ninguna colonia registrada
- WHEN se crea un sector cuyo padre es esa comisaria
- THEN el sector queda vinculado directo a la comisaria, sin crear una
  colonia de relleno

#### Scenario: Reparentear es una sola fila

- GIVEN un lugar existente con su `padreId` actual
- WHEN se reparenta a otro padre valido
- THEN la operacion actualiza unicamente la fila de ese lugar, sin
  reescribir ninguna otra fila de `lugares`, `domicilios` ni `residencias`

### Requirement: Orden estricto y total de tipos, con dos tipos en el rango superior (Rebanada 2)

El sistema MUST imponer un orden estricto sobre `tipo` donde el tipo del
padre siempre precede al del hijo: `{cabecera, comisaria}` (mismo rango,
sin precedencia entre si) < `colonia` < `sector` < `manzana`. `cabecera`
MUST ser su propio valor de `tipo`, distinto de `comisaria` y del `NULL`
implicito: no MUST representarse como una fila `comisaria` (mentiria sobre
lo que es) ni como una raiz sin tipo definido (un `padreId NULL` en un
lugar de otro tipo significa unicamente "sin padre conocido", nunca "esto
es la cabecera"). Una fila de tipo `cabecera` o `comisaria` MUST tener
`padreId IS NULL`; ningun otro tipo MUST tener `padreId NULL`. El sistema
MUST rechazar crear o reparentar un lugar cuyo `tipo` no sea estrictamente
posterior al `tipo` de su nuevo padre. Como `cabecera` y `comisaria`
comparten el rango superior y ninguno puede ser ancestro del otro, y todo
otro tipo queda estrictamente por debajo de ambos, un lugar nunca puede
volverse su propio ancestro: el orden vuelve el ciclo estructuralmente
imposible sin necesitar un guardia de recorrido.

#### Scenario: cabecera y comisaria conviven como raices distintas

- GIVEN un municipio con una fila `tipo=cabecera` y una fila
  `tipo=comisaria`, ambas con `padreId NULL`
- WHEN se listan los lugares raiz de ese municipio
- THEN ambas existen y ninguna es padre de la otra

#### Scenario: comisaria no puede ser hija de cabecera

- GIVEN una fila `tipo=cabecera`
- WHEN se intenta crear una comisaria con `padreId` apuntando a esa
  cabecera
- THEN el sistema rechaza la operacion porque `comisaria` no es
  estrictamente posterior a `cabecera` en el orden

#### Scenario: un ciclo se rechaza antes de escribir

- GIVEN un sector cuyo padre es una colonia
- WHEN se intenta reparentar esa colonia para que su padre sea el propio
  sector
- THEN el sistema rechaza la operacion porque el tipo del nuevo padre
  (`sector`) no precede al tipo de la colonia

#### Scenario: manzana no puede tener hijos

- GIVEN un lugar de tipo manzana
- WHEN se intenta crear un lugar cuyo padre sea esa manzana
- THEN el sistema lo rechaza porque no existe un tipo posterior a manzana

### Requirement: Aislamiento de lugares por ayuntamiento (Rebanada 2)

La tabla `lugares` MUST llevar `ayuntamientoId` con `FORCE ROW LEVEL
SECURITY` y su propio test de aislamiento; el FK de auto-referencia
(`padreId`) MUST ser compuesto contra `(id, ayuntamientoId)`, nunca contra
`id` solo.

#### Scenario: Un municipio no ve la jerarquia de otro

- GIVEN lugares sembrados en Motul y en Ticul
- WHEN se consulta `lugares` con contexto en Motul y sin filtro explicito
  de tenant
- THEN solo aparecen filas de Motul

#### Scenario: Un padreId de otro municipio es rechazado por Postgres

- GIVEN un lugar de Ticul
- WHEN se intenta crear un lugar en Motul con `padreId` apuntando a ese
  lugar de Ticul
- THEN Postgres rechaza el INSERT por la restriccion de aislamiento, no
  solo la aplicacion

### Requirement: Alta, edicion, baja y reparenteo de lugares con bitacora (Rebanada 3)

Toda alta, edicion de nombre, baja y reparenteo de un lugar MUST dejar una
fila de bitacora con solo ids en la misma transaccion que el cambio. Un
reparenteo o un renombre equivocado MUST poder deshacerse con la misma
operacion, en transaccion y con su propia entrada de bitacora, sin
migracion.

#### Scenario: reparentear deja traza

- GIVEN un lugar existente
- WHEN se reparenta
- THEN la bitacora registra actor, lugar, padre anterior y padre nuevo,
  solo ids, en la misma transaccion

### Requirement: Consulta de subarbol incluye lo colgado directo de cada nivel (Rebanada 3)

Consultar todos los descendientes de un lugar MUST devolver, en una sola
consulta, tanto lo que cuelga directo de ese lugar como lo que cuelga de
cualquier descendiente suyo a cualquier profundidad, sin exigir nodos
intermedios de relleno.

#### Scenario: sector con manzanas y un domicilio directo

- GIVEN un sector con dos manzanas y un domicilio colgado directo del
  sector (sin manzana)
- WHEN se piden todos los domicilios de ese sector
- THEN el resultado incluye el domicilio directo y los domicilios de
  ambas manzanas

### Requirement: Catalogo de calles por asentamiento, sin maquinaria de deduplicacion (Rebanada 4)

`calles` MUST ser un catalogo cerrado, capturable solo por seleccion —
nunca texto libre— para el operador de mostrador. `calles` MUST NOT
llevar columna normalizada, indice de trigramas ni catalogo de
abreviaturas: es un conjunto cerrado y chico por asentamiento, no un
conjunto abierto de nombres propios como `personas`. Una calle de la
cabecera municipal MUST referenciar el lugar explicito de `tipo=cabecera`
en `lugarId`; `lugarId NULL` MUST NOT usarse para representar la
cabecera.

#### Scenario: la Calle 21 de la cabecera y la de una comisaria coexisten

- GIVEN una calle "21" con `lugarId` apuntando al lugar cabecera, y otra
  calle "21" con `lugarId` apuntando a una comisaria distinta
- WHEN se listan las calles del municipio
- THEN ambas existen como filas distintas sin colisionar por nombre

#### Scenario: capturar una calle es elegir, no escribir

- GIVEN el catalogo de calles ya cargado para un asentamiento
- WHEN un operador captura un domicilio
- THEN selecciona la calle de una lista existente en vez de escribir su
  nombre

### Requirement: Aislamiento de calles por ayuntamiento (Rebanada 4)

`calles` MUST llevar `ayuntamientoId` con `FORCE ROW LEVEL SECURITY` y su
propio test de aislamiento; su FK hacia `lugares` MUST ser compuesto
contra `(id, ayuntamientoId)`.

#### Scenario: Un municipio no ve las calles de otro

- GIVEN calles sembradas en Motul y en Ticul
- WHEN se consulta `calles` con contexto en Motul y sin filtro explicito
  de tenant
- THEN solo aparecen filas de Motul

### Requirement: Renombrar una calle no reescribe domicilios (Rebanada 4)

Renombrar una calle MUST actualizar unicamente la fila de esa calle en el
catalogo. Los domicilios y residencias que la referencian por id MUST NOT
cambiar ninguna de sus filas.

#### Scenario: renombrar la Calle 21

- GIVEN domicilios que referencian la Calle 21 por id
- WHEN se renombra esa calle
- THEN ningun domicilio ni residencia cambia de fila, y las consultas
  siguientes muestran el nombre nuevo por seguir la misma referencia

### Requirement: Ubicacion compuesta como texto para un reporte ciudadano

El sistema MUST exponer, en un puerto de lectura propio de `territorio`,
un caso de uso que componga la ubicacion de un reporte como una sola
cadena de texto a partir de `lugarId` obligatorio y `calleId` opcional
-sin domicilio ni residencia-, resolviendo la cadena de ancestros
internamente. Esa misma lectura MUST validar que el lugar y, si se
provee, la calle existan, pertenezcan al ayuntamiento del contexto y
esten activos (`bajaEn IS NULL`), devolviendo un error tipado en vez de un
error crudo de Postgres cuando no.

#### Scenario: Ubicacion completa con lugar y calle

- GIVEN un lugar con su cadena de ancestros y una calle asociada
- WHEN se pide la ubicacion compuesta de un lugarId y un calleId
- THEN el texto incluye la cadena de ancestros y la calle

#### Scenario: Ubicacion sin calle compone solo el lugar

- GIVEN un lugarId sin calleId
- WHEN se pide la ubicacion compuesta
- THEN el texto compone la cadena de ancestros del lugar, sin mencion de
  calle

#### Scenario: Un lugarId de otro municipio o dado de baja se rechaza

- GIVEN un lugarId que pertenece a otro ayuntamiento o que esta dado de
  baja
- WHEN se pide su ubicacion compuesta
- THEN el sistema responde con un error tipado, no con un error crudo de
  Postgres

#### Scenario: La composicion refleja la jerarquia vigente, no una copia congelada

- GIVEN un lugar cuya colonia se reparenta a otra comisaria despues del
  registro del reporte
- WHEN se pide la ubicacion compuesta despues del reparenteo
- THEN el texto refleja la cadena de ancestros actual, al reves que una
  constancia emitida, que no cambia
