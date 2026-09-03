# Reportes Ciudadanos — Specification

## Purpose

Hoy un bache se reporta por telefono o por el grupo de WhatsApp del regidor
y no queda registro: sin folio no hay seguimiento, sin area asignada no hay
responsable, sin estado no hay forma de saber si algo se hizo.
`reportes-ciudadanos` cubre el registro por mostrador de una incidencia de
via publica con folio consecutivo sin huecos, clasificacion cerrada por
tipo y por area, ubicacion que no se congela porque la cuadrilla necesita
la vigente, flujo de estados sin reapertura, y un vinculo de duplicado que
evita que el segundo vecino que reporta la misma fuga lea "rechazado"
cuando el municipio si la va a atender.

## Requirements

### Requirement: Folio consecutivo por (ayuntamiento, anio) bajo lock en transaccion

El sistema MUST asignar el folio de un reporte dentro de la misma
transaccion que lo inserta, tomando lock sobre la fila del contador de
`(ayuntamientoId, anio)` en una tabla propia del modulo, sin serie separada
por tipo de incidencia. El sistema MUST NOT usar una secuencia de base de
datos. El anio MUST resolverse con la hora de Merida, nunca con UTC.

#### Scenario: Dos registros concurrentes en el mismo municipio

- GIVEN dos mostradores del mismo ayuntamiento registrando al mismo tiempo
- WHEN ambas transacciones confirman
- THEN los dos reportes tienen folios distintos y consecutivos, sin huecos
  entre ellos

#### Scenario: Rollback despues de tomar folio no lo consume

- GIVEN un registro que toma folio y despues falla antes de confirmar
- WHEN la transaccion revierte
- THEN el siguiente registro exitoso toma el mismo numero de folio

#### Scenario: Dos municipios no colisionan

- GIVEN Motul y Ticul registrando su primer reporte del mismo dia
- WHEN ambos toman folio
- THEN cada uno produce `REP-2026-000001` sin conflicto entre si

#### Scenario: El anio del folio es el que ve la persona, no el de UTC

- GIVEN un registro a las 19:00 hora de Merida el 31 de diciembre
- WHEN se asigna el folio
- THEN el anio impreso es el que ve la persona en Merida
- AND el primer reporte del anio siguiente arranca en `000001`

### Requirement: Un reporte no es un documento inmutable

El reporte MUST poder cambiar de estado, area responsable y vinculo de
duplicado despues de registrado, a diferencia de una constancia. El
sistema MUST NOT exigir un folio nuevo por cada cambio de estado.

#### Scenario: Cambiar de estado no genera un folio nuevo

- GIVEN un reporte recien registrado con su folio
- WHEN cambia de `RECIBIDO` a `EN_ATENCION`
- THEN conserva el mismo folio, y el cambio queda en el historial de
  movimientos

### Requirement: Clasificacion por tipo de incidencia, union cerrada

`tipo` MUST pertenecer a la union cerrada `BACHE`, `ALUMBRADO`, `FUGA`,
`BASURA`, `PARQUE`, `OTRO`. El sistema MUST rechazar un valor fuera de esa
union.

#### Scenario: Un tipo fuera de la union cerrada se rechaza

- GIVEN un registro con un tipo que no pertenece a la union cerrada
- WHEN se intenta guardar
- THEN el sistema lo rechaza

### Requirement: Area responsable cerrada, asignada despues del registro

`areaResponsable` MUST pertenecer a la union cerrada `OBRAS_PUBLICAS`,
`ALUMBRADO_PUBLICO`, `AGUA_POTABLE_Y_DRENAJE`, `LIMPIA_Y_RECOLECCION`,
`PARQUES_Y_JARDINES`, `SERVICIOS_GENERALES`, y MUST ser nullable al
registrar: un reporte nunca se bloquea por no tener area todavia.

#### Scenario: Un reporte se registra sin area asignada

- GIVEN un mostrador registrando un reporte
- WHEN lo guarda sin elegir area
- THEN el registro se completa con `areaResponsable` nulo

### Requirement: Ubicacion por lugar obligatorio, calle opcional, sin domicilio

`lugarId` MUST ser obligatorio, `calleId` y `referencia` MUST ser
opcionales. El sistema MUST NOT exigir un domicilio ni una residencia del
padron para registrar un reporte, y MUST validar que `lugarId` y, si se
provee, `calleId`, pertenezcan al ayuntamiento del contexto y esten
activos, resolviendo la validacion contra el puerto de lectura de
`territorio`.

