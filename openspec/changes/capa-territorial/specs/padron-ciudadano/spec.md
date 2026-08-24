# Delta for Padron Ciudadano

## ADDED Requirements

### Requirement: Lectura compuesta de persona por id para otros modulos (Rebanada 1)

El sistema MUST exponer, en la superficie publica de `padron`, un caso de
uso compuesto de lectura de persona por id sobre
`RepositorioDePersonas.buscarPorId` —ya existente en el puerto pero no
compuesto en `composicion.ts`—, consumible por otros modulos sin acceso
directo a `personas`. Este caso de uso MUST resolver la redireccion de
fusion colapsada, igual que la busqueda y el listado existentes. El
esquema de `personas` MUST NOT cambiar por este requisito.

#### Scenario: territorio consulta una persona sin leer personas directo

- GIVEN una persona registrada en `padron`, fusionada o no
- WHEN otro modulo pide sus datos por id a traves del nuevo caso de uso
- THEN recibe los datos colapsados de la identidad ganadora, sin ejecutar
  SQL propio contra `personas`

#### Scenario: id inexistente o de otro tenant no revela nada

- GIVEN un id de persona que no existe o pertenece a otro ayuntamiento
- WHEN se consulta a traves del caso de uso compuesto
- THEN el resultado es equivalente a "no encontrado", sin distinguir
  entre las dos causas
