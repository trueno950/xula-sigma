# Residencias — Specification

## Purpose

Una constancia de vecindad certifica que una persona vive en un domicilio
desde una fecha, no un nombre. `residencias` modela esa relacion temporal
persona-domicilio con mudanza atomica, una sola residencia vigente por
persona, y una regla de colapso explicita para cuando la identidad de esa
persona viene de una fusion en `padron` que nunca cascadeo hacia aca.

Cada requisito lleva su rebanada de entrega entre parentesis (1 a 7, ver
proposal.md "Presupuesto de revision") para que `sdd-tasks` corte sin
releer esta decision.

## Requirements

### Requirement: Relacion temporal persona-domicilio (Rebanada 6)

`residencias` MUST registrar `personaId`, `domicilioId`, `desdeEn` y
`hastaEn` nullable. `hastaEn IS NULL` MUST significar residencia vigente.

#### Scenario: alta de residencia abierta

- GIVEN una persona sin residencia previa
- WHEN se registra su domicilio con `desdeEn` de hoy
- THEN la residencia queda con `hastaEn` en NULL

### Requirement: A lo sumo una residencia abierta por persona (Rebanada 6)

El sistema MUST impedir, mediante un indice unico parcial sobre
`(ayuntamientoId, personaId) WHERE hastaEn IS NULL`, que una misma
persona —por el `personaId` almacenado— tenga mas de una residencia
vigente.

#### Scenario: segunda residencia abierta se rechaza

- GIVEN una persona con una residencia vigente
- WHEN se intenta abrir una segunda residencia sin cerrar la primera
- THEN el sistema rechaza la operacion

### Requirement: Mudanza atomica (Rebanada 6)

Registrar una mudanza —cerrar la residencia vigente y abrir una nueva—
MUST ejecutarse en una sola transaccion. En ningun instante observable la
persona MUST quedar sin residencia vigente ni con dos.

#### Scenario: mudanza exitosa dentro de una transaccion

- GIVEN una persona con residencia vigente en el domicilio A
- WHEN se registra su mudanza al domicilio B
- THEN la residencia en A queda cerrada con `hastaEn` y la residencia en
  B queda abierta, ambas confirmadas en la misma transaccion

#### Scenario: una mudanza que falla no deja huella parcial

- GIVEN una mudanza cuya apertura del nuevo domicilio falla
- WHEN la transaccion se revierte
- THEN la residencia anterior sigue vigente sin haberse cerrado

### Requirement: Sin motivo estructurado de mudanza (Rebanada 6)

`residencias` MUST NOT llevar ninguna columna de motivo, estructurada o
de texto libre, sobre por que una persona dejo un domicilio: es la misma
clase de dato sensible sin proteccion que la decision de baja sin motivo
de `padron`.

#### Scenario: el esquema no tiene columna de motivo

- GIVEN el esquema de `residencias`
- WHEN se revisan sus columnas
- THEN ninguna representa motivo de mudanza

### Requirement: FK compuesto a mano hacia personas y aislamiento cruzado entre modulos (Rebanada 6)

`residencias.personaId` MUST vincularse por un FK compuesto, escrito a
mano en la migracion, contra `personas(id, ayuntamiento_id)`. Una
residencia MUST NOT poder apuntar a una persona de otro municipio, y esa
restriccion MUST ser exigible por Postgres, no solo por la aplicacion.

#### Scenario: residencia con persona de otro municipio es rechazada por Postgres

- GIVEN una persona registrada en Ticul
- WHEN se intenta crear en Motul una residencia cuyo `personaId` sea el
  de esa persona de Ticul
- THEN Postgres rechaza el INSERT por la restriccion, no solo el caso de
  uso

### Requirement: Aislamiento de residencias por ayuntamiento (Rebanada 6)

`residencias` MUST llevar `ayuntamientoId` con `FORCE ROW LEVEL SECURITY`
y su propio test de aislamiento; su FK hacia `domicilios` MUST ser
compuesto contra `(id, ayuntamientoId)`.

#### Scenario: un municipio no ve las residencias de otro

- GIVEN residencias sembradas en Motul y en Ticul
- WHEN se consulta `residencias` con contexto en Motul y sin filtro
  explicito de tenant
- THEN solo aparecen filas de Motul

### Requirement: Reparentear un lugar no toca residencias (Rebanada 6)

Reparentear cualquier lugar de la jerarquia MUST NOT modificar ninguna
fila de `residencias` ni cerrar ni abrir ninguna residencia.

#### Scenario: reparentear una comisaria no mueve residencias

- GIVEN residencias vigentes en domicilios colgados de una comisaria
- WHEN esa comisaria se reparenta
- THEN ninguna fila de `residencias` cambia ni se cierra ni se abre

### Requirement: La fusion de personas no cascadea; el colapso ocurre en la lectura (Rebanada 6)

Fusionar dos personas en `padron` MUST NOT escribir ni modificar ninguna
fila de `residencias`. El indice unico parcial del requisito anterior
sigue evaluandose sobre el `personaId` almacenado, no sobre la identidad
colapsada. El puerto de lectura de `territorio` MUST resolver el
historial de una identidad fusionada consultando el puerto de lectura de
`padron` para colapsar el `personaId` ganador y el perdedor antes de
responder.

Cuando ese colapso produce mas de una residencia con `hastaEn IS NULL`
para la identidad fusionada —posible porque cada `personaId` mantiene su
propio indice unico parcial de forma independiente—, el sistema MUST
desempatar por `desdeEn` mas reciente: esa es la residencia que se
presenta como vigente. Las demas residencias abiertas de la identidad
fusionada MUST seguir apareciendo en el historial, pero no como la
vigente.

#### Scenario: historial de una identidad fusionada trae ambos ids colapsados

- GIVEN la persona A con residencias historicas y la persona B con
  residencias historicas, y A fusionada hacia B
- WHEN se consulta el historial de residencias por el id de A
- THEN el resultado incluye las residencias de A y de B, colapsadas bajo
  la misma identidad, ordenadas

#### Scenario: dos residencias abiertas tras la fusion se desempatan por la mas reciente

- GIVEN A con una residencia vigente abierta el 1 de marzo, y B —su
  fusion— con una residencia vigente abierta el 10 de marzo, sin que la
  fusion haya tocado ninguna de las dos
- WHEN se consulta la residencia vigente de la identidad fusionada
- THEN el resultado es la residencia abierta el 10 de marzo, y la de A
  sigue visible en el historial como no vigente

#### Scenario: revertir la fusion devuelve cada residencia a su personaId original sin migracion

- GIVEN A fusionada hacia B, cada una con residencias propias
- WHEN se revierte la fusion de A
- THEN consultar el historial de A por separado ya no incluye las
  residencias de B, sin que ninguna fila de `residencias` haya cambiado
  en ningun momento