#### Scenario: Un lugarId de otro municipio se rechaza

- GIVEN un `lugarId` que pertenece a otro ayuntamiento
- WHEN se intenta registrar un reporte con ese `lugarId`
- THEN el caso de uso lo rechaza con `NoEncontradoError`
- AND el FK compuesto a nivel base tambien lo rechaza si se intenta sin
  pasar por el caso de uso

#### Scenario: La ubicacion no se congela

- GIVEN un reporte cuyo lugar se reparenta a otra comisaria despues del
  registro
- WHEN se consulta el texto de ubicacion del reporte
- THEN refleja la jerarquia vigente, no la que existia al momento del
  registro

### Requirement: Las dos cajas de texto libre del modulo, con las mismas protecciones

El modulo MUST tener exactamente dos campos de texto libre: `descripcion`
—obligatoria— y `referencia` —opcional—. Las dos MUST ser de largo acotado,
MUST llevar etiqueta explicita en la UI sobre no anotar datos de vecinos, y
el sistema MUST NOT exponer ninguna de las dos en ninguna superficie sin
sesion.

#### Scenario: Un registro sin descripcion se rechaza

- GIVEN un mostrador registrando un reporte sin escribir descripcion
- WHEN intenta guardarlo
- THEN el sistema lo rechaza

#### Scenario: La referencia lleva las mismas protecciones que la descripcion

- GIVEN un reporte con referencia "frente a la tienda de la esquina"
- WHEN se consulta su folio desde la superficie publica
- THEN la respuesta no incluye la referencia
- AND la referencia esta acotada en largo igual que la descripcion

### Requirement: Vinculo opcional con una persona del padron, sin datos de contacto sueltos

`personaId` MUST ser nullable. Cuando es nulo el reporte MUST ser anonimo:
el sistema MUST NOT guardar nombre, telefono ni correo del reportante en
ninguna columna de `reportes`.

#### Scenario: Un reporte se registra sin persona del padron

- GIVEN un mostrador que no tiene al reportante dado de alta
- WHEN registra el reporte sin `personaId`
- THEN el registro se completa y queda consultable por folio
- AND ninguna columna de `reportes` guarda nombre, telefono ni correo

### Requirement: Transiciones de estado cerradas, terminales sin reapertura

Las transiciones validas MUST ser `RECIBIDO -> EN_ATENCION -> RESUELTO`,
**y tambien `RECIBIDO -> RESUELTO` directo**, con `RECHAZADO` alcanzable
desde `RECIBIDO` y desde `EN_ATENCION`. `RESUELTO` y `RECHAZADO` MUST ser
terminales: ninguna transicion posterior MUST ser valida. La funcion que
decide si una transicion es valida MUST ser pura de dominio, sin IO.

#### Scenario: Un reporte resuelto el mismo dia pasa directo de RECIBIDO a RESUELTO

- GIVEN un reporte en estado RECIBIDO cuya cuadrilla lo atendio el mismo dia
- WHEN se lo pasa directamente a RESUELTO sin pasar por EN_ATENCION
- THEN el sistema lo acepta
- AND queda una sola fila en `movimientos_de_reportes` para ese cambio

#### Scenario: Pasar de RESUELTO a otro estado se rechaza

- GIVEN un reporte en estado RESUELTO
- WHEN se intenta pasarlo a cualquier otro estado
- THEN el sistema lo rechaza con un error tipado de dominio, sin tocar la
  base

#### Scenario: Pasar de RECHAZADO a otro estado se rechaza

- GIVEN un reporte en estado RECHAZADO
- WHEN se intenta pasarlo a cualquier otro estado
- THEN el sistema lo rechaza con un error tipado de dominio, sin tocar la
  base

### Requirement: Registrar es mostrador; cambiar estado y asignar area son estructura

Registrar un reporte MUST autorizarse por la regla generica de escritura,
sin restriccion de rol adicional. Cambiar de estado y asignar area MUST
requerir la regla `puedeAdministrarReportes` de `autorizacion-roles`.

#### Scenario: Un OPERADOR registra pero no cambia estado ni asigna area

- GIVEN un OPERADOR autenticado en su ayuntamiento
- WHEN registra un reporte
- THEN el registro se completa
- AND si el mismo OPERADOR intenta cambiar el estado o asignar area, el
  sistema lo rechaza con 403

### Requirement: Motivo de rechazo cerrado; DUPLICADO exige el vinculo al original

