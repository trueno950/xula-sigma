# Propuesta: Constancias y oficios (Fase 2)

**Cambio:** `constancias-oficios` · **Base:**
`openspec/changes/constancias-oficios/exploration.md` · **Precedente:**
`openspec/changes/archive/2026-08-29-capa-territorial/`

## Intencion

Fase 1 termino sabiendo **quien** (`padron`) y **donde** (`territorio`), y
las dos se construyeron citando a esta fase como su consumidor: la decision
11 de `capa-territorial` existe literalmente para que la constancia pueda
congelar una direccion. Hoy ese conocimiento no sale del sistema en ninguna
forma que un ciudadano se pueda llevar.

El problema de negocio no es imprimir un PDF: es que **el tramite mas
frecuente del ayuntamiento sigue siendo una plantilla de Word con un folio
escrito a mano**. Eso produce tres fallas que el municipio ya sufre y no
puede resolver solo: folios repetidos o saltados sin manera de auditar,
ninguna forma de saber si el papel que alguien presenta lo emitio el
municipio, y ningun registro de que se emitio, a quien y cuando.

Exito: la operadora de Motul busca al vecino, ve su domicilio vigente,
emite en un clic, entrega una hoja carta con folio y QR; el banco que la
recibe escanea el codigo y confirma que es autentica; y seis meses despues
el municipio puede decir cuantas constancias emitio, a quien, y quien las
reimprimio.

**Es el hito de primer ingreso** (`ROADMAP.md:189,208`). Todo lo que sigue
esta escrito con ese peso encima.

## Decision de alcance: una constancia, no cuatro documentos

El roadmap lista cuatro tipos —vecindad, ingresos, cartas, oficios—. **Esta
entrega trae la maquinaria completa y un solo tipo: la constancia de
vecindad.** No es un recorte por presupuesto de lineas; son tres razones
distintas:

1. **El formato no esta validado** (ver la seccion siguiente). Construir
   cuatro plantillas antes de que el piloto vea una impresa multiplica por
   cuatro el retrabajo del unico riesgo grave de esta fase.
2. **Un tipo mas es aditivo y se puede demostrar que lo es.** El contador ya
   esta indexado por tipo (decision 1), el prefijo sale de una union cerrada
   (decision 3) y la plantilla es un componente. Un tipo nuevo no toca ni
   una tabla, ni una politica RLS, ni un test de aislamiento. Si esa
   afirmacion resultara falsa, se descubre agregando el segundo tipo, no el
   cuarto.
3. **Los otros tres no son "la misma cosa con otro texto".** La constancia
   de ingresos certifica un monto que el municipio **no puede verificar**:
   quien lo declara, con que respaldo y si el ayuntamiento acepta esa
   exposicion es una pregunta legal, no de plantilla. Y un **oficio no se le
   emite a una persona**: va dirigido a una institucion, asi que ni siquiera
   ancla en `personaId`. Es una capability distinta con su propia propuesta,
   no la cuarta pestania de esta.

**Fuera de esta entrega, con su razon escrita:** constancia de ingresos
(regla de negocio ausente), cartas (sin muestra ni destinatario definido),
oficios (destinatario institucional, propuesta propia).

## El riesgo de producto que se acepta con los ojos abiertos

El roadmap pide como insumo previo "una constancia real emitida por el
municipio piloto. El formato, encabezado, leyenda y ubicacion del sello no
se inventan" (`ROADMAP.md:204-206`). **La decision del usuario invierte
eso**: se disena un formato propio y se espera que el municipio se adapte.
Se escribe aca para que nadie lo relea despues como un descuido.

Por que duele mas de lo que parece: el formato es JSX fijo estilado con el
subconjunto de flexbox de `@react-pdf/renderer` (`docs/06-frontend.md:487-497`),
asi que **iterar el diseno es un despliegue, no una configuracion**. Un
secretario municipal que ve la primera hoja impresa y dice "el escudo va del
otro lado y falta la leyenda de la Ley Organica" cuesta un ciclo completo de
desarrollo, justo en la fase que el roadmap marca como el primer ingreso.

**Mitigacion, en tres piezas concretas y no negociables:**

- **Una ronda de revision visual con el piloto, con una hoja impresa en su
  propia impresora, entre la rebanada 5 (render) y la 6 (reimpresion).** La
  fase **no cuenta como vendible** hasta que esa ronda cierre. Es una
  compuerta del plan, no una sugerencia.
- **Las partes que mas probablemente esten mal salen de configuracion, no de
  codigo**: nombre y cargo de quien firma, y la leyenda de pie (decision 9).
  Esa es la razon por la que la configuracion entra en la primera entrega y
  no despues — es la valvula de escape medida del riesgo, no una abstraccion
  especulativa.
- **Se emite contra el piloto solo despues de esa ronda.** Antes de la
  primera emision real no hay documentos que preservar, asi que iterar la
  plantilla es gratis; despues, cada version vieja se queda viva en el
  codigo (decision 12).

Lo que **no** se hace: un editor de layout por ayuntamiento. Es exactamente
la abstraccion especulativa que `AGENTS.md` rechaza, y construirla antes de
saber si el formato base sirve seria pagarla dos veces.

## Alcance

