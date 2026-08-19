```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:7886f84b41e1c3b78481ff2a8ddf0148f7dac73c06425759c401c5bff32e5702
verdict: fail
blockers: 2
critical_findings: 2
requirements: 13/16
scenarios: 20/23
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:9000d2e09bb19b8aca22a69ac1218fb5901f12ccb90bc799bda4d8f3166151dd
build_command: pnpm check
build_exit_code: 0
build_output_hash: sha256:06f9d4892c28530253925aecb459d59f6fe0bda34938e8490d54a138a3e0f66b
```

## Verification Report

**Change**: auth-rbac
**Version**: N/A (delta specs, no prior openspec/specs/ for these three capabilities)
**Mode**: Strict TDD
**Corrida**: segunda (post-correccion), contra el reporte previo
`sdd/auth-rbac/verify-report` obs #4362 / `openspec/changes/auth-rbac/verify-report.md`.

**Nota sobre el orden.** El codigo de `auth-rbac` ya esta mergeado a `main`
(`8d971f9`, PRs #2 y #3 fusionados). Esta verificacion **no es una
compuerta previa al merge**: es una confirmacion posterior. La correccion
del ghost loop evaluada aqui **todavia no esta commiteada** — vive como
cambio sin commitear sobre `main` (`git diff HEAD` sobre
`src/shared/auth/accesoCruzado.integration.test.ts`, 15 lineas agregadas).
Cualquier hallazgo en rojo de este reporte ya esta en `main` o en el
working tree encima de `main`, no en una rama pendiente de aprobar.

### Que cambio desde la corrida anterior

Se corrigio **uno de tres** CRITICAL: el ghost loop en
`accesoCruzado.integration.test.ts`. Se agregaron dos capturas
`antesEnTicul`/`antesEnMotul` antes del `acceso(enTicul)` y dos
aserciones de delta (`toHaveLength(antesEnTicul.length + 1)` y
`toHaveLength(antesEnMotul.length)`) antes de los dos `for` que antes
eran el unico guardian. La correccion es necesaria porque el archivo no
limpia entre `it` (solo `beforeAll`/`afterAll`): un `toHaveLength(0)`
absoluto habria sido incorrecto, dado que los tests anteriores del mismo
`describe` ya insertaron sesiones en Ticul y Motul.

Verificado en esta corrida, no solo leido:
- El archivo completo corre en verde: `pnpm vitest run --reporter=verbose
  src/shared/auth/accesoCruzado.integration.test.ts` → 7/7, incluido el
  caso corregido.
- `pnpm test` completo sigue en 187/187 (mismo total que la corrida
  anterior).
- Barrido de todo el repo (`rg` sobre `for (const ... of` y `.forEach(`
  en `**/*.test.ts`) para confirmar que el patron "loop sobre resultado
  de consulta sin `.toHaveLength()` previo" no aparece en ningun otro
  archivo. Resultado: cero coincidencias nuevas. Los demas `for` del
  repo iteran listas estaticas no vacias conocidas en compile-time
  (`ROLES`, `todosMenos(...)`, arreglos literales de codigos reservados);
  ninguno itera sobre un resultado de `tx.select()...`. No hay ningun
  `.forEach()` en archivos `*.test.ts` del repo.

Los otros dos CRITICAL de la corrida anterior **siguen sin arreglar, tal
como se esperaba** — no se toco nada para cerrarlos:
- No existe artefacto `apply-progress` consolidado. Se repitio la busqueda
  (`mem_search("sdd/auth-rbac/apply-progress")`) y no devolvio un
  observation propio (el unico resultado devuelto por proximidad de
  prefijo es el propio `verify-report` #4362, no un `apply-progress`).
  Tampoco existe como archivo en `openspec/changes/auth-rbac/`.
- `pnpm test:e2e` se volvio a ejecutar en esta corrida (para confirmar
  estado, no como gate) y falla igual que antes: 6/6 casos de
  `e2e/acceso.spec.ts` fallan con
  `browserType.launch: Executable doesn't exist at
  .../chromium_headless_shell-1234/chrome-headless-shell` — el cache
  local sigue en la build `1223`. Mismo defecto de entorno, sin cambios.

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 73 |
| Tasks complete | 73 |
| Tasks incomplete | 0 |

Sin cambios respecto a la corrida anterior (`rg -c '^\s*-\s*\[x\]'` = 73,
`rg -c '^\s*-\s*\[ \]'` = 0 sobre `tasks.md`).

### Build & Tests Execution

**Build**: PASSED
```text
$ pnpm check
$ pnpm lint && pnpm typecheck && pnpm layers
$ biome check .
Checked 81 files in 65ms. No fixes applied.
Found 2 warnings. [ver Quality Metrics — no bloquean, exit 0]
$ tsc --noEmit
$ depcruise src
✔ no dependency violations found (88 modules, 282 dependencies cruised)
EXIT_CODE=0
```

**Tests**: 187 passed / 0 failed / 0 skipped
```text
$ pnpm test
 RUN  v4.1.10 /Users/joelmay/Documents/Projects/xula-sigma
 Test Files  30 passed (30)
      Tests  187 passed (187)
   Duration  15.36s
EXIT_CODE=0
```

Mismo desglose por proyecto que la corrida anterior: `unit` 11
archivos/91 tests, `integration` 19 archivos/96 tests (incluye los cinco
`*.isolation.test.ts` de las tablas con `ayuntamiento_id`), todos en
verde con Postgres real en `xula-pg:55432`.

| Tabla | Archivo | Casos | Resultado |
|---|---|---|---|
| `usuarios` | `usuarios.isolation.test.ts` | 6 | ✅ 6/6 |
| `sesiones` | `sesiones.isolation.test.ts` | 5 | ✅ 5/5 |
| `cuentas` | `cuentas.isolation.test.ts` | 5 | ✅ 5/5 |
| `verificaciones` | `verificaciones.isolation.test.ts` | 4 | ✅ 4/4 |
| `intentos_acceso` | `intentosAcceso.isolation.test.ts` | 5 | ✅ 5/5 |

**E2E (Playwright) — re-confirmado sin cambios, sigue sin poder
ejecutar.** `pnpm test:e2e` se corrio de nuevo en esta sesion (no solo
se leyo el reporte previo) y fallo con el mismo error:
`browserType.launch: Executable doesn't exist at
.../chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/
chrome-headless-shell`. El cache local tiene `chromium-1223` y
`chromium_headless_shell-1223`, no `-1234`. Los 6 casos de
`e2e/acceso.spec.ts` —incluido "la cookie de Motul no abre sesion en
Ticul"— no corrieron. Sigue siendo CRITICAL 2 (renumerado).

**Coverage**: 92.94% sentencias / 81.13% ramas / 92.75% funciones /
93.48% lineas — umbral 80/75/80/80 → ✅ Por encima en las cuatro
metricas, medido sobre `unit`+`integration` juntas
(`pnpm vitest run --coverage`, exit 0). Numeros identicos a la corrida
anterior — la correccion del ghost loop no agrega ni quita lineas
ejecutables de produccion, solo aserciones de test.

Archivos con rama por debajo del 80% (no incumplen el piso global de
75%, deuda ya declarada en `tasks.md` 5.8):

| Archivo | %Ramas | Nota |
|---|---|---|
| `shared/tenancy/provision.ts` | 50% | linea 41 sin cubrir |
| `shared/auth/contexto.ts` | 83.33% | linea 49 |
| `shared/auth/...ntosAcceso.ts` (limitarRitmo helper) | 100%/0% funciones | una funcion sin invocar en los tests |
| `shared/lib/errores.ts` | 60% | lineas 51-65 |

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ⚠️ Parcial | Sigue sin existir un `apply-progress` consolidado con tabla "TDD Cycle Evidence". Sin cambios respecto a la corrida anterior. |
| All tasks have tests | ✅ | 73/73, sin cambios |
| RED confirmed (tests exist) | ✅ | Sin cambios |
| GREEN confirmed (tests pass) | ✅ | 187/187 en esta corrida (incluye el test corregido) |
| Triangulacion adecuada | ✅ | Sin cambios |
| Safety Net para archivos modificados | ⚠️ | `accesoCruzado.integration.test.ts` se modifico en esta sesion (15 lineas agregadas, sin commitear); el archivo completo se re-corrio antes y despues del cambio (7/7 en ambos casos) — hay red de seguridad real, pero no hay un `apply-progress` que lo declare en tabla |

**TDD Compliance**: 5/6 checks en verde, 1 parcial (mismo hallazgo que la
corrida anterior, sin cambios).

---

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 91 | 11 | Vitest, sin IO |
| Integration (incluye isolation) | 96 | 19 | Vitest + Postgres 18 real |
| E2E | 0 ejecutados / 6 declarados | 1 (`e2e/acceso.spec.ts`) | Playwright — sigue sin binario compatible en esta maquina |
| **Total ejecutado** | **187** | **30** | |

---

### Changed File Coverage

Sin cambios respecto a la corrida anterior — ver tabla en "Build & Tests
Execution — Coverage". La correccion de esta sesion es solo en un
archivo de test (`accesoCruzado.integration.test.ts`), que no forma
parte del `include` de cobertura (los tests no se miden a si mismos).

---

### Assertion Quality

| File | Line | Assertion | Issue | Severity | Estado |
|------|------|-----------|-------|----------|--------|
| `src/shared/auth/accesoCruzado.integration.test.ts` | 118-139 | `for (const sesion of deTicul) expect(...)` / `for (const sesion of deMotul) expect(...)` | Ghost loop original: ninguna de las dos colecciones tenia un `.toHaveLength()` previo. | CRITICAL | ✅ **RESUELTO** — se agregaron `antesEnTicul`/`antesEnMotul` (capturados antes del `acceso`) mas `expect(deTicul).toHaveLength(antesEnTicul.length + 1)` y `expect(deMotul).toHaveLength(antesEnMotul.length)` antes de los dos `for`. Los `for` ahora solo verifican el campo `ayuntamientoId` de un conjunto cuyo tamano ya esta garantizado por el delta. Confirmado leyendo el archivo (lineas 117-140) y con la corrida verbose 7/7. |

**Barrido completo repetido en esta corrida** (no solo el archivo
corregido): se escaneo todo `**/*.test.ts` buscando `for (const ... of`
y `.forEach(` para confirmar que el patron no reaparece en otro lado.
Cero coincidencias nuevas — los demas `for` iteran `ROLES`,
`todosMenos(...)` o arreglos literales, todos no vacios por
construccion en tiempo de compilacion, no resultados de consulta. Cero
`.forEach()` en archivos de test.

**Assertion quality**: 0 CRITICAL, 0 WARNING (el unico CRITICAL de la
corrida anterior quedo resuelto y verificado; sin hallazgos nuevos)

---

### Quality Metrics

**Linter**: ⚠️ 2 warnings — identicos a la corrida anterior, sin cambios
```text
src/app/(acceso)/acceso/page.tsx:33:11 lint/performance/noImgElement
  ! Don't use <img> element (usar next/image).

src/app/(acceso)/acceso/page.tsx:30:11 suppressions/unused
  ! Suppression comment has no effect. Remove the suppression or make
    sure you are suppressing the correct rule.
```
Sigue sin corregirse: el comentario `biome-ignore
lint/performance/noImgElement` en la linea 30 ya no suprime nada, y el
warning de `noImgElement` sigue apareciendo igual dos lineas mas abajo.
No bloquea (`exit 0`). No se toco en esta correccion — fuera del alcance
declarado por el orquestador ("se corrigio UNO solo de los tres
CRITICOS").

**Type Checker**: ✅ Sin errores (`tsc --noEmit`, incluido en `pnpm check`)
**Dependency layers**: ✅ Sin violaciones (`depcruise src`, 88 modulos,
282 dependencias)

## Spec Compliance Matrix

Sin cambios respecto a la corrida anterior: la correccion de esta sesion
arregla la calidad de una asercion en un test que no mapea directamente a
ningun requisito/escenario de la tabla de abajo (el test corregido
verifica que la sesion se crea en el tenant del request, un mecanismo de
soporte, no un escenario MUST del spec en si). Los conteos de
completitud no se mueven.

### Dominio: autenticacion-municipal (6 requisitos, 8 escenarios)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Aislamiento de autenticacion por ayuntamiento | Contrasenia correcta en subdominio equivocado | Sin test directo de una sola cuenta accedida desde otro municipio. Mecanismo probado indirectamente: `usuarios.isolation.test.ts` + `accesoCruzado.integration.test.ts > cada quien accede en su municipio` | ⚠️ PARTIAL |
| Aislamiento de autenticacion por ayuntamiento | Mismo correo en dos municipios son dos cuentas | `accesoCruzado.integration.test.ts > el mismo correo existe en los dos municipios, como dos personas` | ✅ COMPLIANT |
| Baja logica bloquea el acceso | Usuario dado de baja intenta iniciar sesion | `accesoCruzado.integration.test.ts > una persona dada de baja no accede, y la del otro municipio si` | ✅ COMPLIANT |
| Sesion por subdominio | La cookie no viaja a otro subdominio | `e2e/acceso.spec.ts > la cookie de Motul no abre sesion en Ticul` — **no ejecutable en esta maquina** (Playwright sin binario compatible, re-confirmado en esta corrida) | ❌ UNTESTED (esta sesion) |
| ayuntamiento_id nunca llega desde el cliente | Un body con ayuntamiento_id ajeno no cambia el tenant | `camposNoEscribibles.integration.test.ts > update-user con ayuntamientoId no muda a nadie de municipio` | ✅ COMPLIANT |
| Limitacion de ritmo sin bloqueo persistente | Intentos fallidos repetidos activan limitacion temporal | `ritmo.isolation.test.ts > deja pasar los primeros intentos y corta en el limite` + `la ventana se vacia con el tiempo` | ✅ COMPLIANT |
| Aislamiento de las tablas de autenticacion | Consulta sin filtro de tenant sobre `user` | `usuarios.isolation.test.ts > una consulta sin filtro solo devuelve el usuario del tenant activo` | ✅ COMPLIANT |
| Aislamiento de las tablas de autenticacion | `verification` sin userId tambien queda aislada | `verificaciones.isolation.test.ts` + `verificacionPorAdaptador.integration.test.ts > un token de Motul no se canjea desde Ticul` | ✅ COMPLIANT |

### Dominio: autorizacion-roles (6 requisitos, 10 escenarios)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Los cuatro roles y su alcance | OPERADOR no puede administrar usuarios | `restablecerContrasenia.integration.test.ts > OPERADOR no administra usuarios` | ✅ COMPLIANT |
| Los cuatro roles y su alcance | CONSULTA no puede modificar registros | `darDeBajaUsuario.integration.test.ts > CONSULTA no da de baja a nadie` + `roles.test.ts > puedeEscribir > CONSULTA es el unico de solo lectura` | ✅ COMPLIANT |
| La regla de autorizacion es pura y vive en dominio | La regla de rol se evalua sin acceso a datos | `roles.test.ts > las reglas son puras > la misma entrada devuelve lo mismo y no toca nada de afuera` | ✅ COMPLIANT |
| 403 de rol nunca convierte un 404 de tenant en 403 | ADMIN_MUNICIPAL pide un recurso de otro ayuntamiento | `restablecerContrasenia.integration.test.ts > un usuario de otro municipio es NO_ENCONTRADO, no NO_AUTORIZADO` + `darDeBajaUsuario > dar de baja a alguien de otro municipio es NO_ENCONTRADO` | ✅ COMPLIANT |
| 403 de rol nunca convierte un 404 de tenant en 403 | Un rol sin permiso sobre un recurso propio recibe 403 | `restablecerContrasenia > un rol sin permiso sobre un usuario ajeno tambien es NO_ENCONTRADO` (orden invertido, task 3.7) | ✅ COMPLIANT |
| Restablecimiento de contrasenia limitado por rol | ADMIN_MUNICIPAL restablece a su gente | `restablecerContrasenia > ADMIN_MUNICIPAL restablece a su OPERADOR` | ✅ COMPLIANT |
| Restablecimiento de contrasenia limitado por rol | SUPER_ADMIN no puede restablecer a un OPERADOR | `restablecerContrasenia > SUPER_ADMIN no restablece a un OPERADOR` | ✅ COMPLIANT |
| Restablecimiento de contrasenia limitado por rol | SUPER_ADMIN restablece al ADMIN_MUNICIPAL trabado | `restablecerContrasenia > la regla deja al SUPER_ADMIN restablecer a un ADMIN_MUNICIPAL` + `restablecerAdmin.isolation.test.ts > cambia la del administrador y solo esa` (script operado a mano, tarea 4.16) | ✅ COMPLIANT |
| Todo restablecimiento deja traza en bitacora | La bitacora registra actor y afectado | `restablecerContrasenia > deja traza en bitacora con actor y afectado` | ✅ COMPLIANT |
| Baja logica de usuarios | Baja logica conserva la autoria de documentos previos | `darDeBajaUsuario > la baja conserva las trazas que referencian a esa persona` | ✅ COMPLIANT |

### Dominio: provision-ayuntamientos (4 requisitos, 5 escenarios)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Solo SUPER_ADMIN da de alta un ayuntamiento | ADMIN_MUNICIPAL intenta dar de alta un municipio | Sin test que ejerza literalmente un intento de un ADMIN_MUNICIPAL. La regla se aplica por segregacion de conexion Postgres (`withAltaDeAyuntamiento` solo alcanzable via `SUPER_ADMIN_DATABASE_URL`). Mas fuerte que un 403 en runtime, pero sin test directo. | ⚠️ PARTIAL |
| El alta crea el ayuntamiento y su primer ADMIN_MUNICIPAL de forma atomica | Alta exitosa deja un administrador que puede entrar | `provision.isolation.test.ts > crea el ayuntamiento y su primer ADMIN_MUNICIPAL` | ✅ COMPLIANT |
| El alta crea el ayuntamiento y su primer ADMIN_MUNICIPAL de forma atomica | Fallo al crear el administrador revierte el ayuntamiento | `provision.isolation.test.ts > si falla el administrador no queda el ayuntamiento huerfano` | ✅ COMPLIANT |
| El alta corre bajo el rol Postgres de SUPER_ADMIN | El test de esquema cubre el tercer rol | `esquema.isolation.test.ts > ningun rol del sistema es superusuario ni tiene BYPASSRLS` + `xula_super_admin tiene exactamente los privilegios de tabla que necesita` | ✅ COMPLIANT |
| El alta deja traza en bitacora | La bitacora registra el alta | `provision.isolation.test.ts > deja traza del alta en bitacora sin que el llamador la escriba` | ✅ COMPLIANT |

**Compliance summary**: 20/23 escenarios COMPLIANT, 2/23 PARTIAL, 1/23
UNTESTED en esta sesion (bloqueado por entorno, no por codigo) — sin
cambios respecto a la corrida anterior.

### Correctness (Static Evidence)

Sin cambios respecto a la corrida anterior; ver el reporte previo
(obs #4362) para el detalle completo. Re-confirmado por lectura directa
en esta sesion: tres capas contra acceso sin tenant, cinco tablas con
RLS/FORCE/politica/GRANT, roles como conjunto cerrado, tercer rol
Postgres, registro publico apagado, limitador de ritmo propio.

### Coherence (Design)

Sin cambios respecto a la corrida anterior; ver el reporte previo
(obs #4362) para las ocho decisiones (D1-D8) y el desvio documentado de
`puedeAdministrarUsuarios`/`puedeRestablecerContrasenia`.

### Issues Found

**CRITICAL**:
1. **(renumerado, antes #3)** El escenario "La cookie no viaja a otro
   subdominio" (autenticacion-municipal) sigue sin un test que haya
   pasado en runtime en esta verificacion: `pnpm test:e2e` se volvio a
   ejecutar en esta sesion y los 6 casos de `e2e/acceso.spec.ts` fallan
   con `browserType.launch: Executable doesn't exist at
   .../chromium_headless_shell-1234/...` — el cache local tiene la build
   `1223`. El requisito es MUST y esta verificacion no puede confirmarlo
   hoy, aunque exista un reporte historico en Engram (`#4353`) de que
   paso durante el `apply` original. Sin cambios desde la corrida
   anterior — fuera de alcance de esta correccion, tal como se declaro.
2. **(renumerado, antes #1)** No existe un artefacto `apply-progress`
   consolidado (ni en Engram bajo `sdd/auth-rbac/apply-progress`, ni
   como archivo en `openspec/changes/auth-rbac/`). El modulo
   strict-tdd-verify exige una tabla "TDD Cycle Evidence" auditable; lo
   que hay es evidencia RED/GREEN distribuida en `tasks.md` (73/73
   tareas) y 5 notas Engram por PR. Re-confirmado en esta corrida
   (`mem_search` repetido, mismo resultado negativo). Sin cambios desde
   la corrida anterior — fuera de alcance de esta correccion, tal como
   se declaro.

**RESUELTO desde la corrida anterior**:
1. Ghost loop en `accesoCruzado.integration.test.ts:117-140` — ver tabla
   "Assertion Quality". Corregido con dos aserciones de delta antes de
   los dos `for`. Verificado con corrida verbose (7/7) y barrido
   completo del repo sin coincidencias nuevas del mismo patron.

**WARNING**:
1. Comentario de supresion sin efecto en
   `src/app/(acceso)/acceso/page.tsx:30` — sin cambios desde la corrida
   anterior, fuera de alcance de esta correccion.
2. Cobertura de rama despareja entre archivos (`provision.ts` 50%,
   `errores.ts` 60%) — sin cambios, deuda ya declarada en `tasks.md`
   5.8.
3. **(nuevo)** La correccion del ghost loop todavia no esta commiteada:
   vive como cambio sin commitear encima de `main` (`8d971f9`). El
   working tree tambien tiene tres archivos de documentacion
   modificados sin relacion con `auth-rbac` (`AGENTS.md`, `CLAUDE.md`,
   `docs/04-calidad.md` — politica de ciclo de revision), que esta
   verificacion no evaluo por estar fuera del alcance del cambio
   `auth-rbac`.

**SUGGESTION**:
1. No hay un test unico que compare, lado a lado, el mensaje/status de
   las cuatro razones de rechazo de acceso — sin cambios.
2. El escenario "Contrasenia correcta en el subdominio equivocado" no
   tiene una prueba de una sola cuenta accedida desde otro municipio —
   sin cambios.

### Verdict
FAIL

Dos hallazgos CRITICAL siguen abiertos, tal como el orquestador anticipo:
falta un `apply-progress` consolidado con tabla "TDD Cycle Evidence", y
el escenario MUST "la cookie no viaja a otro subdominio" no tiene un test
que haya pasado en runtime en esta maquina (Playwright sin binario
compatible). El tercer CRITICAL de la corrida anterior — el ghost loop en
`accesoCruzado.integration.test.ts` — **quedo resuelto y verificado**:
aserciones de delta agregadas, 7/7 en verde, y un barrido completo del
repo confirma que el patron no reaparece en ningun otro archivo de test.
187/187 tests pasan, cobertura por encima del piso en las cuatro
metricas, `pnpm check` en cero, 20/23 escenarios de spec compliant. **El
codigo base ya esta en `main`**; la correccion evaluada aqui vive sin
commitear sobre esa base. Este veredicto no bloquea un merge que ya
ocurrio, y se reporta en rojo tal como salio, sin suavizarlo: dos de tres
CRITICAL siguen pendientes de una decision humana (recuperar
`apply-progress` retroactivamente o aceptar su ausencia como excepcion; y
reparar el cache de Playwright o aceptar el reporte historico de Engram
como evidencia suficiente).
