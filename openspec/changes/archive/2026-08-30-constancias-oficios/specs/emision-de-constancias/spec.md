# Emision de Constancias — Specification

## Purpose

El tramite mas frecuente del ayuntamiento deja de ser una plantilla de
Word con un folio escrito a mano. `emision-de-constancias` cubre un solo
tipo de documento —la constancia de vecindad— con la maquinaria completa:
folio consecutivo sin huecos, snapshot congelado que un reparenteo
posterior no toca, reimpresion y cancelacion auditables, y el bloque de
firma como la unica superficie de configuracion real.

## Requirements

### Requirement: Folio consecutivo por (ayuntamiento, tipo, anio) bajo lock en transaccion

El sistema MUST asignar el folio dentro de la misma transaccion que
inserta la constancia, tomando lock sobre la fila del contador de
`(ayuntamientoId, tipo, anio)`. El sistema MUST NOT usar una secuencia de
base de datos. El anio MUST resolverse con la hora de Merida, nunca con
UTC.

#### Scenario: Dos emisiones concurrentes en el mismo municipio (T6)

- GIVEN dos operadoras del mismo ayuntamiento emitiendo al mismo tiempo
- WHEN ambas transacciones confirman
- THEN los dos documentos tienen folios distintos y consecutivos, sin
  huecos entre ellos

#### Scenario: Rollback despues de tomar folio no lo consume (T7)

- GIVEN una emision que toma folio y despues falla antes de confirmar
- WHEN la transaccion revierte
- THEN la siguiente emision exitosa toma el mismo numero de folio

#### Scenario: Dos municipios no colisionan

- GIVEN Motul y Ticul emitiendo su primera constancia del mismo dia
- WHEN ambos toman folio
- THEN cada uno produce `VEC-2026-000001` sin conflicto entre si

#### Scenario: El anio del folio es el de la persona, no el de UTC

- GIVEN una emision a las 19:00 hora de Merida el 31 de diciembre
- WHEN se asigna el folio
- THEN el anio impreso es el que ve la persona en Merida, no el de UTC

### Requirement: Formato del folio y consecutivo sin truncar

El folio MUST tener la forma `{PREFIJO}-{AAAA}-{NNNNNN}`, con el prefijo
tomado de una union cerrada por tipo de documento y el consecutivo con
`padStart(6, "0")`. El sistema MUST NOT truncar ni fallar cuando el
consecutivo supera seis digitos: MUST seguir siendo unico aunque el texto
impreso sea mas largo.

#### Scenario: Primera constancia de vecindad del anio

- GIVEN el primer folio de tipo VECINDAD del anio 2026 de un municipio
- WHEN se asigna
- THEN el folio es `VEC-2026-000001`

#### Scenario: El consecutivo un millon uno no rompe la unicidad

- GIVEN un contador cuyo ultimo consecutivo es 999999
- WHEN se emite la siguiente constancia
- THEN el folio se imprime con siete digitos y sigue siendo unico

### Requirement: Tres identificadores con propiedades opuestas

Cada constancia MUST tener un `id` interno no enumerable, un `folio`
publico y secuencial, y un `codigoVerificacion` de alta entropia generado
al emitir. El `codigoVerificacion` MUST viajar unicamente dentro del QR
del documento renderizado, nunca en una respuesta que no requiera el
codigo.

#### Scenario: El id interno no expone la posicion en la serie

- GIVEN una constancia recien emitida
- WHEN se inspecciona su `id`
- THEN no es posible derivar de el el numero de folio ni la posicion en
  la serie del ayuntamiento

### Requirement: Snapshot congelado al emitir

Al emitir, el sistema MUST capturar y guardar un snapshot con el nombre
del titular, la direccion compuesta como texto y la fecha de residencia
vigente. El sistema MUST NOT re-derivar esos datos desde `personas`,
`domicilios` o `residencias` en ninguna lectura posterior del documento
ya emitido.

#### Scenario: Reparentear la colonia del titular no cambia el documento

- GIVEN una constancia ya emitida y su domicilio colgado de una colonia
- WHEN esa colonia se reparenta a otra comisaria
- THEN el texto de la constancia, leida o reimpresa, no cambia ni un
  caracter

#### Scenario: Editar el nombre de la persona no cambia el documento

- GIVEN una constancia ya emitida
- WHEN se corrige el apellido de la persona en `padron` despues de la
  emision