**Dentro:** modulo nuevo `src/modules/constancias/` con sus cuatro capas;
tablas `constancias`, `folios_de_documentos` (contador) y `reimpresiones`,
las tres con RLS + `FORCE` + su test de aislamiento; columna `documentos`
`jsonb` en `ayuntamientos` validada con Zod, con su propio test de
aislamiento espejo de `escudo.isolation.test.ts`; FK compuesto a mano hacia
`personas(id, ayuntamiento_id)`; value object `Folio`; emision con folio bajo
lock en la misma transaccion; snapshot congelado de persona + direccion +
fecha de residencia; render de PDF en hoja carta por Route Handler, con QR
embebido; reimpresion con marca de agua y motivo de categoria cerrada;
cancelacion con motivo de categoria cerrada; pagina publica de validacion de
folio con limitacion de ritmo; regla de rol nueva
`puedeAdministrarDocumentos`; **dos lecturas nuevas en `territorio`**
(residencia vigente y direccion compuesta como texto, decision 16);
`PorcionExportable` de `constancias`.

**Fuera:** los otros tres tipos de documento (ver seccion anterior); editor
de plantillas por ayuntamiento; firma electronica y sello digital (decision
10); envio por correo o WhatsApp; cobro del tramite —**esto no es tesoreria**
(`CLAUDE.md`)—; solicitud del tramite por el ciudadano desde el portal;
persistencia del binario del PDF en cualquier forma; periodo minimo de
residencia como validacion del sistema (decision 18); CURP impresa (decision
18); reimpresion de una constancia cancelada; edicion de un documento
emitido —el invariante 2 la prohibe y no hay caso de uso que la contemple—.

## Decisiones cerradas

