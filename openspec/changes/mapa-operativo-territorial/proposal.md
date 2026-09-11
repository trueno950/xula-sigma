# Propuesta: Mapa operativo territorial

> Reemplaza la vertical pequeña recomendada en exploración. El primer release
> incluye mapa operativo, registro de intervenciones/obras, línea de tiempo de
> calle y actualización push. Cinco decisiones de producto confirmadas.

## Intención

La operación municipal no puede responder "¿dónde está el trabajo y qué se
está haciendo?" con listas: necesita un mapa autenticado de su ayuntamiento y
un registro de trabajo municipal —obra, repavimentación, mejora, fuga,
alumbrado, bache y afines— separado del reporte ciudadano, con la historia de
cada calle en una línea de tiempo diferenciada y actualización en tiempo real
por push, sin degradar a polling.

## Alcance

### Dentro
- Mapa operativo interno (`(panel)`), marcadores sobre el punto de calle
  existente, filtros por tipo/estado/área, conteos y enlace al detalle actual.
- Cobertura faltante declarada: calles sin punto y reportes sin calle visibles,
  nunca ocultados.
- Módulo `intervenciones`: catálogo cerrado de tipos y estados,
  `fechaDeOcurrencia` ≠ `capturadoEn`, vínculo opcional a un reporte,
  corrección append-only.
- `historial-de-calle`: línea de tiempo por calle que diferencia reportes,
  intervenciones y eventos estructurales (renombre, reparenteo, ubicación).
- Actualización push (decisión: SSE, abajo), snapshot inicial server-rendered
  y refresh manual como respaldo explícito.

### Fuera
- Ubicación exacta por reporte o intervención; domicilios en el mapa.
- Superficie pública del mapa (`consulta-publica-de-reportes` no cambia).
- Tabla genérica de eventos sin tipar; PostGIS, geocodificación, polilíneas.
- Evidencia fotográfica, costos, proveedores, cuadrillas (frontera del roadmap).
- Folio para intervenciones: el contador de folios sigue siendo de `reportes`.

## Capacidades

### Nuevas
- `mapa-operativo`: mapa interno por punto de calle, filtros, cobertura
  declarada, diferenciación reporte/intervención.
- `intervenciones`: dominio de trabajo municipal —tipos, estados, fechas,
  vínculo a reporte, corrección append-only.
- `historial-de-calle`: proyección compuesta de solo lectura; nunca `bitacora`
  ni `movimientos_de_reportes` presentados como historia de negocio.
- `actualizacion-en-vivo`: push SSE con aislamiento y autorización por tenant.

### Modificadas
- `reportes-ciudadanos`: lectura operativa por calle para el mapa.
- `autorizacion-roles`: regla `puedeAdministrarIntervenciones`
  (`ADMIN_MUNICIPAL` administra; registrar queda en `puedeEscribir`).

## Dirección de dominio

| Agregado | Rol | Fechas | Corrección |
|---|---|---|---|
| `reportes` | incidencia ciudadana, sin cambio | `registradoEn`/`actualizadoEn` | movimientos append-only |
| `intervenciones` (nuevo) | trabajo municipal planificado/ejecutado | `fechaDeOcurrencia` ≠ `capturadoEn` | revisión append-only |
| `historial-de-calle` | proyección compuesta | ordena por ocurrencia | nunca se edita |

- Tipos cerrados de intervención (unión Zod + CHECK, sin texto libre sensible):
  `OBRA`, `REPAVIMENTACION`, `MEJORA`, `FUGA`, `ALUMBRADO`, `BACHE`,
  `MANTENIMIENTO`. Estados: `PLANIFICADA`, `EN_EJECUCION`, `FINALIZADA`,
  `CANCELADA`. Descripción acotada con etiqueta, como `reportes`.

## Actualización push — decisión

**SSE (EventSource)** con **Postgres LISTEN/NOTIFY** como bus compartido:

| Criterio | SSE | WebSockets |
|---|---|---|
| Dirección | servidor→cliente (basta: escrituras van por Server Actions) | bidireccional, innecesaria |
| Next.js 16 / Railway | Route Handler + ReadableStream, sin dependencia ni servidor aparte | exige servidor WS propio o proveedor |
| Multi-instancia | fan-out por instancia vía LISTEN/NOTIFY en Postgres existente | capa de sesión compartida propia |
| Reconexión | nativa + heartbeat + re-fetch de snapshot | manual |
| Aislamiento | canal por `ayuntamientoId` resuelto en servidor, lecturas bajo RLS | igual, más superficie |

**Sin evidencia de implementación todavía** (carril de research deseleccionado
tras dos intentos `blocked`): límites de conexiones por instancia en Railway,
idle-timeout del proxy, carga de LISTEN/NOTIFY y política de tiles OSM. Se
validan en implementación; no se presume investigación externa.

## Arquitectura e invariantes

- `intervenciones` con sus cuatro capas; el mapa lee por puertos propios
  (antipatrón 8), nunca importando dominio ajeno.
- Tablas nuevas con `ayuntamiento_id`: RLS + política + GRANT + FK compuesto +
  test de aislamiento en el mismo commit (**invariante 1**).
- **Invariante 3**: categorías cerradas, sin texto libre sensible; logs por ID.
- **Invariante 5**: `bitacora` para registrar y corregir intervenciones.
- SSE autenticado por cookie de sesión; canal derivado del contexto servidor,
  nunca del cliente. UI: Server Components; isla `"use client"` solo para
  Leaflet (ya en dependencias) y el `EventSource`.

## Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| Fuga entre tenants por SSE | Baja | canal del contexto servidor + RLS + test de aislamiento |
| Punto de calle leído como exacto | Media | marcador "aproximado", cobertura visible |
| Uniones cerradas cambian tras release | Media | deltas de spec + CHECK + pruebas antes de tocar |
| Multi-instancia pierde eventos | Media | LISTEN/NOTIFY + snapshot al reconectar |
| Presupuesto de sesión (800 líneas) excedido | Alta | unidades de trabajo encadenadas (abajo) |

## Rollback

- Migraciones aditivas: reversión con migración `DROP` guardada; sin cambios
  destructivos a `reportes` ni `calles`.
- SSE desmontable por ruta: sin canal, el mapa sigue renderizando el snapshot.
- Reglas de autorización puras: revertir es un commit.

## Dependencias

Ninguna nueva: Leaflet 1.9 y Postgres existentes. Sin PostGIS.

## Criterios de éxito

- [ ] Operador ve reportes e intervenciones filtrados, con cobertura declarada.
- [ ] Intervención se registra con `fechaDeOcurrencia` distinta de captura y
      se corrige sin borrar historia.
- [ ] Línea de tiempo diferencia reportes, intervenciones y eventos
      estructurales.
- [ ] Un ayuntamiento no lee ni recibe eventos de otro (test de aislamiento).
- [ ] La actualización llega por push; caída del canal no muestra estado falso.
- [ ] `pnpm test` y `pnpm check` en verde, cobertura ≥ 80.

## Carga de revisión

El cambio excede una revisión única y probablemente el presupuesto de sesión:
la implementación DEBE dividirse en unidades de trabajo coherentes y
encadenables (p. ej. 1 `intervenciones` dominio+RLS, 2 mapa operativo,
3 `historial-de-calle`, 4 SSE), cada una con inicio, fin, verificación y
rollback propios. No se crean tareas en esta fase.
