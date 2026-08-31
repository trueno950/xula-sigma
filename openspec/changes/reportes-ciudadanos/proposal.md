# Propuesta: Reportes ciudadanos (Fase 3)

**Cambio:** `reportes-ciudadanos` · **Base:**
`openspec/changes/reportes-ciudadanos/exploration.md` · **Precedente:**
`openspec/changes/archive/2026-08-30-constancias-oficios/`

## Intencion

Hoy el reporte de un bache entra por telefono o por el grupo de WhatsApp del
regidor, se anota en una libreta o no se anota, y muere ahi. El municipio no
puede responder tres preguntas que le hacen todo el tiempo: **cuantos
reportes hay abiertos, quien los esta atendiendo, y que paso con el que
levanto la vecina hace dos semanas.** No es un problema de canal —el vecino
ya sabe como avisar— es que **no hay registro**: sin folio no hay
seguimiento, sin area asignada no hay responsable, y sin estado no hay forma
de saber si algo se hizo.

El costo real no es la incidencia sin resolver: es que el mismo bache se
reporta cuatro veces porque nadie puede decir que ya esta en la lista, y que
el ciudadano vuelve a la ventanilla a preguntar porque no tiene otra forma
de enterarse. **Ese "cuatro veces" no es una molestia administrativa: es el
caso que las decisiones 14 y 15 resuelven por los dos extremos** —evitarlo en
la pantalla del alta, y que quien igual reporto segundo lea "en atencion" y
no "rechazado"—.

Exito: el mostrador de Motul levanta el reporte con un folio en la mano, el
administrador lo asigna a Obras Publicas y lo mueve a `EN_ATENCION`, el
vecino escribe su folio en la pagina publica y ve **"en atencion"** sin
llamar a nadie, y a fin de mes el municipio puede decir cuantos reportes
recibio, de que tipo y cuantos cerro.

`ROADMAP.md:212-220`. **Vendible como plan superior**, no es el hito de
primer ingreso — ese ya lo cerro Fase 2.

## Decision de alcance: el mostrador primero, el portal despues

El roadmap enumera cinco entregables y **ninguno es "alta publica desde el
portal"**: registro de incidencias, clasificacion, flujo de estados y
asignacion, vinculo con el padron, consulta publica de folio. La unica
mencion de alta publica esta en `docs/05-seguridad.md` §10, que dice **con
que ritmo se limita si existe**, no que exista en esta fase.

**Esta entrega trae el registro por mostrador y la consulta publica de
folio. La escritura publica sin sesion queda fuera**, por dos razones:

1. Seria la **primera escritura sin `ContextoActual` del repo** (hasta hoy
   solo hay *lectura* publica, `validarFolio`). Es una pieza de tenancy
   nueva, y meterla en la misma entrega que un modulo entero mezcla dos
   riesgos que se revisan mejor por separado.
2. **El valor de la fase no depende de ella.** Lo que resuelve el problema
   es el registro y el seguimiento; el canal de entrada sigue siendo el
   telefono y la ventanilla, que es como el municipio ya opera.

**Costo declarado, para que no se descubra despues:** cuando el portal
llegue, `registrado_por_usuario_id` tiene que pasar a admitir nulo —una
migracion de una columna—. Se acepta porque el esquema ya nace con
`personaId` nullable (decision 11), asi que el reporte anonimo **no** exige
rehacer la tabla.

## Alcance

**Dentro:** modulo nuevo `src/modules/reportes/` con sus cuatro capas; tablas
`reportes`, `folios_de_reportes` (contador) y `movimientos_de_reportes`, las
tres con RLS + `FORCE` + su test de aislamiento; FK compuestos a mano hacia
`lugares`, `calles`, `personas` y `reportes` (autorreferencial, decision 14);
value object `Folio` propio; registro con
folio bajo lock en la misma transaccion; clasificacion por tipo de incidencia
y por area responsable, ambas uniones cerradas; ubicacion por lugar + calle
opcional + referencia; flujo de estados con transiciones cerradas; asignacion
de area; vinculo opcional con el padron; **vinculo de duplicado hacia el
reporte original y buscador de similares abiertos en el alta** (decisiones 14
y 15); historial de movimientos; regla de rol nueva
`puedeAdministrarReportes`; **una lectura nueva en `territorio`**
(ubicacion compuesta como texto, decision 10); pagina publica de consulta de
folio con limitacion de ritmo; `PorcionExportable` de `reportes`.

**Fuera:** alta publica desde el portal (seccion anterior); notificacion por
WhatsApp o cualquier canal push —`ROADMAP.md:222-225` lo difiere
explicitamente—; notificacion por correo; fotografias adjuntas al reporte
(almacenamiento en R2, moderacion y dato personal incidental: es una
propuesta propia); geolocalizacion por coordenadas o mapa; catalogo de areas
configurable por ayuntamiento (decision 3); reapertura de un reporte cerrado
(decision 5); datos de contacto sueltos del reportante (decision 11);
metricas o tablero de indicadores; SLA, tiempos de respuesta o vencimientos
—no hay politica municipal escrita que los ancle—; **fusion de reportes
duplicados en una sola fila** —el vinculo de la decision 14 alcanza y ademas
conserva la cuenta de cuantos vecinos reportaron lo mismo—; **deteccion
automatica de duplicados por similitud de texto** (decision 15).

## Decisiones cerradas

