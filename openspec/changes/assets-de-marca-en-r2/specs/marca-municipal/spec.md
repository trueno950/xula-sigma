# Marca Municipal — Specification

## Purpose

La marca de un municipio —hoy solo colores— gana un escudo real: subido
por el propio ayuntamiento, validado en servidor antes de guardarse,
persistido fuera del filesystem efimero del contenedor, y visible en la
pantalla de acceso antes de que exista sesion. Fuera de esta rebanada:
`logotipo`, quitar un escudo ya cargado, y los bytes del escudo dentro del
archivo de exportacion.

## Requirements

### Requirement: Solo ADMIN_MUNICIPAL cambia la marca de su propio ayuntamiento

El sistema MUST permitir subir o reemplazar el escudo unicamente a un
usuario con rol `ADMIN_MUNICIPAL`, y MUST tomar el `ayuntamientoId` del
contexto de sesion, nunca de un parametro de la peticion.

#### Scenario: ADMIN_MUNICIPAL sube un escudo valido

- GIVEN un ADMIN_MUNICIPAL autenticado en el subdominio de su ayuntamiento
- WHEN sube un PNG valido de 200x200
- THEN el escudo queda accesible en una URL bajo el dominio publico de R2
- AND la pantalla de acceso de ese subdominio lo muestra
- AND sigue mostrandose despues de un redeploy

#### Scenario: OPERADOR no puede cambiar la marca

- GIVEN un usuario con rol OPERADOR autenticado en su ayuntamiento
- WHEN intenta subir un escudo
- THEN el sistema responde 403 y no se escribe nada en R2 ni en la fila

#### Scenario: SUPER_ADMIN no puede cambiar la marca

- GIVEN un usuario con rol SUPER_ADMIN autenticado
- WHEN intenta subir un escudo para cualquier ayuntamiento
- THEN el sistema responde 403

#### Scenario: Aislamiento — un admin no escribe la marca de otro ayuntamiento

- GIVEN un ADMIN_MUNICIPAL de Motul y un ayuntamiento Ticul ya sembrado,
  contra Postgres real
- WHEN el ADMIN_MUNICIPAL de Motul sube un escudo con su sesion normal
- THEN solo la fila de Motul cambia
- AND la marca de Ticul permanece exactamente igual

### Requirement: La clave del objeto en R2 lleva el ayuntamientoId del contexto

El sistema MUST construir la clave del objeto con el `ayuntamientoId`
resuelto del contexto de sesion como prefijo, y MUST generar una clave
nueva en cada subida.

#### Scenario: La clave incluye el id del contexto, no uno recibido por parametro

- GIVEN un ADMIN_MUNICIPAL del ayuntamiento X autenticado
- WHEN sube un escudo intentando forzar un ayuntamientoId distinto en la
  entrada
- THEN la clave guardada empieza con el ayuntamientoId de X, tomado del
  contexto, y no del valor forzado

### Requirement: Validacion de bytes en servidor antes de llegar a R2

El sistema MUST validar la firma PNG, la presencia de un chunk `IHDR`, un
tamanio maximo de 1 MiB y dimensiones entre 80x80 y 2048x2048 sobre los
bytes recibidos, antes de cualquier escritura a R2. Un archivo que falla
cualquier chequeo MUST NOT llegar al almacen.

#### Scenario: Bytes que no son PNG, aunque el nombre diga .png

- GIVEN un archivo llamado `escudo.png` cuyos primeros bytes no son la
  firma PNG
- WHEN se sube como escudo
- THEN el sistema lo rechaza nombrando el campo `escudo`
- AND ningun PUT llega al almacen de assets

#### Scenario: Archivo mayor a 1 MiB

- GIVEN un PNG valido de mas de 1 MiB
- WHEN se sube como escudo
- THEN el sistema lo rechaza sin llegar a R2

#### Scenario: Dimensiones menores a 80x80

- GIVEN un PNG valido de 79x80
- WHEN se sube como escudo
- THEN el sistema lo rechaza sin llegar a R2

#### Scenario: Dimensiones mayores a 2048x2048

- GIVEN un PNG valido de 2049x2048
- WHEN se sube como escudo
- THEN el sistema lo rechaza sin llegar a R2

### Requirement: Escribir el escudo no descarta el resto de la marca

El sistema MUST componer el nuevo `escudo` sobre los campos existentes de
`ayuntamientos.marca` y MUST validar el resultado completo con el mismo
validador que usa la lectura, antes de escribir. Si el resultado no
validaria, el sistema MUST NOT escribir ningun campo y MUST nombrar el
campo que falla.

#### Scenario: Un color invalido preexistente bloquea la subida sin tocar nada

- GIVEN una marca con un color `primario` invalido ya guardada a mano
- WHEN el ADMIN_MUNICIPAL sube un escudo valido
- THEN la accion falla nombrando el campo `primario`
- AND los colores guardados no cambian
- AND `escudo` tampoco se escribe

### Requirement: El cambio de marca queda en bitacora en la misma transaccion

Cada cambio de escudo MUST registrar en bitacora quien lo ejecuto y sobre
que ayuntamiento, dentro de la misma transaccion que el UPDATE.

#### Scenario: La bitacora registra el cambio de marca

- GIVEN un ADMIN_MUNICIPAL que sube un escudo valido
- WHEN la operacion se completa
- THEN la bitacora tiene una fila con el actor, el ayuntamiento y el
  momento del cambio

### Requirement: El objeto anterior se borra despues del commit, sin fallar la subida

Al reemplazar un escudo, el sistema MUST intentar borrar el objeto
anterior solo despues de que el UPDATE haya confirmado, y una falla en ese
borrado MUST NOT hacer fallar la subida ya confirmada.

#### Scenario: Reemplazar un escudo borra el anterior tras el commit

- GIVEN un ayuntamiento con un escudo ya guardado
- WHEN el ADMIN_MUNICIPAL sube uno nuevo y valido
- THEN la fila queda con la URL nueva
- AND el objeto anterior se borra del almacen despues del commit

#### Scenario: Un borrado que falla no revierte la subida

- GIVEN un ayuntamiento con un escudo ya guardado
- WHEN el ADMIN_MUNICIPAL sube uno nuevo y el borrado del anterior falla
- THEN la accion responde exito igual
- AND la fila queda con la URL nueva

### Requirement: La exportacion de un ayuntamiento incluye su marca

El sistema MUST incluir el campo `marca` validado en la exportacion de
cada ayuntamiento.

#### Scenario: La exportacion trae la marca con escudo

- GIVEN un ayuntamiento con escudo y colores validos
- WHEN se genera su exportacion
- THEN el objeto exportado incluye `marca` con esos valores

#### Scenario: Un ayuntamiento sin marca exporta un objeto vacio

- GIVEN un ayuntamiento sin `marca` guardada
- WHEN se genera su exportacion
- THEN el campo `marca` exportado es `{}`

### Requirement: Un ayuntamiento sin escudo renderiza su pantalla de acceso sin cambios

La ausencia de escudo MUST NOT impedir ni alterar el render de la
pantalla de acceso de un ayuntamiento.

#### Scenario: Pantalla de acceso sin escudo

- GIVEN un ayuntamiento que nunca subio un escudo
- WHEN se carga su pantalla de acceso
- THEN la pantalla renderiza con sus colores y sin escudo, igual que hoy
