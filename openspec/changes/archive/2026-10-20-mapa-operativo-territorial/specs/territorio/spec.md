# Delta for Jerarquia Territorial

## ADDED Requirements

### Requirement: Eventos estructurales de calles append-only

`territorio` MUST persistir los eventos de estructura de una calle en una
tabla propia `eventos_de_calles`, separada de `bitacora` y de
`movimientos_de_reportes`. Cada evento MUST identificar su `id`,
`ayuntamientoId`, `calleId`, una naturaleza cerrada y el momento de la
operacion asignado por el servidor. Las naturalezas MUST ser `ALTA`,
`RENOMBRE`, `REPARENTEO` y `UBICACION`. `ALTA` sirve para notificar una calle
nueva; la proyeccion de `historial-de-calle` MUST conservar unicamente las
naturalezas `RENOMBRE`, `REPARENTEO` y `UBICACION` que ya define su contrato.
El evento MUST contener solo la identificacion y los datos estructurales
tipados necesarios para la proyeccion; no MUST convertirse en una bitacora
generica ni transportar descripcion, referencia o datos personales.

#### Scenario: Cada mutacion estructural deja un evento en la misma transaccion

- GIVEN una operacion valida de `altaDeCalle`, `renombrarCalle`,
  `reparentearCalle` o `ubicarCalle`
- WHEN la transaccion confirma
- THEN la fila de `calles` y un evento de la naturaleza correspondiente
  quedan confirmados juntos
- AND el momento del evento corresponde al momento de la operacion, no a una
  fecha enviada por el cliente

#### Scenario: Una operacion revertida no deja evento

- GIVEN una mutacion estructural que falla antes de confirmar
- WHEN la transaccion revierte
- THEN no queda cambio en `calles` ni evento estructural visible

#### Scenario: Un evento confirmado no se puede editar ni borrar

- GIVEN un evento estructural ya confirmado
- WHEN el rol de aplicacion intenta actualizarlo o eliminarlo
- THEN Postgres rechaza la operacion y conserva la fila original

### Requirement: Aislamiento y escritura append-only de eventos de calles

`eventos_de_calles` MUST llevar `ayuntamientoId`, `ENABLE` y `FORCE ROW LEVEL
SECURITY`, una politica de tenant y un FK compuesto de `calleId` contra
`(calles.id, calles.ayuntamientoId)`. El rol de aplicacion MUST tener
`GRANT` unicamente para `SELECT` e `INSERT` sobre esta tabla: no MUST tener
`UPDATE` ni `DELETE`. Toda lectura o escritura de eventos desde la
aplicacion MUST ocurrir dentro de `withTenant`; el tenant MUST provenir del
contexto del servidor y nunca de un parametro del cliente. El test de
aislamiento de `eventos_de_calles` MUST comprobar tanto la lectura por
tenant como el FK compuesto.

#### Scenario: Un municipio solo ve sus eventos de calle

- GIVEN eventos de calles sembrados en Motul y en Ticul
- WHEN se consultan los eventos con contexto de Motul y sin filtro explicito
  de tenant
- THEN solo aparecen los eventos de Motul

#### Scenario: Una calle de otro municipio no puede recibir un evento

- GIVEN una calle de Ticul y una transaccion con tenant de Motul
- WHEN se intenta insertar un evento de Motul que referencia esa calle
- THEN Postgres rechaza el INSERT por el FK compuesto

#### Scenario: Sin tenant no se exponen eventos

- GIVEN una conexion de aplicacion sin tenant fijado
- WHEN consulta `eventos_de_calles`
- THEN RLS no devuelve filas

### Requirement: Las mutaciones que generan eventos conservan la autorizacion territorial

`altaDeCalle`, `renombrarCalle`, `reparentearCalle` y `ubicarCalle` MUST
continuar exigiendo `puedeAdministrarTerritorio`, que solo permite al
`ADMIN_MUNICIPAL` operar la estructura de su ayuntamiento. El delta MUST NOT
crear una via generica para insertar eventos ni un permiso nuevo para
escribirlos. `callesParaMapa` y `callePorId` son lecturas y MUST requerir
sesion y tenant, pero no `puedeAdministrarTerritorio`.

#### Scenario: Un OPERADOR no puede generar un evento estructural

- GIVEN un OPERADOR autenticado en su ayuntamiento
- WHEN intenta dar de alta, renombrar, reparentear o ubicar una calle
- THEN la operacion responde con rechazo de autorizacion y no deja evento

#### Scenario: Un ADMIN_MUNICIPAL genera el evento de su ayuntamiento

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN completa una mutacion estructural de una calle de ese ayuntamiento
- THEN la operacion se autoriza y deja el evento correspondiente en la misma
  transaccion

### Requirement: Lectura operativa de calles para el mapa

