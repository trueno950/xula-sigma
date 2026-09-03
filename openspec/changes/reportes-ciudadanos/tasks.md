# Tasks: Reportes ciudadanos (Fase 3)

**Cambio:** `reportes-ciudadanos` · **Insumos:** `proposal.md` (15 decisiones
numeradas, presupuesto de revision, corte de ocho rebanadas), `design.md` (21
secciones, tres correcciones a la propuesta, DDL exacto, firmas de puertos
`sdd-design/design.md` seccion 21 confirma dependencias), `specs/` (5
archivos). Conteo real de requisitos, `grep -c "^### Requirement:"` sobre los
cinco archivos: 15 en `reportes-ciudadanos`, 5 en `consulta-publica-de-reportes`,
1 cada uno en `autorizacion-roles`, `jerarquia-territorial` y
`autenticacion-municipal` — 23 en total.

**Ninguna decision se reabre.** Este archivo baja `design.md` seccion 21 (el
corte de ocho rebanadas, secuenciales contra `main`, ninguna sobre 800 lineas)
a tareas RED/GREEN. Precedente de formato y granularidad:
`openspec/changes/archive/2026-08-30-constancias-oficios/tasks.md`.

Presupuesto de revision: **800 lineas** por rebanada (`delivery_strategy:
ask-on-risk`, mismo que `constancias-oficios`).

## Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Lectura de ubicacion compuesta en `territorio` (decision 10) | PR 1 | `pnpm test src/modules/territorio/domain -- direccion` + `application -- ubicacionDeLugar` | `pnpm db:local`; `pnpm test:integration -- ubicacionDeLugar` | Revertir PR; aditivo, ninguna lectura existente de `territorio` cambia |
| 2 | Dominio puro de `reportes`: `Folio`, cuatro uniones, transiciones, resolucion de duplicados, proyeccion publica, errores | PR 2 | `pnpm test src/modules/reportes/domain` | N/A — sin base de datos, corre en la suite `unit` | Revertir PR; el modulo `reportes` todavia no existe en ningun otro lado |
| 3 | Esquema y aislamiento: tres tablas, `FORCE`/`GRANT`, tres FK a mano, tres tests de aislamiento | PR 3 | `pnpm test:integration -- isolation` (reportes) | `pnpm db:local`, nativo sin `rtk` | Revertir PR y bajar `drizzle/0010_reportes.sql`; las tres tablas nacen vacias |
| 4 | Puertos de lectura cruzados + `registrarReporte` con folio bajo lock, T6/T7 | PR 4 | `pnpm test src/modules/reportes/application -- registrarReporte` | `pnpm db:local`; `pnpm test:integration -- folio registro` | Revertir `application/{puertos,puertosDeLectura,registrarReporte,reportePorId,listarReportes}.ts`+adaptadores; esquema de PR3 intacto, `reportes` queda vacia |
| **Compuerta de producto** | Revisar el catalogo de seis valores de `AreaResponsable` con el municipio piloto. **No es una tarea de codigo y ningun agente puede cerrarla** | — | — | — | — |
| 5 | Estados, asignacion, vinculo de duplicado, `puedeAdministrarReportes` | PR 5 | `pnpm test src/modules/reportes/application -- cambiarEstadoDeReporte asignarAreaDeReporte` + `shared/auth/roles.test.ts` | `pnpm db:local`; `pnpm test:integration -- duplicados` | Revertir `application/{cambiarEstadoDeReporte,asignarAreaDeReporte}.ts`; los reportes quedan en `RECIBIDO`, sin transicion posible hasta re-mergear |
| 6 | Consulta publica: ruta sin sesion, salto al original, ritmo | PR 6 | `pnpm test src/modules/reportes/application -- consultarFolioDeReporte` | `pnpm db:local`; `pnpm test:integration -- ritmo` | Quitar `src/app/reportes/[folio]/page.tsx` sin tocar la base — el folio sigue existiendo en el panel, solo se pierde la consulta sola |
| 7 | Buscador de similares y UI de mostrador | PR 7 | `pnpm test src/modules/reportes/application -- buscarReportesSimilares` | `pnpm db:local`; Playwright manual sobre el alta | Revertir `application/buscarReportesSimilares.ts`+`ui/`+rutas `(panel)/reportes`; PR 1-6 siguen funcionando por API |
| 8 | Exportacion: `PorcionExportable` de `reportes` | PR 8 | `pnpm test -- composicion` | N/A — cubre su propio test de composicion | Revertir `porcionesDeReportes`/`porciones.ts`; exportacion de otros modulos intacta |

### Dependencia real

- **1** y **2** son independientes entre si y de todo lo demas. Solo la **4**
  los necesita.
- **3** es independiente de 1 y 2. Es la base de esquema para **4** (y por
  cadena, 5, 6, 7).
- **4 depende de 1, 2 y 3** (`design.md` seccion 1: los puertos de lectura
  cruzada, el dominio puro y las tablas tienen que existir).
- **La compuerta de producto** (catalogo de `AreaResponsable` contra el
  organigrama del piloto) va **antes de la 5**, no es negociable por tamano.
- **5 depende de 4** y de la compuerta.
- **6 depende de 4 y de 5**: `consultarFolioDeReporte` tiene una rama que solo
  se puede probar contra filas con `duplicado_de_reporte_id` escrito, y lo
  unico que lo escribe es `cambiarEstadoDeReporte` (5).
- **7 depende de 4**: el buscador de similares es un puerto de lectura sobre
  `reportes`, y la UI de alta necesita `registrarReporte` (4) para el `<form>`.
  No depende de 5 ni de 6: el listado y el detalle muestran lo que 4 ya
  produce, y las acciones de transicion de la UI llaman a casos de uso de 5
  que pueden mergearse despues sin romper 7 — se secuencia despues de 5 y 6
  por conveniencia de una sola cadena a `main`, no por un import que lo exija.
- **8 depende de 3** (solo necesita los objetos de tabla) y se secuencia al
  final por conveniencia.

Orden de PR sugerido: 1 y 2 en cualquier orden → 3 → 4 → [compuerta] → 5 → 6 →
7 → 8.

---

## Phase 1: Rebanada 1 — Lectura de ubicacion en `territorio` (~340 lineas)

Independiente. La necesita solo la Fase 4. Va primera porque es un cambio en
otro modulo y su diff se lee mejor solo (`proposal.md`, `design.md` seccion 9).
Requisito: `jerarquia-territorial` — "Ubicacion compuesta como texto para un
reporte ciudadano".

