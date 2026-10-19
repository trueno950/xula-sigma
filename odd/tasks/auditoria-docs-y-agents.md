# Auditoría de documentación, AGENTS.md y código huérfano

Reconciliar lo que el repo **dice** con lo que el repo **hace**, empezando por
`AGENTS.md`, que es el motor de la revisión con IA: una regla que ya no rige es
peor que ninguna, porque nadie la discute.

## Specs

- **S1.** «podemos hacer una revision de lo que tenemos hoy vs documentacion,
  actualizarla» — comparar `AGENTS.md`, `docs/`, `CLAUDE.md` y `PRODUCT.md`
  contra el estado real del código, y actualizar lo que no coincida.
- **S2.** «pulir agents.md que es el motor para nuestro desarrollo con ia» —
  `AGENTS.md` primero: cada afirmación verificable se comprueba contra el
  código; lo que ya no rige se corrige o se retira, y lo que falta se agrega.
- **S3.** «identificar archivos huerfanos» — archivos que nadie importa, que
  ninguna ruta alcanza, o que quedaron sin referencia tras los rediseños.
- **S4.** «cidgo viejo que no se use, etc» — código muerto: exportaciones sin
  consumidor, componentes reemplazados, scripts que nadie invoca, fixtures
  sin uso. **Identificar, no borrar**: la baja se decide con la lista a la
  vista.

## Tasks

- [x] **T1** · S2 · explorar — Auditar cada afirmación verificable de
  `AGENTS.md` contra el código, con evidencia `archivo:línea`.
- [x] **T2** · S3,S4 · explorar — Inventariar archivos huérfanos y código
  muerto, con la prueba de que nadie lo alcanza.
- [x] **T3** · S2 · directo — Actualizar `AGENTS.md` con lo hallado en T1.
- [x] **T4** · S1 · directo — Actualizar la documentación desalineada.
- [x] **T5** · S3,S4 · directo — Presentar la lista de T2 para decisión de
  baja; no se borra nada sin ella. Presentada: no hay basura que borrar, hay
  backend escalonado y un diagrama sin índice.
- [x] **T6** · S1-S4 · directo — `pnpm check` y suites en verde; commits por
  unidad de trabajo.

## Log

- **L1** — Pedido original, textual: «Antes de seguir podemos hacer una
  revision de lo que tenemos hoy vs documentacion, actualizarla, pulir
  agents.md que es el motor para nuestro desarrollo con ia, identificar
  archivos huerfanos, cidgo viejo que no se use, etc». Contexto: se acaban de
  fusionar #95 (cierre UX/UI), #97 (retiro de la revisión IA de CI), #98 y #99
  (e2e a verde), y `AGENTS.md` no se tocaba desde el 2026-09-30 (`fa3de55`),
  antes de todos ellos.
- **L2** — Dos auditorías read-only delegadas en paralelo (T1 y T2). T1
  verificó 24 afirmaciones de `AGENTS.md`: 19 ciertas, 4 incompletas, 1
  desalineada. T2 inventarió archivos por símbolo en ~60 candidatos y no halló
  componentes reemplazados sin uso tras los rediseños.
- **L3** — Correcciones (commit `1930f94`): los `scripts/*.sql` son nueve y el
  documento se contradecía consigo mismo; `pnpm reglas` sí corre RLS, folios y
  `SET LOCAL` sobre ellos; el andamiaje de tests que abre conexión tiene un
  cuarto miembro (`escuchaDePrueba.ts`); falta la acción `cambiarEstadoAction`
  de `intervenciones` en la tabla; la excepción de `DELETE` acota una
  ampliación de verbo, no el universo. Y `docs/README.md` decía "sin
  excepción" sobre `withTenant` mientras `AGENTS.md` sanciona cuatro.
  Comentarios que nombraban superficies retiradas (commit `a2d4295`):
  `ci.yml` citaba el job `revision` y `.gga` un path no versionado.
- **L4** — T2 llamó "huérfanos" a cinco cosas; al clasificarlas, cuatro son
  **backend escalonado**, no basura: `shared/exportacion` está en el ROADMAP
  («cada módulo agrega su porción al exportador», §119), y
  `editarPersona`/`darDeBajaPersona`/`revertirFusion` están especificados en
  `openspec/changes/archive/2026-08-23-padron-ciudadano`. Lo único sin
  destino es el diagrama `docs/architecture/xula-construccion.lifecycle.*`
  (805 KB del 2026-09-26, sin índice que lo enlace). Decisión pendiente del
  humano, junto con la de si conviene anotar el escalonamiento para que otra
  auditoría no lo lea como código muerto.
- **L5** — Alcance de S4, decidido por la persona: «si no se usa es mejor
  eliminarlo», y después «corregir y subir» + «3». S4 se había leído como
  identificar-y-reportar; la decisión autorizó **retirar** `revertirFusion` y
  devolver la capacidad como guion de operación (`scripts/deshacer-fusion.sql`),
  y **devolver al código** `editarPersona`, `darDeBajaPersona` y
  `administracionDeUsuarios` cuando el lente de confiabilidad los reclamó.
- **L6** — Revisión nativa del rango `c9b29e7..HEAD`, tres intentos: los dos
  primeros escalaron por causalidad desconocida (5 y 2 hallazgos), el tercero
  pasó por los cuatro lentes, un refuter, un plan de corrección acotado y un
  validador dirigido. El validador encontró una **regresión real** que mis
  pruebas no vieron —`filas` de personas pisada por el `ROW_COUNT` de la
  bitácora, con una sola persona fusionada los dos conteos coinciden—,
  corregida en `9a263fc` y verificada con una cadena A→B→C. El criterio
  restante pide que `revertirFusion` vuelva al código; la persona eligió
  **aceptar el escalamiento**: la traza atribuible ya existe (`REVERTIR_FUSION`
  con actor, entidad, id y origen, en la misma transacción) y el límite lo pone
  la política RLS. La revisión queda escalada, nunca aprobada: es informativa.
