# Delta for Jerarquia Territorial

## MODIFIED Requirements

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
