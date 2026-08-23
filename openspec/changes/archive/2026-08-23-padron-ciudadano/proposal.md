# Propuesta: Padron ciudadano (Fase 1a)

**Cambio:** `padron-ciudadano` · **Base:** engram
`sdd/padron-ciudadano/exploration` · **ADR:** `docs/adr/0002-busqueda-de-personas.md`

## Intencion

Toda fase posterior guarda un `persona_id`: constancias (2), reportes (3),
apoyos (4) y juzgado (7). Hoy no existe la persona. Sin ella, cada modulo
volveria a capturar el nombre por su cuenta y el "historial por persona"
que pide el roadmap seria imposible de reconstruir.

El problema de negocio no es guardar nombres: es **que el mismo vecino no
sea tres personas distintas**. En el mostrador el nombre se dicta, no se
lee: "Ma. Gpe. Kumul", "Maria Guadalupe Kumul" y "MARIA GPE KUMUL" son la
misma senora y hoy serian tres altas. Un padron con duplicados hace que el
historial mienta justo donde importa —reincidencia de apoyos, constancias
previas— y que el municipio no pueda responder "¿este senor ya vino?".

Exito: la operadora de Motul escribe "gpe kumul", ve a la persona que ya
existe antes de terminar de capturar, y la elige en vez de crear otra.
Cuando el duplicado igual se cuela, se fusiona sin romper ningun
`persona_id` ya guardado.

## Alcance

**Dentro:** modulo nuevo `src/modules/padron/` con sus cuatro capas; tabla
`personas` con RLS + `FORCE` + test de aislamiento; columna de busqueda
normalizada escrita por la aplicacion; CURP opcional, unica por municipio
cuando esta presente; alta, edicion y baja con traza en bitacora; busqueda
tolerante a variantes por `pg_trgm` (ADR 0002) con su tabla de catalogo de
abreviaturas; sugerencia de duplicados en tiempo de captura; fusion no
destructiva por redireccion, reversible, con su traza; puerto de lectura
que resuelve la redireccion; `PorcionExportable` de `padron` y el punto de
composicion de exportacion en `src/app`; correccion de
`docs/architecture/module-template.md:35`.

**Fuera:** **domicilio en cualquier forma** — ni FK, ni tabla, ni un campo
de texto libre "temporal" (Fase 1b); pantalla de revision por lotes de
duplicados; deduplicacion automatica sin operador; validacion del digito
verificador de la CURP contra RENAPO; importacion masiva del padron
existente; bitacora de lectura a nivel registro (ver decision 3); busqueda
por domicilio, por CURP parcial o por rango de fechas.

## Decisiones cerradas

