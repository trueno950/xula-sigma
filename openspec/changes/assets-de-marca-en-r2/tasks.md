# Tasks: Assets de marca en R2

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~440 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | PR unico, `size:exception` |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

El desborde de ~10% ya fue aceptado por el responsable de producto
(`proposal.md`, "Tamano frente al presupuesto"). `sdd-apply` debe registrar
el `size:exception` antes de empezar. Revision apuntada a los tres archivos
que cargan riesgo: `domain/png.ts`, `application/cambiarEscudo.ts` e
`infrastructure/almacenR2.ts`. Matriz de amenazas: **N/A** (design.md
seccion 13) — sin tareas RED derivadas de ella.

### Suggested Work Units

Un solo PR (`delivery_strategy=single-pr`); la tabla ordena la revision
interna, no separa entregas.

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Cimientos: `ActionResult`, `mapearError`, `puedeCambiarMarca` | PR 1 | `pnpm test src/shared/lib src/shared/auth` | N/A — sin IO | Revert `errores.ts`, `roles.ts` |
| 2 | Dominio `marca/`: `png.ts`, `claveDeEscudo.ts`, `validarMarca` | PR 1 | `pnpm test src/modules/marca/domain src/shared/ui/marca.test.ts` | N/A — sin IO | Revert `domain/`, `marca.ts` |
| 3 | Puerto, fake, adaptador R2, regla depcruise, tipos | PR 1 | `pnpm test src/modules/marca/application/almacenDePrueba.test.ts` | `pnpm check` (regla S3) | Revert `application/`, `infrastructure/`, `types.ts` |
| 4 | Caso de uso + T10 | PR 1 | `pnpm test:integration -- cambiarEscudo escudo.isolation` | `pnpm db:local`, Motul y Ticul sembrados | Revert `application/cambiarEscudo.ts`, `escudo.isolation.test.ts` |
| 5 | Composicion, Server Action, UI, ruta | PR 1 | `pnpm test src/modules/marca/ui` | Manual: subir PNG en `pnpm dev` (`R2_*` reales) | Revert `composicion.ts`, `ui/`, `app/(acceso)/marca/` |
| 6 | Exportacion y documentacion | PR 1 | `pnpm test:integration -- exportar` | N/A — export y docs sin IO nuevo | Revert `exportar.ts`, docs tocados |

## Phase 0: Verificacion previa (bloquea Fase 5)

- [ ] 0.1 Con la herramienta MCP `context7`, confirmar contra documentacion
      real de Next.js 16 que en un archivo `"use server"` la restriccion
      cae solo sobre sus exports (deben ser funciones async) y no sobre lo
      que importa. Si el tool no esta disponible en esta sesion, la tarea
      queda pendiente para quien ejecute `sdd-apply`, antes de escribir
      `composicion.ts` (Fase 5).

## Phase 1: Cimientos compartidos

- [ ] 1.1 RED `src/shared/lib/errores.test.ts` (nuevo) — `ActionResult<T>`
      y `mapearError` despachando por `codigo` para los cinco casos de la
      tabla de la seccion 9 del design.
- [ ] 1.2 GREEN `ActionResult<T>` y `mapearError` en
      `src/shared/lib/errores.ts`.
- [ ] 1.3 RED en `src/shared/auth/roles.test.ts` — `puedeCambiarMarca`
      contra los cuatro roles; solo `ADMIN_MUNICIPAL` pasa. [AR-1..3 en
      `specs/autorizacion-roles/spec.md`]
- [ ] 1.4 GREEN `puedeCambiarMarca` en `src/shared/auth/roles.ts`.

## Phase 2: Dominio de `marca` y `marca.ts`

- [ ] 2.1 RED `src/modules/marca/domain/png.test.ts` — los once casos de
      la seccion 4 del design (truncado, firma volteada, JPEG, `IEND`,
      79x80..2049x2048, 1 MiB +-1, bomba declarada), bytes armados con
      `pngDe(...)`, sin fixtures binarios.
- [ ] 2.2 GREEN `src/modules/marca/domain/png.ts` — `validarPng`,
      `VeredictoPng`, `MotivoDeRechazo`.
- [ ] 2.3 RED `src/modules/marca/domain/claveDeEscudo.test.ts` — el
      prefijo es el `ayuntamientoId`; el uuid entra por parametro.
- [ ] 2.4 GREEN `src/modules/marca/domain/claveDeEscudo.ts` +
      `domain/index.ts`.
- [ ] 2.5 Confirmar en verde, sin tocarlos, los quince tests actuales de
      `src/shared/ui/marca.test.ts` (linea base de regresion).
- [ ] 2.6 RED `describe("validarMarca")` nuevo en `marca.test.ts` — `{}`
      da `ok:true` con marca vacia; `{ primario: "url(//x)" }` da
      `ok:false` nombrando `primario`.
- [ ] 2.7 GREEN `validarMarca`, `ResultadoDeMarca` y export `urlDeAsset`
      en `src/shared/ui/marca.ts`; `leerMarca` reconstruido encima, misma
      firma y mismo resultado.
- [ ] 2.8 Confirmar que los quince tests viejos y los dos consumidores
      (`(acceso)/layout.tsx`, `(acceso)/acceso/page.tsx`) siguen verdes,
      sin modificarlos.

## Phase 3: Puerto, fake, adaptador R2, tipos publicos