| # | Decision | Por que | Alternativa descartada |
|---|---|---|---|
| 1 | **El contador es por `(ayuntamientoId, tipo, anio)`**, no uno solo por ayuntamiento. La serie reinicia cada anio civil | El roadmap dice "por ayuntamiento (no folio global compartido entre tenants)": el contraste que traza es **tenant contra global**, no tipo contra unico — no prohibe series por tipo. Y un contador unico produce el defecto que el invariante 2 existe para evitar: si constancias y oficios comparten serie, la serie de constancias vista sola es 47, 49, 53 — **huecos en toda la serie de cada tipo**, y un hueco en documentos oficiales "es una pregunta que nadie quiere responder en una auditoria". El anio esta evidenciado dos veces: `AGENTS.md` (Fecha y hora) advierte que "una constancia emitida el 31 de diciembre a las 19:00 caeria con el anio siguiente **en el folio**" —el folio lleva anio— y `module-template.md:127` firma `Folio.crear(prefijo, anio, consecutivo)`. Es ademas la practica municipal mexicana: cada serie se archiva por anio | Contador unico por ayuntamiento: mas simple en la tabla y peor en el papel, que es donde se audita. Serie continua sin reinicio: obliga a explicar por que el folio lleva un anio que no significa nada |
| 2 | **`INSERT … ON CONFLICT (ayuntamiento_id, tipo, anio) DO UPDATE SET ultimo = contador.ultimo + 1 RETURNING ultimo`**, una sola sentencia, dentro de la misma transaccion del `INSERT` de la constancia | Es la lectura directa del invariante 2 ("lock sobre el contador del tenant"): el `DO UPDATE` toma lock de fila y la transaccion concurrente espera al COMMIT. **Y resuelve el arranque sin fila semilla**: la primera constancia del anio crea su renglon en la misma sentencia. La variante con `UPDATE … RETURNING` a secas exige que la fila exista, o sea o una semilla por tenant y por tipo al provisionar, o una rama "si no actualizo nada, inserta" — y esa rama es justo donde vive la condicion de carrera. Rollback: el renglon vuelve atras con la transaccion, el folio no se consume (T7) | `SELECT … FOR UPDATE` + `UPDATE`: mismo resultado con dos sentencias, una ventana mas y un `FOR UPDATE` que alguien puede olvidar en un refactor. Advisory lock: un segundo mecanismo para la misma garantia, el mismo argumento con el que `capa-territorial` §8 lo descarto. Secuencia de Postgres: antipatron 9 de `AGENTS.md`, deja huecos |
| 3 | **Folio: `{PREFIJO}-{AAAA}-{NNNNNN}`** — `VEC-2026-000001`. Prefijo de una union cerrada por tipo, anio de `hoyEnMerida()`, consecutivo con `padStart(6, "0")` que **nunca trunca** | Coincide con el unico precedente escrito del repo (`module-template.md:127`), asi que no hay que corregir el doc. El anio sale de `shared/lib/fecha` y no de `getFullYear()`: `AGENTS.md` documenta exactamente este bug con este ejemplo. El ancho del relleno solo afecta el texto en el momento de emitir —despues se guarda congelado en una columna—, asi que equivocarse en el ancho no es retroactivo; lo que si importa es que el consecutivo 1.000.000 **se imprima con siete digitos y siga siendo unico**, no que reviente | Prefijo configurable por ayuntamiento: una superficie de configuracion mas sin consumidor, y el folio no necesita ser unico entre municipios porque el subdominio ya separa. Folio sin prefijo ni anio: no distingue series y contradice la decision 1 |
| 4 | **Tres identificadores distintos con propiedades opuestas y a proposito:** `id` uuid interno no enumerable, `folio` texto publico y secuencial, `codigoVerificacion` aleatorio de alta entropia que **solo viaja dentro del QR** | `docs/05-seguridad.md:66-72` pide ids internos no enumerables; el folio es secuencial **porque el invariante lo exige**. Los dos no pueden ser la misma columna. El tercero existe por la decision 6: sin el, un folio secuencial es una superficie de enumeracion contra el padron | Usar el folio como id interno: cualquiera recorre la serie. Un solo identificador que sea las dos cosas: no existe |
| 5 | **El QR apunta a la pagina publica de validacion, nunca al PDF.** `https://{subdominio}/validar/{folio}?c={codigo}` | Un QR que descarga el documento convierte cada papel entregado en una URL permanente que sirve el nombre y el domicilio de una persona a cualquiera que fotografie la hoja. El PDF vive **solo** dentro del panel autenticado (decision 11). La validacion es la funcion que pide el roadmap: confirmar, no repartir | El QR con la URL del PDF: es el camino "obvio" y es una fuga de datos personales por diseno |
| 6 | **La validacion publica responde en dos niveles.** Con `folio` solo: vigente/no valido, tipo de documento y fecha de emision — **nada de la persona**. Con `folio` + `codigo` correcto (o sea, teniendo el papel): agrega el nombre del titular y el texto congelado de la direccion, para que quien recibe compare contra lo impreso. **Todo lo negativo responde igual**: folio inexistente, folio de otro municipio, codigo equivocado y documento cancelado dan la misma respuesta generica | El folio es secuencial **por invariante**, asi que sin segundo factor la pagina publica es un lector paginado del padron: `VEC-2026-000001`, `000002`, `000003`. El codigo en el QR restaura la propiedad que el folio no puede tener. La uniformidad de las respuestas negativas es el invariante 1 aplicado a una superficie publica ("no existe" y "no te lo puedo mostrar" son la misma respuesta, `errores.ts:25-33`) y T8 ("confirma validez sin exponer datos de terceros"). **Se elige el lado restrictivo porque es el reversible**: aflojar despues es mostrar un campo mas; apretar despues es no poder deshacer lo que ya se leyo | Mostrar el nombre con solo el folio: es la enumeracion. Distinguir "cancelada" de "no existe": le confirma a quien enumera que el folio existe, y no le sirve de nada a quien tiene el papel — para el, "no valido" ya es la respuesta completa |
| 7 | **El caso de uso publico tiene firma propia y declarada:** `validarFolio({ ayuntamientoId, folio, codigo }) => ResultadoDeValidacion`. Sin `ContextoActual`, sin `usuario`, sin `origen` | `ContextoActual` exige `usuario: {id, rol}` (`contexto.ts:25-38`) y `contextoActual()` devuelve `null` sin sesion: **no se puede construir uno para un visitante anonimo**, y falsificarlo con un usuario de mentira seria meterle un actor inexistente a la bitacora. El `ayuntamientoId` sale de `ayuntamientoActual()`, que ya resuelve por subdominio sin sesion y ya lo usan las tres paginas de `(acceso)`. Es la primera vez que el repo necesita esta forma: se declara como clase propia —"caso de uso publico"— y **no se parece a la firma autenticada a proposito**, para que nadie pueda pasar uno donde va el otro | Fabricar un `ContextoActual` con usuario sintetico: contamina la bitacora y vuelve indistinguible lo publico de lo autenticado. Hacer la validacion con sesion: entonces no es publica |
| 8 | **La limitacion de ritmo reusa `intentosAcceso`, `claveDe` y la ventana de 15 minutos**, agregando el valor `"folio"` a `TipoIntento` y su entrada en `LIMITES`. **Reusar no es gratis y el costo se escribe:** hay migracion para reescribir el CHECK `intentos_acceso_tipo_valido`, y `limitarRitmo` hoy tiene firma de login (`{correo, ip}`), asi que hay que generalizarla o darle una hermana que comparta tabla, hash y ventana | Tercer consumidor del mismo mecanismo: "se duplica la primera vez, se aguanta la segunda, se abstrae la tercera". Una tabla nueva repetiria la pimienta, la politica RLS, el GRANT y el test de aislamiento para resolver el mismo problema de conteo — y el propio `ritmo.ts` ya argumento contra tener un segundo almacen cuando descarto el limitador de Better Auth. `docs/05-seguridad.md:259-268` lo hace obligatorio, no opcional | Mecanismo dedicado: paga toda la maquinaria de nuevo. Limitador en memoria: muere con la instancia, que es exactamente por lo que el repo ya rechazo el de la libreria |
| 9 | **"Plantilla configurable" = layout JSX fijo por tipo de documento + `marca` + un bloque de firma de tres campos de texto validados con Zod.** El bloque vive en una columna `documentos` `jsonb` de `ayuntamientos`, no en `marca` y no en una tabla nueva | El precedente es exacto: `modules/marca` ya lee y escribe `ayuntamientos.marca` desde su propia infraestructura (`repositorioDeMarcaSql.ts:18-29`), con lista blanca de campos y **el mismo validador para leer y escribir** (`shared/marca/validacion.ts:60-152`). Se separa de `marca` porque el presidente municipal no es identidad grafica: cambia cada tres anios y **quien puede cambiar el escudo no deberia poder cambiar quien firma un documento oficial**. Se separa de una tabla propia porque es un renglon singleton de tres campos: tabla, politica y test de aislamiento sin nadie que los pida | Un motor de plantillas o editor de layout: abstraccion especulativa, y `@react-pdf/renderer` ni siquiera reutiliza Tailwind. Meterlo en `marca`: acopla firma institucional con `puedeCambiarMarca`. Tabla dedicada: costo de tenancy sin consumidor |
| 10 | **No se renderiza ningun sello ni firma digital.** El PDF reserva un area en blanco al pie para el sello fisico y la firma de puno | Un sello municipal rasterizado dentro de un PDF que se puede descargar es una superficie de falsificacion: quien lo obtiene una vez lo tiene para siempre. El sello sigue siendo fisico y se aplica despues de imprimir, que es como funciona hoy el tramite. La autenticidad la aporta el QR (decision 5), no una imagen | Embeber la imagen del sello "para que se vea mas oficial" |
| 11 | **El render corre en un Route Handler bajo el panel autenticado** (`app/(panel)/constancias/[id]/pdf/route.ts`), que llama a un caso de uso normal con `ContextoActual` y devuelve `renderToStream` con `Content-Type: application/pdf` | Es una descarga GET, no una mutacion: una Server Action siempre es POST y devuelve payload RSC, asi que entregar un binario obliga a serializarlo a base64 y armar el ancla en el cliente — o sea a inventar una hoja `"use client"` para lo que un enlace resuelve. Con Route Handler el boton de imprimir es un `<a href>` y la pagina se queda entera en Server Components (`docs/06-frontend.md`). El handler **no consulta la base**: pasa por el caso de uso, como cualquier otro borde. **Primero de su clase en el repo** —el unico `route.ts` existente es el de Better Auth—, asi que `sdd-design` escribe la forma en vez de copiarla | Server Action devolviendo `Response`: no es su contrato. Handler leyendo la base directo: salta el caso de uso y con el la verificacion de rol |
| 12 | **Se guarda el snapshot y la version de plantilla, nunca el binario** (ya decidido en `docs/06-frontend.md:499-510`). **Consecuencia que esta propuesta si cierra:** una reimpresion renderiza con la version que quedo grabada en el documento, asi que **las versiones viejas de plantilla se quedan vivas en el codigo** hasta que ninguna constancia las referencie | Sin eso, "el documento emitido no se modifica" seria falso: cambiar el pie de pagina en enero reescribiria como se ve una constancia de noviembre. El costo —codigo de plantilla que se acumula— es real y es otra razon para cerrar la revision visual con el piloto **antes** de la primera emision real, cuando todavia no hay ninguna version que preservar | Reimprimir siempre con la plantilla actual: rompe el invariante 2 en silencio, que es la peor forma de romperlo |
| 13 | **La reimpresion es una fila en una tabla `reimpresiones` de solo agregado** (constancia, usuario, momento, motivo), **sin contador denormalizado en la constancia** | El invariante 2 pide usuario, momento **y motivo**, y la bitacora no tiene columna para un motivo: solo `accion`, `entidad`, `entidadId` y actor (`bitacora.ts:24-48`). Codificar la categoria dentro de `accion` convierte una cadena libre en un esquema que nadie valida. Y sin contador almacenado, **"el contador de reimpresiones nunca decrece" deja de ser una regla que hay que respetar y pasa a ser imposible de violar**: es un `COUNT(*)` sobre decenas de filas. La bitacora igual recibe su traza de solo ids, en la misma transaccion | Contador `int` en la constancia: un `UPDATE` equivocado lo baja y el invariante se rompe sin que nada falle. Solo bitacora: no hay donde poner el motivo |
| 14 | **Cancelar y configurar documentos: regla nueva `puedeAdministrarDocumentos` (`ADMIN_MUNICIPAL`). Emitir y reimprimir se quedan en `puedeEscribir`** | Emitir es trabajo de mostrador y el spec de roles ya lo anticipa con un `OPERADOR` que emitio (`autorizacion-roles/spec.md:112-124`). Cancelar es de la otra clase: invalida un papel que **ya esta en manos de un ciudadano y quiza en el archivo de una institucion**, y es irreversible por el invariante 2. Mismo criterio que `puedeFusionarPersonas` y `puedeAdministrarTerritorio`. Las dos operaciones van en **una** regla y no en dos, como `puedeAdministrarTerritorio` cubre reparenteo y catalogo de calles: es la misma pregunta —quien decide que dice y que vale un documento oficial—. **Costo declarado:** en un municipio de mostrador de una sola persona, el `ADMIN_MUNICIPAL` puede no estar. Se acepta porque cancelar no es urgente: la constancia equivocada simplemente no se entrega, y emitir la correcta no depende de haber cancelado la otra | `puedeEscribir` para cancelar: quien se equivoco borra la evidencia de su error sin que nadie mas lo vea. Dos reglas separadas: mismo rol, mismo criterio, dos filas que van a divergir |
| 15 | **El motivo de reimpresion y el de cancelacion son categorias cerradas.** Reimpresion: `EXTRAVIO`, `DETERIORO`, `EJEMPLAR_ADICIONAL`. Cancelacion: `ERROR_DE_CAPTURA`, `DATOS_INCORRECTOS`, `SOLICITUD_DEL_INTERESADO`. **Sin `OTRO` y sin campo libre acompaniante** | La regla dura de `AGENTS.md` no lo alcanza por nombre, pero el razonamiento si: es un operador escribiendo sobre un ciudadano, al lado de su nombre y su domicilio. Es el mismo movimiento que ya hicieron la decision 12 de `capa-territorial` (residencia sin motivo) y la 5 de `padron` (baja sin motivo). Ademas **tiene consumidor**: contar `EXTRAVIO` contra `DETERIORO` dice si el papel se pierde o si la impresion no aguanta, y contar `ERROR_DE_CAPTURA` dice si el formulario esta mal. Un `OTRO` con texto al lado reintroduce la caja que se acaba de cerrar; si el piloto trae un cuarto motivo, agregar un valor es una migracion de CHECK | Texto libre "para que el operador anote": es el que se queda, y recoge lo que nadie deberia guardar |
| 16 | **La residencia vigente y la direccion como texto las resuelve `territorio`, no `constancias`** — dos lecturas nuevas, consumidas por un puerto propio de `constancias` | Es el criterio de la decision 14 de `capa-territorial` (a `padron` se le agrego una lectura por id **porque el consumidor era externo**). La regla de "cual es la vigente" es sutil y ya esta escrita en prosa en tres archivos —primera fila con `hastaEn` null en el orden `desdeEn DESC, creadoEn DESC`, porque una identidad fusionada puede traer dos abiertas—, y hoy la aplica el consumidor: la UI de historial. Que `constancias` la implemente por segunda vez no es "se aguanta la segunda", es **dos copias de una regla sutil que decide que dice un documento oficial**. Igual la composicion de la direccion: subir `padreId` a mano desde `constancias` significa que `constancias` conoce el orden de tipos de lugar, que es dominio de `territorio` y cambia sin avisarle | Que `constancias` suba la cadena de ancestros por su cuenta con cuatro viajes: duplica la regla y el import cruzado lo prohibe dependency-cruiser. Un join crudo contra `personas` o `residencias`: se pierde las fusiones en silencio |
| 17 | **La constancia guarda FK compuesto solo hacia `personas(id, ayuntamiento_id)`. Ninguna FK viva hacia `domicilios` ni `residencias`** | El `personaId` existe para el historial por persona que piden las fases 3, 4 y 7, y va compuesto por la decision 9 de `padron` —un FK simple reabre el bypass entre municipios—. Hacia el domicilio no hay FK porque **la direccion esta congelada**: una FK viva invita justo a lo que la decision 11 de `capa-territorial` prohibe, re-derivar el texto de un documento emitido. La traza de que residencia lo origino, si `sdd-design` la quiere, va como id opaco dentro del snapshot, no como referencia | FK a `residencias`: acopla un documento inmutable a una fila operativa mutable, y no tiene consumidor |
| 18 | **El sistema no valida periodo minimo de residencia y no imprime la CURP** | El umbral —"seis meses de residencia"— es politica municipal y el repo **no tiene ni una linea de evidencia** de cual seria; cablearlo bloquea emisiones legitimas el dia uno. Lo que si se hace es mostrarle al operador la fecha `desdeEn` antes de emitir: quien certifica es el municipio, no el software. La CURP queda fuera porque una constancia de vecindad certifica **donde vive**, no quien es: imprimirla es soltar un identificador nacional en un papel que circula por ventanillas | Cablear un minimo inventado; imprimir la CURP "por si acaso la piden" |
| 19 | **Emitir esta bloqueado con error tipado hasta que el ayuntamiento tenga configurado su bloque de firma** | Una constancia sin nombre ni cargo de quien la firma no es un documento, es una hoja. Un ayuntamiento recien provisionado tiene `documentos` vacio, asi que la primera pantalla del modulo tiene que ser la configuracion. Fallar temprano y con nombre es mejor que emitir un folio —que se consume— sobre un documento invalido | Renderizar con los campos vacios; usar un valor por defecto |

