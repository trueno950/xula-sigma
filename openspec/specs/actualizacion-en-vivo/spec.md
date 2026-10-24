# Actualizacion en Vivo — Specification

## Purpose

El mapa y la linea de tiempo muestran el estado del municipio: la frescura
debe llegar por push, sin que una caida del canal pinte un estado falso.
`actualizacion-en-vivo` define SSE sobre Postgres LISTEN/NOTIFY como bus
compartido, con canal derivado del servidor, resincronizacion por snapshot
y refresh manual como respaldo explicito. El polling no es la via de
frescura.

## Requirements

### Requirement: Canal SSE autenticado, derivado del servidor

La conexion SSE MUST autenticarse por cookie de sesion. El canal MUST
derivarse del `ayuntamientoId` del contexto servidor de la sesion, nunca
de parametros enviados por el cliente.

#### Scenario: Sin sesion no hay canal

- GIVEN una peticion SSE sin sesion
- WHEN se intenta conectar
- THEN el servidor rechaza la conexion

#### Scenario: El cliente no puede pedir el canal de otro municipio

- GIVEN un usuario de Motul que manipula la peticion pidiendo el canal de Ticul
- WHEN el servidor resuelve el canal
- THEN el canal es el de Motul, derivado de la sesion, no el pedido

### Requirement: Snapshot inicial y push posterior

La vista MUST renderizar en servidor un snapshot inicial. Las
actualizaciones posteriores MUST llegar por eventos SSE sobre el bus
LISTEN/NOTIFY, que MUST emitir una notificacion al confirmarse un cambio
relevante para la vista: reportes, intervenciones o estructura y punto de
calles.

### Requirement: Payload de eventos acotado

Cada evento MUST acotarse a identificar el recurso y el tipo de cambio.
MUST NOT transportar descripciones, referencias ni datos de otro tenant.
Los datos completos se leen bajo RLS.

### Requirement: Reconexion con resincronizacion

Ante reconexion o interrupcion, el cliente MUST volver a pedir el snapshot
y reconciliar. MUST NOT asumir que recibio todos los eventos intermedios.

#### Scenario: Un evento emitido durante la desconexion llega por snapshot

- GIVEN un cliente desconectado mientras se registra una intervencion
- WHEN se reconecta
- THEN la intervencion aparece por la resincronizacion del snapshot, no por el canal

### Requirement: Heartbeat y estado no vivo

El servidor MUST emitir un heartbeat periodico. Si el cliente no recibe
heartbeat dentro del umbral, MUST marcar la vista como desconectada y MUST
NOT presentar los datos como actualizados en vivo.

#### Scenario: Caida silenciosa del canal no pinta frescura falsa

- GIVEN un canal abierto cuyo servidor deja de emitir
- WHEN vence el umbral de heartbeat
- THEN la vista muestra estado de desconexion y deja de afirmar que esta al dia

### Requirement: Entrega multi-instancia sin promesa de exactamente-una-vez

Cada instancia MUST escuchar el bus LISTEN/NOTIFY de Postgres y reenviar a
sus conexiones. La entrega MUST NOT prometer exactamente-una-vez: la
resincronizacion por snapshot cubre los eventos perdidos.

### Requirement: Aislamiento por tenant en los eventos

Un evento originado en un ayuntamiento MUST NOT llegar a conexiones de
otro. El test de aislamiento MUST ejercitar el canal.

#### Scenario: Un cambio en Ticul no notifica a Motul

- GIVEN conexiones SSE abiertas para Motul y para Ticul
- WHEN se registra un reporte en Ticul
- THEN solo la conexion de Ticul recibe el evento

### Requirement: Refresh manual como respaldo

La vista MUST ofrecer un refresh manual explicito. Sin canal disponible,
el mapa MUST seguir renderizando el snapshot.

### Requirement: Sin polling como via de frescura

El sistema MUST NOT implementar polling como mecanismo de actualizacion de
la vista. La actualizacion en vivo es SSE; el refresh manual es respaldo
explicito del usuario.