| # | Decision | Por que | Alternativa descartada |
|---|---|---|---|
| 1 | **Un reporte no es un documento oficial emitido.** Del invariante 2 aplica la mecanica del folio —consecutivo por ayuntamiento, asignado bajo lock en la misma transaccion, sin secuencia de Postgres— y la consulta publica que no expone el registro. **No aplica la inmutabilidad**: el reporte cambia de estado por diseño | El invariante 2 fue escrito para constancias y oficios, que se entregan en papel y se cancelan en vez de editarse. Un reporte es un registro operativo con folio publico: si se le exigiera inmutabilidad, el flujo de estados —que es el entregable central de la fase— seria imposible. Se escribe aca porque la lectura literal del invariante lo prohibiria, y descubrir eso a mitad de la implementacion cuesta una rebanada | Tratar el reporte como documento inmutable y modelar cada cambio como un reporte nuevo: multiplica los folios por el numero de transiciones y rompe "historial del reporte" |
| 2 | **Folio `REP-{AAAA}-{NNNNNN}`, una sola serie por `(ayuntamiento, anio)`. No se segmenta por tipo de incidencia.** `INSERT … ON CONFLICT (ayuntamiento_id, anio) DO UPDATE SET ultimo = folios_de_reportes.ultimo + 1 RETURNING ultimo`, en la misma transaccion del `INSERT` del reporte | `constancias` segmento por tipo porque cada serie **se archiva por separado** y un hueco en la serie de vecindad es una pregunta de auditoria (decision 1 de `constancias-oficios`). Un reporte no se archiva por tipo: la clasificacion vive en una columna y es un filtro, no una serie. Segmentar produciria seis contadores para resolver un problema que nadie tiene. El anio se conserva —`hoyEnMerida()`, nunca `getFullYear()`— porque el municipio cuenta su operacion por anio civil. El mecanismo del lock es el mismo que ya corre en produccion con su test de concurrencia | Contador global entre tenants: lo prohibe el invariante 2. Serie por tipo: seis contadores sin consumidor. Secuencia de Postgres: antipatron 9, deja huecos |
| 3 | **`AreaResponsable` es una union cerrada fija en `domain`** — `OBRAS_PUBLICAS`, `ALUMBRADO_PUBLICO`, `AGUA_POTABLE_Y_DRENAJE`, `LIMPIA_Y_RECOLECCION`, `PARQUES_Y_JARDINES`, `SERVICIOS_GENERALES`. Sin tabla, sin RLS, sin migracion propia (el `CHECK` viaja en la migracion de `reportes`) | **Decision del usuario.** Mismo patron que `TIPOS_DE_LUGAR` y `MOTIVOS_DE_REIMPRESION`: conjunto pequeño, estable y compartido entre municipios. `SERVICIOS_GENERALES` existe para que `OTRO` (decision 4) tenga a donde asignarse; sin el, un reporte fuera de las cinco areas quedaria sin responsable posible. **Es la eleccion reversible**: agregar un valor es una migracion de `CHECK`, y si el piloto demuestra que cada municipio nombra distinto sus areas, la tabla configurable se puede construir despues sin tirar los datos | Tabla `areas_responsables` con `ayuntamientoId` y RLS: tabla nueva, politica, `GRANT` y test de aislamiento para un catalogo de seis filas que el roadmap **no** pidio configurable —a diferencia de las plantillas de Fase 2, que si lo pidio explicito— |
| 4 | **`TipoDeIncidencia` es una union cerrada separada del area:** `BACHE`, `ALUMBRADO`, `FUGA`, `BASURA`, `PARQUE`, `OTRO`. **Con `OTRO`, a diferencia de los motivos de `constancias`** | Los cinco primeros son literalmente los del roadmap (`ROADMAP.md:216`). `OTRO` entra —y la decision 15 de `constancias-oficios` lo rechazaba— porque el argumento de alla no aplica aca: ahi `OTRO` reintroducia una caja de texto libre que la categoria cerrada acababa de cerrar; aca la descripcion libre **ya existe por naturaleza del reporte** (decision 13), asi que `OTRO` no abre ninguna superficie nueva. Lo que evita es que un arbol caido entre como `BACHE` y ensucie el unico conteo que la fase produce. Tipo y area van separados porque quien captura no es quien asigna (decision 6) | Un solo campo que sea tipo y area a la vez: acopla lo que el mostrador observa con lo que el municipio decide, y obliga al operador a conocer el organigrama |
| 5 | **Estados: `RECIBIDO` → `EN_ATENCION` → `RESUELTO`, **y `RECIBIDO` → `RESUELTO` directo tambien es valido**. `RECHAZADO` es alcanzable desde los dos no terminales. `RESUELTO` y `RECHAZADO` son terminales: no hay reapertura.** Las transiciones validas son una funcion pura de dominio con su test | Un bache que reaparece **no es el mismo bache**: es una incidencia nueva, con su fecha, su folio y su propio tiempo de atencion. Reabrir sobreescribiria el unico dato que la fase produce —cuanto tarda el municipio en cerrar— y volveria el historial ambiguo. Mismo movimiento que `constancias`: no se edita, se emite uno nuevo. Cerrar el conjunto en `domain` es lo que hace que "no se puede pasar de `RESUELTO` a `RECIBIDO`" sea un test y no una intencion. **El salto directo es decision del usuario, y el motivo es de dato, no de comodidad:** la cuadrilla tapa el bache el mismo dia, y exigir el paso por `EN_ATENCION` no produce un registro mas fiel — produce dos clics seguidos del operador, que dejan las dos transiciones con la misma marca de tiempo y convierten "se resolvio el mismo dia" en "se atendio en cero segundos". Una burocracia que se saltea con dos clics no es un control: es ruido en los datos **con forma** de control, y contamina justo el indicador que la fase produce | Reapertura: el estado deja de significar nada y el conteo de reportes abiertos se vuelve incomparable entre meses. **Exigir el paso por `EN_ATENCION` en todos los casos: el operador lo satisface con dos clics y el tiempo de atencion medido pasa a ser cero, que es un dato peor que el que se queria proteger.** Estado como texto libre: el filtro del listado deja de funcionar el dia que alguien escribe "En Atencion" |
| 6 | **Cambiar de estado y asignar area: regla nueva `puedeAdministrarReportes` (`ADMIN_MUNICIPAL`). Registrar un reporte se queda en `puedeEscribir`; consultarlo no lleva guarda de rol** | **Decision del usuario**, y coincide con el criterio ya aplicado dos veces (`puedeAdministrarTerritorio`, `puedeAdministrarDocumentos`): capturar es mostrador, **decidir quien responde por algo es estructura**. Asignar un area es comprometer a una direccion del ayuntamiento, y marcar `RESUELTO` es la afirmacion de que el municipio ya cumplio: que la haga quien responde por ella. Las dos operaciones van en **una** regla y no en dos, como `puedeAdministrarTerritorio` cubre reparenteo y calles: es la misma pregunta. **Costo declarado:** en un municipio donde el `ADMIN_MUNICIPAL` no esta todos los dias, los reportes se acumulan en `RECIBIDO`. Se acepta porque **registrar nunca se bloquea** —que es lo urgente— y aflojar la regla despues es cambiar una funcion pura de una linea | `puedeEscribir` para todo: cualquiera cierra como `RESUELTO` un reporte que nadie atendio, y el indicador de la fase deja de medir trabajo. Dos reglas separadas: mismo rol, mismo criterio, dos filas que divergen |
| 7 | **El historial visible del reporte es una tabla propia `movimientos_de_reportes`, de solo agregado.** La bitacora igual recibe su traza, con ids y nada mas | El roadmap pide "historial del reporte" como **superficie de producto**, y la bitacora no puede serlo por dos razones verificadas: no tiene columna para un motivo (`Traza` es `actor`/`accion`/`entidad`/`entidadId`, `shared/tenancy/bitacora.ts:24-48`) y **no tiene ninguna lectura en la aplicacion** —los 41 llamadores son escrituras—, porque el ADR 0001 §5 la define como evidencia de auditoria, no como fuente de una pantalla. Es exactamente el desdoble de la decision 13 de `constancias-oficios` con `reimpresiones` | Codificar el estado dentro de `accion` y leer la bitacora: convierte una cadena libre en un esquema que nadie valida, y le da a una pantalla una tabla que existe para otra cosa. Solo columnas en `reportes`: se pierde quien lo movio y cuando |
| 8 | **El motivo de rechazo es categoria cerrada** — `DUPLICADO`, `FUERA_DE_COMPETENCIA`, `INFORMACION_INSUFICIENTE`. **Sin `OTRO` y sin campo libre acompañante.** Los demas movimientos no llevan motivo. **`DUPLICADO` no viaja solo: exige el vinculo al original (decision 14)** | Rechazar es la unica transicion que le dice que no a un vecino, y es la unica que necesita justificarse. `FUERA_DE_COMPETENCIA` tiene consumidor directo: contarlo dice si el municipio esta recibiendo lo que le toca al estado. **`DUPLICADO` era el valor que delataba el hueco** —la primera version de esta propuesta escribio aca que contarlo "dice si falta un buscador antes de capturar", o sea que ya sabia que el buscador faltaba y aun asi dejaba el duplicado como un rechazo a secas—; las decisiones 14 y 15 cierran esa tension por los dos lados. Un `OTRO` con texto al lado es el que se queda con todo y recoge lo que nadie deberia guardar (decision 15 de `constancias-oficios`) | Texto libre "para explicarle al vecino": el vecino no lee esa columna, y la columna termina con nombres de personas adentro. `DUPLICADO` sin vinculo: es lo que hacia esta propuesta antes, y le decia que no a un vecino cuyo problema si se estaba atendiendo |
| 9 | **Ubicacion: `lugarId` obligatorio, `calleId` opcional, `referencia` de texto corto opcional. Ni domicilio ni residencia.** El texto de la ubicacion **no se congela**: se compone en cada lectura | Un bache esta en un lugar, no en el domicilio de nadie: colgar el reporte de `domicilios`/`residencias` obligaria a que exista un vecino registrado para reportar una fuga en la plaza. Y **no se congela a proposito, al reves que la constancia**: si la colonia se reparentea, la cuadrilla que va a tapar el bache necesita la ubicacion **vigente**, no la que se capturo hace tres semanas. La constancia congela porque es un papel entregado; el reporte no es un papel | Snapshot congelado como en `constancias`: manda a la cuadrilla a una direccion que ya no se usa. FK a `domicilios`: exige un domicilio dado de alta para reportar en la via publica |
| 10 | **La composicion del texto de ubicacion la resuelve `territorio`** —lectura nueva a partir de `lugarId` + `calleId` opcional—, consumida por un puerto propio de `reportes`. Esa misma lectura **valida** que lugar y calle existan, esten activos y sean del tenant | Es la decision 16 de `constancias-oficios` aplicada por segunda vez: subir `padreId` a mano desde `reportes` significa que `reportes` conoce el orden de los tipos de lugar, que es dominio de `territorio` y cambia sin avisarle. Ademas el import cruzado lo prohibe dependency-cruiser. Que la lectura valide de paso repite el hallazgo de GGA en el PR 30 (`RepositorioDeCalles.buscarPorId` en `altaDeDomicilio`): sin ese chequeo, un `lugarId` de otro tenant cae en un `23503` crudo de Postgres en vez de un `NoEncontradoError` limpio | Que `reportes` recorra la jerarquia: dos copias de una regla sutil. Guardar el texto ya compuesto que mande la UI: el cliente decide que dice el registro |
| 11 | **`personaId` nullable, y cuando es nulo el reporte es anonimo: no se guardan nombre, telefono ni correo sueltos** | **Decision del usuario** para el nullable; lo que esta propuesta cierra es la consecuencia. Un nombre y un telefono en columnas de `reportes` serian un **padron paralelo sin las reglas del padron**: sin fusion de duplicados, sin baja, sin la bitacora a nivel registro que el invariante 3 le exige al padron de apoyos. Si el municipio quiere poder volver a llamar al vecino, lo da de alta en `padron` —que es donde vive esa responsabilidad— y el reporte lo referencia. Y si el vecino solo quiere saber en que quedo, **el folio ya alcanza**: la consulta publica es precisamente el canal que evita pedirle el telefono | Columnas `nombreDeContacto`/`telefonoDeContacto`: el dato personal mas facil de filtrar del sistema, en la tabla con mas filas y menos control. Persona del padron obligatoria: friccion real para un reporte telefonico, y ya descartada por el usuario |
| 12 | **La consulta publica devuelve el folio consultado —el suyo, nunca otro—, tipo de incidencia, estado y las dos fechas —registro y ultimo movimiento— y nada mas. Sin segundo factor.** Nunca el reportante, nunca la descripcion, nunca el area asignada ni quien lo atiende, nunca la ubicacion. **Si el folio consultado es un duplicado, el estado y la fecha de ultimo movimiento son los del reporte original (decision 14), pero la fecha de registro es la PROPIA del reporte consultado. No dice que es un duplicado ni revela el folio del original.** **Todo caso negativo responde igual**: folio inexistente, de otro municipio o mal escrito | `constancias` necesito el codigo del QR porque su respuesta abre **datos de una persona** sobre un folio secuencial (decision 6 de `constancias-oficios`). Aca la respuesta **no contiene ni un dato personal**, asi que el segundo factor no protegeria nada y agregaria una columna y una rama sin consumidor. Lo que si se conserva es la restriccion: la descripcion y la referencia quedan afuera porque son las dos cajas libres del modulo (decision 13), y el area queda afuera porque "asignado a Obras Publicas" es informacion interna del municipio. **Seguir el vinculo no afloja nada de eso**: se devuelve el mismo puñado de campos, solo que leidos de otra fila. El folio del original queda afuera por dos razones sumadas —es enumerable, y es el reporte **de otro ciudadano**—. Y no se dice "duplicado" porque la pregunta de la vecina es "¿van a tapar la fuga?": la respuesta honesta a eso es "en atencion", no una nota de contabilidad interna que se lee como un no. **La fecha de registro es la excepcion al salto, y no es un detalle:** responde "¿cuando avise yo?", que es un hecho del reporte consultado y no del original. Devolver la del original le mostraria a quien reporto hoy una fecha de hace tres semanas — una respuesta que no corresponde a nada que esa persona haya hecho. El estado viaja porque describe la fuga; la fecha de registro se queda porque describe el aviso. La uniformidad de las negativas es el invariante 1 aplicado a una superficie publica. **Es el lado reversible**: mostrar un campo mas despues es facil; no poder deshacer lo que ya se leyo, no | Mostrar la descripcion "para que el vecino confirme que es su reporte": expone lo que un operador escribio, a cualquiera que recorra la serie. Devolver el folio del original "para que pueda seguirlo": le entrega el identificador del reporte de un tercero. Codigo de verificacion: maquinaria para proteger una respuesta que no tiene nada que proteger |
| 13 | **El modulo tiene DOS cajas de texto libre y solo dos: `descripcion` —obligatoria— y `referencia` —opcional, decision 9—. Las dos llevan las mismas tres protecciones:** etiqueta explicita en la UI sobre no anotar datos de vecinos, largo acotado, y **cero exposicion en cualquier superficie publica** (decision 12) | Un reporte sin descripcion no es accionable: "bache" no le dice a la cuadrilla si es un hoyo o una alcantarilla hundida. Y `referencia` no se absorbe dentro de `descripcion` porque responden preguntas distintas: la descripcion dice **que pasa**, la referencia dice **como llegar** —"frente a la tienda de la esquina"—, que es lo que la cuadrilla lee para encontrar el punto cuando la calle no tiene numero. La regla dura de `AGENTS.md`/`CLAUDE.md` cierra categorias sobre **datos de personas** —motivo de traslado, tipo de asunto—; describir la via publica no es eso. Pero un operador **puede** escribir "el bache frente a la casa de la señora Perez" en cualquiera de las dos, asi que **la proteccion se aplica a las dos por igual**: contar una sola caja y proteger una sola era el error que este punto corrige — la que quedaba afuera era justamente la que invita a nombrar un domicilio para orientar | Absorber `referencia` dentro de `descripcion`: una sola caja que mezcla que pasa con como llegar, y la cuadrilla tiene que leer un parrafo para sacar la ubicacion. Proteger solo `descripcion`: deja sin etiqueta, sin largo y sin filtro publico al campo cuyo proposito es senalar un punto por lo que tiene alrededor. Descripcion opcional: reportes vacios que nadie puede atender |
| 14 | **Un reporte duplicado apunta a su original: columna nullable `duplicadoDeReporteId` con FK compuesto autorreferencial `[duplicadoDeReporteId, ayuntamientoId] → [id, ayuntamientoId]`. Rechazar con motivo `DUPLICADO` exige ese vinculo y no se puede guardar sin el. Un duplicado apunta siempre a un reporte que NO es duplicado: si se marca duplicado de un duplicado, se guarda el original de la cadena. Invariante de dominio con test, no una intencion** | **Cuatro vecinos reportan la misma fuga.** Sin el vinculo, los tres ultimos quedan en `RECHAZADO` y la consulta publica les responde eso, palabra que se lee como "no lo vamos a hacer" — cuando el municipio si va a tapar la fuga bajo el folio del primero. **Es el problema que la fase venia a resolver, agravado:** antes el vecino no sabia nada; ahora cree que le dijeron que no. El vinculo convierte el rechazo en un reenvio: el estado que devuelve la consulta publica es el del original (decision 12), y la vecina lee "en atencion". El FK va **compuesto** por el mismo motivo que los otros tres (decision 17 de `constancias-oficios`): un FK simple reabre el bypass entre municipios, y que sea autorreferencial no cambia nada —`reportes` de A apuntando a `reportes` de B es exactamente el mismo agujero—. La cadena se prohibe porque sin eso la consulta publica tendria que **iterar**, y una columna que se puede escribir a mano es una columna que puede formar un ciclo: **resolviendo al original antes de guardar, la lectura publica es siempre un solo salto y nunca un bucle**, asi que ni un ciclo metido por SQL crudo cuelga la pagina —degrada a un estado equivocado, que es visible y acotado—. `RECHAZADO` sigue siendo terminal: esto no reabre la decision 5, solo cambia lo que se lee desde afuera. **Consumidor extra que sale gratis:** contar cuantos reportes apuntan al mismo original es la señal de urgencia que hoy se tira a la basura — cuatro vecinos reportando la misma fuga es un dato, no ruido | `DUPLICADO` sin vinculo: es lo que hacia la version anterior de esta propuesta, y le respondia "rechazado" a quien tenia razon. Fusionar las filas en una sola: se pierde que hubo cuatro reportes —o sea la señal de urgencia— y el folio que el segundo vecino tiene anotado deja de existir. Dejar que la consulta publica recorra la cadena: un ciclo introducido a mano se vuelve un bucle infinito en una superficie sin sesion. FK simple: bypass entre municipios, ya cerrado dos veces en este repo |
| 15 | **Al elegir lugar y tipo de incidencia en el alta, la pantalla lista los reportes abiertos (`RECIBIDO` o `EN_ATENCION`) que coinciden, antes de guardar. Es informativo: no bloquea el alta** | Prevenir el duplicado en origen cuesta menos que limpiarlo despues, y ademas le da al operador lo unico que no puede saber por su cuenta —"ya hay 2 fugas abiertas en esta calle"— en el momento en que sirve. **La decision 8 ya admitia que este buscador faltaba** y lo dejaba como una metrica a posteriori: contar `DUPLICADO` para enterarse de que hacia falta. Enterarse por un conteo lo que se puede evitar en la pantalla es diagnosticar en vez de curar. **No bloquea a proposito**: dos baches reales en la misma cuadra existen, y un alta que se niega a guardar obliga al operador a mentir en el tipo o en el lugar para poder registrar — que es peor que un duplicado, porque ensucia la clasificacion. La busqueda es por lugar + tipo + estado abierto: sin texto libre, asi que no hay que resolver similitud de descripciones | Bloquear el alta si hay coincidencia: obliga a falsear la clasificacion para poder registrar. Deteccion automatica por similitud de descripcion: adivina, y adivinar mal en la direccion contraria hace desaparecer un reporte legitimo. Solo el conteo de `DUPLICADO` a fin de mes: es enterarse tarde de algo que la pantalla podia evitar |

