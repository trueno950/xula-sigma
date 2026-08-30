# Diseno: Constancias y oficios (Fase 2)

**Cambio:** `constancias-oficios` · **Base:**
`openspec/changes/constancias-oficios/proposal.md` · **Precedentes:**
`openspec/changes/archive/2026-08-29-capa-territorial/design.md`,
`openspec/changes/archive/2026-08-23-padron-ciudadano/design.md` · **ADR
0001 §2 §5**

Este documento no reabre las 19 decisiones de la propuesta. Resuelve el
como: la sentencia exacta del contador y por que no tiene carrera, la forma
del snapshot congelado, donde se compone el texto de la direccion, los dos
puertos que `constancias` declara sobre `padron` y `territorio`, la columna
`jsonb` de firma, el Route Handler del PDF, y la generalizacion de la
limitacion de ritmo.

Trae ademas **siete correcciones a la propuesta**, cada una argumentada
donde aparece: el render usa `renderToBuffer` y no `renderToStream` (§11),
`configuracion_de_documentos` es tabla propia y no `ayuntamientos.documentos`
-la version original heredaba una lectura publica sin proposito, hallazgo de
GGA (§9)-, el
PDF **no se puede renderizar desde `src/app`** y necesita un puerto (§11),
`reimpresiones.momento` pasa a `ocurridoEn` (§6), la URL del escudo **no se
congela** en el snapshot (§5), el test de concurrencia del folio **no puede**
usar dos `withTenant` (§4), y `limitarRitmo` cambia de nombre en su llamador
actual (§12).

---

## 1. Enfoque tecnico

Modulo `src/modules/constancias/` con las cuatro capas y `composicion.ts` en
la raiz, igual que `padron`, `marca` y `territorio`.

El eje del diseno no es el esquema —la propuesta ya lo fijo en forma— son
**tres garantias que ninguna capa sostiene sola**:

1. **Un folio no se repite ni deja hueco**, aunque dos operadoras emitan en
   el mismo segundo y aunque una emision falle a mitad. Lo sostiene una sola
   sentencia de Postgres, no una rama de TypeScript (§4).
2. **Un documento emitido dice lo mismo para siempre**, aunque despues se
   reparentee la colonia, se corrija el nombre del titular o cambie la
   plantilla. Lo sostiene la **ausencia** de referencias vivas, no una regla
   que alguien recuerde (§5, §11).
3. **La superficie publica responde igual en los cuatro casos negativos.** Lo
   sostiene un tipo cuyo lado negativo no tiene campos, una constante
   congelada y un test de identidad de objeto, no cuatro cadenas escritas a
   mano (§8).

Todo lo demas de este documento es consecuencia de ese reparto.

---

## 2. Decision 1 — Capas del modulo, y la direccion de cada arista

| Pieza | Capa | Por que ahi |
|---|---|---|
| `identificadores.ts`, `tipoDeDocumento.ts` (union + prefijos), `folio.ts`, `motivos.ts`, `validacion.ts` (proyeccion publica pura), `errores.ts` | `domain` | Puro y sin imports, **ni siquiera Zod** (§9). Es lo unico que se prueba en milisegundos, y la proyeccion en dos niveles es la pieza de la que depende la uniformidad entera |
| `puertos.ts` (repositorio + contador), `puertosDeLectura.ts` (titulares, direcciones, configuracion), `puertosDeRender.ts`, `validacionDeDocumentos.ts` y `validacionDeSnapshot.ts` (Zod), un archivo por caso de uso | `application` | Precedente `padron` design §5: los puertos viven en `application`. Zod vive aca y no en `domain` por `dominio-no-importa-nada` (§9) |
| `esquema.ts`, adaptadores SQL, adaptadores a `padron` y a `territorio`, plantillas de `@react-pdf/renderer`, generador de QR | `infrastructure` | Otro modulo es el mundo exterior (`AGENTS.md` antipatron 8). Las plantillas son JSX pero **no son UI**: no entran al arbol de React de ninguna pagina, se compilan a PDF (§11) |
| Pantallas, formularios, Server Actions | `ui` | — |
| `composicion.ts`, `index.ts`, `types.ts` | raiz | Cableado y superficie, precedente `marca`, `padron` y `territorio` |

**Verificacion contra `.dependency-cruiser.cjs`, arista por arista.** Se leyo
el archivo, no se asumio.

| # | Arista nueva | Regla que la mira | Veredicto |
|---|---|---|---|
| 1 | `constancias/domain/*` → nada | `dominio-no-importa-nada` (l. 12): `to.pathNot` mas `dependencyTypesNot: ["npm-dev"]` | **Permitida solo si no importa Zod.** Por eso `PATRON_UUID` se reescribe (septima copia) y por eso los validadores Zod viven en `application` |
| 2 | `constancias/application/*` → `constancias/domain`, `shared/{auth/contexto,auth/roles,lib/errores,tenancy/*}`, `zod` | `application-no-importa-infra-ni-ui` (l. 25), `application-no-importa-shared-ui` (l. 40) | Permitida. No toca `shared/ui` ni `infrastructure` |
| 3 | `constancias/infrastructure/esquema.ts` → `shared/tenancy/esquema`, **`shared/auth/esquema`** (objeto `usuarios`, para el FK compuesto de §6), `../domain` | ninguna la prohibe; `shared-no-importa-modulos` (l. 71) es la direccion contraria | Permitida |
| 4 | `constancias/infrastructure/lectorDeTitularesPorPadron.ts` → `@/modules/padron` | `modulo-no-importa-interior-de-otro` (l. 59): `pathNot` deja pasar `^src/modules/[^/]+/index\.(ts\|tsx)$` | Permitida **solo por el barrel**. Con `tsPreCompilationDeps: true` (opciones, l. 139) un `import type` del interior rompe el build igual que uno de valor |
| 5 | `constancias/infrastructure/lectorDeDireccionesPorTerritorio.ts` → `@/modules/territorio` | idem | Permitida por el barrel |
| 6 | `constancias/infrastructure/plantillas/*.tsx` → `@react-pdf/renderer`, `../../application/validacionDeDocumentos` | `infrastructure-no-importa-ui` (l. 34) mira `^src/modules/[^/]+/ui/` | Permitida: las plantillas estan en `infrastructure/`, no en `ui/` |
| 7 | `constancias/ui/*` → `application`, `composicion`, `domain`, `shared` | `ui-no-importa-infrastructure` (l. 51) | Permitida; nunca `infrastructure` |
| 8 | `src/app/(panel)/constancias/**/page.tsx` → `@/modules/constancias` | `app-no-importa-infrastructure` (l. 79) prohibe `src/app/` → `modules/*/(infrastructure\|domain)/` | Permitida: la arista es al barrel, mismo camino que `(panel)/territorio/page.tsx` con `comoLugarId` |
| 9 | **`src/app/(panel)/constancias/[id]/pdf/route.ts` → `@/modules/constancias`** | idem | Permitida **y decisiva**: la regla 8 es la que impide que el handler importe la plantilla, y por eso el render va detras de un puerto (§11) |
| 10 | `src/app/validar/[folio]/page.tsx` → `@/modules/constancias`, `@/shared/tenancy/contexto`, `@/shared/auth/limitarRitmo` | ninguna prohibe `src/app/` → `src/shared/` | Permitida |
| 11 | `src/app/exportacion/porciones.ts` → `@/modules/constancias` | idem 8 | Permitida |
| 12 | Ciclos | `sin-ciclos` (l. 123) | **Sin ciclo.** `constancias` importa `padron` y `territorio`; ninguno de los dos importa `constancias`, y este diseno no crea ninguna arista de vuelta |
| 13 | Dependencias | `sin-dependencias-fantasma` (l. 129) | `@react-pdf/renderer` (`^4.3.1`) y `qrcode` (`^1.5.4`) ya estan en `package.json`. **Cero dependencias nuevas** |
| 14 | Paquetes acotados | `auth-solo-desde-shared-auth` (l. 87), `s3-solo-desde-el-almacen-de-assets` (l. 107) | No se disparan: `constancias` no importa `better-auth`, `@node-rs/argon2` ni `@aws-sdk/client-s3`. El escudo llega como **URL** desde `ayuntamientos.marca`, nunca por el SDK |

**Sin extensiones nuevas de Postgres.** El unico `WITH RECURSIVE` de este
cambio (§7) es SQL estandar, igual que el de `territorio`.

---

## 3. Decision 2 — Ids marcados, y `personaId` viajando como `string`

`constancias/domain/identificadores.ts` reusa la forma generica de
`territorio/domain/identificadores.ts` (capa-territorial design §3):
`ConstanciaId` y `ReimpresionId`. Es el **septimo y octavo** lugar del repo
con el mismo `PATRON_UUID`, y sigue sin arreglarse por la misma razon que
ahi: arreglarlo es aflojar `dominio-no-importa-nada`. No se vuelve a
argumentar; se apunta.

**`personaId` viaja como `string` dentro de `constancias`, sin excepcion.**
Ni en `domain`, ni en `application/puertos*.ts`, ni en `infrastructure/esquema.ts`.
El motivo esta escrito en `territorio/application/puertosDeResidencias.ts:11-19`
y en `capa-territorial/design.md` §5: GGA marco dos veces el import del
`PersonaId` de `padron` como antipatron 8 **incluido `import type`**, porque
la regla de capas es sobre el tipo, no sobre el archivo, y `depcruise` solo
mira la ruta. La unica frontera que convierte es
`infrastructure/lectorDeTitularesPorPadron.ts`, que llama a `comoPersonaId`
justo antes de invocar la funcion tipada de `padron`.

La direccion inversa —`territorio` devolviendo `ResidenciaId` marcado y
`constancias` recibiendolo como `string`— **no necesita conversion ni cast**:
un `Identificador<"ResidenciaId">` es `string & {…}`, asignable a `string`
por ser mas especifico. Es la misma asimetria que ya explota
`residencias.personaId` (`esquema.ts:168`).

---

## 4. Decision 3 — El contador de folios: la sentencia, la prueba y el rollback

### La tabla

```
folios_de_documentos
  ayuntamientoId      columnaTenant()
  tipo                text notNull $type<TipoDeDocumento>
  anio                integer notNull
  ultimoConsecutivo   integer notNull

  primaryKey({ columns: [ayuntamientoId, tipo, anio],
               name: "folios_de_documentos_pk" })
  check("folios_tipo_valido", enumerado("tipo", TIPOS_DE_DOCUMENTO))
  check("folios_consecutivo_positivo", sql`ultimo_consecutivo > 0`)
  politicaTenant("folios_de_documentos")
```

**Sin columna `id` sustituta.** La identidad de un contador **es** la tripleta;
un uuid encima permitiria dos filas para la misma serie, que es exactamente
el estado que rompe la unicidad del folio. Y sin `folios_tenant_idx`: la PK
ya arranca con `ayuntamiento_id`.

### La sentencia, exacta