- [x] 1.1 RED `territorio/domain/direccion.test.ts` (modificar — el archivo
      existe con `componerDireccion`): `componerUbicacion` con `calle: null` y
      un ancestro -> solo el ancestro, sin `"S/N"` en ningun caso; con calle y
      cuatro ancestros -> todos presentes, del mas profundo al mas
      superficial, mismo orden que `PartesDeDireccion`; sin calle ni
      ancestros -> cadena vacia sin separadores huerfanos.
- [x] 1.2 GREEN `territorio/domain/direccion.ts`: agregar `PartesDeUbicacion`
      y `componerUbicacion`, sin tocar `componerDireccion` — funcion nueva y
      no reuso, `design.md` seccion 9 (`PartesDeDireccion` exige `calle:
      string` no nula y produce `"S/N"`, que no aplica a un bache).
- [x] 1.3 `territorio/application/puertosDeDirecciones.ts` (modificar):
      agregar `LectorDeUbicaciones.partesDe(tx, lugarId, calleId):
      Promise<PartesDeUbicacion | null>` — **con `tx`**, vive dentro del
      propio modulo.
- [x] 1.4 RED `territorio/infrastructure/lectorDeUbicacionesSql.test.ts`:
      `WITH RECURSIVE` hacia arriba por `padreId` desde `lugarId` (mismo
      cinturon `profundidad < 8` y `baja_en IS NULL` que
      `lectorDeDireccionesSql.ts`), cero filas -> `null`; segunda consulta
      **con el builder de Drizzle** `SELECT nombre FROM calles WHERE id =
      $1` solo si `calleId !== null`, cero filas -> `null`; **sin
      `LEFT JOIN`** (verificar que "no se pidio calle" y "la calle no existe"
      producen resultados distintos, no el mismo `null` de una sola consulta
      — es la diferencia que decide `UbicacionInvalidaError` en la Fase 4).
- [x] 1.5 GREEN `territorio/infrastructure/lectorDeUbicacionesSql.ts`: las dos
      consultas dentro del mismo `tx`.
- [x] 1.6 RED `territorio/application/ubicacionDeLugar.test.ts` (puerto
      mockeado): `partesDe` devuelve `null` -> `null`, sin lanzar; camino
      feliz -> `{ texto: componerUbicacion(partes) }`.
- [x] 1.7 GREEN `territorio/application/ubicacionDeLugar.ts`: `withTenant`
      alrededor de la lectura, devuelve `null` y no lanza (mismo criterio que
      `personaPorId`).
- [x] 1.8 `territorio/index.ts` (modificar): la linea de exports pasa de
      `{ comoLugarId, type LugarId }` a `{ comoCalleId, comoLugarId, type
      CalleId, type LugarId }`.
- [x] 1.9 RED `territorio/superficiePublica.test.ts` (modificar): assertion de
      que el barrel exporta `comoCalleId`/`CalleId` y `ubicacionDeLugar` como
      valor, sin exponer ningun objeto de tabla.
- [x] 1.10 GREEN + `territorio/{composicion.ts,application/index.ts,
      infrastructure/index.ts}`: componer y exportar `ubicacionDeLugar`, sin
      guarda de rol propia — la autorizacion la decide el consumidor
      (`reportes`), mismo criterio que `personaPorId`.
- [x] 1.11 RED `territorio/ubicacionDeLugar.integration.test.ts`: `lugarId` de
      otro tenant -> `null`; `calleId` de otro tenant -> `null` **y distinto**
      del caso "sin calle" (verifica el punto 1.4); lugar dado de baja ->
      `null`; registrar el texto, reparentear la colonia del lugar, releer ->
      el texto **cambia** (comportamiento vivo, al reves que una constancia
      congelada — `design.md` seccion 9).
- [x] 1.12 GREEN (ajustar CTE/`SELECT` de 1.5 si algun caso de 1.11 no calza).
- [x] 1.13 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

## Phase 2: Rebanada 2 — Dominio puro de `reportes` (~420 lineas)

Independiente de la Fase 1. Sin base de datos: corre en la suite `unit` en
milisegundos. Es la rebanada que la propuesta corto aparte de proposito
(presupuesto de revision, `proposal.md`) para no juntar tenancy con reglas sin
IO. Requisitos: `Clasificacion por tipo de incidencia, union cerrada`, `Area
responsable cerrada`, `Transiciones de estado cerradas, terminales sin
reapertura`, `Motivo de rechazo cerrado; DUPLICADO exige el vinculo al
original`, `Un duplicado apunta siempre a un reporte que no es duplicado`, `Un
folio duplicado responde el estado del original y la fecha de registro
propia`, `Toda respuesta negativa es indistinguible`.

- [x] 2.1 RED `reportes/domain/identificadores.test.ts`: `comoReporteId` y
      `comoMovimientoId` rechazan no-UUID y aceptan UUID valido.
- [x] 2.2 GREEN `reportes/domain/identificadores.ts` (`Identificador<N>` +
      `PATRON_UUID` propio — noveno y decimo lugar del mismo regex,
      `design.md` seccion 3, no se corrige aca).
- [x] 2.3 RED `reportes/domain/tipoDeIncidencia.test.ts`: `TIPOS_DE_INCIDENCIA`
      = `["BACHE","ALUMBRADO","FUGA","BASURA","PARQUE","OTRO"]`, recorriendo
      la union entera (forma de tabla de `roles.test.ts`).
- [x] 2.4 GREEN `reportes/domain/tipoDeIncidencia.ts`.
- [x] 2.5 RED `reportes/domain/areaResponsable.test.ts`: `AREAS_RESPONSABLES`
      con los seis valores de decision 3, recorriendo la union entera.
- [x] 2.6 GREEN `reportes/domain/areaResponsable.ts`.
- [x] 2.7 RED `reportes/domain/motivos.test.ts`: `MOTIVOS_DE_RECHAZO` =
      `["DUPLICADO","FUERA_DE_COMPETENCIA","INFORMACION_INSUFICIENTE"]`, **sin
      `OTRO`**.
- [x] 2.8 GREEN `reportes/domain/motivos.ts`.
- [x] 2.9 RED `reportes/domain/estado.test.ts`: `transicionValida` como tabla
      de 16 pares recorriendo `ESTADOS_DE_REPORTE x ESTADOS_DE_REPORTE`, para
      que un estado nuevo **falte** en vez de heredar sin transiciones;
      **`RECIBIDO -> RESUELTO` directo es valido**; `esTerminal` en los
      cuatro estados.
- [x] 2.10 GREEN `reportes/domain/estado.ts`: `TRANSICIONES` como
      `Record<EstadoDeReporte, readonly EstadoDeReporte[]>`, `transicionValida`,
      `esTerminal`.