## Forma del esquema (indicativa — el detalle es de `sdd-design`)

```
reportes
  id                     uuid pk               -- interno, no enumerable
  ayuntamientoId         columnaTenant()
  folio                  text not null         -- "REP-2026-000123", publico
  anio, consecutivo      int not null          -- la serie
  tipo                   text CHECK cerrado    -- TipoDeIncidencia (decision 4)
  estado                 text CHECK cerrado    -- EstadoDeReporte (decision 5)
  areaResponsable        text null CHECK cerrado -- se asigna despues (decision 6)
  lugarId                uuid not null         -- FK compuesto a lugares
  calleId                uuid null             -- FK compuesto a calles
  referencia             text null             -- caja libre 2 de 2 (decision 13)
  descripcion            text not null         -- caja libre 1 de 2 (decision 13)
  personaId              uuid null             -- FK compuesto a personas
  motivoDeRechazo        text null CHECK cerrado
  duplicadoDeReporteId   uuid null             -- FK compuesto autorreferencial (decision 14)
  registradoPorUsuarioId uuid not null         -- not null: sin alta publica hoy
  registradoEn           timestamptz not null
  actualizadoEn          timestamptz not null
  unique(ayuntamientoId, folio)
  unique(ayuntamientoId, anio, consecutivo)
  unique(id, ayuntamientoId)
  index(ayuntamientoId, duplicadoDeReporteId)  -- contar duplicados de un original
  index(ayuntamientoId, lugarId, tipo, estado) -- buscador de similares (decision 15)

folios_de_reportes                             -- el contador (decision 2)
  ayuntamientoId, anio   pk compuesta
  ultimoConsecutivo      int not null CHECK (> 0)

movimientos_de_reportes                        -- solo agregado (decision 7)
  id, ayuntamientoId, reporteId, usuarioId, ocurridoEn
  estadoAnterior         text null CHECK cerrado
  estadoNuevo            text null CHECK cerrado  -- null si solo fue asignacion
  areaAsignada           text null CHECK cerrado
  motivo                 text null CHECK cerrado  -- solo en RECHAZADO
  foreignKey([reporteId, ayuntamientoId])
```

