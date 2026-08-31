# Delta for Jerarquia Territorial

## ADDED Requirements

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
