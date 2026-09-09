# Georreferenciacion de Calles — Specification

## Purpose

`calles` no guarda un punto: el mapa de reportes no tiene sobre que
dibujarse. Este spec agrega una coordenada opcional por calle, su rango
valido y el permiso para capturarla — sin PostGIS, sin geocodificacion y
sin mover la coordenada fuera de `calles` (decisiones del proposal).

## Requirements

### Requirement: Coordenada opcional por calle

`calles` MUST llevar `latitud` y `longitud` nullable, independientes entre
si en su nulabilidad transitoria: una calle existente MUST poder guardarse,
listarse y referenciarse sin ninguna de las dos.

#### Scenario: Alta sin punto

- GIVEN una calle nueva sin coordenada capturada
- WHEN se guarda el alta
- THEN la fila se crea con `latitud` y `longitud` en `NULL`

### Requirement: Rango valido — bounding box de Yucatan con margen de captura

Toda escritura de coordenada MUST validarse en el borde (Zod) contra una
constante de dominio, nunca contra un `CHECK` de Postgres: `latitud` entre
19.4333 y 21.6667, `longitud` entre -90.4667 y -87.4833, ambos limites
inclusive.

> Fuente: INEGI, extremos geograficos del estado de Yucatan (resumen de
> areas geograficas, entidad 31) — paralelos 19°29'N-21°37'N y meridianos
> 87°32'W-90°25'W, es decir lat [19.4833, 21.6167] y lng [-90.4167,
> -87.5333] en decimal. Verificado por busqueda web (dos fuentes
> independientes coincidentes: la ficha INEGI/Cuentame y el resumen de
> areas geograficas del estado 31); PDF primario:
> `inegi.org.mx/contenidos/app/areasgeograficas/resumen/resumen_31.pdf`.
>
> Los cuatro limites de arriba llevan un margen de +/-0.05° (~5 km) sobre
> esos extremos. El margen existe porque un bounding box exacto a los
> extremos del estado rechazaria un pin legitimo cerca del limite por la
> precision del click en el mapa o del dataset de origen -un punto real a
> 200 metros del extremo publicado no es un error de captura, y sin margen
> el rango lo trataria como uno-. El extremo publicado sigue siendo la
> referencia; el margen es tolerancia de captura, no una correccion del
> dato geografico.

#### Scenario: Punto dentro del estado se acepta

- GIVEN una calle sin coordenada
- WHEN se ubica con un punto dentro del bounding box
- THEN el sistema guarda `latitud`/`longitud` y registra bitacora

#### Scenario: Punto fuera del estado se rechaza

- GIVEN una calle sin coordenada
- WHEN se intenta ubicar con un punto fuera del bounding box
- THEN el sistema rechaza la operacion con un error de validacion, sin
  escribir la fila

### Requirement: Ubicar o corregir el punto exige administrar territorio

`ubicarCalle` MUST exigir `puedeAdministrarTerritorio`, el mismo permiso
que alta y renombre — nunca `puedeEscribir` de mostrador.

#### Scenario: Un operador de mostrador no puede ubicar el pin

- GIVEN un usuario sin `puedeAdministrarTerritorio`
- WHEN intenta ubicar el punto de una calle
- THEN el sistema rechaza con un error de autorizacion, sin tocar la fila

### Requirement: El punto no se mueve al reparentear

Reparentear una calle hacia otro lugar MUST NOT alterar su `latitud` ni su
`longitud`: la geometria no depende de la jerarquia administrativa.

#### Scenario: Reparenteo conserva el punto

- GIVEN una calle ubicada con un punto valido
- WHEN se reparenta esa calle a otro lugar del municipio
- THEN la fila resultante conserva exactamente el mismo `latitud`/`longitud`

### Requirement: Estado vacio visible cuando falta el punto

La UI de captura y listado MUST distinguir explicitamente una calle sin
coordenada de una calle con coordenada, sin inferir un punto por defecto.

#### Scenario: Calle sin coordenada en el listado

- GIVEN una calle con `latitud`/`longitud` en `NULL`
- WHEN se abre su ficha en el catalogo
- THEN la UI muestra el estado vacio del selector en vez de un pin

### Requirement: Las columnas nuevas heredan el aislamiento de calles

`latitud` y `longitud` MUST quedar cubiertas por la misma `FORCE ROW LEVEL
SECURITY` de `calles`, sin politica adicional; el test de aislamiento de
`calles` MUST ejercitar las columnas nuevas.

#### Scenario: Un municipio no ve el punto de otro

- GIVEN calles ubicadas en Motul y en Ticul
- WHEN se consulta `calles` con contexto en Motul y sin filtro explicito
- THEN solo aparecen `latitud`/`longitud` de filas de Motul