```ts
// infrastructure/contadorDeFoliosSql.ts
async siguiente(tx, { ayuntamientoId, tipo, anio }) {
  const [fila] = await tx
    .insert(foliosDeDocumentos)
    .values({ ayuntamientoId, tipo, anio, ultimoConsecutivo: 1 })
    .onConflictDoUpdate({
      target: [
        foliosDeDocumentos.ayuntamientoId,
        foliosDeDocumentos.tipo,
        foliosDeDocumentos.anio,
      ],
      set: {
        ultimoConsecutivo: sql`${foliosDeDocumentos.ultimoConsecutivo} + 1`,
      },
    })
    .returning({ consecutivo: foliosDeDocumentos.ultimoConsecutivo });

  return fila.consecutivo;
}
```

que Postgres recibe como:

```sql
INSERT INTO folios_de_documentos
       (ayuntamiento_id, tipo, anio, ultimo_consecutivo)
VALUES ($1, $2, $3, 1)
ON CONFLICT (ayuntamiento_id, tipo, anio) DO UPDATE
   SET ultimo_consecutivo = folios_de_documentos.ultimo_consecutivo + 1
RETURNING ultimo_consecutivo;
```

`folios_de_documentos.ultimo_consecutivo` a la derecha del `SET` se refiere a
**la fila existente**, no a la propuesta (`excluded.*` seria la propuesta).
Drizzle emite la referencia calificada y el destino del `SET` sin calificar,
que es lo que Postgres exige.

### Por que no tiene carrera

Dos transacciones, T1 y T2, del mismo `(ayuntamiento, tipo, anio)`:

- **La fila ya existe.** Las dos entran por la rama `DO UPDATE`. La primera
  toma lock exclusivo de esa fila; la segunda **bloquea hasta el COMMIT o el
  ROLLBACK de la primera**. Si T1 confirmo, T2 reevalua el conflicto contra la
  version nueva y devuelve `n+2`. Si T1 revirtio, T2 devuelve `n+1`. En los dos
  caminos el resultado es consecutivo y sin hueco.
- **La fila no existe** (primera constancia del anio). Las dos intentan
  `INSERT`. Una inserta especulativamente y la otra bloquea sobre el indice
  unico de la PK. Si T1 confirmo, T2 cae a `DO UPDATE` y devuelve 2; si T1
  revirtio, el `INSERT` de T2 prospera y devuelve 1. **Es el mismo argumento
  del indice unico parcial de `residencias`** (capa-territorial §8), con una
  diferencia que importa: ahi el segundo escritor falla, aca el segundo
  escritor **espera y sigue**, que es lo que una serie de folios necesita.

Eso es lo que resuelve el arranque sin fila semilla: no hay rama "si actualizo
cero filas, inserta", que es donde vivia la condicion de carrera de la
alternativa con `UPDATE … RETURNING` a secas.

**RLS no abre un hueco, y conviene ver por que.** `politicaTenant` declara
`USING` y `WITH CHECK` con la misma expresion. En un `ON CONFLICT DO UPDATE`,
Postgres evalua el `WITH CHECK` de INSERT sobre la fila propuesta y el `USING`
de UPDATE sobre la existente: las dos pasan porque `withTenant` ya fijo
`app.tenant` con el mismo `ayuntamientoId` que se inserta. Y un conflicto
contra la fila de **otro** municipio es estructuralmente imposible: la PK
arranca con `ayuntamiento_id`, asi que dos series de dos municipios nunca
colisionan. Dos ayuntamientos emiten `VEC-2026-000001` el mismo dia sin
tocarse.

### Rollback

La fila del contador es una tupla comun. Un ROLLBACK revierte el incremento
—y, si era la primera del anio, se lleva la fila entera—. **El folio no se
consume.** Esa es exactamente la propiedad que `AGENTS.md` antipatron 9 pide
al prohibir `nextval`: una secuencia es transaccion-independiente a
proposito y deja el hueco.

### Nivel de aislamiento — hecho verificado, no supuesto

`withTenant.ts:106` llama `bd.transaction(...)` **sin fijar nivel**, asi que
corre en el `READ COMMITTED` por defecto de Postgres. Importa porque
`ON CONFLICT DO UPDATE` bajo `REPEATABLE READ` o `SERIALIZABLE` puede
devolver `40001` en vez de esperar. Si alguna vez se sube el nivel de
`withTenant`, esta sentencia necesita reintento y esta seccion deja de ser
cierta. Va escrito aca porque el codigo no puede documentar un nivel que no
fija.

### Costo aceptado: la serie se serializa

Mientras una emision tiene el lock, cualquier otra del mismo
`(municipio, tipo, anio)` espera. Es una emision a la vez por serie. Se
acepta y se acota por diseno: **todo lo que puede fallar corre antes de
tomar el folio** (§10), asi que la ventana del lock son dos sentencias —el
contador y el `INSERT` de la constancia— mas el `registrar` de bitacora. El
render del PDF, que es lo unico caro y lo unico que depende de la red (R2),
**es otro request** (§11) y nunca esta adentro.

### **No medido**, y el test que lo cierra

No hay precedente de contador en el repo (verificado en la exploracion:
`contador|FOR UPDATE|advisory_lock|nextval` sobre `src/` no devuelve nada
util). Lo mas cercano es `residencias_una_abierta_idx`, que resuelve otro
invariante: puede **rechazar** un duplicado, no puede **generar** el
siguiente. Todo lo de arriba se deduce de la semantica documentada de
`ON CONFLICT` bajo `READ COMMITTED`; **no se corrio contra esta base**. Se
declara igual que capa-territorial §18 declaro el anidamiento de
`withTenant`.

Lo cierra `constancias/folio.integration.test.ts`, en la **misma rebanada que
la tabla** y no despues:

- **T6, dos emisiones que se cruzan de verdad.** Y aca hay una trampa que
  este diseno tiene que resolver por construccion:
  `vitest.config.ts:75` fija `DB_POOL_MAX: "1"` en el proyecto `integration`,
  asi que **dos `withTenant` disparados con `Promise.all` no se cruzan**: hay
  una sola conexion y se serializan solos. Es literalmente el hallazgo que ya
  documenta `mudanzas.integration.test.ts:100-112`. Ahi el problema se esquivo
  porque un indice unico rechaza, y basta un `INSERT` directo. **Aca no
  alcanza:** dos emisiones secuenciales dan 1 y 2 y el test pasa sin probar
  nada del lock.

  La segunda conexion existe y esta sancionada: `appSinTenant`
  (`municipiosDePrueba.ts:35`) es un cliente `postgres()` **propio**, con el
  rol `xula_app` y su propia conexion, ajeno al pool de `withTenant`. Se le
  agrega a ese mismo archivo un ayudante —`enTransaccionParalela(ayuntamientoId,
  trabajo)`, que abre `begin()`, fija `set_config('app.tenant', …, true)` y
  cede el control—. Va ahi y no en el test porque `scripts/reglas/reglas/tenancia.ts:43`
  reconoce el andamiaje por nombre (`/DePrueba\.ts$|\.isolation\.test\.ts$/`),
  y un `*.integration.test.ts` que importe `postgres` **es hallazgo del
  antipatron 2**.

  Forma del test: transaccion paralela toma el folio y se queda abierta →
  `emitirConstancia` normal se dispara y **no resuelve** (se comprueba con un
  `Promise.race` contra un temporizador: la promesa sigue pendiente) → la
  paralela hace COMMIT → la emision resuelve con el consecutivo siguiente. Lo
  que prueba es el bloqueo, que es lo unico que no se puede deducir de dos
  llamadas secuenciales.
- **T7, el rollback no consume folio.** Se compone
  `crearEmitirConstancia(contadorSql, repositorioQueFalla, …)` con un
  repositorio cuyo `guardar` lanza. Emitir falla; la emision siguiente, con el
  repositorio real, obtiene **el mismo numero**.
- **Dos municipios, misma serie.** Motul y Ticul emiten y los dos obtienen
  `VEC-2026-000001`.
- **El anio corta la serie.** Se siembra la fila `(motul, VECINDAD, 2025)` con
  `ultimoConsecutivo` alto y se verifica que 2026 arranca en 1.

### `GRANT` del contador: sin `DELETE`, y eso es la regla

```sql
GRANT SELECT, INSERT, UPDATE ON "folios_de_documentos" TO "xula_app";
```

Borrar una fila del contador reinicia la serie y hace que el proximo folio
repita uno ya entregado. Es la operacion mas destructiva posible sobre esta
tabla, y **la imposibilita la ausencia del permiso**, no una politica ni una
revision: mismo mecanismo con el que `bitacora` es de solo agregado
(`shared/tenancy/esquema.ts:115-120`).

---

## 5. Decision 4 — El snapshot congelado: que se denormaliza y que no

`constancias.datos` es `jsonb notNull`, validado con Zod en `application`
—leer y escribir con **el mismo validador**, precedente `shared/marca/validacion.ts`—.

```ts
// application/validacionDeSnapshot.ts
const esquemaDeSnapshot = z.object({
  titular: z.object({ nombreCompleto: z.string().min(1).max(300) }),
  direccion: z.object({
    texto: z.string().min(1).max(600),
    // Traza opaca de que residencia lo origino (proposal decision 17).
    // NUNCA se dereferencia: no hay lectura en este cambio que la use
    // para volver a la fila.
    residenciaId: z.string(),
    desdeEn: z.string(),          // fecha civil "YYYY-MM-DD"
  }),
  firmante: z.object({
    nombre: z.string().min(1).max(120),
    cargo: z.string().min(1).max(120),
  }),
  leyendaDePie: z.string().max(300).optional(),
});
```

| Dato | Forma | Por que |
|---|---|---|
| `personaId` | **FK compuesto vivo** a `personas(id, ayuntamiento_id)` | El historial por persona que piden las fases 3, 4 y 7 lo necesita, y compuesto porque un FK simple reabre el bypass entre municipios (`padron` decision 9). Es la unica referencia viva del documento |
| `nombreCompleto` | **denormalizado en `datos`** | `editarPersona` puede corregir un tipeo; el documento entregado no cambia por eso |
| `direccion.texto` | **denormalizado** | La direccion es **derivada** —se recorre la cadena de ancestros en cada lectura, no se almacena— asi que re-derivarla despues de un reparenteo da otra cadena. Es la consecuencia que capa-territorial §9 dejo escrita para esta fase |
| `direccion.desdeEn` | **denormalizado** | Decision 18: al operador se le muestra la fecha y el documento la imprime. Corregir la residencia despues no debe reescribir el papel |
| `direccion.residenciaId` | **uuid opaco en `datos`, sin FK** | Decision 17. Una FK viva invita a re-derivar; y un FK a una fila operativa mutable desde un registro inmutable acopla dos ciclos de vida distintos |
| `domicilioId` | **no se guarda** | `residencias` ya apunta a su domicilio. Una traza alcanza; dos ids denormalizados son dos cosas que pueden discrepar |
| `firmante`, `leyendaDePie` | **denormalizados** | Quien firmo **es** parte de lo que el documento dice, y el presidente municipal cambia cada tres anios (decision 9). Congelarlo es el motivo por el que el bloque de firma existe |
| **URL del escudo** | **NO se congela — se lee viva al renderizar** | **Correccion a la lectura obvia de la decision 12.** Congelarla produce una referencia colgada por construccion: `cambiarEscudo.ts:113-123` **borra el objeto anterior de R2** despues de escribir el nuevo. Una reimpresion con la URL vieja no renderiza el escudo viejo: no renderiza ninguno. Ademas el escudo es identidad institucional, no texto del documento: lo que el invariante 2 protege es lo que la constancia **dice**. **Limite declarado:** una reimpresion posterior a un cambio de escudo sale con el escudo nuevo |
| `municipio.nombre` | **no se guarda** | Se lee de `ayuntamientos` al renderizar. No cambia, y guardarlo seria una copia mas que puede divergir |

