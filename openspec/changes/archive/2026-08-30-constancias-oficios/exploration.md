# Exploración: Fase 2 — Constancias y oficios

**Alcance investigado**: `ROADMAP.md` (líneas 187–209). Módulo destino ya
nombrado en `docs/architecture/estructura.md:37` y `docs/architecture/module-template.md:1-44`
(ejemplo completo del propio repo: `src/modules/constancias/`).

## 1. De dónde sale el dato de una constancia

**Persona (padron)**: `personaPorId` (`src/modules/padron/application/personaPorId.ts:15-22`)
y `identidadesDePersona` (`src/modules/padron/application/identidadesDePersona.ts:14-23`)
ya existen — se agregaron en `capa-territorial` precisamente para un
consumidor externo (`design.md` decisión 5). `Persona` (dominio,
`src/modules/padron/domain/persona.ts:24-30`) tiene `nombres`,
`primerApellido`, `segundoApellido`, `curp`.

**Residencia vigente (territorio)**: `historialDeResidencias`
(`src/modules/territorio/application/historialDeResidencias.ts:24-36`)
devuelve `ResidenciaGuardada[]` con
`domicilio: { calleId, lugarId, numero }` (`puertosDeResidencias.ts:27-41`).
La "vigente" es la primera fila con `hastaEn IS NULL` en el orden
`desdeEn DESC, creadoEn DESC` — la elige quien consume, no el caso de uso
(mismo archivo, comentario líneas 10-18).

