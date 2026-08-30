# Delta for Autorizacion por Roles

## ADDED Requirements

### Requirement: Regla de autorizacion para administrar documentos oficiales

El sistema MUST reconocer una regla `puedeAdministrarDocumentos` que
autoriza unicamente al rol `ADMIN_MUNICIPAL` a cancelar una constancia y a
configurar el bloque de firma de su propio ayuntamiento. `OPERADOR`,
`CONSULTA` y `SUPER_ADMIN` MUST NOT poder ejecutar ninguna de las dos.
Emitir y reimprimir constancias MUST seguir autorizandose por la regla
generica `puedeEscribir` existente, sin cambio: es trabajo de mostrador,
mismo criterio que `puedeAdministrarTerritorio` distingue estructura de
captura.

**Supuesto declarado, reversible.** Esta regla asume que quien atiende el
mostrador no es la misma persona que administra el ayuntamiento. Si el
piloto tiene un solo operador que cubre ambos roles, la restriccion cuesta
demora sin beneficio de control. Aflojarla despues —por ejemplo,
extendiendo `puedeAdministrarDocumentos` a `OPERADOR`— es cambiar una
funcion pura de una linea, sin migracion de esquema.

#### Scenario: ADMIN_MUNICIPAL cancela una constancia de su municipio

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN cancela una constancia emitida en ese mismo ayuntamiento
- THEN la regla de autorizacion lo permite

#### Scenario: OPERADOR no puede cancelar aunque emitio el documento

- GIVEN un OPERADOR que emitio una constancia
- WHEN intenta cancelarla
- THEN la regla de autorizacion lo rechaza con 403

#### Scenario: ADMIN_MUNICIPAL configura el bloque de firma

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN configura nombre, cargo y leyenda de pie del bloque de firma
- THEN la regla de autorizacion lo permite

#### Scenario: OPERADOR emite y reimprime sin necesitar la regla nueva

- GIVEN un OPERADOR con permiso de escritura sobre `constancias`
- WHEN emite o reimprime una constancia de su ayuntamiento
- THEN la operacion se autoriza por `puedeEscribir`, sin necesitar
  `puedeAdministrarDocumentos`

#### Scenario: SUPER_ADMIN no puede administrar documentos de ningun municipio

- GIVEN un usuario con rol SUPER_ADMIN
- WHEN intenta cancelar una constancia o configurar el bloque de firma de
  cualquier ayuntamiento
- THEN la regla de autorizacion lo rechaza