| # | Decision | Por que | Alternativa descartada |
|---|---|---|---|
| 1 | **Fusion no destructiva por redireccion.** La fila perdedora nunca se borra: se marca apuntando a la ganadora. El puerto de lectura de `padron` sigue la redireccion, **colapsada** al ganador final para que una cadena de fusiones siga siendo O(1) | Un `persona_id` ya guardado por otro modulo sigue resolviendo sin migracion, porque la fila y el destino del FK siguen existiendo. Fusion y su entrada en bitacora son **una** transaccion, como `cambiarEscudo`. Se revierte borrando la marca | Reescribir `persona_id` en las tablas de los otros modulos y borrar la perdedora: obligaria a `padron` a escribir en tablas ajenas —lo que la arquitectura prohibe— y una falla parcial dejaria unas tablas con el id viejo y otras con el nuevo |
| 2 | Una consulta por el id perdedor devuelve **los datos actuales del ganador**, no una foto del momento de la fusion | Una foto significaria que la fusion no fusiono: corregir un apellido despues no llegaria a los registros viejos, que es exactamente lo que se fusiono para arreglar | Snapshot al momento de fusionar |
| 3 | **La bitacora registra solo escrituras**: alta, edicion, fusion, baja. Sin registro de lecturas a nivel registro | `invariantes-criticos.md` §3 acota la bitacora a nivel registro al padron de **apoyos** de Fase 4, que revela condicion de salud. El padron ciudadano es nombre, CURP opcional y —despues— domicilio: no es de esa clase. Instrumentar lecturas es instrumentar todas las superficies que muestran una persona, que son todas | Registrar lecturas desde ahora. **Se revisa el dia que el padron gane un campo sensible**, y ese dia es una decision explicita, no un olvido |
| 4 | **La deteccion de duplicados ocurre al capturar y nunca bloquea.** Mientras la operadora escribe el nombre, el sistema muestra personas parecidas para que elija la existente | Los homonimos reales existen —dos "Jose Canul Pech" en un municipio de 8.000 habitantes es normal—. Un bloqueo duro entrena a la operadora a esquivarlo | Bloquear el alta ante un parecido; barrido posterior por lotes (queda fuera de esta rebanada) |
| 5 | Umbral 0.30 fijado **en la consulta**, expansion de abreviaturas aplicada **una vez a la cadena de busqueda** | ADR 0002, medido: 317 ms contra 29 ms a 250.000 filas. Una llamada a funcion en el `WHERE` es opaca al planner y anula el indice GIN | Heredar el umbral de la configuracion del servidor; expandir por fila |
| 6 | La columna normalizada la **escribe la aplicacion** | `unaccent` no es IMMUTABLE: Postgres rechaza la columna generada y el indice de expresion. Envolverla en una funcion falsamente IMMUTABLE se descarto por ser una trampa de corrupcion silenciosa | Columna generada; funcion wrapper mintiendo sobre IMMUTABLE |
| 7 | El archivo de esquema del modulo se llama **exactamente `esquema.ts`** | `drizzle.config.ts:31` globea solo `./src/modules/**/esquema.ts`, y su propio comentario dice que "anuncia un conteo de tablas menor y sigue": otro nombre compila, pasa `typecheck` y **nunca migra**. `module-template.md:35` prescribe `schema.ts` y esta mal. `padron` es el primer modulo al que le habria pasado, asi que **la correccion del doc entra en este cambio** | Dejar el doc como esta y confiar en que nadie lo copie |
| 8 | Los puertos van en **`application/puertos.ts`** | Es el unico precedente real del repo (`src/modules/marca/application/puertos.ts`). `module-template.md:27,50` prescribe `domain/ports.ts` | Seguir el doc y dejar dos formas vivas. **El doc deberia decir lo que hace el codigo**; la correccion de esa contradiccion se propone, no se asume |
| 9 | `personas` lleva `unique(id, ayuntamientoId)` y **todo** FK futuro hacia ella es compuesto | Es el patron de `src/shared/auth/esquema.ts:95` (`usuarios_id_tenant_key`), que existe porque arreglo un bypass real de RLS entre municipios: un FK simple sobre `id` deja que una fila lleve su propio `ayuntamiento_id` y un `persona_id` ajeno, y pase el `WITH CHECK`. El primer modulo que agregue `persona_id` sin esto reproduce el bug | FK simple sobre `personas.id` |
| 10 | CURP opcional, `uniqueIndex(ayuntamientoId, curp)`, y **cadena vacia normalizada a `NULL` en el dominio** | Un `NULL` no colisiona con otro `NULL`, asi que "opcional pero unica cuando existe" es directamente expresable. Guardar `''` haria colisionar dos personas sin CURP. La unicidad **no detecta capturas malas** —una CURP mal tecleada es otra cadena y no colisiona—: el mecanismo de deduplicacion es la busqueda por trigramas, la CURP es una senal secundaria de confianza | Confiar la deduplicacion a la CURP; guardar `''` |
| 11 | **Fase 1a no toca domicilio.** Ninguna columna con forma de direccion entra a `personas` ahora | El roadmap dice "una persona puede cambiar de domicilio conservando su historial": eso es una relacion historica, no un valor actual. Un texto libre capturado hoy no mapea a la jerarquia colonia/sector/manzana/calle de 1b, y la constancia de vecindad de Fase 2 necesita un domicilio estructurado y fechado | Una columna `domicilio text` "temporal". Es exactamente la que se queda |

## Forma del esquema

```
personas
  id                 uuid pk
  ayuntamientoId     columnaTenant()
  nombres, primerApellido, segundoApellido    (ver pregunta 1)
  nombreNormalizado  text not null   -- escrita por la app (decision 6)
  curp               char(18) null   -- unica por municipio cuando existe
  fusionadaEn        uuid null       -- redireccion colapsada (decision 1)
  bajaEn             timestamptz null
  creadoEn / actualizadoEn

  unique(id, ayuntamientoId)                   -- personas_id_tenant_key
  uniqueIndex(ayuntamientoId, curp)
  foreignKey([fusionadaEn, ayuntamientoId]) -> [id, ayuntamientoId]
  index GIN gin_trgm_ops sobre nombreNormalizado
  politicaTenant(personas) + enableRLS()

abreviaturas   -- catalogo cerrado del ADR 0002; alcance en pregunta 2
```