- [x] 2.11 RED `reportes/domain/folio.test.ts`: `Folio.crear(anio,
      consecutivo)` produce `"REP-2026-000123"`; consecutivo `1_000_001` con
      siete digitos y `padStart` que **no trunca**; consecutivo `0` o no
      entero se rechaza. Prefijo **no** es parametro (una sola serie,
      `design.md` seccion 4).
- [x] 2.12 GREEN `reportes/domain/folio.ts`.
- [x] 2.13 `reportes/domain/errores.ts`: `TransicionInvalidaError`,
      `ReporteCerradoError`, `UbicacionInvalidaError`,
      `DuplicadoSinOriginalError`, `DuplicadoDeSiMismoError`,
      `ReportanteDadoDeBajaError` — clase, `codigo` estable, `name`, sin
      logica adentro. `DuplicadoDeSiMismoError` es la adicion de `design.md`
      seccion 7 sobre los cuatro que enumera la propuesta.
- [x] 2.14 RED `reportes/domain/duplicado.test.ts`: `originalDe` con
      `duplicadoDeReporteId` nulo -> el propio id; con vinculo -> el vinculo,
      **no** el propio id; `vincularDuplicado(x, {id: x, ...})` ->
      `DuplicadoDeSiMismoError`; `vincularDuplicado(c, {id: b,
      duplicadoDeReporteId: a})` -> `a`, **no** `b` (duplicado de un duplicado
      guarda el original de la cadena); `vincularDuplicado(a, {id: b,
      duplicadoDeReporteId: a})` -> `DuplicadoDeSiMismoError` (ciclo de largo
      2 que la aplicacion si puede detectar).
- [x] 2.15 GREEN `reportes/domain/duplicado.ts`: `CandidatoAOriginal`,
      `originalDe`, `vincularDuplicado` — sin `while`, sin `for`, sin
      recursion (`design.md` seccion 8: total, un solo salto).
- [x] 2.16 RED `reportes/domain/consulta.test.ts`: `proyectarConsulta` con
      `toBe(SIN_REGISTRO)` — **identidad, no forma** — en `consultado ===
      null`; sin salto (`original === null`) -> `tipo`/`estado`/fechas del
      consultado; con salto -> `tipo` **y `registradoEn` del consultado**,
      `estado` y `actualizadoEn` del original (`registradoEn` responde "cuando
      avise yo", hecho del consultado; `estado` responde "van a taparla", hecho
      del original — `design.md` seccion 14); `original ?? consultado` como
      degradacion cuando hay vinculo pero la fila del original no llega (rama
      inalcanzable por el FK compuesto, se prueba igual).
- [x] 2.17 GREEN `reportes/domain/consulta.ts`: `ConsultaDeReporte` union sin
      `folio`, sin `descripcion`, sin `referencia`, sin `areaResponsable`, sin
      dato del reportante y **sin campo que diga que es duplicado**; `const
      SIN_REGISTRO = Object.freeze({ resultado: "SIN_REGISTRO" } as const)`;
      `proyectarConsulta`.
- [x] 2.18 `reportes/domain/index.ts`: barrel, reexport nombrado.
- [x] 2.19 `reportes/{index,types}.ts`: esqueleto minimo del modulo, mismo
      patron que `padron`/`marca`/`territorio`.
- [x] 2.20 `pnpm check` + `pnpm test` en verde; confirmar que la suite corre
      sin Postgres.

## Phase 3: Rebanada 3 — Esquema y aislamiento (~510 lineas)

Independiente de 1 y 2. Base de esquema para la Fase 4 y, por cadena, para 5,
6, 7 y 8. **No se parte por tabla**: un estado intermedio donde `reportes`
existe sin sus FK compuestos es el bypass entre municipios que este cambio
existe para cerrar (`design.md` seccion 21, mismo criterio que
`capa-territorial` seccion 17). Requisito: `Aislamiento por ayuntamiento de
las tres tablas nuevas`.

- [x] 3.1 `reportes/infrastructure/esquema.ts`: tabla `reportes` completa —
      columnas de `design.md` seccion 5, `index("reportes_tenant_idx")`,
      `unique("reportes_id_tenant_key").on(id, ayuntamientoId)`,
      `uniqueIndex("reportes_tenant_folio_idx")`,
      `uniqueIndex("reportes_serie_idx")`,
      `index("reportes_duplicado_idx")`, `index("reportes_similares_idx")`;
      `foreignKey()` de Drizzle para `registradoPorUsuarioId -> usuarios(id,
      ayuntamientoId)` y para `duplicadoDeReporteId -> reportes(id,
      ayuntamientoId)` **autorreferencial** (precedente
      `lugares_padre_tenant_fk`, `design.md` seccion 6 — corrige la propuesta:
      este FK **no** va a mano); CHECKs `reportes_tipo_valido`,
      `reportes_estado_valido`, `reportes_area_valida`,
      `reportes_motivo_valido`, `reportes_rechazo_completo`,
      `reportes_duplicado_con_motivo` **con `IS NOT DISTINCT FROM`, nunca
      `=`** (correccion de `design.md` seccion 5: con `=`, `motivo_de_rechazo
      = 'DUPLICADO'` sobre un motivo nulo evalua `NULL` y el CHECK pasa en
      verde dejando entrar la fila que existe para rechazar),
      `reportes_sin_autoduplicado`, `reportes_consecutivo_positivo`;
      `politicaTenant("reportes")`.
- [x] 3.2 `reportes/infrastructure/esquema.ts`: tabla `folios_de_reportes` —
      PK compuesta `(ayuntamientoId, anio)`, **sin columna `id` sustituta y
      sin indice de tenant** (la identidad del contador es la tupla,
      `design.md` seccion 4), `check("folios_de_reportes_consecutivo_positivo",
      ...)`, `politicaTenant("folios_de_reportes")`.
- [x] 3.3 `reportes/infrastructure/esquema.ts`: tabla `movimientos_de_reportes`
      — `foreignKey()` de Drizzle hacia `reportes(id, ayuntamientoId)` y hacia
      `usuarios(id, ayuntamientoId)`; CHECKs `movimientos_estado_anterior_valido`,
      `movimientos_estado_nuevo_valido`, `movimientos_area_valida`,
      `movimientos_motivo_valido`, `movimientos_no_vacio` (`estado_nuevo IS
      NOT NULL OR area_asignada IS NOT NULL`),
      `movimientos_motivo_solo_en_rechazo` (`IS NOT DISTINCT FROM`);
      `index("movimientos_de_reportes_tenant_idx")`,
      `index("movimientos_de_reportes_reporte_idx")`;
      `politicaTenant("movimientos_de_reportes")`.