Las tres con `columnaTenant()` + `politicaTenant()` + `enableRLS()`, y en el
mismo archivo de migracion el `FORCE ROW LEVEL SECURITY`, los `GRANT` que
Drizzle no emite —solo `SELECT`/`INSERT` para `movimientos_de_reportes`, como
la bitacora— y los **tres** FK compuestos escritos a mano —`lugares`,
`calles` y `personas`—, siguiendo la cola de `drizzle/0004_padron.sql`.

El cuarto FK compuesto, el autorreferencial de `duplicadoDeReporteId`
(decision 14), **no va a mano: lo expresa Drizzle**. Lo que obliga a escribir
un FK a mano no es que sea compuesto ni que sea autorreferencial, sino que el
objeto de tabla destino viva en otro modulo y sea inalcanzable desde el
esquema. El precedente esta en el repo: `lugares_padre_tenant_fk`
(`src/modules/territorio/infrastructure/esquema.ts:49-53`) es exactamente esta
forma y drizzle-kit lo emite en `drizzle/0007_territorio.sql:64`.

## Capabilities

### New Capabilities

- `reportes-ciudadanos`: registro de incidencias con folio consecutivo por
  `(ayuntamiento, anio)` bajo lock en transaccion; clasificacion por tipo de
  incidencia y por area responsable, ambas cerradas; ubicacion por lugar +
  calle opcional + referencia, resuelta contra `territorio`; flujo de estados
  con transiciones cerradas y sin reapertura; asignacion de area restringida;
  vinculo opcional con una persona del padron; **vinculo de duplicado hacia el
  reporte original, sin cadenas ni autorreferencia, con conteo de cuantos
  apuntan al mismo**; **busqueda de reportes abiertos similares por lugar y
  tipo antes de guardar un alta**; historial de movimientos de solo agregado;
  presencia en la exportacion por ayuntamiento.
