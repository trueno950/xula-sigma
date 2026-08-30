# Delta for Domicilios

## ADDED Requirements

### Requirement: Direccion compuesta como texto imprimible

El sistema MUST exponer, en la superficie publica de `domicilios`, un
caso de uso de lectura que componga la direccion completa de un domicilio
como una sola cadena de texto —cadena de ancestros de `lugares` desde la
raiz hasta el nivel conocido mas profundo, calle, numero, transversales y
referencia—, resolviendo el orden de los tipos de lugar internamente. Un
consumidor externo MUST NOT tener que subir `padreId` a mano ni conocer el
orden de tipos de `lugares` para obtener este texto.

#### Scenario: Direccion completa con todos los niveles presentes

- GIVEN un domicilio colgado de una manzana con colonia, sector y
  comisaria conocidos, calle, numero y dos transversales
- WHEN se pide su direccion compuesta como texto
- THEN el texto incluye la cadena completa de ancestros, la calle, el
  numero y ambas transversales

#### Scenario: Direccion con niveles ausentes compone solo los presentes

- GIVEN un domicilio colgado directo de una colonia, sin manzana ni sector
  registrados
- WHEN se pide su direccion compuesta como texto
- THEN el texto omite los niveles ausentes sin dejar un hueco visible ni
  fallar

#### Scenario: La composicion refleja la jerarquia vigente, no una copia congelada

- GIVEN un domicilio cuya colonia se reparenta a otra comisaria
- WHEN se pide su direccion compuesta como texto despues del reparenteo
- THEN el texto refleja la cadena de ancestros actual; congelar ese texto
  en un documento ya emitido es responsabilidad de quien consume esta
  lectura, no de este caso de uso
