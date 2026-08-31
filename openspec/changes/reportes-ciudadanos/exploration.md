# Exploración: Fase 3 — Reportes ciudadanos

**Alcance investigado**: `ROADMAP.md` líneas 212–226. Módulo ya nombrado en
`docs/architecture/estructura.md:38` (`reportes/ Reportes ciudadanos`) y
reservado en `commitlint.config.mjs` (`scope-enum` ya incluye `"reportes"`).
`src/modules/reportes/` **no existe todavía** — módulo nuevo desde cero.

Precedente arquitectónico más fresco: `constancias` (Fase 2, implementada y
archivada en `openspec/changes/archive/2026-08-30-constancias-oficios/`).
Leí su código real, no solo su exploración archivada: `constancias` ya tiene
folio con lock por tenant, validación pública sin sesión, rate limiting
reusado, y bitácora — los cuatro mecanismos que Fase 3 va a necesitar de
nuevo. Es un molde probado, no solo un diseño en papel.

## 1. Nombre del módulo y scope de commit

**No es pregunta abierta — ya está decidido en dos lugares.**
`docs/architecture/estructura.md:38` lista `reportes/` explícitamente como
"Reportes ciudadanos", y `commitlint.config.mjs:19` ya trae `"reportes"` en
`scope-enum`. El módulo se llama `reportes`, sin ambigüedad.

## 2. Folio de reporte y contador por tenant

`constancias` ya resolvió — con código real, no solo diseño — la pregunta
que la exploración de Fase 2 dejó abierta: contador por `(ayuntamientoId,
tipo, año)` en tabla propia (`foliosDeDocumentos`,
`src/modules/constancias/infrastructure/esquema.ts:171-188`), con PK
compuesta como identidad (sin `id` sustituto, "un uuid encima permitiría dos
filas para la misma serie") y `check` de consecutivo positivo. El mecanismo
de lock elegido y funcionando es `UPDATE ... RETURNING` dentro de la misma
transacción que el `INSERT` del documento — la opción (a) que la
exploración de `constancias-oficios` dejó como recomendación sin decidir,
ahora confirmada por `folio.integration.test.ts` existente.

**Consecuencia para `reportes`**: no hay que re-decidir el mecanismo, solo
reusar el patrón con tabla propia (`folios_de_reportes` o similar,
`reportes` no puede referenciar `folios_de_documentos` de `constancias` —
cero acoplamiento entre módulos, `module-template.md` "Antipatrones").

**Pregunta real que sí queda abierta**: ¿el contador de reporte es uno por
ayuntamiento a secas, o uno por `(ayuntamiento, tipo de incidencia)` como
`constancias` lo hizo por tipo de documento? El roadmap no lo dice. Dado que
"clasificación por dirección o área responsable" ya funciona como filtro/
routing del reporte, un folio único simple (`REP-2026-000123`) sin
segmentar por tipo de incidencia probablemente alcanza — la clasificación
vive en un campo, no en la serie del folio — pero es decisión de
`sdd-propose`, no algo que esta exploración deba fijar.

## 3. Consulta pública de folio de reporte — reusar `validarFolio` como molde exacto

Encontré el precedente completo y funcionando, no solo el diseño:

- Caso de uso público sin `ContextoActual`:
  `src/modules/constancias/application/validarFolio.ts:47-59`. Firma nueva
  `(ayuntamientoId, folio, ...) => withTenant(ayuntamientoId, ...)`, sin
  `usuario` ni `origen` — la primera vez que el repo necesitó esta forma,
  ahora es la segunda vez que la necesitaría (`reportes`), lo cual la
  confirma como patrón, no como excepción.
- Ruta pública fuera de `(panel)` y `(acceso)`:
  `src/app/validar/[folio]/page.tsx`. Resuelve tenant por
  `ayuntamientoActual()` (sin sesión), corta con `notFound()` si
  `CABECERA_SUPERFICIE !== "ayuntamiento"`, y **siempre responde 200** para
  los casos negativos — nunca 404 real, para no reconstruir el oráculo que
  el estado cerrado de la respuesta existe para cerrar.
- Rate limiting: `limitarRitmo(ayuntamientoId, [{ tipo: "folio", valor: ip
  }])` — la IP es la única clave, nunca el folio (recorrer la serie
  completa saldría gratis con el folio como clave).
- `docs/05-seguridad.md:259-268` (§10) es explícito y no es una sugerencia
  mía: **"login, validación pública de folio, alta de reportes ciudadanos
  desde el portal"** son las tres superficies con rate limiting
  obligatorio. La redacción genérica "validación pública de folio" (no dice
  "de constancias") ya anticipa que `reportes` va a tener su propia
  pantalla pública equivalente, y la doc ya la nombra por separado de la
  consulta ("alta... desde el portal" es un tercer punto, no el mismo).

**Pregunta real abierta**: `TipoIntento` es una unión cerrada de tres
valores — `["correo", "ip", "folio"]`
(`src/shared/auth/intentosAcceso.ts:22`). Para la consulta pública de folio
de reporte, ¿se reusa el valor `"folio"` existente (comparte ventana con la
validación de constancias, mismo perfil de abuso: raspar una serie
enumerable) o se agrega un cuarto valor (`"reporte"`) con su propio límite?
Reusar `"folio"` es el cambio de menor superficie (cero migración de tipo
nuevo) pero mezcla dos series de folio con formatos y volúmenes distintos
bajo la misma ventana de 30/15min; agregar un valor nuevo es exactamente el
cambio de una línea que `constancias` ya hizo para agregar `"folio"` sobre
`["correo", "ip"]` — even mismo costo, más aislado. Con **dos** consumidores
del mismo valor tras `reportes`, `"folio"` se volvería ambiguo sobre a qué
sirve. Inclinación: agregar `"reporte"` como cuarto valor, pero es decisión
de `sdd-design`, no verificada contra ningún documento que la resuelva de
antemano.

**Pregunta separada, con mecanismo pero sin decisión de UI**: "alta de
reportes ciudadanos desde el portal" (segunda superficie citada por
`docs/05-seguridad.md` §10) necesita su propia ventana de rate limiting —
mismo `limitarRitmo`, otro `tipo` (`"reporte-alta"` o similar), IP como
clave (no hay folio todavía en el momento de crear). No hay precedente de
"alta pública sin sesión" en el repo — `constancias` solo tiene *consulta*
pública, nunca *escritura* pública. Es la primera vez que el sistema
necesita un caso de uso de escritura invocable sin `ContextoActual`. Vale
la pena que `sdd-design` lo declare explícito, mismo criterio que
`validarFolio` se declaró explícito en su momento.

