# Delta for Autorizacion Roles

## ADDED Requirements

### Requirement: Regla de autorizacion para fusionar personas (Rebanada 4)

El sistema MUST reconocer una regla `puedeFusionarPersonas` que autoriza
unicamente al rol `ADMIN_MUNICIPAL` a fusionar dos personas de su propio
ayuntamiento. `OPERADOR`, `CONSULTA` y `SUPER_ADMIN` MUST NOT poder
fusionar personas. El criterio es el mismo que `puedeExportar`, atenuado
porque la fusion es reversible.

#### Scenario: ADMIN_MUNICIPAL puede fusionar personas de su municipio

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN intenta fusionar dos personas de ese mismo ayuntamiento
- THEN la regla de autorizacion lo permite

#### Scenario: OPERADOR no puede fusionar aunque vea el duplicado

- GIVEN un OPERADOR que ve la sugerencia de duplicado en el mostrador
- WHEN intenta fusionar las dos personas
- THEN la regla de autorizacion lo rechaza con 403

#### Scenario: SUPER_ADMIN no puede fusionar personas de ningun municipio

- GIVEN un usuario con rol SUPER_ADMIN
- WHEN intenta fusionar dos personas de cualquier ayuntamiento
- THEN la regla de autorizacion lo rechaza