## Forma del esquema (indicativa — el detalle es de `sdd-design`)

```
constancias
  id                  uuid pk              -- interno, no enumerable
  ayuntamientoId      columnaTenant()
  tipo                text CHECK cerrado   -- "VECINDAD" (uno hoy)
  folio               text not null        -- "VEC-2026-000001", publico
  anio, consecutivo   int not null         -- la serie, para auditar
  codigoVerificacion  text not null        -- alta entropia, solo en el QR
  personaId           uuid not null        -- FK compuesto a mano, en el .sql
  datos               jsonb not null       -- snapshot congelado (Zod)
  plantillaVersion    text not null
  emitidaPorUsuarioId text not null
  emitidaEn           timestamptz not null
  canceladaEn         timestamptz null
  canceladaPorUsuarioId text null
  motivoCancelacion   text null CHECK cerrado
  unique(ayuntamientoId, folio)
  unique(ayuntamientoId, tipo, anio, consecutivo)
  unique(id, ayuntamientoId)

folios_de_documentos                       -- el contador (decisiones 1 y 2)
  ayuntamientoId, tipo, anio    pk compuesta
  ultimoConsecutivo   int not null

reimpresiones                              -- solo agregado (decision 13)
  id, ayuntamientoId, constanciaId, usuarioId, momento
  motivo              text not null CHECK cerrado
  foreignKey([constanciaId, ayuntamientoId])

ayuntamientos.documentos  jsonb null       -- bloque de firma (decision 9)
```

