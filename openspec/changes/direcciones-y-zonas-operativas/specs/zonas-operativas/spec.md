# Zonas Operativas — Specification

## Purpose

Una zona operativa es el recorte con el que el ayuntamiento reparte
trabajo de campo -descacharrizacion, fumigacion, vacunacion,
recoleccion-, no un nivel del arbol territorial. `zonas` modela un
conjunto de calles de un mismo asentamiento; la pertenencia de un
domicilio a una zona se deriva de su calle y nunca se declara en el
mostrador.

Cada requisito lleva su unidad de entrega entre parentesis (B1, ver
`proposal.md` "Presupuesto de revision") para que `sdd-tasks` corte sin
releer la decision.

## Requirements

### Requirement: Una zona es un conjunto de calles de un unico asentamiento (Rebanada B1)

`zonas` MUST representar un recorte operativo como un conjunto de
calles, nunca como un nivel de `lugares`: una zona MUST NOT tener hijos
ni domicilios colgados directamente. Toda calle agregada a una zona
MUST compartir el mismo `lugarId` (`cabecera` o `comisaria`) que la
zona. El sistema MUST rechazar agregar a una zona una calle de un
asentamiento distinto.

#### Scenario: Una zona agrupa calles del mismo asentamiento

- GIVEN una zona creada para la cabecera municipal
- WHEN se le agregan dos calles de esa misma cabecera
- THEN ambas quedan asociadas a la zona

#### Scenario: Una calle de otro asentamiento se rechaza

- GIVEN una zona de la cabecera y una calle de una comisaria distinta
- WHEN se intenta agregar esa calle a la zona
- THEN el sistema rechaza la operacion sin escribir la fila

### Requirement: La pertenencia de calle a zona es muchos a muchos y no exige particion (Rebanada B1)

Una calle MAY pertenecer a cero, una o varias zonas. Una zona MAY
existir sin ninguna calle asociada. El sistema MUST NOT exigir que las
zonas de un asentamiento particionen su catalogo de calles: dos
campanias distintas recortan el mismo territorio de formas distintas.

#### Scenario: Una calle esta en dos zonas de campanias distintas

- GIVEN la Calle 21 de la cabecera
- WHEN se agrega a la zona de fumigacion y tambien a la de recoleccion
- THEN ambas asociaciones existen sin conflicto

#### Scenario: Una zona vacia es valida

- GIVEN una zona recien creada sin calles agregadas
- WHEN se lista esa zona
- THEN aparece con cero calles y cero domicilios, sin error

### Requirement: Los domicilios de una zona se derivan de sus calles, nunca se declaran (Rebanada B1)

El sistema MUST calcular los domicilios de una zona uniendo
`domicilios.calleId` con las calles asociadas a esa zona; `domicilios`
MUST NOT llevar ninguna columna de zona. El alta y la correccion de un
domicilio MUST NOT pedir ni aceptar una zona.

#### Scenario: Un domicilio aparece en la zona de su calle sin declararla

- GIVEN un domicilio con `calleId` en la Calle 21, y la Calle 21
  asociada a la zona de fumigacion
- WHEN se consultan los domicilios de esa zona
- THEN el domicilio aparece sin que nadie haya elegido zona al darlo de
  alta

#### Scenario: Cambiar la calle de un domicilio actualiza su zona sin tocar zonas

- GIVEN un domicilio corregido para apuntar a otra calle
- WHEN se consultan las zonas de ambas calles despues de la correccion
- THEN el domicilio aparece solo en las zonas de la calle nueva, sin
  que se haya escrito ninguna fila de `zonas` ni de su pertenencia

### Requirement: Aislamiento de zonas y de su pertenencia por ayuntamiento (Rebanada B1)

`zonas` y su tabla de pertenencia MUST llevar `ayuntamientoId` con
`ENABLE` + `FORCE ROW LEVEL SECURITY`, politica de tenant y `GRANT` al
rol de aplicacion; sus FK -incluida la referencia a `calles` y a
`zonas`- MUST ser compuestos contra `(id, ayuntamientoId)`. Cada tabla
MUST tener su propio test de aislamiento en el mismo commit que la
crea. Pedir una zona de otro ayuntamiento por id MUST responder 404,
nunca 403.

#### Scenario: Un municipio no ve las zonas de otro

- GIVEN zonas sembradas en Motul y en Ticul
- WHEN se consultan zonas con contexto en Motul y sin filtro explicito
  de tenant
- THEN solo aparecen zonas de Motul

#### Scenario: Una calle de otro municipio no puede agregarse a una zona

- GIVEN una calle de Ticul
- WHEN se intenta agregarla a una zona de Motul
- THEN Postgres rechaza el INSERT por el FK compuesto

#### Scenario: Pedir la zona de otro municipio responde 404

- GIVEN un usuario de Motul y una zona que pertenece a Ticul
- WHEN pide esa zona por id
- THEN la respuesta es 404, no 403, y no revela si la fila existe en
  Ticul

### Requirement: Administrar zonas exige el mismo permiso que administrar el territorio (Rebanada B1)

Crear, renombrar, dar de baja una zona, y agregar o quitar una calle de
una zona MUST exigir `puedeAdministrarTerritorio`. Toda operacion MUST
dejar una fila de bitacora con solo ids en la misma transaccion.

#### Scenario: Un OPERADOR no puede crear una zona

- GIVEN un OPERADOR autenticado en su ayuntamiento
- WHEN intenta crear una zona
- THEN la operacion responde con rechazo de autorizacion

#### Scenario: Un ADMIN_MUNICIPAL agrega una calle y queda bitacora

- GIVEN un ADMIN_MUNICIPAL autenticado en su ayuntamiento
- WHEN agrega una calle a una zona de ese ayuntamiento
- THEN la operacion se autoriza y la bitacora registra actor, zona y
  calle, solo ids, en la misma transaccion