**Que le pasa al documento cuando se reparentea la colonia del titular:
nada, y es estructural.** El texto es una cadena adentro de una columna
`jsonb`; el reparenteo escribe `lugares.padre_id`. Ninguna columna de
`constancias` referencia `lugares`, `calles` ni `domicilios`: **no hay UPDATE
que omitir**. Mismo argumento de forma que capa-territorial §9, un nivel mas
arriba. El test que lo fija es de comportamiento y no de implementacion:
emitir, reparentear la colonia, releer la constancia **y su reimpresion**, y
comparar el texto caracter por caracter.

---

## 6. Decision 5 — Esquema de `constancias` y `reimpresiones`

`src/modules/constancias/infrastructure/esquema.ts`, ese nombre exacto:
`drizzle.config.ts:31` globea solo `esquema.ts` (`module-template.md:35-39`).
Las tres tablas en el mismo archivo.

```
constancias
  id                    uuid PK defaultRandom  $type<ConstanciaId>
  ayuntamientoId        columnaTenant()
  tipo                  text notNull $type<TipoDeDocumento>
  folio                 text notNull            -- "VEC-2026-000001"
  anio                  integer notNull
  consecutivo           integer notNull
  codigoVerificacion    text notNull            -- 64 bits, plano (§8)
  personaId             uuid notNull            -- sin .references(), sin $type
  datos                 jsonb notNull
  plantillaVersion      text notNull $type<VersionDePlantilla>
  emitidaPorUsuarioId   uuid notNull
  emitidaEn             timestamptz notNull defaultNow
  canceladaEn           timestamptz
  canceladaPorUsuarioId uuid
  motivoCancelacion     text $type<MotivoDeCancelacion>

  index("constancias_tenant_idx").on(ayuntamientoId)
  unique("constancias_id_tenant_key").on(id, ayuntamientoId)
  uniqueIndex("constancias_tenant_folio_idx").on(ayuntamientoId, folio)
  uniqueIndex("constancias_serie_idx")
    .on(ayuntamientoId, tipo, anio, consecutivo)
  index("constancias_persona_idx").on(ayuntamientoId, personaId)
  foreignKey([emitidaPorUsuarioId,   ayuntamientoId] -> usuarios[id, ayuntamientoId])
  foreignKey([canceladaPorUsuarioId, ayuntamientoId] -> usuarios[id, ayuntamientoId])
  check("constancias_tipo_valido",   enumerado("tipo", TIPOS_DE_DOCUMENTO))
  check("constancias_motivo_cancelacion_valido", ...)
  check("constancias_cancelacion_completa", sql`
    (cancelada_en IS NULL) = (motivo_cancelacion IS NULL)
    AND (cancelada_en IS NULL) = (cancelada_por_usuario_id IS NULL)`)
  check("constancias_consecutivo_positivo", sql`consecutivo > 0`)
  politicaTenant("constancias")

reimpresiones
  id             uuid PK defaultRandom $type<ReimpresionId>
  ayuntamientoId columnaTenant()
  constanciaId   uuid notNull $type<ConstanciaId>
  usuarioId      uuid notNull
  motivo         text notNull $type<MotivoDeReimpresion>
  ocurridoEn     timestamptz notNull defaultNow
  index("reimpresiones_tenant_idx").on(ayuntamientoId)
  index("reimpresiones_constancia_idx").on(ayuntamientoId, constanciaId)
  foreignKey([constanciaId, ayuntamientoId] -> constancias[id, ayuntamientoId])
  foreignKey([usuarioId,    ayuntamientoId] -> usuarios[id, ayuntamientoId])
  check("reimpresiones_motivo_valido", enumerado("motivo", MOTIVOS_DE_REIMPRESION))
  politicaTenant("reimpresiones")
```

**Correccion de nombre:** la propuesta la llama `momento`; queda `ocurridoEn`,
que es como se llama en `bitacora` y en `intentos_acceso`. Tres nombres para
la misma columna en tres tablas es exactamente lo que se corrige gratis
mientras la tabla no existe.

**Dos FK compuestos expresables y uno que no, y la diferencia es un limite de
modulo, no de Postgres.** `usuarios` vive en `shared/auth/esquema.ts` y una
capa `infrastructure` de modulo puede importar `shared`, asi que
`emitidaPorUsuarioId` y `canceladaPorUsuarioId` van con el `foreignKey()` de
Drizzle contra `usuarios_id_tenant_key` (`0001_auth.sql:47`). `personas`, en
cambio, es inalcanzable fuera de `padron` (`padron` design §2 capa A), asi que
ese FK se escribe a mano en la cola de la migracion (§13). El comentario de
`0001_auth.sql:101-103` ya lo habia anticipado: *"usuarios sin DELETE — borrar
la fila deja huerfanas las constancias que esa persona firmo"*. Este es el
cambio que convierte esa frase en una restriccion.

**`unique(id, ayuntamientoId)` en `constancias` y no en `reimpresiones`.**
Mismo criterio que capa-territorial §4: `constancias` lo lleva porque es
destino de un FK compuesto; `reimpresiones` es un hecho hoja y nada la
referencia. Agregarlo despues es una migracion aditiva de una linea.

**`folio` almacenado ademas de `anio`+`consecutivo`, y no derivado en la
lectura.** El texto es lo que se imprimio, y la decision 3 dice que el ancho
del relleno no es retroactivo: si el formato cambiara, re-derivar reescribiria
un folio ya entregado. Y los dos `unique` sirven propiedades distintas: uno
protege el texto y el otro la serie —un error de `padStart` produciria
`VEC-2026-0001` y `VEC-2026-00001` como dos folios "distintos" del mismo
consecutivo, y solo `constancias_serie_idx` lo agarra—.

**Ningun `sql\`\`` de este modulo nombra `personas` ni `persona_id`.**
`identidadPorPuerto.test.ts:16` aplica `/\bpersona_id\b|\bpersonas\b/` sobre
el contenido de cada plantilla `` sql`…` `` de todo `src/` fuera de `padron`.
`constancias.personaId` existe como columna `persona_id`, asi que la trampa
es la misma que capa-territorial §5 documento para `residencias`:
`constancias_persona_idx` se escribe con el builder
(`index(...).on(t.ayuntamientoId, t.personaId)`), nunca con un template. Las
plantillas `sql` que si existen en este modulo nombran `ultimo_consecutivo`,
`cancelada_en` y `motivo_cancelacion`, y ninguna dispara el test.

### `GRANT`

```sql
GRANT SELECT, INSERT, UPDATE ON "constancias"           TO "xula_app";
GRANT SELECT, INSERT         ON "reimpresiones"         TO "xula_app";
GRANT SELECT, INSERT, UPDATE ON "folios_de_documentos"  TO "xula_app";
```

`constancias` con `UPDATE` **solo** por la cancelacion: no hay ningun otro
caso de uso que escriba sobre una fila existente, y el invariante 2 prohibe
que lo haya. Sin `DELETE` en ninguna: un documento oficial no se borra.

`reimpresiones` **sin `UPDATE` y sin `DELETE`**, y eso es lo que convierte
*"el contador de reimpresiones nunca decrece"* de una regla que hay que
respetar en una que **no se puede violar**: el conteo es un `COUNT(*)` sobre
una tabla a la que la aplicacion solo puede agregar. Es el mismo mecanismo de
`bitacora` e `intentos_acceso`, y es la razon de fondo por la que la decision
13 rechazo el contador denormalizado.

---

## 7. Decision 6 — Las dos lecturas nuevas de `territorio`

La decision 16 pide que la regla de "cual residencia es la vigente" y la
composicion del texto vivan en `territorio`. Este diseno las implementa como
**dos funciones puras, un puerto, un adaptador y un solo caso de uso**.

### La regla de vigencia deja de estar en prosa

Hoy la regla —*primera fila con `hastaEn` null en el orden `desdeEn DESC,
creadoEn DESC`*— esta escrita en prosa en `puertosDeResidencias.ts:50-56` y
en `historialDeResidencias.ts:10-18`, y **la aplica el consumidor**. Se
convierte en una funcion de dominio:

```ts
// territorio/domain/residencia.ts  (archivo existente, funcion nueva)
export const vigenteDe = <R extends { hastaEn: string | null }>(
  historial: readonly R[],
): R | null => historial.find((r) => r.hastaEn === null) ?? null;
```

`find` y no un `sort`: `historialDe` **ya devuelve** en ese orden (es parte
de su contrato), asi que reordenar aca seria una segunda copia del criterio.
La UI de historial que hoy lo resuelve a mano adopta esta funcion **en la
misma rebanada**: ese es el pago concreto de la decision 16, y sin el la
regla queda escrita dos veces igual.

### La composicion del texto

```ts
// territorio/domain/direccion.ts  (archivo existente, funcion nueva)
export type PartesDeDireccion = {
  calle: string;
  numero: string | null;
  entreCalleA: string | null;
  entreCalleB: string | null;
  referencia: string | null;
  /** Ancestros del mas profundo al mas superficial: manzana → … → cabecera. */
  ancestros: readonly string[];
};

export const componerDireccion = (partes: PartesDeDireccion): string => …
```

Pura y en `domain`. **`"S/N"` se escribe aca**, no en la columna: `numero`
es `NULL` a proposito (`esquema.ts:110`), y el unico lugar donde esa ausencia
se vuelve texto es el momento de imprimirla.

### Builder contra CTE, y por que gana el CTE

`RepositorioDeLugares.buscarPorId` devuelve solo la fila propia
(`repositorioDeLugaresSql.ts:74-81`), asi que subir la cadena de ancestros es
trabajo nuevo. Tres candidatos:

| Candidato | Veredicto |
|---|---|
| **`WITH RECURSIVE` hacia arriba por `padreId`** | **Si.** Un viaje. Precedente en el mismo archivo (`subarbol`, `repositorioDeLugaresSql.ts:118-142`), con el motivo ya escrito ahi: Drizzle 0.45.2 no expresa un CTE auto-referente. Lleva el mismo cinturon `WHERE profundidad < 8` —el maximo real es 4 por el rango de tipos (capa-territorial §7)—, asi que un ciclo hecho a mano por `psql` degrada en una direccion incompleta y visible, no en una conexion colgada |
| Cuatro `buscarPorId` encadenados desde `application` | **No.** Cuatro a siete viajes adentro del camino de emision, que tiene presupuesto de < 2 s (`docs/06-frontend.md` §10); y reimplementa el ascenso en TypeScript cuando ya hay un CTE al lado que hace lo mismo hacia abajo |
| Cuatro `LEFT JOIN` de `lugares` consigo misma | **No, y es el que mas engana.** Fija la profundidad 4 en el SQL. Pero 4 es un **corolario** del rango de tipos, no una constante del esquema: el dia que entre un sexto tipo, la cadena de joins trunca la direccion **en silencio** mientras el CTE sigue devolviendola completa. El CTE degrada bien, el join degrada callado |

