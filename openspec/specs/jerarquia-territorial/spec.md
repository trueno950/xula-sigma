# Jerarquia Territorial — Specification

## Purpose

El municipio no puede operar por zona porque nadie modela el territorio.
`lugares` resuelve la contencion ragged (comisaria, cabecera, colonia,
sector, manzana) con una sola tabla de lista de adyacencia, sin `ltree` ni
tabla de cierre, y con un orden de tipos que hace imposible un ciclo por
construccion. `calles` resuelve el eje que atraviesa esa contencion —una
calle no cuelga de ninguna manzana— como catalogo cerrado por asentamiento.

Cada requisito lleva su rebanada de entrega entre parentesis (1 a 7, ver
proposal.md "Presupuesto de revision") para que `sdd-tasks` corte sin
releer esta decision.

## Requirements


### Requirement: Lugares es una unica tabla de lista de adyacencia (Rebanada 2)

La tabla `lugares` MUST modelar la jerarquia territorial como lista de
adyacencia auto-referenciada (`padreId` nullable hacia la misma tabla) con
una columna `tipo` discriminadora, sin `ltree` y sin tabla de cierre. El
sistema MUST permitir que cualquier nivel intermedio falte: un lugar hijo
o un domicilio puede colgar directo de un nivel superior sin filas de
relleno para los niveles ausentes.

#### Scenario: Comisaria sin colonias

- GIVEN una comisaria sin ninguna colonia registrada
- WHEN se crea un sector cuyo padre es esa comisaria
- THEN el sector queda vinculado directo a la comisaria, sin crear una
  colonia de relleno

#### Scenario: Reparentear es una sola fila

- GIVEN un lugar existente con su `padreId` actual
- WHEN se reparenta a otro padre valido
- THEN la operacion actualiza unicamente la fila de ese lugar, sin
  reescribir ninguna otra fila de `lugares`, `domicilios` ni `residencias`

### Requirement: Orden estricto y total de tipos, con dos tipos en el rango superior (Rebanada 2)

