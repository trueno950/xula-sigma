# Tasks: Constancias y oficios (Fase 2)

**Cambio:** `constancias-oficios` · **Insumos:** `proposal.md`, `design.md`
(20 secciones, 12 decisiones numeradas, tabla de archivos §14, corte de
rebanadas §17) · **Specs:** 6 archivos, 26 requisitos (`### Requirement:`) —
ver Trazabilidad al final. El brief de esta sesion habla de 27; el conteo
real, verificado con `grep -c "^### Requirement:"` sobre los seis archivos,
da 26 (15 en `emision-de-constancias`, 6 en `validacion-publica-de-folio`, 1
cada uno en `autorizacion-roles`, `residencias`, `domicilios` y
`autenticacion-municipal`). Se deja escrito porque el brief no coincide con
el artefacto y el artefacto manda.

Presupuesto de revision de esta sesion: **800 lineas** (`review_budget_lines`
del preflight, igual al de `proposal.md`/`design.md`).

## Nota — un hecho del repo que `design.md` §7 no tenia

`design.md` describe `territorio/domain/residencia.ts` como "archivo
existente, funcion nueva". **Verificado contra el repo (`Glob
src/modules/territorio/domain/*.ts`): el archivo no existe.** Existio: la
Fase 6 de `capa-territorial/tasks.md` lo creo (tarea 6.4) y lo revirtio en la
misma tarea, "sin llamador de produccion... la unica proteccion real es el
CHECK `residencias_vigencia` de Postgres". La tarea 1.1/1.2 de abajo lo trata
como **archivo nuevo**, no como modificacion. No cambia el presupuesto de
lineas de forma apreciable ni la dependencia del corte; se anota porque es
justo el tipo de discrepancia entre diseno y repo que un PR no deberia
descubrir a mitad de implementacion.

## Review Workload Forecast

Ver seccion final del archivo (`## Review Workload Forecast`, al pie por
contrato de esta sesion — el precedente `capa-territorial/tasks.md` la puso
al inicio; aca se sigue la instruccion explicita del preflight en vez del
precedente de formato).

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Dos lecturas nuevas en `territorio`: residencia vigente y direccion compuesta como texto | PR 1 | `pnpm test src/modules/territorio/domain -- direccion residencia` + `application -- direccionVigenteDePersona` | `pnpm db:local`; `pnpm test:integration -- direcciones` | Revertir PR; aditivo, `historialDeResidencias` sigue resolviendo la vigencia a mano si algo falla |
| 2 | Esquema completo de `constancias`: 3 tablas + columna `documentos`, RLS/`FORCE`/`GRANT`, FK a mano, dominio puro, 4 aislamientos | PR 2 | `pnpm test src/modules/constancias/domain` + `pnpm test:integration -- isolation` (constancias) | `pnpm db:local`, nativo sin `rtk` | Revertir PR y bajar `drizzle/0008_constancias.sql`; las tablas nacen vacias, nada mas las lee |
| 3 | Configuracion del bloque de firma: Zod, caso de uso, `puedeAdministrarDocumentos`, UI | PR 3 | `pnpm test src/modules/constancias/application -- Documentos` + `shared/auth/roles.test.ts` | `pnpm db:local`; `pnpm test:integration -- documentos` | Revertir `application/{validacionDeDocumentos,configurarDocumentos,documentosDelAyuntamiento}.ts`+UI; columna de PR2 intacta, queda `{}` |
| 4 | Emision con folio bajo lock: contador, `emitirConstancia`, snapshot congelado, T6/T7, `enTransaccionParalela`, UI | PR 4 | `pnpm test src/modules/constancias/application -- emitirConstancia` | `pnpm db:local`; `pnpm test:integration -- folio emision` | Revertir `application/{puertos,emitirConstancia,constanciaPorId,listarConstancias}.ts`+adaptadores+UI; esquema de PR2 intacto, `folios_de_documentos` queda vacia |
| 5 | Render de PDF: puerto, `renderizadorReactPdf`, plantilla de vecindad, QR, Route Handler | PR 5 | `pnpm test src/modules/constancias/application -- pdfDeConstancia` | `pnpm db:local`; sin Postgres para el render puro (renderizador falso) | Revertir `application/{puertosDeRender,pdfDeConstancia}.ts`+`infrastructure/{renderizadorReactPdf,plantillas}`+route.ts; emision de PR4 sigue funcionando, solo sin PDF |
| **Compuerta de producto** | Ronda de revision visual con el piloto, hoja impresa en su propia impresora. **La fase no cuenta como vendible hasta que cierre.** No es una tarea de codigo | — | — | — | — |
| 6 | Reimpresion y cancelacion: tabla `reimpresiones`, casos de uso, marca de agua acreditada, motivos cerrados, UI | PR 6 | `pnpm test src/modules/constancias/application -- reimprimir cancelar` | `pnpm db:local`; `pnpm test:integration -- reimpresionYCancelacion` | Revertir `application/{reimprimirConstancia,cancelarConstancia}.ts`+UI; `constancias`/PDF de PR4-5 intactos |
| 7 | Validacion publica: `validarFolio`, generalizacion de `limitarRitmo`, migracion del CHECK, pagina publica | PR 7 | `pnpm test src/modules/constancias/application -- validarFolio` + `src/shared/auth -- ritmo` | `pnpm db:local`; `pnpm test:integration -- ritmo folio` | Quitar `src/app/validar/[folio]/page.tsx` sin tocar la base — el QR queda apuntando a 404, fallo visible y no fuga |
| 8 | Exportacion: `PorcionExportable` de `constancias` | PR 8 | `pnpm test src/modules/constancias -- composicion` | N/A — cubre el propio test de composicion | Revertir `porcionesDeConstancias`/`porciones.ts`; exportacion de otros modulos intacta |

### Dependencia real (no una cadena lineal)

- **1** es independiente. Solo la necesita la **4** (`emitirConstancia`
  consume `direccionVigenteDePersona`).
- **2** es independiente de la 1. Es la base de esquema: **3, 4, 6 y 8** la
  necesitan (importan `constancias/infrastructure/esquema.ts`); **7** la
  necesita solo por `constancias.folio`/`codigoVerificacion`, via la 4.
- **3 antes que 4**: decision 19 — sin bloque de firma configurado no se
  emite, y `emitirConstancia` lo verifica dentro de su propia transaccion.
- **4 depende de la 1 y de la 3.**
- **6 depende de la 4** (reimprime/cancela una constancia que ya existe) **y
  de la compuerta de producto entre 5 y 6** — dependencia de producto, no de
  codigo: no hay import que la exprese, pero el criterio de exito de
  `proposal.md` la hace no negociable.
- **Hallazgo de `design.md` §17, el unico reordenamiento que este archivo
  aplica: la rebanada 7 (validacion publica) depende solo de la 4, no de la 5
  ni de la 6.** Necesita que existan constancias con folio y codigo
  (`constancias.folio`, `constancias.codigoVerificacion`) y nada de PDF, de
  reimpresion ni de cancelacion. Se puede implementar y mergear **mientras el
  piloto revisa la hoja impresa de la rebanada 5**, en vez de esperar a que
  la compuerta cierre y a que la 6 termine. El orden de PR sugerido de la
  tabla de arriba (1→2→3→4→5→6→7→8) es por conveniencia de secuencia a
  `main`, no porque 7 este bloqueada por 5 o 6.
- **8 depende de la 2** (solo necesita los objetos de tabla) y por
  conveniencia se secuencia al final.

---

## Phase 1: Rebanada 1 — Lecturas nuevas en `territorio` (~340 lineas)

Independiente. La necesita solo la Fase 4. Va primera porque es un cambio en
otro modulo y su diff se lee mejor solo (`proposal.md`).

- [x] 1.1 RED `territorio/domain/residencia.test.ts` (archivo **nuevo**, ver
      nota de discrepancia arriba): `vigenteDe` con historial vacio -> `null`;
      con una residencia abierta -> esa; con dos residencias donde solo una
      tiene `hastaEn === null` -> la abierta, usando `find` sobre un arreglo
      ya en el orden `desdeEn DESC, creadoEn DESC` (no reordena — pasar un
      arreglo deliberadamente "mal ordenado" y verificar que `vigenteDe`
      **no** lo corrige, porque ese es el contrato de `historialDe`).
- [x] 1.2 GREEN `territorio/domain/residencia.ts`:
      `vigenteDe<R extends { hastaEn: string | null }>(historial): R | null`.
- [x] 1.3 RED `territorio/domain/direccion.test.ts` (modificar — el archivo
      existe con `transversalesValidas`): `componerDireccion` con `numero:
      null` -> incluye `"S/N"` en el texto; con las dos transversales
      presentes -> las incluye con su conector; sin transversales ni
      referencia -> las omite sin dejar separadores huerfanos; con la cadena
      de ancestros completa (manzana -> colonia -> sector -> comisaria) ->
      aparecen del mas profundo al mas superficial, en ese orden.
- [x] 1.4 GREEN `territorio/domain/direccion.ts`: agregar `PartesDeDireccion`
      y `componerDireccion`, sin tocar `transversalesValidas`.
- [x] 1.5 `territorio/application/puertosDeDirecciones.ts` (crear):
      `LectorDeDirecciones.partesDe(tx, domicilioId): Promise<PartesDeDireccion
      | null>` — **con `tx`**, a diferencia de `LecturaDePersonas`
      (design.md seccion 7: el `tx` en la firma marca si el adaptador cruza
      o no un limite de modulo; este vive dentro de `territorio`).
- [x] 1.6 RED `territorio/infrastructure/lectorDeDireccionesSql.test.ts`:
      `WITH RECURSIVE` hacia arriba por `padreId` (mismo patron que
      `subarbol`, `sql` crudo y no builder — Drizzle 0.45.2 no expresa un CTE
      auto-referente) resuelve la cadena completa de ancestros de un
      domicilio con manzana conocida; un domicilio colgado directo de una
      colonia (sin manzana ni sector) devuelve solo los niveles presentes,
      sin fallar; `WHERE profundidad < 8` como cinturon, mismo limite que
      `subarbol`.
- [x] 1.7 GREEN `territorio/infrastructure/lectorDeDireccionesSql.ts`: el CTE
      de ascenso mas el `JOIN` a `calles` para resolver los nombres de
      `calle`, `entreCalleA`, `entreCalleB`. **Nombra `lugares`, `calles` y
      `domicilios` — ninguno dispara `identidadPorPuerto.test.ts`**
      (verificar, no asumir, en 1.16).
- [x] 1.8 RED `territorio/application/direccionVigenteDePersona.test.ts`
      (puertos mockeados, mismo esqueleto que `historialDeResidencias.test.ts`):
      `identidades = []` (persona inexistente o de otro tenant) -> `null`,
      **sin abrir `withTenant`** (assert de orden con `invocationCallOrder`,
      protege contra el anidamiento del design.md seccion 6); `vigenteDe`
      sobre el historial mockeado da `null` (nadie con `hastaEn` nulo) ->
      `null`; `partesDe` devuelve `null` (domicilio inexistente o escondido
      por RLS) -> `null`; camino feliz -> `{ residenciaId, domicilioId,
      desdeEn, texto }` con `texto = componerDireccion(partes)`.
- [x] 1.9 GREEN `territorio/application/direccionVigenteDePersona.ts`:
      `lecturaDePersonas.identidadesDe` **antes** de `withTenant`, nunca
      adentro (design.md seccion 7).
- [x] 1.10 RED integration: domicilio de una persona con identidad fusionada
      y dos residencias abiertas (una por cada mitad de la fusion, distinto
      `desdeEn`) — `direccionVigenteDePersona` resuelve la mas reciente por
      el mismo desempate de `historialDe`, sin ejecutar su propia consulta
      contra `residencias` (spec `residencias`, escenario de fusion).
- [x] 1.11 RED mismo archivo: domicilio con todos los niveles presentes
      (calle, numero, dos transversales, cadena completa de ancestros) — el
      texto compuesto incluye todo (spec `domicilios`, primer escenario);
      domicilio con niveles ausentes — el texto omite lo ausente sin fallar
      (spec `domicilios`, segundo escenario); reparentear la colonia del
      domicilio y volver a pedir el texto — refleja la jerarquia **actual**,
      no una copia congelada (spec `domicilios`, tercer escenario — esta
      lectura es deliberadamente viva; congelarla es trabajo de `constancias`
      en la Fase 4, no de aca).
- [x] 1.12 GREEN (ajustar el `JOIN`/`ORDER BY` de 1.7 y 1.9 si algun caso de
      1.10-1.11 no calza).
- [x] 1.13 `territorio/composicion.ts`, `application/index.ts`: componer y
      exportar `direccionVigenteDePersona`, sin guarda de rol propia — la
      autorizacion la decide el consumidor (`constancias`), mismo criterio
      que `personaPorId`.
- [x] 1.14 `territorio/ui/HistorialDeResidencias.tsx` (modificar): adopta
      `vigenteDe` para resolver cual fila resaltar como vigente en vez de
      recalcular el desempate a mano en la UI — pago concreto de la decision
      16 de `proposal.md`, en la misma rebanada que la funcion nace.
- [x] 1.15 RED `territorio/superficiePublica.test.ts` (modificar): assertion
      de que el barrel exporta `direccionVigenteDePersona` como valor, no
      como caso de uso sin verificacion de rol expuesto sin querer a un
      consumidor que espere una guarda.
- [x] 1.16 GREEN + verificar (no asumir) que `identidadPorPuerto.test.ts`
      sigue en verde con `lectorDeDireccionesSql.ts` presente.
- [x] 1.17 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

## Phase 2: Rebanada 2 — Esquema, dominio y aislamiento de `constancias` (~760 lineas)

Independiente de la Fase 1. Es la base de esquema para las Fases 3, 4, 6 y 8,
y de forma indirecta (via la 4) para la 7. **Margen mas ajustado del corte**:
si hace falta cortar de emergencia, sale el dominio puro (`Folio`, uniones,
proyeccion, errores) a una rebanada 2b — no las tablas ni los aislamientos,
que tienen que nacer juntos: partir la migracion dejaria `constancias` sin
su FK compuesto contra `personas` en un estado intermedio, el mismo bypass
entre municipios que este cambio existe para cerrar (mismo criterio que
`capa-territorial` §17 aplico a su Rebanada 2).

- [ ] 2.1 RED `constancias/domain/identificadores.test.ts`: `comoConstanciaId`
      y `comoReimpresionId` rechazan no-UUID y aceptan UUID valido.
- [ ] 2.2 GREEN `constancias/domain/identificadores.ts` (`Identificador<N>` +
      `PATRON_UUID` propio — septimo y octavo lugar del mismo regex,
      design.md seccion 3, no se corrige aca).
- [ ] 2.3 RED `constancias/domain/tipoDeDocumento.test.ts`: `PREFIJOS`
      recorriendo `TIPOS_DE_DOCUMENTO` entero (forma de tabla de
      `roles.test.ts`, para que un tipo nuevo **falte** en vez de heredar un
      prefijo por descarte).
- [ ] 2.4 GREEN `constancias/domain/tipoDeDocumento.ts`: union cerrada
      `TIPOS_DE_DOCUMENTO = ["VECINDAD"]`, `PREFIJOS: Record<TipoDeDocumento,
      string>`.
- [ ] 2.5 RED `constancias/domain/folio.test.ts`: `Folio.crear(prefijo, anio,
      consecutivo)` produce `"VEC-2026-000001"` para el primer consecutivo;
      consecutivo `1_000_001` se imprime con siete digitos y **no trunca**
      (spec: "El consecutivo un millon uno no rompe la unicidad"); consecutivo
      `0` o no entero se rechaza.
- [ ] 2.6 GREEN `constancias/domain/folio.ts`: `padStart(6, "0")` sin
      recorte.
- [ ] 2.7 RED `constancias/domain/motivos.test.ts`: `MOTIVOS_DE_REIMPRESION`
      = `["EXTRAVIO", "DETERIORO", "EJEMPLAR_ADICIONAL"]`,
      `MOTIVOS_DE_CANCELACION` = `["ERROR_DE_CAPTURA", "DATOS_INCORRECTOS",
      "SOLICITUD_DEL_INTERESADO"]`, ambas como uniones cerradas sin `OTRO`.
- [ ] 2.8 GREEN `constancias/domain/motivos.ts`.
- [ ] 2.9 RED `constancias/domain/validacion.test.ts` — el test que fija la
      uniformidad, comparando **identidad, no forma**: `fila === null` ->
      `toBe(NO_VALIDO)`; `fila.canceladaEn !== null` -> `toBe(NO_VALIDO)`
      (misma referencia que el caso anterior); `codigo === null` con fila
      vigente -> nivel 1 (`estado`, `tipo`, `emitidaEn`, sin `titular` ni
      `direccion`); `codigo` incorrecto -> `toBe(NO_VALIDO)`; `codigo`
      correcto -> nivel 2 con `titular` y `direccion`.
- [ ] 2.10 GREEN `constancias/domain/validacion.ts`: `ResultadoDeValidacion`
      union con la variante negativa sin campos, `const NO_VALIDO =
      Object.freeze({ estado: "NO_VALIDO" } as const)`, `proyectarValidacion`.
- [ ] 2.11 `constancias/domain/errores.ts`: `SinResidenciaVigenteError`,
      `DocumentosNoConfiguradosError`, `TitularDadoDeBajaError`,
      `DocumentoCanceladoError`, `PlantillaDesconocidaError` — mismo patron
      que `shared/lib/errores.ts` (clase, `codigo` estable, `name`).
- [ ] 2.12 `constancias/domain/index.ts`: barrel de dominio, reexport
      nombrado, nunca `export *` sobre nada que exponga un detalle interno.
- [ ] 2.13 `constancias/infrastructure/esquema.ts`: las tres tablas
      (`constancias`, `folios_de_documentos`, `reimpresiones`) con
      `columnaTenant()` + `politicaTenant()` + `.enableRLS()`;
      `folios_de_documentos` con PK compuesta `(ayuntamientoId, tipo, anio)`,
      **sin columna `id` sustituta** (design.md seccion 4); `unique(id,
      ayuntamientoId)` solo en `constancias` (destino de FK compuesto),
      **no** en `reimpresiones` (hecho hoja, nada la referencia); los dos
      `foreignKey()` de Drizzle contra `usuarios_id_tenant_key`
      (`emitidaPorUsuarioId`, `canceladaPorUsuarioId`); `check
      ("constancias_cancelacion_completa", ...)` con la igualdad de los tres
      NULL/no-NULL; `check("constancias_consecutivo_positivo", ...)`;
      `check("folios_consecutivo_positivo", ...)`; `constancias_persona_idx`
      **con el builder de Drizzle, nunca `sql\`…\``** (evita disparar
      `identidadPorPuerto.test.ts` — `personaId` existe como columna
      `persona_id`, mismo motivo que `residencias_persona_idx` en
      `capa-territorial`).
- [ ] 2.14 `shared/tenancy/esquema.ts` (modificar): agregar
      `documentos: jsonb().notNull().default({})` a `ayuntamientos`, **no
      nullable** (correccion a la propuesta, design.md seccion 9; mismo
      patron que `marca`). Sin `GRANT` ni politica nueva:
      `ayuntamientos_escritura_propia` ya cubre el `UPDATE`.
- [ ] 2.15 `constancias/infrastructure/index.ts`;
      `constancias/{index,types,composicion}.ts` esqueleto minimo, siguiendo
      el precedente de `marca`/`padron`/`territorio`.
- [ ] 2.16 `drizzle/0008_constancias.sql`: generar con `drizzle-kit
      generate`; en la cola, a mano: `FORCE ROW LEVEL SECURITY` para las tres
      tablas, los `GRANT` de la tabla de decision 5/6 (`constancias` con
      `UPDATE` solo por cancelacion; `reimpresiones` y `folios_de_documentos`
      sin `DELETE`, `reimpresiones` **tambien sin `UPDATE`**), y el FK
      compuesto a mano `constancias_persona_tenant_fk` hacia `personas(id,
      ayuntamiento_id)`, con el mismo comentario de advertencia contra
      `drizzle-kit push` que `drizzle/0007_territorio.sql:103-120`
      (apuntando ahi, no repitiendolo — antipatron 23).
- [ ] 2.17 RED `constancias/superficiePublica.test.ts`: el barrel no exporta
      ningun objeto de tabla Drizzle — provocar el rojo exportando
      `constancias` (la tabla) temporalmente, confirmar el fallo, retirarlo.
- [ ] 2.18 GREEN: barrel limpio, test en verde.
- [ ] 2.19 RED `constancias/constancias.isolation.test.ts`: sin filtro en
      Motul solo devuelve constancias de Motul (T1); una fila con
      `persona_id` de una persona de Ticul insertada desde Motul es
      rechazada por Postgres nombrando `constancias_persona_tenant_fk`; una
      cancelacion a medias (`cancelada_en` sin `motivo_cancelacion`) es
      rechazada por `constancias_cancelacion_completa`.
- [ ] 2.20 GREEN (ajustar RLS/FK/CHECK de 2.13/2.16 si algo falla).
- [ ] 2.21 RED `constancias/folios.isolation.test.ts`: sin filtro en Motul
      solo devuelve la fila de contador de Motul; dos filas para el mismo
      `(ayuntamientoId, tipo, anio)` son imposibles por la PK (insertar una
      segunda con SQL directo se rechaza).
- [ ] 2.22 GREEN.
- [ ] 2.23 RED `constancias/reimpresiones.isolation.test.ts`: sin filtro en
      Motul solo devuelve reimpresiones de Motul; una fila con
      `constancia_id` de Ticul insertada desde Motul es rechazada por
      Postgres nombrando `reimpresiones_constancia_tenant_fk` (o el nombre
      real que 2.13 le de al `foreignKey` compuesto).
- [ ] 2.24 GREEN.
- [ ] 2.25 RED `constancias/documentos.isolation.test.ts` — espejo exacto de
      `escudo.isolation.test.ts`: un bloque de firma configurado en
      `ayuntamientos.documentos` de Motul no aparece al consultar desde
      Ticul sin filtro explicito; RLS corta aunque el `ayuntamientoId` se
      falsee.
- [ ] 2.26 GREEN.
- [ ] 2.27 Verificar (no asumir) que `identidadPorPuerto.test.ts` sigue en
      verde con `constancias/infrastructure/esquema.ts` presente.
- [ ] 2.28 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde;
      confirmar piso 80/75 sobre `modules/constancias/domain`.

## Phase 3: Rebanada 3 — Configuracion del bloque de firma (~270 lineas)

Depende de la Fase 2. Antes de la Fase 4, no con ella (decision 19 de
`proposal.md`: sin bloque de firma configurado no se emite).

- [ ] 3.1 RED `shared/auth/roles.test.ts` (modificar): fila para
      `puedeAdministrarDocumentos` — `ADMIN_MUNICIPAL` si, `OPERADOR` /
      `CONSULTA` / `SUPER_ADMIN` no, recorriendo `ROLES` con `todosMenos`
      (mismo patron que las filas existentes de la tabla).
- [ ] 3.2 GREEN `shared/auth/roles.ts` (modificar): `puedeAdministrarDocumentos
      = (rol) => rol === "ADMIN_MUNICIPAL"`, junto a
      `puedeAdministrarTerritorio`.
- [ ] 3.3 RED `constancias/application/validacionDeDocumentos.test.ts`:
      `validarDocumentos` acepta `{ firmanteNombre, firmanteCargo }` validos
      con `leyendaDePie` opcional; rechaza nombre/cargo bajo el minimo de 3
      caracteres; esquema **plano, no anidado** (verificar que un error de
      `firmanteNombre` mapea a la clave `"firmanteNombre"`, no a
      `"firmante"`); `leerDocumentos` devuelve `null` (no `{}`) cuando el
      valor no valida — diverge del precedente `leerMarca` a proposito
      (decision 19: sin firmante no se emite, degradar a valores por defecto
      renderizaria la hoja sin firmante).
- [ ] 3.4 GREEN `constancias/application/validacionDeDocumentos.ts`: Zod aca,
      no en `domain` (`dominio-no-importa-nada` solo deja pasar `npm-dev`).
- [ ] 3.5 `constancias/application/puertosDeLectura.ts` (crear):
      `RepositorioDeDocumentos.{leer,escribir}` — repositorio propio, no el
      de `marca` (compartirlo obligaria a `constancias` a importar `marca`).
- [ ] 3.6 RED `constancias/infrastructure/repositorioDeDocumentosSql.ts.test.ts`
      (o `.test.ts` junto al archivo, calco de `repositorioDeMarcaSql.ts`):
      `leer` sobre `ayuntamientos.documentos`, `escribir` hace `UPDATE` sobre
      la fila propia.
- [ ] 3.7 GREEN `constancias/infrastructure/repositorioDeDocumentosSql.ts`.
- [ ] 3.8 RED `constancias/application/configurarDocumentos.test.ts` (puertos
      mockeados): rechaza sin `puedeAdministrarDocumentos`; lee el `jsonb`
      actual, compone `{ ...actual, ...campos }`, valida el resultado
      completo, y escribe **el crudo compuesto, nunca la salida de Zod**
      (assert de que una clave desconocida en el valor actual sobrevive a la
      escritura — mismo mecanismo que `marcaConEscudo`).
- [ ] 3.9 GREEN `constancias/application/configurarDocumentos.ts`.
- [ ] 3.10 RED `constancias/application/documentosDelAyuntamiento.test.ts`:
      lectura sin guarda de rol propia — solo la escritura la exige.
- [ ] 3.11 GREEN `constancias/application/documentosDelAyuntamiento.ts`.
- [ ] 3.12 RED integration: `configurarDocumentos` seguido de
      `documentosDelAyuntamiento` devuelve exactamente lo escrito; escribir
      dos veces conserva las claves no tocadas por la segunda escritura.
- [ ] 3.13 GREEN (ajustar 3.7/3.9 si falla).
- [ ] 3.14 `constancias/composicion.ts`, `application/index.ts`: componer
      `configurarDocumentos`, `documentosDelAyuntamiento`.
- [ ] 3.15 `constancias/ui/ConfiguracionDeDocumentos.tsx` (Server Component,
      `<form action>`); `ui/actions/configurarDocumentosAction.ts`;
      `src/app/(panel)/constancias/configuracion/page.tsx`.
- [ ] 3.16 `AGENTS.md`: agregar `configurarDocumentosAction` a la tabla de
      Server Actions (fila de `capa-territorial/tasks.md` 3.21).
- [ ] 3.17 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

## Phase 4: Rebanada 4 — Emision con folio bajo lock (~720 lineas, la mas ajustada junto con la 2)

Depende de las Fases 1 y 3. Corte de emergencia decidido de antemano: si hay
que partir, sale la pantalla de emision a una rebanada 4b — el contador, el
caso de uso y los dos tests de concurrencia van juntos porque el invariante 2
pide que la reja llegue con la tabla y no despues.

- [ ] 4.1 RED `shared/lib/fecha.test.ts` (modificar — el archivo existe con
      `hoyEnMerida`): `anioEnMerida()` devuelve el anio en `America/Merida`,
      no en UTC; caso limite: 31 de diciembre 19:00 hora de Merida (que ya es
      1 de enero en UTC) da el anio que ve la persona en Merida, no el de
      UTC — mismo bug que `AGENTS.md` documenta para `hoyEnMerida`.
- [ ] 4.2 GREEN `shared/lib/fecha.ts`: `anioEnMerida()` con el mismo
      `Intl.DateTimeFormat` que `hoyEnMerida`, tomando solo el componente de
      anio.
- [ ] 4.3 `constancias/application/puertos.ts` (crear): `RepositorioDeConstancias`
      (`guardar`, `buscarPorId`, `paraValidar`, `registrarReimpresion`,
      `cancelar`) y `ContadorDeFolios.siguiente(tx, { ayuntamientoId, tipo,
      anio }): Promise<number>`.
- [ ] 4.4 `constancias/application/puertosDeLectura.ts` (modificar): agregar
      `LecturaDeTitulares.porId(personaId): Promise<TitularLeido | null>` y
      `LecturaDeDirecciones.vigenteDe(personaId): Promise<DireccionVigente |
      null>` — **sin `tx`**, se llaman antes de abrir `withTenant` (mismo
      criterio que `LecturaDePersonas` de `territorio`, design.md seccion
      10).
- [ ] 4.5 RED `constancias/infrastructure/contadorDeFoliosSql.test.ts`: la
      sentencia exacta `INSERT ... ON CONFLICT (ayuntamiento_id, tipo, anio)
      DO UPDATE SET ultimo_consecutivo = folios_de_documentos.ultimo_consecutivo
      + 1 RETURNING ultimo_consecutivo`, primera llamada de una serie nueva
      -> `1`; segunda llamada misma serie -> `2`.
- [ ] 4.6 GREEN `constancias/infrastructure/contadorDeFoliosSql.ts`: con el
      builder de Drizzle (`.onConflictDoUpdate`), no `sql\`…\`` a mano.
- [ ] 4.7 `constancias/infrastructure/repositorioDeConstanciasSql.ts`,
      `lectorDeTitularesPorPadron.ts`, `lectorDeDireccionesPorTerritorio.ts`
      (crear) — los dos adaptadores llaman a `padron.personaPorId` y a
      `territorio.direccionVigenteDePersona` **por el barrel**, y hacen la
      conversion a `string` (`comoPersonaId`) justo antes de invocar la
      funcion tipada de `padron` (design.md seccion 2).
- [ ] 4.8 `constancias/application/validacionDeSnapshot.ts`: Zod, mismo
      esquema de `datos` que design.md seccion 5 (`titular`, `direccion` con
      `residenciaId` opaca, `firmante`, `leyendaDePie` opcional).
- [ ] 4.9 RED `constancias/application/emitirConstancia.test.ts` (puertos
      mockeados) — la bateria de orden que protege el invariante:
      `puedeEscribir(rol)` falso -> `NoAutorizadoError` **antes** de llamar
      cualquier puerto; titular `null` -> `NoEncontradoError`; titular con
      `bajaEn !== null` -> `TitularDadoDeBajaError`; direccion `null` ->
      `SinResidenciaVigenteError`; **los tres rechazos anteriores nunca
      llegan a abrir `withTenant`** (assert con `invocationCallOrder` de que
      `lecturaDeTitulares`/`lecturaDeDirecciones` corren antes que
      `contador.siguiente`); `leerDocumentos(null)` (bloque de firma sin
      configurar) -> `DocumentosNoConfiguradosError`, **y el contador nunca
      se invoca** (mock de `contador.siguiente` sin llamadas); camino feliz
      -> `guardar` recibe el snapshot compuesto por
      `titular+direccion+documentos` y `registrar` recibe `EMITIR_CONSTANCIA`
      con solo ids, en la misma llamada a `withTenant`.
- [ ] 4.10 GREEN `constancias/application/emitirConstancia.ts`: el orden
      exacto de design.md seccion 10 — pasos 1-3 fuera de toda transaccion,
      paso 4 (lectura de `documentos`, contador, `Folio.crear`, `guardar`,
      `registrar`) en un solo `withTenant`.
- [ ] 4.11 `shared/tenancy/municipiosDePrueba.ts` (modificar):
      `enTransaccionParalela(ayuntamientoId, trabajo)` sobre `appSinTenant` —
      `begin()`, `set_config('app.tenant', …, true)`, cede el control. Va en
      este archivo y no en el test porque `scripts/reglas/reglas/tenancia.ts:43`
      reconoce el andamiaje por nombre (`/DePrueba\.ts$|\.isolation\.test\.ts$/`)
      y un `*.integration.test.ts` que importe `postgres` es el antipatron 2.
- [ ] 4.12 RED `constancias/folio.integration.test.ts` — **T6, la prueba mas
      critica del cambio**: `enTransaccionParalela` toma el folio de
      `(motul, VECINDAD, 2026)` y no confirma; `emitirConstancia` disparado
      en paralelo (con Postgres real, no las dos conexiones de
      `DB_POOL_MAX=1`) **queda pendiente** (`Promise.race` contra un
      temporizador corto: la promesa sigue sin resolver); la paralela hace
      `COMMIT`; la emision resuelve con el consecutivo siguiente al que tomo
      la paralela.
- [ ] 4.13 GREEN (ajustar 4.6/4.10 si el lock no se comporta como se predice
      en design.md seccion 4).
- [ ] 4.14 RED mismo archivo — **T7**: `crearEmitirConstancia` compuesto con
      un `RepositorioDeConstancias` cuyo `guardar` lanza; la emision falla
      **despues** de tomar folio; la siguiente emision exitosa, con el
      repositorio real, obtiene **el mismo numero** — el rollback no consume
      folio.
- [ ] 4.15 GREEN.
- [ ] 4.16 RED mismo archivo: Motul y Ticul emiten su primera constancia de
      vecindad del anio, ambos obtienen `VEC-2026-000001` sin colisionar.
- [ ] 4.17 RED mismo archivo: se siembra `(motul, VECINDAD, 2025)` con
      `ultimoConsecutivo` alto; la primera emision de 2026 arranca en `1`.
- [ ] 4.18 GREEN (4.16-4.17 deberian pasar sin cambios si el esquema de 2.13
      y `Folio.crear` de 2.6 estan bien).
- [ ] 4.19 RED `constancias/emision.integration.test.ts` — el snapshot
      congelado, comportamiento y no implementacion: emitir una constancia,
      reparentear la colonia del titular, releer la constancia **y su
      reimpresion futura** (via `constanciaPorId`), comparar el texto
      caracter por caracter contra el original — no cambia ni un caracter.
- [ ] 4.20 GREEN `constancias/application/constanciaPorId.ts` +
      `listarConstancias.ts` con sus tests (puertos mockeados: id de otro
      tenant o inexistente -> `null`, nunca lanza).
- [ ] 4.21 RED mismo archivo de integracion: corregir el apellido de la
      persona en `padron` **despues** de emitir no cambia el nombre impreso
      en la constancia ya emitida (spec: "Editar el nombre de la persona no
      cambia el documento").
- [ ] 4.22 GREEN (debe pasar sin cambios si 4.19 esta bien: el snapshot no
      re-deriva nada).
- [ ] 4.23 `constancias/composicion.ts` (modificar): componer
      `crearEmitirConstancia`, `constanciaPorId`, `listarConstancias` con sus
      adaptadores de 4.7.
- [ ] 4.24 `constancias/ui/FormularioDeEmision.tsx` (Server Component,
      muestra `desdeEn` de la residencia vigente antes de confirmar — decision
      18, sin bloquear por periodo minimo); `ui/actions/emitirConstanciaAction.ts`;
      `src/app/(panel)/constancias/{page,emitir,[id]}/page.tsx`.
- [ ] 4.25 `AGENTS.md`: agregar `emitirConstanciaAction` a la tabla de Server
      Actions.
- [ ] 4.26 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde;
      confirmar piso 80/75 sobre `modules/constancias/{domain,application}`.

## Phase 5: Rebanada 5 — Render de PDF (~500 lineas)

Depende de la Fase 4 (necesita constancias ya emitidas con folio y snapshot).
**Compuerta de producto inmediatamente despues**: ronda de revision visual
con el piloto, hoja impresa en su propia impresora. La Fase 6 no arranca
hasta que esa ronda cierre; la Fase 7 si puede arrancar en paralelo (ver
"Dependencia real" arriba).

- [ ] 5.1 `constancias/application/puertosDeRender.ts` (crear):
      `EntradaDeRender` (folio, tipo, plantillaVersion, datos, municipio,
      urlDeValidacion, reimpresion) y `RenderizadorDeConstancias.aPdf(entrada):
      Promise<Uint8Array>`.
- [ ] 5.2 RED `constancias/application/pdfDeConstancia.test.ts` (puertos
      mockeados, renderizador falso): id inexistente o de otro tenant ->
      `NoEncontradoError`; `?reimpresion=<uuid>` que no existe, o que
      existe pero es de **otra** constancia -> `NoEncontradoError` (nunca
      renderiza sin haber acreditado la reimpresion); camino feliz sin
      `reimpresion` -> el renderizador recibe `reimpresion: false`; con
      `reimpresion` valido -> `reimpresion: true`.
- [ ] 5.3 GREEN `constancias/application/pdfDeConstancia.ts`: la fila de
      `reimpresiones` se busca por FK compuesto `(constanciaId,
      ayuntamientoId)`, dentro del mismo `withTenant` que la lectura de la
      constancia.
- [ ] 5.4 `constancias/infrastructure/plantillas/registro.ts`: `PLANTILLAS =
      { "vecindad-v1": ConstanciaDeVecindadV1 }`, `VERSION_ACTUAL = {
      VECINDAD: "vecindad-v1" }`.
- [ ] 5.5 `constancias/infrastructure/plantillas/ConstanciaDeVecindadV1.tsx`:
      JSX de `@react-pdf/renderer`, hoja carta, escudo opcional (`Buffer |
      undefined`), QR embebido como `<Image>`, bloque de firma, `S/N` ya
      viene resuelto en `datos.direccion.texto` (no se recompone aca), `prop
      reimpresion: boolean` que agrega la marca de agua — **un componente,
      no una segunda plantilla**.
- [ ] 5.6 RED `constancias/infrastructure/renderizadorReactPdf.test.ts`:
      `plantillaVersion` desconocida -> `PlantillaDesconocidaError`, **antes**
      de intentar renderizar nada; `qrcode.toDataURL` recibe
      `https://{subdominio}/validar/{folio}?c={codigo}`; escudo `undefined`
      -> renderiza sin la imagen, no lanza.
- [ ] 5.7 GREEN `constancias/infrastructure/renderizadorReactPdf.ts`: unico
      archivo del modulo que importa `@react-pdf/renderer` y `qrcode`;
      `renderToBuffer`, no `renderToStream` (correccion de design.md seccion
      11); descarga del escudo con tope de tiempo, `catch` -> `undefined`.
- [ ] 5.8 `constancias/composicion.ts` (modificar): cablear
      `RenderizadorDeConstancias` real, `crearPdfDeConstancia`.
- [ ] 5.9 RED `src/app/(panel)/constancias/[id]/pdf/route.test.ts` (borde,
      `vi.mock` del caso de uso): cabecera `CABECERA_SUPERFICIE !==
      "ayuntamiento"` -> `notFound()` sin llamar al caso de uso;
      `contextoActual()` -> `null` -> `401` sin llamar al caso de uso;
      `NoEncontradoError` del caso de uso -> `404`; camino feliz ->
      `Content-Type: application/pdf`, `Content-Disposition: inline;
      filename="{folio}.pdf"`, `Cache-Control: no-store`.
- [ ] 5.10 GREEN `src/app/(panel)/constancias/[id]/pdf/route.ts`: `GET`
      **no consulta la base** — pasa por `pdfDeConstancia` (design.md seccion
      11, decisiva contra `app-no-importa-infrastructure`); `await params`
      (Next 16).
- [ ] 5.11 `constancias/ui/`: el boton de imprimir es `<a
      href={\`/constancias/${id}/pdf\`}>` desde un Server Component, cero
      `"use client"` en el camino de emision-a-PDF.
- [ ] 5.12 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

**Compuerta de producto — no es una tarea de codigo, es una condicion de
avance.** Hoja impresa entregada al piloto en su propia impresora. La fase
no se declara vendible hasta que esta ronda cierre (`proposal.md`, mitigacion
del riesgo alto de producto). La Fase 7 puede implementarse y mergearse
mientras esta ronda esta abierta; la Fase 6, no.

## Phase 6: Rebanada 6 — Reimpresion y cancelacion (~570 lineas)

Depende de la Fase 4 (opera sobre constancias existentes) y de la Fase 5
(reimprimir produce un PDF con marca de agua) **y de que la compuerta de
revision visual haya cerrado**.

- [ ] 6.1 RED `constancias/application/reimprimirConstancia.test.ts`
      (puertos mockeados): rechaza sin `puedeEscribir`; id inexistente o de
      otro tenant -> `NoEncontradoError`; constancia cancelada ->
      `DocumentoCanceladoError`; motivo fuera de `MOTIVOS_DE_REIMPRESION`
      rechazado en tiempo de compilacion por el tipo (assert de que la
      union cerrada no acepta un literal ajeno via `// @ts-expect-error`);
      camino feliz -> `repositorio.registrarReimpresion` recibe `{
      constanciaId, usuarioId, motivo }`, `registrar` recibe
      `REIMPRIMIR_CONSTANCIA` con solo ids, devuelve el `reimpresionId`.
- [ ] 6.2 GREEN `constancias/application/reimprimirConstancia.ts`.
- [ ] 6.3 RED `constancias/application/cancelarConstancia.test.ts`: rechaza
      sin `puedeAdministrarDocumentos` (incluye caso `OPERADOR` que emitio el
      documento — spec: "no puede cancelar aunque emitio"); `UPDATE ... WHERE
      cancelada_en IS NULL RETURNING id` sin fila (inexistente, de otro
      tenant, o ya cancelada, **las tres tratadas igual** — invariante 1 mas
      "cancelar dos veces no tiene efecto que reportar") -> `NoEncontradoError`;
      camino feliz -> `cancelada_en`, `cancelada_por_usuario_id`,
      `motivo_cancelacion` en la misma sentencia, `registrar` con
      `CANCELAR_CONSTANCIA`.
- [ ] 6.4 GREEN `constancias/application/cancelarConstancia.ts`: el `UPDATE`
      condicional es tambien el mecanismo de concurrencia (design.md seccion
      10) — sin rama adicional para la carrera de dos cancelaciones
      simultaneas.
- [ ] 6.5 `constancias/infrastructure/repositorioDeConstanciasSql.ts`
      (modificar): implementar `registrarReimpresion` y `cancelar` contra el
      esquema de la Fase 2.
- [ ] 6.6 RED `constancias/reimpresionYCancelacion.integration.test.ts`:
      reimprimir dos veces (una por extravio, una por deterioro) deja **dos**
      filas, cada una con su propio motivo/usuario/momento, sin modificar la
      anterior (spec: "Reimprimir dos veces deja dos filas"); el conteo
      (`COUNT(*)` sobre `reimpresiones`) nunca decrece porque no hay `UPDATE`
      ni `DELETE` permitido por `GRANT` (intentar un `UPDATE` directo con el
      rol `xula_app` es rechazado por falta de permiso, no por RLS).
- [ ] 6.7 GREEN.
- [ ] 6.8 RED mismo archivo: reimprimir con `plantillaVersion` congelada en
      la version 1 mientras `VERSION_ACTUAL` avanza a la version 2 —
      `pdfDeConstancia` sigue resolviendo la version 1 para esa constancia
      (spec: "Cambiar la plantilla no altera una reimpresion posterior").
- [ ] 6.9 GREEN (verifica el lookup de 5.6-5.7, no deberia requerir cambios).
- [ ] 6.10 RED mismo archivo: cancelar una constancia, intentar reimprimirla
      -> `DocumentoCanceladoError`; emitir una constancia nueva para la
      misma persona despues de cancelar la anterior -> folio distinto, la
      cancelada permanece en el historial con su motivo (spec: "Cancelar no
      borra ni edita, deja historial").
- [ ] 6.11 GREEN.
- [ ] 6.12 RED mismo archivo: un `OPERADOR` que reimprime **no** necesita
      `puedeAdministrarDocumentos` (spec autorizacion-roles, "emite y
      reimprime sin necesitar la regla nueva") — se autoriza por
      `puedeEscribir`.
- [ ] 6.13 GREEN (deberia pasar sin cambios si 6.1-6.2 estan bien).
- [ ] 6.14 `constancias/composicion.ts` (modificar): componer
      `reimprimirConstancia`, `cancelarConstancia`.
- [ ] 6.15 `constancias/ui/`: boton de reimpresion con selector de motivo,
      enlace al PDF con `?reimpresion=<id>` que devuelve `reimprimirConstancia`;
      boton de cancelacion con selector de motivo, visible solo para quien
      pasa `puedeAdministrarDocumentos`; `ui/actions/{reimprimirConstancia,
      cancelarConstancia}Action.ts`.
- [ ] 6.16 `AGENTS.md`: agregar las dos Server Actions nuevas a la tabla.
- [ ] 6.17 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

## Phase 7: Rebanada 7 — Validacion publica de folio (~460 lineas)

**Depende solo de la Fase 4** (design.md seccion 17 — hallazgo de este
diseno sobre el orden de la propuesta): necesita `constancias.folio` y
`constancias.codigoVerificacion` existentes, nada de PDF (Fase 5), de
reimpresion ni de cancelacion (Fase 6). Puede implementarse y mergearse
mientras la compuerta de revision visual de la Fase 5 sigue abierta.

- [ ] 7.1 RED `shared/auth/intentosAcceso.test.ts` (si no existe, crear —
      verificar primero): `TIPOS_INTENTO` incluye `"folio"` ademas de
      `"correo"` e `"ip"`.
- [ ] 7.2 GREEN `shared/auth/intentosAcceso.ts` (modificar): `TIPOS_INTENTO =
      ["correo", "ip", "folio"] as const`.
- [ ] 7.3 `drizzle/0009_ritmo_folio.sql` (crear, migracion propia — otra
      tabla, otro modulo, otra rebanada, no se mezcla con `0008_constancias.sql`):
      generar con `drizzle-kit generate`; **verificar leyendo el archivo
      generado, no asumir** que `checkConstraints` del snapshot produce el
      `DROP CONSTRAINT` + `ADD CONSTRAINT` del CHECK
      `intentos_acceso_tipo_valido` (Postgres no permite alterar la
      expresion de un CHECK con una sola sentencia); si no aparece, escribir
      a mano en la cola del mismo archivo.
- [ ] 7.4 RED `shared/auth/ritmo.test.ts` (modificar): `LIMITES` gana
      `folio: 30`.
- [ ] 7.5 GREEN `shared/auth/ritmo.ts` (modificar): `LIMITES = { correo: 5,
      ip: 20, folio: 30 } as const`.
- [ ] 7.6 RED `shared/auth/limitarRitmo.test.ts` (crear, unit sobre la forma
      nueva sin Postgres): `limitarRitmo(ayuntamientoId, ventanas)` recibe un
      arreglo de `{ tipo, valor }` en vez de `{ correo, ip }`;
      `limitarRitmoDeAcceso(ayuntamientoId, { correo, ip })` sigue aceptando
      la forma vieja y arma las mismas ventanas que antes (correo ausente ->
      sin esa ventana, ip siempre presente).
- [ ] 7.7 GREEN `shared/auth/limitarRitmo.ts` (modificar): el nucleo se
      generaliza a `Ventana = { tipo: TipoIntento; valor: string }[]`,
      **conserva el orden "lanza despues de confirmar"** (el bug que
      documenta el comentario del archivo — el `throw` fuera de la
      transaccion, nunca adentro); `limitarRitmoDeAcceso` como envoltorio
      delgado.
- [ ] 7.8 `src/app/api/auth/[...all]/route.ts` (modificar, una linea): usar
      `limitarRitmoDeAcceso` en vez de `limitarRitmo`.
- [ ] 7.9 `src/shared/auth/ritmo.isolation.test.ts` (modificar, renombre de
      llamador): actualizar las dos lineas que invocan el nucleo viejo.
- [ ] 7.10 `src/app/api/auth/[...all]/ritmoDeLaRuta.test.ts` (modificar,
      churn de renombre): el `vi.mock` y los cuatro `toHaveBeenCalledWith`
      pasan a `limitarRitmoDeAcceso` — los ocho casos del archivo conservan
      su significado, sin cambio de comportamiento.
- [ ] 7.11 RED `constancias/application/validarFolio.test.ts` — la
      uniformidad probada en los cuatro casos negativos, con `toBe`, no
      `toEqual` (mismo criterio que 2.9): folio inexistente -> `null` de
      `repositorio.paraValidar` -> `toBe(NO_VALIDO)`; folio de otro tenant ->
      RLS lo colapsa al mismo `null` -> `toBe(NO_VALIDO)` (verificar que es
      la **misma referencia** de codigo, no una rama nueva); codigo
      incorrecto -> `toBe(NO_VALIDO)`; documento cancelado (con codigo
      correcto) -> `toBe(NO_VALIDO)`; sin `codigo` -> nivel 1; con `codigo`
      correcto -> nivel 2 con `titular` y `direccion` congelados del
      snapshot.
- [ ] 7.12 GREEN `constancias/application/validarFolio.ts`: firma propia
      `validarFolio({ ayuntamientoId, folio, codigo }): Promise<ResultadoDeValidacion>`,
      **sin `ContextoActual`, sin `usuario`** (design.md seccion 7 — no se
      puede construir un `ContextoActual` para un visitante anonimo sin
      contaminar la bitacora con un actor inexistente).
- [ ] 7.13 `constancias/infrastructure/repositorioDeConstanciasSql.ts`
      (modificar): implementar `paraValidar(tx, folio)`.
- [ ] 7.14 RED integration: dos municipios con el mismo folio impreso
      (`VEC-2026-000001` cada uno) — `validarFolio` desde el subdominio de
      Motul solo resuelve la constancia de Motul, sin confirmar que el folio
      existe en Ticul (spec: "Folio de otro municipio no confirma su
      existencia").
- [ ] 7.15 GREEN (deberia pasar sin cambios si 2.13/RLS estan bien —
      confirmar, no asumir).
- [ ] 7.16 `constancias/composicion.ts` (modificar): componer `validarFolio`
      **sin** exigir sesion.
- [ ] 7.17 RED `src/app/validar/[folio]/ritmo.test.ts` (forma de
      `ritmoDeLaRuta.test.ts`): con `invocationCallOrder`, el limitador corre
      **antes** que `validarFolio`; `RitmoExcedidoError` -> `429` **sin haber
      llamado** al caso de uso; la clave de la ventana es la IP, nunca el
      folio (assert de que dos folios distintos desde la misma IP comparten
      ventana).
- [ ] 7.18 GREEN `src/app/validar/[folio]/page.tsx`: `CABECERA_SUPERFICIE ===
      "ayuntamiento"` (si no, `notFound()`); `ayuntamientoActual()` resuelve
      por subdominio, nunca del folio ni de la URL; `limitarRitmo(id, [{
      tipo: "folio", valor: ip }])` antes de `validarFolio`; **HTTP 200
      siempre** — nunca 404 para folio inexistente (un 404 reconstruye el
      oraculo que la union cerro).
- [ ] 7.19 RED mismo archivo o uno de borde dedicado: el HTML de la respuesta
      sin `codigo` correcto no contiene nombre ni direccion en ningun texto
      renderizado, ni siquiera en un atributo oculto.
- [ ] 7.20 GREEN (ajuste de la UI de la pagina si 7.19 encuentra una fuga).
- [ ] 7.21 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

## Phase 8: Rebanada 8 — Exportacion (~160 lineas)

Depende de la Fase 2 (solo necesita los objetos de tabla). Se secuencia al
final por conveniencia de revision, sin dependencia de codigo con las Fases
3-7.

- [ ] 8.1 RED `constancias/composicion.test.ts` (clon de
      `padron/composicion.test.ts` / `territorio/composicion.test.ts`, `tx`
      fabricado a mano, sin Postgres): `porcionDeConstancias` devuelve
      columnas listadas una por una, nunca `select()` pelado; incluye
      `codigoVerificacion` (decision 8 de design.md — el archivo municipal
      tiene que poder reconstruir el documento) pero **no** el `jsonb`
      `datos` completo sin decision explicita de que columnas de el
      exportar.
- [ ] 8.2 GREEN `porcionDeConstancias` en `constancias/composicion.ts`.
- [ ] 8.3 RED verificar que `nombre: "constancias"` no choca con
      `conjuntosDePlataforma`, `padron` ni `territorio`.
- [ ] 8.4 GREEN (ajustar el nombre si hay colision).
- [ ] 8.5 `src/app/exportacion/porciones.ts` (modificar): agregar
      `porcionDeConstancias` al arreglo.
- [ ] 8.6 `docs/06-frontend.md` §9 (modificar): nota del Route Handler de PDF
      como primer precedente de su clase en el repo.
- [ ] 8.7 `docs/architecture/estructura.md` (modificar): agregar `constancias`
      al mapa de modulos.
- [ ] 8.8 `pnpm check` + `pnpm test` en verde.

---

## Trazabilidad de requisitos (26, no 27 — ver nota al inicio)

| Requisito (spec) | Fase(s) |
|---|---|
| Folio consecutivo bajo lock (T6) | 4 |
| Formato del folio, consecutivo sin truncar | 2, 4 |
| Tres identificadores con propiedades opuestas | 2 |
| Snapshot congelado al emitir | 4 |
| Un documento emitido es inmutable | 2 (esquema sin UPDATE salvo cancelacion), 4 |
| Bloqueo sin bloque de firma | 3, 4 |
| Bloqueo sin residencia vigente / persona de baja | 1, 4 |
| Sin periodo minimo de residencia | 4 (UI muestra `desdeEn`) |
| Reimpresion registrada, motivo cerrado | 2, 6 |
| Reimpresion usa version de plantilla grabada | 5, 6 |
| Cancelacion irreversible, `puedeAdministrarDocumentos` | 3, 6 |
| FK compuesto hacia personas, sin FK vivo a domicilio/residencia | 2 |
| Aislamiento de las tablas nuevas | 2 |
| Render de PDF sin persistir binario | 5 |
| Constancias en la exportacion | 8 |
| Caso de uso publico sin ContextoActual | 7 |
| Respuesta de un nivel | 7 |
| Respuesta de dos niveles | 7 |
| Toda respuesta negativa indistinguible | 2 (dominio), 7 |
| El QR nunca apunta al PDF | 5 |
| Limitacion de ritmo obligatoria (validacion) | 7 |
| `puedeAdministrarDocumentos` (autorizacion-roles) | 3 |
| Residencia vigente para consumidores externos | 1 |
| Direccion compuesta como texto imprimible | 1 |
| Limitacion de ritmo sin bloqueo persistente (autenticacion-municipal) | 7 |

## Review Workload Forecast

Conteo propio, por tarea, no copiado de `design.md` §17 — se explica la
metodologia porque el preflight lo pide. Se pondero cada tarea por su tipo
observado en el repo (funcion de dominio + test: 60-100 lineas; adaptador SQL
+ test: 70-110; caso de uso con puertos mockeados + test: 80-130; test de
aislamiento: 90-140, calco de `escudo.isolation.test.ts`/`residencias.isolation.test.ts`;
test de integracion: 50-100; migracion de 3-4 tablas con RLS/FORCE/GRANT/FK a
mano: 180-260; componente de UI + Server Action: 60-140) y se sumo por fase.

| Fase | Contenido | Lineas propias | Lineas de `design.md` §17 | Diferencia |
|---|---|---|---|---|
| 1 | Lecturas nuevas en `territorio` | ~340 | ~330 | +10, converge |
| 2 | Esquema, dominio, 4 aislamientos de `constancias` | ~760 | ~740 | +20, converge — el margen mas ajustado en ambos conteos |
| 3 | Configuracion del bloque de firma | ~270 | ~280 | -10, converge |
| 4 | Emision con folio bajo lock | ~720 | ~700 | +20, converge — segundo margen mas ajustado |
| 5 | Render de PDF | ~500 | ~520 | -20, converge |
| 6 | Reimpresion y cancelacion | ~570 | ~560 | +10, converge |
| 7 | Validacion publica de folio | ~460 | ~470 | -10, converge |
| 8 | Exportacion | ~160 | ~170 | -10, converge |
| **Total** | | **~3.780** | **~3.770** | **+10, sin desacuerdo material** |

**El conteo propio no contradice al de `design.md`**: la diferencia mayor por
fase es ±20 lineas (menos del 3% de cualquier fase), y el total diverge en 10
lineas sobre casi 3.800. Se reporta igual, completo, por instruccion del
preflight — no porque haya una discrepancia que decidir.

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3.780 (340+760+270+720+500+570+460+160), computado por tarea, ver tabla arriba |
| 400-line budget risk | Low para las ocho fases contra el presupuesto real de esta sesion (800 lineas) — ninguna la excede. Las Fases 2 (~760, ~5% de margen) y 4 (~720, ~10% de margen) son las mas ajustadas; las dos ya tienen su corte de emergencia decidido de antemano en el cuerpo de cada fase (dominio puro fuera de la 2; UI de emision fuera de la 4), igual que `design.md` §17 lo dejo escrito para no improvisarlo con el PR abierto |
| Chained PRs recommended | No como cadena de ramas apiladas (`CLAUDE.md`: "Un PR, un merge. Las ramas no se apilan") — **si** como secuencia de PRs independientes contra `main`, en el orden de dependencia real de la seccion "Dependencia real" (1 y 2 en cualquier orden; 3 y 4 despues de 1+2; 5 despues de 4; 7 despues de 4 en paralelo con la compuerta de la 5; 6 despues de 5 y de la compuerta; 8 despues de 2) |
| Suggested split | Las ocho fases de este archivo, cada una un PR propio mergeado a `main` antes de abrir el siguiente en su cadena de dependencia; 7 puede abrirse en paralelo a 5/6 |
| Delivery strategy | `ask-on-risk` (preflight). Ninguna fase individual dispara el umbral de riesgo por tamano (todas bajo 800); la unica decision que si necesita a una persona es de producto, no de tamano: la compuerta de revision visual entre las Fases 5 y 6 |
| Decision needed before apply | **Si, una: quien confirma que la ronda de revision visual con el piloto cerro antes de que `sdd-apply` abra la Fase 6.** No es una decision de presupuesto de lineas — ninguna fase la dispara — es la condicion de producto que `proposal.md` declara no negociable ("la fase no cuenta como vendible hasta que esa ronda cierre") |
