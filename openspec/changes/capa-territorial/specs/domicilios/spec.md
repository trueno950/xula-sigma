# Domicilios — Specification

## Purpose

Una direccion en Yucatan no es "calle + numero": el numero puede faltar y
la ubicacion real la dan las transversales. `domicilios` modela esa
direccion compuesta —lugar al nivel conocido mas profundo, calle,
numero opcional, dos transversales opcionales, referencia libre— sin
inventar niveles de contencion que el dato no tiene.

Cada requisito lleva su rebanada de entrega entre parentesis (1 a 7, ver
proposal.md "Presupuesto de revision") para que `sdd-tasks` corte sin
releer esta decision.

## Requirements

### Requirement: Direccion compuesta cuelga del nivel conocido mas profundo (Rebanada 5)

`domicilios.lugarId` MUST apuntar al nivel de `lugares` mas profundo que
se conozca para esa direccion (manzana si se sabe, si no sector, si no
colonia, si no comisaria o cabecera). `domicilios.calleId` MUST ser
obligatorio. La ausencia de niveles intermedios MUST NOT impedir el alta
de un domicilio.

#### Scenario: domicilio sin manzana conocida

- GIVEN una colonia sin manzanas registradas
- WHEN se da de alta un domicilio con calle y numero, `lugarId` apuntando
  a la colonia
- THEN el domicilio se crea correctamente sin exigir una manzana
  intermedia

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

### Requirement: Consulta por zona y por calle (Rebanada 5)

El sistema MUST permitir consultar todos los domicilios de un lugar y su
subarbol, y todos los domicilios de una calle especifica, cada una en una
sola consulta.

#### Scenario: todos los domicilios de la Calle 21

- GIVEN domicilios en la Calle 21 que cruzan varias manzanas
- WHEN se piden todos los domicilios de esa calle
- THEN el resultado incluye los de todas las manzanas que la calle
  atraviesa

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