- `consulta-publica-de-reportes`: superficie sin sesion resuelta por
  subdominio; respuesta minima sin ningun dato personal; **un folio duplicado
  responde con el estado y las fechas de su original, sin revelar el folio de
  ese original ni decir que es duplicado**; respuesta uniforme para todo caso
  negativo; limitacion de ritmo por IP.

### Modified Capabilities

- `autorizacion-roles`: regla nueva `puedeAdministrarReportes`
  (`ADMIN_MUNICIPAL`) para cambiar de estado y asignar area. Registrar se
  apoya en `puedeEscribir`, que ya existe. Es la primera superficie de
  `reportes` en ese spec, que hoy no tiene ningun escenario del modulo.
- `jerarquia-territorial`: lectura nueva de **ubicacion compuesta como texto**
  a partir de `lugarId` + `calleId` opcional —sin domicilio ni residencia—,
  que valida pertenencia al tenant y vigencia, para consumidor externo
  (decision 10).
- `autenticacion-municipal`: la ventana `"folio"` de `TipoIntento` pasa a
  tener **dos superficies consumidoras**. Sin valor nuevo, sin migracion del
  `CHECK`: es la decision del usuario, y la consecuencia —una IP que valida
  constancias y consulta reportes comparte cuota— se declara aca porque es
  observable desde afuera.
- `padron-ciudadano`: **sin cambios.** Se declara explicitamente porque el
  vinculo opcional pudo haber pedido una lectura nueva y no la pide:
  `personaPorId` del barrel, consumido por un puerto propio de `reportes`
  como ya hace `lectorDeTitularesPorPadron.ts`, alcanza.
- `validacion-publica-de-folio`: **sin cambios.** Se declara porque la
  consulta publica de reporte pudo haber caido ahi y no lo hace: su contrato
  de respuesta es otro —sin segundo factor y sin ningun dato personal
  (decision 12)—, y fusionarlas obligaria a que un solo spec describa dos
  politicas de exposicion opuestas.

## Enfoque

- `domain`: `Folio` propio (no se importa el de `constancias` — cero
  acoplamiento entre modulos), uniones cerradas de tipo de incidencia, area,
  estado y motivo de rechazo, la funcion pura de transiciones validas, **la
  funcion pura que resuelve el original de una cadena de duplicados y la
  regla de que un duplicado nunca apunta a otro duplicado ni a si mismo**, y
  errores tipados (`TransicionInvalidaError`, `ReporteCerradoError`,
  `UbicacionInvalidaError`, `DuplicadoSinOriginalError`). Sin imports, ni de
  `shared`.
- `application`: `puertos.ts` con el repositorio, el contador y los
  movimientos; `puertosDeLectura.ts` con las lecturas hacia `territorio` y
  `padron`; un archivo por caso de uso (`registrarReporte`,
  `cambiarEstadoDeReporte`, `asignarAreaDeReporte`, `reportePorId`,
  `listarReportes`, `buscarReportesSimilares`, `consultarFolioDeReporte`).
  Todo lo que toca base dentro de un solo `withTenant`, con el folio, el
  movimiento y la bitacora en la misma transaccion. **Marcar duplicado no es
  un caso de uso aparte**: es `cambiarEstadoDeReporte` con motivo `DUPLICADO`
  y el id del original, para que la transicion, el vinculo y el movimiento
  confirmen o fallen juntos.
- `infrastructure`: `esquema.ts` con el nombre exacto que espera
  `drizzle.config.ts:31`, adaptadores como objeto literal, y los dos lectores
  cruzados que importan los barrels de `territorio` y `padron` y abren su
  propio `withTenant`.
- `ui`: Server Components; el formulario de alta y el cambio de estado por
  Server Actions. Ocultar el boton de asignar no es autorizacion: la guarda
  vive en el caso de uso. El buscador de similares (decision 15) es la unica
  pieza que reacciona a lo que el operador va eligiendo, asi que es la
  candidata a `"use client"` **en la hoja** — `sdd-design` decide si se
  resuelve con un Server Action sobre el formulario o con una hoja cliente.
- El caso de uso publico tiene **firma propia y declarada**, igual que
  `validarFolio`: `(ayuntamientoId, folio) => …`, sin `ContextoActual` y sin
  `usuario`. Es la segunda vez que el repo la necesita, lo cual la confirma
  como clase y no como excepcion.
- Tests de aislamiento en la raiz del modulo, **tres**: uno por tabla nueva.
  El de `reportes` cubre ademas el caso autorreferencial —una fila de A que
  intenta apuntar a un reporte de B como su original tiene que ser rechazada
  **por Postgres**, no solo por el caso de uso—.