## 4. Clasificación por dirección o área responsable

**Dirección — hay precedente directo y reusable, con una distinción
importante.** `territorio` ya expone `componerDireccion`
(`src/modules/territorio/domain/direccion.ts:47-67`) y
`direccionVigenteDePersona` (usado por
`src/modules/constancias/infrastructure/lectorDeDireccionesPorTerritorio.ts`),
pero **ese flujo cuelga de una persona con residencia registrada**
(`domicilios` vía `residencias`). Un reporte de bache o fuga no
necesariamente tiene una persona con domicilio dado de alta — es una
ubicación en espacio público, no el domicilio de un vecino. Lo que sí
aplica directo es la jerarquía de `lugares`
(`src/modules/territorio/domain/tipoDeLugar.ts`: `cabecera`, `comisaria`,
`colonia`, `sector`, `manzana`, con `LugarId` ya exportado por el barrel de
`territorio`) y el catálogo de `calles`. El puerto
`RepositorioDeLugares.subarbol` (`territorio/application/puertos.ts:89-93`)
ya sirve para listar lugares en un selector.

**Consecuencia**: `reportes` probablemente necesita su propio puerto de
lectura (`LecturaDeLugares` o similar, mismo patrón exacto que
`lectorDeDireccionesPorTerritorio.ts` / `lectorDeTitularesPorPadron.ts`:
puerto en `application/puertosDeLectura.ts`, adaptador en
`infrastructure/` que importa el barrel de `territorio` y abre su propio
`withTenant`), pidiendo `lugarId` + opcionalmente `calleId`/entre-calles —
sin domicilio ni residencia, porque un bache no vive en un domicilio.
Componer el texto de dirección para mostrar el reporte puede reusar
`componerDireccion` si `reportes` arma las `PartesDeDireccion` a mano
(`calle`, `numero: null`, `ancestros` desde `subarbol`), pero eso no está
verificado contra ningún caso de uso existente — es una lectura de la forma
del puerto, no un hecho confirmado por un test.

