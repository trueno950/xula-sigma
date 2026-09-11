# Diseño: Mapa operativo territorial

## Enfoque técnico

Tres módulos nuevos (`intervenciones`, `mapa-operativo`, `historial-de-calle`), deltas de `reportes`/`autorizacion-roles`, extensión de `territorio` (append-only `eventos_de_calles` + lecturas) y frescura SSE sobre LISTEN/NOTIFY con snapshot server-rendered y resync por `router.refresh()`. Todo bajo `withTenant`/RLS; sin dependencias nuevas.

## Decisiones de arquitectura

| Decisión | Opciones | Elección |
|---|---|---|
| D1 Módulos | 3 módulos vs uno agregador | 3 módulos con puertos propios (antipatrón 8) |
| D2 Eventos estructurales | Tabla `eventos_de_calles` vs `bitacora` (prohibida como contenido) | Append-only en `territorio`, escrita por renombrar/reparentear/ubicar/alta en la misma transacción |
| D3 Bus | `pg_notify` en la transacción vs trigger | Desde el caso de uso: se entrega al COMMIT; canal por tenant `xula_sse_<uuid>` |
| D4 LISTEN | Conexión propia (max 1) en `shared/tenancy` vs reusar pool | Excepción 4 de regla 2 (actualiza `AGENTS.md`); hub con LISTEN/UNLISTEN perezoso |
| D5 Resync | `router.refresh()` por evento vs estado en cliente | Sin estado duplicado; lecturas bajo RLS; reconexión = snapshot |
| D6 Payload | `{tipo, id, cambio}` Zod vs datos completos | Acotado; rehidratación bajo RLS |
| D7 Fecha de ocurrencia | `date` civil vs `timestamptz` | Civil (`z.iso.date()`); proyección a la línea con desempate determinista |
| D8 Revisiones | `jsonb valoresAnteriores` vs columnas explícitas | `jsonb` con esquema Zod; GRANT solo SELECT/INSERT |
| D9 Filtros | GET nativo + filtrado servidor vs filtrado en isla | Patrón `FiltrosDeReportes`; conteos y marcadores del mismo origen |

## Flujo de datos

```
Escritura: withTenant(tx) ── INSERT/UPDATE ──► bitacora ──► pg_notify ──► COMMIT
Mapa (RSC): agregarMapa ◄── puertos reportes/intervenciones/territorio (RLS)
            MapaOperativo(server) ── isla EstadoEnVivo ── EventSource /eventos
                  ▲                                            │
                  └──────── router.refresh() ◄── hub (1 LISTEN/proceso) ◄── NOTIFY
```

`agregarMapa`: marcadores (hechos con calle con punto), cobertura (hechos sin calle; calles sin punto con actividad), conteos — puros de dominio.

## Cambios de archivos

| Archivo | Acción | Qué |
|---|---|---|
| `src/modules/intervenciones/**` (4 capas) | Crear | Dominio cerrado, `transicionValida` pura, registrar/cambiar/corregir, repositorios SQL, UI, actions |
| `drizzle/0013_intervenciones.sql` | Crear | `intervenciones` + `revisiones_de_intervenciones`: RLS+FORCE+política+GRANT (S,I,U/S,I), FKs compuestos (patrón `0010`), CHECKs |
| `src/modules/mapa-operativo/**` | Crear | `agregarMapa`, filtros/conteos puros, adaptadores por barriles, mapa + isla |
| `src/modules/historial-de-calle/**` | Crear | Naturalezas, orden determinista, `lineaDeTiempoDeCalle`, adaptadores, UI |
| `src/modules/territorio/**` | Modificar | `eventos_de_calles` (`0014`), escrituras, lecturas `callesParaMapa`/`callePorId`, NOTIFY |
| `src/modules/reportes/**` | Modificar | `listarReportesParaMapa` (sin descripción/referencia), NOTIFY en registrar/cambiar/asignar |
| `src/shared/auth/roles.ts` | Modificar | `puedeAdministrarIntervenciones` |
| `src/shared/notificaciones/**` | Crear | `canales.ts`, `notificar.ts`, `hub.ts` |
| `src/shared/tenancy/notificacionesDeTenant.ts` | Crear | Excepción 4: cliente propio, rol verificado, escuchar/dejar |
| `src/shared/tenancy/withTenant.ts` | Modificar | Exportar `conRolVerificado` |
| `AGENTS.md` | Modificar | Regla 2: enumerar la cuarta excepción |
| `src/shared/ui/EstadoEnVivo.tsx` + `useEventosEnVivo.ts` | Crear | Isla: EventSource, watchdog de heartbeat, desconexión, actualizar |
| `src/app/(panel)/...` mapa, eventos (route SSE), historial/[id], intervenciones | Crear | Rutas finas; SSE con guarda de sesión, canal de `contextoActual` |
| `NavegacionDeModulos.tsx` | Modificar | Entradas Mapa e Intervenciones |

## Contratos

```ts
type EventoDeActualizacion = { tipo: "reporte"|"intervencion"|"calle";
  id: string; cambio: "alta"|"actualizacion"|"estructura" };
type EntradaDeLineaDeTiempo = { naturaleza: REPORTE|INTERVENCION|RENOMBRE|REPARENTEO|UBICACION;
  ocurrencia: Date; titulo: string; enlace: string };
```

## Estrategia de pruebas

| Capa | Qué |
|---|---|
| Dominio | `transicionValida`, orden con desempate, filtros/conteos, canal/payload |
| Aplicación | registrar (fecha civil ≠ captura), corregir deja revisión, 403/404 |
| Aislamiento | `intervenciones`, `revisiones`, `eventos_de_calles`, FK `reporteId`, canal SSE (Ticul no notifica a Motul) |
| SSE | Sin sesión = 401; canal ignora parámetro del cliente; heartbeat; reconexión → snapshot |

## Matriz de amenazas

Filas git/shell/VCS: **N/A** (sin automatización git ni clasificación de ejecutables). Límite aplicable: **ruta SSE** — seguro: sesión exigida, canal solo del servidor, payload acotado, rehidratación bajo RLS; fallo: stream cierra → desconexión visible + resincronización. RED: escenarios de `actualizacion-en-vivo`.

## Migración / rollback

Aditivo: `0013`/`0014` con `DROP TABLE` guardado; sin cambios destructivos a `reportes` ni `calles`; SSE desmontable por ruta (el snapshot sigue renderizando).

## Costuras de implementación

1. `intervenciones` dominio+RLS · 2. `intervenciones` aplicación+UI · 3. `territorio` (eventos, lecturas, NOTIFY) · 4. `reportes` (lectura operativa, NOTIFY) · 5. `historial-de-calle` · 6. `mapa-operativo` + SSE (excepción LISTEN, ruta, isla, AGENTS.md) · 7. navegación + e2e. Cada una cierra verde y revierte sola; 800 líneas exige PRs encadenados.

## Riesgos de validación (implementación, sin research)

- Conexiones e idle-timeout del proxy de Railway en streams largos (heartbeat 15 s mitiga; validar).
- Mecánica multi-canal de `sql.listen` (validar; hub acota a 1/proceso).
- At-least-once entre instancias: cubierto por resincronización.

## Preguntas abiertas

- [ ] **Bloqueante para tareas**: falta delta de spec de `territorio` (eventos estructurales + lecturas); `sdd-spec` debe agregarlo antes de `sdd-tasks`.
- [ ] ¿Filtro `area` (solo reportes) oculta intervenciones al activarse? Propuesto: sí, y los conteos lo reflejan.