## Areas afectadas

| Area | Impacto | Que cambia |
|---|---|---|
| `src/modules/reportes/` | Nuevo | Modulo completo, cuatro capas, tres tests de aislamiento |
| `drizzle/` | Nuevo | Migracion con tres tablas, RLS, `FORCE`, `GRANT` y **cuatro** FK compuestos a mano, uno de ellos autorreferencial (decision 14) |
| `src/shared/auth/roles.ts` | Modificado | `puedeAdministrarReportes` (decision 6) |
| `src/modules/territorio/{application,infrastructure}` | Modificado | Lectura nueva de ubicacion compuesta (decision 10) |
| `src/app/reportes/[folio]/` | Nuevo | Ruta publica fuera de `(panel)` y `(acceso)`, analoga a `app/validar/[folio]` |
| `src/app/(panel)/reportes/` | Nuevo | Listado, detalle con historial, y alta con buscador de similares (decision 15) |
| `src/shared/exportacion/` | Modificado | `PorcionExportable` de `reportes` |
| `src/shared/auth/intentosAcceso.ts` | **Sin cambios** | Se reusa `"folio"`; se declara porque la exploracion lo dejo como candidato |

## Invariantes que toca

| Invariante / escenario | Como lo toca |
|---|---|
| 1 — Aislamiento | Tres tablas nuevas con `ayuntamiento_id`, `FORCE RLS` y su test cada una. La pagina publica resuelve el tenant por `ayuntamientoActual()`, **jamas por la URL ni por el folio**. **El FK autorreferencial de duplicados va compuesto (decision 14): que apunte a la misma tabla no lo hace mas seguro —`reportes` de A referenciando `reportes` de B es el mismo bypass— y ademas es el unico que la aplicacion puede escribir con un id que llega de un formulario.** T1, T3, T4, T5 |
| 2 — Folios | Aplica la mecanica: serie por ayuntamiento, lock en la misma transaccion, sin secuencia. **No aplica la inmutabilidad, y eso se declara (decision 1).** T6 y T7 con test de integracion, en la misma rebanada que la tabla |
| 3 — Datos personales | Tipo, area, estado y motivo son categorias cerradas; la descripcion y la referencia son las dos unicas cajas libres y ninguna se publica (decision 13); **no hay datos de contacto sueltos** (decision 11); la superficie publica no devuelve ni un dato de persona (decision 12), **y al seguir el vinculo de un duplicado sigue sin devolverlo: no expone el folio del original, que es el reporte de otro ciudadano** |
| 5 — Auditoria | `REGISTRAR_REPORTE`, `CAMBIAR_ESTADO_REPORTE` y `ASIGNAR_AREA_REPORTE` en la misma transaccion, **solo ids**. El motivo va en su columna tipada de `movimientos_de_reportes`, nunca en la traza. Marcar duplicado usa la misma accion de cambio de estado: la transicion, el vinculo y el movimiento confirman o fallan juntos |
| T8 — Consulta publica de folio | Decision 12, con la diferencia de contrato explicada frente a `constancias` |
| T11 — Exportacion | `reportes` aporta su `PorcionExportable` con columnas listadas una por una, nunca `select()` pelado |
| 4 — Marca y assets | **No lo toca.** No hay fotografias ni assets en esta fase (fuera de alcance) |

## Riesgos

| Riesgo | Sev. | Mitigacion |
|---|---|---|
| El catalogo fijo de areas no corresponde al organigrama del piloto y hay que rehacerlo | **Alta** | Seis valores con `SERVICIOS_GENERALES` como destino de lo que no encaja; agregar o renombrar es una migracion de `CHECK`, y el `areaResponsable` es nullable, asi que un reporte nunca se traba por no tener area. **Se revisa con el piloto antes de la rebanada 5** |
| El flujo se traba porque el `ADMIN_MUNICIPAL` no esta y nadie mueve los reportes | **Alta** | Registrar nunca se bloquea (decision 6). Aflojar la regla es cambiar una funcion pura de una linea. **Se observa en el piloto**, no se predice |
| Dos registros concurrentes toman el mismo folio, o un rollback deja un hueco | **Alta** | Decision 2 con test de integracion de T6 y T7 en la misma rebanada que la tabla, **no despues** |
| Un modulo futuro guarda `reporte_id` o `persona_id` con FK simple y reabre el bypass entre municipios | **Alta** | Cuatro FK compuestos a mano desde el dia uno + escenario de aislamiento explicito en el spec |
| **La vecina que reporto segunda lee `RECHAZADO` y cree que le dijeron que no**, cuando el municipio si va a tapar la fuga | **Alta** | Es el hueco que encontro la revision de esta propuesta. Decision 14: el duplicado apunta al original y la consulta publica devuelve **el estado del original**. Criterio de exito explicito, y el test va en la misma rebanada que el vinculo |
| Una cadena o un ciclo de duplicados cuelga la pagina publica | Media | La resolucion al original ocurre **antes de guardar** (decision 14), asi que la lectura publica es siempre **un solo salto y nunca itera**: un ciclo metido por SQL crudo degrada a un estado equivocado —visible y acotado—, no a un bucle infinito en una superficie sin sesion. Invariante de dominio con test, no una intencion |
| El operador ignora el buscador de similares y duplica igual | Media | **Se acepta a proposito:** el buscador informa, no bloquea (decision 15), porque un alta que se niega a guardar empuja a falsear el tipo o el lugar, que ensucia la clasificacion de forma permanente. El vinculo de la decision 14 es la red debajo, y contar `DUPLICADO` mide si el buscador esta sirviendo |
| El estado que ve la vecina depende de un reporte que ella no controla: si el original se rechaza por otro motivo, lee `RECHAZADO` | Baja | Es **correcto** —si el municipio rechazo la fuga, eso es lo que pasa con su reporte tambien— pero puede sorprender. Se declara en vez de agregar una rama que lo disfrace |
| La descripcion y la referencia acumulan datos de vecinos escritos por el mostrador | Media | Etiqueta explicita en la UI, largo acotado, cero exposicion publica **en las dos** (decisiones 12 y 13). **No es una garantia tecnica y se declara como tal**: son las dos cajas libres del modulo y no hay forma de validarlas por tipo. La `referencia` es la mas expuesta al problema, porque su proposito —senalar un punto por lo que tiene alrededor— invita a nombrar un domicilio |
| La ventana `"folio"` compartida deja a una institucion sin poder validar constancias porque alguien consulto reportes desde la misma IP | Media | **No medido, declarado.** Es la consecuencia aceptada de la decision del usuario. Ninguna de las dos superficies devuelve dato personal sin segundo factor, asi que el limite protege contra raspado, no contra fuga; si duele, separar la ventana es agregar un valor a `TipoIntento` |
| El vecino espera enterarse solo y nadie le avisa que hay pagina de folio | Media | **Riesgo de producto, no tecnico.** El folio se entrega impreso o dictado en el momento del registro; sin canal push (WhatsApp diferido) es la unica via, y la fase no promete otra |
| La lectura nueva de `territorio` se disena para `reportes` y no le sirve a nadie mas | Baja | Es el mismo criterio con el que `territorio` ya expuso dos lecturas para `constancias` (decision 16 de `constancias-oficios`): la regla vive donde vive el dominio |
| El presupuesto de revision se desborda ~4x | Media | Ocho rebanadas secuenciales contra `main`, ninguna por encima de 800 lineas. El dominio puro se separo del esquema justo por esto (ver presupuesto) |