- [x] 3.4 `reportes/infrastructure/index.ts`: barrel sin reexportar ningun
      objeto de tabla.
- [x] 3.5 RED `reportes/superficiePublica.test.ts`: el barrel del modulo no
      expone ningun objeto de tabla Drizzle — provocar el rojo exportando
      `reportes` (la tabla) temporalmente, confirmar el fallo, retirarlo.
- [x] 3.6 GREEN, test en verde.
- [x] 3.7 `drizzle/0010_reportes.sql`: generar con `drizzle-kit generate`; en
      la cola, a mano, en el **mismo archivo** (ADR 0001 seccion 2): `FORCE
      ROW LEVEL SECURITY` para las tres tablas; `GRANT SELECT, INSERT, UPDATE`
      en `reportes` y `folios_de_reportes`, `GRANT SELECT, INSERT` **sin
      `UPDATE` y sin `DELETE`** en `movimientos_de_reportes`; los **tres** FK
      compuestos a mano — `reportes_lugar_tenant_fk` hacia
      `lugares(id, ayuntamiento_id)`, `reportes_calle_tenant_fk` hacia
      `calles(id, ayuntamiento_id)`, `reportes_persona_tenant_fk` hacia
      `personas(id, ayuntamiento_id)` — con el mismo comentario de advertencia
      contra `drizzle-kit push` que `drizzle/0008_constancias.sql:72-124` y
      `drizzle/0007_territorio.sql:103-125` (apuntar, no repetir).
- [x] 3.8 RED `reportes/reportes.isolation.test.ts`: sin filtro en Motul solo
      devuelve reportes de Motul (T1); `lugarId`/`calleId`/`personaId` de
      Ticul insertados desde Motul rechazados por sus FK compuestos; un
      `duplicadoDeReporteId` de Ticul insertado desde Motul rechazado por
      `reportes_duplicado_tenant_fk`; `duplicado_de_reporte_id = id` rechazado
      por `reportes_sin_autoduplicado`; `estado = 'RECHAZADO'` sin
      `motivo_de_rechazo` rechazado por `reportes_rechazo_completo`;
      `motivo_de_rechazo` nulo **con** `duplicado_de_reporte_id` presente
      rechazado por `reportes_duplicado_con_motivo` — **el caso exacto que
      `=` en vez de `IS NOT DISTINCT FROM` dejaria pasar**.
- [x] 3.9 GREEN (ajustar esquema de 3.1 si algo falla).
- [x] 3.10 RED `reportes/foliosDeReportes.isolation.test.ts`: sin filtro en
      Motul solo devuelve la fila de contador de Motul; dos filas para el
      mismo `(ayuntamientoId, anio)` imposibles por la PK.
- [x] 3.11 GREEN.
- [x] 3.12 RED `reportes/movimientosDeReportes.isolation.test.ts`: sin filtro
      en Motul solo devuelve movimientos de Motul; un `reporteId` de Ticul
      insertado desde Motul rechazado por su FK compuesto; intentar un
      `UPDATE` sobre una fila propia **espera error de permiso**, no lee el
      `.sql` (mismo mecanismo que `bitacora`).
- [x] 3.13 GREEN.
- [x] 3.14 Verificar (no asumir) que `identidadPorPuerto.test.ts` sigue en
      verde con `reportes/infrastructure/esquema.ts` presente: `personaId`
      existe como columna `persona_id`, y ninguna plantilla `` sql`...` `` de
      `reportes` nombra `persona_id` ni `personas` (`design.md` seccion 5).
- [x] 3.15 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde;
      `pnpm reglas` confirma `ENABLE`, `FORCE`, politica y `GRANT` de las tres
      tablas nuevas.

## Phase 4: Rebanada 4 — Puertos de lectura + `registrarReporte` (~700 lineas)

Depende de las Fases 1, 2 y 3. Margen mas ajustado del corte: si hace falta
partir, **el corte de emergencia sale por la UI, no por el contador**
(`design.md` seccion 21) — pero la Fase 4 de este archivo ya no lleva UI
(va en la Fase 7), asi que no aplica un corte adicional aca. Requisitos:
`Folio consecutivo por (ayuntamiento, anio) bajo lock en transaccion`, `Un
reporte no es un documento inmutable`, `Ubicacion por lugar obligatorio, calle
opcional, sin domicilio`, `Las dos cajas de texto libre del modulo, con las
mismas protecciones`, `Vinculo opcional con una persona del padron, sin datos
de contacto sueltos`, `Registrar es mostrador; cambiar estado y asignar area
son estructura`, `Historial de movimientos de solo agregado`.

- [x] 4.1 `reportes/application/puertos.ts`: `DatosDeRegistroDeReporte`,
      `ReporteGuardado`, `CandidatoAOriginal`, `FilaParaConsultaPublica`,
      `ReporteSimilar`, `RepositorioDeReportes` completo (`guardar`,
      `buscarPorId`, `candidatoAOriginal`, `aplicarTransicion`, `asignarArea`,
      `listar`, `similaresAbiertos`, `contarDuplicadosDe`,
      `paraConsultaPublica`, `paraConsultaPublicaPorId`), `ContadorDeFolios`,
      `DatosDeMovimiento`, `RegistroDeMovimientos` (`agregar`, `historialDe`)
      — firmas exactas de `design.md` seccion 10. El contrato completo se
      declara aca aunque `cambiarEstadoDeReporte`/`buscarReportesSimilares`
      (Fases 5 y 7) sean quienes invoquen algunos metodos.
- [x] 4.2 `reportes/application/puertosDeLectura.ts`: `LecturaDeUbicaciones.de(
      lugarId, calleId)`, `LecturaDeReportantes.porId(personaId)` — **sin
      `tx`**, calco de `LecturaDeTitulares`.
- [x] 4.3 RED `reportes/application/validacionDeReporte.test.ts`: Zod para el
      alta — `descripcion` 10..1000 obligatoria, `referencia` 0..200
      opcional, `tipo` union cerrada, `lugarId` UUID, `calleId` UUID opcional,
      `personaId` UUID opcional.
- [x] 4.4 GREEN `reportes/application/validacionDeReporte.ts` (Zod en
      `application`, no en `domain`).
- [x] 4.5 RED `reportes/infrastructure/contadorDeFoliosSql.test.ts`: la
      sentencia exacta `INSERT ... ON CONFLICT (ayuntamiento_id, anio) DO
      UPDATE SET ultimo_consecutivo = folios_de_reportes.ultimo_consecutivo +
      1 RETURNING ultimo_consecutivo`; primera llamada de una serie nueva ->
      `1`; segunda -> `2`.
