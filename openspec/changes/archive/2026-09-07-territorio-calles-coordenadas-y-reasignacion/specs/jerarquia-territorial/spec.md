# Delta for Jerarquia Territorial

## ADDED Requirements

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

`reparentearCalle` y `darDeBajaCalle` MUST exigir `puedeAdministrarTerritorio`
y MUST dejar una fila de bitacora con solo ids, en la misma transaccion que
el cambio.

#### Scenario: Reparenteo y baja dejan traza

- GIVEN una calle existente
- WHEN se reparenta o se da de baja
- THEN la bitacora registra actor, calle y la accion correspondiente, solo
  ids, en la misma transaccion
