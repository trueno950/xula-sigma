# Tasks: Padron ciudadano (Fase 1a)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1370 (300+250+310+450+60) |
| 400-line budget risk | High (driven by Slice 4; Slice 1 y 3 quedan cerca del techo) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 (Slice 1) -> PR2 (Slice 2) -> PR3 (Slice 3) -> PR4 (Slice 4) -> PR5 (Slice 5), cada uno mergeado a `main` antes de abrir el siguiente |
| Delivery strategy | single-pr (aplicada por rebanada) |
| Chain strategy | stacked-to-main (merges secuenciales en orden, no ramas apiladas sin mergear) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Esquema, RLS, catalogo, dominio, aislamiento | PR 1 | `pnpm test src/modules/padron/domain` + `pnpm test:integration -- personas.isolation` | `pnpm db:local` (puerto 55432), exportar `DATABASE_URL`/`MIGRATION_DATABASE_URL`/`SUPER_ADMIN_DATABASE_URL`, correr nativo (nunca `rtk`) | Revertir PR y bajar migracion; `personas`/`abreviaturas` no las lee nadie mas |
| 2 | Alta, edicion, baja, bitacora, UI | PR 2 | `pnpm test src/modules/padron/application` + integration de columna normalizada | Igual que PR1, mas `pnpm test:integration -- alta edicion` | Revertir `application/`+`ui/` de PR2; el esquema de PR1 queda intacto |
| 3 | Indice GIN, expansion, busqueda, UI | PR 3 | `pnpm test:integration -- buscarPersonas` (incluye `EXPLAIN`) | `pnpm db:local`, 250k filas no requeridas para el test funcional, solo para el plan | Bajar la migracion del indice; drop `buscarPersonas.ts`/UI; alta/edicion de PR2 no cambian |
| 4 | Fusion, reversion, sugerencia, puerto colapsado | PR 4 | `pnpm test:integration -- fusion revertirFusion` | `pnpm db:local`, escenarios multi-tenant nativos, sin `rtk` | Bajar migracion de `fusionadaEn`/`fusionadaDirectoEn` (columnas nullable aditivas); PR1-3 no cambian de firma |
| 5 | `PorcionExportable`, composicion, guarda de unicidad | PR 5 | `pnpm test src/shared/exportacion src/modules/padron` | N/A — sin sistema externo vivo; lo cubre el test de integracion del propio flujo | Revertir `porciones.ts`/`composicion.ts`; exportacion de otros modulos no se toca |

### Nota — contradiccion encontrada y reconciliada

Al escribir esta lista, `specs/padron-ciudadano/spec.md` y
`specs/autorizacion-roles/spec.md` todavia etiquetaban los requisitos con la
numeracion de 4 rebanadas, que agrupaba esquema+alta+edicion bajo una sola.
`design.md` seccion 9 arrastraba lo mismo contra su propia seccion 13.

Se corrigieron los tres: el spec numera de 1 a 5 y apunta a `design.md`
seccion 13, y la tabla de archivos de la seccion 9 ubica los casos de uso y
la UI en la rebanada 2. Ninguna decision se reabrio — era una etiqueta de
numeracion, no una decision de contenido.

Se deja escrito porque la contradiccion la encontro esta fase y no la
anterior: una numeracion que se mueve en un documento y no en los otros no
rompe nada hasta que alguien corta por el documento equivocado.

---

## Phase 1: Slice 1 — Esquema y aislamiento (~300 lineas)

- [x] 1.1 RED `domain/normalizarParaBusqueda.test.ts`: minusculas, sin
      acentos, sin puntos, expansion via `ReadonlyMap` de prueba
- [x] 1.2 GREEN `domain/normalizarParaBusqueda.ts`
- [x] 1.3 RED `domain/curp.test.ts`: `''`->`null`, formato invalido rechazado
- [x] 1.4 GREEN `domain/curp.ts`
- [x] 1.5 RED `domain/persona.test.ts`: `Persona.crear` con `nombres`/
      `primerApellido` obligatorios, `segundoApellido` opcional
- [x] 1.6 GREEN `domain/persona.ts`; `domain/index.ts`
- [x] 1.7 `infrastructure/esquema.ts`: tabla `personas` (sin `fusionadaEn`
      todavia) con `nombreNormalizado text().notNull()` sin default,
      `unique(id, ayuntamientoId)`, `uniqueIndex(ayuntamientoId, curp)`,
      `politicaTenant(personas)` + `enableRLS()`; tabla `abreviaturas` sin
      `ayuntamientoId`. El objeto de tabla NO se exporta de ningun barrel