- [x] 4.6 GREEN `reportes/infrastructure/contadorDeFoliosSql.ts` (builder de
      Drizzle, `.onConflictDoUpdate`, no `sql` a mano).
- [x] 4.7 `reportes/infrastructure/repositorioDeReportesSql.ts`: `guardar`,
      `buscarPorId`, `listar` (los tres que esta rebanada necesita; el resto
      del contrato de 4.1 se completa en las Fases 5 y 7 sobre este mismo
      archivo).
- [x] 4.8 `reportes/infrastructure/registroDeMovimientosSql.ts`: `agregar`,
      `historialDe` — ordena por `ocurridoEn ASC`, parte del contrato.
- [x] 4.9 `reportes/infrastructure/lectorDeUbicacionesPorTerritorio.ts`: llama
      `territorio.ubicacionDeLugar` por el barrel, convierte a `string` en el
      borde con `comoLugarId`/`comoCalleId` justo antes de invocar.
- [x] 4.10 `reportes/infrastructure/lectorDeReportantesPorPadron.ts`: llama
      `padron.personaPorId` por el barrel, calco de
      `lectorDeTitularesPorPadron.ts`.
- [x] 4.11 RED `reportes/application/registrarReporte.test.ts` (puertos
      mockeados) — la bateria de orden: `puedeEscribir(rol)` falso ->
      `NoAutorizadoError` **antes** de llamar cualquier puerto; `lecturaDeUbicaciones.de`
      -> `null` -> `UbicacionInvalidaError`, **sin abrir `withTenant`**
      (`invocationCallOrder`); `personaId === null` -> `lecturaDeReportantes`
      **nunca** se invoca; `personaId` presente y `lecturaDeReportantes.porId`
      -> `null` -> `NoEncontradoError`; `bajaEn !== null` ->
      `ReportanteDadoDeBajaError`; **los rechazos de ubicacion y reportante
      nunca llegan a invocar `contador.siguiente`** (mock sin llamadas);
      camino feliz -> `guardar` recibe `estado: "RECIBIDO"`, `areaResponsable:
      null`; `movimientos.agregar` recibe `estadoAnterior: null, estadoNuevo:
      "RECIBIDO"` (la fila del alta, `design.md` seccion 11); `registrar`
      recibe `REGISTRAR_REPORTE` con solo ids; todo en la misma llamada a
      `withTenant`.
- [x] 4.12 GREEN `reportes/application/registrarReporte.ts`: orden exacto de
      `design.md` seccion 11 — pasos 2 (ubicacion) y 3 (reportante) fuera de
      toda transaccion; paso 4 (contador, `Folio.crear`, `guardar`,
      `movimientos.agregar`, `registrar`) en un solo `withTenant`.
- [x] 4.13 RED `reportes/application/reportePorId.test.ts`: id inexistente o
      de otro tenant -> `null`, nunca lanza; sin guarda de rol.
- [x] 4.14 GREEN `reportes/application/reportePorId.ts`.
- [x] 4.15 RED `reportes/application/listarReportes.test.ts`: sin guarda de
      rol; filtros pasan tal cual al repositorio.
- [x] 4.16 GREEN `reportes/application/listarReportes.ts`.
- [x] 4.17 `reportes/composicion.ts` + `application/index.ts`: componer
      `registrarReporte`, `reportePorId`, `listarReportes` con sus
      adaptadores de 4.9/4.10.
- [x] 4.18 RED `reportes/folio.integration.test.ts` — **T6, la prueba mas
      critica**: `enTransaccionParalela` toma el folio de `(motul, anio)` y no
      confirma; `registrarReporte` disparado en paralelo (Postgres real, no
      las dos conexiones de `DB_POOL_MAX=1`) **queda pendiente**
      (`Promise.race` contra un temporizador corto); la paralela hace
      `COMMIT`; el registro resuelve con el consecutivo siguiente.
- [x] 4.19 GREEN.
- [x] 4.20 RED mismo archivo — **T7**: `crearRegistrarReporte` compuesto con
      un `RepositorioDeReportes` cuyo `guardar` lanza; el registro falla
      **despues** de tomar folio; el siguiente registro exitoso obtiene **el
      mismo numero** — el rollback no consume folio.
- [x] 4.21 GREEN.
- [x] 4.22 RED mismo archivo: Motul y Ticul registran su primer reporte del
      anio, ambos obtienen `REP-{anio}-000001` sin colisionar (`{anio}` de
      `anioEnMerida()`, no fijo); se siembra `(motul, anio-1)` con
      `ultimoConsecutivo` alto y la primera del anio actual arranca en `1`.
- [x] 4.23 GREEN.
- [x] 4.24 RED `reportes/registro.integration.test.ts`: registrar con persona
      del padron -> vinculado; registrar con `personaId` nulo -> anonimo, sin
      nombre/telefono/correo en ninguna columna (decision 11); un `lugarId` o
      `calleId` de otro municipio rechazado con `UbicacionInvalidaError`
      **no** con un `23503` crudo de Postgres, y ademas rechazado por el FK
      compuesto a nivel base si se fuerza con SQL directo.
- [x] 4.25 GREEN.
- [x] 4.26 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde;
      confirmar piso 80/75 sobre `modules/reportes/{domain,application}`.

---

**Compuerta de producto — no es una tarea de codigo, es una condicion de
avance.** Revisar el catalogo de seis valores de `AreaResponsable` (decision 3)
con el organigrama real del municipio piloto: `OBRAS_PUBLICAS`,
`ALUMBRADO_PUBLICO`, `AGUA_POTABLE_Y_DRENAJE`, `LIMPIA_Y_RECOLECCION`,
`PARQUES_Y_JARDINES`, `SERVICIOS_GENERALES`. **Ningun agente puede cerrarla.**
`areaResponsable` ya es nullable, asi que un reporte nunca se traba por no
tener area mientras la revision esta pendiente (`proposal.md`, tabla de
riesgos). La Fase 5 no arranca hasta que esta ronda cierre.

---

## Phase 5: Rebanada 5 — Estados, asignacion y vinculo de duplicado (~540 lineas)

Depende de la Fase 4 y de la compuerta de producto. Requisitos: `Un reporte no
es un documento inmutable`, `Area responsable cerrada, asignada despues del
registro`, `Transiciones de estado cerradas, terminales sin reapertura`,
`Registrar es mostrador; cambiar estado y asignar area son estructura`,
`Motivo de rechazo cerrado; DUPLICADO exige el vinculo al original`, `Un
duplicado apunta siempre a un reporte que no es duplicado`, `Historial de
movimientos de solo agregado`, `Regla de autorizacion para administrar
reportes ciudadanos`.