Las tres tablas con `columnaTenant()` + `politicaTenant()` + `enableRLS()`, y
en el mismo archivo de migracion el `FORCE ROW LEVEL SECURITY`, los `GRANT`
que Drizzle no emite y el FK compuesto a `personas` escrito a mano, siguiendo
la cola de `drizzle/0004_padron.sql` y la decision 15 de `capa-territorial`.

## Capabilities

### New Capabilities

- `emision-de-constancias`: emision con folio consecutivo por
  `(ayuntamiento, tipo, anio)` bajo lock en transaccion; snapshot congelado
  de titular, direccion y fecha de residencia; render de PDF en hoja carta
  con QR; reimpresion con marca de agua y motivo de categoria cerrada;
  cancelacion con motivo de categoria cerrada; registro historico
  consultable; configuracion del bloque de firma por ayuntamiento; presencia
  en la exportacion por ayuntamiento.
- `validacion-publica-de-folio`: superficie sin sesion resuelta por
  subdominio; respuesta en dos niveles segun el codigo del QR; respuesta
  uniforme para todo caso negativo; limitacion de ritmo.

### Modified Capabilities

- `autorizacion-roles`: regla nueva `puedeAdministrarDocumentos`
  (`ADMIN_MUNICIPAL`) para cancelar y para configurar el bloque de firma.
  Emitir y reimprimir se apoyan en `puedeEscribir`, que ya existe.