**Lo que falta, verificado y no existe hoy**: un lector de "dirección
completa como texto imprimible". `RepositorioDeLugares.buscarPorId`
(`src/modules/territorio/application/puertos.ts:72-93`,
implementación en `infrastructure/repositorioDeLugaresSql.ts:74-81`) solo
devuelve la fila propia de un lugar (`id, tipo, nombre, padreId, bajaEn`);
no hay ningún método que suba la cadena de ancestros (cabecera → colonia →
sector → manzana, máximo 4 niveles según `capa-territorial/design.md`
§7 punto 3). `RepositorioDeCalles.buscarPorId`
(`application/puertos.ts:124-139`) da el nombre de la calle pero nada
compone lugar+calle+número+entrecalles+referencia en una cadena. Confirmé
con grep (`direccion|Direccion|calleNombre|textoDeDireccion|domicilioComoTexto`
sobre `src/modules/territorio`) que no hay ningún archivo con ese nombre
salvo `domain/direccion.test.ts` (que prueba solo el invariante "tres
calles distintas", no composición de texto). **Esta pieza es trabajo
nuevo de Fase 2**, ya sea como método nuevo en `territorio` o como parte
del propio módulo `constancias` leyendo por los puertos existentes y
subiendo `padreId` a mano (máximo 4 saltos, acotado).

**El congelamiento de la dirección ya está decidido, no es una pregunta
abierta.** `openspec/changes/archive/2026-08-29-capa-territorial/design.md`
§8, párrafo final:

> "La consecuencia que se hereda a Fase 2 (decisión 11) —la constancia
> congela el texto de la dirección al emitir— es exactamente porque la
> dirección es derivada: re-derivarla después de un reparenteo da otra
> cadena, y el invariante 2 dice que un documento emitido no se modifica."

Esto casa con `docs/06-frontend.md:499-510` (§9, "No se guarda el PDF"):
se guarda el *snapshot* de los datos renderizados + versión de plantilla,
nunca el binario. La reimpresión regenera de forma determinista desde ese
snapshot. La marca de agua `REIMPRESIÓN` es un parámetro de render, no un
documento distinto.

**Conclusión para la propuesta**: `emitirConstancia` tiene que (a) leer
persona + residencia vigente + dirección compuesta en el momento de
emisión, (b) armar y guardar un snapshot de texto/datos (no una FK viva a
`domicilios`/`lugares`), (c) el PDF se regenera de ese snapshot cada vez
que se pide, nunca se persiste el binario ni en Postgres ni en R2.

## 2. Folio consecutivo por ayuntamiento

El mecanismo está acotado por invariantes explícitos, no es libre:

- `docs/architecture/invariantes-criticos.md:58-69` (Invariante 2): "El
  folio se asigna dentro de la misma transacción que inserta el
  documento, con lock sobre el contador del tenant. No se usa una
  secuencia de base de datos: una secuencia deja huecos al hacer
  rollback, y un hueco en una serie de documentos oficiales es una
  pregunta que nadie quiere responder en una auditoría."
- Matriz de escenarios (mismo archivo, T6/T7): dos emisiones concurrentes
  → folios distintos y consecutivos sin huecos; rollback después de tomar
  folio → el folio no se consume.
- `AGENTS.md` regla 7 y antipatrón 9: "Secuencia de base de datos para
  folios" está listado como antipatrón que bloquea; alternativa
  "Contador por tenant con lock".

**No hay precedente de contador en el repo** (grep sobre `contador|FOR
UPDATE|advisory_lock|nextval` en `src/` no encontró nada salvo un match
irrelevante). El precedente de concurrencia que sí existe —
`residencias_una_abierta_idx`, índice único parcial
(`territorio/infrastructure/esquema.ts`, documentado en
`capa-territorial/design.md` §8)— resuelve un invariante distinto ("a lo
sumo una fila abierta"), no "siguiente valor de una serie". Un índice
único parcial no puede generar el próximo folio; solo puede rechazar un
duplicado después del hecho.

**Opciones que sí calzan con el invariante** (sin decidir cuál, es
trabajo de `sdd-design`):

a. Tabla contador `(ayuntamientoId PK, ultimoFolio int)` con
   `UPDATE ... SET ultimo_folio = ultimo_folio + 1 WHERE ayuntamiento_id
   = $1 RETURNING ultimo_folio` dentro de la misma transacción que el
   `INSERT` de la constancia. Un `UPDATE` toma lock de fila
   automáticamente en Postgres — la segunda transacción concurrente
   espera al `COMMIT` de la primera, sin necesitar `SELECT ... FOR
   UPDATE` explícito. Es la lectura más directa del texto del invariante
   ("lock sobre el contador del tenant").
b. `SELECT ... FOR UPDATE` + incremento en aplicación + `UPDATE` — mismo
   resultado con dos sentencias en vez de una.
c. Advisory lock por `ayuntamientoId` — descartado como precedente
   explícito en `capa-territorial/design.md` §8 para un problema similar
   ("un advisory lock sería una segunda garantía de la misma cosa, con
   el riesgo de que las dos se crucen"), aunque ahí el argumento aplicaba
   porque ya existía el índice parcial; acá no hay índice equivalente, así
   que no está tan claramente descartado, pero (a) es más simple y sin
   mecanismo nuevo.

**Pregunta abierta real, no resuelta por ningún documento leído**: ¿el
contador es UNO por ayuntamiento (roadmap dice literalmente "por
ayuntamiento", línea 196-197) o uno por (ayuntamiento, tipo de
documento)? El ejemplo de `module-template.md:127` (`Folio.crear(prefijo,
anio, consecutivo)`) sugiere series con prefijo distinto por tipo — pero
es un ejemplo ilustrativo de la plantilla de módulo, no una decisión
tomada. Tampoco hay definición sobre si la serie reinicia por año civil.
Ninguno de los documentos leídos (roadmap, invariantes, ADR 0001,
`docs/05-seguridad.md`) resuelve esto. **`sdd-propose` tiene que decidirlo
explícitamente**, porque cambia la forma de la tabla contador (clave
simple vs compuesta) y el formato del folio.

## 3. Plantillas configurables por ayuntamiento

Precedente directo: `ayuntamientos.marca` es `jsonb` validado con Zod en
el borde (`src/shared/marca/validacion.ts:60-152`) — lista blanca de
campos (`primario`, `primarioTexto`, `secundario`, `escudo`), lo que no
valida se descarta entero (`leerMarca`, línea 148-152), y el mismo
validador se usa para lectura y escritura.

**Tensión real**: el roadmap pide "plantillas configurables", pero
`@react-pdf/renderer` no reutiliza Tailwind y las plantillas se estilan
"con el sistema propio de la librería, que es un subconjunto de flexbox"
(`docs/06-frontend.md:487-497`, §9 "El costo que aceptamos"). Un editor de
layout por tenant sería la abstracción especulativa que `AGENTS.md`
("Qué NO es hallazgo") rechaza explícitamente ("Falta de abstracción
especulativa... se duplica la primera vez, se aguanta la segunda, se
abstrae la tercera"). Dado que el roadmap ya separa por TIPO de documento
(constancia de vecindad, de ingresos, cartas, oficios) como unidades
distintas — no como una plantilla genérica parametrizable — la lectura
más consistente con el resto del repo es: un componente JSX fijo por tipo
de documento (mismo layout para todos los municipios), parametrizado por
(a) la marca ya existente (escudo/colores) y (b) un puñado de campos de
texto validados con Zod por tenant (nombre del presidente municipal,
cargo, leyenda de pie de página) — no un motor de plantillas. Esto es una
recomendación con evidencia, no una decisión: `sdd-propose` debe fijar el
alcance exacto de "configurable".

## 4. Generación de PDF

`@react-pdf/renderer` **ya está instalado** (`package.json:37`,
`^4.3.1`) y es una elección de stack ya decidida y justificada
(`docs/06-frontend.md:19` tabla de stack, y §9 completa líneas 461-511
con la comparación contra navegador headless). **No es dependencia
nueva de este cambio.**

`docs/06-frontend.md:499-510` ya resuelve la bifurcación que se me pidió
señalar sin decidir — **ya está decidida en el repo**, no es abierta:

> "No se guarda el PDF. Se guarda el snapshot de los datos renderizados
> más la versión de plantilla. La reimpresión regenera de forma
> determinista... guardar el binario cuesta almacenamiento y complica el
> borrado. El snapshot resuelve las dos cosas."

Por lo tanto la preocupación de "filesystem efímero de Railway"
(`CLAUDE.md`, sección Stack) **no aplica al PDF de una constancia**: el
binario nunca se persiste, ni en el contenedor ni en R2. Solo el escudo
(imagen) va a R2, y eso ya está resuelto por `shared/marca` /
`modules/marca/infrastructure/almacenR2.ts`.

**Lo que sigue abierto**: dónde corre el render — Server Action no puede
devolver un binario de forma natural para descarga; lo consistente con
"Server Components por defecto, `use client` justificado" y con que esto
es una descarga GET, no una mutación, es un Route Handler
(`app/(panel)/constancias/[id]/pdf/route.ts` o similar) que lee el
snapshot vía un caso de uso normal (`contexto: ContextoActual`, dentro
del panel autenticado) y llama a `renderToStream`/`renderToBuffer`. No
encontré precedente de un route handler de descarga binaria en el repo
(el único `route.ts` existente es `app/api/auth/[...all]/route.ts`), así
que la forma exacta (Route Handler vs. Server Action con `Response`)
queda para `sdd-design`.

## 5. QR + página pública de validación

`qrcode` (`1.5.4`) y `@types/qrcode` **ya están instalados**
(`package.json:43,57`) y también son elección de stack ya decidida
(`docs/06-frontend.md:20`: "Genera data URI, se embebe en el PDF"). **No
es dependencia nueva.**

**Cómo se resuelve el tenant sin sesión — verificado, no supuesto.**
`proxy.ts` (`src/proxy.ts:20-67`) resuelve el subdominio y escribe la
cabecera `CABECERA_SUBDOMINIO` para *todo* request que matchee
(`config.matcher`, línea 69-71, cubre todo salvo `_next/*` y
`favicon.ico` — incluye rutas públicas). `ayuntamientoActual()`
(`src/shared/tenancy/contexto.ts:20-44`) lee esa cabecera y resuelve el
ayuntamiento **sin pedir sesión** — se confirma porque hoy la llaman
`(acceso)/acceso/page.tsx`, `(acceso)/layout.tsx` y `(acceso)/page.tsx`,
las tres páginas públicas previas al login
(grep de llamadores en el explorer de código). En cambio
`contextoActual()` (`src/shared/auth/contexto.ts:47-70`) devuelve `null`
si no hay sesión (línea 50) y `ContextoActual` exige `usuario: {id, rol}`
(línea 25-38) — **no se puede construir un `ContextoActual` para un
visitante anónimo.**

**Consecuencia de diseño, no trivial**: el caso de uso de validación
pública de folio *no puede* seguir la forma `(id, contexto: ContextoActual)
=> withTenant(contexto.ayuntamientoId, ...)` que usan absolutamente todos
los demás casos de uso de lectura del repo (`personaPorId.ts:15-22`,
`historialDeResidencias.ts:24-27`, `residentesDe.ts:18-21`, etc.). Necesita
una firma nueva que reciba `ayuntamientoId: AyuntamientoId` directo
(obtenido de `ayuntamientoActual()`), sin `usuario` ni `origen`. Es la
primera vez que el repo necesitaría este patrón — vale la pena que
`sdd-design` lo declare explícitamente en vez de que aparezca como una
excepción silenciosa.

**Qué debe responder, y qué no.** `NoEncontradoError`
(`src/shared/lib/errores.ts:25-33`), doc comment:

> "Un recurso de otro ayuntamiento cae acá, no en `NoAutorizadoError`...
> con un id enumerado eso alcanza para mapear el padrón de otro
> municipio... 'no existe' y 'no te lo puedo mostrar' tienen que ser la
> misma respuesta."

Aplicado a folio: un folio inexistente, un folio de otro municipio (si
alguien probara el mismo número contra otro subdominio) y un folio
cancelado tienen que devolver el mismo mensaje genérico de "no válido" —
nunca distinguir el motivo. Coincide con
`invariantes-criticos.md` T8 ("confirma validez sin exponer datos de
terceros") y con `docs/05-seguridad.md:66-72`: los `id` internos de
constancias deben ser UUID no enumerable (regla ya general del repo), el
`folio` público sí es secuencial a propósito — son dos identificadores
distintos con propiedades opuestas, y eso hay que dejarlo explícito en el
esquema (columna `id` uuid interno + columna `folio` texto/serial
visible).

**Rate limiting es obligatorio y ya está escrito como requisito**, no es
una sugerencia mía: `docs/05-seguridad.md:259-268` (§10):

> "Obligatorio en: login, validación pública de folio, alta de reportes
> ciudadanos desde el portal. Las tres son superficies públicas y las
> tres se pueden usar para enumerar datos."

Precedente de implementación completo y reusable:
`src/shared/auth/limitarRitmo.ts:55-90` +
`src/shared/auth/ritmo.ts` — tabla `intentosAcceso` con
`ayuntamientoId`, clave hasheada (`claveDe`, sha256+pimienta, nunca IP en
claro), ventana de 15 min, error tipado `RitmoExcedidoError`. El tipo
`TipoIntento` (`src/shared/auth/intentosAcceso.ts:23`) es una unión
cerrada — agregar un valor `"folio"` (o similar) es el cambio mínimo si
se decide reusar esta tabla en vez de crear una nueva. Es una decisión
real para `sdd-design`: reusar `intentosAcceso`/`limitarRitmo` (tercer
consumidor del mismo mecanismo, calza con "se abstrae la tercera") vs.
mecanismo dedicado.

## 6. Reimpresión con marca

Ya cubierto en el punto 4: la marca de agua es un parámetro de render, no
un documento nuevo (`docs/06-frontend.md:509-510`). El invariante 2
(`invariantes-criticos.md:67-69`) exige: documento emitido nunca se
modifica (se cancela y se emite otro); toda reimpresión queda registrada
con usuario, momento y motivo; el contador de reimpresiones nunca decrece.

Patrón existente reusable: `registrar()`
(`src/shared/tenancy/bitacora.ts:24-57`) — bitácora de solo-agregado,
`accion: string` libre (no es una unión cerrada en TypeScript, así que
agregar `"REIMPRIMIR_CONSTANCIA"`/`"EMITIR_CONSTANCIA"`/`"CANCELAR_CONSTANCIA"`
no exige tocar un tipo central), con `entidadId` apuntando a la
constancia. La bitácora ya es el mecanismo de "append-only, actor +
momento + entidad" que este requisito pide; no hace falta una tabla
nueva solo para eso, aunque probablemente sí convenga un contador
denormalizado en la fila de la constancia para no tener que agregar la
bitácora en cada lectura de la pantalla — decisión de `sdd-design`.

**Pregunta abierta**: el "motivo" de la reimpresión, ¿es texto libre o
categoría cerrada? `AGENTS.md` acota la regla de categoría cerrada
explícitamente a "motivo de traslado, tipo de asunto del juzgado, tipo
de apoyo social" (sección "Datos personales") — el motivo de reimpresión
no está en esa lista, así que la regla dura no lo alcanza directamente,
pero conviene que `sdd-spec` lo decida a propósito y no por omisión.

## 7. Roles

`openspec/specs/autorizacion-roles/spec.md:112-124` ya tiene un
escenario que anticipa esto (bajo "Baja lógica de usuarios", no bajo una
regla nueva de constancias):

> "GIVEN un OPERADOR de Motul que emitió una constancia y luego fue dado
> de baja / WHEN se consulta esa constancia / THEN sigue mostrando a ese
> OPERADOR como quien la emitió."

Esto confirma que `OPERADOR` es el rol esperado para emitir, consistente
con el patrón ya establecido: operaciones de "mostrador" (alta de
domicilio, alta de lugar, edición) usan la regla genérica
`puedeEscribir = rol !== "CONSULTA"` (`src/shared/auth/roles.ts:46`,
cubre `ADMIN_MUNICIPAL` y `OPERADOR`), mientras que operaciones
"estructurales" (fusionar personas, reparentear territorio, renombrar
calles) tienen su propia regla restringida a `ADMIN_MUNICIPAL`
(`puedeFusionarPersonas`, `puedeAdministrarTerritorio`,
`roles.ts:94-104`), con su propia fila documentada en
`autorizacion-roles/spec.md:150-221`.

Emitir/reimprimir una constancia es claramente "mostrador" por este
precedente — probablemente `puedeEscribir` alcanza, sin regla nueva. La
**cancelación** es la pregunta real abierta: por su peso (es la operación
irreversible sobre un documento oficial, más cercana en gravedad a
"reescribe la identidad"/"reescribe la estructura" que a "capturar una
dirección"), podría merecer el patrón restringido
(`ADMIN_MUNICIPAL`-only, siguiendo `puedeFusionarPersonas`) en vez del
genérico. Ningún documento leído lo resuelve — es una decisión de
`sdd-propose`/`sdd-spec`, no algo que este documento deba fijar.

## 8. Riesgo de producto: "diseñamos nuestro propio formato"

El roadmap pide explícitamente como insumo previo "una constancia real
emitida por el municipio piloto. El formato, encabezado, leyenda y
ubicación del sello no se inventan" (`ROADMAP.md:204-206`). La decisión
tomada por el usuario invierte esto: se diseña el formato propio y se
espera que el municipio se adapte. Esto es un riesgo de producto real,
no de arquitectura, y vale la pena dejarlo escrito para que `sdd-propose`
lo cargue con los ojos abiertos:

- El roadmap mismo marca esta fase como "el punto de primer ingreso" y
  "hito de negocio: al cerrar esta fase existe un producto cobrable"
  (`ROADMAP.md:189,208`). Un formato que el presidente/secretario
  municipal rechaza al verlo impreso —por no calzar con el sello, la
  leyenda legal esperada o la disposición del membrete— pone en riesgo
  exactamente ese hito, no un detalle cosmético.
- Como `@react-pdf/renderer` no reutiliza Tailwind y se estila con
  flexbox propio (`docs/06-frontend.md:487-491`), el formato es JSX fijo
  en código: iterar el diseño después de que el piloto vea la primera
  constancia impresa es un ciclo de desarrollo y despliegue, no un ajuste
  de configuración. Es coherente mantener acotado el alcance de
  "configurable" (punto 3) — invertir en un editor de layout antes de
  validar el formato con el piloto sería exactamente la abstracción
  especulativa que las reglas del repo rechazan — pero el equipo debería
  esperar al menos una ronda de revisión visual después de la primera
  muestra impresa, y eso vale la pena nombrarlo en el plan de
  `sdd-propose`, no descubrirlo en producción.

## Preguntas abiertas para `sdd-propose`/`sdd-spec`/`sdd-design`

1. ¿El contador de folio es uno por ayuntamiento, o uno por
   (ayuntamiento, tipo de documento)? ¿Reinicia por año civil? — sin
   evidencia en ningún documento leído, decisión de producto real.
2. Mecanismo exacto del lock de folio: `UPDATE ... RETURNING` sobre fila
   contador (recomendado por match directo con el texto del invariante)
   vs. `SELECT ... FOR UPDATE` explícito.
3. Alcance exacto de "plantilla configurable": ¿solo campos de texto
   parametrizados por tenant sobre un layout JSX fijo por tipo de
   documento, o algo más? (recomiendo lo primero, con evidencia, no
   decidido acá).
4. Dónde corre el render de PDF: Route Handler dedicado vs. otra forma —
   sin precedente exacto en el repo.
5. Firma del caso de uso de validación pública: nueva forma
   `(ayuntamientoId, folio) => ...` sin `ContextoActual`, primera vez en
   el repo — hay que declararla, no dejar que aparezca como excepción
   silenciosa.
6. Rate limiting de la validación pública: reusar `intentosAcceso`/
   `limitarRitmo` agregando un `TipoIntento` nuevo, vs. mecanismo propio.
7. Motivo de reimpresión: texto libre o categoría cerrada.
8. Regla de autorización para cancelar una constancia:
   `puedeEscribir` genérico vs. regla restringida tipo
   `puedeFusionarPersonas`.
9. Composición del folio como texto (prefijo por tipo, año, padStart) —
   `module-template.md:127` da un ejemplo ilustrativo
   (`Folio.crear(prefijo, anio, consecutivo)`), no una decisión fijada.

## Riesgos

- **Riesgo de producto** (no técnico): formato propio sin validar contra
  el municipio piloto antes de la demo/venta — ver sección 8.
- **Riesgo de aislamiento** (el más alto de arquitectura): la página
  pública de validación es la primera superficie sin sesión que necesita
  leer datos reales bajo RLS — un error ahí no es "un bug visible", es el
  modo de falla que `invariantes-criticos.md` existe para evitar. La
  firma nueva del caso de uso (punto 5) tiene que revisarse con el mismo
  rigor que cualquier pieza de tenancy.
- **Riesgo de alcance**: sin fijar la pregunta 1 (folio por tipo vs.
  global, con o sin año), la tabla contador puede rehacerse a mitad de
  implementación si `sdd-propose` no la cierra primero.
- **No medido, declarado**: no hay precedente en el repo de un
  `UPDATE ... RETURNING` como mecanismo de contador bajo carga
  concurrente real (paralelo al "no medido" que `capa-territorial/design.md`
  §18 declaró para el anidamiento de `withTenant` y el CTE recursivo). El
  argumento de que un `UPDATE` toma lock de fila automático en Postgres es
  correcto por el modelo MVCC estándar, pero no se corrió contra la base
  de este repo — vale un test de integración temprano (T6/T7 de la
  matriz), igual que capa-territorial lo hizo para su propio mecanismo de
  concurrencia.

## Boceto de rebanadas (aproximado, para `sdd-tasks`)

Referencia de calibración: `capa-territorial` cerró en 7 rebanadas,
~3.280 líneas totales, presupuesto de 800/rebanada (design.md §17). Este
cambio tiene superficie adicional que `capa-territorial` no tuvo:
superficie pública sin sesión, render de binario, rate limiting nuevo —
por eso el boceto trae más cortes, no menos, a pesar de que el roadmap
mismo estima esta fase más larga (3–4 semanas vs. lo que tomó
`capa-territorial`).

| # | Contenido | Rango aproximado |
|---|---|---|
| 1 | Dominio + esquema: tabla `constancias`, tabla contador de folio, RLS/FORCE/GRANT, `Folio` value object, errores de dominio, aislamiento | ~500–650 |
| 2 | Lector de dirección compuesta en `territorio` (ascenso de `padreId` hasta 4 niveles + calle + entrecalles) con su test | ~150–250 |
| 3 | `emitirConstancia`: folio bajo lock, snapshot congelado de persona+dirección+residencia, bitácora, `puedeEscribir` | ~400–600 |
| 4 | Render de PDF: Route Handler, plantilla JSX de constancia de vecindad, QR embebido | ~300–500 |
| 5 | Reimpresión + cancelación: casos de uso, marca de agua como parámetro de render, bitácora, UI | ~300–450 |
| 6 | Página pública de validación: resolución sin sesión, `NoEncontradoError` uniforme, rate limiting (reuso o nuevo) | ~300–450 |
| 7 | Exportación: porción de `constancias` en `src/shared/exportacion`, mismo patrón que `porcionesDeTerritorio` | ~100–150 |
| 8+ | Tipos de documento adicionales (constancia de ingresos, cartas, oficios) como plantillas nuevas sobre la misma base | variable, posiblemente fuera de la primera entrega |

Total base (1–7): ~2.050–3.050 líneas, todas por debajo de 800 por
rebanada, secuenciales contra `main` (mismo criterio de
`CLAUDE.md`: "un PR, un merge").

## Listo para propuesta

**Sí, con preguntas abiertas explícitas que `sdd-propose` debe resolver
(no bloqueantes de arranque, pero sí de forma).** La arquitectura
subyacente (capas, tenancy, folio-en-transacción, snapshot-nunca-binario,
puerto propio para la lectura entre `constancias` y `territorio`/`padron`)
ya está determinada por invariantes y precedentes existentes con
evidencia directa; lo que falta fijar son las nueve preguntas de la
sección anterior, todas de alcance/forma, ninguna de viabilidad técnica.