La migracion agrega `pg_trgm` y `unaccent`, y **en el mismo archivo
generado** —nunca en uno posterior— el `FORCE ROW LEVEL SECURITY` y los
`GRANT` que Drizzle no emite, siguiendo la cola de `drizzle/0001_auth.sql`.

## Capabilities

### New Capabilities

- `padron-ciudadano`: alta, edicion y baja de personas; CURP opcional unica
  por municipio; busqueda tolerante a variantes; sugerencia de duplicados
  al capturar; fusion no destructiva y reversible; resolucion de
  redireccion en el puerto de lectura; traza en bitacora; presencia en la
  exportacion por ayuntamiento.

### Modified Capabilities

- `autorizacion-roles`: regla nueva para fusionar personas (ver pregunta 3).
  Alta y edicion se apoyan en `puedeEscribir`, que ya existe.

## Enfoque

- `domain`: normalizacion del nombre, expansion contra el diccionario,
  guarda de CURP vacia, reglas de identidad. Sin imports.
- `application`: `puertos.ts` con el repositorio y el puerto de lectura que
  otros modulos consumiran; un archivo por caso de uso
  (`altaDePersona`, `editarPersona`, `buscarPersonas`, `fusionarPersonas`).
  Cada uno verifica rol, valida, y hace todo lo que toca base dentro de un
  solo `withTenant`, con el INSERT de bitacora en la misma transaccion.
- `infrastructure`: `esquema.ts` y el adaptador SQL como objeto literal
  (precedente `repositorioDeMarcaSql`, no clase).
- `ui`: Server Actions y formularios; la sugerencia de duplicados es la
  unica hoja que justifica `"use client"`.
- `composicion.ts` en la raiz del modulo, solo cableado.
- Test de aislamiento en la raiz del modulo, en la forma canonica de
  `invariantes-criticos.md` Capa 2, sembrando con los fixtures que ya
  existen (`municipiosDePrueba.ts`, `genteDePrueba.ts`).

## Impacto en fases posteriores

| Fase | Que hereda |
|---|---|
| 2 constancias | `persona_id` con FK compuesto; el titular de la constancia resuelve por el puerto, no por join crudo |
| 3 reportes | Igual; el ciudadano que reporta puede ser el mismo de una constancia |
| 4 apoyos | La deteccion de reincidencia agrega **por persona**: si la fusion no colapsa, la reincidencia no se ve |
| 7 juzgado | Igual, sobre datos de categoria cerrada |
| 1b domicilio | FK nullable aditiva + tabla de historial. No rompe nada **si** 1a no mete domicilio (decision 11) |

**El costo de disciplina de la decision 1:** cualquier modulo futuro que
haga un join crudo contra `personas.id` en vez de pasar por el puerto se
pierde en silencio el historial fusionado. Nada lo impide hoy. Cerrar eso
con una regla de dependency-cruiser o de lint es trabajo de `sdd-design`.

## Invariantes que toca

| Invariante / escenario | Como lo toca |
|---|---|
| 1 — Aislamiento | Tabla nueva con `ayuntamiento_id`, `FORCE RLS`, test de aislamiento. T1, T3, T4, T5 |
| 3 — Datos personales | Nombre y CURP. Categorias cerradas no aplican todavia; el dia que apliquen, se revisa la decision 3 |
| 5 — Auditoria | Alta, edicion, fusion y baja en bitacora, en la misma transaccion, **solo ids** |
| T11 — Exportacion | `padron` entra a la exportacion por ayuntamiento con columnas listadas una por una, nunca `select()` pelado |

## Riesgos