- [x] 5.1 RED `shared/auth/roles.test.ts` (modificar): fila para
      `puedeAdministrarReportes` — `ADMIN_MUNICIPAL` si, `OPERADOR` /
      `CONSULTA` / `SUPER_ADMIN` no, recorriendo `ROLES` (mismo patron que
      `puedeAdministrarTerritorio`/`puedeAdministrarDocumentos`).
- [x] 5.2 GREEN `shared/auth/roles.ts`: `puedeAdministrarReportes = (rol) =>
      rol === "ADMIN_MUNICIPAL"`, junto a las otras reglas restringidas.
- [x] 5.3 `reportes/infrastructure/repositorioDeReportesSql.ts` (modificar):
      completar `candidatoAOriginal` (`SELECT id, duplicado_de_reporte_id`),
      `aplicarTransicion` (`UPDATE ... WHERE estado = $anterior RETURNING id`
      — el control de concurrencia, `design.md` seccion 12), `asignarArea`
      (mismo esqueleto de `UPDATE` condicionado).
- [x] 5.4 RED `reportes/application/cambiarEstadoDeReporte.test.ts` (puertos
      mockeados): `puedeAdministrarReportes(rol)` falso ->
      `NoAutorizadoError` **antes** de abrir `withTenant`; `buscarPorId` ->
      `null` -> `NoEncontradoError`; `esTerminal(actual.estado)` ->
      `ReporteCerradoError`; `!transicionValida` -> `TransicionInvalidaError`;
      `nuevo === "RECHAZADO"` sin `motivoDeRechazo` -> `ValidacionError`;
      `motivoDeRechazo` presente con `nuevo !== "RECHAZADO"` ->
      `ValidacionError`; `motivoDeRechazo === "DUPLICADO"` sin `duplicadoDe`
      -> `DuplicadoSinOriginalError`; `duplicadoDe` presente con otro motivo
      -> `DuplicadoSinOriginalError`; `candidatoAOriginal` invocado **dentro**
      del `withTenant` (`invocationCallOrder` — protege contra la ventana de
      concurrencia de `design.md` seccion 12); `candidatoAOriginal` -> `null`
      -> `NoEncontradoError`; `vincularDuplicado` con `original === id` ->
      `DuplicadoDeSiMismoError`; `aplicarTransicion` -> `false` ->
      `NoEncontradoError` (cero filas: otra transaccion ya movio el reporte);
      camino feliz -> `movimientos.agregar` con `estadoAnterior`/`estadoNuevo`
      correctos y `registrar(CAMBIAR_ESTADO_REPORTE)` en la misma llamada.
- [x] 5.5 GREEN `reportes/application/cambiarEstadoDeReporte.ts`: orden exacto
      de `design.md` seccion 12 (sin caso de uso "marcar duplicado" — el
      vinculo es un parametro mas de la transicion).
- [x] 5.6 RED `reportes/application/asignarAreaDeReporte.test.ts`:
      `puedeAdministrarReportes` falso -> `NoAutorizadoError`; `buscarPorId`
      -> `null` -> `NoEncontradoError`; `esTerminal` -> `ReporteCerradoError`;
      `asignarArea` -> `false` -> `NoEncontradoError`; camino feliz ->
      `movimientos.agregar` con `estadoAnterior: null, estadoNuevo: null,
      areaAsignada` presente; `registrar(ASIGNAR_AREA_REPORTE)`.
- [x] 5.7 GREEN `reportes/application/asignarAreaDeReporte.ts`.
- [x] 5.8 `reportes/composicion.ts` (modificar) + `application/index.ts`:
      componer `cambiarEstadoDeReporte`, `asignarAreaDeReporte`.
- [x] 5.9 RED `reportes/duplicados.integration.test.ts`: marcar C duplicado de
      B (que ya es duplicado de A) guarda `C -> A` (cadena resuelta antes de
      guardar); rechazar con motivo `DUPLICADO` sin id del original falla con
      `DuplicadoSinOriginalError` **y no se escribe ni estado, ni vinculo, ni
      movimiento** (atomicidad de la transaccion); un `duplicadoDeReporteId`
      de otro municipio rechazado por `reportes_duplicado_tenant_fk` a nivel
      base si se fuerza con SQL directo.
- [x] 5.10 RED mismo archivo — **ciclo por SQL crudo**: `UPDATE` directo que
      arma `A -> B` y `B -> A`; marcar C duplicado de A resuelve con **dos**
      consultas (`candidatoAOriginal` + la resolucion pura) y guarda un
      estado equivocado, visible y acotado — **nunca un bucle** (`design.md`
      seccion 8, tabla de comportamiento).
- [x] 5.11 RED mismo archivo — **atomicidad**: un `registroDeMovimientos.agregar`
      que lanza deja el `estado` del reporte **sin cambiar** (rollback de la
      transaccion completa).
- [x] 5.12 GREEN (ajustar 5.3/5.5 si algun caso de 5.9-5.11 no calza).
- [x] 5.13 RED mismo archivo: `contarDuplicadosDe` es una consulta directa
      sobre `reportes_duplicado_idx`, sin recorrer la tabla (verificar plan
      de consulta o conteo de filas leidas, criterio de exito de
      `proposal.md`).
- [x] 5.14 GREEN.
- [x] 5.15 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

## Phase 6: Rebanada 6 — Consulta publica (~380 lineas)

Depende de las Fases 4 y 5 (la rama del salto solo se prueba contra filas con
`duplicado_de_reporte_id` escrito, y solo la Fase 5 lo escribe). Requisitos:
`Caso de uso publico con firma propia, sin ContextoActual`, `Respuesta minima
sin ningun dato personal`, `Un folio duplicado responde el estado del original
y la fecha de registro propia`, `Toda respuesta negativa es indistinguible`,
`Limitacion de ritmo por IP, nunca por folio`, `Limitacion de ritmo sin
bloqueo persistente`.

- [x] 6.1 RED `reportes/application/consultarFolioDeReporte.test.ts`:
      `paraConsultaPublica` -> `null` -> `proyectarConsulta(null, null)` ===
      `SIN_REGISTRO` (`toBe`, identidad); consultado sin
      `duplicadoDeReporteId` -> **una sola** llamada al repositorio,
      `paraConsultaPublicaPorId` nunca invocado; consultado con
      `duplicadoDeReporteId` -> **exactamente dos** llamadas; camino feliz sin
      salto -> `tipo`/`estado`/fechas del propio consultado; camino feliz con
      salto -> `tipo` del consultado, `estado` y `actualizadoEn` del original,
      `registradoEn` **siempre** el del consultado, nunca el del original.
