# Delta for Residencias

## ADDED Requirements

### Requirement: Lectura de residencia vigente para consumidores externos

El sistema MUST exponer, en la superficie publica de `residencias`, un
caso de uso de lectura que resuelva la residencia vigente de una persona
aplicando una sola vez la regla de desempate ya existente —primera fila
con `hastaEn IS NULL` en el orden `desdeEn DESC, creadoEn DESC`, incluido
el colapso de identidades fusionadas—, consumible por otros modulos sin
reimplementar esa regla. Cuando la persona no tiene ninguna residencia
vigente, el caso de uso MUST devolver una ausencia explicita, distinguible
de un error.

#### Scenario: emision-de-constancias resuelve la residencia vigente sin reimplementar el desempate

- GIVEN una persona con historial de residencias, incluida una identidad
  fusionada con dos residencias abiertas
- WHEN otro modulo pide la residencia vigente por id de persona a traves
  de este caso de uso
- THEN recibe la misma residencia que resolveria el historial completo,
  sin ejecutar su propia consulta contra `residencias`

#### Scenario: Persona sin residencia vigente devuelve ausencia explicita

- GIVEN una persona sin ninguna residencia con `hastaEn` nulo
- WHEN se consulta su residencia vigente por este caso de uso
- THEN el resultado es una ausencia explicita, no un error ni una fila
  vacia ambigua

#### Scenario: id inexistente o de otro tenant no revela nada

- GIVEN un id de persona que no existe o pertenece a otro ayuntamiento
- WHEN se consulta su residencia vigente a traves de este caso de uso
- THEN el resultado es equivalente a "no encontrado", sin distinguir entre
  las dos causas
