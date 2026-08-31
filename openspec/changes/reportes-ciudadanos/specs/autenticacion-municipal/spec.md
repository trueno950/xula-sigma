# Delta for Autenticacion Municipal

## MODIFIED Requirements

### Requirement: Limitacion de ritmo sin bloqueo persistente

El sistema MUST limitar el ritmo de intentos fallidos de inicio de sesion
por IP y por correo, y MUST limitar el ritmo de consultas a la validacion
publica de folio -de una constancia o de un reporte ciudadano- por clave
derivada del origen del request, usando el mismo valor cerrado `"folio"`
del tipo de intento para las dos superficies consumidoras. El sistema
MUST NOT agregar un valor nuevo a `TipoIntento` ni una migracion de
esquema para distinguirlas entre si: comparten la misma tabla de
intentos, el mismo hash de clave y la misma ventana de 15 minutos. El
sistema MUST NOT aplicar un bloqueo que persista mas alla de la ventana
de limitacion, en ninguno de los usos.
(Previously: limitaba el ritmo de intentos fallidos de inicio de sesion
por IP y por correo, y el ritmo de consultas a la validacion publica de
folio de una sola superficie -la de constancias-.)

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

#### Scenario: Consultar constancias y reportes desde el mismo origen comparte cuota

- GIVEN un origen que ya consulto varios folios de constancia, cerca del
  umbral de la ventana
- WHEN ese mismo origen consulta ademas el folio de un reporte ciudadano
- THEN la consulta cuenta contra la misma ventana compartida
- AND superar el umbral entre las dos superficies rechaza las siguientes
  consultas de cualquiera de las dos
