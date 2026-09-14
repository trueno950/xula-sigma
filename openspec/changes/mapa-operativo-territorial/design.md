# Diseño: Mapa operativo territorial

## Enfoque técnico

Tres módulos nuevos (`intervenciones`, `mapa-operativo`, `historial-de-calle`), deltas de `reportes`/`autorizacion-roles`, extensión de `territorio` (`eventos_de_calles` append-only + lecturas + publicación acotada) y frescura SSE sobre LISTEN/NOTIFY con snapshot server-rendered. U1/U2 ya aplicadas. Este diseño fija los límites de L0, U3a, U3b y la frontera con U7. Secuencia: L0 → U3a → U3b → U4 → U5/U6 → U7 → U8.

## Decisiones de arquitectura

| Decisión | Opciones | Elección |
|---|---|---|
| D1 Módulos | 3 módulos vs uno agregador | 3 módulos con puertos propios (antipatrón 8) |
| D2 Eventos | Tabla `eventos_de_calles` vs `bitacora` | Append-only en `territorio`: naturaleza cerrada y referencias; sin JSON, valores, nombres ni coordenadas (`jsonb` queda solo en `revisiones_de_intervenciones`, aplicado) |
| D3 Publicación | Trigger vs caso de uso | `pg_notify` dentro del `withTenant` de la mutación: entrega al COMMIT; revertida = no notifica |
| D4 LISTEN | Conexión propia (max 1) en `shared/tenancy` vs pool | U7: excepción 4 de regla 2 (actualiza `AGENTS.md`); hub perezoso |
| D5 Resync | `router.refresh()` vs estado en cliente | Sin estado duplicado; lecturas bajo RLS; reconexión = snapshot |
| D6 Payload | `{tipo, id, cambio}` acotado vs datos completos | Acotado; rehidratación bajo RLS; único fijado por delta: `{ tipo: "calle", id, cambio: "estructura" }` |
| D9 Filtros | GET nativo + filtrado servidor vs isla | Patrón `FiltrosDeReportes`; conteos y marcadores del mismo origen |

## Límites de unidades

| Unidad | Posee | No posee |
|---|---|---|
| L0 | `drizzle/meta/0014_snapshot.json` regenerado y validado | código, SQL nuevo, generación de 0015 |
| U3a | `eventos_de_calles` (esquema, migración 0015, RLS, GRANT S/I, FK compuesto), escritura en las cuatro mutaciones en el mismo tx, puertos `callesParaMapa`/`callePorId` | publicación, LISTEN, SSE, excepciones de tenancy |
| U3b | `pg_notify` transaccional, payload Zod exacto, `canalDeTenant` puro en `shared/notificaciones` | LISTEN, hub, ruta SSE, isla, `AGENTS.md` |
| U7 | hub, LISTEN (excepción 4), ruta SSE, isla, heartbeat, selección/consumo del canal en suscripción | redefinir el formato; consume `canalDeTenant` |

Formato canónico de canal: `xula_sse_<ayuntamientoId>`. `canalDeTenant` nace en U3b porque la publicación lo necesita; U7 lo consume sin redefinirlo.

## Flujo de datos

```
withTenant(tx) ── mutación calles ──► INSERT evento ──► pg_notify ──► COMMIT
agregarMapa ◄── puertos (RLS)      EstadoEnVivo ── EventSource /eventos ◄── hub (U7) ◄── NOTIFY
                                    └──────── router.refresh() ◄────────┘
```

## Reparación del linaje (L0)

`0014_snapshot.json` no existe en el repo ni en el historial git; `0014_revisiones_intervenciones.sql` y `_journal.json` sí, y el mantenedor atesta 0014 aplicada en todas las bases destino. Se regenera solo el snapshot:

1. Copia aislada del repo, fuera del worktree principal; truncar ahí `_journal.json` hasta `0013_intervenciones`. El esquema TS queda como está (incluye `revisionesDeIntervenciones`).
2. Base scratch local (`pnpm db:local`), migrar con el journal truncado → estado 0013.
3. `pnpm db:generate` (drizzle-kit 0.31.10 difiere contra la base) → `0014_<generado>.sql` + `meta/0014_snapshot.json`.
4. Validar: equivalencia estructural SQL generado vs autoral (RLS/política/GRANT son adiciones manuales que Drizzle no genera); con journal real + snapshot nuevo, migrar base fresca 0→14 y confirmar "No schema changes" al regenerar; aislamiento de `intervenciones` en verde.
5. Promover solo `meta/0014_snapshot.json`; `git diff` vacío en SQL y journal.

Excepción de tamaño: ~3,350–3,500 líneas generadas, excluidas del presupuesto autoral de revisión (golden). No autoriza ensanchar código ni SQL.

## Cambios de archivos

