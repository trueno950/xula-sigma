# Delta for Autorizacion por Roles

## ADDED Requirements

### Requirement: Regla de autorizacion para cambiar la marca del ayuntamiento

El sistema MUST reconocer una regla `puedeCambiarMarca` que autoriza
unicamente al rol `ADMIN_MUNICIPAL` a cambiar la marca —incluido el
escudo— de su propio ayuntamiento. `SUPER_ADMIN` MUST NOT poder cambiar la
marca de ningun ayuntamiento.

#### Scenario: ADMIN_MUNICIPAL puede cambiar su marca

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN intenta cambiar el escudo de su ayuntamiento
- THEN la regla de autorizacion lo permite

#### Scenario: OPERADOR y CONSULTA no pueden cambiar la marca

- GIVEN un usuario con rol OPERADOR o CONSULTA
- WHEN intenta cambiar el escudo de su ayuntamiento
- THEN la regla de autorizacion lo rechaza

#### Scenario: SUPER_ADMIN no puede cambiar la marca de ningun ayuntamiento

- GIVEN un usuario con rol SUPER_ADMIN
- WHEN intenta cambiar el escudo de cualquier ayuntamiento
- THEN la regla de autorizacion lo rechaza
