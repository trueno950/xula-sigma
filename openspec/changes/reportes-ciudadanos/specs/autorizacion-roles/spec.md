# Delta for Autorizacion por Roles

## ADDED Requirements

### Requirement: Regla de autorizacion para administrar reportes ciudadanos

El sistema MUST reconocer una regla `puedeAdministrarReportes` que
autoriza unicamente al rol `ADMIN_MUNICIPAL` a cambiar el estado de un
reporte y a asignarle un area responsable, en su propio ayuntamiento.
`OPERADOR`, `CONSULTA` y `SUPER_ADMIN` MUST NOT poder ejecutar ninguna de
las dos. Registrar un reporte MUST seguir autorizandose por la regla
generica `puedeEscribir` existente, sin cambio: es trabajo de mostrador,
mismo criterio que `puedeAdministrarTerritorio` y `puedeAdministrarDocumentos`
distinguen estructura de captura. Marcar un reporte como duplicado usa
esta misma regla: no es una accion aparte, es un cambio de estado con
motivo `DUPLICADO`.

#### Scenario: ADMIN_MUNICIPAL cambia el estado de un reporte de su municipio

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN cambia el estado de un reporte de ese mismo ayuntamiento
- THEN la regla de autorizacion lo permite

#### Scenario: OPERADOR no puede cambiar estado aunque registro el reporte

- GIVEN un OPERADOR que registro un reporte
- WHEN intenta cambiar su estado
- THEN la regla de autorizacion lo rechaza con 403

#### Scenario: ADMIN_MUNICIPAL asigna area responsable

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN asigna un area responsable a un reporte de ese mismo ayuntamiento
- THEN la regla de autorizacion lo permite

#### Scenario: OPERADOR registra sin necesitar la regla nueva

- GIVEN un OPERADOR con permiso de escritura sobre `reportes`
- WHEN registra un reporte de su ayuntamiento
- THEN la operacion se autoriza por `puedeEscribir`, sin necesitar
  `puedeAdministrarReportes`

#### Scenario: SUPER_ADMIN no puede administrar reportes de ningun municipio

- GIVEN un usuario con rol SUPER_ADMIN
- WHEN intenta cambiar el estado o asignar area de un reporte de cualquier
  ayuntamiento
- THEN la regla de autorizacion lo rechaza