| Archivo | Acción | Qué |
|---|---|---|
| `drizzle/meta/0014_snapshot.json` | Crear (generado, L0) | Snapshot post-0014 |
| `drizzle/0014_revisiones_intervenciones.sql`, `drizzle/meta/_journal.json` | Sin cambios | Preservar byte a byte |
| `src/modules/territorio/infrastructure/esquema.ts` | Modificar | `eventos_de_calles` (id, ayuntamientoId, calleId, naturaleza, ocurridoEn) |
| `drizzle/0015_eventos_de_calles.sql` | Crear | RLS+FORCE+política+GRANT (S,I), FK compuesto, CHECK |
| `src/modules/territorio/{application,infrastructure}/**` | Modificar | Evento en las cuatro mutaciones (mismo tx); puertos de lectura |
| `src/shared/notificaciones/{canales,notificar}.ts` | Crear (U3b) | `canalDeTenant`; `publicarActualizacion` con `pg_notify` en el tx |
| `src/modules/reportes/**` | Modificar (U4) | `listarReportesParaMapa` (sin descripción/referencia), NOTIFY |
| `src/modules/historial-de-calle/**`, `mapa-operativo/**` | Crear (U5/U6) | Proyección compuesta; agregación/filtros/conteos |
| `src/shared/tenancy/notificacionesDeTenant.ts`, `hub.ts`, ruta SSE, `EstadoEnVivo` | Crear (U7) | Excepción 4; hub; guarda de sesión; heartbeat |
| `AGENTS.md` | Modificar (U7) | Regla 2: cuarta excepción |

## Contratos

```ts
type NaturalezaDeEvento = "ALTA" | "RENOMBRE" | "REPARENTEO" | "UBICACION";
type EventoEstructural = { id: string; ayuntamientoId: string; calleId: string;
  naturaleza: NaturalezaDeEvento; ocurridoEn: Date }; // sin JSON, valores, nombres ni coordenadas
type PayloadDeNotificacion = { tipo: "calle"; id: string; cambio: "estructura" };
const canalDeTenant = (id: AyuntamientoId): string => `xula_sse_${id}`;
```

## Propiedades de seguridad (tenant/RLS)

- Eventos: política por tenant + FORCE; GRANT solo SELECT/INSERT; FK compuesto `(calleId, ayuntamientoId)` rechaza calles ajenas.
- Todo dentro de `withTenant`; tenant del contexto servidor, nunca del cliente.
- `pg_notify` entrega al COMMIT: revertida no notifica. At-least-once, nunca exactly-once: el snapshot cubre pérdidas.
- U3a/U3b no abren excepción de tenancy; la excepción 4 es solo U7. Payload sin PII; recurso ajeno = 404.

## Estrategia de pruebas

| Capa | Qué |
|---|---|
| Dominio/U3a | Naturaleza cerrada; orden determinista de `callePorId`; cobertura sin punto/baja |
| Aislamiento/U3a | Cruce de tenants (0 filas), INSERT a calle ajena rechazado, UPDATE/DELETE rechazados, revertida sin evento |
| U3b (RED) | Payload exacto; canal derivado del tenant; revertida no entrega NOTIFY (LISTEN de prueba) |
| U7 (RED) | Sin sesión 401; canal del contexto; heartbeat; cierre → desconectada + resync |
| L0 | Evidencia de validación (pasos 4–5), no tests de aplicación |

## Matriz de amenazas

Git/shell/VCS: N/A. Ruta SSE (aplicable, U7): seguro = sesión exigida, canal del servidor, payload acotado, rehidratación RLS; fallo = stream cierra → desconexión visible + resincronización. RED: escenarios de `actualizacion-en-vivo`.

## Migración / rollback

- L0: borrar `0014_snapshot.json`; SQL y journal intactos.
- U3a: migración 0015 aditiva con `DROP` guardado; revertir migración y módulo.
- U3b: quitar `pg_notify`; eventos y lecturas siguen.
- U7: desmontar ruta/hub; el snapshot sigue renderizando.

## Riesgos de validación

- Idle-timeout del proxy de Railway en streams largos (heartbeat 15 s mitiga; validar). Mecánica multi-canal de `sql.listen` (validar; hub acota a 1/proceso).

## Preguntas abiertas

- [ ] ¿Filtro `area` (solo reportes) oculta intervenciones al activarse? Propuesto: sí, y los conteos lo reflejan.
- [ ] Payloads de `reporte`/`intervencion` (U4) sin fijar por delta: `sdd-tasks` los fija con RED contra `actualizacion-en-vivo`, sin inventar aceptación.
- [ ] Confirmar que `canalDeTenant` en U3b satisface "U7 posee selección/consumo canónica" (resuelto: U7 posee suscripción, no redefine el formato).