**La trampa de `identidadPorPuerto.test.ts`, que aca si aplica.** El CTE de
ancestros nombra `lugares`, `calles` y `domicilios`: ninguno dispara el regex.
Pero la otra mitad de la lectura —la residencia vigente— filtra `residencias`
por `persona_id`, y **eso no puede ir en un `sql\`\``**. No hace falta escribir
ninguno: `historialDe` ya existe, ya usa el builder y ya recibe la lista de
identidades. La lectura nueva se apoya en el, no lo reescribe.

### El puerto y el caso de uso

`territorio/application/puertos.ts` **esta en 199 lineas** (verificado leyendo
el archivo; la metrica de `AGENTS.md` es ≤ 200). Cualquier cosa que se le
agregue lo pasa. El puerto nuevo va en archivo propio, con el mismo criterio
de corte por area que ya produjo `puertosDeResidencias.ts`:

```ts
// territorio/application/puertosDeDirecciones.ts
export type LectorDeDirecciones = {
  partesDe(tx, domicilioId: DomicilioId): Promise<PartesDeDireccion | null>;
};
```

Y **un** caso de uso, no dos, porque es una sola pregunta:

```ts
// territorio/application/direccionVigenteDePersona.ts
direccionVigenteDePersona(personaId: string, contexto: ContextoActual)
  : Promise<{ residenciaId; domicilioId; desdeEn; texto } | null>

  identidades = await lecturaDePersonas.identidadesDe(personaId)  // FUERA de withTenant
  if (identidades.length === 0) return null
  return withTenant(contexto.ayuntamientoId, async (tx) => {
    const vigente = vigenteDe(await repositorio.historialDe(tx, identidades))
    if (!vigente) return null
    const partes = await lectorDeDirecciones.partesDe(tx, vigente.domicilioId)
    if (!partes) return null
    return { …vigente, texto: componerDireccion(partes) }
  })
```

`identidadesDe` **antes** de abrir la transaccion, nunca adentro: con
`DB_POOL_MAX=1` un `withTenant` anidado se traba, y en produccion consume dos
conexiones del pool por operacion (capa-territorial §6, que este caso de uso
hereda sin reabrir).

**Devuelve `null` y no lanza**, mismo criterio que `personaPorId`: quien
decide que eso es `SinResidenciaVigenteError` es `constancias`, no
`territorio`. `partesDe` devolviendo `null` significa que el domicilio no
existe o RLS lo esconde; para el llamador es lo mismo, y es lo correcto.

`LectorDeDirecciones` **si** recibe `tx` —a diferencia de `LecturaDePersonas`—
porque su implementacion vive en el mismo modulo y en la misma transaccion.
El `tx` en la firma de un puerto no es estilo: marca si el adaptador cruza o
no un limite de modulo.

---

## 8. Decision 7 — Codigo de verificacion y respuesta uniforme

### Tres identificadores, propiedades opuestas

| Columna | Propiedad | Quien la ve |
|---|---|---|
| `id` | uuid v4, no enumerable | Solo el panel autenticado |
| `folio` | secuencial **por invariante 2** | Impreso, publico |
| `codigoVerificacion` | aleatorio, alta entropia | Solo dentro del QR |

### De donde sale la entropia

`randomBytes(8).toString("hex")` de `node:crypto` — 16 caracteres, **64 bits**.
Sin dependencia nueva: el repo ya usa `node:crypto` (`randomUUID` en
`cambiarEscudo.ts:1`, `createHash` en `ritmo.ts:1`).

Por que 64 y no 128: el ataque es adivinacion **en linea** contra un endpoint
con limitacion de ritmo (§12). Con 30 intentos cada 15 minutos, recorrer una
fraccion apreciable de 2^64 excede cualquier escala util por muchos ordenes de
magnitud, y el limite no es lo unico que protege —sin codigo correcto la
respuesta ya es la generica—. Y hay una razon fisica para no pasarse: el
codigo viaja en el QR, y un payload mas largo sube la version del simbolo, o
sea achica el modulo impreso. Una hoja carta en blanco y negro salida de una
impresora de palacio municipal tiene que ser escaneable con un telefono viejo;
43 caracteres de base64 de 32 bytes compran seguridad que nadie necesita a
cambio de legibilidad que si.

### Se guarda en claro, y el argumento es concreto

Hashearlo suena a higiene y aca **no protege nada**:

1. **Contra quien lee la base, no aporta.** No es una credencial que cuide un
   secreto guardado en otro lado: cuida una fila que quien puede leer la
   columna ya tiene entera. `constancias.datos` trae el nombre y el domicilio
   en la **misma fila**. Un volcado con codigos hasheados y `datos` en claro
   no esconde nada.
2. **Rompe la reimpresion, que es un requisito.** La decision 12 exige que
   una reimpresion regenere el documento de forma determinista, y el documento
   **incluye el QR**. Un hash no vuelve a ser codigo: la reimpresion saldria
   con un QR distinto o sin QR, o sea seria otro documento.

Contraste honesto con `intentos_acceso`, que si hashea con pimienta: ahi la
columna es lo unico que hay, y en claro convertiria una tabla de conteo en un
directorio de quien tiene cuenta en cada municipio (`ritmo.ts:48-60`). La
diferencia no es el rigor, es que ahi el hash esconde algo y aca no.

