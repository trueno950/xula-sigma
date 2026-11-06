# Territorio: integridad de datos

Corregir los defectos de la auditoría de territorio del 2026-11-05 que pueden
dejar datos mal guardados. Rama `fix/territorio-integridad-de-datos`, un PR.
Runner: Vitest (`pnpm test`, integración sobre `xula_test`) y `pnpm check`.

## Specs

- **S1.** Hallazgo A1 de la auditoría, aceptado en L1: «Mover una colonia a
  otro asentamiento deja sus domicilios con calles del asentamiento anterior.
  La constancia imprimiría una calle que no existe ahí. Los tests no lo
  detectan porque su helper siembra los datos con una forma que el dominio
  prohíbe.» `reparentearLugar` rechaza, con un error tipado y un mensaje para
  la operadora, mover un lugar a otro asentamiento cuando su subárbol tiene
  domicilios activos; mover dentro del mismo asentamiento sigue permitido. El
  helper `crearDomicilio` de los tests cuelga la calle del asentamiento.

- **S2.** Hallazgo A2, aceptado en L1: «Dar de baja un lugar no bloquea la
  fila ni cuenta sus calles y zonas. Se puede dar de baja una comisaría que
  todavía tiene calles activas. Además, si al mismo tiempo alguien registra un
  domicilio en ese lugar, el domicilio queda colgando de un lugar dado de
  baja.» La baja bloquea el lugar con `FOR UPDATE` y rechaza si tiene calles o
  zonas activas; las altas que leen un lugar padre o asentamiento lo bloquean
  igual, para que una alta y una baja concurrentes se serialicen.

- **S3.** Hallazgo M1, aceptado en L1: «Después de una fusión de personas, la
  residencia abierta de la persona fusionada nunca se cierra.» Registrar una
  mudanza cierra las residencias abiertas de todas las identidades que
  colapsan en la persona.

- **S4.** Hallazgo M2, aceptado en L1: «Una cabecera dada de baja impide
  crear otra.» La unicidad de cabecera solo cuenta cabeceras activas, en el
  índice (migración) y en `existeCabecera`.

- **S5.** «más los errores tipados de mudanza» (L1): dos mudanzas simultáneas
  de la misma persona (choque con `residencias_una_abierta_idx`) devuelven un
  error tipado con un mensaje para la operadora, no el genérico.

## Tasks

- [x] **T1** · S1,S2,S4 · delegado (respaldo de contexto de la sesión
  principal) — Lugares: reparenteo entre asentamientos, baja con bloqueo y
  dependientes, altas con bloqueo, cabecera única activa con migración.
  Risk: item 1 (migración), item 4 (bloqueos). Commits: `7f3e5c4` (S4), `cf8a3fb` (S2), `bf7f708` (S1).
- [x] **T2** · S3,S5 · delegado (mismo motivo) — Residencias: mudanza que
  cierra todas las identidades y error tipado de mudanza concurrente.
  Risk: item 1 (datos de residencias), item 4. Commit: `42ddd6b`.
- [x] **T3** · S1-S5 · verificador independiente al final de la feature,
  `pnpm check` y suite completa, PR con issue aprobado.

## Log

- **L1** — 2026-11-06. Pedido textual: «Si», respuesta a «¿Publico primero el
  PR del historial y arranco con la integridad de datos?», después del plan
  «1. **Integridad de datos:** puntos 1 a 4, más los errores tipados de
  mudanza y el arreglo del helper de tests.» Fuera de alcance: los hallazgos
  B1-B5 de datos (nombres duplicados, conteo de domicilios dados de baja,
  domicilios duplicados, colonia nueva sobre domicilios directos, mudanza al
  mismo domicilio) y M3 (corrección de domicilio con residentes). T1 y T2 van
  en serie, no en paralelo: comparten `domain/index.ts` y la base de pruebas.

- **L2** — 2026-11-06. T1 del escritor: S1, S2 y S4 cubiertos. RED observado: 16 unitarios, 8 de integración (incluidas dos carreras reales con `enTransaccionParalela`: alta de calle contra baja concurrente y baja contra domicilio concurrente) y la redacción en `reparentearLugarAction`. GREEN: módulo 146 archivos y 751 tests. Migración `drizzle/0022_cabecera_activa_unica.sql`: solo DROP y CREATE del índice parcial `WHERE tipo='cabecera' AND baja_en IS NULL`. Nuevos `LugarConDomiciliosError`, `LugarConCallesError`, `LugarConZonasError` (los dos últimos heredan de `LugarConDependientesError`) y `bloquearPorId` con `FOR UPDATE` en baja, reparenteo, altas de lugar, calle y zona, y verificación de domicilio. `subarbol` se movió a `subarbolDeLugaresSql.ts` para el límite de 200 líneas. El único fallo de suite era `constancias/emision.integration.test.ts:68`, que movía una colonia con domicilios, justo lo que S1 prohíbe; el padre lo cambió por un renombre con `editarLugar`, que sigue probando que el snapshot de la constancia no cambia. Comprobación del padre: `pnpm check` exit 0 y suite completa 469 archivos y 2409 tests. Risk: item 1 (migración), item 4 (bloqueos), item 3 (`reparentearLugar` rechaza un movimiento que antes aceptaba).