**Área responsable — sin precedente en el repo, pregunta real y abierta.**
Grep sobre `docs/` y `src/` no encontró ningún catálogo de
departamentos/direcciones municipales ("alumbrado público", "obras
públicas", "limpia", "agua potable") en ningún módulo existente —
`operacion` (Fase 5, flotilla/permisos) tampoco está construido todavía, así
que no hay ni siquiera un precedente de "unidad administrativa" en otro
módulo para copiar. Dos caminos reales:

a. **Catálogo fijo** (unión cerrada tipo `TIPOS_DE_LUGAR` o
   `MOTIVOS_DE_CANCELACION`): simple, sin tabla nueva, consistente con el
   patrón de categorías cerradas que `AGENTS.md`/`CLAUDE.md` ya exige para
   datos sensibles — aunque acá no es dato sensible, es la misma economía de
   "unión cerrada en vez de tabla de catálogo" que el repo prefiere cuando
   el conjunto es estable y compartido entre tenants (ver `TIPOS_DE_LUGAR`,
   `MOTIVOS_DE_REIMPRESION`).
b. **Catálogo configurable por ayuntamiento** (tabla con `ayuntamientoId` +
   RLS, mismo régimen que cualquier tabla operativa): más flexible —cada
   municipio nombra sus áreas distinto ("Obras Públicas" vs "Servicios
   Municipales")— pero es una tabla nueva con su test de aislamiento
   obligatorio, y el roadmap no pide explícitamente que sea configurable
   (solo dice "por dirección o área responsable", sin calificar
   "configurable" como sí lo hace para plantillas en Fase 2).

El roadmap enumera categorías de incidencia concretas ("baches, alumbrado,
fugas, basura, parques") que ya insinúan un mapeo natural 1:1 o N:1 hacia
áreas típicas de un ayuntamiento pequeño (obras públicas, alumbrado,
agua/drenaje, limpia, parques y jardines) — un conjunto pequeño y estable
que encaja con el criterio (a). Pero un municipio de Yucatán puede fusionar
o dividir esas áreas distinto al piloto (ninguna evidencia lo confirma ni
lo descarta), y no hay insumo declarado tipo "constancia real del municipio
piloto" (como sí lo pidió Fase 2) que ancle esta decisión a un caso real.
**Decisión real de producto para `sdd-propose`, sin evidencia que la
resuelva de antemano.**

## 5. Vínculo con el padrón: quién reportó

`Persona` (`src/modules/padron/domain/persona.ts:24-30`) exige `nombres` +
`primerApellido`; `curp` es opcional. El patrón de puerto cruzado ya
existe y es directo de copiar:
`src/modules/constancias/infrastructure/lectorDeTitularesPorPadron.ts`
importa el barrel de `padron` (`personaPorId`, `comoPersonaId`), abre su
propio `withTenant`, y traduce a un tipo propio del módulo consumidor.

**Pregunta real, no resuelta por ningún documento leído**: ¿el reporte
exige una persona ya dada de alta en el padrón (obligando a registrar al
ciudadano antes de tomar su reporte, aunque sea un vecino que llama por
teléfono una sola vez), o el vínculo es opcional/mejor-esfuerzo (el reporte
guarda nombre y contacto sueltos, y el vínculo a una `Persona` del padrón es
un enlace posterior, no una condición de alta)? El roadmap dice "vínculo
con el padrón: quién reportó, historial del reporte" — lee más a "se puede
saber quién fue" que a "el reportante tiene que preexistir en el padrón".
Forzar alta previa en el padrón por cada llamada telefónica de un reporte
de bache es fricción operativa real (mismo tipo de fricción que
`puedeAdministrarDocumentos` documentó como "supuesto declarado,
reversible" para no trabar el mostrador). Ninguna doc leída (roadmap,
invariantes, ADR 0001) lo resuelve — decisión real de `sdd-propose`.

Precedente reusable si se decide vincular: patrón exacto de
`lectorDeTitularesPorPadron.ts`. Si se decide opcional: `personaId` nullable
en el esquema de `reportes`, mismo criterio que `domicilios` acepta
`entreCalleA`/`entreCalleB` nullable para una comisaría rural
(`territorio/domain/direccion.ts:1-22`, "nullable a propósito").

## 6. Roles: quién cambia estado / asigna

`openspec/specs/autorizacion-roles/spec.md` no tiene ningún escenario para
`reportes` todavía — es superficie completamente nueva para esa spec. El
patrón ya establecido dos veces (`puedeAdministrarTerritorio`,
`puedeAdministrarDocumentos`, ambos en `src/shared/auth/roles.ts:96-113`)
distingue "mostrador" (`puedeEscribir`, cualquier rol salvo `CONSULTA`) de
"estructural" (`ADMIN_MUNICIPAL` únicamente). Aplicado a `reportes`:

- **Registrar un reporte, clasificarlo, cambiar de estado dentro del flujo
  normal** (abierto → en atención → resuelto): lee como "mostrador" — el
  mismo criterio que emitir/reimprimir una constancia. `puedeEscribir`
  probablemente alcanza.
- **Asignar a un área responsable o reasignar** y **cerrar/rechazar un
  reporte de forma definitiva**: son las candidatas a regla restringida
  (`puedeAdministrarReportes` o similar, solo `ADMIN_MUNICIPAL`), por
  paralelismo con "cancelar una constancia" (irreversible, más peso que
  "capturar un dato") — pero **ningún documento leído lo decide**, es
  exactamente el mismo tipo de pregunta abierta que `constancias` dejó
  para cancelación en su propia exploración, y ahí terminó resuelta
  restringida (`puedeAdministrarDocumentos`, confirmado en el spec ya
  mergeado). Ese precedente pesa a favor de restringir asignación/cierre,
  no de decidirlo.

## 7. WhatsApp — confirmado fuera de alcance

`ROADMAP.md:222-225` es explícito: "Notificación por WhatsApp queda como
evaluación posterior: la API de WhatsApp Business tiene costo por
conversación y requiere número y verificación propios del ayuntamiento. No
se promete en la venta hasta tener el costo real medido." No hay ningún
precedente de integración de mensajería en el repo (grep sin resultados
sobre `whatsapp|twilio|meta.*business` en `src/`). Esta exploración no lo
analiza más allá de anotar que queda diferido — cualquier notificación en
el alcance de esta fase, si el roadmap la implica indirectamente ("registro
histórico" sugiere que el ciudadano puede querer enterarse del cambio de
estado), tendría que resolverse sin WhatsApp: por ejemplo el mismo folio +
consulta pública ya cubre "enterarse", sin canal push.

## 8. Historial del reporte — bitácora ya es el mecanismo

Mismo hallazgo que la exploración de `constancias-oficios` hizo para
reimpresión/cancelación: `registrar()`
(`src/shared/tenancy/bitacora.ts:24-57`) es de solo-agregado, `accion:
string` libre (no unión cerrada en TypeScript), y ya es el mecanismo de
"append-only, actor + momento + entidad" que "historial del reporte" pide.
Con `reportes` sería el **tercer** consumidor documentado del mismo
patrón (constancias ya lo usa dos veces: emisión y reimpresión/cancelación)
— confirma que es una abstracción que ya se pagó, no una nueva.

## Affected Areas

- `src/modules/reportes/` — módulo nuevo completo, cuatro capas
  (`domain/application/infrastructure/ui`), no existe hoy.
- `src/shared/auth/intentosAcceso.ts:22` — `TIPOS_INTENTO` cerrado, posible
  cuarto valor si se decide no reusar `"folio"`.
- `src/shared/auth/roles.ts` — posible regla nueva
  `puedeAdministrarReportes` si asignar/cerrar se restringe a
  `ADMIN_MUNICIPAL`.
- `openspec/specs/autorizacion-roles/spec.md` — requiere nuevos
  Requirements/Scenarios para `reportes` (hoy no tiene ninguno).
- `src/modules/territorio/application/puertos.ts` — posible consumidor
  nuevo de `RepositorioDeLugares.subarbol`/`LugarId` vía puerto propio de
  `reportes`, sin tocar el archivo, solo importando el barrel.
- `src/modules/padron/` — posible consumidor nuevo vía puerto propio de
  `reportes`, mismo criterio, sin tocar el módulo.
- `src/app/` — ruta pública nueva fuera de `(panel)`/`(acceso)`, análoga a
  `src/app/validar/[folio]/page.tsx`, más una ruta de alta pública (primera
  escritura sin sesión del repo).
- `docs/05-seguridad.md` §10 — ya cubre esta fase, no necesita edición,
  pero confirma los dos puntos de rate limiting obligatorio.

## Approaches

### A. Catálogo de "área responsable"

| Opción | Pros | Cons | Esfuerzo |
|---|---|---|---|
| Unión cerrada en dominio (fija, compartida entre tenants) | Sin tabla ni RLS ni migración nueva; consistente con `TIPOS_DE_LUGAR`/`MOTIVOS_DE_*` | Todo ayuntamiento usa las mismas etiquetas; cambiarlas después es release, no configuración | Bajo |
| Tabla `areas_responsables` por ayuntamiento con RLS | Cada municipio nombra sus áreas; alta/baja sin release | Tabla nueva obligatoria con test de aislamiento; abstracción no pedida explícitamente por el roadmap (que sí la pidió para plantillas en Fase 2 y acá no la pide igual de explícito) | Medio |

### B. Cuarto valor de `TipoIntento` para consulta pública de folio de reporte

| Opción | Pros | Cons | Esfuerzo |
|---|---|---|---|
| Reusar `"folio"` existente | Cero cambio de tipo, mínima superficie | Mezcla dos series de folio con volumen/formato distinto bajo una sola ventana; ambiguo con dos consumidores | Bajo |
| Agregar `"reporte"` nuevo | Ventana propia, mismo costo que cuando `constancias` agregó `"folio"` sobre `["correo","ip"]` | Un valor más en la unión, una migración de esquema (`CHECK` del enum) | Bajo |

### C. Vínculo obligatorio vs. opcional con el padrón

| Opción | Pros | Cons | Esfuerzo |
|---|---|---|---|
| Persona del padrón obligatoria | Historial completo, "quién reportó" siempre resoluble a una identidad | Fricción operativa real para un reporte telefónico de un vecino no registrado | Medio (exige flujo de alta rápida de persona desde `reportes`) |
| Vínculo opcional (`personaId` nullable) | Sin fricción para reportar; mismo patrón que `entreCalleA`/`entreCalleB` nullable en `territorio` | "Historial del reporte" queda parcial si nunca se vincula; requiere decidir qué datos sueltos de contacto sí se guardan y con qué protección | Bajo–Medio |

## Recommendation

Ninguna de las tres decisiones anteriores tiene evidencia suficiente en el
repo para cerrarse en esta fase de exploración — son decisiones de
producto/alcance, no de viabilidad técnica. La arquitectura subyacente
(capas, tenancy, folio-bajo-lock, puerto de lectura entre módulos,
bitácora, rate limiting) **no es una pregunta abierta**: ya está resuelta
por precedente directo y funcionando en `constancias`, y `reportes` puede
copiar el molde sin reinventar el mecanismo. Recomiendo que `sdd-propose`
entre con el molde arquitectónico ya dado por sentado y gaste su esfuerzo
real en las tres decisiones de producto (área responsable, cuarto tipo de
intento, vínculo con padrón) más la regla de autorización de
asignación/cierre — con inclinación documentada arriba pero sin decidir
por adelantado.

## Risks

- **Riesgo de alcance**: sin fijar la pregunta del catálogo de "área
  responsable" (fijo vs. configurable), el esquema de `reportes` puede
  rehacerse a mitad de implementación — mismo patrón de riesgo que
  `constancias-oficios` señaló para su tabla de contador.
- **Riesgo de producto, no técnico**: forzar alta previa en el padrón para
  poder registrar un reporte telefónico puede frenar la adopción del
  módulo si el piloto reporta por teléfono con frecuencia — sin datos de
  uso real del piloto que lo confirmen o lo descarten.
- **Primera escritura pública sin sesión del repo**: "alta de reportes
  ciudadanos desde el portal" (`docs/05-seguridad.md` §10) es la primera
  vez que el sistema necesita un caso de uso de **escritura** invocable sin
  `ContextoActual` — hasta hoy solo hay precedente de *lectura* pública
  (`validarFolio`). Amerita el mismo rigor que cualquier pieza nueva de
  tenancy, con su propio rate limiting antes de tocar la base.
- **No verificado, declarado**: la composición de dirección de un reporte
  (lugar + calle, sin domicilio ni residencia) no tiene ningún caso de uso
  existente que la ejercite — es una lectura de la forma de los puertos de
  `territorio`, no un camino probado por un test.

## Boceto de rebanadas (aproximado, para `sdd-tasks`)

Referencia de calibración: `constancias-oficios` bocetó 7–8 rebanadas
(~2.050–3.050 líneas base), presupuesto de 800/rebanada. `reportes` tiene
menos superficie nueva de *mecanismo* (folio, rate limiting y bitácora ya
están resueltos y solo se copian) pero agrega una superficie que
`constancias` nunca tuvo: **escritura pública sin sesión** y un flujo de
estados con asignación.

| # | Contenido | Rango aproximado |
|---|---|---|
| 1 | Dominio + esquema: tabla `reportes`, contador de folio propio, catálogo de área responsable (según decisión), RLS/FORCE/GRANT, aislamiento | ~450–600 |
| 2 | Puerto de lectura hacia `territorio` (lugar/calle) y hacia `padron` (persona, si el vínculo se decide) | ~150–250 |
| 3 | `registrarReporte`: folio bajo lock, clasificación, `puedeEscribir`, bitácora | ~350–500 |
| 4 | Flujo de estados y asignación: transición de estado, regla de autorización (mostrador vs. restringida), bitácora | ~300–450 |
| 5 | Alta pública desde el portal: caso de uso sin `ContextoActual`, rate limiting nuevo, primera escritura pública del repo | ~300–450 |
| 6 | Consulta pública de folio de reporte: caso de uso + ruta, reuso o extensión de `TipoIntento` | ~200–300 |
| 7 | UI de mostrador: listado, detalle, cambio de estado | ~250–400 |

Total base (1–7): ~2.000–2.950 líneas, todas por debajo de 800 por
rebanada, secuenciales contra `main`.

## Listo para propuesta

**Sí, con cuatro preguntas abiertas explícitas que `sdd-propose` debe
resolver (no bloqueantes de arranque, de alcance/forma):**

1. Catálogo de "área responsable": fijo (unión cerrada) vs. configurable
   por ayuntamiento (tabla con RLS).
2. Consulta pública de folio de reporte: reusar `TipoIntento: "folio"` vs.
   agregar un cuarto valor dedicado.
3. Vínculo con el padrón: persona obligatoria vs. vínculo opcional
   (`personaId` nullable).
4. Regla de autorización para asignar/cerrar un reporte:
   `puedeEscribir` genérico vs. regla restringida tipo
   `puedeAdministrarDocumentos`.

La arquitectura subyacente (capas, folio-en-transacción con lock,
puerto propio para leer de `territorio`/`padron`, bitácora, rate limiting)
ya está determinada por precedente directo y código funcionando en
`constancias`; no hay pregunta de viabilidad técnica pendiente.
