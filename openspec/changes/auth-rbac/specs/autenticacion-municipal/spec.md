# Autenticacion Municipal — Specification

## Purpose

Autenticacion por email y contrasenia, delimitada al ayuntamiento donde la
cuenta fue creada, con sesion por subdominio, limitacion de ritmo, y
respuestas indistinguibles entre cuenta inexistente, cuenta de otro
municipio y cuenta dada de baja.

## Requirements

### Requirement: Aislamiento de autenticacion por ayuntamiento

El sistema MUST rechazar el inicio de sesion cuando el subdominio del
request no corresponde al ayuntamiento de la cuenta, incluso con la
contrasenia correcta, y MUST responder con el mismo mensaje generico que
ante una cuenta inexistente.

#### Scenario: Contrasenia correcta en el subdominio equivocado

- GIVEN una cuenta creada en el ayuntamiento de Motul con contrasenia valida
- WHEN esa cuenta intenta iniciar sesion en el subdominio de Ticul con la
  contrasenia correcta
- THEN el sistema responde con el mismo mensaje de error que ante una
  cuenta inexistente
- AND no se crea sesion

#### Scenario: Mismo correo en dos municipios son dos cuentas distintas

- GIVEN una cuenta con correo "persona@ejemplo.mx" en Motul y otra con el
  mismo correo en Ticul, con contrasenias distintas
- WHEN cada cuenta inicia sesion en su propio subdominio con su propia
  contrasenia
- THEN ambos inicios de sesion tienen exito
- AND cada sesion queda asociada unicamente al ayuntamiento_id de su
  propia cuenta

### Requirement: Baja logica bloquea el acceso

El sistema MUST rechazar el inicio de sesion de un usuario dado de baja
logica, con el mismo mensaje generico que ante una cuenta inexistente.

#### Scenario: Usuario dado de baja intenta iniciar sesion

- GIVEN un usuario con baja logica registrada y su contrasenia sin cambios
- WHEN intenta iniciar sesion con la contrasenia correcta
- THEN el sistema responde con el mismo mensaje que ante una cuenta
  inexistente
- AND no se crea sesion

### Requirement: Sesion por subdominio

El sistema MUST emitir la cookie de sesion con alcance restringido al
subdominio del ayuntamiento donde se autentico, sin `crossSubDomainCookies`.

#### Scenario: La cookie no viaja a otro subdominio

- GIVEN una sesion iniciada en el subdominio de Motul
- WHEN el navegador hace un request al subdominio de Ticul
- THEN el request no incluye la cookie de sesion de Motul

### Requirement: ayuntamiento_id nunca llega desde el cliente

El sistema MUST resolver el ayuntamiento_id efectivo desde el contexto de
servidor en cada operacion de autenticacion, y MUST ignorar cualquier valor
de ayuntamiento_id presente en body, query string o encabezados no
controlados por el servidor.

#### Scenario: Un body con ayuntamiento_id ajeno no cambia el tenant

- GIVEN un request de inicio de sesion en el subdominio de Motul
- WHEN el body incluye un ayuntamiento_id que corresponde a Ticul
- THEN el sistema evalua la cuenta contra el ayuntamiento de Motul,
  resuelto por subdominio en el servidor
- AND el valor del body no tiene efecto

### Requirement: Limitacion de ritmo sin bloqueo persistente

El sistema MUST limitar el ritmo de intentos fallidos de inicio de sesion
por IP y por correo, y MUST NOT aplicar un bloqueo de cuenta que persista
mas alla de la ventana de limitacion.

#### Scenario: Intentos fallidos repetidos activan limitacion temporal

- GIVEN un correo que recibe intentos fallidos por encima del umbral
  configurado dentro de la ventana de tiempo
- WHEN llega un nuevo intento para ese correo o esa IP
- THEN el sistema lo rechaza por limitacion de ritmo
- AND una contrasenia correcta enviada despues de expirar la ventana
  autentica con normalidad

### Requirement: Aislamiento de las tablas de autenticacion

Las tablas `user`, `session`, `account` y `verification` MUST llevar
`ayuntamiento_id`, `FORCE ROW LEVEL SECURITY`, politica de aislamiento y
`GRANT` explicito, y MUST tener test de aislamiento.

#### Scenario: Consulta sin filtro de tenant sobre `user`

- GIVEN usuarios sembrados en dos ayuntamientos
- WHEN se ejecuta una consulta sobre `user` sin filtro explicito de
  tenant, con el contexto fijado en un ayuntamiento
- THEN la consulta devuelve unicamente las filas de ese ayuntamiento

#### Scenario: `verification` sin userId tambien queda aislada

- GIVEN un token de verificacion generado en el flujo de un ayuntamiento
- WHEN se consulta `verification` sin filtro explicito de tenant, con el
  contexto fijado en otro ayuntamiento
- THEN esa fila no aparece
