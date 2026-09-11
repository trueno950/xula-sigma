# Mapa Operativo — Specification

## Purpose

La operacion municipal responde "donde esta el trabajo y que se esta
haciendo" con un mapa interno autenticado que agrega reportes e
intervenciones sobre el punto de calle existente, con filtros, conteos y
cobertura faltante declarada, nunca ocultada. El punto de calle es
aproximado por decision de producto: el mapa no dibuja el punto exacto del
hecho porque ese dato no existe en el sistema.

## Requirements

### Requirement: Mapa interno autenticado, sin superficie publica

El mapa MUST requerir sesion del panel municipal y MUST NOT exponerse sin
sesion. `consulta-publica-de-reportes` MUST NOT cambiar por este spec.

#### Scenario: Sin sesion no hay mapa

- GIVEN una peticion al mapa sin sesion
- WHEN se intenta renderizar la vista
- THEN el sistema la rechaza y no entrega datos

### Requirement: Marcadores sobre el punto de calle existente, etiquetados como aproximados

Cada marcador MUST ubicarse en el punto (`latitud`/`longitud`) de su calle
en `calles`, nunca en un punto exacto del hecho. La UI MUST etiquetar el
marcador como aproximado.

#### Scenario: Un reporte se dibuja en el punto de su calle

- GIVEN un reporte con `calleId` y una calle con punto capturado
- WHEN se agrega el mapa
- THEN el marcador aparece en el punto de la calle
- AND la UI declara que la ubicacion es aproximada

#### Scenario: Una calle sin punto no genera un marcador falso

- GIVEN un reporte cuya calle no tiene coordenada
- WHEN se agrega el mapa
- THEN no se dibuja ningun marcador en coordenadas inventadas ni por defecto

### Requirement: Diferenciacion reporte / intervencion

El marcador MUST distinguir visualmente un reporte ciudadano de una
intervencion municipal.

#### Scenario: Reporte e intervencion sobre la misma calle

- GIVEN una calle con un reporte y una intervencion
- WHEN se agrega el mapa
- THEN los dos hechos se distinguen entre si a primera vista

### Requirement: Filtros y conteos coherentes

Los filtros por tipo, estado y area MUST filtrar marcadores y conteos al
mismo tiempo. Los conteos MUST reflejar el filtro vigente y el tenant del
contexto.

#### Scenario: Filtrar por estado filtra marcadores y contadores

- GIVEN reportes en varios estados
- WHEN se filtra por un estado
- THEN solo quedan visibles los marcadores de ese estado
- AND los conteos muestran unicamente las filas del filtro

#### Scenario: Filtro sin resultados

- GIVEN un filtro sin filas en el ayuntamiento
- WHEN se aplica
- THEN el mapa muestra un estado vacio explicito, sin marcadores
- AND los conteos muestran cero

### Requirement: Cobertura faltante declarada, nunca ocultada

Las calles sin punto y los reportes e intervenciones sin calle MUST
aparecer en una seccion explicita de cobertura faltante. El sistema MUST
NOT omitirlos de la agregacion ni de los conteos.

#### Scenario: Reporte sin calle visible en cobertura faltante

- GIVEN un reporte con `calleId` nulo
- WHEN se abre el mapa
- THEN el reporte aparece en la seccion de cobertura faltante
- AND no se dibuja en un punto aproximado inventado

#### Scenario: Calle sin punto listada como pendiente de ubicar

- GIVEN una calle sin coordenada con actividad registrada
- WHEN se abre el mapa
- THEN la calle aparece como cobertura faltante
- AND su actividad enlaza al detalle correspondiente

### Requirement: Lectura por puertos propios

El mapa MUST leer reportes, intervenciones y territorio por puertos de
lectura propios del modulo, nunca importando dominio de otro modulo
(antipatron 8).

### Requirement: Enlace al detalle actual

Cada marcador y cada entrada de cobertura faltante MUST enlazar al detalle
vigente del recurso.

### Requirement: Aislamiento por tenant en la agregacion

La agregacion MUST resolverse bajo el tenant del contexto de sesion y MUST
NOT incluir datos de otro ayuntamiento.

#### Scenario: El mapa de Motul no agrega nada de Ticul

- GIVEN reportes e intervenciones en Motul y en Ticul
- WHEN se agrega el mapa con contexto de Motul
- THEN solo aparecen hechos de Motul

### Requirement: Sin GIS nuevo

El mapa MUST NOT introducir PostGIS, geocodificacion ni polilineas. La
geometria sigue siendo el punto de `calles`.
