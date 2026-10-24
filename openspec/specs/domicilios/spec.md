# Domicilios — Specification

## Purpose

Una direccion en Yucatan no es "calle + numero": el numero puede faltar y
la ubicacion real la dan las transversales. `domicilios` modela esa
direccion compuesta —lugar en el asentamiento o la colonia, calle,
numero opcional, dos transversales opcionales, referencia libre— sin
inventar niveles de contencion que el dato no tiene.

Cada requisito lleva su rebanada de entrega entre parentesis (1 a 7, ver
proposal.md "Presupuesto de revision") para que `sdd-tasks` corte sin
releer esta decision.

## Requirements


### Requirement: Direccion compuesta cuelga del asentamiento o la colonia (Rebanada B2)

`domicilios.lugarId` MUST apuntar a un lugar de tipo `cabecera`,
`comisaria` o `colonia`, nunca a otro tipo de `lugares`.
`domicilios.calleId` MUST seguir siendo obligatorio. La ausencia de una
colonia conocida MUST NOT impedir el alta de un domicilio: puede
colgar directo del asentamiento.

#### Scenario: domicilio sin colonia conocida

- GIVEN un asentamiento sin colonias registradas
- WHEN se da de alta un domicilio con calle y numero, `lugarId`
  apuntando al asentamiento
- THEN el domicilio se crea correctamente sin exigir una colonia
  intermedia

#### Scenario: lugarId fuera del arbol de direcciones se rechaza

- GIVEN un intento de alta o correccion de domicilio con `lugarId`
  apuntando a un lugar que no es `cabecera`, `comisaria` ni `colonia`
- WHEN se intenta guardar
- THEN el sistema rechaza la operacion

### Requirement: numero es texto nullable; la ausencia es NULL, nunca un centinela (Rebanada 5)

`domicilios.numero` MUST ser texto y MUST permitir NULL para representar
que no hay numero o que no se capturo. El sistema MUST NOT usar una
cadena como "S/N" para representar esa ausencia: esa clase de valor
centinela deja de distinguir "sin numero" de "no capturado".

#### Scenario: domicilio sin numero

- GIVEN una casa sin numero visible
- WHEN se da de alta su domicilio sin capturar numero
- THEN `numero` queda en NULL, distinguible de una cadena "S/N"

### Requirement: Transversales son dos referencias nullable, distintas entre si y de la calle principal (Rebanada 5)

`entreCalleAId` y `entreCalleBId` MUST ser referencias nullable al mismo
catalogo de calles. Cuando ambas estan presentes MUST ser distintas entre
si y distintas de `calleId`.

#### Scenario: transversales capturadas

- GIVEN un domicilio en la Calle 21
- WHEN se capturan "entre 20 y 22" como transversales
- THEN el domicilio guarda ambas referencias y ninguna coincide con la
  calle principal ni entre si

#### Scenario: transversal repetida se rechaza

- GIVEN un alta de domicilio con `entreCalleAId` igual a `calleId`
- WHEN se intenta guardar
- THEN el sistema rechaza el alta

#### Scenario: comisaria rural sin transversales

- GIVEN una comisaria sin numeracion cruzada conocida
- WHEN se da de alta un domicilio ahi sin transversales
- THEN el domicilio se crea con ambas transversales en NULL

### Requirement: Aislamiento de domicilios por ayuntamiento (Rebanada 5)

`domicilios` MUST llevar `ayuntamientoId` con `FORCE ROW LEVEL SECURITY` y
su propio test de aislamiento; sus FK hacia `lugares` y `calles`
(`calleId`, `entreCalleAId`, `entreCalleBId`) MUST ser compuestos contra
`(id, ayuntamientoId)`.

#### Scenario: un municipio no ve los domicilios de otro

- GIVEN domicilios sembrados en Motul y en Ticul
- WHEN se consulta `domicilios` con contexto en Motul y sin filtro
  explicito de tenant
- THEN solo aparecen filas de Motul

#### Scenario: un domicilio no puede citar una calle de otro municipio

- GIVEN una calle de Ticul
- WHEN se intenta crear un domicilio en Motul cuyo `calleId` apunte a esa
  calle
- THEN Postgres rechaza el INSERT por la restriccion de aislamiento

### Requirement: Reparentear un lugar o renombrar una calle no toca domicilios (Rebanada 5)

Reparentear el lugar del que cuelga un domicilio, o renombrar la calle
que referencia, MUST NOT modificar ninguna fila de `domicilios`. El
domicilio sigue apuntando al mismo id de lugar y de calle; solo cambia lo
que esos ids representan.

#### Scenario: reparentear una colonia no mueve sus domicilios

- GIVEN domicilios colgados de una colonia
- WHEN esa colonia se reparenta a otra comisaria
- THEN ninguna fila de `domicilios` cambia

### Requirement: Consulta por subarbol y por calle (Rebanada 5)

