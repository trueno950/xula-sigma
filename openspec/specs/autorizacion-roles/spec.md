# Autorizacion por Roles — Specification

## Purpose

Los cuatro roles de la plataforma, con la regla de que puede hacer cada
uno expresada como funcion pura de dominio, verificada en el caso de uso,
sin que un rechazo por rol revele la existencia de un recurso de otro
ayuntamiento.

## Requirements

### Requirement: Los cuatro roles y su alcance

El sistema MUST reconocer exactamente cuatro roles —`SUPER_ADMIN`,
`ADMIN_MUNICIPAL`, `OPERADOR`, `CONSULTA`— con el alcance de la tabla.

| Rol | Alcance |
|---|---|
| `SUPER_ADMIN` | Da de alta ayuntamientos; restablece unicamente la cuenta `ADMIN_MUNICIPAL` de un ayuntamiento; no opera modulos ni datos de ningun municipio |
| `ADMIN_MUNICIPAL` | Administra usuarios de su propio ayuntamiento: alta, baja logica, restablecimiento de contrasenia; opera todos los modulos de su ayuntamiento |
| `OPERADOR` | Opera los modulos de su ayuntamiento segun el permiso de cada modulo; no administra usuarios |
| `CONSULTA` | Solo lectura dentro de su ayuntamiento; no administra usuarios ni modifica registros |

#### Scenario: OPERADOR no puede administrar usuarios

- GIVEN un usuario con rol OPERADOR autenticado en su ayuntamiento
- WHEN intenta dar de alta o dar de baja a otro usuario de ese mismo
  ayuntamiento
- THEN el caso de uso responde 403

#### Scenario: CONSULTA no puede modificar registros

- GIVEN un usuario con rol CONSULTA autenticado en su ayuntamiento
- WHEN intenta ejecutar una operacion de escritura sobre un recurso de ese
  ayuntamiento
- THEN el caso de uso responde 403

### Requirement: La regla de autorizacion es pura y vive en dominio

La verificacion de si un rol puede ejecutar una accion MUST expresarse
como funcion de dominio sin IO. La resolucion del rol actual de sesion
MUST resolverse en infraestructura y consumirse desde application y ui,
nunca desde domain.

#### Scenario: La regla de rol se evalua sin acceso a datos

- GIVEN el rol de un usuario y la accion solicitada
- WHEN se evalua la regla de autorizacion
- THEN la evaluacion no ejecuta ninguna consulta ni IO

### Requirement: 403 de rol nunca convierte un 404 de tenant en 403

El sistema MUST responder 404 ante un recurso de otro ayuntamiento sin
importar el rol del usuario. La verificacion de rol MUST NOT ejecutarse
antes de que el aislamiento de tenant determine si el recurso existe para
ese usuario.

#### Scenario: ADMIN_MUNICIPAL pide un recurso de otro ayuntamiento

- GIVEN un usuario con rol ADMIN_MUNICIPAL de Motul
- WHEN pide por ID un recurso que pertenece a Ticul
- THEN el sistema responde 404
- AND no revela si el recurso existe en Ticul

#### Scenario: Un rol sin permiso sobre un recurso propio recibe 403

- GIVEN un usuario con rol CONSULTA de Motul
- WHEN pide una accion de escritura sobre un recurso que si pertenece a
  Motul
- THEN el sistema responde 403

### Requirement: Restablecimiento de contrasenia limitado por rol

`ADMIN_MUNICIPAL` MUST poder restablecer la contrasenia de cualquier
usuario de su propio ayuntamiento. `SUPER_ADMIN` MUST poder restablecer
unicamente la cuenta `ADMIN_MUNICIPAL` de un ayuntamiento, y MUST NOT
poder restablecer la contrasenia de ningun otro usuario.

#### Scenario: ADMIN_MUNICIPAL restablece a su gente

- GIVEN un ADMIN_MUNICIPAL de Motul y un OPERADOR de Motul con contrasenia
  olvidada
- WHEN el ADMIN_MUNICIPAL restablece la contrasenia del OPERADOR
- THEN el OPERADOR puede iniciar sesion con la nueva contrasenia

#### Scenario: SUPER_ADMIN no puede restablecer a un OPERADOR

- GIVEN un SUPER_ADMIN y un OPERADOR de Motul con contrasenia olvidada
- WHEN el SUPER_ADMIN intenta restablecer la contrasenia de ese OPERADOR
- THEN el sistema responde 403
- AND la contrasenia del OPERADOR no cambia

#### Scenario: SUPER_ADMIN restablece al ADMIN_MUNICIPAL trabado

- GIVEN el unico ADMIN_MUNICIPAL de Ticul con contrasenia olvidada
- WHEN el SUPER_ADMIN restablece la contrasenia de esa cuenta
- THEN el ADMIN_MUNICIPAL puede iniciar sesion con la nueva contrasenia

### Requirement: Todo restablecimiento deja traza en bitacora

Cada restablecimiento de contrasenia MUST registrar en bitacora quien lo
ejecuto y sobre que cuenta, en la misma transaccion que el cambio.

#### Scenario: La bitacora registra actor y afectado

- GIVEN un ADMIN_MUNICIPAL que restablece la contrasenia de un OPERADOR
  de su ayuntamiento
- WHEN la operacion se completa
- THEN la bitacora tiene una fila con el actor, la cuenta afectada, el
  ayuntamiento y el momento

### Requirement: Baja logica de usuarios

`ADMIN_MUNICIPAL` MUST poder dar de baja logica a un usuario de su propio
ayuntamiento. La baja MUST NOT borrar la fila del usuario ni alterar
registros de bitacora o documentos que lo referencian.

#### Scenario: Baja logica conserva la autoria de documentos previos

- GIVEN un OPERADOR de Motul que emitio una constancia y luego fue dado
  de baja
- WHEN se consulta esa constancia
- THEN sigue mostrando a ese OPERADOR como quien la emitio

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