- [x] 1.8 `drizzle/000X_padron.sql`: generar con `drizzle-kit generate`; en la
      cola del mismo archivo agregar `CREATE EXTENSION IF NOT EXISTS
      pg_trgm`, `unaccent`, `FORCE ROW LEVEL SECURITY`, `GRANT` (catalogo
      solo `SELECT` para `xula_app`, sin `INSERT`/`UPDATE`), semilla del
      diccionario del ADR 0002 §4
- [x] 1.9 RED `infrastructure/catalogoDeAbreviaturasSql.test.ts`: lee
      `abreviaturas`, devuelve `Map`, memoiza por proceso
- [x] 1.10 GREEN `catalogoDeAbreviaturasSql.ts`
- [x] 1.11 `docs/architecture/invariantes-criticos.md` §1: agregar la
      excepcion de `abreviaturas` (tabla de plataforma sin
      `ayuntamiento_id`, solo lectura para el rol de aplicacion)
- [x] 1.12 `docs/architecture/module-template.md`: linea 35
      `schema.ts`->`esquema.ts` (razon: `drizzle.config.ts:31` globea ese
      nombre exacto); lineas 27 y 50 `domain/ports.ts`->
      `application/puertos.ts`
- [x] 1.13 `src/modules/padron/{index.ts,types.ts,composicion.ts}`:
      esqueleto minimo, sin casos de uso todavia
- [x] 1.14 RED `superficiePublica.test.ts`: el barrel no exporta ningun
      objeto de tabla Drizzle. **Este test nace verde contra 1.13, asi que
      hay que provocarle el rojo:** agregar temporalmente
      `export { personas } from "./infrastructure/esquema"` al barrel,
      verificar que falla, y recien ahi sacarlo. Un test que nunca se vio
      fallar no prueba que detecte nada
- [x] 1.15 GREEN: quitar el export temporal y dejar el test en verde
- [x] 1.16 RED `personas.isolation.test.ts`: sembrar dos municipios
      (`municipiosDePrueba.ts`), insertar personas en A y B calculando
      `nombreNormalizado` con la funcion de 1.2 antes del INSERT; contexto
      en A sin `where` de tenant devuelve solo A (T1); id de B por id
      directo no aparece (T3); CURP duplicada en el mismo municipio se
      rechaza, entre municipios convive
- [x] 1.17 GREEN (ajustar RLS/`FORCE`/`GRANT` de 1.8 si falla)
- [x] 1.18 Correr con `pnpm db:local` levantado y las tres env vars de
      `scripts/db-local.sh` exportadas; `pnpm test:integration` nativo,
      nunca `rtk test` para este archivo
- [x] 1.19 `pnpm check` + `pnpm test` en verde; confirmar piso 80%/75% sobre
      `modules/padron/domain`

## Phase 2: Slice 2 — Alta, edicion, baja y UI (~250 lineas)

- [x] 2.1 `application/puertos.ts`: `PersonaParaGuardar` (sin
      `nombreNormalizado`), `RepositorioDePersonas.{guardar,actualizar,
      buscarPorId}`
- [x] 2.2 RED `infrastructure/repositorioDePersonasSql.test.ts`:
      `guardar`/`actualizar` escriben `nombreNormalizado` recalculado
- [x] 2.3 GREEN `repositorioDePersonasSql.ts` (objeto literal, precedente
      `repositorioDeMarcaSql`): `guardar`, `actualizar` llaman al catalogo
      memoizado + `normalizarParaBusqueda`; `buscarPorId` (SELECT plano,
      sin resolucion de fusion aun)
- [x] 2.4 RED `application/altaDePersona.test.ts` (puertos mockeados):
      rechaza sin `puedeEscribir`
- [x] 2.5 GREEN `altaDePersona.ts`: un `withTenant`, `catalogo.leer` +
      `guardar` + `registrar(ALTA_PERSONA, solo ids)` en la misma tx
- [x] 2.6 RED `editarPersona.test.ts`: recalcula `nombreNormalizado` al
      corregir `primerApellido`
- [x] 2.7 GREEN `editarPersona.ts`
- [x] 2.8 RED `darDeBajaPersona.test.ts`: fija `bajaEn`, bitacora
      `BAJA_PERSONA`, sin motivo estructurado
- [x] 2.9 GREEN `darDeBajaPersona.ts`; `application/index.ts`
- [x] 2.10 RED integration: tras alta y tras edicion, `nombreNormalizado`
      en la fila coincide con `normalizarParaBusqueda(...)` recalculado
      por fuera — la prueba de la costura tipo (design.md §5)