`motivoDeRechazo` MUST pertenecer a la union cerrada `DUPLICADO`,
`FUERA_DE_COMPETENCIA`, `INFORMACION_INSUFICIENTE`, sin campo de texto
libre acompaniante. Rechazar con motivo `DUPLICADO` MUST exigir
`duplicadoDeReporteId`; el sistema MUST rechazar el cambio de estado si
falta ese vinculo. El estado, el motivo y el vinculo MUST escribirse en la
misma transaccion o no escribirse ninguno.

#### Scenario: Rechazar por DUPLICADO sin el id del original falla

- GIVEN un reporte abierto y un intento de rechazarlo con motivo DUPLICADO
  sin `duplicadoDeReporteId`
- WHEN se ejecuta el cambio de estado
- THEN el sistema lo rechaza con un error tipado
- AND no queda ninguna fila escrita: ni el estado, ni el vinculo, ni el
  movimiento

### Requirement: Un duplicado apunta siempre a un reporte que no es duplicado

Cuando un reporte se marca duplicado de otro que a su vez ya es duplicado,
el sistema MUST resolver y guardar el original de la cadena, nunca un
eslabon intermedio, antes de escribir. Un reporte MUST NOT poder
apuntarse a si mismo como duplicado.

#### Scenario: Marcar duplicado de un duplicado guarda el original de la cadena

- GIVEN el reporte B marcado duplicado del reporte A, y un tercer reporte C
- WHEN se marca C como duplicado de B
- THEN `duplicadoDeReporteId` de C queda apuntando a A, no a B

#### Scenario: Un duplicadoDeReporteId de otro municipio se rechaza

- GIVEN un reporte de otro ayuntamiento
- WHEN se intenta guardar un `duplicadoDeReporteId` que apunta a ese
  reporte
- THEN el FK compuesto a nivel base lo rechaza, no solo la aplicacion

#### Scenario: Contar duplicados de un original es una consulta directa

- GIVEN cuatro reportes que apuntan al mismo original
- WHEN se cuenta cuantos apuntan a ese original
- THEN la consulta resuelve sobre el indice, sin recorrer la tabla
  completa

### Requirement: Buscador de reportes similares informativo, no bloquea el alta

Antes de guardar, el sistema MUST mostrar los reportes abiertos
(`RECIBIDO` o `EN_ATENCION`) que coincidan en lugar y tipo con lo que el
operador esta capturando. El sistema MUST NOT impedir guardar el alta
aunque existan coincidencias.

#### Scenario: El alta se guarda aunque existan reportes similares abiertos

- GIVEN dos reportes abiertos de tipo BACHE en el mismo lugar
- WHEN un mostrador registra un tercer reporte del mismo tipo y lugar
- THEN la pantalla muestra los dos reportes existentes antes de guardar
- AND el registro se guarda igual, sin bloqueo

### Requirement: Historial de movimientos de solo agregado

Cada cambio de estado y cada asignacion de area MUST dejar una fila en una
tabla propia de solo agregado, con usuario y momento. Esa tabla MUST NOT
tener permiso de `UPDATE` ni de `DELETE`.

#### Scenario: Cada cambio deja su fila sin tocar las anteriores

- GIVEN un reporte que cambia de estado dos veces y se le asigna area una
  vez
- WHEN se revisa su historial de movimientos
- THEN existen tres filas, ninguna fue modificada ni eliminada, y un
  intento de `UPDATE` o `DELETE` sobre esa tabla es rechazado por el
  `GRANT`

### Requirement: Aislamiento por ayuntamiento de las tres tablas nuevas

`reportes`, `folios_de_reportes` y `movimientos_de_reportes` MUST estar
alcanzadas por `ayuntamiento_id` con `FORCE ROW LEVEL SECURITY` y su
propio test de aislamiento.

#### Scenario: Un municipio no ve un reporte de otro por id directo

- GIVEN un reporte de Ticul y un usuario autenticado en Motul
- WHEN ese usuario pide ese reporte por su id
- THEN la respuesta es equivalente a "no encontrado"
- AND una fila de `reportes` con `lugar_id`, `calle_id`, `persona_id` o
  `duplicado_de_reporte_id` de otro municipio es rechazada por Postgres,
  no solo por la aplicacion

### Requirement: Reportes en la exportacion por ayuntamiento

`reportes-ciudadanos` MUST aportar una `PorcionExportable` con columnas
listadas una por una, nunca `select()` pelado.

#### Scenario: La exportacion no trae columnas no declaradas

- GIVEN la `PorcionExportable` de reportes
- WHEN se genera una exportacion
- THEN solo aparecen las columnas listadas explicitamente