El modulo MUST exponer un puerto de solo lectura `callesParaMapa`, resuelto
bajo el tenant del contexto. Cada fila MUST exponer como minimo `id`,
`nombre`, `lugarId`, el punto de calle como par completo o `NULL`, y `bajaEn`.
La lectura MUST incluir las calles del tenant sin punto y MUST conservar el
estado de baja logica para que el consumidor no confunda cobertura faltante
con una coordenada inventada ni pierda la asociacion vigente de reportes e
intervenciones. El mapa MUST decidir que filas tienen actividad y como
presentarlas; `callesParaMapa` no MUST leer ni devolver descripciones,
referencias, domicilios o datos personales.

#### Scenario: La lectura conserva una calle sin punto

- GIVEN una calle del tenant con `latitud` y `longitud` nulas
- WHEN se ejecuta `callesParaMapa`
- THEN la fila aparece con el punto nulo y sin coordenadas por defecto

#### Scenario: La lectura conserva una calle dada de baja

- GIVEN una calle del tenant con `bajaEn` escrita y actividad asociada
- WHEN se ejecuta `callesParaMapa`
- THEN la fila aparece con su `bajaEn` y su punto vigente, sin reubicar ni
  borrar la actividad asociada

#### Scenario: La lectura del mapa no cruza municipios

- GIVEN calles sembradas en Motul y en Ticul
- WHEN un usuario con contexto de Motul ejecuta `callesParaMapa`
- THEN el resultado contiene unicamente calles de Motul

### Requirement: Lectura de una calle y sus eventos para la linea de tiempo

El modulo MUST exponer un puerto de solo lectura `callePorId` que resuelva la
calle dentro del tenant del contexto y devuelva su estado vigente —`id`,
`nombre`, `lugarId`, punto y `bajaEn`— junto con los eventos estructurales
`RENOMBRE`, `REPARENTEO` y `UBICACION` que correspondan a esa calle. La
lectura MUST permitir que `historial-de-calle` diferencie esas naturalezas
sin consultar `bitacora` ni `movimientos_de_reportes`. Los eventos devueltos
MUST ordenarse por `ocurridoEn` descendente; ante empate exacto MUST usar el
rango fijo `RENOMBRE` < `REPARENTEO` < `UBICACION` y despues `id` ascendente.
El orden MUST ser independiente del orden fisico o del orden de lectura de
Postgres.

#### Scenario: La calle propia devuelve estado y eventos en orden estable

- GIVEN una calle de Motul con un renombre, un reparentamiento y una
  ubicacion registrados
- WHEN se ejecuta `callePorId` dos veces desde Motul
- THEN devuelve la calle vigente y sus tres naturalezas estructurales
- AND ambas lecturas producen el mismo orden por ocurrencia, naturaleza e id

#### Scenario: Una calle de otro municipio equivale a no encontrada

- GIVEN un usuario de Motul y una calle que pertenece a Ticul
- WHEN pide `callePorId` con el id de Ticul
- THEN la lectura no devuelve la calle ni sus eventos y el borde responde 404
- AND no revela si existe una fila en Ticul

#### Scenario: La linea de tiempo no recibe auditoria cruda

- GIVEN una calle con filas en `bitacora`, movimientos de reportes y eventos
  estructurales
- WHEN se ejecuta `callePorId`
- THEN solo devuelve los eventos estructurales del contrato
- AND no devuelve actor, ids de bitacora, movimientos ni texto de auditoria

### Requirement: Notificacion de cambios estructurales de calles

Cada alta, renombre, reparentamiento o ubicacion de calle que confirme su
transaccion MUST emitir, al confirmarse el cambio, una notificacion de
actualizacion para el tenant con el payload acotado
`{tipo: "calle", id, cambio: "estructura"}`. La notificacion MUST usar el
canal derivado del tenant del servidor y MUST ocurrir en la misma transaccion
logica que el evento estructural: una transaccion revertida no puede
notificar. El payload MUST NOT incluir la naturaleza, nombre, coordenadas,
descripcion, referencia ni datos de otro tenant; el consumidor rehidrata el
estado mediante `callesParaMapa` o `callePorId` bajo RLS.

#### Scenario: Una calle confirmada notifica solo su identidad

- GIVEN un renombre de una calle de Motul que confirma
- WHEN se entrega la notificacion al bus
- THEN el evento identifica una calle y el cambio `estructura` en el canal de
  Motul
- AND no transporta el nombre anterior, el nombre nuevo ni otros datos

#### Scenario: Una calle de Ticul no notifica a Motul

- GIVEN conexiones suscritas para Motul y Ticul
- WHEN se confirma una ubicacion de una calle de Ticul
- THEN solo la conexion de Ticul recibe la notificacion
