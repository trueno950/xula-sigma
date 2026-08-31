# Diseno: Reportes ciudadanos (Fase 3)

**Cambio:** `reportes-ciudadanos` · **Base:**
`openspec/changes/reportes-ciudadanos/proposal.md`,
`openspec/changes/reportes-ciudadanos/exploration.md` · **Precedente:**
`openspec/changes/archive/2026-08-30-constancias-oficios/design.md` · **ADR
0001 §2 §5**

Este documento **no reabre las 15 decisiones de la propuesta**. Resuelve el
como: las firmas exactas de los puertos, la funcion pura que resuelve el
original de una cadena de duplicados y por que no puede iterar, la
composicion de "marcar duplicado" dentro de `cambiarEstadoDeReporte`, la
consulta indexada del buscador de similares, el DDL de las tres tablas con
sus FK compuestos, y la forma de la respuesta publica que hace estructural
lo que la decision 12 pide.

La mecanica base **no se rediseña**: folio bajo lock, caso de uso publico
sin `ContextoActual`, puertos de lectura cruzados, bitacora y limitacion de
ritmo ya corren en produccion en `constancias`. Cada vez que este documento
las usa, **apunta al archivo y no repite el argumento** (antipatron 23 de
`AGENTS.md`, filtro 3 de `CLAUDE.md`).

Trae **tres correcciones a la propuesta**, cada una argumentada donde
aparece: los FK compuestos escritos a mano son **tres y no cuatro** —el
autorreferencial si lo expresa Drizzle, §6—; el CHECK que ata
`DUPLICADO` al vinculo necesita `IS NOT DISTINCT FROM` y no `=`, o pasa en
verde el caso que existe para rechazar (§5); y el alta escribe **su propia
fila** en `movimientos_de_reportes`, que es lo unico que explica por que
`estadoAnterior` es nullable (§12).

Y trae **tres respuestas del usuario** a preguntas que una version anterior
de este documento dejo abiertas, ya incorporadas al diseño y **ya no
abiertas**: la consulta publica de un duplicado devuelve la **fecha de
registro propia** y el estado y el ultimo movimiento del original (§14);
`RECIBIDO → RESUELTO` **es transicion valida** (§7); y `referencia` **se
queda**, con la decision 13 cubriendo las **dos** cajas de texto libre bajo
las mismas tres protecciones (§5).

---

## 1. Enfoque tecnico

Modulo `src/modules/reportes/` con las cuatro capas y `composicion.ts` en la
raiz, igual que `padron`, `marca`, `territorio` y `constancias`. Mas una
lectura nueva en `territorio` (decision 10) y una regla nueva en
`shared/auth/roles.ts` (decision 6).

El eje del diseño no es el esquema —la propuesta ya lo fijo en forma— son
**cuatro garantias que ninguna capa sostiene sola**:

1. **Un folio no se repite ni deja hueco.** Lo sostiene una sola sentencia
   de Postgres, no una rama de TypeScript. Es el mecanismo de `constancias`
   §4 con una columna menos en la PK (§4).
2. **Un duplicado apunta siempre a un no-duplicado, y la lectura publica
   nunca itera.** Lo sostiene una funcion pura **sin ciclo escrito** mas el
   orden "resolver antes de guardar", no una regla que alguien recuerde
   (§8). La consecuencia es lo que la decision 14 promete: un ciclo metido
   por SQL crudo degrada a un estado equivocado, visible y acotado, y no a
   un bucle en una superficie sin sesion.
3. **La respuesta publica no puede filtrar el folio del original.** Lo
   sostiene un tipo **que no tiene campo `folio`**, no una revision del que
   escribe la pagina (§14).
4. **La transicion, el vinculo y el movimiento confirman o fallan juntos.**
   Lo sostiene una sola transaccion y un `UPDATE` condicionado, no un
   segundo caso de uso que alguien tenga que acordarse de llamar (§12).

Todo lo demas de este documento es consecuencia de ese reparto.

---

## 2. Capas del modulo, y la direccion de cada arista

| Pieza | Capa | Por que ahi |
|---|---|---|
| `identificadores.ts`, `tipoDeIncidencia.ts`, `areaResponsable.ts`, `estado.ts` (union + tabla de transiciones), `motivos.ts`, `folio.ts`, `duplicado.ts` (resolucion del original), `consulta.ts` (proyeccion publica pura), `errores.ts` | `domain` | Puro y sin imports, **ni siquiera Zod ni `shared`**. Es lo que corre en la suite `unit` en milisegundos, y es la rebanada 2 entera |
| `puertos.ts` (repositorio + contador + movimientos), `puertosDeLectura.ts` (ubicaciones, reportantes), `validacionDeReporte.ts` (Zod), un archivo por caso de uso | `application` | Precedente `padron` design §5: los puertos viven en `application`. Zod vive aca y no en `domain` por `dominio-no-importa-nada` |
| `esquema.ts`, adaptadores SQL, los dos lectores cruzados | `infrastructure` | Otro modulo es el mundo exterior (`AGENTS.md` antipatron 8) |
| Listado, detalle con historial, alta con buscador, Server Actions | `ui` | — |
| `composicion.ts`, `index.ts`, `types.ts` | raiz | Cableado y superficie |

**Verificacion contra `.dependency-cruiser.cjs`, arista por arista.** Se leyo
el archivo, no se asumio.

| # | Arista nueva | Regla que la mira | Veredicto |
|---|---|---|---|
| 1 | `reportes/domain/*` → nada | `dominio-no-importa-nada` (l. 12): `to.pathNot` mas `dependencyTypesNot: ["npm-dev"]` | **Permitida solo si no importa Zod ni `shared`.** Por eso `PATRON_UUID` se reescribe (§3) y la validacion Zod vive en `application` |
| 2 | `reportes/application/*` → `reportes/domain`, `shared/{auth/contexto,auth/roles,lib/errores,lib/fecha,tenancy/*}`, `zod` | `application-no-importa-infra-ni-ui` (l. 25), `application-no-importa-shared-ui` (l. 40) | Permitida. No toca `shared/ui` ni `infrastructure` |
| 3 | `reportes/infrastructure/esquema.ts` → `shared/tenancy/esquema`, **`shared/auth/esquema`** (objeto `usuarios`, §5), `../domain` | ninguna la prohibe; `shared-no-importa-modulos` (l. 71) es la direccion contraria | Permitida |
| 4 | `reportes/infrastructure/lectorDeUbicacionesPorTerritorio.ts` → `@/modules/territorio` | `modulo-no-importa-interior-de-otro` (l. 59): `pathNot` deja pasar `^src/modules/[^/]+/index\.(ts\|tsx)$` | Permitida **solo por el barrel**. Con `tsPreCompilationDeps: true` (l. 139) un `import type` del interior rompe el build igual que uno de valor |
| 5 | `reportes/infrastructure/lectorDeReportantesPorPadron.ts` → `@/modules/padron` | idem | Permitida por el barrel |
| 6 | `reportes/ui/*` → `application`, `composicion`, `domain`, `shared` | `ui-no-importa-infrastructure` (l. 51) | Permitida; nunca `infrastructure` |
| 7 | `src/app/(panel)/reportes/**/page.tsx` → `@/modules/reportes` | `app-no-importa-infrastructure` (l. 79) prohibe `src/app/` → `modules/*/(infrastructure\|domain)/` | Permitida: la arista es al barrel |
| 8 | `src/app/reportes/[folio]/page.tsx` → `@/modules/reportes`, `@/shared/tenancy/contexto`, `@/shared/auth/limitarRitmo` | ninguna prohibe `src/app/` → `src/shared/` | Permitida. Mismo camino que `src/app/validar/[folio]/page.tsx` |
| 9 | `src/app/exportacion/porciones.ts` → `@/modules/reportes` | idem 7 | Permitida |
| 10 | **`reportes/infrastructure/esquema.ts` → `lugares`/`calles`/`personas`** | regla 4 | **PROHIBIDA, y es la que decide §6.** Los tres objetos de tabla viven en el interior de otro modulo y ninguno sale por su barrel, asi que esos tres FK compuestos no existen como `foreignKey()` de Drizzle |
| 11 | Ciclos | `sin-ciclos` (l. 123) | **Sin ciclo.** `reportes` importa `territorio` y `padron`; ninguno de los dos importa `reportes`. `territorio` gana un caso de uso nuevo pero no una arista de vuelta |
| 12 | Dependencias | `sin-dependencias-fantasma` (l. 129) | **Cero dependencias nuevas.** Sin extensiones nuevas de Postgres: el unico `WITH RECURSIVE` (§9) es SQL estandar, igual que los dos que ya tiene `territorio` |
| 13 | Paquetes acotados | `auth-solo-desde-shared-auth` (l. 87), `s3-solo-desde-el-almacen-de-assets` (l. 107) | No se disparan: `reportes` no importa `better-auth`, `@node-rs/argon2` ni `@aws-sdk/client-s3`. No hay fotografias en esta fase |

---

## 3. Identificadores: los propios marcados, los ajenos como `string`

`reportes/domain/identificadores.ts` reusa la forma generica de
`territorio/domain/identificadores.ts`: `ReporteId` y `MovimientoId`. Es el
**noveno y decimo** lugar del repo con el mismo `PATRON_UUID`, y sigue sin
arreglarse por la misma razon que ahi: arreglarlo es aflojar
`dominio-no-importa-nada`. No se vuelve a argumentar; se apunta.

**`lugarId`, `calleId` y `personaId` viajan como `string` dentro de
`reportes`, sin excepcion.** Ni en `domain`, ni en `application/puertos*.ts`,
ni en `infrastructure/esquema.ts`. El motivo esta escrito en
`territorio/application/puertosDeResidencias.ts:11-19` y en
`constancias/design.md` §3: GGA marco dos veces el import del `PersonaId` de
`padron` como antipatron 8 **incluido `import type`**, porque la regla de
capas es sobre el tipo y `depcruise` solo mira la ruta. Las unicas dos
fronteras que convierten son los adaptadores de `infrastructure`
(`lectorDeUbicacionesPorTerritorio.ts` y `lectorDeReportantesPorPadron.ts`),
calcados de `lectorDeTitularesPorPadron.ts:20`.

**`duplicadoDeReporteId` es la excepcion inversa y conviene verla.** Es un
`ReporteId` —del propio modulo— pero **viaja como `string` igual**, porque
llega de un formulario: el momento en que se vuelve `ReporteId` es el
`comoReporteId()` del borde, y tiparlo antes seria afirmar en TypeScript algo
que todavia no se verifico. Es el mismo criterio con el que
`src/app/(panel)/territorio/page.tsx` usa `comoLugarId` sobre `?raiz=`.

**Cambio en el barrel de `territorio`.** Hoy exporta solo
`{ comoLugarId, type LugarId }` (`territorio/index.ts:12`). La lectura nueva
de la decision 10 recibe tambien un `calleId`, asi que la linea pasa a
`export { comoCalleId, comoLugarId, type CalleId, type LugarId } from "./domain"`,
y `territorio/superficiePublica.test.ts` **se actualiza en la misma
rebanada**: ese test existe para que la superficie del modulo cambie a
proposito y no por arrastre.

---

## 4. Decision 2 — El contador de folios: la sentencia y lo que se hereda

### La tabla

```
folios_de_reportes
  ayuntamientoId      columnaTenant()
  anio                integer notNull
  ultimoConsecutivo   integer notNull

  primaryKey({ columns: [ayuntamientoId, anio],
               name: "folios_de_reportes_pk" })
  check("folios_de_reportes_consecutivo_positivo", sql`ultimo_consecutivo > 0`)
  politicaTenant("folios_de_reportes")
```

