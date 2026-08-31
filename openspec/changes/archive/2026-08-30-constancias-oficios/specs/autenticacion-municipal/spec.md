# Delta for Autenticacion Municipal

## MODIFIED Requirements

### Requirement: Limitacion de ritmo sin bloqueo persistente

El sistema MUST limitar el ritmo de intentos fallidos de inicio de sesion
por IP y por correo, y MUST limitar el ritmo de consultas a la validacion
publica de folio por clave derivada del origen del request, agregando el
valor `"folio"` al tipo cerrado de intento y su propia entrada de umbral.
Los dos usos MUST compartir la misma tabla de intentos, el mismo hash de
clave y la misma ventana de 15 minutos. El sistema MUST NOT aplicar un
bloqueo que persista mas alla de la ventana de limitacion, en ninguno de
los dos usos.
(Previously: limitaba unicamente intentos fallidos de inicio de sesion por
IP y por correo, sin cubrir la validacion publica de folio.)

#### Scenario: Intentos fallidos repetidos activan limitacion temporal

- GIVEN un correo que recibe intentos fallidos por encima del umbral
  configurado dentro de la ventana de tiempo
- WHEN llega un nuevo intento para ese correo o esa IP
- THEN el sistema lo rechaza por limitacion de ritmo
- AND una contrasenia correcta enviada despues de expirar la ventana
  autentica con normalidad

#### Scenario: Consultas repetidas de folio activan limitacion temporal

- GIVEN un origen que consulta folios por encima del umbral configurado
  dentro de la ventana de tiempo
- WHEN llega una nueva consulta de folio desde ese origen
- THEN el sistema la rechaza por limitacion de ritmo
- AND una consulta enviada despues de expirar la ventana se procesa con
  normalidad

#### Scenario: La ventana de limitacion de folio no cruza municipios

- GIVEN intentos de validacion de folio registrados para un origen en un
  ayuntamiento
- WHEN el mismo origen consulta folios en otro ayuntamiento
- THEN esos intentos no cuentan en su ventana de ese segundo ayuntamiento
