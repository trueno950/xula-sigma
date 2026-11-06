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
  Risk: item 1 (migración), item 4 (bloqueos). Commit:
- [ ] **T2** · S3,S5 · delegado (mismo motivo) — Residencias: mudanza que
  cierra todas las identidades y error tipado de mudanza concurrente.
  Risk: item 1 (datos de residencias), item 4. Commit:
- [ ] **T3** · S1-S5 · verificador independiente al final de la feature,
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

