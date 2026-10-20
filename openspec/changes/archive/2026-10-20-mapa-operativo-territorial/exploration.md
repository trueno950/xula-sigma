## Exploración: mapa operativo territorial

## Estado actual

El baseline está confirmado en el repositorio:

- `calles` tiene `latitud` y `longitud` opcionales, con validación de la caja de Yucatán, `CHECK` de par completo, aislamiento heredado por RLS y bitácora para ubicar una calle. El cambio también agregó reparenteo y baja lógica; una calle con reportes puede darse de baja mientras no tenga domicilios.
- La única experiencia cartográfica actual es el selector Leaflet/OSM dentro del formulario de ubicación de una calle. `/territorio` sigue siendo una navegación jerárquica server-rendered por lugares, calles y domicilios; no existe un mapa operativo ni una vista agregada de incidencias.
- `reportes` ya existe y modela incidencias con `lugarId` obligatorio, `calleId` opcional, descripción y referencia acotadas, tipo cerrado (`BACHE`, `ALUMBRADO`, `FUGA`, `BASURA`, `PARQUE`, `OTRO`), área responsable y estados (`RECIBIDO`, `EN_ATENCION`, `RESUELTO`, `RECHAZADO`). No guarda coordenadas propias.
- `movimientos_de_reportes` es un historial append-only de cambios de estado y asignaciones de área. `historialDeReporte` lo muestra por reporte. No es un historial de calle ni registra obras, repavimentaciones, mantenimiento o mejoras.
- `bitacora` es una traza transversal de auditoría con actor, momento, acción y solo IDs. No es una proyección de negocio apta para una línea de tiempo visible.
- La autorización vigente separa captura (`puedeEscribir`) de administración estructural: cambiar estado o asignar área de un reporte, y modificar el catálogo territorial, requieren `ADMIN_MUNICIPAL`. Solo existen los cuatro roles actuales.
- Las consultas operativas deben pasar por `withTenant`; las tablas nuevas con `ayuntamiento_id` requieren `FORCE ROW LEVEL SECURITY`, política, `GRANT`, FK compuesto y prueba de aislamiento.
- El producto prioriza Server Components, formularios nativos, degradación ante red rural inestable y ausencia de estado de servidor en el cliente. Leaflet ya es una dependencia existente; no hay evidencia para introducir PostGIS, polilíneas, geocodificación o un canal push.

## Áreas afectadas

- `src/app/(panel)/territorio/page.tsx`, `VistaDeLugar.tsx`, `parametros.ts` y `src/modules/territorio/ui/*` — integrar una entrada de mapa sin romper la navegación jerárquica existente y reutilizar el selector Leaflet como precedente, no como mapa operativo ya construido.
- `src/modules/territorio/application/puertos.ts`, `composicion.ts`, `infrastructure/esquema.ts` y `lectorDeUbicacionesSql.ts` — exponer lecturas de calles y coordenadas sin importar infraestructura de `territorio` desde otros módulos.
- `src/modules/reportes/domain/*`, `application/{listarReportes,puertos,puertosDeLectura}`, `infrastructure/{reportes,listadoDeReportesSql,similaresDeReportesSql}` y `ui/*` — reutilizar tipos, estados, filtros, folios y enlaces a detalle; probablemente agregar una lectura operativa por calle en vez de duplicar reportes.
- `src/modules/reportes/application/{historialDeReporte,puertosDeMovimientos}` y `infrastructure/registroDeMovimientosSql.ts` — sirven para el historial de cada reporte, pero no deben presentarse como historial completo de una calle.
- `src/shared/tenancy/{withTenant,bitacora}.ts` y `src/shared/auth/roles.ts` — límites obligatorios para lecturas, escrituras y nuevas trazas; cualquier nuevo permiso requiere una decisión explícita y prueba por rol.
- `drizzle/0010_reportes.sql`, `0011_calles_coordenadas.sql`, `0012_calles_nombre_activo.sql` y futuras migraciones — solo serían necesarias si se agrega un modelo de intervenciones/eventos o coordenadas propias del reporte.
- `openspec/specs/georreferenciacion-de-calles/spec.md`, `reportes-ciudadanos/spec.md`, `jerarquia-territorial/spec.md` y `autorizacion-roles/spec.md` — deben recibir deltas coherentes si cambia el contrato de ubicación, estados, autorización o visibilidad.
- `ROADMAP.md`, `PRODUCT.md`, `DESIGN.md` y `docs/architecture/invariantes-criticos.md` — fijan el contexto: expansión operativa por áreas, red rural, mapa territorial como dato de soporte y aislamiento como riesgo terminal.