## Presupuesto de revision

`delivery_strategy: ask-on-risk`, presupuesto **800 lineas** por rebanada
(mismo que `constancias-oficios`). Estimacion honesta:

| Tramo | Lineas aprox. |
|---|---|
| Lectura nueva en `territorio` + tests | 300 |
| Esquema + migracion (3 tablas, `FORCE`, `GRANT`, 4 FK a mano, 2 indices) | 280 |
| Dominio (`Folio`, cuatro uniones, transiciones, resolucion de cadena de duplicados, errores) + tests | 420 |
| Tests de aislamiento (3) | 260 |
| Puertos de lectura hacia `territorio` y `padron` + tests | 200 |
| `registrarReporte` + contador + concurrencia + tests | 480 |
| Estados, asignacion y **vinculo de duplicado** + `puedeAdministrarReportes` + tests | 500 |
| Consulta publica (ruta, ritmo, caso de uso publico, **resolucion del vinculo**) + tests | 380 |
| **Buscador de similares** (puerto, consulta, caso de uso) + tests | 110 |
| UI de mostrador (listado, detalle, alta **con buscador**, transiciones) | 520 |
| Exportacion + docs | 130 |
| **Total** | **~3.580** |

Las decisiones 14 y 15 agregan **~430 lineas**, no las ~140 que estimo la
revision. La diferencia no esta en la columna ni en la pantalla —esas si son
chicas— sino en lo que arrastran: la resolucion de cadena es una regla de
dominio con su test (~90), el vinculo entra en el caso de uso de transicion y
tiene que validar que el original exista, sea del tenant y no sea a su vez un
duplicado (~80), la consulta publica gana una rama con sus casos (~50), y el
buscador necesita puerto, consulta indexada, caso de uso y una pieza de UI
que reacciona a la seleccion (~200). Se escribe la diferencia en vez de
esconderla: **es el patron de siempre —lo que se ve es la columna, lo que
cuesta es el invariante que la sostiene**.

Mas de **cuatro veces** el presupuesto, y la regla del repo es "Un PR, un
merge. Las ramas no se apilan": rebanadas secuenciales contra `main`. **La
rebanada 2 anterior (~860) ya rozaba el techo y ahora lo pasaria, asi que se
ejecuta el corte que la propia propuesta dejaba anotado: el dominio puro sale
a su propia rebanada, sin base de datos.** Corte propuesto (lo afina
`sdd-tasks`):

1. **Lectura de ubicacion en `territorio`** (~300) — va sola y primero: es un
   cambio en otro modulo y su diff debe leerse como lo que es.
2. **Dominio puro** (~420) — `Folio`, cuatro uniones cerradas, transiciones
   validas, resolucion del original de una cadena de duplicados, errores
   tipados. **Sin base de datos**: corre en la suite `unit` y se revisa como
   lo que es, reglas sin IO.
3. **Esquema y aislamiento** (~540) — tres tablas, migracion con
   RLS/`FORCE`/`GRANT`, cuatro FK compuestos —tres a mano y el autorreferencial
   por Drizzle— y los dos
   indices, mas los tres tests de aislamiento. Es la rebanada que toca
   tenancy y va sola a proposito.
4. **Puertos de lectura + `registrarReporte`** (~680) — folio bajo lock con
   sus tests de T6 y T7, ubicacion validada, vinculo opcional con padron,
   bitacora.
5. **Estados, asignacion y vinculo de duplicado** (~500) — transiciones,
   `puedeAdministrarReportes`, `duplicadoDeReporteId` con su validacion,
   movimientos, bitacora. **Compuerta: revisar el catalogo de areas con el
   piloto antes de esta rebanada.**
6. **Consulta publica** (~380) — ruta sin sesion, respuesta minima, salto al
   original cuando el folio es duplicado, respuesta uniforme en negativos,
   ritmo reusando `"folio"`.
7. **Buscador de similares y UI de mostrador** (~630) — puerto y consulta por
   lugar + tipo + estado abierto, listado con filtros, detalle con historial,
   alta con el buscador, transiciones. El buscador va **con** la UI y no
   antes: un puerto de busqueda sin la pantalla que lo consume no se puede
   revisar por lo que hace.
8. **Exportacion y docs** (~130).

## Plan de rollback

Toca tenancy, folios, datos personales, auditoria y una superficie publica,
asi que es obligatorio y tiene tres regimenes:

- **Antes del primer reporte real:** revertir el PR y bajar la migracion. Las
  tres tablas se dropean sin perdida. `lugares`, `calles` y `personas` no se
  tocan en ningun momento —solo se referencian—, y la lectura nueva de
  `territorio` es aditiva: quitarla no cambia ninguna lectura existente.
- **Despues del primer reporte real:** revertir el codigo y **dejar las
  tablas**. Son aditivas y nadie mas las lee; dropearlas destruye el registro
  de lo que el municipio recibio y atendio, que es justo lo que la fase
  produce y no se reconstruye.
- **Rollback de la superficie publica sola:** la ruta `/reportes/{folio}` se
  puede quitar sin tocar nada mas. El folio sigue existiendo en el papel y en
  el panel; lo unico que se pierde es que el vecino consulte solo. Es la
  palanca de emergencia si aparece un problema de exposicion en produccion.
- **Un rechazo equivocado no se deshace** (decision 5): `RECHAZADO` es
  terminal. El camino es registrar el reporte de nuevo, con folio nuevo, y el
  rechazo errado queda en el historial con su motivo. Se escribe aca para que
  no se descubra buscando el boton. **Vale igual para un duplicado marcado
  contra el original equivocado**: el vinculo se congela con el rechazo, asi
  que la correccion es un reporte nuevo, no un `UPDATE` de la columna.
- **Rollback del vinculo de duplicado solo:** `duplicado_de_reporte_id` es
  nullable y aditiva. Quitar la rama de la consulta publica devuelve a la
  vecina el `RECHAZADO` crudo —o sea, reintroduce el problema— pero no pierde
  ni un dato: la columna se queda escrita y la rama se puede volver a poner.

## Dependencias

- **Sin paquetes nuevos.** Sin extensiones nuevas de Postgres. Todo el
  mecanismo —folio bajo lock, limitacion de ritmo, bitacora, puertos de
  lectura cruzados— ya existe y corre en produccion.