**Sin columna `id` sustituta y sin indice de tenant**, por las dos razones ya
escritas en `constancias/design.md` §4 y en `esquema.ts:165-170`: la
identidad de un contador **es** la tupla, y la PK ya arranca con
`ayuntamiento_id`. Aca la tupla es **doble** y no triple: la decision 2 cerro
que no se segmenta por tipo de incidencia.

Sin `check` de tipo valido —no hay columna `tipo`—, que es la unica
diferencia de DDL respecto de `folios_de_documentos`.

### La sentencia, exacta

```ts
// infrastructure/contadorDeFoliosSql.ts
async siguiente(tx, { ayuntamientoId, anio }) {
  const [fila] = await tx
    .insert(foliosDeReportes)
    .values({ ayuntamientoId, anio, ultimoConsecutivo: 1 })
    .onConflictDoUpdate({
      target: [foliosDeReportes.ayuntamientoId, foliosDeReportes.anio],
      set: {
        ultimoConsecutivo: sql`${foliosDeReportes.ultimoConsecutivo} + 1`,
      },
    })
    .returning({ consecutivo: foliosDeReportes.ultimoConsecutivo });

  return fila.consecutivo;
}
```

**Por que no tiene carrera, por que un ROLLBACK no consume folio, por que RLS
no abre un hueco y por que el nivel `READ COMMITTED` importa: esta escrito
entero en `constancias/design.md` §4 y no se repite.** Lo unico que cambia es
la aridad del `ON CONFLICT`. La conclusion se hereda con la misma fuerza
porque el mecanismo es identico, y ahora ademas **esta medido**: la deduccion
que aquel documento declaro como "no medido" la cerro
`constancias/folio.integration.test.ts` contra esta base. Es la unica linea
de este diseño donde `reportes` esta mejor parado que su precedente.

### El anio y el folio

`anioEnMerida()` (`shared/lib/fecha.ts:24`), **nunca `getFullYear()`**: ya
existe, ya tiene test, y el bug que evita ya esta explicado ahi.

```ts
// domain/folio.ts — puro
export const PREFIJO_DE_REPORTE = "REP";

export class Folio {
  private constructor(private readonly valor: string) {}
  static crear(anio: number, consecutivo: number): Folio { … }
  toString(): string { return this.valor; }
}
```

**Propio, no el de `constancias`** (decision del enfoque de la propuesta:
cero acoplamiento entre modulos). La diferencia visible con
`constancias/domain/folio.ts:10` es que **el prefijo no es parametro**: hay
una sola serie, asi que un `crear(prefijo, …)` invitaria a pasar otro. Misma
regla de `padStart(6, "0")` sin recorte y mismo rechazo de consecutivo `< 1`
o no entero; lo que protege la unicidad es
`reportes_serie_idx`, no el ancho del texto.

`folio` se **almacena** ademas de `anio` + `consecutivo`, y los dos `unique`
sirven propiedades distintas: uno protege el texto y el otro la serie. El
argumento completo esta en `constancias/design.md` §6.

---

## 5. Decisiones 3, 4, 5, 8, 9, 11, 13 y 14 — El esquema

`src/modules/reportes/infrastructure/esquema.ts`, ese nombre exacto:
`drizzle.config.ts:31` globea solo `esquema.ts`. Las tres tablas en el mismo
archivo. Ninguna se reexporta desde ningun barrel del modulo
(`superficiePublica.test.ts`, mismo patron que `territorio` y `constancias`).

```
reportes
  id                     uuid PK defaultRandom $type<ReporteId>
  ayuntamientoId         columnaTenant()
  folio                  text notNull            -- "REP-2026-000123"
  anio                   integer notNull
  consecutivo            integer notNull
  tipo                   text notNull $type<TipoDeIncidencia>
  estado                 text notNull $type<EstadoDeReporte>
  areaResponsable        text $type<AreaResponsable>      -- nullable (decision 6)
  lugarId                uuid notNull            -- sin .references(), sin $type
  calleId                uuid                    -- idem
  referencia             text                    -- ver "la segunda caja libre"
  descripcion            text notNull
  personaId              uuid                    -- idem (decision 11)
  motivoDeRechazo        text $type<MotivoDeRechazo>
  duplicadoDeReporteId   uuid $type<ReporteId>   -- FK compuesto AUTORREFERENCIAL
  registradoPorUsuarioId uuid notNull
  registradoEn           timestamptz notNull defaultNow
  actualizadoEn          timestamptz notNull defaultNow

  index("reportes_tenant_idx").on(ayuntamientoId)
  unique("reportes_id_tenant_key").on(id, ayuntamientoId)
  uniqueIndex("reportes_tenant_folio_idx").on(ayuntamientoId, folio)
  uniqueIndex("reportes_serie_idx").on(ayuntamientoId, anio, consecutivo)
  index("reportes_duplicado_idx").on(ayuntamientoId, duplicadoDeReporteId)
  index("reportes_similares_idx").on(ayuntamientoId, lugarId, tipo, estado)

  foreignKey([registradoPorUsuarioId, ayuntamientoId] -> usuarios[id, ayuntamientoId])
  foreignKey([duplicadoDeReporteId,   ayuntamientoId] -> reportes[id, ayuntamientoId])

  check("reportes_tipo_valido",   enumerado("tipo", TIPOS_DE_INCIDENCIA))
  check("reportes_estado_valido", enumerado("estado", ESTADOS_DE_REPORTE))
  check("reportes_area_valida",       area IS NULL OR enumerado(...))
  check("reportes_motivo_valido",     motivo IS NULL OR enumerado(...))
  check("reportes_rechazo_completo",
        (estado = 'RECHAZADO') = (motivo_de_rechazo IS NOT NULL))
  check("reportes_duplicado_con_motivo",
        (motivo_de_rechazo IS NOT DISTINCT FROM 'DUPLICADO')
        = (duplicado_de_reporte_id IS NOT NULL))
  check("reportes_sin_autoduplicado", duplicado_de_reporte_id <> id)
  check("reportes_consecutivo_positivo", consecutivo > 0)
  politicaTenant("reportes")

movimientos_de_reportes
  id              uuid PK defaultRandom $type<MovimientoId>
  ayuntamientoId  columnaTenant()
  reporteId       uuid notNull $type<ReporteId>
  usuarioId       uuid notNull
  estadoAnterior  text $type<EstadoDeReporte>
  estadoNuevo     text $type<EstadoDeReporte>
  areaAsignada    text $type<AreaResponsable>
  motivo          text $type<MotivoDeRechazo>
  ocurridoEn      timestamptz notNull defaultNow

  index("movimientos_de_reportes_tenant_idx").on(ayuntamientoId)
  index("movimientos_de_reportes_reporte_idx").on(ayuntamientoId, reporteId)
  foreignKey([reporteId, ayuntamientoId] -> reportes[id, ayuntamientoId])
  foreignKey([usuarioId, ayuntamientoId] -> usuarios[id, ayuntamientoId])
  check("movimientos_estado_anterior_valido", …)
  check("movimientos_estado_nuevo_valido",    …)
  check("movimientos_area_valida",            …)
  check("movimientos_motivo_valido",          …)
  check("movimientos_no_vacio",
        estado_nuevo IS NOT NULL OR area_asignada IS NOT NULL)
  check("movimientos_motivo_solo_en_rechazo",
        motivo IS NULL OR estado_nuevo IS NOT DISTINCT FROM 'RECHAZADO')
  politicaTenant("movimientos_de_reportes")
```

### `IS NOT DISTINCT FROM` y no `=` — **correccion**

`constancias_cancelacion_completa` compara con `IS NULL` de los dos lados, y
`IS NULL` siempre devuelve booleano. Aca no: `motivo_de_rechazo = 'DUPLICADO'`
con `motivo_de_rechazo` nulo evalua a **NULL**, y `NULL = false` es NULL, y
**un CHECK cuyo resultado es NULL pasa**. Escrito con `=`, la restriccion
dejaria entrar exactamente la fila que existe para rechazar: sin motivo y con
vinculo de duplicado. `IS NOT DISTINCT FROM` es la comparacion segura contra
nulos y devuelve booleano siempre. Va escrito aca porque la forma correcta se
ve identica a la incorrecta en el diff.

### `reportes_sin_autoduplicado`: el ciclo de largo 1, y el limite declarado

Espejo exacto de `lugares_sin_autopadre`
(`territorio/infrastructure/esquema.ts:58`), con el mismo alcance y la misma
honestidad: **cierra el unico ciclo expresable en una fila**. Un ciclo de
largo >= 2 —A duplicado de B, B duplicado de A— queda fuera de este CHECK, y
la aplicacion nunca lo puede escribir por el orden de §8. Que pasa si entra
por `psql`: §8 lo responde y lo prueba.

### La segunda caja de texto libre — **correccion declarada**

La decision 13 dice que `descripcion` es **la unica** caja de texto libre del
modulo. La decision 9 pide ademas `referencia`, texto corto opcional. Son dos.
Este diseño no reabre ninguna de las dos —las dos columnas existen— y resuelve
la tension por el lado que no afloja nada: **`referencia` hereda las tres
protecciones de `descripcion`** —largo maximo en el validador Zod, etiqueta
explicita en la UI sobre no anotar datos de vecinos, y cero exposicion
publica (§14)—. Queda como pregunta abierta (§20) si el spec debe redactar
la decision 13 como "las dos unicas".

Topes: `descripcion` 10..1000, `referencia` 0..200. Son de captura, no de
seguridad: el dato que hay que cuidar es que un operador escriba un nombre, y
eso ningun tipo lo valida —se declara como limite, no como garantia
(propuesta, tabla de riesgos)—.

### `unique(id, ayuntamientoId)` en `reportes` y no en `movimientos_de_reportes`

Mismo criterio que capa-territorial §4: `reportes` lo lleva porque es destino
de **dos** FK compuestos —el de `movimientos_de_reportes` y el suyo propio—;
`movimientos_de_reportes` es un hecho hoja y nada la referencia.

### La trampa de `identidadPorPuerto.test.ts`, verificada

`reportes.personaId` existe como columna `persona_id`, asi que aplica la misma
trampa que `constancias/design.md` §6 documento: `identidadPorPuerto.test.ts:16`
aplica `/\bpersona_id\b|\bpersonas\b/` sobre el contenido de cada plantilla
`` sql`…` `` de todo `src/` fuera de `padron`. **Ninguna plantilla `sql` de
`reportes` nombra ninguno de los dos**, y se verifico consulta por consulta: el
contador nombra `ultimo_consecutivo`; el buscador de similares y el conteo de
duplicados usan el builder (§13); los CHECK nombran `estado`,
`motivo_de_rechazo` y `duplicado_de_reporte_id`. El FK a `personas` va en el
`.sql` de la migracion, que no es una plantilla en `src/` —igual que
`0008_constancias.sql:123`, que lo nombra y pasa en verde—.

**Sin `reportes_persona_idx`.** No hay lectura "reportes de una persona" en
esta fase; agregarlo despues es aditivo, y **tiene que escribirse con el
builder**, nunca con un template, por lo de arriba.

---

## 6. La migracion: `FORCE`, `GRANT` y los FK que Drizzle no puede emitir

`drizzle/0010_reportes.sql`, con las tres tablas, `FORCE ROW LEVEL SECURITY`,
los `GRANT` y los FK a mano **en el mismo archivo** (ADR 0001 §2: un diff que
solo toque lo generado se veria identico a una migracion que se olvido del
`FORCE`). Cola calcada de `drizzle/0008_constancias.sql:72-124` y
`drizzle/0007_territorio.sql:103-125`, con el mismo comentario y la misma
advertencia sobre `drizzle-kit push`, apuntando ahi sin repetirlo.