## Capacidades separadas

### Primera vertical valiosa: mapa operativo interno de reportes existentes

La primera entrega debería responder: “¿Dónde están los reportes abiertos y qué atención necesitan?” sin crear todavía un sistema general de obras. Debe incluir, como mínimo:

- mapa interno autenticado, con los reportes agrupados o colocados sobre el punto de su calle cuando exista coordenada;
- filtros por estado, tipo y área, con conteos por marcador o calle y enlace al detalle actual del reporte;
- indicación explícita de reportes sin calle o de calles sin punto, para no presentar una cobertura falsa;
- lectura de ubicación vigente y respeto a calles dadas de baja, sin borrar ni reubicar históricamente sus reportes;
- actualización manual y, si el producto confirma que se necesita “casi en tiempo real”, polling de baja frecuencia con una tolerancia de obsolescencia explícita. No requiere WebSockets.

Esto reutiliza `reportes`, `calles` y sus contratos de tenant. El dato mostrado sería aproximado a nivel de calle, no la ubicación exacta del incidente.

### Capacidades posteriores

1. **Historial operativo de una calle.** Modelo propio, append-only, para obras, mantenimiento, repavimentación, mejoras y otros eventos municipales; puede referenciar reportes, pero no debe convertir `bitacora` ni `movimientos_de_reportes` en una tabla de negocio.
2. **Registro formal de intervenciones.** Si una intervención necesita planificación, cuadrilla, fechas, evidencia, responsables o estado propio, debe separarse del reporte ciudadano y del catálogo de calles.
3. **Tiempo real fuerte.** SSE, WebSockets o un broker solo después de medir necesidad de concurrencia y latencia. El mapa actual no tiene una fuente de eventos ni una topología multiinstancia que justifique esa complejidad.
4. **GIS avanzado.** Coordenadas propias por incidencia, polilíneas, capas, geocodificación, PostGIS y mapa público son cambios independientes, con decisiones de privacidad, precisión y costo de tiles.

## Enfoques

1. **Mapa de reportes por punto de calle con polling acotado** — Server Component para la consulta inicial y una isla mínima para la interacción cartográfica; reutiliza los reportes y coloca cada incidencia en la coordenada de su calle.
   - Pros: menor migración; reutiliza categorías, estados, permisos, RLS, historial de reporte y enlaces existentes; entrega valor operativo rápido; polling de 30–60 segundos o refresh explícito es comprensible y resistente en Railway y redes rurales.
   - Contras: la ubicación es aproximada; reportes sin calle/coordenada quedan fuera del mapa; el polling genera lecturas repetidas y no garantiza actualización instantánea.
   - Esfuerzo: Medio.

2. **Mapa más modelo nuevo de eventos/intervenciones desde el inicio** — incorporar una entidad de eventos de calle que cubra reportes, obras y mejoras, con línea de tiempo y mapa en una sola entrega.
   - Pros: semántica completa para la historia de una calle; permite representar trabajo municipal que no nace de un reporte.
   - Contras: exige resolver de una vez categorías, estados, fechas de evento frente a fecha de registro, referencias, permisos, visibilidad, exportación, RLS y migración; mezcla dos productos distintos y probablemente supera el presupuesto de 800 líneas.
   - Esfuerzo: Alto.

3. **Mapa con actualizaciones push y GIS** — usar SSE/WebSockets y ampliar la geometría más allá del punto aproximado de la calle.
   - Pros: menor latencia percibida y precisión futura.
   - Contras: no existe evidencia de volumen o latencia que lo justifique; agrega conexiones de larga duración, sincronización entre instancias, reconexión, autorización de canales, dependencia operativa y una decisión de proveedor de mapas; resuelve problemas posteriores antes de validar el flujo básico.
   - Esfuerzo: Alto.