El sistema MUST imponer un orden estricto sobre `tipo` donde el tipo
del padre siempre precede al del hijo: `{cabecera, comisaria}` (mismo
rango, sin precedencia entre si) < `colonia`. `cabecera` MUST ser su
propio valor de `tipo`, distinto de `comisaria` y del `NULL` implicito:
no MUST representarse como una fila `comisaria` (mentiria sobre lo que
es) ni como una raiz sin tipo definido (un `padreId NULL` en un lugar
de otro tipo significa unicamente "sin padre conocido", nunca "esto es
la cabecera"). Una fila de tipo `cabecera` o `comisaria` MUST tener
`padreId IS NULL`; ningun otro tipo MUST tener `padreId NULL`. `colonia`
MUST ser el tipo mas profundo del arbol: el sistema MUST rechazar crear
o reparentar un lugar cuyo nuevo padre sea de tipo `colonia`, porque no
existe un tipo posterior a `colonia`. El sistema MUST rechazar crear o
reparentar un lugar cuyo `tipo` no sea estrictamente posterior al
`tipo` de su nuevo padre. Como `cabecera` y `comisaria` comparten el
rango superior y ninguno puede ser ancestro del otro, y `colonia` queda
estrictamente por debajo de ambos sin tipo posterior a si misma, un
lugar nunca puede volverse su propio ancestro: el orden vuelve el ciclo
estructuralmente imposible sin necesitar un guardia de recorrido.
(Previously: el orden llegaba hasta `< sector < manzana`; `manzana` era
el tipo mas profundo y `sector` admitia hijos.)

#### Scenario: cabecera y comisaria conviven como raices distintas

- GIVEN un municipio con una fila `tipo=cabecera` y una fila
  `tipo=comisaria`, ambas con `padreId NULL`
- WHEN se listan los lugares raiz de ese municipio
- THEN ambas existen y ninguna es padre de la otra

#### Scenario: comisaria no puede ser hija de cabecera

- GIVEN una fila `tipo=cabecera`
- WHEN se intenta crear una comisaria con `padreId` apuntando a esa
  cabecera
- THEN el sistema rechaza la operacion porque `comisaria` no es
  estrictamente posterior a `cabecera` en el orden

#### Scenario: colonia no puede tener hijos

- GIVEN un lugar de tipo colonia
- WHEN se intenta crear un lugar cuyo padre sea esa colonia
- THEN el sistema lo rechaza porque no existe un tipo posterior a
  colonia

#### Scenario: un intento de ciclo se rechaza antes de escribir

- GIVEN una colonia cuyo padre es una comisaria
- WHEN se intenta reparentar esa comisaria para que su padre sea la
  propia colonia
- THEN el sistema rechaza la operacion porque el tipo del nuevo padre
  (`colonia`) no precede al tipo de la comisaria

### Requirement: Aislamiento de lugares por ayuntamiento (Rebanada 2)

La tabla `lugares` MUST llevar `ayuntamientoId` con `FORCE ROW LEVEL
SECURITY` y su propio test de aislamiento; el FK de auto-referencia
(`padreId`) MUST ser compuesto contra `(id, ayuntamientoId)`, nunca contra
`id` solo.

#### Scenario: Un municipio no ve la jerarquia de otro

- GIVEN lugares sembrados en Motul y en Ticul
- WHEN se consulta `lugares` con contexto en Motul y sin filtro explicito
  de tenant
- THEN solo aparecen filas de Motul

#### Scenario: Un padreId de otro municipio es rechazado por Postgres

- GIVEN un lugar de Ticul
- WHEN se intenta crear un lugar en Motul con `padreId` apuntando a ese
  lugar de Ticul
- THEN Postgres rechaza el INSERT por la restriccion de aislamiento, no
  solo la aplicacion

### Requirement: Alta, edicion, baja y reparenteo de lugares con bitacora (Rebanada 3)

Toda alta, edicion de nombre, baja y reparenteo de un lugar MUST dejar una
fila de bitacora con solo ids en la misma transaccion que el cambio. Un
reparenteo o un renombre equivocado MUST poder deshacerse con la misma
operacion, en transaccion y con su propia entrada de bitacora, sin
migracion.

#### Scenario: reparentear deja traza

- GIVEN un lugar existente
- WHEN se reparenta
- THEN la bitacora registra actor, lugar, padre anterior y padre nuevo,
  solo ids, en la misma transaccion

### Requirement: Consulta de subarbol incluye lo colgado directo de cada nivel (Rebanada 3)

Consultar todos los descendientes de un lugar MUST devolver, en una
sola consulta, tanto lo que cuelga directo de ese lugar como lo que
cuelga de cualquier descendiente suyo a cualquier profundidad, sin
exigir nodos intermedios de relleno. Toda superficie de lectura -
incluida la interfaz de usuario del panel de un lugar- MUST usar esta
consulta de subarbol para contar y listar domicilios: contar solo por
coincidencia exacta de `lugarId` MUST NOT sustituirla.
(Previously: el escenario de referencia usaba un sector con manzanas y
un domicilio directo; no exigia explicitamente que la interfaz de
usuario usara la misma consulta.)

#### Scenario: asentamiento con colonias y un domicilio directo

- GIVEN una comisaria con dos colonias y un domicilio colgado directo
  de la comisaria (sin colonia)
- WHEN se piden todos los domicilios de esa comisaria
- THEN el resultado incluye el domicilio directo y los domicilios de
  ambas colonias

#### Scenario: el panel de un lugar cuenta el subarbol, no la coincidencia exacta

- GIVEN un asentamiento con domicilios colgados directo de el y otros
  colgados de sus colonias
- WHEN se abre el panel de ese asentamiento en la interfaz
- THEN el contador de domicilios muestra el total del subarbol, no solo
  los que cuelgan exacto de ese nodo

### Requirement: Catalogo de calles por asentamiento, sin maquinaria de deduplicacion (Rebanada 4)

`calles` MUST ser un catalogo cerrado, capturable solo por seleccion —
nunca texto libre— para el operador de mostrador. `calles` MUST NOT
llevar columna normalizada, indice de trigramas ni catalogo de
abreviaturas: es un conjunto cerrado y chico por asentamiento, no un
conjunto abierto de nombres propios como `personas`. Una calle de la
cabecera municipal MUST referenciar el lugar explicito de `tipo=cabecera`
en `lugarId`; `lugarId NULL` MUST NOT usarse para representar la
cabecera.

#### Scenario: la Calle 21 de la cabecera y la de una comisaria coexisten

- GIVEN una calle "21" con `lugarId` apuntando al lugar cabecera, y otra
  calle "21" con `lugarId` apuntando a una comisaria distinta
- WHEN se listan las calles del municipio
- THEN ambas existen como filas distintas sin colisionar por nombre

#### Scenario: capturar una calle es elegir, no escribir

- GIVEN el catalogo de calles ya cargado para un asentamiento
- WHEN un operador captura un domicilio
- THEN selecciona la calle de una lista existente en vez de escribir su
  nombre

### Requirement: Aislamiento de calles por ayuntamiento (Rebanada 4)

`calles` MUST llevar `ayuntamientoId` con `FORCE ROW LEVEL SECURITY` y su
propio test de aislamiento; su FK hacia `lugares` MUST ser compuesto
contra `(id, ayuntamientoId)`.

#### Scenario: Un municipio no ve las calles de otro

- GIVEN calles sembradas en Motul y en Ticul
- WHEN se consulta `calles` con contexto en Motul y sin filtro explicito
  de tenant
- THEN solo aparecen filas de Motul

### Requirement: Renombrar una calle no reescribe domicilios (Rebanada 4)

Renombrar una calle MUST actualizar unicamente la fila de esa calle en el
catalogo. Los domicilios y residencias que la referencian por id MUST NOT
cambiar ninguna de sus filas.

#### Scenario: renombrar la Calle 21

- GIVEN domicilios que referencian la Calle 21 por id
- WHEN se renombra esa calle
- THEN ningun domicilio ni residencia cambia de fila, y las consultas
  siguientes muestran el nombre nuevo por seguir la misma referencia

### Requirement: Ubicacion compuesta como texto para un reporte ciudadano

El sistema MUST exponer, en un puerto de lectura propio de `territorio`,
un caso de uso que componga la ubicacion de un reporte como una sola
cadena de texto a partir de `lugarId` obligatorio y `calleId` opcional
-sin domicilio ni residencia-, resolviendo la cadena de ancestros
internamente. Esa misma lectura MUST validar que el lugar y, si se
provee, la calle existan, pertenezcan al ayuntamiento del contexto y
esten activos (`bajaEn IS NULL`), devolviendo un error tipado en vez de un
error crudo de Postgres cuando no.

#### Scenario: Ubicacion completa con lugar y calle

- GIVEN un lugar con su cadena de ancestros y una calle asociada
- WHEN se pide la ubicacion compuesta de un lugarId y un calleId
- THEN el texto incluye la cadena de ancestros y la calle

#### Scenario: Ubicacion sin calle compone solo el lugar

- GIVEN un lugarId sin calleId
- WHEN se pide la ubicacion compuesta
- THEN el texto compone la cadena de ancestros del lugar, sin mencion de
  calle

#### Scenario: Un lugarId de otro municipio o dado de baja se rechaza

- GIVEN un lugarId que pertenece a otro ayuntamiento o que esta dado de
  baja
- WHEN se pide su ubicacion compuesta
- THEN el sistema responde con un error tipado, no con un error crudo de
  Postgres

#### Scenario: La composicion refleja la jerarquia vigente, no una copia congelada

- GIVEN un lugar cuya colonia se reparenta a otra comisaria despues del
  registro del reporte
- WHEN se pide la ubicacion compuesta despues del reparenteo
- THEN el texto refleja la cadena de ancestros actual, al reves que una
  constancia emitida, que no cambia

### Requirement: Reparentear una calle mueve solo su fila

Reparentear una calle activa hacia otro lugar del mismo municipio MUST
actualizar unicamente `lugarId` de esa calle. `domicilios.lugarId` MUST NOT
cascadear: conserva su propio nivel conocido mas profundo, no uno derivado
de su calle.

#### Scenario: Reparenteo no toca domicilios

- GIVEN una calle con domicilios que la referencian por `calleId`
- WHEN se reparenta esa calle a otro lugar
- THEN ningun domicilio cambia su `lugarId` ni ninguna otra columna

#### Scenario: Lugar destino invalido se rechaza

- GIVEN un `lugarId` destino que no existe o pertenece a otro ayuntamiento
- WHEN se intenta reparentar una calle hacia ese destino
- THEN el sistema responde con un error tipado, no con un error crudo de
  Postgres

### Requirement: Reparentear rechaza nombre duplicado en el destino

El sistema MUST rechazar reparentear una calle hacia un lugar donde ya
exista una calle activa con el mismo nombre, con el mismo error tipado que
usa el alta y el renombre.

#### Scenario: El lugar destino ya tiene ese nombre

- GIVEN un lugar destino con una calle activa llamada "Calle 21"
- WHEN se reparenta hacia ese lugar otra calle tambien llamada "Calle 21"
- THEN el sistema rechaza la operacion con el mismo error de nombre
  duplicado que el alta, sin escribir la fila

### Requirement: Baja logica de una calle, bloqueada solo por domicilios

Dar de baja una calle activa MUST activar su `bajaEn`, mismo criterio que
`darDeBajaLugar`: se rechaza unicamente si tiene domicilios colgados por
`calleId`. Reportes ciudadanos que la referencien MUST NOT bloquear la
baja.

#### Scenario: Calle con domicilios no se da de baja

- GIVEN una calle con al menos un domicilio que la referencia por
  `calleId`
- WHEN se intenta dar de baja esa calle
- THEN el sistema rechaza la operacion y `bajaEn` sigue en `NULL`

#### Scenario: Calle con reportes activos si se da de baja

- GIVEN una calle sin domicilios pero con reportes ciudadanos apuntandole
- WHEN se da de baja esa calle
- THEN la operacion se completa y `bajaEn` queda escrito

### Requirement: Reparenteo y baja de calle exigen administrar territorio y dejan bitacora

`reparentearCalle` y `darDeBajaCalle` MUST exigir
`puedeAdministrarTerritorio` y MUST dejar una fila de bitacora con solo ids,
en la misma transaccion que el cambio.

#### Scenario: Reparenteo y baja dejan traza

- GIVEN una calle existente
- WHEN se reparenta o se da de baja
- THEN la bitacora registra actor, calle y la accion correspondiente, solo
  ids, en la misma transaccion

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

### Requirement: El evento estructural guarda el antes y el despues

Los eventos nuevos de `RENOMBRE`, `REPARENTEO` y `UBICACION` MUST guardar
los valores estructurales anteriores y nuevos de la fila bloqueada en la
misma transaccion que la mutacion. `RENOMBRE` guarda los nombres de calle;
`UBICACION`, los pares de coordenadas nullable; `REPARENTEO`, los ids de los
lugares. Los nombres de lugar MUST resolverse al leer bajo RLS, no
congelarse en el evento. Los ids historicos MUST conservarse aunque el
lugar se elimine; no llevan FK que impida la operacion B3d.

Las columnas nullable de `0019` MUST permitir leer eventos anteriores sin
inventarles valores. La presencia del payload MUST depender de los valores
guardados, no de que un join resuelva el nombre: un id historico sin lugar
visible conserva el evento y su lado no resuelto en `null`.

#### Scenario: Un renombre conserva el nombre que tenia la fila bloqueada

- GIVEN una calle con nombre anterior y un renombre autorizado
- WHEN confirma la transaccion
- THEN el evento guarda el nombre anterior y el nuevo junto al cambio

#### Scenario: La primera ubicacion conserva la ausencia de punto anterior

- GIVEN una calle sin punto y una ubicacion autorizada
- WHEN confirma la transaccion
- THEN el punto anterior del evento es nulo y el nuevo es el par guardado

#### Scenario: Un lugar eliminado o ajeno no borra el payload historico

- GIVEN un reparenteo con ids guardados cuyo lugar anterior o nuevo no se resuelve bajo RLS
- WHEN se lee el evento
- THEN conserva su payload y el nombre de ese lado es `null`
- AND no expone un nombre de otro municipio

#### Scenario: Un evento anterior a 0019 no se reconstruye

- GIVEN un evento sin las columnas de detalle pobladas
- WHEN se lee el evento
- THEN conserva su naturaleza y fecha con `cambio: null`