- **L3** — 2026-11-06. Primer intento de commit de T1 frenado por `pnpm reglas` (antipatrón 2): `lugares.concurrencia.integration.test.ts` importaba el tipo `TransactionSql` de `postgres`. Corregido con el patrón existente: el tipo `CambioDeLugar` vive en el andamiaje `carrerasDeCalleDePrueba.ts`, junto a `CambioDeCalle`. Reglas sin hallazgos, typecheck limpio y el test de concurrencia 2/2.

- **L4** — 2026-11-06. T2 del escritor: S3 y S5 cubiertos. `registrarMudanza` lee `identidadesDe(terminal)` fuera de `withTenant` y cierra con `cerrarAbiertas(tx, identidades, hastaEn)` todas las residencias abiertas, con una traza `CERRAR_RESIDENCIA` por cada una. El choque con `residencias_una_abierta_idx` se traduce en `abrir` a `MudanzaConcurrenteError` («Ya se registró otra mudanza para esta persona al mismo tiempo. Revise el historial.»), redactado en `registrarMudanzaAction` y anotado en AGENTS.md. Sin lock adicional: `FOR UPDATE` no serializa una primera mudanza (no hay fila) y con residencia abierta el `UPDATE` ya bloquea; el índice único es el mecanismo y el error tipado su resultado. RED en 8 casos (unitarios, acción, fusión real y carrera real con `enTransaccionParalela`) y GREEN; módulo 150 archivos y 760 tests; reglas sin hallazgos; suite completa 473 archivos y 2418 tests. Comprobación del padre: `pnpm check` exit 0. Risk: item 1 (datos de residencias), item 4 (concurrencia).

- **L5** — 2026-11-06. Verificador independiente de la feature completa (`0caa85c..9a76722`): S1-S5 cumplen, sin bloqueantes. Orden de locks sin riesgo de deadlock. `pnpm db:migrate` exit 0 (0022 ya aplicada), `drizzle-kit check` «Everything's fine», módulos territorio/constancias/padron 231 archivos y 1093 tests, suite completa 473 archivos y 2418 tests. Diferencial unitario contra la base: 578 tests comunes, ninguno falla solo en el candidato. Advertencias, sin corrección: (1) reparentear una colonia activa cuyo padre está dado de baja (dato huérfano heredado) ahora da `NoEncontradoError` aunque no tenga domicilios; (2) `reparentearLugar` no bloquea el nuevo padre, igual que antes; (3) `identidadesDe` se lee fuera de la transacción, intercambio aceptado; (4) ningún test fija que un 23505 de otro índice no se convierta en `MudanzaConcurrenteError`. Directorio temporal del verificador borrado por el padre.

- **L6** — 2026-11-06. La revisión nativa del candidato completo `0caa85c..6910c1a` (68 archivos, 6095 líneas) se detuvo con `lens_context_budget_exceeded`, sin crear autoridad. T2 se revisó sola (`review-15d4fa1e3309b170`, aprobada). Para T1 el usuario eligió «Partir T1 y revisarlo (Recomendado)»: la historia local, sin publicar, se rehízo en tres commits con su comportamiento y sus tests: `7f3e5c4` S4 (migración 0022, snapshot de drizzle de ~3900 líneas, esquema, `existeCabecera`), `cf8a3fb` S2 (bloqueos y dependientes; módulos territorio y constancias 189 archivos y 920 tests en ese estado) y `bf7f708` S1 (reparenteo y helper). El árbol tras `bf7f708` es idéntico al `3c96ef6` original y el final idéntico a la rama de respaldo `respaldo/integridad-sin-partir`; T2 y estas notas se reaplicaron como `42ddd6b` y `6c83002`, y su revisión sigue reconocida (`target_already_acknowledged`). Revisiones: S2 `review-c372b34fa016659b` y S1 `review-3635ee6b55c520a1`, aprobadas y reconocidas. S4 no cabe por el snapshot generado y queda cubierta solo por el verificador (L5). Advertencias informativas de las revisiones: destino del reparenteo sin bloqueo, serialización en una fila caliente de `lugares`, acoplamiento del fake de pruebas, y lo de L5. Antes de cada preflight hubo que correr `gentle-ai sync` por `managed_assets_outdated`.

