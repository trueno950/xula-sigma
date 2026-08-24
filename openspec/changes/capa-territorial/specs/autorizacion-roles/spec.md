# Delta for Autorizacion Roles

## ADDED Requirements

### Requirement: Regla de autorizacion para administrar la estructura territorial (Rebanadas 2, 3 y 4)

El sistema MUST reconocer una regla `puedeAdministrarTerritorio` que
autoriza unicamente al rol `ADMIN_MUNICIPAL` a reparentar un lugar
existente y a administrar el catalogo de calles (alta y renombre) de su
propio ayuntamiento — mismo criterio que fusionar personas en `padron`:
reparentear reescribe la estructura del municipio, y renombrar una calle
cambia la direccion impresa de todos sus domicilios. `OPERADOR`,
`CONSULTA` y `SUPER_ADMIN` MUST NOT poder ejecutar ninguna de esas dos
acciones. El alta, la edicion de nombre y la baja de un lugar, el alta de
un domicilio y el registro de una mudanza MUST seguir autorizandose por la
regla generica `puedeEscribir` existente, sin cambio: son trabajo de
mostrador, no de estructura.

#### Scenario: ADMIN_MUNICIPAL reparenta un lugar de su municipio

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN reparenta una colonia de ese mismo ayuntamiento
- THEN la regla de autorizacion lo permite

#### Scenario: OPERADOR no puede reparentar aunque opere el modulo

- GIVEN un OPERADOR con permiso de escritura sobre `territorio`
- WHEN intenta reparentar un lugar
- THEN la regla de autorizacion lo rechaza con 403

#### Scenario: ADMIN_MUNICIPAL renombra una calle de su catalogo

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN renombra una calle de ese mismo ayuntamiento
- THEN la regla de autorizacion lo permite

#### Scenario: OPERADOR puede dar de alta un domicilio sin la regla nueva

- GIVEN un OPERADOR con permiso de escritura sobre `territorio`
- WHEN da de alta un domicilio en su ayuntamiento
- THEN la operacion se autoriza por `puedeEscribir`, sin necesitar
  `puedeAdministrarTerritorio`

#### Scenario: SUPER_ADMIN no puede administrar territorio de ningun municipio

- GIVEN un usuario con rol SUPER_ADMIN
- WHEN intenta reparentar un lugar o renombrar una calle de cualquier
  ayuntamiento
- THEN la regla de autorizacion lo rechaza
