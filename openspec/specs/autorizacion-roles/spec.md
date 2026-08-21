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