- `residencias`: lectura nueva de **residencia vigente** de una persona, que
  aplica una sola vez la regla de desempate hoy escrita en prosa y aplicada
  por el consumidor (decision 16).
- `domicilios`: lectura nueva de **direccion compuesta como texto
  imprimible** (cadena de ancestros + calle + numero + transversales +
  referencia).
- `autenticacion-municipal`: `TipoIntento` gana el valor `"folio"` y
  `LIMITES` su tercera entrada; la limitacion de ritmo deja de ser exclusiva
  del acceso (decision 8).
- `marca-municipal`: **sin cambios.** Se declara explicitamente porque la
  decision 9 pudo haber caido ahi y no lo hizo.

## Enfoque

- `domain`: `Folio` como value object, union cerrada de tipos de documento y
  de motivos, reglas de vigencia y cancelacion, errores tipados
  (`SinResidenciaVigenteError`, `DocumentosNoConfiguradosError`,
  `DocumentoCanceladoError`). Sin imports, ni de `shared`.
- `application`: `puertos.ts` con el repositorio, el contador y las lecturas
  hacia `padron` y `territorio`; un archivo por caso de uso
  (`emitirConstancia`, `reimprimirConstancia`, `cancelarConstancia`,
  `constanciaPorId`, `validarFolio`). Todo lo que toca base dentro de un
  solo `withTenant`, con el folio, el snapshot y la bitacora en la misma
  transaccion.
- `infrastructure`: `esquema.ts` —el nombre exacto, `drizzle.config.ts:31`—,
  adaptadores como objeto literal, y las plantillas de `@react-pdf/renderer`
  versionadas.
- `ui`: Server Components; el boton de imprimir es un enlace al Route
  Handler, no una hoja `"use client"`.
- Tests de aislamiento en la raiz del modulo, **cuatro**: uno por tabla nueva
  y uno para `ayuntamientos.documentos`, espejo de
  `escudo.isolation.test.ts`.

## Invariantes que toca

| Invariante / escenario | Como lo toca |
|---|---|
| 1 — Aislamiento | Tres tablas nuevas con `ayuntamiento_id`, `FORCE RLS` y su test cada una, mas la columna nueva de `ayuntamientos`. **La pagina publica es la primera superficie sin sesion que lee datos operativos bajo RLS**: el `ayuntamientoId` sale de `ayuntamientoActual()`, jamas de la URL ni del folio. T1, T3, T4, T5 |
| 2 — Folios y documentos oficiales | El centro del cambio. Folio por ayuntamiento (decision 1), lock en la misma transaccion (decision 2), documento inmutable con cancelacion en vez de edicion, reimpresion registrada con motivo y contador que no puede decrecer (decision 13), validacion publica que no expone el registro (decision 6). **T6 y T7 con test de integracion, temprano** |
| 3 — Datos personales | La constancia congela nombre y direccion: es el registro con mas dato personal por fila del sistema. Motivos de categoria cerrada (decision 15), sin CURP impresa (decision 18), y la superficie publica solo abre datos contra el codigo del QR (decision 6) |
| 4 — Marca y assets | El escudo se lee de R2 en tiempo de render. El PDF **no se persiste en ningun lado**, ni en el contenedor ni en R2 (decision 12), asi que el filesystem efimero no es un riesgo aca |
| 5 — Auditoria | `EMITIR_CONSTANCIA`, `REIMPRIMIR_CONSTANCIA` y `CANCELAR_CONSTANCIA` en la misma transaccion, **solo ids**. El motivo va en su columna tipada, no en la traza |
| T8 — Validacion publica por QR | Decision 6 completa |
| T11 — Exportacion | `constancias` aporta su `PorcionExportable` con columnas listadas una por una, nunca `select()` pelado |

## Riesgos