- [x] 2.11 GREEN (ajustar adaptador si diverge)
- [x] 2.12 RED integration: bitacora de alta/edicion/baja no contiene
      `nombre` ni `curp`, solo ids
- [x] 2.13 GREEN (ajustar `registrar(...)` si filtra de mas)
- [x] 2.14 `ui/FormularioDeAltaDePersona.tsx` (Server Component) +
      `ui/actions/altaDePersona.action.ts`
- [x] 2.15 `ui/ListadoDePersonas.tsx`: excluye `bajaEn` no nulo por defecto
- [x] 2.16 Ruta fina `app/(panel)/padron/{page.tsx,alta/page.tsx}`; cablear
      en `composicion.ts`
- [x] 2.17 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde;
      cobertura sobre `modules/padron/application`

## Phase 3: Slice 3 — Busqueda tolerante (~310 lineas)

- [ ] 3.1 `drizzle/000Y_padron_indice.sql`: `CREATE INDEX ... USING gin
      (nombre_normalizado gin_trgm_ops)`. Sin backfill — la columna ya
      viene poblada desde la rebanada 1
- [ ] 3.2 RED `buscarPersonas.test.ts` (puertos mockeados): expande la
      cadena UNA vez antes de construir el filtro
- [ ] 3.3 GREEN `application/buscarPersonas.ts`: `UMBRAL_BUSQUEDA = 0.30`
      como constante propia, excluye `bajaEn` no nulo por defecto
- [ ] 3.4 RED `repositorioDePersonasSql.test.ts` extension: el metodo de
      busqueda recibe la cadena ya expandida como constante
- [ ] 3.5 GREEN agregar `buscar(tx, cadenaExpandida, umbral)` con
      `similarity()` de `pg_trgm`
- [ ] 3.6 RED integration: "gpe kumul" encuentra "Maria Guadalupe Kumul"
      por encima de 0.30
- [ ] 3.7 GREEN (ajustar umbral/expansion si no calzan)
- [ ] 3.8 RED integration: `EXPLAIN` de la consulta muestra `Bitmap Index
      Scan` sobre el GIN
- [ ] 3.9 GREEN (si algun envoltorio vuelve la funcion opaca al planner)
- [ ] 3.10 RED integration: persona con `bajaEn` fijado no aparece en la
      busqueda sin pedir explicitamente inactivas
- [ ] 3.11 GREEN
- [ ] 3.12 `ui/BuscadorDePersonas.tsx` + Server Action de busqueda
- [ ] 3.13 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde

## Phase 4: Slice 4 — Duplicados y fusion (~450 lineas, ~12% sobre
presupuesto, aceptado por design.md §13 — partir fusion de su reversion deja
un estado intermedio irreversible, peor que el diff largo)

- [ ] 4.1 `drizzle/000Z_padron_fusion.sql`: `ALTER TABLE personas ADD COLUMN
      fusionada_en uuid NULL, ADD COLUMN fusionada_directo_en uuid NULL`,
      ambos con FK compuesto `(columna, ayuntamiento_id) -> (id,
      ayuntamiento_id)`. Columnas nullable aditivas, sin cambiar firmas
      previas
- [ ] 4.2 RED `src/shared/auth/roles.test.ts`: `puedeFusionarPersonas` —
      ADMIN_MUNICIPAL si, OPERADOR/CONSULTA/SUPER_ADMIN no
- [ ] 4.3 GREEN `src/shared/auth/roles.ts`: `puedeFusionarPersonas = (rol)
      => rol === "ADMIN_MUNICIPAL"` (mismo criterio que `puedeExportar`)
- [ ] 4.4 RED `repositorioDePersonasSql.test.ts`: `buscarPorId` resuelve la
      redireccion colapsada (`COALESCE((SELECT fusionada_en ...), id)`),
      un salto, mismo tipo de retorno
- [ ] 4.5 GREEN actualizar `buscarPorId`
- [ ] 4.6 RED `fusionarPersonas.test.ts` (puertos mockeados): rechaza sin
      `puedeFusionarPersonas`; auto-fusion (mismos terminales) no-opera
- [ ] 4.7 GREEN `application/fusionarPersonas.ts`: resolver ambos ids al
      terminal, `UPDATE ... SET fusionada_en = G WHERE fusionada_en = P`
      (colapso), `UPDATE ... SET fusionada_en = G, fusionada_directo_en =
      G WHERE id = P`, `registrar(FUSIONAR_PERSONA, solo ids)`, una tx
- [ ] 4.8 RED integration: invariante — `SELECT count(*) FROM personas p
      JOIN personas g ON g.id = p.fusionada_en WHERE g.fusionada_en IS NOT
      NULL` da 0 tras una cadena A->B->C