### **Correccion: son tres FK a mano, no cuatro**

La propuesta pide "los **cuatro** FK compuestos escritos a mano —`lugares`,
`calles`, `personas` y el autorreferencial de `reportes`—". El
autorreferencial **si lo expresa Drizzle y drizzle-kit si lo emite**, y hay
prueba en el repo: `lugares_padre_tenant_fk` es exactamente esa forma —
`foreignKey({ columns: [t.padreId, t.ayuntamientoId], foreignColumns: [t.id,
t.ayuntamientoId] })` en `territorio/infrastructure/esquema.ts:49-53`— y
aparece generado en `drizzle/0007_territorio.sql:64`. Lo que obliga a escribir
un FK a mano no es que sea compuesto ni que sea autorreferencial: es que **el
objeto de tabla destino no sea alcanzable** (arista 10 de §2). `reportes` se
alcanza a si misma.

Escribirlo a mano ademas seria **peor**: quedaria fuera del snapshot de
drizzle-kit sin ninguna necesidad, o sea un dato de tenancy escondido de la
unica herramienta que lo puede verificar.

**La sustancia de la decision 14 no cambia:** el FK va compuesto, y por el
motivo que ahi esta escrito. Lo que cambia es en que archivo se escribe.

| FK | Destino | Como |
|---|---|---|
| `reportes_registrado_por_tenant_fk` | `usuarios(id, ayuntamiento_id)` | `foreignKey()` de Drizzle: `usuarios` vive en `shared/auth/esquema.ts` e `infrastructure` puede importar `shared` |
| `reportes_duplicado_tenant_fk` | `reportes(id, ayuntamiento_id)` | `foreignKey()` de Drizzle, autorreferencial. Precedente `lugares_padre_tenant_fk` |
| `movimientos_de_reportes_reporte_tenant_fk` | `reportes(id, ayuntamiento_id)` | `foreignKey()` de Drizzle |
| `movimientos_de_reportes_usuario_tenant_fk` | `usuarios(id, ayuntamiento_id)` | `foreignKey()` de Drizzle |
| **`reportes_lugar_tenant_fk`** | `lugares(id, ayuntamiento_id)` → `lugares_id_tenant_key` (`0007_territorio.sql`) | **A mano en la cola** |
| **`reportes_calle_tenant_fk`** | `calles(id, ayuntamiento_id)` → `calles_id_tenant_key` (`0007_territorio.sql`) | **A mano en la cola** |
| **`reportes_persona_tenant_fk`** | `personas(id, ayuntamiento_id)` → `personas_id_tenant_key` (`0004_padron.sql:17`) | **A mano en la cola** |

Los tres destinos existen y se verificaron leyendo el esquema, no se
supusieron.

### `GRANT`

```sql
GRANT SELECT, INSERT, UPDATE ON "reportes"                TO "xula_app";
GRANT SELECT, INSERT, UPDATE ON "folios_de_reportes"      TO "xula_app";
GRANT SELECT, INSERT         ON "movimientos_de_reportes" TO "xula_app";
```

`reportes` con `UPDATE` porque el reporte **cambia de estado por diseño**
(decision 1) — es la diferencia declarada con `constancias`, que solo lo tiene
por la cancelacion. **Sin `DELETE` en ninguna de las tres.**

