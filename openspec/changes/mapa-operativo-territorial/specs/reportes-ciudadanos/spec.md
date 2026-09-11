# Delta for Reportes Ciudadanos

## ADDED Requirements

### Requirement: Lectura operativa por calle para el mapa

El sistema MUST exponer una lectura operativa —solo con sesion— que
devuelva los reportes del ayuntamiento del contexto con `calleId`,
`lugarId`, folio, tipo y estado, para que el mapa operativo los agregue y
cuente. La lectura MUST incluir los reportes con `calleId` nulo, que el
mapa declara como cobertura faltante, y MUST NOT devolver `descripcion` ni
`referencia`, que siguen protegidas en el detalle del reporte.

#### Scenario: La lectura devuelve lo necesario para el marcador

- GIVEN reportes en el ayuntamiento del contexto
- WHEN se ejecuta la lectura operativa
- THEN cada fila trae id, folio, tipo, estado, `calleId` y `lugarId`
- AND no trae descripcion ni referencia

#### Scenario: Un reporte sin calle sigue en la lectura

- GIVEN un reporte con `calleId` nulo
- WHEN se ejecuta la lectura operativa
- THEN el reporte aparece en el resultado, sin ser filtrado ni descartado

#### Scenario: La lectura solo ve el tenant del contexto

- GIVEN reportes en Motul y en Ticul
- WHEN se ejecuta la lectura con contexto de Motul
- THEN solo aparecen reportes de Motul