**Lo que si se hereda de esa decision:** el codigo es tan sensible como
`datos`, lo protege el mismo `politicaTenant`, y **nunca va a un log** —cae
bajo la misma regla que nombre, CURP y domicilio (`AGENTS.md`, "Datos
personales")—.

En la exportacion **si va**, con su razon: el archivo municipal tiene que
poder reconstruir el documento, ya lleva el nombre y el domicilio de la misma
fila, y sale detras de `puedeExportar` con traza en bitacora. Un archivo sin
el codigo no reconstruye nada y no esconde nada que ese mismo archivo no diga.

### Comparacion: la hace Postgres, no es de tiempo constante, y hay razon

`WHERE folio = $1` trae la fila; **la comparacion del codigo la hace la funcion
pura de dominio**. No se usa `timingSafeEqual` y no es un olvido:

- Lo unico que un canal de tiempo podria distinguir es *"el folio existe pero
  el codigo esta mal"* de *"el folio no existe"*. **La existencia del folio ya
  es publica por diseno**: el nivel 1 —folio solo, sin codigo— responde
  vigente o no valido, y esa es la funcion que el roadmap pide. No queda
  secreto del otro lado de esa rama.
- La comparacion caracter a caracter del codigo si tendria fuga teorica. Sobre
  16 caracteres hex, tras la red, con 30 intentos cada 15 minutos por IP, no es
  un ataque: es una cota aritmetica, y va escrita como tal en §16.

### La uniformidad es estructural, no cuatro cadenas iguales

Tres capas, ninguna de las cuales depende de que alguien recuerde escribir el
mismo texto:

1. **El tipo prohibe la carga.** La variante negativa **no tiene campos**:
   ninguna rama *puede* colgarle un dato aunque quisiera.

   ```ts
   // constancias/domain/validacion.ts — puro, sin imports
   export type ResultadoDeValidacion =
     | { readonly estado: "NO_VALIDO" }
     | { readonly estado: "VIGENTE"; tipo: TipoDeDocumento; emitidaEn: string }
     | { readonly estado: "VIGENTE"; tipo: TipoDeDocumento; emitidaEn: string;
         titular: string; direccion: string };
   ```
2. **Una sola constante congelada.** `const NO_VALIDO = Object.freeze({ estado: "NO_VALIDO" } as const)`.
   Las ramas negativas devuelven **esa referencia**, no un literal nuevo. Dos
   copias de un literal divergen; dos referencias a la misma constante no.
3. **Dos de los cuatro casos no llegan a la funcion.** "Folio de otro
   municipio" y "folio inexistente" son el **mismo `null`** antes de entrar:
   los colapsa RLS, no una rama. Es el invariante 1 haciendo el trabajo
   (`errores.ts:25-33`: *"no existe" y "no te lo puedo mostrar" tienen que ser
   la misma respuesta*).

```ts
export const proyectarValidacion = (
  fila: FilaDeValidacion | null,
  codigo: string | null,
): ResultadoDeValidacion => {
  if (fila === null || fila.canceladaEn !== null) return NO_VALIDO;

  const publico = { estado: "VIGENTE", tipo: fila.tipo, emitidaEn: fila.emitidaEn } as const;
  if (codigo === null) return publico;

  return codigo === fila.codigoVerificacion
    ? { ...publico, titular: fila.titular, direccion: fila.direccion }
    : NO_VALIDO;
};
```

**El test que lo fija compara identidad, no forma:** `expect(resultado).toBe(NO_VALIDO)`
—`toBe`, no `toEqual`— para los cuatro escenarios. Un literal copiado pasaria
`toEqual` y **falla** `toBe`. Es la reja que atrapa exactamente el defecto que
la propiedad existe para evitar.

**Y la uniformidad tambien es del transporte:** la pagina responde **200
siempre**, nunca 404 para un folio inexistente. Un 404 reconstruye el oraculo
que la union acaba de cerrar. Va escrito porque es justo lo que se pierde al
implementar.

**Costo aceptado y nombrado:** un codigo mal escaneado da "no valido" sobre un
documento que si lo es. Es confuso para quien recibe el papel, y es el precio
de que un codigo equivocado no sea distinguible de un folio inventado. Se
observa en el piloto; aflojar despues —degradar a nivel 1 en vez de negar— es
cambiar una rama de una funcion pura.

---

## 9. Decision 8 — `configuracion_de_documentos`: validador y quien escribe

### La tabla

**Correccion sobre la version original de esta decision, encontrada por
GGA en la revision de la rebanada 2.** La primera version ponia el bloque
de firma en `ayuntamientos.documentos` (`jsonb`), calcando el precedente
de `marca`. El hallazgo: `ayuntamientos` tiene
`pgPolicy("ayuntamientos_directorio_publico", {for: "select", using:
sql\`true\`})` porque `resolverAyuntamientoPorSubdominio`
(`shared/tenancy/contexto.ts:35`) la lee **antes** de que exista contexto
de tenant —es lo que resuelve el tenant, no algo que ya lo tenga—, y por
eso nombre/subdominio/marca tienen que ser publicos ("estan en la fachada
del palacio", dice el comentario de esa politica). El bloque de firma no
tiene esa necesidad: se lee siempre dentro de la transaccion de
`emitirConstancia`, con el tenant ya resuelto. Ponerlo en `ayuntamientos`
heredaba una lectura publica sin proposito —exactamente lo que el mismo
comentario excluye a proposito ("lo que nunca se expone es la
operacion")— y el test de aislamiento que se escribio para probar lo
contrario resultaba una tautologia: filtraba por el propio `ayuntamientoId`
en el `WHERE`, asi que nunca le preguntaba a Postgres si la fila ajena era
alcanzable.

La correccion: tabla propia, `configuracion_de_documentos`, con
`politicaTenant()` normal —el mismo mecanismo que cualquier otra tabla
operativa del repo, no una excepcion—.

```sql
CREATE TABLE "configuracion_de_documentos" (
  "ayuntamiento_id" uuid PRIMARY KEY NOT NULL,
  "datos" jsonb DEFAULT '{}'::jsonb NOT NULL
);
```

Sin columna `id` sustituta, mismo criterio que `folios_de_documentos`: la
identidad es `ayuntamientoId`, una fila por municipio. `NOT NULL DEFAULT
'{}'`, no nullable: mismo motivo que la version original —dos
representaciones de "sin configurar" que todo lector tendria que tratar
por separado—.

**Sin `GRANT` de `DELETE`:** la configuracion se actualiza (`UPSERT`
sobre la PK), nunca se borra. Un ayuntamiento sin fila es "sin
configurar", el mismo estado que una fila con `datos = '{}'` que
`leerDocumentos` no puede distinguir de un bloque vacio configurado a
proposito —por eso `configurarDocumentos` (Fase 3) siempre hace `INSERT
... ON CONFLICT (ayuntamiento_id) DO UPDATE`, nunca dos caminos.

### Donde vive el validador, y por que no en `domain`

`constancias/application/validacionDeDocumentos.ts`. **No en `domain`**:
`dominio-no-importa-nada` (`.dependency-cruiser.cjs:22`) solo deja pasar
`npm-dev`, y Zod es dependencia de produccion. **No en `shared/`**: el
precedente `shared/marca/validacion.ts` esta ahi porque `shared/ui` tambien lo
necesita y `application-no-importa-shared-ui` lo empujo fuera de `shared/ui`
—aca los tres consumidores (el caso de uso de configuracion, `emitirConstancia`
y la plantilla PDF) viven dentro de `constancias`, y `shared` no puede importar
modulos—.

```ts
const esquemaDeDocumentos = z.object({
  firmanteNombre: z.string().trim().min(3).max(120),
  firmanteCargo:  z.string().trim().min(3).max(120),
  leyendaDePie:   z.string().trim().max(300).optional(),
});
```

**Plano y no anidado**, copiando `esquemaDeMarca`: `camposDe`
(`validacion.ts:108-118`) mapea el error al campo tomando `issue.path[0]`, y
eso solo funciona si el esquema no tiene objetos adentro. Un `firmante: { … }`
mandaria todos los errores al campo `"firmante"`.

**Los topes son de maquetacion, no de seguridad**, y por eso son numeros y no
regex: estos valores van a un PDF de estructura fija (`docs/06-frontend.md` §9,
subconjunto de flexbox), no a un atributo `style` —el vector que justifica la
lista blanca de colores de `marca` no existe aca—. Un cargo de 5.000
caracteres no inyecta nada: rompe la hoja.

### Dos funciones, y una diverge del precedente a proposito

```ts
export const validarDocumentos = (valor: unknown): ResultadoDeDocumentos
export const leerDocumentos    = (valor: unknown): Documentos | null
```

`leerMarca` devuelve `{}` cuando no valida, porque para colores el valor por
defecto es una respuesta correcta. **`leerDocumentos` devuelve `null`**, porque
la decision 19 dice que sin bloque de firma **no se emite**: degradar a valores
por defecto renderizaria la hoja sin firmante, que es justo lo que esa decision
prohibe. La divergencia respecto del precedente se escribe donde ocurre.

### Escritura: lista blanca compuesta, nunca la salida de Zod

`configurarDocumentos` lee el `jsonb` actual, compone `{ …actual, …campos }`,
valida el **resultado completo** con `validarDocumentos`, y escribe **el crudo
compuesto**, no `resultado.datos`. Es exactamente el mecanismo de
`marcaConEscudo` (`cambiarEscudo.ts:57-70`) y por el mismo motivo, que ya esta
explicado ahi y no se repite (antipatron 23): Zod descarta claves que no
conoce, y escribir su salida borraria en silencio un campo futuro.

Repositorio propio, no el de `marca`: `RepositorioDeDocumentos.{leer,escribir}`
en `constancias/application/puertosDeLectura.ts`, con
`infrastructure/repositorioDeDocumentosSql.ts` como calco de
`repositorioDeMarcaSql.ts` sobre la otra columna. Compartirlo obligaria a
`constancias` a importar `marca`, que es una arista entre modulos donde alcanza
un `tx.update(ayuntamientos)`.

### Quien puede escribirlo

`puedeAdministrarDocumentos = (rol: Rol) => rol === "ADMIN_MUNICIPAL"`, en
`shared/auth/roles.ts` junto a `puedeAdministrarTerritorio`, con su fila en la
tabla de `roles.test.ts` que recorre `ROLES` entero. Cubre **configurar y
cancelar** (decision 14). `SUPER_ADMIN` afuera, mismo criterio que
`puedeCambiarMarca` y por la misma razon: quien opera la plataforma no decide
quien firma un documento oficial de un municipio.

Su test de aislamiento es `documentos.isolation.test.ts`, espejo exacto de
`escudo.isolation.test.ts`: el `ADMIN_MUNICIPAL` de Motul no configura los
documentos de Ticul, y RLS corta aunque el `ayuntamientoId` se falsee.

---

## 10. Decision 9 — `emitirConstancia`: orden de las operaciones

```
emitirConstancia(personaId: string, contexto: ContextoActual)

  1. puedeEscribir(contexto.usuario.rol)          → NoAutorizadoError
     ─────────────────────────────────────────── fuera de toda transaccion

  2. titular = await lecturaDeTitulares.porId(personaId)
       (abre el withTenant de padron)
       null              → NoEncontradoError        (404, nunca 403)
       bajaEn !== null   → TitularDadoDeBajaError

  3. direccion = await lecturaDeDirecciones.vigenteDe(personaId)
       (abre el withTenant de territorio)
       null              → SinResidenciaVigenteError

  4. withTenant(contexto.ayuntamientoId, async (tx) => {         UNA transaccion
       a. documentos = leerDocumentos(await repoDocumentos.leer(tx, …))
            null        → DocumentosNoConfiguradosError   ← revierte, sin folio
       b. consecutivo = await contador.siguiente(tx, { tipo, anio })  ← el LOCK
       c. folio = Folio.crear(PREFIJOS[tipo], anio, consecutivo)
       d. await repositorio.guardar(tx, {
            id, ayuntamientoId, tipo, folio, anio, consecutivo,
            codigoVerificacion: nuevoCodigo(),
            personaId, datos: snapshot(titular, direccion, documentos),
            plantillaVersion: VERSION_ACTUAL[tipo],
            emitidaPorUsuarioId: contexto.usuario.id,
          })
       e. await registrar(tx, { accion: "EMITIR_CONSTANCIA",
                                entidad: "constancias", entidadId: id })
     })
```

**Los pasos 2 y 3 van afuera de la transaccion, y no es estilo.** Los dos
adaptadores llaman a casos de uso de otros modulos, que abren su propio
`withTenant`; invocarlos adentro seria un anidamiento. Con `DB_POOL_MAX=1` se
traba y en produccion consume dos conexiones por operacion
(capa-territorial §6). Aca ese orden obligado **converge con lo que el
contador necesita**: todo lo que puede rechazar la emision ocurre antes del
lock, asi que ningun rechazo llega a tocar el contador. El criterio de exito
*"emitir sin residencia vigente falla antes de tomar folio"* deja de ser una
regla y pasa a ser una consecuencia del orden.

**El paso 4a si va adentro, y tambien tiene prueba.** La lectura de
`configuracion_de_documentos` es del mismo tenant y no cruza modulos, asi que
no anida nada; y si lanza, el ROLLBACK ocurre **antes** del incremento del
contador. Ponerlo afuera costaria una cuarta transaccion por emision sin
ganar ninguna propiedad.

**Una sola traza y no dos**, a diferencia de `registrarMudanza`: la emision es
una decision sobre **una** entidad, y `bitacora.entidadId` la puede citar
entera. El motivo de cancelacion y el de reimpresion van en **su columna
tipada**, nunca dentro de `accion` (decision 13): la bitacora lleva solo ids
(ADR 0001 §5).

**Reimpresion y cancelacion**, mismo esqueleto:

```
reimprimirConstancia(id, motivo, contexto)
  puedeEscribir(rol)?               → NoAutorizadoError
  withTenant(tx =>
    fila = repositorio.buscarPorId(tx, id)   null → NoEncontradoError
    fila.canceladaEn !== null                     → DocumentoCanceladoError
    reimpresionId = repositorio.registrarReimpresion(tx, {…, motivo})
    registrar(tx, { accion: "REIMPRIMIR_CONSTANCIA", entidadId: id }))
  → devuelve reimpresionId, que la UI usa para el enlace del PDF (§11)

cancelarConstancia(id, motivo, contexto)
  puedeAdministrarDocumentos(rol)?  → NoAutorizadoError
  withTenant(tx =>
    UPDATE constancias SET cancelada_en, cancelada_por_usuario_id,
                           motivo_cancelacion
     WHERE id = $1 AND cancelada_en IS NULL   RETURNING id
    sin fila → NoEncontradoError  (inexistente, de otro tenant, o ya cancelada:
               las tres iguales — es el invariante 1 y ademas cancelar dos
               veces no tiene efecto que reportar)
    registrar(tx, { accion: "CANCELAR_CONSTANCIA", entidadId: id }))
```

El `UPDATE … WHERE cancelada_en IS NULL RETURNING id` es tambien el mecanismo
de concurrencia: dos cancelaciones simultaneas se serializan sobre la fila y la
segunda afecta cero filas. Sin rama adicional.

---

## 11. Decision 10 — El PDF: puerto, Route Handler y marca de agua

### El render **no puede** correr en `src/app`

`app-no-importa-infrastructure` (`.dependency-cruiser.cjs:79`) prohibe la
arista `src/app/` → `modules/*/infrastructure/`, y la plantilla vive ahi. Un
handler que importe `@react-pdf/renderer` y el componente **rompe el build**.
La propuesta (decision 11) describe el handler llamando a `renderToStream`
directo; este diseno lo corrige poniendo el render **detras de un puerto**,
que ademas realiza literalmente lo que esa misma decision pide —*"el handler
no consulta la base: pasa por el caso de uso"*— de forma estructural y no por
disciplina.

```ts
// application/puertosDeRender.ts
export type EntradaDeRender = {
  folio: string; tipo: TipoDeDocumento; plantillaVersion: VersionDePlantilla;
  datos: Snapshot; municipio: { nombre: string; escudo?: string };
  urlDeValidacion: string; reimpresion: boolean;
};
export type RenderizadorDeConstancias = {
  aPdf(entrada: EntradaDeRender): Promise<Uint8Array>;
};
```

Implementado en `infrastructure/renderizadorReactPdf.ts` (que es el unico
archivo del repo que importa `@react-pdf/renderer` y `qrcode`), cableado en
`composicion.ts`. Mismo patron que `AlmacenDeAssets` en `marca`, y con el
mismo beneficio: el caso de uso se prueba con un renderizador falso, sin
generar un PDF en cada test.

### `renderToBuffer`, no `renderToStream` — **correccion a la decision 11**

`@react-pdf/renderer@4.3.1` declara
`renderToStream: (doc) => Promise<NodeJS.ReadableStream>` y
`renderToBuffer: (doc) => Promise<Buffer>`
(`node_modules/@react-pdf/renderer/lib/react-pdf.d.ts:774,797`, version
verificada). Un Route Handler de Next devuelve un `ReadableStream` **web**, asi
que el stream de Node exige `Readable.toWeb(...)` y con el un cast desde
`NodeJS.ReadableStream`, que el tipo no garantiza. El buffer se devuelve tal
cual (`Buffer` es `Uint8Array`, `BodyInit` valido).

Lo que el stream compra es pico de memoria, y ese argumento no aplica al
tamano de este documento: `docs/06-frontend.md` §9 descarto el navegador
headless por *"picos de cientos de MB"*, no por unos cientos de KB. Se cambia
un cast por una asignacion. **Si un documento resulta pesar megabytes, la
decision se revierte en una linea** — el tamano esta declarado como no medido
(§16).

### El handler

`src/app/(panel)/constancias/[id]/pdf/route.ts`

```ts
export async function GET(_: Request, { params }) {
  // Los layouts NO envuelven Route Handlers: `(panel)/layout.tsx` no corre
  // aca, asi que la guarda de superficie y la de sesion se repiten. Sin la
  // primera, un request al dominio pelado haria que `contextoActual()`
  // resolviera un ayuntamiento inexistente y el 500 delataria que aca
  // adentro hay algo que espera un tenant — el mismo argumento que ya
  // escribe `(panel)/layout.tsx:18-22`.
  if ((await headers()).get(CABECERA_SUPERFICIE) !== "ayuntamiento") return notFound();
  const contexto = await contextoActual();
  if (!contexto) return new Response(null, { status: 401 });

  const { id } = await params;                       // Next 16: `await params`
  const reimpresion = new URL(request.url).searchParams.get("reimpresion");

  const { bytes, folio } = await pdfDeConstancia(
    { id: comoConstanciaId(id), reimpresionId: reimpresion }, contexto,
  );

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${folio}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
```

`inline` y no `attachment`: el operador ve la hoja y la manda a imprimir sin
que quede un archivo suelto en el disco de la PC del palacio. `no-store`
porque el PDF lleva nombre y domicilio, y una copia en el cache de un
navegador compartido es la fuga. El borde de error mapea `NoEncontradoError`
a 404 y todo lo demas a 500 con mensaje generico, calcando `conBorde` de
`api/auth/[...all]/route.ts:96-117`.

El boton de imprimir es `<a href={\`/constancias/${id}/pdf\`}>` desde un
Server Component: cero `"use client"` en todo el camino, que es el argumento
entero de la decision 11.

### La marca de agua es un parametro, y esta **probada**, no pedida

`?reimpresion=<uuid>` no elige el render: lo **acredita**. `pdfDeConstancia`
carga esa fila de `reimpresiones` con su FK compuesto contra
`(constanciaId, ayuntamientoId)`; si no existe, no es de esa constancia o es
de otro municipio, responde `NoEncontradoError` → 404. La fila solo puede
existir porque alguien llamo a `reimprimirConstancia`, que escribio usuario,
momento y motivo. **Un parametro inventado no produce una hoja con marca de
agua, y una hoja con marca de agua implica una fila de auditoria.**

`reimpresion: boolean` entra a la plantilla como prop. **Un documento, un
componente, un booleano** — nunca una segunda plantilla (`docs/06-frontend.md:509`).

**Limite declarado:** volver a pedir la URL sin el parametro devuelve el
original otra vez, y eso no queda registrado como reimpresion. Es deliberado:
el invariante 2 exige que **toda reimpresion** —la operacion del sistema, la
que la UI ofrece— quede registrada, y esa unica via pasa por la Server Action.
Un operador que reabre el enlace del original esta en la misma categoria que
uno que fotocopia la hoja: fuera del alcance del sistema, y el diseno no
pretende lo contrario.

### La plantilla y su version

```ts
// infrastructure/plantillas/registro.ts
export const PLANTILLAS = { "vecindad-v1": ConstanciaDeVecindadV1 } as const;
export const VERSION_ACTUAL = { VECINDAD: "vecindad-v1" } as const;
```

El renderizador busca por `plantillaVersion` del documento y lanza
`PlantillaDesconocidaError` si no esta. **Ese lookup es lo que hace cumplir la
decision 12** en vez de recordarla: borrar una version rompe visiblemente el
render de los documentos que la citan, en lugar de reimprimirlos con la
plantilla actual — que es el modo silencioso de romper el invariante 2, o sea
el peor.

### QR y escudo

QR: `qrcode@1.5.4`, `toDataURL(url)` a data URI embebido con `<Image>`. La URL
es `https://{subdominio}.{DOMINIO_BASE}/validar/{folio}?c={codigo}`; los dos
insumos ya existen (`ayuntamientoActual()` devuelve `subdominio`, y
`DOMINIO_BASE` ya lo usa `proxy.ts:40`). **Sin configuracion nueva.**

Escudo: los bytes se descargan **antes** de renderizar, con tope de tiempo, y
se pasan como `Buffer`; si falla, se pasa `undefined` y la plantilla omite la
imagen. `@react-pdf/renderer` bajando la URL por su cuenta convertiria un
tropiezo de R2 en una excepcion de render. Y —esto importa— **la emision ya
ocurrio en otro request**, asi que ni la latencia de R2 ni un fallo de red
estan nunca adentro del lock del contador ni ponen en riesgo un folio: lo peor
que pasa es que la descarga se repite.

---

## 12. Decision 11 — Limitacion de ritmo: generalizacion y CHECK

### El nucleo se generaliza; la forma de login queda como envoltorio

`limitarRitmo` tiene hoy firma de acceso (`{ correo, ip }`) y adentro tiene la
parte sutil: **abre su propia transaccion y lanza afuera de ella**. La primera
version lanzaba adentro y el `throw` se llevaba el registro del intento que
cortaba, o sea que el intento numero seis era gratis (`limitarRitmo.ts:40-53`).
Una "hermana" que compartiera tabla, hash y ventana pero no ese orden puede
reintroducir exactamente ese bug, y no hay tipo que lo impida.

```ts
// shared/auth/limitarRitmo.ts
export type Ventana = { tipo: TipoIntento; valor: string };

/** El nucleo: cuenta, registra, y lanza DESPUES de confirmar. */
export async function limitarRitmo(
  ayuntamientoId: AyuntamientoId, ventanas: readonly Ventana[],
): Promise<void> { … }

/** La forma del acceso, sin cambios para quien la llama. */
export const limitarRitmoDeAcceso = (
  ayuntamientoId: AyuntamientoId, datos: { correo: string | null; ip: string },
) => limitarRitmo(ayuntamientoId, [
  ...(datos.correo === null ? [] : [{ tipo: "correo" as const, valor: datos.correo }]),
  { tipo: "ip" as const, valor: datos.ip },
]);
```

**No es 100 % no invasivo, y conviene decirlo en vez de fingirlo.** Los
llamadores existentes conservan su forma de argumentos pero cambian de nombre:
`api/auth/[...all]/route.ts:67` (una linea), `ritmo.isolation.test.ts:25,29`
(dos lineas) y `ritmoDeLaRuta.test.ts` (el `vi.mock` y cuatro
`toHaveBeenCalledWith`). Es churn de renombre, no de comportamiento: los ocho
casos de ese test conservan su significado intacto. La alternativa —duplicar
el nucleo— evita el churn a cambio de duplicar la disciplina transaccional que
ese archivo documenta como bug ya cometido. Se elige el renombre.

### El tercer valor y su CHECK

`TIPOS_INTENTO` pasa a `["correo", "ip", "folio"]`
(`shared/auth/intentosAcceso.ts:22`). El CHECK vigente es
`tipo IN ('correo','ip')` (`drizzle/0001_auth.sql:19`), y Postgres no permite
alterar la expresion de un CHECK: son dos sentencias.

```sql
ALTER TABLE "intentos_acceso" DROP CONSTRAINT "intentos_acceso_tipo_valido";
ALTER TABLE "intentos_acceso" ADD CONSTRAINT "intentos_acceso_tipo_valido"
  CHECK (tipo IN ('correo', 'ip', 'folio'));
```

drizzle-kit 0.31.10 lleva `checkConstraints` en el snapshot (verificado:
`drizzle/meta/0007_snapshot.json` los trae), asi que `db:generate` deberia
emitir el par. **Se verifica leyendo el archivo generado, no se asume**: si no
aparece, se escribe a mano en la cola del mismo archivo, siguiendo ADR 0001 §2.

### La clave, el limite y la ventana

```ts
await limitarRitmo(ayuntamientoId, [{ tipo: "folio", valor: ip }]);
```

**Una sola ventana, y la clave es la IP, nunca el folio.** Con el folio como
clave, cada numero de la serie estrenaria su propia ventana y recorrerla
saldria gratis — que es exactamente el ataque. La IP es lo unico que un
enumerador no puede variar sin costo.

`LIMITES` gana `folio: 30`. Es del orden del limite por IP que ya existe (20)
y un poco mas alto por una razon con nombre: una institucion validando un lote
de documentos tiene la forma legitima del enumerador, y con la decision 6 quien
agota la ventana **no obtuvo ningun dato personal** —sin codigo, la respuesta
nunca trae nombre ni domicilio—. El limite protege contra raspado, no contra
fuga. **No medido**, y es un numero en una constante con test unitario: moverlo
no toca estructura.

Ventana de 15 minutos, `claveDe` con la misma pimienta: se reusa entero. La
ventana de `folio` es **independiente** de la de `ip` del login aunque compartan
`clave`, porque el conteo filtra tambien por `tipo`: el palacio probando
contrasenias no deja sin validar a nadie, y al reves tampoco.

### El limitador vive en el borde, y hay un test que lo obliga

Va en `src/app/validar/[folio]/page.tsx`, **antes** de llamar al caso de uso, y
no adentro. Precedente exacto y unico: `limitarRitmo` vive en `route.ts` y no
adentro de Better Auth, con el argumento del orden escrito en
`api/auth/[...all]/route.ts:49-60`. Ademas, meter la IP en la firma del caso de
uso publico contradice la decision 7, que la fija en
`{ ayuntamientoId, folio, codigo }`.

Lo que sostiene que no se olvide es el mismo mecanismo que ya usa el repo:
`validarFolio.ritmo.test.ts`, calco de `ritmoDeLaRuta.test.ts`, que verifica
con `invocationCallOrder` que el limitador corre **antes** que el caso de uso y
que un `RitmoExcedidoError` responde 429 sin haber consultado nada.
**Alternativa descartada:** pasar la `ip` al caso de uso lo volveria imposible
de olvidar, a cambio de meter un concepto de HTTP en una firma de `application`
que ningun caso de uso del repo tiene.

---

## 13. Flujo de datos

```
EMISION
  ui/FormularioDeEmision   (Server Component, <form action>)
    └─► emitirConstanciaAction        (Server Action, fila nueva en AGENTS.md)
          ├─ Zod safeParse en la primera linea
          ├─ contextoActual()                       tenant del servidor
          └─► emitirConstancia                      application/
                ├─ puedeEscribir(rol)?           →  NoAutorizadoError
                ├─ lecturaDeTitulares.porId()       FUERA de withTenant
                │    └─ padron.personaPorId → su propio withTenant
                ├─ lecturaDeDirecciones.vigenteDe() FUERA de withTenant
                │    └─ territorio.direccionVigenteDePersona → el suyo
                │         └─ identidadesDe → historialDe → vigenteDe()
                │            └─ WITH RECURSIVE hacia arriba por padre_id
                │               └─ componerDireccion()      domain, puro
                └─ withTenant(tx =>                 UNA transaccion
                     leerDocumentos(...)         → DocumentosNoConfiguradosError
                     INSERT folios_de_documentos ON CONFLICT DO UPDATE
                       RETURNING ultimo_consecutivo     ← EL LOCK
                     Folio.crear(prefijo, anio, consecutivo)   domain, puro
                     INSERT constancias (folio, datos, codigo_verificacion, …)
                       └─ constancias_persona_tenant_fk ← el otro municipio
                       └─ constancias_serie_idx        ← la serie
                     registrar(EMITIR_CONSTANCIA))

PDF                              (otro request: R2 nunca dentro del lock)
  GET /constancias/[id]/pdf[?reimpresion=<uuid>]
    ├─ CABECERA_SUPERFICIE == "ayuntamiento"?     los layouts no corren aca
    ├─ contextoActual()                        null → 401
    └─► pdfDeConstancia                           application/
          ├─ repositorio.buscarPorId       null → NoEncontradoError (404)
          ├─ si hay ?reimpresion: la fila tiene que existir Y ser de esta
          │    constancia               si no → NoEncontradoError (404)
          └─► RenderizadorDeConstancias.aPdf       puerto
                └─ infrastructure/renderizadorReactPdf
                     ├─ PLANTILLAS[plantillaVersion]  ← decision 12, o lanza
                     ├─ qrcode.toDataURL(https://sub/validar/folio?c=codigo)
                     ├─ escudo: bytes de R2, con tope; falla → sin escudo
                     └─ renderToBuffer(<Plantilla reimpresion={bool} …/>)

VALIDACION PUBLICA               (sin sesion; primera del repo que lee operativo)
  GET /validar/[folio]?c=<codigo>
    ├─ CABECERA_SUPERFICIE == "ayuntamiento"?  si no → notFound()
    ├─ { id } = await ayuntamientoActual()     subdominio, sin sesion
    ├─ limitarRitmo(id, [{ tipo:"folio", valor: ip }])  → 429   ← ANTES
    └─► validarFolio({ ayuntamientoId: id, folio, codigo })  caso de uso PUBLICO
          └─ withTenant(id, tx => repositorio.paraValidar(tx, folio))
               └─ RLS: folio de otro municipio  ≡  folio inexistente  ≡  null
          └─ proyectarValidacion(fila, codigo)          domain, puro
               └─ NO_VALIDO — la MISMA referencia en los cuatro caminos
    └─ HTTP 200 siempre. Un 404 rearmaria el oraculo que la union cerro.
```

---

## 14. Archivos

| Archivo | Accion | Rebanada |
|---|---|---|
| `territorio/domain/residencia.ts` (`vigenteDe`) · `domain/direccion.ts` (`componerDireccion`, `PartesDeDireccion`) + tests | Modificar | 1 |
| `territorio/application/puertosDeDirecciones.ts` · `direccionVigenteDePersona.ts` + tests | Crear | 1 |
| `territorio/infrastructure/lectorDeDireccionesSql.ts` (CTE de ancestros) | Crear | 1 |
| `territorio/composicion.ts` · `application/index.ts` · UI de historial adoptando `vigenteDe` | Modificar | 1 |
| `constancias/{index,types,composicion}.ts` | Crear | 2 |
| `constancias/domain/{identificadores,tipoDeDocumento,folio,motivos,validacion,errores,index}.ts` + tests | Crear | 2 |
| `constancias/infrastructure/{esquema,index}.ts` | Crear | 2 |
| `drizzle/0008_constancias.sql` (3 tablas + columna `documentos`, `FORCE`, `GRANT`, FK a `personas` a mano) | Crear | 2 |
| `constancias/{constancias,folios,reimpresiones,documentos}.isolation.test.ts` | Crear | 2 |
| `constancias/superficiePublica.test.ts` | Crear | 2 |
| `shared/auth/roles.ts` (`puedeAdministrarDocumentos`) + su fila en `roles.test.ts` | Modificar | 3 |
| `constancias/application/{validacionDeDocumentos,puertosDeLectura,configurarDocumentos,documentosDelAyuntamiento}.ts` + tests | Crear | 3 |
| `constancias/infrastructure/repositorioDeDocumentosSql.ts` · `ui/ConfiguracionDeDocumentos.tsx` · `src/app/(panel)/constancias/configuracion/page.tsx` | Crear | 3 |
| `shared/lib/fecha.ts` (`anioEnMerida`) + test | Modificar | 4 |
| `constancias/application/{puertos,validacionDeSnapshot,emitirConstancia,constanciaPorId,listarConstancias}.ts` + tests | Crear | 4 |
| `constancias/infrastructure/{contadorDeFoliosSql,repositorioDeConstanciasSql,lectorDeTitularesPorPadron,lectorDeDireccionesPorTerritorio}.ts` | Crear | 4 |
| `shared/tenancy/municipiosDePrueba.ts` (`enTransaccionParalela`) | Modificar | 4 |
| `constancias/folio.integration.test.ts` (T6, T7, dos municipios, corte de anio) · `emision.integration.test.ts` (snapshot congelado contra reparenteo) | Crear | 4 |
| `constancias/ui/` emision · `src/app/(panel)/constancias/{page,emitir,[id]}/…` · fila de `AGENTS.md` | Crear/Modificar | 4 |
| `constancias/application/{puertosDeRender,pdfDeConstancia}.ts` + tests | Crear | 5 |
| `constancias/infrastructure/{renderizadorReactPdf,plantillas/registro,plantillas/ConstanciaDeVecindadV1}.tsx` | Crear | 5 |
| `src/app/(panel)/constancias/[id]/pdf/route.ts` + test de borde | Crear | 5 |
| `constancias/application/{reimprimirConstancia,cancelarConstancia}.ts` + tests · UI · dos filas de `AGENTS.md` | Crear/Modificar | 6 |
| `constancias/reimpresionYCancelacion.integration.test.ts` | Crear | 6 |
| `shared/auth/{intentosAcceso,ritmo,limitarRitmo}.ts` (tercer tipo, `LIMITES.folio`, generalizacion) | Modificar | 7 |
| `api/auth/[...all]/route.ts` · `ritmoDeLaRuta.test.ts` · `ritmo.isolation.test.ts` (renombre) | Modificar | 7 |
| `drizzle/0009_ritmo_folio.sql` (DROP + ADD del CHECK) | Crear | 7 |
| `constancias/application/validarFolio.ts` + tests de uniformidad | Crear | 7 |
| `src/app/validar/[folio]/page.tsx` · `validarFolio.ritmo.test.ts` | Crear | 7 |
| `constancias/composicion.ts` (`porcionesDeConstancias`) · `src/app/exportacion/porciones.ts` · `composicion.test.ts` | Modificar | 8 |
| `docs/06-frontend.md` §9 (nota del Route Handler) · `docs/architecture/estructura.md` | Modificar | 8 |

---

## 15. Estrategia de pruebas

| Capa | Que | Como |
|---|---|---|
| Unit (domain) | `Folio.crear` con `padStart` que **no trunca** (consecutivo 1.000.000 → siete digitos y sigue unico), rechazo de consecutivo < 1 y no entero; `PREFIJOS` recorriendo `TIPOS_DE_DOCUMENTO` entero (forma de tabla de `roles.test.ts`, para que un tipo nuevo **falte** en vez de heredar); `proyectarValidacion` en los cuatro casos negativos con **`toBe(NO_VALIDO)`**, identidad y no forma; `vigenteDe` con cero, una y dos abiertas; `componerDireccion` con numero nulo → `S/N`, con y sin transversales, con y sin referencia; constructores de id rechazando no-UUID | Sin base. Milisegundos |
| Unit (application) | Guardas de rol (`puedeEscribir` para emitir/reimprimir, `puedeAdministrarDocumentos` para cancelar/configurar); **orden de llamada: los puertos de `padron` y `territorio` se invocan antes de abrir `withTenant`**; `DocumentosNoConfiguradosError` / `SinResidenciaVigenteError` / `TitularDadoDeBajaError` **antes** de tocar el contador; `leerDocumentos` devolviendo `null` y no `{}`; `validarDocumentos` como precondicion de escritura y la composicion de lista blanca conservando una clave desconocida; `pdfDeConstancia` con `?reimpresion` inexistente → `NoEncontradoError` | Puertos mockeados, renderizador falso. El test de orden es el que protege contra el anidamiento y contra consumir folio en un rechazo |
| Integration | **T6:** una transaccion paralela (`enTransaccionParalela`) toma el folio y no confirma; la emision concurrente **queda pendiente** (`Promise.race` con temporizador) y resuelve con el siguiente al COMMIT. **T7:** repositorio que lanza despues del contador; la emision siguiente obtiene **el mismo numero**. Dos municipios emiten `VEC-2026-000001` sin colisionar. La serie corta por anio. Snapshot congelado: emitir → reparentear la colonia → el texto de la constancia **y el de su reimpresion** son identicos caracter por caracter. `plantillaVersion` vieja se sigue renderizando con su componente. Una constancia con `persona_id` de otro municipio la **rechaza Postgres** nombrando `constancias_persona_tenant_fk`. `constancias_cancelacion_completa` rechaza una cancelacion a medias. Ritmo: la ventana de `folio` no se cruza con la de `ip` | Postgres real, `sembrar()`, dos tenants |
| Aislamiento | **Cuatro** archivos: `constancias`, `folios_de_documentos`, `reimpresiones` y `documentos` (este ultimo espejo de `escudo.isolation.test.ts`). Forma canonica de `invariantes-criticos.md` Capa 2 | Consulta deliberadamente sin filtro + id conocido del otro tenant |
| Borde / superficie | `pdf/route.ts`: 401 sin sesion, `notFound` fuera de la superficie de ayuntamiento, 404 por id ajeno, cabeceras exactas. `validar/[folio]/page.tsx`: **ritmo antes del caso de uso** (`invocationCallOrder`), 429 sin consultar, **200 en los cuatro negativos** y ningun nombre ni domicilio en el HTML sin codigo correcto | `vi.mock` de los casos de uso, forma de `ritmoDeLaRuta.test.ts` |
| Disciplina | `identidadPorPuerto.test.ts` **sin cambios** sigue verde con `constancias` presente (verificar, no asumir); `constancias/superficiePublica.test.ts`; `porcion.nombre` unicos contra `conjuntosDePlataforma`, `padron` y `territorio`; `pnpm layers`; `pnpm reglas` | Tests de repo |

Cobertura sobre `unit` + `integration` juntas, en el job con base.
`vitest.config.ts:102-106` incluye `src/modules/**/{domain,application}/**`,
asi que todo `constancias/domain` y `constancias/application` cuenta;
`infrastructure/esquema.ts` y las plantillas no, porque el `include` no las
alcanza. Piso 80/75. Por TDD estricto cada caso de uso llega en el mismo commit
que su test.

---

## 16. Supuestos y lo que no se midio

- **No medido: `ON CONFLICT DO UPDATE` como contador bajo concurrencia real**
  (§4). Se deduce de la semantica documentada de `ON CONFLICT` bajo
  `READ COMMITTED`; no se corrio contra esta base. Lo cierra
  `folio.integration.test.ts` en la rebanada 4, con el mecanismo de dos
  conexiones descrito ahi. Es el paralelo exacto del "no medido" que
  capa-territorial §18 declaro para el anidamiento de `withTenant`.
- **Hecho verificado, no medido: el nivel es `READ COMMITTED`.**
  `withTenant.ts:106` no fija ninguno. Si alguna vez se sube, la sentencia del
  contador necesita reintento por `40001`.
- **No medido: la serializacion de una serie.** Una emision a la vez por
  `(municipio, tipo, anio)`. A volumen municipal —unidades por dia— no hay
  motivo para medirlo; a escala de decenas por minuto habria que hacerlo.
- **No medido: tres transacciones secuenciales por emision** (titular,
  direccion, emision) contra el presupuesto de < 2 s de `docs/06-frontend.md`
  §10. La cuarta se elimino por diseno plegando la lectura de `documentos`
  dentro de la transaccion de emision (§10).
- **No medido: el tamano del PDF.** Se asume del orden de cientos de KB, y
  sobre ese supuesto descansa `renderToBuffer` sobre `renderToStream` (§11).
  Si un documento resulta pesar megabytes, la decision se revierte en una
  linea.
- **No medido: `LIMITES.folio = 30`.** Numero en una constante con test
  unitario; moverlo no toca estructura.
- **No medido: `intentos_acceso_ventana_idx` no incluye `tipo`**, y el conteo
  filtra por el. Es la forma que ya existe con dos tipos; este cambio agrega el
  tercero sin cambiarla. Agregar `tipo` al indice es aditivo.
- **No medido: la latencia de bajar el escudo de R2 en cada render.** Riesgo ya
  declarado por la propuesta. Este diseno agrega que el fallo degrada a un PDF
  sin escudo y que la emision —y por lo tanto el folio— nunca esta en juego,
  porque render y emision son requests distintos.
- **Cota aritmetica, no medicion: 64 bits de codigo de verificacion** contra un
  adivinador en linea limitado a 30 intentos cada 15 minutos por IP (§8).
- **Limite declarado: el codigo viaja en el query string** y puede quedar en
  los logs de acceso del proveedor o en un `Referer`. Moverlo a segmento de
  ruta (`/validar/{folio}/{codigo}`) no cambia nada: tambien queda en el log.
  Lo que acota el dano es que el codigo no abre nada que quien tiene el papel
  no tenga ya impreso al lado.
- **Supuesto declarado: `VERSION_ACTUAL` arranca con una sola entrada.** La
  decision 12 solo se vuelve visible con la segunda version de plantilla, y no
  la hay hasta despues de la ronda visual con el piloto.
- **Sigue sin muestra el formato del documento.** Es el riesgo alto de producto
  de la propuesta y este diseno no lo reduce: lo unico que hace es sacar de
  codigo las dos partes que mas probablemente esten mal (firmante y leyenda,
  §9).

---

## 17. Verificacion del corte

**Un hallazgo sobre el orden.** La propuesta encadena 5 → 6 → 7 con la
compuerta de revision visual entre 5 y 6. Por este diseno, la **rebanada 7
(validacion publica) no depende de la 5 ni de la 6**: depende de la 4 (que
existan constancias con folio y codigo) y de nada mas. Se puede correr
**mientras el piloto revisa la hoja impresa**, en vez de esperar a que cierre
la compuerta. Es la unica reordenacion que este diseno propone; el resto de las
dependencias de la propuesta se sostienen (3–8 despues de la 2; la 4 despues de
la 1 y la 3; la 6 despues de la 4 y la 5).

Ajustes de tamano que introduce este diseno: la rebanada 1 baja (`vigenteDe` y
`componerDireccion` son funciones en archivos existentes, no un puerto de
lectura nuevo en `territorio`: −40, +30 por adoptar `vigenteDe` en la UI); la
2 sube (los dos FK compuestos a `usuarios`, el CHECK de cancelacion completa,
la PK del contador: +50); la 4 sube (`enTransaccionParalela` y la forma real
del test T6: +60; `anioEnMerida`: +15); la 5 baja (el puerto de render y
`renderToBuffer` ahorran el plumbing de streams: −30); la 7 sube (el churn de
renombre en tres archivos de test: +30).

| # | Contenido | Lineas |
|---|---|---|
| 1 | `vigenteDe` + `componerDireccion` + puerto y CTE de ancestros + `direccionVigenteDePersona` + adopcion en la UI de historial | ~330 |
| 2 | Tres tablas + columna `documentos` en esquema, migracion con RLS/`FORCE`/`GRANT`/FK a mano, dominio completo (`Folio`, uniones, proyeccion pura, errores), cuatro aislamientos, superficie publica | ~740 |
| 3 | Validador Zod de documentos, `configurarDocumentos`, lectura, `puedeAdministrarDocumentos`, UI y ruta | ~280 |
| 4 | Contador + `emitirConstancia` + snapshot + dos adaptadores a otros modulos + `enTransaccionParalela` + T6/T7 + UI de emision | ~700 |
| 5 | Puerto de render, `renderizadorReactPdf`, plantilla de vecindad, QR, escudo degradable, Route Handler | ~520 |
| 6 | Reimpresion y cancelacion: casos de uso, marca de agua acreditada, motivos cerrados, UI, integracion | ~560 |
| 7 | Generalizacion del ritmo + migracion del CHECK + `validarFolio` + pagina publica + tests de uniformidad y de orden | ~470 |
| 8 | Tres porciones de exportacion + composicion + docs | ~170 |
| | **Total** | **~3.770** |

Ocho rebanadas, ninguna sobre 800, **secuenciales contra `main` y no
apiladas** (`CLAUDE.md`: "Un PR, un merge. Las ramas no se apilan").

Las rebanadas 2 (~740) y 4 (~700) son las que menos margen dejan, y las dos
tienen su corte de emergencia decidido de antemano para no improvisarlo con el
PR abierto:

- **La 2 no se parte por tabla.** Partirla dejaria una migracion intermedia
  donde `constancias` existe sin el FK compuesto contra `personas`, que es el
  bypass entre municipios que este cambio existe para cerrar. Si hay que
  cortar, sale **el dominio** (`Folio`, uniones, proyeccion, errores) a una
  rebanada 2b: es puro, no toca tenancy y no bloquea nada de la 3.
- **La 4 corta por la UI.** Contador, caso de uso y los dos tests de
  concurrencia van juntos —el invariante 2 pide que la reja llegue con la tabla
  y no despues— y la pantalla de emision se va a una 4b.

La rebanada 2 crea tres tablas y una columna de golpe, a proposito: un diff
largo que toca tenancy una sola vez se revisa mejor que dos diffs cortos con
una ventana insegura en medio (mismo criterio que capa-territorial §17).

---

## 18. Matriz de amenazas

`N/A` — el cambio no toca routing de shell, subprocesos, automatizacion de
git/PR, clasificacion de archivos ejecutables ni integracion de procesos. Las
cinco filas de `references/threat-matrix.md` son de esa clase.

Las superficies nuevas son de App Router: un Route Handler bajo el panel y una
pagina publica. Sus fronteras —tenant desde el contexto de servidor, 404 y no
403 por id ajeno, respuesta uniforme sin sesion, limitacion de ritmo— son los
invariantes 1 y 2, probados en los escenarios de aislamiento y en los tests de
borde de §15, no aca.

---

## 19. Migracion y despliegue

`drizzle/0008_constancias.sql` crea las **cuatro** tablas -`constancias`,
`reimpresiones`, `folios_de_documentos` y `configuracion_de_documentos`-, con
`FORCE ROW LEVEL SECURITY`, los `GRANT` y el FK compuesto a `personas` escrito
a mano **en el mismo archivo** (ADR 0001 §2: un
diff que solo toque lo generado se veria identico a una migracion que se olvido
del `FORCE`). El FK a mano lleva el mismo comentario que
`drizzle/0007_territorio.sql:103-120`, incluida la advertencia de que
`drizzle-kit push` lo borraria en silencio — apuntando ahi, sin repetirlo
(antipatron 23).

`drizzle/0009_ritmo_folio.sql` hace el DROP + ADD del CHECK de
`intentos_acceso`. Va en archivo propio y en la rebanada 7 porque es un cambio
de otra tabla, de otro modulo y de otra rebanada: mezclarlo con el de
`constancias` haria ilegible el diff que toca tenancy.

Sin migracion de datos: las tres tablas nacen vacias y `documentos` nace `{}`
para todos los municipios existentes. Sin extensiones nuevas. Rollback segun la
propuesta, en sus cuatro regimenes; este diseno agrega un detalle a uno de
ellos: **quitar la ruta `/validar` no requiere tocar la base**, porque el
codigo de verificacion ya esta escrito en las filas y la ruta puede volver
despues sin migracion.

---

## 20. Preguntas abiertas

- [ ] **El formato exacto del texto de la direccion** (orden de las partes,
      abreviaturas de `tipo` de lugar). Este diseno aporta la funcion pura y su
      firma; el texto lo fija `sdd-spec` con sus escenarios, y es lo unico que
      la ronda visual con el piloto puede mover sin tocar estructura.
- [ ] **Que responde la pagina publica cuando el codigo es correcto pero el
      documento esta cancelado.** Este diseno responde `NO_VALIDO` (la
      cancelacion se evalua antes que el codigo), que es lo que pide la
      decision 6; queda escrito como pregunta porque quien tiene el papel en la
      mano y ve "no valido" no distingue "cancelado" de "nunca existio", y esa
      es exactamente la intencion.
- [ ] **Si `LIMITES.folio` arranca en 30 o en 20.** Numero, no estructura.
- [ ] **Si la exportacion debe incluir `codigoVerificacion`.** Este diseno lo
      incluye con su argumento (§8); es una linea de `porcionesDeConstancias` si
      se decide lo contrario.