`movimientos_de_reportes` **sin `UPDATE` y sin `DELETE`**, y eso es lo que
convierte "el historial es de solo agregado" de una regla que hay que respetar
en una que **no se puede violar**. Mismo mecanismo que `bitacora`
(`shared/tenancy/esquema.ts:115-120`) y `reimpresiones`. Es tambien el
criterio de exito de la propuesta ("esa tabla **no tiene permiso de `UPDATE`
ni de `DELETE`**"), y se prueba en `movimientosDeReportes.isolation.test.ts`
intentando el `UPDATE` y esperando el error de permiso, no leyendo el `.sql`.

`folios_de_reportes` sin `DELETE`: borrar una fila del contador reinicia la
serie. El argumento entero esta en `constancias/design.md` §4.

---

## 7. Decisiones 3, 4, 5 y 8 — El dominio

Cuatro uniones cerradas, cada una en su archivo, todas con su `CHECK` espejo
en Postgres (`enumerado`, `shared/tenancy/esquema.ts:175`): el `$type` se
evade con un cast y la base es la reja que queda.

```ts
TIPOS_DE_INCIDENCIA = ["BACHE","ALUMBRADO","FUGA","BASURA","PARQUE","OTRO"]
AREAS_RESPONSABLES  = ["OBRAS_PUBLICAS","ALUMBRADO_PUBLICO",
                       "AGUA_POTABLE_Y_DRENAJE","LIMPIA_Y_RECOLECCION",
                       "PARQUES_Y_JARDINES","SERVICIOS_GENERALES"]
ESTADOS_DE_REPORTE  = ["RECIBIDO","EN_ATENCION","RESUELTO","RECHAZADO"]
MOTIVOS_DE_RECHAZO  = ["DUPLICADO","FUERA_DE_COMPETENCIA","INFORMACION_INSUFICIENTE"]
```

### Las transiciones, como tabla y no como cadena de `if`

```ts
// domain/estado.ts — puro
const TRANSICIONES: Record<EstadoDeReporte, readonly EstadoDeReporte[]> = {
  RECIBIDO:    ["EN_ATENCION", "RESUELTO", "RECHAZADO"],
  EN_ATENCION: ["RESUELTO", "RECHAZADO"],
  RESUELTO:    [],
  RECHAZADO:   [],
};

export const transicionValida = (desde: EstadoDeReporte, hacia: EstadoDeReporte) =>
  TRANSICIONES[desde].includes(hacia);

export const esTerminal = (estado: EstadoDeReporte) =>
  TRANSICIONES[estado].length === 0;
```

`Record<EstadoDeReporte, …>` y no un objeto suelto: agregar un estado a la
union **rompe el tipo** hasta que alguien decida sus salidas, en vez de
heredar en silencio "sin transiciones". Es la forma de tabla de
`roles.test.ts` llevada al tipo.

**`RECIBIDO → RESUELTO` si esta.** La cuadrilla tapa el bache el mismo dia, y
exigir el paso por `EN_ATENCION` no produce un registro mas fiel: produce dos
clics seguidos del operador, que dejan las dos transiciones con la misma marca
de tiempo y convierten "se resolvio el mismo dia" en "se atendio en cero
segundos". Una burocracia que se saltea con dos clics no es un control — es
ruido con **forma** de control, y contamina justo el indicador que la fase
produce. Es una entrada del mapa, sin base de datos ni migracion.

`esTerminal` existe aparte de `transicionValida` porque la decision 5 pide dos
errores distintos y el operador necesita leer cual es cual: intentar mover un
`RESUELTO` no es lo mismo que intentar `RESUELTO → RECIBIDO`.

### Errores tipados

`reportes/domain/errores.ts`, mismo patron que `constancias/domain/errores.ts`
—clase, `codigo` estable, `name`, sin logica adentro—:

| Error | `codigo` | Quien lo lanza |
|---|---|---|
| `TransicionInvalidaError` | `TRANSICION_INVALIDA` | `cambiarEstadoDeReporte` |
| `ReporteCerradoError` | `REPORTE_CERRADO` | `cambiarEstadoDeReporte`, `asignarAreaDeReporte` |
| `UbicacionInvalidaError` | `UBICACION_INVALIDA` | `registrarReporte` |
| `DuplicadoSinOriginalError` | `DUPLICADO_SIN_ORIGINAL` | `cambiarEstadoDeReporte`, las dos direcciones |
| `DuplicadoDeSiMismoError` | `DUPLICADO_DE_SI_MISMO` | `cambiarEstadoDeReporte` (§8) |
| `ReportanteDadoDeBajaError` | `REPORTANTE_DADO_DE_BAJA` | `registrarReporte` |

`DuplicadoDeSiMismoError` **es una adicion de este diseño** a los cuatro que
enumera la propuesta, y tiene consumidor concreto: es el par en TypeScript de
`reportes_sin_autoduplicado` (§5), y sin el la unica respuesta a "marcar un
reporte duplicado de si mismo" seria un error crudo de Postgres — el mismo
defecto que la decision 10 corrige para `lugarId`.

`DuplicadoSinOriginalError` cubre **las dos direcciones**: motivo `DUPLICADO`
sin id de original, e id de original con otro motivo. Un solo error para las
dos porque el CHECK de Postgres tambien es uno solo (§5): dos errores
sugeririan dos rejas y hay una.

**Ninguno de estos `codigo` entra en `CODIGOS_CONOCIDOS` de
`shared/lib/errores.ts:88`.** No hace falta: las Server Actions de `reportes`
los traducen con `instanceof` en su propio `mensajeDe`, dentro del mismo
proceso y sin cruzar la frontera de serializacion — precedente exacto,
`constancias/ui/actions/emitirConstanciaAction.ts:44-47`. `mapearError` sigue
siendo el ultimo recurso para lo que no reconoce.

---

## 8. Decision 14 — La resolucion del original, y por que no puede iterar

Este es el nucleo del cambio y el unico lugar donde este diseño hace trabajo
que la propuesta no dejo hecho.

### La funcion pura

```ts
// domain/duplicado.ts — puro, sin imports fuera de ./errores
export type CandidatoAOriginal = {
  readonly id: string;
  readonly duplicadoDeReporteId: string | null;
};

/**
 * El original de una cadena, en UN salto.
 *
 * No hay bucle porque no hace falta: el invariante dice que un duplicado
 * apunta siempre a un no-duplicado, asi que dereferenciar una vez alcanza.
 * Es total: para cualquier entrada devuelve un string y termina.
 */
export const originalDe = (candidato: CandidatoAOriginal): string =>
  candidato.duplicadoDeReporteId ?? candidato.id;

/** Resuelve el original y rechaza el unico caso que `originalDe` no puede ver. */
export const vincularDuplicado = (
  reporteId: string,
  candidato: CandidatoAOriginal,
): string => {
  const original = originalDe(candidato);
  if (original === reporteId) throw new DuplicadoDeSiMismoError();
  return original;
};
```

### Como se sostiene el invariante

No lo sostiene la funcion: lo sostiene **el orden de escritura**. Lo que se
guarda en `duplicado_de_reporte_id` **nunca es el id que eligio el operador**,
es `vincularDuplicado(...)`. Como esa funcion devuelve siempre un id cuyo
`duplicadoDeReporteId` es nulo, la columna solo puede contener no-duplicados.
"Un duplicado apunta siempre a un no-duplicado" deja de ser una regla que
alguien tiene que respetar y pasa a ser **lo unico que el codigo puede
escribir**.

Que un operador marque C duplicado de B cuando B ya es duplicado de A no es
un error: se guarda `C → A`, y la propuesta lo pide con esas palabras.

### Que pasa si un ciclo entra por SQL crudo — **verificado, no afirmado**

La propuesta afirma que un ciclo "degrada a un estado equivocado, visible y
acotado, nunca a un bucle". Se verifico contra las tres piezas y es cierto,
por una razon estructural: **no hay ningun `while`, ningun `for` ni ninguna
recursion en todo el camino**, ni en la funcion pura, ni en el caso de uso de
transicion, ni en el de consulta publica.

Supongamos que alguien escribe por `psql` `A → B` y `B → A`:

| Camino | Que hace | Resultado |
|---|---|---|
| `originalDe(A)` | un `??` | devuelve `B`. Termina |
| Consulta publica del folio de `A` | dos `SELECT`: el folio, y el id apuntado | devuelve el estado de `B`. **Exactamente dos viajes** (§14) |
| Marcar `C` duplicado de `A` | un `SELECT` del candidato + `vincularDuplicado` | guarda `C → B`, que es un duplicado: **estado equivocado** |

Lo equivocado es visible —la pagina de `C` muestra el estado de `B`, que dice
`RECHAZADO`— y acotado —un salto, no N—. Es el mismo tipo de degradacion que
`territorio` ya acepto y escribio para su jerarquia: el `WHERE profundidad < 8`
de `subarbol` (`repositorioDeLugaresSql.ts:127`) degrada un ciclo en un arbol
incompleto y no en una conexion colgada. Aca ni siquiera hace falta el
cinturon, porque no hay recursion que acotar.

**El test que lo fija es de integracion y entra en la misma rebanada que el
vinculo**, porque lo unico que puede crear un ciclo es SQL crudo y la unidad
no lo puede fabricar: `duplicados.integration.test.ts` inserta el ciclo con
un `UPDATE` directo sobre la tabla y verifica **dos** cosas: que
`consultarFolioDeReporte` **resuelve** —no que devuelva algo correcto— y que
lo hace con dos consultas. Un test que solo espere "no cuelga" pasa tambien
con un timeout mal puesto.

### Los tests de la unidad (rebanada 2, sin base de datos)

- `originalDe` con `duplicadoDeReporteId` nulo → el propio id.
- `originalDe` con vinculo → el vinculo, **no** el propio id.
- `vincularDuplicado(x, {id: x, …})` → `DuplicadoDeSiMismoError`.
- `vincularDuplicado(c, {id: b, duplicadoDeReporteId: a})` → `a`, **no** `b`.
  Es el test de "duplicado de un duplicado guarda el original de la cadena",
  y vive en la unidad porque es una regla, no una consulta.
- `vincularDuplicado(a, {id: b, duplicadoDeReporteId: a})` → `DuplicadoDeSiMismoError`:
  el ciclo de largo 2 que la aplicacion **si** puede detectar, porque cierra
  contra el reporte que se esta rechazando.

Ese ultimo es el que hace que la aplicacion no pueda escribir un ciclo de
largo 2, que es lo que deja al CHECK `reportes_sin_autoduplicado` como reja
solo del largo 1 sin que quede hueco alcanzable desde el codigo.

---

## 9. Decision 10 — La lectura nueva de `territorio`

La decision 10 pide que la composicion del texto de ubicacion **y su
validacion** vivan en `territorio`. Este diseño las implementa como una
funcion pura, un puerto, un adaptador y un caso de uso.

### La funcion pura, nueva y no `componerDireccion`

`componerDireccion` (`territorio/domain/direccion.ts:47`) **no se reusa**, y
la razon es concreta: su `PartesDeDireccion` exige `calle: string` no nula y
tiene `numero`, asi que un reporte tendria que pasar `calle: ""` y
`numero: null` para recibir `" S/N"` — un numero de casa inventado en la
ubicacion de un bache. Torcer la funcion existente para que acepte los dos
casos la volveria un `if` sobre quien la llama.

```ts
// territorio/domain/direccion.ts  (archivo existente, funcion nueva)
export type PartesDeUbicacion = {
  calle: string | null;
  /** Del mas profundo al mas superficial, mismo orden que `PartesDeDireccion`. */
  ancestros: readonly string[];
};

export const componerUbicacion = (partes: PartesDeUbicacion): string =>
  [partes.calle, ...partes.ancestros]
    .filter((segmento): segmento is string => segmento !== null)
    .join(", ");
```

Pura, en `domain`, y **sin `"S/N"`**: no hay numero que suplir.

### El puerto y el adaptador

Va en `territorio/application/puertosDeDirecciones.ts` —el archivo que la
rebanada 1 de `constancias` creo por el mismo corte de area— y no en
`puertos.ts`, que ya esta al limite de las 200 lineas de `AGENTS.md`.

```ts
export type LectorDeUbicaciones = {
  partesDe(
    tx: TransaccionTenant,
    lugarId: LugarId,
    calleId: CalleId | null,
  ): Promise<PartesDeUbicacion | null>;
};
```

**Con `tx`**, a diferencia de `LecturaDePersonas`: la implementacion vive en el
mismo modulo y en la misma transaccion. El `tx` en la firma de un puerto marca
si el adaptador cruza o no un limite de modulo (`constancias/design.md` §7).

`infrastructure/lectorDeUbicacionesSql.ts` hace **dos** consultas dentro del
mismo `tx`:

1. `WITH RECURSIVE` hacia arriba por `padre_id` desde `lugarId`, calcado de
   `lectorDeDireccionesSql.ts:32-57` con el mismo cinturon `profundidad < 8` y
   el mismo `baja_en IS NULL` —el arranque cambia: de `lugares` directo en vez
   de `domicilios JOIN lugares`—. Cero filas → `null`.
2. Solo si `calleId !== null`: `SELECT nombre FROM calles WHERE id = $1` con el
   **builder** de Drizzle, una fila. Cero filas → `null`.

**Un `LEFT JOIN` a `calles` en la misma consulta seria mas corto y esta
descartado a proposito**: con `LEFT JOIN`, "no se pidio calle" y "la calle no
existe" producen los dos un `NULL`, y el caso de uso pierde la unica
diferencia que le importa. La segunda consulta es lo que convierte un
`calleId` de otro municipio en `null` —y de ahi en `UbicacionInvalidaError`,
decision 10— en vez de en una ubicacion sin calle que se ve correcta.

### El caso de uso

```ts
// territorio/application/ubicacionDeLugar.ts
ubicacionDeLugar(
  entrada: { lugarId: LugarId; calleId: CalleId | null },
  contexto: ContextoActual,
): Promise<{ texto: string } | null>

  return withTenant(contexto.ayuntamientoId, async (tx) => {
    const partes = await lector.partesDe(tx, entrada.lugarId, entrada.calleId);
    return partes === null ? null : { texto: componerUbicacion(partes) };
  });
```

**Devuelve `null` y no lanza**, mismo criterio que `personaPorId` y que
`direccionVigenteDePersona`: quien decide que eso es `UbicacionInvalidaError`
es `reportes`, no `territorio`. Y los cuatro casos —lugar inexistente, lugar
dado de baja, calle inexistente, cualquiera de los dos de otro tenant—
colapsan al **mismo `null`**, que es el invariante 1 aplicado a una lectura
(`shared/lib/errores.ts:25-33`).

**Lo que esta lectura NO valida, declarado:** que la calle pertenezca al lugar
del reporte. `calles.lugarId` apunta al asentamiento
(`territorio/infrastructure/esquema.ts:76-79`) y el `lugarId` de un reporte
puede ser un `sector` o una `manzana` bajo ese asentamiento, asi que exigir
igualdad rechazaria el caso normal; exigir "es ancestro de" seria una segunda
copia de la regla de jerarquia en un consumidor que no la necesita. Se declara
en vez de agregarla.

**Que le pasa al texto cuando se reparentea la colonia: cambia, y es
estructural.** No hay ninguna columna de `reportes` donde el texto pudiera
quedar escrito: se compone en cada lectura. Es la propiedad opuesta a la de
`constancias` §5, y sale del mismo mecanismo —ahi congela porque hay `jsonb`,
aca cambia porque no lo hay—. El test que lo fija es de comportamiento:
registrar, reparentear, releer, y comparar que el texto **difiere**.

---

## 10. Los puertos de `reportes`, con firma exacta

```ts
// application/puertos.ts
export type DatosDeRegistroDeReporte = {
  id: ReporteId;
  ayuntamientoId: AyuntamientoId;
  folio: string;
  anio: number;
  consecutivo: number;
  tipo: TipoDeIncidencia;
  lugarId: string;                 // `string`, nunca `LugarId` (§3)
  calleId: string | null;
  referencia: string | null;
  descripcion: string;
  personaId: string | null;
  registradoPorUsuarioId: string;
};

export type ReporteGuardado = {
  id: ReporteId; folio: string; tipo: TipoDeIncidencia;
  estado: EstadoDeReporte; areaResponsable: AreaResponsable | null;
  lugarId: string; calleId: string | null; referencia: string | null;
  descripcion: string; personaId: string | null;
  motivoDeRechazo: MotivoDeRechazo | null;
  duplicadoDeReporteId: string | null;
  registradoPorUsuarioId: string;
  registradoEn: Date; actualizadoEn: Date;
};

/** Lo minimo del candidato a original: un salto, no la fila entera (§8). */
export type CandidatoAOriginal = { id: ReporteId; duplicadoDeReporteId: string | null };

export type FilaParaConsultaPublica = {
  tipo: TipoDeIncidencia; estado: EstadoDeReporte;
  registradoEn: Date; actualizadoEn: Date;
  duplicadoDeReporteId: string | null;
};

export type ReporteSimilar = {
  id: ReporteId; folio: string; estado: EstadoDeReporte;
  descripcion: string; registradoEn: Date;
};

export type RepositorioDeReportes = {
  guardar(tx: TransaccionTenant, datos: DatosDeRegistroDeReporte): Promise<void>;
  buscarPorId(tx: TransaccionTenant, id: ReporteId): Promise<ReporteGuardado | null>;
  candidatoAOriginal(tx: TransaccionTenant, id: string): Promise<CandidatoAOriginal | null>;
  /** `false` cuando afecta cero filas: otra transaccion lo movio en el medio (§12). */
  aplicarTransicion(tx: TransaccionTenant, datos: {
    id: ReporteId;
    estadoAnterior: EstadoDeReporte;
    estadoNuevo: EstadoDeReporte;
    motivoDeRechazo: MotivoDeRechazo | null;
    duplicadoDeReporteId: string | null;
  }): Promise<boolean>;
  asignarArea(tx: TransaccionTenant, datos: {
    id: ReporteId; areaResponsable: AreaResponsable;
  }): Promise<boolean>;
  listar(tx: TransaccionTenant, filtros: FiltrosDeListado): Promise<readonly ReporteGuardado[]>;
  similaresAbiertos(tx: TransaccionTenant, criterio: {
    lugarId: string; tipo: TipoDeIncidencia;
  }): Promise<readonly ReporteSimilar[]>;
  contarDuplicadosDe(tx: TransaccionTenant, id: ReporteId): Promise<number>;
  paraConsultaPublica(tx: TransaccionTenant, folio: string): Promise<FilaParaConsultaPublica | null>;
  paraConsultaPublicaPorId(tx: TransaccionTenant, id: string): Promise<FilaParaConsultaPublica | null>;
};

export type ContadorDeFolios = {
  siguiente(tx: TransaccionTenant, datos: {
    ayuntamientoId: AyuntamientoId; anio: number;
  }): Promise<number>;
};

export type DatosDeMovimiento = {
  ayuntamientoId: AyuntamientoId;
  reporteId: ReporteId;
  usuarioId: string;
  estadoAnterior: EstadoDeReporte | null;
  estadoNuevo: EstadoDeReporte | null;
  areaAsignada: AreaResponsable | null;
  motivo: MotivoDeRechazo | null;
};

export type RegistroDeMovimientos = {
  agregar(tx: TransaccionTenant, datos: DatosDeMovimiento): Promise<void>;
  historialDe(tx: TransaccionTenant, reporteId: ReporteId): Promise<readonly MovimientoGuardado[]>;
};
```

`RegistroDeMovimientos` es **puerto propio y no un metodo del repositorio**:
la tabla tiene otro regimen de permisos —solo agregado, §6— y separarlo lo
deja escrito en el tipo. `historialDe` ordena por `ocurridoEn ASC` y ese orden
es parte del contrato, mismo criterio que `historialDe` de `territorio`.

```ts
// application/puertosDeLectura.ts
/** Sin `tx`: abre el `withTenant` de `territorio` (§11). */
export type LecturaDeUbicaciones = {
  de(lugarId: string, calleId: string | null): Promise<{ texto: string } | null>;
};

/** Sin `tx`: abre el `withTenant` de `padron`. Calco de `LecturaDeTitulares`. */
export type LecturaDeReportantes = {
  porId(personaId: string): Promise<{ nombreCompleto: string; bajaEn: Date | null } | null>;
};
```

---

## 11. Decision 9 y 11 — `registrarReporte`: orden de las operaciones

```
registrarReporte(datos, contexto: ContextoActual)

  1. puedeEscribir(contexto.usuario.rol)          → NoAutorizadoError
     ─────────────────────────────────────────── fuera de toda transaccion

  2. ubicacion = await lecturaDeUbicaciones.de(lugarId, calleId)
       (abre el withTenant de territorio)
       null              → UbicacionInvalidaError

  3. si personaId !== null:
       reportante = await lecturaDeReportantes.porId(personaId)
         (abre el withTenant de padron)
         null            → NoEncontradoError            (404, nunca 403)
         bajaEn !== null → ReportanteDadoDeBajaError
     si personaId === null: no se lee nada y no se guarda ningun contacto
       suelto (decision 11)

  4. withTenant(contexto.ayuntamientoId, async (tx) => {      UNA transaccion
       a. consecutivo = await contador.siguiente(tx, { anio })   ← el LOCK
       b. folio = Folio.crear(anio, consecutivo)
       c. await repositorio.guardar(tx, { …, estado: "RECIBIDO",
                                          areaResponsable: null })
       d. await movimientos.agregar(tx, { reporteId: id,
            estadoAnterior: null, estadoNuevo: "RECIBIDO",
            areaAsignada: null, motivo: null })
       e. await registrar(tx, { accion: "REGISTRAR_REPORTE",
                                entidad: "reportes", entidadId: id })
     })
```

**Los pasos 2 y 3 van afuera de la transaccion, y no es estilo.** Los dos
adaptadores llaman a casos de uso de otros modulos, que abren su propio
`withTenant`; invocarlos adentro seria un anidamiento —con `DB_POOL_MAX=1` se
traba y en produccion consume dos conexiones por operacion (capa-territorial
§6)—. Aca ese orden obligado **converge con lo que el contador necesita**:
todo lo que puede rechazar el alta ocurre antes del lock, asi que ningun
rechazo llega a tocar el contador. El criterio de exito *"un registro que
falla despues de tomar folio no consume el folio"* se prueba aparte (T7);
*"un `lugarId` de otro municipio no consume folio"* deja de ser una regla y
pasa a ser una consecuencia del orden.

**`ubicacion.texto` se descarta.** El paso 2 existe por su efecto de
validacion, no por su valor: la decision 9 dice que el texto no se congela, y
la forma estructural de garantizarlo es que **no hay columna donde
escribirlo**. Se declara aca porque un lector del codigo va a ver un valor que
se calcula y se tira, y ese es exactamente el punto.

**El paso 4d es una correccion.** La propuesta solo pide fila de movimiento en
los cambios de estado y las asignaciones. Pero su propio esquema declara
`estadoAnterior text null`, y con "`estadoNuevo` null si solo fue asignacion"
ya explicado, **el unico consumidor posible de un `estadoAnterior` nulo es el
alta**. Sin esta fila, la columna seria nullable sin motivo y el historial de
un reporte recien creado estaria vacio —una pantalla de "historial" que
arranca en blanco—. Se escribe la fila y la columna queda explicada.

### Bitacora

`registrar()` (`shared/tenancy/bitacora.ts:56`) dentro de la misma
transaccion, **solo ids**: `accion: "REGISTRAR_REPORTE"`, `entidad: "reportes"`,
`entidadId: id`. El motivo, el area y el estado van en sus columnas tipadas de
`movimientos_de_reportes`, **nunca dentro de `accion`** (ADR 0001 §5,
decision 7). Una sola traza y no dos: la operacion es una decision sobre una
entidad y `entidadId` la cita entera.

---

## 12. Decisiones 6, 8 y 14 — `cambiarEstadoDeReporte`

**No hay caso de uso "marcar duplicado".** La propuesta lo pide asi y este
diseño lo realiza: el vinculo es un parametro mas de la transicion, para que
transicion, vinculo y movimiento confirmen o fallen juntos sin que nadie tenga
que recordar llamar a dos cosas en orden.

```ts
cambiarEstadoDeReporte(
  datos: {
    id: ReporteId;
    estadoNuevo: EstadoDeReporte;
    motivoDeRechazo: MotivoDeRechazo | null;
    /** El que eligio el operador; NO es lo que se guarda (§8). */
    duplicadoDe: string | null;
  },
  contexto: ContextoActual,
): Promise<void>
```

```
  1. puedeAdministrarReportes(contexto.usuario.rol)   → NoAutorizadoError
     ─────────────────────────────────────────── fuera de toda transaccion

  2. withTenant(contexto.ayuntamientoId, async (tx) => {     UNA transaccion
       a. actual = await repositorio.buscarPorId(tx, id)
            null                                  → NoEncontradoError
       b. esTerminal(actual.estado)                → ReporteCerradoError
          !transicionValida(actual.estado, nuevo)  → TransicionInvalidaError
       c. exigeMotivo  = nuevo === "RECHAZADO"
          exigeVinculo = motivoDeRechazo === "DUPLICADO"
            (exigeMotivo && motivo === null)          → ValidacionError
            (!exigeMotivo && motivo !== null)         → ValidacionError
            (exigeVinculo !== (duplicadoDe !== null)) → DuplicadoSinOriginalError
       d. si exigeVinculo:
            candidato = await repositorio.candidatoAOriginal(tx, duplicadoDe)
              null                                 → NoEncontradoError
            original  = vincularDuplicado(id, candidato)   ← domain, puro, §8
       e. movio = await repositorio.aplicarTransicion(tx, {
              id, estadoAnterior: actual.estado, estadoNuevo: nuevo,
              motivoDeRechazo: motivo,
              duplicadoDeReporteId: original ?? null })
            !movio                                 → NoEncontradoError
       f. await movimientos.agregar(tx, {
              reporteId: id, usuarioId: contexto.usuario.id,
              estadoAnterior: actual.estado, estadoNuevo: nuevo,
              areaAsignada: null, motivo })
       g. await registrar(tx, { accion: "CAMBIAR_ESTADO_REPORTE",
                                entidad: "reportes", entidadId: id })
     })
```

**El paso 2d va adentro de la transaccion y no afuera, al reves que los pasos
2 y 3 de `registrarReporte`.** La diferencia no es de estilo: `candidatoAOriginal`
lee `reportes`, la tabla del propio modulo, asi que no anida ningun
`withTenant` ajeno. Y tiene que ir adentro por una razon de correccion: si el
candidato se leyera antes, otra transaccion podria marcarlo duplicado en el
medio y este `INSERT` guardaria un vinculo a un duplicado, rompiendo el
invariante justo en la ventana que la lectura afuera abre.

**`aplicarTransicion` es un `UPDATE` condicionado, y eso es el control de
concurrencia:**

```sql
UPDATE reportes
   SET estado = $2, motivo_de_rechazo = $3,
       duplicado_de_reporte_id = $4, actualizado_en = now()
 WHERE id = $1 AND estado = $5
RETURNING id;
```

Dos transiciones simultaneas se serializan sobre la fila y la segunda afecta
cero filas, porque el `estado` que leyo ya no esta. Sin rama adicional y sin
columna de version. Es el mecanismo de `cancelarConstancia`
(`constancias/design.md` §10) aplicado a una maquina de estados en vez de a un
booleano. Cero filas responde `NoEncontradoError` —inexistente, de otro tenant,
o ya movido: los tres iguales, invariante 1—.

**`asignarAreaDeReporte` es el mismo esqueleto, mas corto:**

```
asignarAreaDeReporte({ id, areaResponsable }, contexto)
  puedeAdministrarReportes(rol)?           → NoAutorizadoError
  withTenant(tx =>
    actual = buscarPorId(tx, id)   null    → NoEncontradoError
    esTerminal(actual.estado)              → ReporteCerradoError
    asignarArea(tx, …)   false             → NoEncontradoError
    movimientos.agregar(tx, { estadoAnterior: null, estadoNuevo: null,
                              areaAsignada, motivo: null })
    registrar(tx, { accion: "ASIGNAR_AREA_REPORTE", entidadId: id }))
```

Es la fila de movimiento con `estadoNuevo` nulo que el esquema de la propuesta
anticipa, y la que hace falta el CHECK `movimientos_no_vacio` (§5): sin el,
una fila con los cuatro campos nulos seria representable.

### La regla de rol

```ts
// shared/auth/roles.ts, junto a puedeAdministrarTerritorio y …Documentos
export const puedeAdministrarReportes = (rol: Rol) => rol === "ADMIN_MUNICIPAL";
```

**Una regla y no dos**, decision 6. `SUPER_ADMIN` afuera, mismo criterio y
misma linea que las otras cuatro reglas restringidas del archivo
(`roles.ts:79-113`). Su fila entra en la tabla de `roles.test.ts` que recorre
`ROLES` entero, para que un rol nuevo **falte** en vez de heredar.

`registrarReporte` se apoya en `puedeEscribir`, que ya existe. `reportePorId`,
`listarReportes` y `buscarReportesSimilares` **no llevan guarda de rol**,
mismo criterio que `constanciaPorId` y `subarbol`: leer no es escribir, y RLS
ya acota al tenant.

---

## 13. Decision 15 — El buscador de similares: la consulta y su indice

```ts
async similaresAbiertos(tx, { lugarId, tipo }) {
  return tx
    .select({
      id: reportes.id, folio: reportes.folio, estado: reportes.estado,
      descripcion: reportes.descripcion, registradoEn: reportes.registradoEn,
    })
    .from(reportes)
    .where(and(
      eq(reportes.lugarId, lugarId),
      eq(reportes.tipo, tipo),
      inArray(reportes.estado, ["RECIBIDO", "EN_ATENCION"]),
    ))
    .orderBy(desc(reportes.registradoEn))
    .limit(10);
}
```

**Builder, nunca `sql\`\``**, por la trampa de §5. **Sin `WHERE ayuntamiento_id`
a mano**: la politica de la tabla ya acota el `SELECT` al tenant de la
transaccion, y agregarlo sugiere que el aislamiento depende de recordarlo
(`administracionDeUsuarios.ts:30-36`).

### El indice que la sostiene

`reportes_similares_idx` sobre `(ayuntamiento_id, lugar_id, tipo, estado)`.
Las cuatro columnas se consumen en orden y todas por igualdad o por `IN`:

| Columna | Como la usa la consulta |
|---|---|
| `ayuntamiento_id` | igualdad, la aporta el `USING` de `politicaTenant` contra `current_setting('app.tenant')`, que es constante en la transaccion |
| `lugar_id` | igualdad, del formulario |
| `tipo` | igualdad, del formulario |
| `estado` | `IN ('RECIBIDO','EN_ATENCION')`, que un btree resuelve como dos recorridos sobre la cuarta columna |

Es un recorrido de indice, no de tabla, y es el criterio de exito *"contar
cuantos reportes apuntan al mismo original es una consulta directa sobre el
indice"* aplicado a su hermana: `contarDuplicadosDe` es un `count()` sobre
`reportes_duplicado_idx` `(ayuntamiento_id, duplicado_de_reporte_id)`, con el
mismo argumento.

**Alternativa descartada: indice parcial** sobre `(ayuntamiento_id, lugar_id,
tipo)` con `WHERE estado IN ('RECIBIDO','EN_ATENCION')`, en la forma de
`residencias_una_abierta_idx` y `lugares_una_cabecera`. Es mas chico —los
reportes cerrados dominan con el tiempo— pero deja de servir cualquier otra
consulta que filtre por `estado`, y el listado del panel con filtro de estado
(§16) es justo esa. Se elige el indice completo y **la version parcial queda
escrita aca como la salida** si el volumen lo pide: es una migracion aditiva
de dos lineas, sin cambio de codigo.

### El caso de uso

```ts
buscarReportesSimilares(
  criterio: { lugarId: string; tipo: TipoDeIncidencia },
  contexto: ContextoActual,
): Promise<readonly ReporteSimilar[]>
```

Sin guarda de rol (§12). **No bloquea nada y no lo puede bloquear**: no tiene
forma de rechazar un alta porque no participa de ella, que es la decision 15
hecha estructura en vez de disciplina.

`descripcion` **si** viaja en el resultado: es lo unico con lo que el operador
puede decidir si es el mismo bache, va detras de sesion y nunca sale a la
superficie publica (§14). El `LIMIT 10` es de pantalla, no de correccion.

---

## 14. Decision 12 — La respuesta publica, y por que no puede filtrar

### El tipo prohibe la carga

```ts
// domain/consulta.ts — puro, sin imports
export type ConsultaDeReporte =
  | { readonly resultado: "SIN_REGISTRO" }
  | {
      readonly resultado: "REGISTRADO";
      readonly tipo: TipoDeIncidencia;
      readonly estado: EstadoDeReporte;
      readonly registradoEn: string;
      readonly actualizadoEn: string;
    };

const SIN_REGISTRO = Object.freeze({ resultado: "SIN_REGISTRO" } as const);
```

Cinco propiedades que **no existen** en ninguna de las dos variantes:
`folio`, `descripcion`, `referencia`, `areaResponsable` y cualquier dato del
reportante. Y **una que tampoco**: no hay campo que diga que el folio es un
duplicado. Ninguna rama *puede* colgarlas aunque quisiera, que es la tecnica
de `ResultadoDeValidacion` (`constancias/design.md` §8) llevada al caso donde
hay un salto entre filas.

**El folio no viaja en el resultado, y ahi esta la garantia de la decision 14.**
La pagina ya tiene el folio: llega por `params`, igual que en
`src/app/validar/[folio]/page.tsx:79`. Que el resultado no lo lleve significa
que **no hay ninguna variable en el camino que contenga el folio del original**
— no es que se decida no imprimirlo, es que nunca se lee.

### La proyeccion pura, con el salto adentro

```ts
export type FilaDeConsulta = {
  tipo: TipoDeIncidencia; estado: EstadoDeReporte;
  registradoEn: string; actualizadoEn: string;
};

export const proyectarConsulta = (
  consultado: FilaDeConsulta | null,
  original: FilaDeConsulta | null,
): ConsultaDeReporte => {
  if (consultado === null) return SIN_REGISTRO;

  const vigente = original ?? consultado;

  return {
    resultado: "REGISTRADO",
    tipo: consultado.tipo,          // del folio consultado
    estado: vigente.estado,         // del original, si lo hay
    registradoEn: vigente.registradoEn,
    actualizadoEn: vigente.actualizadoEn,
  };
};
```

**`tipo` del consultado; `estado` y las dos fechas del original.** Es la
lectura literal de la decision 12, que enumera exactamente que conmuta —"el
estado y las fechas"— y por omision deja `tipo` como el del folio que la
persona tiene anotado. La incoherencia que eso produce en `registradoEn` queda
como pregunta abierta (§20), no como correccion: la decision no se reabre.

`original ?? consultado` es una degradacion que **el FK compuesto vuelve
inalcanzable**: si `duplicado_de_reporte_id` no es nulo, la fila destino existe
y es del mismo tenant, por `reportes_duplicado_tenant_fk`. Se escribe igual
porque el tipo lo permite y porque el efecto —devolver el `RECHAZADO` crudo,
o sea reintroducir el problema que la decision 14 resuelve— tiene que quedar
nombrado. Su test unitario existe y es el que documenta que la rama no se
alcanza.

### El caso de uso publico: dos consultas, nunca N

```ts
// application/consultarFolioDeReporte.ts
export type EntradaDeConsulta = { ayuntamientoId: AyuntamientoId; folio: string };

export function crearConsultarFolioDeReporte(repositorio: RepositorioDeReportes) {
  return function consultarFolioDeReporte({
    ayuntamientoId, folio,
  }: EntradaDeConsulta): Promise<ConsultaDeReporte> {
    return withTenant(ayuntamientoId, async (tx) => {
      const consultado = await repositorio.paraConsultaPublica(tx, folio);
      if (consultado === null) return proyectarConsulta(null, null);

      const original =
        consultado.duplicadoDeReporteId === null
          ? null
          : await repositorio.paraConsultaPublicaPorId(
              tx, consultado.duplicadoDeReporteId,
            );

      return proyectarConsulta(consultado, original);
    });
  };
}
```

**Sin `ContextoActual`, sin `usuario`, sin `codigo`.** Es la segunda vez que el
repo necesita esta firma —la primera es
`constancias/application/validarFolio.ts:47-59`— y eso la confirma como clase
y no como excepcion, tal como la exploracion anticipo. Sin segundo factor:
decision 12, y aca el argumento es mas fuerte que alla porque la respuesta no
contiene ni un dato personal.

**Dos `SELECT` como maximo, y esta escrito en la forma del codigo**: un
`await` mas un `await` condicional. No hay `while`, no hay recursion y no hay
funcion que se llame a si misma en todo el archivo. Es la prueba de "un solo
salto, nunca itera" que pide el criterio de exito, y **es estructural**: para
romperla haria falta agregar un bucle, no olvidarse de una guarda.

### La uniformidad de los negativos

Tres capas, ninguna de las cuales depende de que alguien escriba el mismo
texto dos veces:

1. La variante negativa **no tiene campos**.
2. Una sola constante congelada: las ramas negativas devuelven **esa
   referencia**, no un literal nuevo. El test compara con `toBe(SIN_REGISTRO)`
   —identidad, no forma—: un literal copiado pasaria `toEqual` y **falla**
   `toBe`, que es la reja que atrapa exactamente el defecto.
3. "Folio de otro municipio" y "folio inexistente" son el **mismo `null`**
   antes de entrar a la funcion: los colapsa RLS, no una rama. Y "folio mal
   escrito" tambien, porque no hay validacion de formato del folio en el
   camino: cualquier cadena que no exista devuelve `null`.

**Y la uniformidad tambien es del transporte:** la pagina responde **200
siempre**, nunca `notFound()` por un folio inexistente. Un 404 reconstruye el
oraculo que la union acaba de cerrar. Precedente y argumento:
`src/app/validar/[folio]/page.tsx:41-43`.

### La ruta y el ritmo

`src/app/reportes/[folio]/page.tsx`, calco de `validar/[folio]/page.tsx`:

```
GET /reportes/[folio]
  ├─ CABECERA_SUPERFICIE == "ayuntamiento"?      si no → notFound()
  ├─ { id } = await ayuntamientoActual()         subdominio, sin sesion
  ├─ limitarRitmo(id, [{ tipo: "folio", valor: ip }])  → 429    ← ANTES
  └─► consultarFolioDeReporte({ ayuntamientoId: id, folio })
```

**`TipoIntento: "folio"` reusado, sin valor nuevo y sin migracion del CHECK**
(decision del usuario). `LIMITES.folio` sigue en 30 y `VENTANA_MINUTOS` en 15;
no se toca `shared/auth/ritmo.ts`. La consecuencia —una IP que valida
constancias y consulta reportes comparte cuota— **ya esta declarada en la
propuesta** y este diseño no la puede reducir, solo la nombra donde ocurre:
son dos llamadores del mismo `limitarRitmo(ayuntamientoId, [{ tipo: "folio",
valor: ip }])`, con la misma `claveDe` y la misma ventana.

La IP es la unica clave, **nunca el folio**: con el folio como clave, cada
numero de la serie estrenaria su propia ventana. El argumento completo esta en
`constancias/design.md` §12.

El limitador vive en el borde y no adentro del caso de uso, y lo que sostiene
que no se olvide es `consultarFolioDeReporte.ritmo.test.ts`, calco de
`validarFolio.ritmo.test.ts`: verifica con `invocationCallOrder` que el
limitador corre **antes** que el caso de uso y que un `RitmoExcedidoError`
responde 429 sin haber consultado nada.

---

## 15. Decision 15 en la pantalla — la unica hoja `"use client"`

El alta es un `<form>` nativo con Server Action (`altaDeReporteAction`), como
las seis filas que ya tiene la tabla de Server Actions de `AGENTS.md`. El
buscador de similares es la unica pieza que reacciona a lo que el operador va
eligiendo, y **se resuelve con una hoja `"use client"`, no con un `<form>` GET
que recargue la pagina.**

**El motivo es la decision 13, no la comodidad.** Un envio GET para refrescar
la lista tendria que llevar la seleccion en `searchParams` — y para no perder
lo que el operador ya escribio, tambien la `descripcion`. Eso pondria la unica
caja de texto libre del modulo en la query string, o sea en el log de acceso
del proveedor y en el `Referer`. Es exactamente el campo que la decision 13
protege, filtrado por el mecanismo que lo iba a mostrar.

La isla es `ui/SelectorDeUbicacionYTipo.tsx` mas `ui/ReportesSimilares.tsx`:
los dos selects y la lista. El `<textarea>` de `descripcion` y el resto del
formulario **quedan afuera de la isla**, en el Server Component, y por eso no
se re-renderizan ni salen de la pagina. La isla llama a `buscarSimilaresAction`
dentro de un `useTransition`.

**El envio del formulario sigue siendo el POST nativo**, asi que la accion de
alta conserva el transporte por `redirect` + `searchParams` de la tabla de
`AGENTS.md`. Esa combinacion esta sancionada con estas palabras en la seccion
"La unica excepcion" de ese archivo: *"una hoja `"use client"` puede convivir
adentro del mismo `<form>` para otra cosa, mientras el envio siga siendo el
POST nativo"*. Se cita porque es la condicion exacta que este diseño usa.

`buscarSimilaresAction` **si devuelve `ActionResult<T>`**, a diferencia de
`altaDeReporteAction`: hay un componente cliente que lee su retorno, que es la
condicion que la misma seccion pone.

**Ocultar el boton de asignar no es autorizacion.** El listado y el detalle
esconden las acciones restringidas segun `puedeAdministrarReportes(rol)` por
comodidad; la guarda que decide vive en el caso de uso (§12).

---

## 16. Flujo de datos

```
ALTA
  ui/FormularioDeAlta          (Server Component, <form action>)
    ├─ isla "use client": SelectorDeUbicacionYTipo + ReportesSimilares
    │    └─► buscarSimilaresAction ─► buscarReportesSimilares
    │          └─ withTenant(tx => similaresAbiertos)
    │               └─ reportes_similares_idx  ← lugar + tipo + estado abierto
    └─► altaDeReporteAction              (Server Action, POST nativo)
          ├─ Zod safeParse en la primera linea
          ├─ contextoActual()                       tenant del servidor
          └─► registrarReporte                      application/
                ├─ puedeEscribir(rol)?           →  NoAutorizadoError
                ├─ lecturaDeUbicaciones.de()        FUERA de withTenant
                │    └─ territorio.ubicacionDeLugar → su propio withTenant
                │         └─ WITH RECURSIVE hacia arriba por padre_id
                │            + SELECT de la calle   ← valida, decision 10
                │              └─ componerUbicacion()   domain, puro
                ├─ lecturaDeReportantes.porId()     FUERA de withTenant
                │    └─ padron.personaPorId → su propio withTenant
                └─ withTenant(tx =>                 UNA transaccion
                     INSERT folios_de_reportes ON CONFLICT DO UPDATE
                       RETURNING ultimo_consecutivo      ← EL LOCK
                     Folio.crear(anio, consecutivo)      domain, puro
                     INSERT reportes (folio, estado='RECIBIDO', …)
                       └─ reportes_lugar_tenant_fk    ← el otro municipio
                       └─ reportes_calle_tenant_fk
                       └─ reportes_persona_tenant_fk
                       └─ reportes_serie_idx          ← la serie
                     INSERT movimientos_de_reportes (anterior=null, nuevo=RECIBIDO)
                     registrar(REGISTRAR_REPORTE))

TRANSICION Y VINCULO DE DUPLICADO
  ui/AccionesDeReporte  ─► cambiarEstadoAction
    └─► cambiarEstadoDeReporte                     application/
          ├─ puedeAdministrarReportes(rol)?    →  NoAutorizadoError
          └─ withTenant(tx =>                    UNA transaccion
               buscarPorId          null      →  NoEncontradoError
               esTerminal / transicionValida  →  ReporteCerrado / TransicionInvalida
               motivo DUPLICADO sin id, o al reves → DuplicadoSinOriginal
               candidatoAOriginal(tx, duplicadoDe)  ← MISMA transaccion
                 └─ vincularDuplicado()            domain, puro, UN salto
                      └─ original === id        →  DuplicadoDeSiMismo
               UPDATE reportes … WHERE estado = $anterior RETURNING id
                 └─ cero filas                  →  NoEncontradoError
                 └─ reportes_duplicado_tenant_fk  ← el otro municipio
                 └─ reportes_duplicado_con_motivo ← el CHECK del par
               INSERT movimientos_de_reportes
               registrar(CAMBIAR_ESTADO_REPORTE))

CONSULTA PUBLICA                 (sin sesion, sin segundo factor)
  GET /reportes/[folio]
    ├─ CABECERA_SUPERFICIE == "ayuntamiento"?  si no → notFound()
    ├─ { id } = await ayuntamientoActual()     subdominio, sin sesion
    ├─ limitarRitmo(id, [{ tipo:"folio", valor: ip }])  → 429   ← ANTES
    └─► consultarFolioDeReporte({ ayuntamientoId, folio })  caso de uso PUBLICO
          └─ withTenant(id, tx =>
               paraConsultaPublica(tx, folio)            ← SELECT 1
                 └─ RLS: de otro municipio ≡ inexistente ≡ null
               si duplicadoDeReporteId !== null:
                 paraConsultaPublicaPorId(tx, …)         ← SELECT 2, y no hay 3
          └─ proyectarConsulta(consultado, original)     domain, puro
               └─ SIN_REGISTRO — la MISMA referencia en los tres negativos
    └─ HTTP 200 siempre. El folio del original nunca entra al resultado.
```

---

## 17. Archivos

| Archivo | Accion | Rebanada |
|---|---|---|
| `territorio/domain/direccion.ts` (`componerUbicacion`, `PartesDeUbicacion`) + tests | Modificar | 1 |
| `territorio/application/puertosDeDirecciones.ts` (`LectorDeUbicaciones`) · `ubicacionDeLugar.ts` + tests | Modificar/Crear | 1 |
| `territorio/infrastructure/lectorDeUbicacionesSql.ts` (CTE de ancestros + SELECT de calle) | Crear | 1 |
| `territorio/{composicion.ts,application/index.ts,infrastructure/index.ts}` · `index.ts` (`comoCalleId`, `CalleId`) · `superficiePublica.test.ts` | Modificar | 1 |
| `territorio/ubicacionDeLugar.integration.test.ts` (lugar de otro tenant, calle de otro tenant, lugar de baja) | Crear | 1 |
| `reportes/{index,types}.ts` | Crear | 2 |
| `reportes/domain/{identificadores,tipoDeIncidencia,areaResponsable,estado,motivos,folio,duplicado,consulta,errores,index}.ts` + tests | Crear | 2 |
| `reportes/infrastructure/{esquema,index}.ts` | Crear | 3 |
| `drizzle/0010_reportes.sql` (3 tablas, `FORCE`, `GRANT`, 3 FK a mano, 6 indices) | Crear | 3 |
| `reportes/{reportes,foliosDeReportes,movimientosDeReportes}.isolation.test.ts` | Crear | 3 |
| `reportes/superficiePublica.test.ts` | Crear | 3 |
| `reportes/application/{puertos,puertosDeLectura,validacionDeReporte,registrarReporte,reportePorId,listarReportes,index}.ts` + tests | Crear | 4 |
| `reportes/infrastructure/{contadorDeFoliosSql,repositorioDeReportesSql,registroDeMovimientosSql,lectorDeUbicacionesPorTerritorio,lectorDeReportantesPorPadron}.ts` | Crear | 4 |
| `reportes/composicion.ts` | Crear | 4 |
| `reportes/folio.integration.test.ts` (T6, T7, dos municipios, corte de anio) · `registro.integration.test.ts` (ubicacion viva contra reparenteo) | Crear | 4 |
| `shared/auth/roles.ts` (`puedeAdministrarReportes`) + su fila en `roles.test.ts` | Modificar | 5 |
| `reportes/application/{cambiarEstadoDeReporte,asignarAreaDeReporte}.ts` + tests | Crear | 5 |
| `reportes/duplicados.integration.test.ts` (cadena, ciclo por SQL crudo, FK autorreferencial, atomicidad) | Crear | 5 |
| `reportes/application/consultarFolioDeReporte.ts` + tests de uniformidad | Crear | 6 |
| `src/app/reportes/[folio]/page.tsx` · `consultarFolioDeReporte.ritmo.test.ts` | Crear | 6 |
| `reportes/application/buscarReportesSimilares.ts` + test | Crear | 7 |
| `reportes/ui/` (listado, detalle con historial, alta, isla del buscador, Server Actions) · `src/app/(panel)/reportes/{page,alta,[id]}/…` | Crear | 7 |
| `AGENTS.md` (filas de `altaDeReporteAction` y de las acciones de transicion) | Modificar | 7 |
| `reportes/composicion.ts` (`porcionesDeReportes`) · `src/app/exportacion/porciones.ts` · `composicion.test.ts` | Modificar | 8 |
| `docs/architecture/estructura.md` · `docs/05-seguridad.md` §10 (segunda superficie de la ventana `"folio"`) | Modificar | 8 |

### La exportacion

```ts
export const porcionesDeReportes: readonly [PorcionExportable, PorcionExportable] = [
  { nombre: "reportes", leer: (tx) => tx.select({ … }).from(reportes) },
  { nombre: "movimientos_de_reportes", leer: (tx) => tx.select({ … }).from(movimientos) },
];
```

Columnas explicitas una por una, **nunca `select()` pelado**, y sin
`ayuntamientoId` —redundante, mismo criterio que `porcionDePadron`—. Se
construye en `composicion.ts` y no en `infrastructure`, precedente
`constancias/composicion.ts:87`.

**`descripcion` y `referencia` van incluidas**, con el mismo argumento con el
que `constancias` incluye `codigoVerificacion`: el archivo municipal tiene que
poder reconstruir que se reporto, el archivo ya lleva nombres y domicilios de
`personas` en el mismo volcado, y sale detras de `puedeExportar` con traza en
bitacora. Un archivo sin la descripcion no reconstruye nada y no esconde nada
que ese mismo archivo no diga. Queda como pregunta abierta (§20).

`porcion.nombre` unicos contra `conjuntosDePlataforma`, `padron`, `territorio`
y `constancias`, verificado por `composicion.test.ts`.

---

## 18. Estrategia de pruebas — TDD estricto

**El orden no es una recomendacion.** En cada rebanada el test entra en el
mismo commit que la implementacion y **antes** en el diff. La secuencia por
pieza es siempre la misma: (1) el test rojo que describe el comportamiento,
(2) la implementacion minima, (3) refactor con el test en verde.

| Capa | Que | Como |
|---|---|---|
| Unit (domain) | `Folio.crear` con `padStart` que **no trunca** y rechazo de consecutivo `< 1` o no entero; `transicionValida` como **tabla de 16 pares** recorriendo `ESTADOS_DE_REPORTE × ESTADOS_DE_REPORTE`, para que un estado nuevo **falte** en vez de heredar; `esTerminal` en los cuatro; `originalDe` y `vincularDuplicado` en los cinco casos de §8, **incluido duplicado-de-duplicado y el ciclo de largo 2**; `proyectarConsulta` con `toBe(SIN_REGISTRO)` —identidad, no forma— en los negativos, con salto y sin salto, y con `original === null` habiendo vinculo; `componerUbicacion` con y sin calle, con uno y con cuatro ancestros; constructores de id rechazando no-UUID | Sin base. Milisegundos. **Es la rebanada 2 entera** |
| Unit (application) | Guardas de rol (`puedeEscribir` para registrar, `puedeAdministrarReportes` para transicion y asignacion, **ninguna** para las lecturas); **orden de llamada: los puertos de `territorio` y `padron` se invocan antes de abrir `withTenant`**; `UbicacionInvalidaError` y `ReportanteDadoDeBajaError` **antes** de tocar el contador; `DuplicadoSinOriginalError` en las dos direcciones; `candidatoAOriginal` invocado **dentro** del `withTenant`; `aplicarTransicion` devolviendo `false` → `NoEncontradoError`; `consultarFolioDeReporte` haciendo **exactamente dos** llamadas al repositorio cuando hay vinculo y **una** cuando no | Puertos mockeados. El test de orden es el que protege contra el anidamiento y contra consumir folio en un rechazo; el de conteo de llamadas es el que fija "un solo salto" |
| Integration | **T6:** una transaccion paralela (`enTransaccionParalela`, `municipiosDePrueba.ts`) toma el folio y no confirma; el registro concurrente **queda pendiente** (`Promise.race` con temporizador) y resuelve con el siguiente al COMMIT. **T7:** repositorio que lanza despues del contador; el registro siguiente obtiene **el mismo numero**. Dos municipios registran `REP-2026-000001` sin colisionar. La serie corta por anio. Ubicacion **viva**: registrar → reparentear la colonia → el texto **cambia**. Cadena de duplicados: marcar C duplicado de B (que es duplicado de A) guarda `C → A`. **Ciclo por SQL crudo**: `UPDATE` directo que arma A↔B, y la consulta publica **resuelve** con dos consultas. Atomicidad: un `registroDeMovimientos` que lanza deja el estado **sin cambiar** | Postgres real, `sembrar()`, dos tenants. **`pnpm test` y `psql` nativos, nunca `rtk`** (ADR 0001 §8) |
| Aislamiento | **Tres** archivos, uno por tabla. `reportes.isolation.test.ts` cubre ademas los **cuatro** FK compuestos rechazados por Postgres —`lugarId`, `calleId`, `personaId` y **`duplicadoDeReporteId` de otro municipio**—, `reportes_sin_autoduplicado`, y los dos CHECK de par (`rechazo_completo`, `duplicado_con_motivo`, este ultimo con `motivo` nulo y vinculo presente, que es el caso que `=` dejaria pasar). `movimientosDeReportes.isolation.test.ts` intenta un `UPDATE` y espera **error de permiso**, no lee el `.sql` | Consulta deliberadamente sin filtro + id conocido del otro tenant. Forma canonica de `invariantes-criticos.md` Capa 2 |
| Borde / superficie | `reportes/[folio]/page.tsx`: **ritmo antes del caso de uso** (`invocationCallOrder`), 429 sin consultar, **200 en los tres negativos**, `notFound()` fuera de la superficie de ayuntamiento, y **ningun folio ajeno, descripcion, ubicacion ni area en el HTML** —assertion sobre el markup, no sobre el objeto— | `vi.mock` de los casos de uso, forma de `validarFolio.ritmo.test.ts` |
| Disciplina | `identidadPorPuerto.test.ts` **sin cambios** sigue verde con `reportes` presente (verificar, no asumir); `reportes/superficiePublica.test.ts` y `territorio/superficiePublica.test.ts` actualizado; `porcion.nombre` unicos; `pnpm layers`; `pnpm reglas` —que verifica `ENABLE`, `FORCE`, politica que filtra por `app.tenant` y `GRANT` de las tres tablas nuevas, `scripts/reglas/reglas/rls.ts:93`— | Tests de repo |

Cobertura sobre `unit` + `integration` juntas, en el job con base.
`vitest.config.ts` incluye `src/modules/**/{domain,application}/**`, asi que
todo `reportes/domain` y `reportes/application` cuenta; `esquema.ts` no,
porque el `include` no lo alcanza. Piso 80/75.

---

## 19. Matriz de amenazas

Las cinco filas de `references/threat-matrix.md` son de clase
routing-de-shell / procesos / automatizacion de git. **Ninguna aplica**, y se
marcan una por una en vez de declararlo en bloque:

| Frontera | Aplicabilidad | Motivo |
|---|---|---|
| Rutas con forma de documentacion (`requirements.txt`, Markdown ejecutable) | **N/A** | El cambio no clasifica ni ejecuta archivos. No hay ninguna ruta de archivo que provenga de entrada del usuario |
| Seleccion de repositorio git (`git -C`, rutas relativas/absolutas) | **N/A** | El cambio no invoca git ni ninguna automatizacion de VCS |
| Estado del indice (staged, `commit -a`, indice vacio) | **N/A** | Idem |
| Estado del push (rama de seguimiento, primer push, refspec) | **N/A** | Idem |
| Comandos de PR (`--head`, prefijo de entorno, comandos compuestos) | **N/A** | Idem |

**Sin subprocesos, sin comandos de shell, sin `child_process`, sin
dependencias nuevas y sin extensiones de Postgres.** El unico SQL crudo son
dos `WITH RECURSIVE` de forma ya existente en el repo, con un solo parametro
enlazado y ningun texto de usuario concatenado.

Las superficies nuevas son de App Router: paginas bajo `(panel)` con sesion,
Server Actions, y **una pagina publica sin sesion**. Sus fronteras reales son
otras y estan probadas en §18, no aca:

| Superficie nueva | Amenaza | Donde se cierra |
|---|---|---|
| `/reportes/{folio}` sin sesion | Raspado de la serie enumerable de folios | `limitarRitmo` por IP antes del caso de uso (§14), con test de orden |
| `/reportes/{folio}` sin sesion | Filtracion del folio del original de un duplicado, que es el reporte de otro ciudadano | El tipo de respuesta **no tiene campo `folio`** (§14) |
| `/reportes/{folio}` sin sesion | Filtracion de la descripcion o la referencia —las dos cajas libres— o de la ubicacion | Ninguna de las tres entra al tipo de respuesta (§14), con assertion sobre el HTML |
| `/reportes/{folio}` sin sesion | Oraculo de existencia por 404 vs 200 | 200 siempre, y `SIN_REGISTRO` como referencia unica congelada (§14) |
| `duplicadoDeReporteId` desde un formulario | Vincular a un reporte de otro municipio | `reportes_duplicado_tenant_fk` compuesto, en Postgres, con su escenario de aislamiento (§18) |
| `lugarId`/`calleId`/`personaId` desde un formulario | Referenciar filas de otro municipio | Tres FK compuestos a mano (§6) mas la validacion previa de `territorio` que los convierte en error tipado y no en un `23503` crudo (§9) |
| Server Action de transicion | Cambiar estado sin ser `ADMIN_MUNICIPAL` ocultando el boton | La guarda vive en el caso de uso, no en la UI (§12) |

---

## 20. Supuestos, lo que no se midio y preguntas abiertas

### Supuestos y limites declarados

- **Heredado y ahora medido: el contador bajo concurrencia.**
  `constancias/design.md` §4 lo declaro "no medido" y
  `folio.integration.test.ts` lo cerro contra esta base. `reportes` usa el
  mismo mecanismo con una columna menos y vuelve a probarlo (T6/T7) en su
  propia rebanada.
- **Hecho verificado, no medido: el nivel es `READ COMMITTED`.**
  `withTenant.ts:106` no fija ninguno. Si alguna vez se sube, la sentencia del
  contador necesita reintento por `40001` y esta seccion deja de ser cierta.
- **No medido: la serializacion de la serie.** Un registro a la vez por
  `(municipio, anio)`. A volumen municipal —unidades por dia— no hay motivo
  para medirlo; a decenas por minuto si.
- **No medido: dos o tres transacciones secuenciales por alta** (ubicacion,
  reportante opcional, registro) contra el presupuesto de < 2 s de
  `docs/06-frontend.md` §10. Un alta anonima son dos.
- **No medido: `reportes_similares_idx` con cuatro columnas contra la version
  parcial** (§13). Con la tabla vacia la diferencia es cero; el criterio para
  cambiarlo esta escrito ahi.
- **Limite declarado: un ciclo de duplicados de largo >= 2 metido por SQL
  crudo** produce un estado equivocado y visible. Verificado que no produce un
  bucle (§8). La aplicacion no lo puede escribir.
- **Limite declarado: la ubicacion no valida coherencia calle-lugar** (§9).
- **Limite declarado: la descripcion y la referencia son cajas libres** y
  ninguna garantia tecnica impide que un operador escriba el nombre de una
  vecina. Etiqueta, largo y cero exposicion publica es todo lo que hay.
- **Limite declarado y observable: la ventana `"folio"` es compartida** con la
  validacion de constancias. Es la decision del usuario; separar la ventana
  seria agregar un valor a `TipoIntento` y una migracion del CHECK, exactamente
  como `constancias` hizo en `drizzle/0009_ritmo_folio.sql`.
- **Supuesto declarado: el catalogo de areas de la decision 3 no se contrasto
  contra ningun organigrama real.** Es la compuerta de producto antes de la
  rebanada 5, y este diseño no la reduce: solo deja `areaResponsable` nullable
  para que un reporte nunca se trabe por no tener area.

### Preguntas abiertas

- [x] **`registradoEn` de un folio duplicado.** **Decidido:** se devuelve el
      **propio** del reporte consultado, y solo el estado y el `actualizadoEn`
      son del original (§14). La fecha de registro responde "cuando avise yo",
      que es un hecho del reporte consultado; el estado responde "van a
      arreglarlo", que si es del original.
- [x] **`RECIBIDO → RESUELTO` directo.** **Decidido: es transicion valida**
      (§7). Exigir el paso intermedio no produce un registro mas fiel, produce
      dos clics con la misma marca de tiempo y un tiempo de atencion de cero.
- [x] **Si la decision 13 debe decir "las dos unicas cajas libres"** en vez de
      "la unica" (§5). **Decidido: si.** `referencia` se queda —le sirve a la
      cuadrilla para encontrar el lugar, que `descripcion` no cubre— y las dos
      llevan las mismas tres protecciones: etiqueta explicita en la UI, largo
      acotado y cero exposicion publica.
- [ ] **Si la exportacion debe incluir `descripcion` y `referencia`.** Este
      diseño las incluye con su argumento (§17); quitarlas son dos lineas de
      `porcionesDeReportes`.
- [ ] **Si la respuesta publica debe decir "tu reporte se atiende junto con
      otro"** cuando el folio es duplicado (pregunta 2 de la propuesta). Este
      diseño no lo dice, siguiendo la decision 12. Si se decide que si, es una
      **frase en la pantalla** y **ningun cambio de contrato**: el tipo puede
      ganar una variante `"REGISTRADO_JUNTO_A_OTRO"` sin campos nuevos, y sigue
      sin exponer el folio del original.
- [ ] **El texto exacto de la ubicacion compuesta** (separadores, si el nombre
      de la calle lleva prefijo). Este diseño aporta la funcion pura y su
      firma; el texto lo fija `sdd-spec` con sus escenarios.

---

## 21. Migracion, despliegue y verificacion del corte

`drizzle/0010_reportes.sql` crea las tres tablas con `FORCE ROW LEVEL
SECURITY`, los `GRANT` y los **tres** FK compuestos escritos a mano en el
mismo archivo (§6). **Sin migracion de datos**: las tres nacen vacias. Sin
extensiones nuevas. Sin cambios en `intentos_acceso`: la ventana `"folio"` se
reusa tal cual.

`lugares`, `calles` y `personas` **no se tocan en ningun momento** —solo se
referencian—, y la lectura nueva de `territorio` es aditiva: quitarla no
cambia ninguna lectura existente. Rollback segun la propuesta, en sus cinco
regimenes; este diseño agrega un detalle: **quitar la ruta `/reportes/{folio}`
no requiere tocar la base**, porque el folio ya esta escrito en las filas y la
ruta puede volver despues sin migracion.

### El corte

Este diseño **sostiene las ocho rebanadas de la propuesta y su orden**, con
un solo ajuste de tamaño y ninguna reordenacion:

| # | Contenido | Propuesta | Diseño |
|---|---|---|---|
| 1 | Lectura de ubicacion en `territorio` + `componerUbicacion` + puerto + CTE + barrel y `superficiePublica` | 300 | **~340** (+40: el `SELECT` de calle aparte, el barrel y su test) |
| 2 | Dominio puro completo, sin base | 420 | **~420** |
| 3 | Esquema, migracion y tres aislamientos | 540 | **~510** (−30: el FK autorreferencial lo emite Drizzle, §6) |
| 4 | Puertos de lectura + `registrarReporte` + contador + T6/T7 | 680 | **~700** (+20: la fila de movimiento del alta, §11) |
| 5 | Estados, asignacion y vinculo de duplicado | 500 | **~540** (+40: `duplicados.integration.test.ts` con el ciclo por SQL crudo) |
| 6 | Consulta publica | 380 | **~380** |
| 7 | Buscador de similares y UI de mostrador | 630 | **~630** |
| 8 | Exportacion y docs | 130 | **~150** |
| | **Total** | ~3.580 | **~3.670** |

Ocho rebanadas, ninguna sobre 800, **secuenciales contra `main` y no
apiladas** (`CLAUDE.md`: "Un PR, un merge. Las ramas no se apilan").

La 4 (~700) es la que menos margen deja y tiene su corte de emergencia
decidido de antemano para no improvisarlo con el PR abierto: **corta por la
UI**, no por el contador. El contador, `registrarReporte` y los dos tests de
concurrencia van juntos —el invariante 2 pide que la reja llegue con la tabla
y no despues— y el formulario de alta se va a una 4b.

**La 3 no se parte por tabla.** Partirla dejaria una migracion intermedia
donde `reportes` existe sin sus FK compuestos, que es el bypass entre
municipios que este cambio existe para cerrar. Un diff largo que toca tenancy
una sola vez se revisa mejor que dos diffs cortos con una ventana insegura en
medio (mismo criterio que capa-territorial §17).

**Dependencias confirmadas:** la 4 depende de la 1, la 2 y la 3; la 5, la 6 y
la 7 dependen de la 4; **la 6 depende ademas de la 5**, y este diseño lo
confirma en vez de heredarlo: `consultarFolioDeReporte` tiene una rama que
solo se puede probar contra filas con `duplicado_de_reporte_id` escrito, y lo
unico que lo escribe es `cambiarEstadoDeReporte`. La compuerta de producto
—revisar el catalogo de areas con el piloto— sigue antes de la 5.
