# Consulta Publica de Reportes — Specification

## Purpose

El folio de un reporte solo sirve si el vecino puede usarlo sin volver a
la ventanilla. `consulta-publica-de-reportes` responde con lo minimo
indispensable -folio, tipo, estado y dos fechas-, sin sesion, sin exponer
ningun dato de la persona ni la ubicacion, y con la misma respuesta para
todo caso negativo. Cuando el folio consultado es un duplicado, la
respuesta sigue el vinculo al original en vez de devolver `RECHAZADO`.

## Requirements

### Requirement: Caso de uso publico con firma propia, sin ContextoActual

El sistema MUST exponer un caso de uso publico
`(ayuntamientoId, folio) => ...`, sin `ContextoActual` ni `usuario`. El
`ayuntamientoId` MUST resolverse por `ayuntamientoActual()` a partir del
subdominio del request, nunca desde el folio, la URL o el body.

#### Scenario: El folio de la URL no elige el municipio

- GIVEN un request a `/reportes/{folio}` en el subdominio de Motul
- WHEN se resuelve el ayuntamiento contra el que se consulta el folio
- THEN el ayuntamiento resuelto es Motul, sin importar que exista un folio
  igual en otro municipio

### Requirement: Respuesta minima sin ningun dato personal

El sistema MUST responder unicamente el folio consultado, el tipo de
incidencia, el estado y las dos fechas -registro y ultimo movimiento-. El
sistema MUST NOT incluir el reportante, la descripcion, la referencia, la
ubicacion ni el area asignada.

#### Scenario: La respuesta no trae descripcion, referencia, ubicacion ni area

- GIVEN un reporte vigente con descripcion, referencia, ubicacion y area
  asignadas
- WHEN se consulta `/reportes/{folio}`
- THEN la respuesta trae folio, tipo, estado y las dos fechas, y no
  incluye descripcion, referencia, ubicacion, area ni ningun dato de
  persona

### Requirement: Un folio duplicado responde el estado del original y la fecha de registro propia

Cuando el reporte consultado tiene `duplicadoDeReporteId`, el sistema MUST
responder con el estado y la fecha de ultimo movimiento del reporte
original, resuelto en un solo salto, pero con la fecha de registro del
reporte consultado, no la del original: la fecha de registro responde
"cuando avise yo" -un hecho del reporte consultado-, y el estado responde
"van a arreglarlo" -eso si es del original-. El sistema MUST NOT incluir
el folio del original ni indicar que el reporte consultado es un
duplicado.

#### Scenario: Un reporte rechazado por duplicado responde en atencion

- GIVEN un reporte marcado RECHAZADO con motivo DUPLICADO, cuyo original
  esta en EN_ATENCION
- WHEN se consulta el folio del reporte duplicado
- THEN la respuesta trae el estado EN_ATENCION y la fecha de ultimo
  movimiento del original
- AND no aparece el folio del original ni ninguna mencion de que es un
  duplicado

#### Scenario: La fecha de registro es la propia, no la del original

- GIVEN un reporte duplicado registrado hoy, cuyo original se registro
  hace tres semanas
- WHEN se consulta el folio del reporte duplicado
- THEN la respuesta trae el estado del original y la fecha de ultimo
  movimiento del original
- AND la fecha de registro que devuelve es la de hoy, la del reporte
  consultado, no la de hace tres semanas

#### Scenario: El original rechazado por otro motivo tambien se refleja

- GIVEN un reporte marcado duplicado de un original que fue rechazado por
  FUERA_DE_COMPETENCIA
- WHEN se consulta el folio del duplicado
- THEN la respuesta trae RECHAZADO, el mismo estado que tiene el original
- AND la fecha de registro que devuelve sigue siendo la propia del
  reporte consultado

### Requirement: Toda respuesta negativa es indistinguible

Un folio inexistente, un folio de otro ayuntamiento y un folio mal escrito
MUST producir exactamente la misma respuesta generica. El sistema MUST NOT
exponer ninguna diferencia observable entre estos casos.

#### Scenario: Folio inexistente y folio de otro municipio responden igual

- GIVEN un folio que nunca existio y un folio real de Ticul consultado
  desde el subdominio de Motul
- WHEN se consulta cada uno por separado
- THEN ambas respuestas son identicas en contenido

### Requirement: Limitacion de ritmo por IP, nunca por folio

El sistema MUST limitar el ritmo de consultas por clave derivada de la IP
de origen, reusando el valor `"folio"` del tipo de intento existente. El
sistema MUST NOT usar el folio consultado como clave de la limitacion.

#### Scenario: Recorrer folios consecutivos agota la ventana por IP

- GIVEN un origen que consulta folios consecutivos crecientes en sucesion
  rapida
- WHEN supera el umbral de la ventana de limitacion
- THEN las siguientes consultas se rechazan por limitacion de ritmo,
  contadas por la IP y no por cada folio distinto
