# Reportes vinculados a domicilios

T6a conserva el domicilio elegido como vínculo vivo, no como copia de texto. El reporte guarda el `domicilioId`; el número sigue siendo parte del domicilio registrado en Territorio. Los reportes de incidentes en vía pública pueden seguir guardando únicamente lugar y calle.

## Contrato para T6b

| Caso | Datos de ubicación al registrar |
|---|---|
| Dirección registrada | `domicilioId` UUID. `lugarId` y `calleId` pueden omitirse: el servidor los deriva del domicilio. Si llegan, ambos deben coincidir con el registro autoritativo. |
| Vía pública | `lugarId` obligatorio, `calleId` opcional y sin `domicilioId`. |

`ayuntamientoId` nunca forma parte de estos datos: se obtiene del `ContextoActual` autenticado. `ReporteGuardado` devuelve `domicilioId` como vínculo opcional; para mostrar el número, la interfaz consulta el domicilio con la API pública tenant-scoped de Territorio. No se duplica el número en `reportes`.

## Validación y escritura

1. El puerto de Reportes delega la lectura a `territorio.domicilioPorId`, que aplica el tenant del servidor y solo encuentra domicilios activos.
2. Un domicilio inexistente, ajeno o dado de baja produce `NoEncontradoError`. Lugar y calle se derivan del domicilio; una ubicación suministrada por el cliente que no coincide produce `UbicacionInvalidaError`.
3. La ubicación derivada se valida también con Territorio. Solo después se valida el reportante y se abre la transacción que asigna el folio, guarda el reporte, agrega el movimiento y registra la auditoría.

Por eso una dirección rechazada no crea reporte, no consume folio y no deja movimiento ni auditoría. El FK compuesto `reportes_domicilio_tenant_fk` es una segunda barrera de persistencia para `(domicilio_id, ayuntamiento_id)`.

## Persistencia y alcance

- `reportes.domicilio_id` admite `NULL`; las filas existentes permanecen sin vínculo y no se backfillean.
- El FK compuesto apunta a `domicilios(id, ayuntamiento_id)`. Como `domicilios` pertenece a Territorio, el FK se conserva en la migración SQL y no importa su objeto de esquema al módulo Reportes.
- El vínculo es vivo: una corrección del domicilio se refleja al consultarlo; no se congela una copia ni se altera el ciclo de vida del domicilio.
- T6a no agrega selector, cambia pantallas, exportaciones ni consulta pública. T6b puede conectar el formulario nativo a este contrato; T7 permanece fuera de alcance.