- THEN el nombre impreso en la constancia sigue siendo el capturado al
  emitir

### Requirement: Un documento emitido es inmutable

El sistema MUST NOT exponer ninguna operacion que edite los datos de una
constancia ya emitida. La unica forma de invalidarla MUST ser la
cancelacion.

#### Scenario: No existe edicion de una constancia emitida (T12)

- GIVEN una constancia emitida
- WHEN se revisan las operaciones disponibles sobre ella
- THEN ninguna permite modificar su snapshot, folio o titular

### Requirement: Bloqueo de emision sin bloque de firma configurado

El sistema MUST rechazar la emision con un error tipado antes de tomar
folio cuando el ayuntamiento no tiene configurado su bloque de firma
(nombre, cargo y leyenda de pie).

#### Scenario: Ayuntamiento recien provisionado no puede emitir

- GIVEN un ayuntamiento sin bloque de firma configurado
- WHEN una operadora intenta emitir una constancia
- THEN el sistema rechaza con un error tipado y no consume ningun folio

### Requirement: Bloqueo de emision sin residencia vigente

El sistema MUST rechazar la emision con un error tipado antes de tomar
folio cuando la persona no tiene una residencia vigente, o cuando la
persona esta dada de baja logica en `padron`.

#### Scenario: Persona sin residencia vigente

- GIVEN una persona sin ninguna residencia con `hastaEn` nulo
- WHEN se intenta emitir su constancia de vecindad
- THEN el sistema rechaza con un error tipado y no consume folio

#### Scenario: Persona dada de baja

- GIVEN una persona con baja logica en `padron`
- WHEN se intenta emitir su constancia
- THEN el sistema rechaza con un error tipado y no consume folio

### Requirement: Sin periodo minimo de residencia como regla de sistema

El sistema MUST NOT validar un periodo minimo de residencia antes de
emitir; MUST mostrar a quien opera la fecha `desdeEn` de la residencia
vigente antes de confirmar la emision, para que el criterio lo aplique la
persona, no el software.

**Supuesto declarado, reversible.** Esta ausencia asume que el municipio
piloto no tiene una politica escrita de periodo minimo. Si el piloto trae
una —por ejemplo, seis meses— esto se vuelve una regla de dominio con su
propio test, y este requisito cambia de MUST NOT a un MUST con el umbral
exacto. Cablear un umbral sin esa evidencia bloquearia emisiones
legitimas.

#### Scenario: Residencia de un dia se puede emitir con aviso visible

- GIVEN una persona cuya residencia vigente comenzo ayer
- WHEN se prepara su emision
- THEN el sistema muestra la fecha de inicio a quien opera y no bloquea la
  emision por ese motivo

### Requirement: Reimpresion registrada de solo agregado con motivo cerrado

Toda reimpresion MUST quedar registrada en una fila de solo agregado con
el usuario, el momento y un motivo de una categoria cerrada
(`EXTRAVIO`, `DETERIORO`, `EJEMPLAR_ADICIONAL`), sin campo de texto libre
acompanante. El conteo de reimpresiones de una constancia MUST NOT poder
decrecer.

#### Scenario: Reimprimir dos veces deja dos filas

- GIVEN una constancia ya reimpresa una vez por extravio
- WHEN se reimprime una segunda vez por deterioro
- THEN existen dos filas de reimpresion, cada una con su propio motivo,
  usuario y momento, y ninguna fila anterior se modifica

#### Scenario: Un motivo fuera de la categoria cerrada se rechaza

- GIVEN una solicitud de reimpresion con un motivo que no pertenece a la
  union cerrada
- WHEN se intenta registrar
- THEN el sistema la rechaza

#### Scenario: Una constancia cancelada no se reimprime

- GIVEN una constancia cancelada
- WHEN se intenta reimprimir
- THEN el sistema rechaza la operacion

### Requirement: La reimpresion usa la version de plantilla grabada al emitir

Cada constancia MUST guardar la version de plantilla vigente al momento de
emitir. Reimprimir MUST renderizar con esa version guardada, MUST NOT usar
la version de plantilla actual del sistema si esta cambio despues de la
emision.

#### Scenario: Cambiar la plantilla no altera una reimpresion posterior

- GIVEN una constancia emitida con la version de plantilla 1
- WHEN la plantilla se actualiza a la version 2 y luego esa constancia se
  reimprime
- THEN la reimpresion se renderiza con la version 1, identica en
  disposicion a la primera impresion salvo la marca de agua