- [x] 6.2 GREEN `reportes/application/consultarFolioDeReporte.ts`:
      `crearConsultarFolioDeReporte(repositorio)`, firma propia sin
      `ContextoActual`, sin `usuario`, sin `codigo` — segunda vez que el repo
      la necesita (`validarFolio` es la primera).
- [x] 6.3 RED `src/app/reportes/[folio]/ritmo.test.ts` (nombre de archivo
      corregido durante el apply: el limitador vive en el borde de la ruta y
      no adentro del caso de uso —design.md seccion 14, "El limitador vive
      en el borde y no adentro del caso de uso"—, y el unico precedente en
      el repo, `validarFolio.ritmo.test.ts`, tampoco vive en
      `constancias/application/`, vive junto a su `page.tsx`):
      `invocationCallOrder` confirma que `limitarRitmo` corre **antes** que el
      caso de uso; `RitmoExcedidoError` responde 429 **sin haber consultado
      nada**.
- [x] 6.4 GREEN: wiring del limitador en el borde de la ruta —
      `limitarRitmo(ayuntamientoId, [{ tipo: "folio", valor: ip }])`, mismo
      `TipoIntento` que `validarFolio`, sin valor nuevo y sin migracion del
      CHECK (decision del usuario).
- [x] 6.5 RED test de borde de `src/app/reportes/[folio]/page.tsx` (`vi.mock`
      del caso de uso): `CABECERA_SUPERFICIE !== "ayuntamiento"` ->
      `notFound()` sin invocar el caso de uso; **200 siempre** para los tres
      negativos (folio inexistente, de otro municipio, mal escrito) — nunca
      `notFound()` por folio inexistente; ningun folio ajeno, descripcion,
      ubicacion ni area presente en el HTML (assertion sobre el markup, no
      sobre el objeto).
- [x] 6.6 GREEN `src/app/reportes/[folio]/page.tsx`: calco de
      `src/app/validar/[folio]/page.tsx`, `{ id } = await
      ayuntamientoActual()` sin sesion.
- [x] 6.7 `reportes/composicion.ts` (modificar) + `index.ts`: exponer
      `consultarFolioDeReporte` como caso de uso publico. Incluye
      `repositorioDeReportesSql.ts`: agrega `paraConsultaPublica` y
      `paraConsultaPublicaPorId` (el comentario del archivo ya anticipaba
      que el resto del contrato se completa en esta rebanada).
- [x] 6.8 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

## Phase 7: Rebanada 7 — Buscador de similares y UI de mostrador (~630 lineas)

Depende de la Fase 4. Se secuencia despues de 5 y 6 por conveniencia de una
sola cadena a `main`, no por dependencia de codigo (ver "Dependencia real").
El buscador va **con** la UI y no antes: un puerto de busqueda sin la pantalla
que lo consume no se puede revisar por lo que hace (`proposal.md`). Requisito:
`Buscador de reportes similares informativo, no bloquea el alta`.

- [ ] 7.1 `reportes/infrastructure/repositorioDeReportesSql.ts` (modificar):
      `similaresAbiertos` con el **builder** de Drizzle (nunca `` sql`...` ``
      — trampa de `identidadPorPuerto.test.ts`), `and(eq(lugarId), eq(tipo),
      inArray(estado, ["RECIBIDO","EN_ATENCION"]))`, `orderBy(desc(registradoEn))`,
      `limit(10)`, **sin `WHERE ayuntamiento_id` a mano** (la politica de la
      tabla ya acota).
- [ ] 7.2 RED `reportes/application/buscarReportesSimilares.test.ts`: sin
      guarda de rol; el criterio `{ lugarId, tipo }` pasa tal cual al
      repositorio; **no tiene ninguna rama de rechazo** — no puede bloquear
      nada porque no participa del alta.
- [ ] 7.3 GREEN `reportes/application/buscarReportesSimilares.ts`.
- [ ] 7.4 `reportes/composicion.ts` (modificar): componer
      `buscarReportesSimilares`.
- [ ] 7.5 `reportes/ui/ListadoDeReportes.tsx` (Server Component): filtros por
      estado/tipo; oculta las acciones restringidas segun
      `puedeAdministrarReportes(rol)` — **por comodidad**, la guarda real vive
      en el caso de uso (Fase 5).
- [ ] 7.6 `reportes/ui/DetalleDeReporte.tsx`: historial via `historialDe`,
      ordenado por `ocurridoEn ASC`.
- [ ] 7.7 `reportes/ui/FormularioDeAlta.tsx` (Server Component, `<form
      action>`): `descripcion` y `referencia` con etiqueta explicita sobre no
      anotar datos de vecinos, largo acotado en la UI (espejo del Zod de
      4.3).
- [ ] 7.8 `reportes/ui/SelectorDeUbicacionYTipo.tsx` +
      `reportes/ui/ReportesSimilares.tsx`: **la unica isla `"use client"`**,
      dentro del mismo `<form>`, con `useTransition` llamando a
      `buscarSimilaresAction`. **No manda `descripcion` ni `referencia` por
      `searchParams`** — es la razon de ser una isla y no un `<form>` GET
      (`design.md` seccion 15). El resto del formulario queda fuera de la
      isla, en el Server Component.
- [ ] 7.9 `reportes/ui/actions/altaDeReporteAction.ts` (Server Action, POST
      nativo, transporte `redirect` + `searchParams`, Zod `safeParse` en la
      primera linea, `contextoActual()` del servidor).
- [ ] 7.10 `reportes/ui/actions/buscarSimilaresAction.ts` (**si** devuelve
      `ActionResult<T>` — hay un componente cliente que lee su retorno,
      condicion de "La unica excepcion" de `AGENTS.md`).
- [ ] 7.11 `reportes/ui/actions/cambiarEstadoAction.ts` +
      `reportes/ui/actions/asignarAreaAction.ts`.
- [ ] 7.12 `src/app/(panel)/reportes/{page,alta,[id]}/page.tsx`: listado, alta
      con el buscador, detalle con historial y transiciones.
- [ ] 7.13 RED tests de borde de las Server Actions y de la pagina de alta
      (`vi.mock` de los casos de uso): el boton oculto no reemplaza la guarda
      — forzar la accion sin el rol y esperar el error tipado del caso de
      uso; assertion de que ninguna URL generada por la isla incluye
      `descripcion` ni `referencia` en su query string.
- [ ] 7.14 GREEN (ajustar 7.5-7.12 si algo falla).
- [ ] 7.15 `AGENTS.md` (modificar): agregar filas de `altaDeReporteAction`,
      `buscarSimilaresAction`, `cambiarEstadoAction`, `asignarAreaAction` a la
      tabla de Server Actions.
