# Validacion Publica de Folio — Specification

## Purpose

Un folio es secuencial porque el invariante de documentos oficiales lo
exige, y un lector paginado del padron no es un producto aceptable. Esta
capability confirma la autenticidad de una constancia a quien tiene el
papel en la mano, sin sesion y sin exponer el padron a quien solo prueba
numeros consecutivos.

## Requirements

### Requirement: Caso de uso publico con firma propia, sin ContextoActual

El sistema MUST exponer `validarFolio({ ayuntamientoId, folio, codigo })`
como caso de uso publico, sin `ContextoActual` ni `usuario`. El
`ayuntamientoId` MUST resolverse por `ayuntamientoActual()` a partir del
subdominio del request, nunca desde la URL, el folio o el body.

#### Scenario: El folio de la URL no elige el municipio

- GIVEN un request a `/validar/{folio}` en el subdominio de Motul
- WHEN se resuelve el ayuntamiento contra el que se valida el folio
- THEN el ayuntamiento resuelto es Motul, sin importar que exista un folio
  igual en otro municipio

### Requirement: Respuesta de un nivel — solo folio

Con `folio` sin `codigo`, el sistema MUST responder unicamente vigencia
(si/no), tipo de documento y fecha de emision. El sistema MUST NOT incluir
nombre del titular, direccion, CURP ni ningun otro dato de la persona.

#### Scenario: Folio vigente sin codigo

- GIVEN una constancia vigente
- WHEN se consulta `/validar/{folio}` sin `codigo`
- THEN la respuesta confirma vigencia, tipo de documento y fecha de
  emision, y no incluye nombre ni direccion

### Requirement: Respuesta de dos niveles — folio y codigo correcto

Con `folio` y el `codigo` de verificacion correcto —quien tiene el papel
fisico—, el sistema MUST agregar a la respuesta el nombre del titular y el
texto congelado de la direccion, para que quien recibe el documento
compare contra lo impreso.

#### Scenario: Folio y codigo correcto revelan nombre y direccion

- GIVEN una constancia vigente y su codigo de verificacion impreso en el
  QR
- WHEN se consulta `/validar/{folio}?c={codigo}` con el codigo correcto
- THEN la respuesta agrega el nombre del titular y el texto de direccion
  congelado en el documento

### Requirement: Toda respuesta negativa es indistinguible

Un folio inexistente, un folio de otro ayuntamiento, un folio con codigo
incorrecto y un folio de un documento cancelado MUST producir exactamente
la misma respuesta generica de "no valido". El sistema MUST NOT exponer
ninguna diferencia observable —mensaje, codigo de estado, tiempo de
respuesta significativo— entre estos cuatro casos.

#### Scenario: Folio inexistente y folio cancelado responden igual

- GIVEN un folio que nunca existio y un folio de una constancia cancelada
- WHEN se consulta cada uno por separado
- THEN ambas respuestas son identicas en contenido

#### Scenario: Folio de otro municipio no confirma su existencia

- GIVEN un folio real de Ticul consultado desde el subdominio de Motul
- WHEN se resuelve la validacion
- THEN la respuesta es la misma generica de "no valido", sin indicar que
  el folio existe en otro municipio

#### Scenario: Codigo incorrecto no confirma que el folio es real

- GIVEN un folio vigente y un codigo de verificacion incorrecto
- WHEN se consulta `/validar/{folio}?c={codigo-incorrecto}`
- THEN la respuesta es la misma generica de "no valido" del folio
  inexistente, sin confirmar que el folio si existe

### Requirement: El QR nunca apunta al PDF

El QR embebido en una constancia MUST apuntar a la pagina publica de
validacion (`/validar/{folio}?c={codigo}`), MUST NOT apuntar a una URL que
sirva el PDF o cualquier binario descargable.

#### Scenario: Escanear el QR abre la pagina de validacion

- GIVEN una constancia impresa con su QR
- WHEN se escanea el QR
- THEN el destino es la pagina publica de validacion, no una descarga

### Requirement: Limitacion de ritmo obligatoria

El sistema MUST limitar el ritmo de consultas a `validarFolio` por clave
derivada del origen del request, dentro de la misma ventana de limitacion
que el resto de las superficies publicas del sistema.

#### Scenario: Recorrer folios consecutivos agota la ventana antes de un dato real

- GIVEN un origen que consulta folios consecutivos crecientes en
  sucesion rapida
- WHEN supera el umbral de la ventana de limitacion
- THEN las siguientes consultas se rechazan por limitacion de ritmo antes
  de que ninguna haya expuesto un dato personal