### Requirement: Cancelacion irreversible restringida a quien administra documentos

Cancelar una constancia MUST requerir la regla `puedeAdministrarDocumentos`
y MUST registrar el usuario, el momento y un motivo de categoria cerrada
(`ERROR_DE_CAPTURA`, `DATOS_INCORRECTOS`, `SOLICITUD_DEL_INTERESADO`). Una
cancelacion MUST NOT poder revertirse: corregir el error MUST requerir
emitir un documento nuevo con folio nuevo.

**Supuesto declarado, reversible.** Restringir a `ADMIN_MUNICIPAL` asume
que quien atiende el mostrador no es tambien la administradora. En un
municipio de una sola persona que cubre ambos roles, la regla es un
obstaculo sin beneficio: la emision correcta no depende de cancelar la
incorrecta, asi que el costo es demora, no bloqueo total. Si el piloto
confirma que mostrador y administracion son la misma persona, aflojar esta
regla es cambiar una funcion pura de una linea, sin tocar esquema.

#### Scenario: OPERADOR no puede cancelar aunque emitio el documento

- GIVEN un OPERADOR que emitio una constancia
- WHEN ese mismo OPERADOR intenta cancelarla
- THEN el sistema rechaza con 403

#### Scenario: Cancelar no borra ni edita, deja historial

- GIVEN una constancia cancelada por error
- WHEN se corrige emitiendo una nueva constancia para la misma persona
- THEN la constancia cancelada permanece en el historial con su motivo, y
  la nueva constancia tiene un folio distinto

### Requirement: FK compuesto hacia personas; sin FK vivo hacia domicilio o residencia

`constancias.personaId` MUST vincularse por FK compuesto, escrito a mano,
contra `personas(id, ayuntamiento_id)`. El sistema MUST NOT declarar FK
alguno hacia `domicilios` ni hacia `residencias`: la direccion y la fecha
de residencia viven congeladas en el snapshot, no como referencia viva.

#### Scenario: Una constancia no puede citar una persona de otro municipio

- GIVEN una persona de Ticul
- WHEN se intenta crear en Motul una constancia cuyo `personaId` sea el de
  esa persona
- THEN Postgres rechaza el INSERT por la restriccion, no solo el caso de
  uso

### Requirement: Aislamiento por ayuntamiento de las tablas nuevas

`constancias`, `folios_de_documentos`, `reimpresiones`, y la columna
`ayuntamientos.documentos` MUST estar alcanzadas por `ayuntamiento_id` con
`FORCE ROW LEVEL SECURITY` y su propio test de aislamiento.

#### Scenario: Un municipio no ve las constancias de otro por id directo

- GIVEN una constancia de Ticul y un usuario autenticado en Motul
- WHEN ese usuario pide esa constancia por su id
- THEN la respuesta es equivalente a "no encontrado", y una fila de
  `constancias` con `persona_id` de otro municipio es rechazada por
  Postgres, no solo por la aplicacion

#### Scenario: El bloque de firma de un municipio no se filtra a otro

- GIVEN un bloque de firma configurado en `ayuntamientos.documentos` de
  Motul
- WHEN se consulta desde el contexto de Ticul sin filtro explicito
- THEN no aparece ningun dato del bloque de firma de Motul

### Requirement: Render de PDF sobre snapshot, sin persistir el binario

El sistema MUST renderizar el PDF de una constancia bajo el panel
autenticado, a partir del snapshot guardado, con el escudo del ayuntamiento
y el QR embebidos. El sistema MUST NOT escribir el binario del PDF en el
filesystem del contenedor ni en almacenamiento de objetos.

#### Scenario: El PDF no queda persistido en ningun lado

- GIVEN una constancia ya emitida
- WHEN se descarga su PDF dos veces seguidas
- THEN ambas descargas se generan al vuelo desde el snapshot, sin que
  exista un archivo persistido entre una y otra

### Requirement: Constancias en la exportacion por ayuntamiento

`emision-de-constancias` MUST aportar una `PorcionExportable` con columnas
listadas una por una, nunca `select()` pelado.

#### Scenario: La exportacion no trae columnas no declaradas

- GIVEN la `PorcionExportable` de constancias
- WHEN se genera una exportacion
- THEN solo aparecen las columnas listadas explicitamente, y ni el
  `codigoVerificacion` ni el snapshot completo salen sin estar en esa
  lista