## Recomendación

Avanzar a propuesta con el enfoque 1, limitado a un **mapa operativo interno de reportes ciudadanos existentes**, sin tabla nueva y sin prometer precisión de domicilio. La primera versión debe hacer visible el estado de atención por calle, declarar los faltantes de georreferenciación y conservar el modelo actual de reportes; la actualización pragmática debe ser refresh explícito y, solo si se exige una sensación de actualidad continua, polling de baja frecuencia. La semántica de “obra”, “repavimentación”, “mejora” e intervención debe quedar fuera de esta primera vertical y entrar en un cambio propio después de cerrar sus decisiones de dominio.

## Decisiones de producto pendientes para la propuesta

- Si `REPAVIMENTACION`, `OBRA` o `MEJORA` son tipos de reporte ciudadano o eventos de trabajo municipal separados. Reutilizar `OTRO` como solución permanente ocultaría categorías operativas importantes.
- Cuál es la granularidad de ubicación aceptable: punto aproximado de calle, punto capturado por reporte, o ambas con reglas de privacidad y precisión.
- Qué significa “casi en tiempo real”: refresh manual, polling de 30–60 segundos, o una latencia menor; también el límite de carga aceptable por municipio.
- Qué reportes aparecen en el mapa: solo abiertos, todos con filtro, reportes de calles activas y dadas de baja, y cómo se contabilizan los que solo tienen lugar.
- Qué debe significar la historia de una calle: solo eventos municipales, reportes y sus movimientos, cambios de nombre/reparentamiento, o una línea de tiempo compuesta con tipos claramente diferenciados.
- Para una futura intervención: catálogo cerrado de tipos, estados (`PLANIFICADA`, `EN_EJECUCION`, `FINALIZADA`, `CANCELADA` u otros), fecha del hecho frente a fecha de captura, vínculo opcional a reportes y política de corrección append-only.
- Quién puede capturar y cerrar trabajo municipal bajo los cuatro roles existentes; no asumir que `ADMIN_MUNICIPAL` es el único actor operativo sin validarlo con el piloto.
- Alcance de visibilidad: inicialmente interno; cualquier superficie pública debe excluir descripciones, referencias, reportantes y ubicación detallada, siguiendo la consulta pública actual.
- Si los eventos de obra requieren evidencia fotográfica, proveedores, costos o permisos. Esos datos podrían cruzar los límites del roadmap y no deben entrar implícitamente en el mapa.

## Riesgos

- Una coordenada por calle no identifica el punto del bache, fuga o luminaria; presentar el marcador como exacto puede inducir decisiones operativas equivocadas.
- La ubicación del reporte es opcional a nivel de calle y las coordenadas son opcionales a nivel de calle; el mapa debe mostrar cobertura incompleta, no ocultarla.
- Agregar una tabla de eventos sin cerrar su semántica produciría una segunda bitácora difícil de corregir y posiblemente datos sensibles en texto libre.
- El mapa consulta datos de varios módulos; cualquier adaptador debe respetar los puertos y `withTenant`, y una tabla nueva requerirá RLS, `GRANT`, FKs compuestos y aislamiento en el mismo cambio.
- El estado actual de reportes tiene terminales sin reapertura; reutilizarlo para intervenciones puede impedir representar suspensión, cancelación o reapertura de una obra.
- Polling frecuente puede cargar Postgres y OSM; WebSockets/SSE añaden complejidad operativa sin evidencia actual de necesidad.
- Las categorías y estados visibles son uniones cerradas; cambiar sus valores requiere deltas de spec, checks SQL, UI, migración y pruebas de regresión.
- El presupuesto de revisión de 800 líneas es compatible con el primer mapa si se evita una entidad nueva, pero es de riesgo alto para mapa, historial de calle, intervenciones y tiempo real en una sola entrega.

## Listo para propuesta

Sí. La propuesta debería seleccionar explícitamente la primera vertical recomendada, tratar la historia de calle e intervenciones como cambios posteriores y registrar las decisiones pendientes como supuestos verificables con el municipio piloto. No se recomienda lanzar todavía diseño o implementación de WebSockets, PostGIS ni una tabla genérica de eventos.