El sistema MUST permitir consultar todos los domicilios de un lugar y su
subarbol, y todos los domicilios de una calle especifica, cada una en una
sola consulta.
(Previously: el titulo decia "Consulta por zona y por calle"; el
escenario de ejemplo citaba manzanas, que dejan de existir como tipo de
`lugares` en este cambio. El cuerpo del requisito ya hablaba de "un
lugar y su subarbol" en terminos genericos y no necesito editarse.)

#### Scenario: todos los domicilios de la Calle 21

- GIVEN domicilios en la Calle 21 que cruzan varias colonias
- WHEN se piden todos los domicilios de esa calle
- THEN el resultado incluye los de todas las colonias que la calle
  atraviesa

## ADDED Requirements

### Requirement: Un domicilio puede existir sin residentes (Rebanada 5)

El alta de un domicilio MUST NOT exigir una residencia abierta. Un
domicilio deshabitado es un registro valido: Fase 6 recorre domicilios,
no personas, y una casa vacia se descacharriza y se fumiga igual.

#### Scenario: domicilio deshabitado aparece en campana por zona

- GIVEN un domicilio sin ninguna residencia registrada
- WHEN se consulta la zona para una campana
- THEN ese domicilio aparece en el resultado

### Requirement: Domicilios en la exportacion por ayuntamiento (Rebanada 7)

`territorio` MUST aportar una `PorcionExportable` para domicilios con
columnas listadas una por una, nunca `select()` pelado.

#### Scenario: la exportacion no trae columnas no declaradas

- GIVEN la `PorcionExportable` de domicilios
- WHEN se genera una exportacion
- THEN solo aparecen las columnas listadas explicitamente

### Requirement: Direccion compuesta como texto imprimible

El sistema MUST exponer, en la superficie publica de `domicilios`, un
caso de uso de lectura que componga la direccion completa de un
domicilio como una sola cadena de texto -cadena de ancestros de
`lugares` desde el asentamiento hasta la colonia si existe, calle,
numero, transversales y referencia-, resolviendo el orden de los tipos
de lugar internamente. Un consumidor externo MUST NOT tener que subir
`padreId` a mano ni conocer el orden de tipos de `lugares` para obtener
este texto.
(Previously: la cadena de ancestros citaba manzana, sector, colonia,
comisaria o cabecera como "el nivel conocido mas profundo".)

#### Scenario: Direccion completa con asentamiento y colonia conocidos

- GIVEN un domicilio colgado de una colonia con su comisaria conocida,
  calle, numero y dos transversales
- WHEN se pide su direccion compuesta como texto
- THEN el texto incluye la comisaria, la colonia, la calle, el numero y
  ambas transversales

#### Scenario: Direccion colgada directo del asentamiento compone solo ese nivel

- GIVEN un domicilio colgado directo de una comisaria, sin colonia
  registrada
- WHEN se pide su direccion compuesta como texto
- THEN el texto incluye la comisaria sin dejar un hueco visible ni
  fallar

#### Scenario: La composicion refleja la jerarquia vigente, no una copia congelada

- GIVEN un domicilio cuya colonia se reparenta a otra comisaria
- WHEN se pide su direccion compuesta como texto despues del reparenteo
- THEN el texto refleja la cadena de ancestros actual; congelar ese
  texto en un documento ya emitido es responsabilidad de quien consume
  esta lectura, no de este caso de uso

### Requirement: Listado plano de domicilios con busqueda y paginado (Rebanada A1)

El sistema MUST exponer un listado de domicilios a nivel de todo el
municipio, con busqueda por calle, numero y nombre de asentamiento, y
con paginacion. El sistema MUST NOT cargar la totalidad de los
domicilios del municipio en una sola respuesta.

La paginacion es la de "Ver mas" que ya usan `padron`, `constancias` y
`reportes`: el limite crece y no hay `OFFSET` ni indice de pagina
(`reportes/application/puertos.ts:152`, `design.md` "Paginacion"). El
sistema MUST pedir `limite + 1` filas para saber si hay una pagina
siguiente, y MUST NOT contar el total con `COUNT(*)`. El orden MUST ser
determinista: sin el, una fila salta entre dos lecturas de distinto
limite y queda repetida o perdida.

#### Scenario: buscar por calle devuelve solo coincidencias

- GIVEN un municipio con domicilios en varias calles
- WHEN se busca el listado filtrando por el nombre de una calle
- THEN el resultado incluye unicamente domicilios de esa calle

#### Scenario: el listado no carga todo el municipio de una vez

- GIVEN un municipio con miles de domicilios
- WHEN se abre el listado sin filtro
- THEN la respuesta trae como maximo el tamano de pagina configurado,
  nunca la totalidad de domicilios del municipio

#### Scenario: ampliar el limite no repite ni pierde filas

- GIVEN un listado leido con un limite dado
- WHEN se vuelve a pedir con un limite mayor y el mismo filtro
- THEN el resultado mas grande empieza por el mas chico, en el mismo
  orden, sin repetir ninguna fila ni saltearse ninguna del rango

### Requirement: Migracion de domicilios preserva el lugarId anterior en bitacora (Rebanada B3)

La migracion de datos que sube domicilios colgados de un `sector` o
una `manzana` a su colonia o asentamiento MUST escribir, para cada
domicilio movido, una fila de bitacora con el `lugarId` anterior antes
de sobrescribirlo. El sistema MUST NOT ejecutar el movimiento de una
fila de `domicilios` sin esa fila de bitacora en la misma transaccion.

#### Scenario: domicilio movido deja traza reconstruible

- GIVEN un domicilio colgado de un sector antes de la migracion
- WHEN la migracion lo sube a su colonia
- THEN la bitacora registra el `lugarId` anterior y el nuevo, solo
  ids, en la misma transaccion, antes de que la fila de `domicilios`
  cambie

#### Scenario: el rollback usa la bitacora para restaurar el lugarId anterior

- GIVEN domicilios migrados con su `lugarId` anterior en bitacora
- WHEN se ejecuta el rollback de la Rebanada B3
- THEN cada domicilio vuelve a su `lugarId` original leyendo
  unicamente la bitacora, sin otra fuente de datos