| Riesgo | Sev. | Mitigacion |
|---|---|---|
| **El piloto rechaza el formato al verlo impreso** y iterar es un despliegue | **Alta** | Ronda de revision visual con hoja impresa como compuerta entre rebanadas 5 y 6; bloque de firma y leyenda por configuracion; no se emite en produccion antes de esa ronda |
| La pagina publica filtra padron: folio secuencial por invariante + superficie sin sesion | **Alta** | Codigo de verificacion solo en el QR (decision 4), dos niveles de respuesta (decision 6), respuesta uniforme en todo caso negativo, ritmo obligatorio (decision 8), y firma de caso de uso publico revisada con el rigor de tenancy (decision 7) |
| Dos emisiones concurrentes toman el mismo folio, o un rollback deja un hueco | **Alta** | Decision 2 con test de integracion de T6 y T7 en la misma rebanada que la tabla, **no despues** |
| Un modulo futuro guarda `constancia_id` o `persona_id` con FK simple y reabre el bypass entre municipios | **Alta** | FK compuesto a mano desde el dia uno + escenario de aislamiento explicito en el spec |
| Un documento emitido cambia de aspecto porque la plantilla cambio | Media | `plantillaVersion` grabada por documento y versiones viejas vivas en codigo (decision 12), con test |
| Cancelar queda solo en `ADMIN_MUNICIPAL` y el mostrador de una persona se traba | Media | Cancelar no es urgente y no bloquea la emision correcta (decision 14). **Se observa en el piloto**; aflojar despues es cambiar una regla pura |
| El escudo se descarga de R2 en cada render y agrega latencia o falla | Media | **No medido.** Si duele, `"use cache"` sobre los bytes del escudo; el fallo se degrada a un PDF sin escudo, nunca a una emision fallida — el folio ya se consumio |
| El limite de ritmo elegido deja afuera a una institucion que valida un lote | Media | **No medido, declarado.** Se arranca tolerante —el orden del limite de IP que ya existe— porque con la decision 6 la enumeracion sin codigo no devuelve dato personal, asi que el limite protege contra raspado, no contra fuga |
| El presupuesto de revision se desborda ~4x | Media | Ocho rebanadas secuenciales contra `main`, ninguna por encima de 800 lineas |
| Emitir sin residencia vigente, o para una persona dada de baja | Baja | Errores tipados de dominio con test; la emision se rechaza **antes** de tomar folio |

## Presupuesto de revision

`delivery_strategy: ask-on-risk`, presupuesto **800 lineas**. Estimacion
honesta:

| Tramo | Lineas aprox. |
|---|---|
| Esquema + migracion (3 tablas, `FORCE`, `GRANT`, FK a mano, columna jsonb) | 260 |
| Dominio (`Folio`, uniones cerradas, reglas, errores) + tests | 320 |
| Tests de aislamiento (4) | 320 |
| Lecturas nuevas en `territorio` + tests | 300 |
| `emitirConstancia` + contador + concurrencia + tests | 550 |
| Configuracion de documentos (validacion Zod, caso de uso, UI) | 250 |
| Render de PDF (Route Handler, plantilla, QR) | 450 |
| Reimpresion y cancelacion + tests + UI | 600 |
| Validacion publica (ruta, ritmo, migracion del CHECK) + tests | 450 |
| Exportacion + docs | 130 |
| **Total** | **~3.630** |

Mas de **cuatro veces** el presupuesto. Y la regla del repo es "Un PR, un
merge. Las ramas no se apilan": rebanadas secuenciales contra `main`, no una
cadena apilada. Corte propuesto (lo afina `sdd-tasks`):

1. **Lecturas nuevas en `territorio`** (~300) — residencia vigente y
   direccion compuesta. Va sola y primero: es un cambio en otro modulo y su
   diff debe leerse como lo que es.
2. **Esquema, dominio y aislamiento** (~700) — las tres tablas, la columna
   jsonb, migracion con RLS/`FORCE`/`GRANT`, `Folio`, uniones cerradas,
   cuatro tests de aislamiento. Es la rebanada que toca tenancy y va sola a
   proposito.
3. **Configuracion de documentos** (~250) — validacion Zod, caso de uso, UI,
   `puedeAdministrarDocumentos`. **Antes de emitir, no con ella**
   (decision 19).
4. **Emision** (~600) — contador bajo lock con sus tests de T6 y T7,
   snapshot congelado, bitacora, UI de emision.
5. **Render de PDF** (~450) — Route Handler, plantilla de vecindad, QR.
   **Compuerta: ronda de revision visual con el piloto antes de seguir.**
6. **Reimpresion y cancelacion** (~600) — tabla, casos de uso, marca de agua
   como parametro de render, motivos cerrados, UI.
7. **Validacion publica** (~450) — ruta sin sesion, dos niveles de respuesta,
   ritmo, migracion del CHECK de `TipoIntento`.
8. **Exportacion y docs** (~130).

## Plan de rollback

Toca tenancy, datos personales, auditoria y una superficie publica, asi que
es obligatorio y tiene tres regimenes:

- **Antes de la primera emision real:** revertir el PR y bajar la migracion.
  Las tres tablas y la columna `documentos` se dropean sin perdida. Ni
  `personas` ni `residencias` se tocan en ningun momento.