- [ ] 4.9 RED integration: cadena A->B, B->C; consultar A por el puerto
      resuelve a C en un salto
- [ ] 4.10 RED integration: editar a C tras la cadena y volver a consultar
      A trae el apellido nuevo (no foto del momento de la fusion)
- [ ] 4.11 GREEN (4.8-4.10 confirman 4.7; ajustar si algo falla)
- [ ] 4.12 RED `revertirFusion.test.ts`: revertir A->B devuelve ambas
      personas a existir por separado
- [ ] 4.13 GREEN `application/revertirFusion.ts`: `UPDATE personas SET
      fusionada_en = NULL, fusionada_directo_en = NULL WHERE id = P`,
      `UPDATE personas SET fusionada_en = P WHERE fusionada_directo_en = P
      AND id <> P` (des-colapsa reenganchados), traza `REVERTIR_FUSION`
- [ ] 4.14 RED integration: cadena A->B->C, revertir B->C deja a A
      apuntando a B, no a C
- [ ] 4.15 GREEN (ajustar 4.13 si el des-colapso no alcanza a A)
- [ ] 4.16 RED integration: fusion entre dos municipios distintos falla —
      FK compuesto + RLS impiden que el UPDATE vea la fila del otro tenant
- [ ] 4.17 GREEN
- [ ] 4.18 RED `sugerirDuplicados.test.ts`: `UMBRAL_SUGERENCIA = 0.30` en
      su propia constante nombrada (no compartida con `buscarPersonas`),
      `TOPE_SUGERENCIAS = 5`, nunca bloquea
- [ ] 4.19 GREEN `application/sugerirDuplicados.ts`
- [ ] 4.20 RED integration: nombre a medio escribir (pila + 4 letras del
      apellido paterno) trae a la persona existente entre las sugerencias
- [ ] 4.21 GREEN
- [ ] 4.22 Actualizar `buscarPersonas.ts` (Slice 3) para excluir tambien
      `fusionadaEn` no nulo — aditivo, no cambia su firma
- [ ] 4.23 RED `src/modules/padron/identidadPorPuerto.test.ts` (capa C de
      design.md §2): escanea `src/**` fuera de `padron` buscando
      `persona_id`/`personas` dentro de `` sql`` `` crudo. **Pasa en vacio
      hoy, asi que hay que provocarle el rojo:** meter en un archivo
      temporal fuera de `padron` una consulta cruda contra `personas`,
      verificar que el escaneo la encuentra, y recien ahi borrarla. Un
      escaneo que nunca encontro nada tampoco probo que sepa buscar
- [ ] 4.24 GREEN: quitar el archivo temporal. El propio test documenta su
      limite declarado — no cubre nombre de tabla armado dinamicamente ni
      `.sql` de `scripts/`
- [ ] 4.25 `ui/SugerenciaDeDuplicados.tsx` (`"use client"`, la unica hoja
      que lo justifica), integrada al formulario de alta de Slice 2
- [ ] 4.26 `ui/FusionarPersonas.tsx` + Server Action, visible solo si
      `puedeFusionarPersonas`
- [ ] 4.27 `pnpm check` + `pnpm test` + `pnpm test:integration` en verde;
      cobertura sobre `modules/padron/{domain,application}` con fusion
      incluida

## Phase 5: Slice 5 — Exportacion (~60 lineas)

- [ ] 5.1 RED `src/shared/exportacion/porciones.test.ts`: dos
      `PorcionExportable` con el mismo `nombre` deben fallar
      explicitamente — hoy `conjuntosDe` (`exportar.ts`) los pisa en
      silencio
- [ ] 5.2 GREEN guarda de tres lineas en `conjuntosDe`
      (`src/shared/exportacion/exportar.ts`): lanzar si `nombre` ya esta
      en `conjuntos`
- [ ] 5.3 RED `padron/composicion.test.ts`: `porcionDePadron.leer` devuelve
      columnas listadas una por una (nunca `select()` pelado), incluye
      `fusionadaEn` como columna — el archivo municipal no esconde
      tombstones
- [ ] 5.4 GREEN `porcionDePadron` en `padron/composicion.ts`, exportado
      como valor (no tabla) desde el barrel
- [ ] 5.5 `src/app/exportacion/porciones.ts`: `export const porciones:
      readonly PorcionExportable[] = [porcionDePadron]`; cablear en el
      punto de llamada de `exportarAyuntamiento`
- [ ] 5.6 `pnpm check` + `pnpm test` en verde