- [ ] 7.16 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde.

## Phase 8: Rebanada 8 — Exportacion y docs (~150 lineas)

Depende de la Fase 3 (solo necesita los objetos de tabla). Se secuencia al
final por conveniencia. Requisito: `Reportes en la exportacion por
ayuntamiento`.

- [ ] 8.1 RED `reportes/composicion.test.ts`: `porcionesDeReportes` expone
      `"reportes"` y `"movimientos_de_reportes"` como nombres unicos contra
      `conjuntosDePlataforma`, `padron`, `territorio` y `constancias`.
- [ ] 8.2 GREEN `reportes/composicion.ts`: `porcionesDeReportes` con columnas
      explicitas una por una, **nunca `select()` pelado**, sin
      `ayuntamientoId`; incluye `descripcion` y `referencia` (mismo argumento
      que `constancias` con `codigoVerificacion` — el archivo municipal ya
      lleva nombres y domicilios en el mismo volcado).
- [ ] 8.3 `src/app/exportacion/porciones.ts` (modificar): registrar
      `porcionesDeReportes`.
- [ ] 8.4 `docs/architecture/estructura.md` (modificar): documentar el modulo
      `reportes`.
- [ ] 8.5 `docs/05-seguridad.md` seccion 10 (modificar): declarar la segunda
      superficie consumidora de la ventana `"folio"` — `TipoIntento` sin valor
      nuevo, la consecuencia de la ventana compartida ya declarada en
      `proposal.md`.
- [ ] 8.6 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde;
      confirmar los criterios de exito de `proposal.md` uno por uno.

---

## Trazabilidad (requisito -> rebanada)

| Requisito | Rebanada(s) |
|---|---|
| Folio consecutivo por (ayuntamiento, anio) bajo lock en transaccion | 3, 4 |
| Un reporte no es un documento inmutable | 3 (esquema con `UPDATE`), 4, 5 |
| Clasificacion por tipo de incidencia, union cerrada | 2, 3 |
| Area responsable cerrada, asignada despues del registro | 2, 3, 5 |
| Ubicacion por lugar obligatorio, calle opcional, sin domicilio | 1, 3, 4 |
| Las dos cajas de texto libre del modulo, con las mismas protecciones | 3, 4, 7 |
| Vinculo opcional con una persona del padron, sin datos de contacto sueltos | 4 |
| Transiciones de estado cerradas, terminales sin reapertura | 2, 5 |
| Registrar es mostrador; cambiar estado y asignar area son estructura | 4, 5 |
| Motivo de rechazo cerrado; DUPLICADO exige el vinculo al original | 2, 3, 5 |
| Un duplicado apunta siempre a un reporte que no es duplicado | 2, 3, 5 |
| Buscador de reportes similares informativo, no bloquea el alta | 7 |
| Historial de movimientos de solo agregado | 3, 4, 5 |
| Aislamiento por ayuntamiento de las tres tablas nuevas | 3 |
| Reportes en la exportacion por ayuntamiento | 8 |
| Ubicacion compuesta como texto para un reporte ciudadano (`jerarquia-territorial`) | 1 |
| Caso de uso publico con firma propia, sin ContextoActual | 6 |
| Respuesta minima sin ningun dato personal | 6 |
| Un folio duplicado responde el estado del original y la fecha de registro propia | 2 (dominio), 6 |
| Toda respuesta negativa es indistinguible | 2, 6 |
| Limitacion de ritmo por IP, nunca por folio | 6 |
| Regla de autorizacion para administrar reportes ciudadanos (`autorizacion-roles`) | 5 |
| Limitacion de ritmo sin bloqueo persistente (`autenticacion-municipal`) | 6 |

23 requisitos, todos cubiertos.

## Review Workload Forecast

Conteo por tarea, mismo criterio que `constancias-oficios/tasks.md`: funcion
de dominio + test 60-100 lineas; adaptador SQL + test 70-110; caso de uso con
puertos mockeados + test 80-130; test de aislamiento 90-140; test de
integracion 50-100; migracion con RLS/`FORCE`/`GRANT`/FK a mano 180-260;
componente de UI + Server Action 60-140.

| Fase | Contenido | Lineas propias | `design.md` seccion 21 | Diferencia |
|---|---|---|---|---|
| 1 | Lectura de ubicacion en `territorio` | ~340 | ~340 | converge |
| 2 | Dominio puro de `reportes` | ~420 | ~420 | converge |
| 3 | Esquema, migracion, tres aislamientos | ~520 | ~510 | +10, converge |
| 4 | Puertos de lectura + `registrarReporte` + T6/T7 | ~700 | ~700 | converge |
| 5 | Estados, asignacion, vinculo de duplicado | ~540 | ~540 | converge |
| 6 | Consulta publica | ~380 | ~380 | converge |
| 7 | Buscador de similares y UI de mostrador | ~630 | ~630 | converge |
| 8 | Exportacion y docs | ~150 | ~150 | converge |
| **Total** | | **~3.680** | **~3.670** | +10, sin desacuerdo material |

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3.680 (340+420+520+700+540+380+630+150), por tarea, ver tabla arriba |
| 400-line budget risk | Low para las ocho fases contra el presupuesto real de esta sesion (800 lineas) — ninguna la excede. La Fase 4 (~700, ~12% de margen) es la mas ajustada; no lleva UI en este corte (va a la Fase 7), asi que no necesita un corte de emergencia propio |
| Chained PRs recommended | No como cadena de ramas apiladas (`CLAUDE.md`: "Un PR, un merge. Las ramas no se apilan") — **si** como secuencia de PRs independientes contra `main`, en el orden de "Dependencia real": 1 y 2 en cualquier orden; 3 independiente; 4 despues de 1+2+3; compuerta de producto; 5 despues de la compuerta; 6 despues de 4 y 5; 7 despues de 4 (secuenciado tras 5/6 por conveniencia); 8 despues de 3 |
| Suggested split | Las ocho fases de este archivo, cada una un PR propio mergeado a `main` antes de abrir el siguiente en su cadena de dependencia |
| Delivery strategy | `ask-on-risk`. Ninguna fase individual dispara el umbral de riesgo por tamano (todas bajo 800); la unica decision que si necesita a una persona es de producto, no de tamano: la compuerta del catalogo de `AreaResponsable` antes de la Fase 5 |
| Decision needed before apply | **Si, una: quien confirma que la revision del catalogo de `AreaResponsable` con el municipio piloto cerro antes de que `sdd-apply` abra la Fase 5.** No es una decision de presupuesto de lineas — ninguna fase la dispara — es la condicion de producto que `proposal.md` declara como riesgo alto y no negociable |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low
