# Territorio: deuda técnica

Pagar la deuda que la auditoría de salud del código de territorio del
2026-11-05 marcó como «deuda que bloquea crecer». Rama
`refactor/territorio-deuda-tecnica`, un PR. Runner: Vitest (`pnpm test`,
integración sobre `xula_test`), Playwright y `pnpm check`.

## Specs

- **S1.** A1, L2 y L3 de la auditoría: «El CTE recursivo del subárbol está
  copiado cinco veces» (`repositorioDeLugaresSql`, `repositorioDeDomiciliosSql`,
  `registroDeDomiciliosSql`, `lectorDeContenidoDeLugaresSql`, más
  `ascendientes` en `lectorDeUbicacionesSql` y `lectorDeDireccionesSql`).
  Arreglo: fragmentos `sql` compartidos para descendientes y ascendientes en
  un solo archivo de `infrastructure`, con una sola copia de la explicación
  de Drizzle y sin los comentarios que dicen «la única pieza recursiva».

- **S2.** A3: «Hay cinco formatos distintos para la misma dirección». Una
  sola etiqueta de domicilio exportada por `territorio` (junto a
  `componerDireccion`), consumida por `reportes` y por las vistas de
  territorio; formato del selector de direcciones: «Calle 20 #42-B, Colonia
  Centro, Motul», «sin número» si no tiene.

- **S3.** A2: «El listado de domicilios para la mudanza no tiene límite y se
  carga aunque no se use». Se carga solo para quien puede escribir.

- **S4.** M4: «Faltan índices en `residencias`»: `(ayuntamiento_id,
  domicilio_id)` y `(ayuntamiento_id, persona_id)`, con migración aditiva.

- **S5.** A5 de la auditoría de experiencia: «Listas de calles y domicilios
  sin búsqueda ni paginación» y «cada vista de un asentamiento carga además
  todos sus domicilios con `subarbol` aunque la pestaña abierta sea
  Lugares». Búsqueda `?q=` y «Ver más» de 50 en 50 en las pestañas Calles y
  Domicilios; los domicilios se cargan solo cuando su pestaña se muestra.

- **S6.** L1 y L4: código muerto (`opcionesDeDomicilios`,
  `domiciliosDirectosDe`, el método de puerto `porCalle` sin llamador en
  producción, la lógica de `asentamientoContenedorDe` reimplementada en
  `verificacionDeDomicilio`) y el test `callesFoundation.todo.test.ts` que
  duplica casos de `ubicarCalle.test.ts`.

## Tasks

- [x] **T1** · S1,S6 · delegado (respaldo de contexto) — CTE compartido y
  código muerto. Commit: `121de89`.
- [x] **T2** · S2 · delegado — Etiqueta única de domicilio. Commit:
- [ ] **T3** · S3,S4 · delegado — Carga condicional y índices de
  residencias. Risk: item 1 (migración). Commit:
- [ ] **T4** · S5 · delegado — Búsqueda y paginación en pestañas. Commit:
- [ ] **T5** · S1-S6 · verificador independiente por la migración, suite,
  E2E, PR con issue aprobado.

## Log

- **L1** — 2026-11-06. Pedido textual: «si», respuesta a «¿Hago el merge del
  #118 cuando pase el CI y sigo con la deuda técnica?», con el bloque
  descrito como «una sola consulta recursiva de lugares; una sola forma de
  escribir un domicilio; índices en `residencias`; paginación; borrar código
  que ya nadie usa». Fuera de alcance: el ayudante `trazar` para la bitácora
  (M2), dividir archivos al borde de 200 líneas salvo cuando lo exija un
  cambio, y el buscador GET sin JavaScript para la mudanza.

- **L2** — 2026-11-06. T1 del escritor: S1 y S6 cubiertos. `jerarquiaDeLugaresSql.ts` con `cteDescendientes`, `cteDescendientesDeCadaLugar` y `cteAscendientes`, usados por las seis consultas, con la única copia de la nota de Drizzle 0.45.2. SQL generado de las 7 consultas comparado antes y después con `PgDialect.sqlToQuery()`: mismos límites de profundidad, filtros de baja y columnas; diferencias solo en el encabezado del CTE (columna `ancestro` sin uso y un `WHERE TRUE AND`). Test nuevo de jerarquía (ciclo de `padre_id`, baja que corta la cadena, domicilio inexistente) verde sobre el código anterior. `asentamientoDeLugar` conserva su bucle porque el CTE cambiaría su comportamiento; `asentamientoDeCadena` compartido con `verificacionDeDomicilio`. Borrados `opcionesDeDomicilios`, `domiciliosDirectosDe`, el método `porCalle` (tests reescritos sobre lecturas de producción) y `callesFoundation.todo.test.ts` (su caso único fusionado en `ubicarCalle.test.ts`). Módulo 165 archivos, 851 → 850 tests; suite completa 493 archivos y 2536 tests. Comprobación del padre: `pnpm check` exit 0. Risk: item 6 parcial, cubierto por las integraciones.

- **L3** — 2026-11-06. T2 del escritor: S2 cubierto. `domain/etiquetaDeDomicilio.ts` con `calleYNumero` («Calle 20 #42-B» / «Calle 20 sin número») y `etiquetaDeDomicilio` (agrega lugar y raíz, sin repetir el lugar si es la raíz), exportada por el barrel. Buscadores de mudanza y reportes: misma salida, sin copias. Select sin JavaScript de la mudanza: «Tepakan — Calle 21 12» → «Calle 21 #12, Tepakan» (sin raíz: `listar` no la trae). Registro, lista del árbol y panel del domicilio: `calleYNumero` en la celda o el título, porque el lugar ya está en su columna o en el contexto; etiqueta completa en el nombre accesible. Corrección del padre: el escritor había importado `@/modules/territorio` desde `reportes/application`, contra la regla de capas de AGENTS.md; la etiqueta ahora la arma el adaptador `buscadorDeDireccionesPorTerritorio` (infraestructura) y viaja por el puerto propio de reportes, con un test del adaptador. Suite completa del escritor 494 archivos y 2541 tests; E2E de mudanza, reportes, borrador y vista 17/17; reportes con base 65 archivos y 266 tests tras la corrección. Comprobación del padre: `pnpm check` exit 0. Risk: item 3 (texto visible de domicilios en varias pantallas).

