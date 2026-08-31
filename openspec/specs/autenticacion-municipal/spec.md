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

### Requirement: Aislamiento de toda tabla con `ayuntamiento_id`

Toda tabla alcanzada por este cambio que lleve `ayuntamiento_id` MUST tener
`FORCE ROW LEVEL SECURITY`, politica de aislamiento por tenant, `GRANT`
explicito y su propio `*.isolation.test.ts`.

La regla se enuncia por la presencia de la columna y NO por una lista de
tablas. Una lista obliga a que alguien se acuerde de extenderla; la regla
cubre a la tabla siguiente el dia que nace. Al cierre de este cambio las
tablas alcanzadas son `user`, `session`, `account`, `verification` e
`intentos_acceso`.

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

#### Scenario: La ventana de limitacion de ritmo no cruza municipios

- GIVEN intentos fallidos registrados en `intentos_acceso` para un correo
  en un ayuntamiento
- WHEN el mismo correo intenta acceder en otro ayuntamiento
- THEN esos intentos no cuentan en su ventana
- AND el acceso no queda limitado por actividad ajena a su municipio

#### Scenario: Un intento no se registra a nombre de otro municipio

- GIVEN el contexto de tenant fijado en un ayuntamiento
- WHEN se intenta insertar una fila en `intentos_acceso` con el
  `ayuntamiento_id` de otro
- THEN la escritura es rechazada por el `WITH CHECK` de la politica
