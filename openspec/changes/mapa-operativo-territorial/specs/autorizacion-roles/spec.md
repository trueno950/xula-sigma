# Delta for Autorizacion por Roles

## ADDED Requirements

### Requirement: Regla de autorizacion para administrar intervenciones

El sistema MUST reconocer una regla `puedeAdministrarIntervenciones` que
autoriza unicamente al rol `ADMIN_MUNICIPAL` a cambiar el estado de una
intervencion y a registrar correcciones sobre ella, en su propio
ayuntamiento. `OPERADOR`, `CONSULTA` y `SUPER_ADMIN` MUST NOT poder
ejecutar ninguna de las dos. Registrar una intervencion MUST seguir
autorizandose por la regla generica `puedeEscribir` existente, sin cambio:
es trabajo de mostrador, mismo criterio que `puedeAdministrarReportes`
distingue estructura de captura.

#### Scenario: ADMIN_MUNICIPAL cambia el estado de una intervencion de su municipio

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN cambia el estado de una intervencion de ese mismo ayuntamiento
- THEN la regla de autorizacion lo permite

#### Scenario: OPERADOR no puede cambiar estado aunque registro la intervencion

- GIVEN un OPERADOR que registro una intervencion
- WHEN intenta cambiar su estado
- THEN la regla de autorizacion lo rechaza con 403

#### Scenario: ADMIN_MUNICIPAL corrige una intervencion de su municipio

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN corrige una intervencion de ese mismo ayuntamiento
- THEN la regla de autorizacion lo permite

#### Scenario: OPERADOR registra sin necesitar la regla nueva

- GIVEN un OPERADOR con permiso de escritura sobre `intervenciones`
- WHEN registra una intervencion de su ayuntamiento
- THEN la operacion se autoriza por `puedeEscribir`, sin necesitar
  `puedeAdministrarIntervenciones`

#### Scenario: SUPER_ADMIN no puede administrar intervenciones de ningun municipio

- GIVEN un usuario con rol SUPER_ADMIN
- WHEN intenta cambiar el estado o corregir una intervencion de cualquier
  ayuntamiento
- THEN la regla de autorizacion lo rechaza