- La rebanada 4 depende de la 1, la 2 y la 3 mergeadas; la 5, la 6 y la 7
  dependen de la 4. La 6 depende ademas de la 5, porque el salto al original
  no se puede probar sin el vinculo escrito.
- `commitlint.config.mjs` ya trae `"reportes"` en `scope-enum` y
  `docs/architecture/estructura.md:38` ya nombra el modulo: **no hay
  prerrequisito de andamiaje**.
- **Dependencia de producto, no tecnica:** confirmar el catalogo de areas con
  el municipio piloto antes de la rebanada 5.

## Criterios de exito

- [ ] Dos registros simultaneos en el mismo municipio producen folios
      distintos y consecutivos, **sin huecos**.
- [ ] Un registro que falla despues de tomar folio **no consume el folio**.
- [ ] Dos municipios registran `REP-2026-000001` el mismo dia sin colisionar.
- [ ] El primer reporte del anio siguiente arranca en `000001`, y uno
      registrado el 31 de diciembre a las 19:00 hora de Merida lleva el anio
      que ve la persona, no el de UTC.
- [ ] Un `OPERADOR` registra un reporte; **no** cambia su estado ni le asigna
      area.
- [ ] Pasar de `RESUELTO` o `RECHAZADO` a cualquier otro estado falla con
      error tipado de dominio, sin tocar la base.
- [ ] Cada cambio de estado y cada asignacion dejan fila en
      `movimientos_de_reportes` con usuario y momento, y esa tabla **no tiene
      permiso de `UPDATE` ni de `DELETE`**.
- [ ] Un reporte se registra **sin persona del padron** y queda consultable
      por folio.
- [ ] `reportes` no guarda nombre, telefono ni correo del reportante en
      ninguna columna.
- [ ] Reparentear la colonia **cambia** el texto de ubicacion que ve la
      cuadrilla —al reves que una constancia emitida, que no cambia—.
- [ ] Un `lugarId` o `calleId` de otro municipio es rechazado con
      `NoEncontradoError`, **no** con un error crudo de Postgres, y ademas es
      rechazado por el FK compuesto a nivel base.
- [ ] `/reportes/{folio}` responde estado y fechas **sin nombre, sin
      descripcion, sin ubicacion y sin area**.
- [ ] **La consulta publica de un reporte duplicado devuelve el estado y las
      fechas del original —"en atencion"— y nunca `RECHAZADO`**, sin revelar
      el folio del original y sin decir que es un duplicado.
- [ ] **Marcar duplicado de un reporte que ya es duplicado guarda el original
      de la cadena**: no existe fila con `duplicadoDeReporteId` apuntando a un
      reporte que a su vez es duplicado, ni a si misma. La consulta publica da
      **un solo salto**, nunca itera.
- [ ] Rechazar con motivo `DUPLICADO` **sin** el id del original falla con
      error tipado; el estado, el vinculo y el movimiento se escriben en la
      misma transaccion o no se escribe ninguno.
- [ ] **Un `duplicadoDeReporteId` de otro municipio es rechazado por el FK
      compuesto a nivel base**, no solo por la aplicacion.
- [ ] Contar cuantos reportes apuntan al mismo original es una consulta
      directa sobre el indice, sin recorrer la tabla.
- [ ] **El alta muestra los reportes abiertos del mismo lugar y tipo antes de
      guardar**, y **no bloquea**: dos baches reales en la misma calle se
      registran igual.
- [ ] Un folio inexistente, uno de otro municipio y uno mal escrito devuelven
      **exactamente la misma respuesta**.
- [ ] Recorrer folios consecutivos desde la pagina publica agota la ventana de
      ritmo, y la clave contada es la IP, **nunca el folio**.
- [ ] Un usuario del municipio A no ve, ni por id directo, un reporte de B.
- [ ] `pnpm test`, `pnpm test:integration` y `pnpm check` en verde, con la
      cobertura de `modules/reportes/{domain,application}` sobre el piso.

## Ronda de preguntas de propuesta

Las cuatro preguntas que dejo la exploracion ya vienen decididas por el
usuario y **no se reabren**. La revision de esta propuesta encontro un hueco
real —el duplicado que se leia como un no— y esta cerrado en las decisiones
14 y 15. Estas son las seis que quedan para revisar antes de `sdd-spec`:

1. **La alta publica desde el portal queda fuera de la fase.** Es la
   desviacion mas grande respecto de lo que `docs/05-seguridad.md` §10
   insinua, aunque el roadmap no la enumere. Si el usuario la quiere adentro,
   entra una rebanada mas (~350 lineas), la primera escritura sin sesion del
   repo, y `registrado_por_usuario_id` nace nullable. **Con la decision 15
   sube el costo**: un portal sin buscador de similares es una fabrica de
   duplicados, asi que ese buscador tendria que existir tambien del lado
   publico, y ahi ya no hay operador que lea la lista.
2. **La respuesta publica de un duplicado no dice que es duplicado
   (decision 12).** Devuelve el estado del original y se calla el resto. Es la
   eleccion mas discutible de las dos nuevas: se prefirio responder la
   pregunta que la vecina hizo —"¿van a taparla?"— en vez de explicarle una
   contabilidad interna que se lee como un no. Si el usuario prefiere decirlo
   —"tu reporte se atiende junto con otro"— es una frase mas en la pantalla y
   **ningun cambio de contrato**: sigue sin exponer el folio del original.
3. **Sin datos de contacto sueltos cuando no hay persona del padron
   (decision 11).** Es la consecuencia mas dura del `personaId` nullable: un
   reporte anonimo es anonimo de verdad y el municipio **no** puede volver a
   llamar al vecino. La decision 14 la abarata —ahora el folio del duplicado
   si responde algo util, asi que la consulta publica cubre mas casos de los
   que cubria—, pero si el piloto necesita el telefono, la salida honesta
   sigue siendo dar de alta a la persona en `padron`, no agregar columnas.
4. **Sin reapertura de reportes (decision 5).** Si el piloto trabaja
   reabriendo —"el bache volvio, es el mismo"— la union cerrada de
   transiciones cambia y el conteo de tiempos de atencion pasa a necesitar
   otra definicion. La decision 14 **no** la reabre: un duplicado sigue
   terminando en `RECHAZADO`, lo unico que cambia es lo que se lee desde
   afuera.
5. **Los seis valores de `AreaResponsable` (decision 3)**, que se eligieron
   por lectura de las cinco categorias del roadmap y no contra un organigrama
   real. Es la revision de una lista, no un cambio de diseño, y es la
   compuerta antes de la rebanada 5.
6. **La consulta publica sin segundo factor (decision 12).** Depende de que la
   respuesta se quede sin ningun dato personal, y **seguir el vinculo no lo
   cambia**: se devuelven los mismos campos, leidos de otra fila, sin el folio
   del original. Si mas adelante se quiere mostrar la descripcion o la
   ubicacion, **primero** hace falta el codigo de verificacion, y ese orden no
   es negociable.