- [ ] 3.1 GREEN `src/modules/marca/application/puertos.ts` — tipo
      `AlmacenDeAssets` (`guardar(clave, bytes): Promise<url>`,
      `borrar(url): Promise<void>`).
- [ ] 3.2 RED `src/modules/marca/application/almacenDePrueba.test.ts` —
      `borrar` no-opea si la URL no empieza con `R2_PUBLIC_URL`.
- [ ] 3.3 GREEN `src/modules/marca/application/almacenDePrueba.ts` +
      `application/index.ts`.
- [ ] 3.4 Agregar regla `s3-solo-desde-el-almacen-de-assets` a
      `.dependency-cruiser.cjs` (seccion 10 design). Provocarla una vez
      con un import de `@aws-sdk/client-s3` fuera de
      `infrastructure/almacenR2.ts`, confirmar `pnpm check` en rojo, y
      revertir el import de prueba.
- [ ] 3.5 GREEN `src/modules/marca/infrastructure/almacenR2.ts` —
      `PutObjectCommand`/`DeleteObjectCommand`, lectura y validacion
      perezosa de `R2_*` dentro de la primera llamada. Sin test unitario:
      necesita credenciales reales, fuera de CI.
- [ ] 3.6 GREEN `infrastructure/index.ts`; `package.json` suma
      `@aws-sdk/client-s3`; `.env.example` suma las cinco `R2_*`.
- [ ] 3.7 GREEN `src/modules/marca/types.ts` — `EntradaDeEscudo`,
      `EscudoCambiado`.

## Phase 4: Caso de uso y aislamiento (T10)

- [ ] 4.1 RED `src/modules/marca/application/cambiarEscudo.integration.test.ts`
      contra `almacenDePrueba` + Postgres real — rol, PUT antes de la
      transaccion, clave con el `ayuntamientoId` del contexto (no de un
      parametro), traza en la misma transaccion, borrado del anterior
      despues del commit, borrado fallido no cambia `ok:true`, marca
      previa con color invalido no escribe nada.
- [ ] 4.2 GREEN `src/modules/marca/application/cambiarEscudo.ts` — el
      flujo completo de la seccion 5 del design.
- [ ] 4.3 RED `src/modules/marca/escudo.isolation.test.ts` — el
      `ADMIN_MUNICIPAL` de Motul no cambia la marca de Ticul; RLS corta
      aunque el id se falsee. [T10]
- [ ] 4.4 Confirmar 4.1 y 4.3 en verde contra Postgres real
      (`pnpm db:local`); sin codigo nuevo si 4.2 ya cubre el camino.

## Phase 5: Composicion, Server Action, UI (depende de 0.1)

- [ ] 5.1 GREEN `src/modules/marca/composicion.ts` — une la fabrica de
      `cambiarEscudo` con `almacenR2`; sin condicionales, sin `await`.
- [ ] 5.2 RED test de `cambiarEscudo.action.ts` — sin sesion da
      `NO_AUTORIZADO`; archivo invalido o > 1 MiB da
      `VALIDACION.campos.escudo`.
- [ ] 5.3 GREEN `src/modules/marca/ui/actions/cambiarEscudo.action.ts` —
      `"use server"`, `esquemaDeEntrada.safeParse`, `contextoActual()`,
      llama a `composicion.ts`, `ActionResult`,
      `revalidatePath("/marca")`, `revalidatePath("/acceso")`.
- [ ] 5.4 GREEN `src/modules/marca/ui/FormularioDeEscudo.tsx` —
      `"use client"`, input de archivo, React Hook Form, error por campo.
- [ ] 5.5 GREEN `ui/index.ts` y `src/modules/marca/index.ts` (barril:
      `export * from "./application"`, `"./ui"`, `export type * from
      "./types"`).
- [ ] 5.6 GREEN `src/app/(acceso)/marca/page.tsx` — ruta fina, redirige
      sin sesion, compone el formulario.

## Phase 6: Exportacion

- [ ] 6.1 RED caso en `src/shared/exportacion/exportar.isolation.test.ts`
      — municipio con escudo trae `marca` con esos valores; municipio sin
      marca trae `{}`.
- [ ] 6.2 GREEN `marca` en `Exportacion["ayuntamiento"]` y en
      `municipioDe`, `src/shared/exportacion/exportar.ts` (validada, no
      el `jsonb` crudo).

## Phase 7: Documentacion y cierre

- [ ] 7.1 Corregir `docs/06-frontend.md` seccion 6 (arbol de
      `src/shared/ui/`) — quitar `branding/` inexistente; documentar el
      reparto real entre `shared/ui/marca.ts` y `modules/marca/`.
- [ ] 7.2 `docs/adr/0001-decisiones-tecnicas-fase-0.md` — seccion nueva:
      bucket de un proposito, clave opaca, PNG unicamente, borrado
      diferido.
- [ ] 7.3 `docs/architecture/invariantes-criticos.md` — T10 deja de estar
      sin test; referenciar `escudo.isolation.test.ts`.
- [ ] 7.4 `pnpm test`, `pnpm test:integration` (con `pnpm db:local`) y
      `pnpm check` en verde.
- [ ] 7.5 Commits convencionales en espanol, uno por fase coherente
      (1-2 pueden ir en un mismo commit si quedan chicos); sin atribucion
      de IA.
