# Intervenciones — Specification

## Purpose

El trabajo municipal —obra, repavimentacion, mejora, fuga, alumbrado,
bache, mantenimiento— se registra hoy fuera del sistema o se confunde con
el reporte ciudadano. `intervenciones` modela el trabajo propio del
municipio como dominio separado: tipos y estados cerrados, fecha de
ocurrencia distinta de la captura, vinculo opcional al reporte que lo
origino y correccion que no borra historia.

## Requirements

### Requirement: Tipos cerrados de intervencion

`tipo` MUST pertenecer a la union cerrada `OBRA`, `REPAVIMENTACION`,
`MEJORA`, `FUGA`, `ALUMBRADO`, `BACHE`, `MANTENIMIENTO`. El sistema MUST
rechazar un valor fuera de la union en el borde y con `CHECK` en la base.

#### Scenario: Un tipo fuera de la union se rechaza

- GIVEN un registro con un tipo que no pertenece a la union cerrada
- WHEN se intenta guardar
- THEN el sistema lo rechaza sin escribir

### Requirement: Estados cerrados, transiciones validas y terminales sin reapertura

`estado` MUST pertenecer a `PLANIFICADA`, `EN_EJECUCION`, `FINALIZADA`,
`CANCELADA`. Las transiciones validas MUST ser `PLANIFICADA ->
EN_EJECUCION -> FINALIZADA`, `PLANIFICADA -> CANCELADA` y `EN_EJECUCION ->
CANCELADA`. `FINALIZADA` y `CANCELADA` MUST ser terminales. La funcion que
decide si una transicion es valida MUST ser pura de dominio, sin IO.

#### Scenario: Finalizar despues de ejecutar

- GIVEN una intervencion en EN_EJECUCION
- WHEN se la pasa a FINALIZADA
- THEN el sistema acepta y registra el cambio

#### Scenario: Reabrir una FINALIZADA se rechaza

- GIVEN una intervencion en FINALIZADA
- WHEN se intenta cualquier transicion desde ella
- THEN el sistema la rechaza con un error tipado de dominio, sin tocar la base

#### Scenario: Cancelar una EN_EJECUCION se acepta

- GIVEN una intervencion en EN_EJECUCION que ya no se hara
- WHEN se la pasa a CANCELADA
- THEN el sistema acepta y registra el cambio

### Requirement: Fecha de ocurrencia distinta de la captura

`fechaDeOcurrencia` MUST ingresarla quien registra y MUST NOT derivarse de
`capturadoEn`, que MUST asignarlo el servidor. La UI MUST mostrar ambas
fechas por separado.

#### Scenario: Capturar hoy una obra ocurrida hace meses

- GIVEN una obra ejecutada en enero capturada en marzo
- WHEN se registra la intervencion
- THEN quedan guardadas `fechaDeOcurrencia` de enero y `capturadoEn` de marzo

### Requirement: Vinculo opcional a un reporte

`reporteId` MUST ser nullable y MUST referenciar un reporte del mismo
ayuntamiento. El vinculo MUST ser FK compuesto contra `(id,
ayuntamientoId)`. El sistema MUST NOT copiar datos del reporte a la
intervencion.

#### Scenario: Intervencion sin reporte

- GIVEN un trabajo municipal no originado en un reporte ciudadano
- WHEN se registra
- THEN la intervencion queda con `reporteId` nulo

#### Scenario: Un reporteId de otro municipio se rechaza en la base

- GIVEN una intervencion de Motul y un reporte de Ticul
- WHEN se intenta vincularlos
- THEN Postgres rechaza el INSERT por el FK compuesto, no solo la aplicacion

### Requirement: Ubicacion por lugar obligatorio, calle opcional, sin punto exacto

`lugarId` MUST ser obligatorio y `calleId` opcional, misma forma que
`reportes`, validados contra el puerto de lectura de territorio. Las
intervenciones MUST NOT llevar columna de punto exacto.

#### Scenario: Una intervencion se registra solo con lugar

- GIVEN un operador registrando un trabajo sin calle definida
- WHEN guarda
- THEN el registro se completa con `calleId` nulo

### Requirement: Una sola caja de texto libre, acotada y con etiqueta

La descripcion MUST ser el unico campo de texto libre, de largo acotado,
con etiqueta explicita sobre no anotar datos personales. MUST NOT
exponerse en ninguna superficie sin sesion, y MUST NOT escribirse en logs:
en logs la intervencion se referencia por ID.

### Requirement: Registrar es mostrador; administrar es del ADMIN_MUNICIPAL

Registrar una intervencion MUST autorizarse por `puedeEscribir`. Cambiar
estado y registrar correcciones MUST exigir
`puedeAdministrarIntervenciones`.

#### Scenario: Un OPERADOR registra pero no cambia estado

- GIVEN un OPERADOR autenticado en su ayuntamiento
- WHEN registra una intervencion
- THEN el registro se completa
- AND si intenta cambiar su estado, el sistema lo rechaza con 403

### Requirement: Correccion append-only

Corregir una intervencion MUST actualizar la fila vigente y MUST dejar una
revision con los valores anteriores, actor y momento en una tabla de solo
agregado, en la misma transaccion. La tabla de revisiones MUST NOT tener
permiso de `UPDATE` ni de `DELETE`.

#### Scenario: Corregir una descripcion conserva la historia

- GIVEN una intervencion con descripcion erronea
- WHEN se corrige
- THEN la fila vigente cambia
- AND queda una revision con la descripcion anterior, sin borrar nada
- AND un intento de UPDATE o DELETE sobre revisiones es rechazado por el GRANT

### Requirement: Bitacora con solo ids

Registrar y corregir una intervencion MUST dejar una fila de bitacora con
actor e ids, sin texto de la descripcion, en la misma transaccion.

### Requirement: Sin folio propio

Las intervenciones MUST NOT consumir folios del contador de `reportes` ni
tener contador propio en este cambio.

### Requirement: Aislamiento por ayuntamiento de las tablas nuevas

`intervenciones` y `revisiones_de_intervenciones` MUST llevar
`ayuntamientoId` con `FORCE ROW LEVEL SECURITY`, politica de tenant y
`GRANT` al rol de aplicacion, y su propio test de aislamiento. Los FKs a
`reportes`, `lugares` y `calles` MUST ser compuestos contra `(id,
ayuntamientoId)`.

#### Scenario: Un municipio no ve una intervencion de otro por id directo

- GIVEN una intervencion de Ticul y un usuario autenticado en Motul
- WHEN ese usuario la pide por su id
- THEN la respuesta equivale a "no encontrado"

#### Scenario: Las revisiones estan igual de aisladas

- GIVEN revisiones de intervenciones de dos municipios
- WHEN se consulta con contexto en uno de ellos
- THEN solo aparecen revisiones de intervenciones de ese municipio
