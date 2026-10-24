# Historial de Calle — Specification

## Purpose

Cada calle acumula hechos de naturalezas distintas —un vecino reporto, el
municipio intervino, la calle se renombro— que hoy viven en tablas
separadas o solo en la bitacora. `historial-de-calle` compone, para una
calle, una linea de tiempo de solo lectura que diferencia esas naturalezas
sin presentar filas crudas de auditoria como historia de negocio.

## Requirements

### Requirement: Proyeccion compuesta de solo lectura

La linea de tiempo MUST ser una proyeccion de solo lectura compuesta a
partir de fuentes de negocio tipadas: reportes, intervenciones y eventos
estructurales de calle. MUST NOT escribir en ninguna tabla. MUST NOT
presentar filas crudas de `bitacora` ni de `movimientos_de_reportes` como
entradas de la historia de negocio.

#### Scenario: Un movimiento de reporte no es una entrada de la linea de tiempo

- GIVEN un reporte que cambio de estado tres veces
- WHEN se abre la linea de tiempo de su calle
- THEN el reporte aparece como un hecho de negocio
- AND sus movimientos internos no aparecen como entradas

### Requirement: Tipos de evento diferenciados

Cada entrada MUST pertenecer a una de las naturalezas `REPORTE`,
`INTERVENCION`, `RENOMBRE`, `REPARENTEO`, `UBICACION`, y la UI MUST
diferenciarlas a primera vista.

#### Scenario: La misma calle con reporte, obra y renombre

- GIVEN una calle con un reporte, una intervencion y un renombre
- WHEN se abre su linea de tiempo
- THEN las tres entradas aparecen con su naturaleza distinguida

### Requirement: Orden por ocurrencia con desempate determinista

Las entradas MUST ordenarse por su fecha de ocurrencia —`registradoEn`
para reportes, `fechaDeOcurrencia` para intervenciones, el momento de la
operacion para eventos estructurales— en orden descendente. Ante empate de
instante exacto, MUST desempatarse por un criterio determinista y estable
(rango de naturaleza y luego id), nunca por el orden de lectura.

#### Scenario: Empate de instante exacto ordena estable

- GIVEN un reporte y un renombre con el mismo instante de ocurrencia
- WHEN se abre la linea de tiempo dos veces
- THEN las dos lecturas devuelven el mismo orden

### Requirement: Por calle, bajo el tenant del contexto

La linea de tiempo MUST resolverse para una calle del ayuntamiento del
contexto. Una calle de otro ayuntamiento MUST responder como no encontrada
(404), nunca 403.

#### Scenario: La calle de otro municipio no se lee

- GIVEN un usuario de Motul y una calle de Ticul
- WHEN pide la linea de tiempo de esa calle
- THEN el sistema responde "no encontrado"

### Requirement: Estado vacio explicito

Una calle sin hechos MUST mostrar un estado vacio explicito, no una linea
de tiempo con contenido inventado.

### Requirement: Sin edicion y sin auditoria cruda como contenido

La linea de tiempo MUST NOT ofrecer operaciones de escritura ni
correccion, y MUST NOT exponer el actor ni los ids internos de las filas
de bitacora como contenido de la historia de negocio.

### Requirement: Detalle del cambio de un evento estructural

Un evento estructural —`RENOMBRE`, `REPARENTEO` o `UBICACION`— MUST poder
decir que cambio, no solo cuando. La linea de tiempo MUST mostrar el antes
y el despues que el evento trae —nombre anterior y nuevo, punto anterior y
nuevo, lugar anterior y nuevo con sus nombres ya resueltos bajo la politica
de tenant— y MUST NOT exponer descripcion, referencia ni datos personales:
el detalle es nombre de calle, nombre de lugar, coordenadas e ids.

Cuando el evento no trae detalle —uno registrado antes de que existiera—
la entrada MUST conservar su naturaleza y su fecha con la frase generica de
su naturaleza, y MUST NOT reconstruirlo. Cuando un lado no se pudo
resolver —un lugar de otro ayuntamiento o ya inexistente— la entrada MUST
seguir apareciendo, con ese nombre en nulo y sin omitir el evento. Un
cambio que dejo el mismo valor MUST NOT repetirlo a los dos lados.

#### Scenario: Un renombre dice de que nombre a que nombre

- GIVEN un renombre que trae nombre anterior y nombre nuevo
- WHEN se abre la linea de tiempo de la calle
- THEN el detalle dice el nombre anterior y el nombre nuevo

#### Scenario: Un reparenteo nombra el lugar anterior y el nuevo

- GIVEN un reparenteo cuyos dos lugares se resuelven bajo la politica de
  tenant
- WHEN se abre la linea de tiempo
- THEN el detalle nombra el lugar anterior y el nuevo

#### Scenario: Un lugar que no se resuelve no borra el evento

- GIVEN un evento cuyo lugar nuevo pertenece a otro ayuntamiento
- WHEN se lee la linea de tiempo
- THEN el evento sigue apareciendo y el nombre no resuelto queda nulo

#### Scenario: Una primera ubicacion dice que antes no habia punto

- GIVEN una ubicacion de una calle que no tenia punto
- WHEN se abre la linea de tiempo
- THEN el detalle dice que antes la calle no tenia punto y muestra el nuevo

#### Scenario: Un cambio sin diferencia no repite el valor

- GIVEN una ubicacion que dejo el mismo punto
- WHEN se abre la linea de tiempo
- THEN la entrada muestra su frase generica en vez del mismo valor dos veces

#### Scenario: Un evento sin detalle conserva su frase generica

- GIVEN un evento estructural registrado antes de que existiera el detalle
- WHEN se abre la linea de tiempo
- THEN la entrada conserva su naturaleza y su fecha
- AND el detalle no se reconstruye ni se inventa