- **Despues de la primera emision real:** revertir el codigo y **dejar las
  tablas**. Son aditivas y nadie mas las lee; dropearlas destruye el registro
  historico de documentos oficiales, que es justamente lo que una auditoria
  pide y no se reconstruye. El valor `"folio"` de `TipoIntento` tambien se
  queda: quitarlo del CHECK con filas escritas rompe la tabla de ritmo.
- **Rollback de la superficie publica sola:** la ruta `/validar` se puede
  quitar sin tocar nada mas —el QR queda apuntando a una URL que responde
  404, que es un fallo visible y no una fuga—. Es la palanca de emergencia si
  aparece un problema de exposicion en produccion.
- **Una cancelacion equivocada no se deshace.** El invariante 2 lo prohibe:
  se emite un documento nuevo, con folio nuevo, y la cancelacion errada queda
  en el historial con su motivo. Se escribe aca para que no se descubra
  buscando el boton.

## Dependencias

- **Sin paquetes nuevos.** `@react-pdf/renderer` (`^4.3.1`) y `qrcode`
  (`1.5.4`) ya estan instalados y son eleccion de stack ya justificada
  (`docs/06-frontend.md`). Sin extensiones nuevas de Postgres.
- Rebanadas 3–8 dependen de la 2 mergeada; la 4 depende de la 1 y de la 3;
  la 6 y la 7 dependen de la 4.
- **Dependencia de producto, no tecnica:** la ronda de revision visual con el
  piloto entre las rebanadas 5 y 6. Sin ella la fase no se declara vendible.

## Criterios de exito

- [ ] Dos emisiones simultaneas en el mismo municipio producen folios
      distintos y consecutivos, **sin huecos**.
- [ ] Una emision que falla despues de tomar folio **no consume el folio**:
      la siguiente toma el mismo numero.
- [ ] Dos municipios emiten `VEC-2026-000001` el mismo dia sin colisionar.
- [ ] La primera constancia del anio siguiente arranca en `000001` con el
      anio nuevo, y una emitida el 31 de diciembre a las 19:00 hora de
      Merida lleva el anio que ve la persona, no el de UTC.
- [ ] Reparentear la colonia del titular **no cambia ni un caracter** del
      texto de la constancia ya emitida, ni al reimprimirla.
- [ ] Cambiar la plantilla no cambia como se reimprime un documento anterior.
- [ ] La reimpresion sale con marca de agua, deja fila con usuario, momento y
      motivo, y el conteo nunca baja.
- [ ] Un documento emitido no tiene ninguna operacion que lo edite.
- [ ] `/validar/{folio}` sin codigo responde vigente o no valido **sin
      nombre, sin domicilio y sin CURP**.
- [ ] Un folio inexistente, uno de otro municipio, uno con codigo equivocado
      y uno cancelado devuelven **exactamente la misma respuesta**.
- [ ] Recorrer folios consecutivos desde la pagina publica agota la ventana
      de ritmo antes de devolver un solo dato personal.
- [ ] El QR impreso no apunta al PDF.
- [ ] El PDF no queda escrito en el filesystem del contenedor ni en R2.
- [ ] Emitir sin bloque de firma configurado, sin residencia vigente, o para
      una persona dada de baja, falla con error tipado **antes** de tomar
      folio.
- [ ] Un `OPERADOR` emite y reimprime; **no** cancela ni configura.
- [ ] Un usuario del municipio A no ve, ni por id directo, una constancia de
      B; y una fila de `constancias` con `persona_id` de otro municipio es
      **rechazada por Postgres**, no solo por la aplicacion.
- [ ] La hoja impresa en blanco y negro en una impresora comun es legible, en
      carta, con area libre para el sello fisico.
- [ ] `pnpm test`, `pnpm test:integration` y `pnpm check` en verde.

## Ronda de preguntas de propuesta

Ejecucion en modo `auto`: las decisiones se tomaron con la evidencia
disponible y se eligio el lado reversible donde la evidencia no alcanzaba.
Estas cuatro son las que **el usuario deberia revisar antes de `sdd-spec`**,
con lo que cambiaria si las corrige:

1. **El codigo de verificacion en el QR (decisiones 4 y 6).** Es la unica
   pieza que la exploracion no pedia y que agrega una columna y una rama.
   Sin ella, un folio secuencial y una pagina publica son un lector paginado
   del padron. Si el usuario prefiere no tenerla, la salida honesta es que la
   pagina publica **nunca** muestre nombre ni direccion, ni siquiera con el
   papel en la mano — y entonces no valida contenido, solo existencia.
2. **Cancelar restringido a `ADMIN_MUNICIPAL` (decision 14).** Depende de un
   hecho del piloto que no tenemos: si el mostrador es una sola persona que
   ademas es la administradora, la regla no cuesta nada; si son un operador y
   un administrador que no coinciden en horario, cuesta. Aflojarla despues es
   cambiar una funcion pura de una linea.
3. **Sin periodo minimo de residencia (decision 18).** Si el piloto tiene una
   politica escrita —"seis meses"—, se vuelve una regla de dominio con su
   test. Inventarla sin evidencia es peor que no tenerla.
4. **La ronda de revision visual como compuerta.** Es la mitigacion del unico
   riesgo alto de producto de esta fase. Si el usuario decide no hacerla, la
   decision se toma explicitamente y esta propuesta deja de sostener que la
   fase queda vendible al cerrarse.