| Riesgo | Sev. | Mitigacion |
|---|---|---|
| El presupuesto de revision se desborda por 4x (ver seccion siguiente) | **Alta** | Requiere decision del usuario antes de `sdd-tasks` |
| Un modulo futuro guarda `persona_id` con FK simple y reabre el bypass entre municipios | **Alta** | `unique(id, ayuntamientoId)` desde el dia uno + escenario de aislamiento explicito en el spec |
| Un join crudo contra `personas.id` se pierde las fusiones | **Alta** | Puerto de lectura como unica entrada; regla de lint/depcruise a definir en `sdd-design` |
| `esquema.ts` mal nombrado: compila, typechequea y nunca migra | Media | Nombre correcto + correccion del doc en este cambio |
| Sugerencia de duplicados demasiado ruidosa: la operadora la ignora y el duplicado entra igual | Media | Medido: umbral 0.30 y tope de 5. Sobre nombres a medio escribir 0.30 recupera 97.8% y 0.35 cae a 81.0%, con ruido de 0.32 candidatos |
| Fusionar por error dos homonimos reales | Media | Reversible borrando la marca. **Limitacion declarada:** revertir no des-calcula una decision que otro modulo ya tomo con la identidad fusionada |
| El punto de composicion de exportacion no existe: `padron` es el primero | Media | Tratarlo como diseno abierto, no como copiar y pegar |
| CURP `''` en vez de `NULL` | Baja | Guarda en el dominio, con test, no solo constraint |

## Presupuesto de revision: no cabe en un PR

Estimacion honesta contra las 400 lineas de presupuesto, con
`delivery_strategy: single-pr`:

| Tramo | Lineas aprox. |
|---|---|
| Esquema + migracion (con `FORCE`, `GRANT`, extensiones y semilla del catalogo) | 180 |
| Dominio + sus tests | 300 |
| Casos de uso + sus tests | 450 |
| Infraestructura (adaptador SQL, consulta de trigramas) | 150 |
| Test de aislamiento + integracion de busqueda | 200 |
| UI (alta, edicion, busqueda, sugerencia, fusion) + Server Actions | 400 |
| Exportacion + composicion en `src/app` + docs | 60 |
| **Total** | **~1.700** |

Son **cuatro veces** el presupuesto. Esto no es un desborde del 10% que se
acepte apuntando la atencion del revisor a tres archivos: es un cambio que
no se puede revisar de una sentada.

Y la regla del repo es "Un PR, un merge. Las ramas no se apilan", asi que
la forma compatible **no** es una cadena de PRs apilados: son rebanadas
secuenciales contra `main`, cada una mergeada antes de empezar la
siguiente.

Corte acordado con el usuario, con la costura pensada para que ninguna
rebanada obligue a reformar la anterior:

1. **Esquema y aislamiento** (~300) — `esquema.ts` con la columna
   normalizada y el catalogo de abreviaturas, migracion con RLS/`FORCE`/
   `GRANT` y las extensiones, test de aislamiento, dominio de persona,
   guarda de CURP. Es la rebanada que toca tenancy, y va sola a proposito.
2. **Alta, edicion y UI** (~250) — casos de uso con bitacora, UI de alta y
   listado. Ya no toca politicas RLS. El municipio ya captura.
3. **Busqueda tolerante** (~350) — indice GIN, expansion, consulta con
   umbral 0.30, UI de busqueda. Sin backfill: la columna se viene
   escribiendo desde la rebanada 1.
4. **Duplicados** (~450) — `fusionadaEn` y `fusionadaDirectoEn` como
   columnas nullables aditivas, resolucion colapsada en el puerto, caso de
   uso de fusion con su traza, sugerencia al capturar, reversion. No cambia
   ninguna firma de las rebanadas anteriores.
5. **Exportacion** (~60) — `PorcionExportable` de `padron`, el punto de
   composicion en `src/app`, y la guarda de unicidad de `porcion.nombre`.

**El catalogo de abreviaturas esta en la rebanada 1 y no en la de
busqueda.** La primera version de este corte lo puso con la busqueda y
afirmo "sin backfill"; las dos cosas no podian ser ciertas. El ADR 0002
seccion 9 dice que la columna almacenada es normalizada **y expandida**, y
expandir necesita el catalogo. O entra con la columna, o la rebanada de
busqueda rellena justo la columna que este diseno declara escrita por la
aplicacion.

**Decidido:** cinco rebanadas secuenciales contra `main`, ninguna por
encima de las 400 lineas.

## Plan de rollback

Toca tenancy, datos personales y auditoria, asi que el rollback es
obligatorio y tiene dos regimenes:

- **Antes de que el municipio piloto capture datos reales:** revertir el PR
  y bajar la migracion. `personas` y el catalogo se dropean sin perdida.
- **Despues:** revertir el codigo y **dejar las tablas**. Son aditivas y
  nadie mas las lee; dropearlas destruye el padron. Las extensiones
  `pg_trgm` y `unaccent` se quedan: quitarlas no gana nada y puede romper
  otro objeto.
- **Rollback de una fusion equivocada:** borrar la marca de redireccion, en
  transaccion, con su propia entrada en bitacora. No requiere migracion ni
  deploy.

## Dependencias

- Sin paquetes nuevos. `pg_trgm` y `unaccent` son extensiones de Postgres,
  no dependencias de `package.json`.
- El rol de migracion (`xula_migrator`) debe poder ejecutar
  `CREATE EXTENSION`. Prerrequisito operativo a verificar contra Railway
  antes de `sdd-apply`.

## Criterios de exito

- [ ] Buscar "gpe kumul" encuentra a "Maria Guadalupe Kumul" por encima del
      umbral 0.30, con el indice GIN en el plan de ejecucion.
- [ ] Mientras se captura un nombre parecido a uno existente, la operadora
      ve la coincidencia y **puede seguir de largo**: la sugerencia no
      bloquea el alta.
- [ ] Dos personas fusionadas: una consulta por el id perdedor devuelve los
      datos **actuales** del ganador, y sigue devolviendolos despues de
      editar al ganador.
- [ ] Una cadena A→B→C resuelve a C en un solo salto.
- [ ] Borrar la marca de fusion devuelve las dos personas a existir por
      separado.
- [ ] Alta, edicion, fusion y baja quedan en bitacora, en la misma
      transaccion, **sin nombre ni CURP**.
- [ ] Un usuario del municipio A no ve, ni por id directo, una persona de B.
- [ ] Dos personas sin CURP en el mismo municipio conviven; dos con la
      misma CURP en el mismo municipio no.
- [ ] `personas` no tiene ninguna columna con forma de domicilio.
- [ ] `pnpm test`, `pnpm test:integration` y `pnpm check` en verde.

## Ronda de preguntas de propuesta — resueltas

Las cinco se resolvieron con el usuario antes de `sdd-spec`. Se dejan
escritas con su motivo, porque una decision sin motivo no se puede revisar
despues.

1. **Forma del nombre:** tres campos —`nombres`, `primerApellido`,
   `segundoApellido` opcional—. Permite ordenar por apellido y tratar la
   inversion de apellidos como caso propio, que es una de las siete clases
   que midio el ADR 0002. Se acepta el costo: la operadora decide donde
   corta un nombre dictado.
2. **Alcance del catalogo de abreviaturas:** tabla de plataforma sin
   `ayuntamiento_id`, de solo lectura para el rol de aplicacion. `ma`→
   `maria` no cambia entre Motul y Ticul. **La excepcion se escribe en
   `docs/architecture/invariantes-criticos.md` en el mismo cambio**: una
   tabla sin tenant que nadie documento es indistinguible de un olvido.
3. **Quien fusiona:** `ADMIN_MUNICIPAL`, mismo criterio que
   `puedeExportar`. Se atenua porque la fusion es reversible.
4. **Ruido de la sugerencia:** umbral 0.30 —el mismo de la busqueda— y
   tope de 5. **Medido, no elegido.** Sobre nombres a medio escribir, 0.30
   recupera 97.8% y 0.35 cae a 81.0%, a cambio de ahorrar 0.26 candidatos
   falsos por alta; el ruido a 0.30 en esa clase es 0.32 candidatos, y con
   un tope de 2 la operadora ya ve al correcto en el 100% de los casos.

   El supuesto anterior de esta propuesta —"un umbral mayor al de la
   busqueda"— venia de leer el ruido promedio de todas las clases, 3.33,
   que lo carga la clase de nombre completo con abreviaturas. Esa es la
   consulta de la busqueda, no la de la captura.
5. **Que es una baja:** baja logica con fecha, invisible en la busqueda
   por defecto, sin motivo estructurado en esta fase. Un campo de motivo
   abierto sobre una defuncion es dato sensible sin proteccion, y la
   categoria cerrada no se inventa sin el municipio piloto.
