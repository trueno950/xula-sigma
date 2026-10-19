> **Documento de archivo (2026-10-19).** El plan que describe cerró: sus cinco
> rebanadas están en `main`. Las ramas que nombra ya no existen; el historial de
> cada una vive en los PRs que el propio documento cita. Se rescató de la rama
> local `fix/presentacion-y-404-interno` al retirarla.

# Correcciones de la revisión con navegador

## Objetivo
Corregir los hallazgos de la revisión end-to-end con navegador real
(2026-09-25, `main` en e0d2cb2, dos pasadas: @playwright/test y agent-browser),
sin cambiar el alcance funcional de los módulos.

## Alcance y decisiones
- Cinco rebanadas de trabajo, con las ramas registradas en cada sección
  (S2 y S5 tocan el login de S1). La persona autorizó PRs secuenciales a
  `main`, sin apilarlos: el siguiente se abre después del merge del anterior.
  Cada PR posterior requiere un issue nuevo aprobado; el merge queda a cargo
  de una persona.
- Decisiones de producto tomadas aquí, revisables:
  - B1: el envío de login nunca viaja por GET; el botón queda deshabilitado
    hasta hidratar y el formulario declara `method="post"`.
  - B7: la constancia cancelada se sigue descargando pero el PDF lleva la
    marca "CANCELADA" y el detalle deja de ofrecer "Imprimir".
  - B3: la búsqueda del padrón suma prefijo de palabra y CURP a la similitud
    por trigramas; no la reemplaza.
- Fuera de alcance (son funcionalidades, no defectos): lista y alta de
  `/intervenciones`, paginado del selector de domicilios en mudanza,
  separación de marcadores apilados en el mapa.

## Configuración de trabajo

**Esta rama es la casa del seguimiento:** `odd/` no vive en `main`; no
borrar `fix/presentacion-y-404-interno` ni soltar el worktree que la tiene.
(2026-10-01: limpieza de ramas locales, 63 → 2 — quedaron `main` y esta.)
- TDD: activo (fuente: CLAUDE.md del proyecto). Runner:
  `pnpm vitest run --project unit|integration <archivo>`; integración con
  `pnpm db:local`. Sin `rtk` para tests ni psql.
- Verificación por unidad: `pnpm reglas`, `pnpm typecheck`, `pnpm check`.
- Commits en español, scope del enum cerrado, header ≤72, sin atribución.

## Rebanadas y tareas
### S1 · acceso (rama `fix/acceso-envio-y-subdominio`)
- [x] S1.1 B1 login sin GET con clave en la URL (POST + deshabilitado hasta hidratar) — 168d67e
- [x] S1.2 mensajes del login: limpiar error previo, copia "demasiado corta" (la regla es min 12) — 168d67e
- [x] S1.3 foco visible en inputs del login — 168d67e
- [x] S1.4 B2 subdominio sin municipio responde 404, no 500 — 0177e2a

### S2 · sesión y navegación (rebanadas en ramas independientes)
- [x] S2.1 B4 control de cerrar sesión en el panel — 6ca2bb7
- [x] S2.2 hub `/` enlaza todos los módulos y muestra el rol legible — replay `03708de`; limpieza de comentarios `55b0cb2`; PR #78 merge `76e130e`
- [x] S2.3 títulos de página por ruta — af14c14
- [x] S2.3.1 comprobar la sesión justo después del backoff de reintento y no volver a navegar a `/acceso` tras un login exitoso; prueba E2E RED/GREEN con timeout de navegación independiente del timeout de acciones — `58ef8a0`.
- [x] S2.4 (medido: outline none confirmado en botón/campo, arreglado — 6f83ea3) anillo de foco compartido: `ANILLO_DE_FOCO` (`src/shared/ui/estilos.ts:27`) mezcla `outline-none` con `focus-visible:outline`; el writer de S1 midió outline-style none en Tailwind 4, la revisión con agent-browser lo vio sólido: medir primero, corregir si se confirma y reusar el compartido en el login (hallazgo R2 de la revisión nativa de S1)
- [x] S2.5 (afd5be2, 0eeb656 acceder.ts) e2e de acceso sin JS: la aserción de URL es vacua si el formulario ya no navega; hacerla falsable (hallazgo R3 de la revisión nativa de S1)

- [x] S2.6 (cdfeba9; sin jsdom en el repo: lógica del clic extraída a `cerrarYVolver`, el enganche de React sin test automático) cerrar sesión: el botón queda atascado si fetch lanza algo que no es TypeError, y no hay test de clic (hallazgo R3 de la revisión nativa de S2)

### S3 · flujos de captura (rama `fix/captura-busqueda-cabecera-duplicado`)
- [x] S3.1 B3 búsqueda del padrón por apellido suelto y por CURP — 34d3833
- [x] S3.2 B5 segunda cabecera: mensaje claro y opción no ofrecida — bc409f3
- [x] S3.3 B6 duplicado se indica por folio, no por UUID — c3d99a1
- [x] S3.C1 Corrección de revisión: prioridad CURP, límite de palabras y plan real de búsqueda — e8b3508; pruebas de regresión retrospectivas.
- [x] S3.C2 Corrección de revisión: cabecera incluyendo bajas — 8b7a4d7; integración y aislamiento.
- [x] S3.C3 Corrección de revisión: folio sin año fijo y comentarios — c634bc8.
- [x] S3.C4 Eliminar dos duplicaciones de comentarios detectadas por CI del head c634bc8; sin cambio de lógica — e2ee6f6, IA del run 36807604953 aprobada.
- [x] S3.C5 Corrección de los dos hallazgos de métrica del run 36813991858 (funciones >30 líneas): `consultaDeBusqueda` y `cargarTerritorio` partidas, con `cargaDeTerritorio.ts` nuevo — `a8db3be`, `afbb4d8`; unit 135 e integración 55 en verde.
- [x] S3.C6 El run 36815478437 confirmó que las métricas quedaron dentro del tope, pero GGA abortó por `STRICT_MODE`: `deepseek-flash` no emitía `STATUS:`. Se exige en el prompt del revisor — `74c7dd0`.
- [x] S3.GGA GGA revisa con DeepSeek Flash en CI y en local: `PROVIDER` en `.gga` y `revision:local*` sin sobrescribir el proveedor — `89b553a`.
- [x] S3.CI CI del head `74c7dd0` en 5/5 (run 36816821629), incluida Revisión de IA con `deepseek-flash`; PR #84 mergeable.
- [x] S3.MERGE PR #84 integrado en `main` en `fa3de55f826a0c8ff32d6a03a096dd4ff06abad6` (2026-10-01T05:08:40Z, squash, verificado con `gh` y `git merge-base --is-ancestor`).

### S4 · integridad (rama histórica `fix/integridad-404-pdf-marca`; replay en rama fresca)
- [x] S4.R0 Conciliado: los seis cambios están ausentes de `origin/main` (`fa3de55`), verificado por contenido; la parte de `/territorio?raiz=` de S4.1 se reproduce adaptada al refactor `cargaDeTerritorio`.
- [x] S4.R1 Issue #85 aprobado por la persona y creado (`type:bug` + `status:approved`).
- [x] S4.R2 Rama `fix/404-pdf-y-limite-de-subida` desde `fa3de55`; seis cherry-picks con dos conflictos resueltos: `page.tsx` reestructurada (guarda de raíz antes del Suspense, vista en `TerritorioCargado` con el JSX vigente incluida `hayCabecera`) y `e2e/acceder.ts` combinando el parámetro `correo` con la salida temprana de S2.3.1 — `3db9243`, `90c3a7f`, `9a93d55`, `911f93a`, `653affe`, `ee723e6`.
- [x] S4.R3 Verificación: `pnpm check` en verde; unitarias 245/1417; integración 118/431 (un fallo único de sesión de Better Auth no reproducible en dos corridas completas, anotado como flake); E2E de aceptación `recursoAjeno` + `constanciaCancelada` en verde y `marca` 5/5 aislada (los tres specs seguidos estrellan la ventana del limitador de Better Auth, documentado en `acceder.ts`). PR #86 abierto (`type:bug` + `size:exception`, 34 archivos, +1190/-114).
- [x] S4.R4 El primer CI (run 36821776429) fallo solo en Revisión de IA con un hallazgo real de regla 8: las guardas de `?nodo=`, `?calle=` y `?domicilio=` quedaron dentro del Suspense (200). Se integro el nucleo de S5.6 replayendo `de2b4558` — `7f55bf8`, con comentario de alcance en #85 y en el PR. La reproduccion de S5b saltara su tarea S5.6.
- [x] S4.R5 CI del head `7f55bf8` en 5/5 (run 36873959018), incluida Revisión de IA con `deepseek-flash`; E2E `recursoAjeno` 3/3 con aserciones HTTP para los tres parametros.
- [x] S4.MERGE PR #86 integrado en `main` en `6c92fc83be331785ad550901e6bd0f337325dc1f` (2026-10-01T14:15:17Z, squash, verificado con `gh` y `git merge-base --is-ancestor`).
- [x] S4.1 soft-404 de `/padron/{id}` y `/territorio?raiz=` pasa a 404 — 46744c9, 14797e1
- [x] S4.2 B7 PDF de constancia cancelada marcado; sin "Imprimir" — 88341b6, 2c13a7b
- [x] S4.3 `/marca` con archivo >1 MiB muestra el mensaje en vez de fallar mudo — a9482dd, df9085a (límite de cuerpo de Server Actions 1 MB → 2 MB, global)
- [~] S4.4 DESCARTADA: conservar lo tecleado tras un error sin JS exige llevar los valores por URL o cookie; en el padrón son nombre y CURP y AGENTS.md prohíbe datos personales en logs/URL. Se conserva el comportamiento actual.

### S5a · etiquetas y acentos (rama `fix/copia-etiquetas-y-acentos`)
- [x] S5.1 B8 etiquetas legibles para estados, áreas, motivos (incl. ERROR_DE_CAPTURA en constancias) y tipos de lugar — replay `7988c3e`, `dbf4d8c`, `889e0ed`, `77c0b97` + constancias (de `3fd2edf`) en PR #88
- [x] S5.2 detalle de intervención muestra nombres/folio, no UUID — 22d27b2
- [x] S5.3 acentos en la copia de UI restante (incl. "Contrasenia" del login y sus localizadores e2e) — 7c0bcca, 7bbee8b, 4429d87, 3283fe5, 8ec6fb8, 0f558c9, dde779b, 5f8a8b1, 9c5de89, f7e8e68

### S5a · etiquetas y acentos (rama histórica `fix/copia-etiquetas-y-acentos`; replay en `fix/etiquetas-referencias-y-acentos`, PR #88)
- [x] S5a.R0 Los 16 commits verificados ausentes de `origin/main` (`6c92fc8`) por contenido; orden original confirmado.
- [x] S5a.R1 Issue #87 aprobado por la persona y creado (`type:bug` + `status:approved`).
- [x] S5a.R2 16 cherry-picks aplicados. Dos adaptaciones: (a) `AccionesDeReporte.test.tsx` conserva la ruta PascalCase de `main` con el contenido final de la pila — la pila lo renombraba a minúsculas y en FS insensible colapsaban dos rutas del índice, única colisión de caso de toda la pila; (b) `e2e/sesion.spec.ts` (`cf16501`, nacido en el replay de S2.1, ajeno a la pila histórica) cita `Módulos` con acento tras `7c0bcca`. Un bloqueo intermedio de `22d27b2` era stat-cache rancio del hook, refrescado con `git status`.
- [x] S5a.R3 Verificación: `pnpm check` verde; unitarias 258/1493; integración 119/435; E2E completo 40/40 (un fallo de `sesion.spec` corregido con `cf16501`). PR #88 abierto (`type:bug` + `size:exception`).
- [x] S5a.CI CI del head `b0c2466` en 5/5 (run 36883966106, reintento del job fallido). Dos corridas previas fallaron solo en Revisión de IA: (1) `cf16501` — informe completo con `STATUS: PASSED` en la línea 585, fuera de la ventana de 30 líneas de GGA; (2) `b0c2466` — respuesta vacía de deepseek-flash (flaker del proveedor). El prompt del revisor pasó a plantilla numerada (`b0c2466`); el contenido de ambas revisiones no halló bloqueantes.
- [x] S5a.MERGE PR #88 integrado en `main` en `27441e83faefde6b0ad55fdcfc450692398eb08e` (2026-10-01T15:43:07Z, squash esta vez — `b0c2466` no es ancestro; contenido verificado).
- [~] S5b inventariado: 10 commits de código por reproducir (`be5aece`, `4b179f8`, `7bd10bd`, `cb37390`, `0877175`, `53bef9d`, `fe842e9`, `0a41190`, `823a3bd` S5.7a, `9fb2015` S5.7b — estas dos últimas no estaban en la lista de tareas); `de2b4558` (S5.6) ya integrado en #86; los `docs(arquitectura)` del tracker no se reproducen.

### S5b · presentación y 404 interno (rama histórica `fix/presentacion-y-404-interno`; replay en `fix/presentacion-y-registros-seguros`, PR #90)
- [x] S5b.R0 Los 10 commits de código verificados ausentes de `origin/main` (`27441e8`); inventario completo en la nota de S5a.MERGE. `de2b4558` (S5.6) no se reproduce: ya está en #86.
- [x] S5b.R1 Issue #89 aprobado por la persona y creado (`type:bug` + `status:approved`).
- [x] S5b.R2 Los 10 cherry-picks aplicados sin conflictos — `8e220a4`..`9637f99`.
- [x] S5b.R3 Dos defectos de infraestructura de test corregidos en el camino: (a) `1eeeed2` — `cerrarConexion` en el `beforeAll` de los specs E2E mataba el pool de `withTenant` compartido por proceso de worker y el primer `withTenant` del spec siguiente reventaba con `write CONNECTION_ENDED` atribuido al primer test del archivo; sale de los specs y queda para scripts que terminan (`preparar.ts`); (b) `484b839` + `d2ffa94` — el helper de acceso dormía a ciegas 5s y re-navegaba encima de una sesión viva cuando la carga empujaba el redirect más allá de la ventana: `waitForURL` de 20s y `titulos.spec` tolera esa re-navegación inofensiva (un solo POST, 200, destino inicio).
- [x] S5b.R4 Verificación: `pnpm check` verde; unitarias 263/1502; integración 119/435; E2E completo 44/44 en la corrida final.
- [x] S5b.C5 Los tres hallazgos de la primera revisión de IA del PR #90 (run 36906555420, con la plantilla del STATUS ya parseando): (1) el efecto de `FilaDeModulos` dependía solo del montaje — ahora depende de la ruta, con el E2E navegando por clic; (2) el test paralelo de siembras sin aserciones y con un `Math.random` muerto — ahora fija folios distintos entre siembras; (3) `sembrarConstancias` por encima de 30 líneas — reserva extraída a `reservarBaseDeConsecutivos` — `d22c4e4`, `854719f`.
- [x] S5b.C6 Dos defectos de la suite E2E expuestos al correrla completa: el helper de acceso dormía a ciegas y re-navegaba sobre una sesión viva (`484b839`, `d2ffa94`, presupuesto del test a 60s en `0e5b8fd`) y la corrida aceptada es serializada — **E2E 44/44 con `--workers=1`**; con workers por defecto, el sign-in con argon2 supera las ventanas del helper bajo carga (flake documentado en el PR).
- [x] S5b.CI CI del head `0e5b8fd` en 5/5 (run 36912444956), con Revisión de IA PASSED bajo la plantilla STATUS-antes-de-herramientas.
- [x] S5b.MERGE PR #90 integrado en `main` en `b1d19862c6aa74f87f9d991508539ca424a56701` (2026-10-01T19:26:52Z, squash, verificado con `gh`).

## Cierre del plan

Las cinco rebanadas del plan (S1, S2, S3, S4, S5a/S5b) están integradas en
`main`: #72/#73, #75, #78, #80, #82, #84, #86, #88 y #90. Quedan dos
decisiones de la persona y una deuda de flujo:

1. El switch de la revisión nativa de este clon (presupuesto de lente
   agotado en el repositorio; documentado en S3).
2. Retomar el SDD pausado `direcciones-y-zonas-operativas` (27/40 tareas)
   y archivar `mapa-operativo-territorial` (completo, 21/21).
3. Seguimientos no bloqueantes heredados: el desplazamiento de
   `FilaDeModulos` en navegación cliente quedó corregido en #90; quedan los
   citados en cada rebanada (ADR 0002, índices de las ramas de búsqueda,
   colisión de folios entre tenants).
- [x] S5.4 `/marca` dentro de `PaginaDePanel`, con migaja desde `Inicio` y sin desbordamiento vertical — be5aece (ruta: delegada directa; página + prueba focal).
- [x] S5.5a El estado de `/constancias/emitir` sin persona tiene h1 y migaja desde `Padrón` (la migaja la exige el antipatrón 26 de `pnpm reglas`); conserva la salida existente a `/padron` — 4b179f8 (ruta: delegada directa; página + prueba focal).
- [x] S5.5b El aviso a OPERADOR en `/constancias` se verifica en navegador en `e2e/constanciaCancelada.spec.ts`. Ya existe como `AvisoDePermiso` en `src/app/(panel)/constancias/page.tsx`; no duplicar el mensaje (ruta: delegada directa, solo verificación) — prueba original `fe842e9`; corrección de ubicación `0a41190` (el test de Marca permanece en `e2e/marca.spec.ts`).
- [x] S5.5c El módulo activo de `NavegacionDeModulos` queda visible a 390 px (ruta: delegada directa; navegación compartida + prueba de navegador) — `cb37390`.
- [x] S5.5d1 `FusionarPersonas` usa `ANILLO_DE_FOCO` (Padrón) — 7bd10bd (ruta: delegada directa; componente + prueba).
- [x] S5.5d2 `FormularioDeMudanza` usa `ANILLO_DE_FOCO` (Territorio) — 7bd10bd (ruta: delegada directa; componente + prueba).
- [x] S5.5d3 `FormularioDeEscudo` usa `ANILLO_DE_FOCO` (Marca) — 7bd10bd (ruta: delegada directa; componente + prueba).
- [x] S5.5e La tarjeta de inicio usa `bg-caliza-superficie` en vez de `bg-white` (ruta: delegada directa; página + prueba) — `0877175`.
- [x] S5.6 Los IDs ajenos de `?nodo=`, `?calle=` y `?domicilio=` en `/territorio` producen HTTP 404 real; conservar RLS y resolver el estado antes de que Suspense envíe 200 (ruta: delegada directa; validación de rutas + E2E contra HTTP real) — `de2b4558b1f48a7a39e276ee92927e45819d11d8`.
- [x] S5.7a `subirEscudo` registra solo el nombre del error rechazado, nunca el mensaje, nombre de archivo ni datos personales (ruta: delegada directa; helper + prueba unitaria) — `823a3bdf0e89022940d887b5d7f58ac39d4d8989`.
- [x] S5.7b `e2e/constanciasFixture.ts` reserva folios sin colisión entre ejecuciones concurrentes (ruta: delegada directa; fixture + prueba E2E) — `9fb2015b2bfe63275cd46a3b687f5923921ac2f9`.

S5b sigue la ruta ODD de implementación directa delegada: el mapeo requirió
cuatro o más archivos. Usar un solo escritor en primer plano a la vez y
actualizar el plan y su espejo después de cada tarea. TDD permanece activo
(fuente: `CLAUDE.md`; runner unit/integration:
`pnpm vitest run --project unit|integration <archivo>`; integración con
`pnpm db:local`). Estrategia de entrega: `ask-on-risk`; el pronóstico inicial
es de 350–400 líneas modificadas escritas, como heurística consultiva, no como
límite. La autorización posterior reemplaza la nota de no abrir PRs sin una
solicitud separada; la política secuencial vigente está en
`## Estado de integración`.

## Progreso
- S1 cerrada. Ruta: delegada (un writer, 2 commits, 24 archivos, 432 líneas).
  Verificación observada por el writer: unit 7/7, e2e completo 24/24,
  `pnpm test` 341 archivos/1707 tests, typecheck, check y reglas en verde.
  Revisión nativa (riesgo alto, hot_path auth): consentida por la persona,
  4 lentes, aprobada, autoridad quemada; 6 hallazgos no bloqueantes
  (2 WARNING, pasados a S2.4/S2.5). En ese registro de cierre aún no se había
  hecho push ni PR.
- S2 cerrada (con S2.6). Ruta: delegada (mismo writer, 7 commits, 44 archivos,
  1,004 líneas: +860/−144 desde `0177e2a` hasta `cdfeba9`; excede la
  heurística de 400, cada commit es una unidad coherente).
  Observado por el writer: `pnpm test` 347 archivos/1747 tests, e2e 28/28,
  typecheck, check y reglas verdes; navegador real a 1280 y 390 px.
  Revisión nativa (riesgo medio, `slice_budget_reached`, 1 lente): consentida,
  aprobada, autoridad quemada; 1 WARNING (S2.6) y 1 SUGERENCIA.
  Pendiente de S5: `FusionarPersonas.tsx`, `FormularioDeMudanza.tsx` y
  `FormularioDeEscudo.tsx` repiten `outline-none` + `focus:outline-2`.
- S3 cerrada. Ruta: delegada (un writer, 3 commits, 46 archivos, 1254 líneas).
  Observado por el writer: `pnpm test` 356 archivos/1818 tests, e2e 28/28,
  check verde; navegador real con Playwright (no agent-browser). Revisión
  nativa (medio, 1 lente): consentida, aprobada, autoridad quemada; 2 sugerencias
  menores (cabecera dada de baja sigue ofreciéndose y luego falla con mensaje
  claro; orden de tests). Decisión de revisar: CURP por prefijo con forma
  `^[A-Z]{4}\d[A-Z0-9]{0,13}$`; la consulta de búsqueda ya no usa el GIN.
- S4 cerrada. Ruta: delegada (un writer, 6 commits, 36 archivos, 1745 líneas).
  Observado por el writer: `pnpm test` 361 archivos/1839 tests, e2e 38/38,
  check verde; Chromium contra build de producción. Revisión nativa (medio,
  1 lente): consentida, aprobada, autoridad quemada; 1 WARNING (S5.6) y 2 nits (S5.7).
  Decisiones: `loading.tsx` de padron/territorio provocaban el 200; padron movido
  a `(lista)/`, regla de migaja corregida; marca CANCELADA = banda + diagonal;
  ninguna prueba tocó R2.
- S5a cerrada (código + revisión nativa). Ruta: delegada (un writer,
  16 commits, 159 archivos, 1787+/392- desde `df9085a`; commits nuevos del
  cierre: `4429d87`, `3283fe5`, `8ec6fb8`, `0f558c9`, `dde779b`, `5f8a8b1`,
  `9c5de89`, `f7e8e68`). Observado por el writer: `pnpm test` 376
  archivos/1920 tests verde, e2e 38/38, `pnpm check` y `typecheck` exit 0,
  reglas sin hallazgos. Spot-check del orquestador: `pnpm reglas` y tests de
  constancias verdes; `opcionesEtiquetadas` usado en 6 módulos (no es código
  muerto). Hallazgos corregidos en el tramo: tres citas viejas de S5.1 que el
  e2e destapó (heading `Intervención Obra`, `(comisaría)`, vacío `todavía`).
  Juicio contextual declarado: `"Sin quien firma y con que cargo"` no se
  acentuó (lectura relativa); el resto de los errores internos tampoco llega
  a la operadora. La revisión nativa del candidato completo excedió el
  presupuesto de contexto y se dividió en dos tramos: `df9085a..22d27b2`
  (73 archivos, 1705 líneas, riesgo medio, una lente) y `22d27b2..19876bd`
  (104 archivos, 606 líneas, riesgo alto por hot path de autenticación, cuatro
  lentes). Ambos quedaron aprobados sin hallazgos y con la autoridad quemada
  por el acknowledgement exacto. En ese registro de cierre aún no se había
  hecho push ni PR.
- S5b iniciada en `fix/presentacion-y-404-interno`, cortada de `fea1278`.
  Ruta: delegada directa; el mapeo abarcó cuatro o más archivos y cada unidad
  que cambia comportamiento incluye pruebas. TDD activo. En el cierre de S5b
  se anotó `ask-on-risk` y un pronóstico inicial de 350–400 líneas (heurística,
  no límite). La autorización posterior de integración secuencial a `main` se
  registra abajo. S5.5b se cerró con prueba de navegador; el aviso ya existente
  no se duplicó.
- S5.4 cerrada — `be5aece`. `/marca` compone con `PaginaDePanel` y migaja
  desde `Inicio`; se fue el `min-h-dvh` anidado que sumaba scroll. El writer
  delegado se topó con el límite de uso del proveedor y dejó la prueba RED
  escrita; la edición final de la página la completó el orquestador. RED
  observado antes del fix: 956px de documento contra 844 de ventana y sin
  migaja. Verificado después: `e2e/marca.spec.ts` 6/6, `pnpm reglas`,
  `pnpm typecheck` y `pnpm check` en verde (el único error de `check`,
  formato del spec nuevo, se normalizó antes del commit). El spec ahora
  limpia la ventana de ritmo por test (`test.beforeEach`), porque el archivo
  suma un acceso y la ventana por correo es de cinco cada quince minutos;
  mismo patrón que `titulos.spec.ts` y `sesion.spec.ts`. Evaluación RDD del
  commit: riesgo medio, `review_due=false` (`under_budget`); la frontera
  revisada no avanzó (sigue en `e2a294f`).
- S5.5a cerrada — `4b179f8`. El estado sin persona de `/constancias/emitir`
  compone con `PaginaDePanel` (h1 visible), conserva el mensaje y el enlace
  al padrón, y suma la migaja `Padrón → Emitir constancia` que `pnpm reglas`
  exige (antipatrón 26). Prueba focal nueva
  `src/app/(panel)/constancias/emitir/page.test.tsx` con RED observado
  (sin h1) y GREEN después; spot-check del orquestador repetido en verde.
  `pnpm reglas`, `pnpm typecheck` y `pnpm check` en verde. Tramo acumulado
  del RDD: 5 archivos, 183 líneas, riesgo medio, `under_budget`; la frontera
  sigue en `e2a294f`.
- S5.5d1–d3 cerradas — `7bd10bd`. Los tres formularios (FusionarPersonas,
  FormularioDeMudanza y FormularioDeEscudo) cambiaron su cadena local de foco
  por `ANILLO_DE_FOCO`, con el resto de sus clases intacto. Cada uno estrenó
  prueba de render (`FusionarPersonas.test.tsx`, `FormularioDeMudanza.test.tsx`,
  `FormularioDeEscudo.test.tsx`) con RED observado antes del cambio y GREEN
  después; spot-check del orquestador 3/3 en verde. El borde en foco
  (`focus:border-marca`) se fue con la cadena vieja: `clasesDeCampo` y
  `clasesDeBoton` solo suman el anillo, así que el estándar compartido no
  lleva cambio de borde. `pnpm reglas`, `pnpm typecheck` y `pnpm check` en
  verde. Tramo acumulado del RDD: 11 archivos, 300 líneas, riesgo medio,
  `under_budget`; la frontera sigue en `e2a294f`.
- S5.5b cerrada. La prueba del aviso se incorporó originalmente a
  `e2e/marca.spec.ts` (`fe842e9`) y la corrección `0a41190` la trasladó a
  `e2e/constanciaCancelada.spec.ts`; el test específico de Marca permanece en
  `e2e/marca.spec.ts`. Se siembra un OPERADOR aislado de Motul con correo
  aleatorio y `CLAVE`, bajo `withTenant`; la prueba confirma en Chromium
  exactamente un aviso existente y ningún enlace `Bloque de firma`. Comando:
  `pnpm test:e2e e2e/constanciaCancelada.spec.ts --grep "un OPERADOR ve el aviso del bloque de firma en constancias"`
  (1/1, 24.9 s). PostgreSQL mostró NOTICE de cascada al limpiar tablas y Next
  emitió `The destination stream closed early`; no impidieron la prueba.
  `pnpm reglas`, `pnpm typecheck` y `pnpm check` terminaron en 0; reglas sin
  hallazgos y `check` con 56 advertencias Biome fuera del diff. El build
  reescribió `next-env.d.ts`; se restauró únicamente ese cambio generado.
  Evaluación RDD del candidato desde `53bef9d`: riesgo medio
  (`executable_change`), `review_due=false` (`under_budget`), 2 archivos y
  74 líneas; la frontera revisada permanece en `53bef9d`.
- S5.5c cerrada — `cb37390`. E2E confirmado a 390 px: el módulo activo queda
  visible y el scroll horizontal permanece en cero. Se conserva como
  seguimiento la advertencia no bloqueante: el efecto de montaje no vuelve a
  correr si la navegación cliente cambia el módulo activo con la fila montada.
- S5.5e cerrada — `0877175`. La tarjeta de inicio usa `bg-caliza-superficie`;
  la prueba focal ya pasó.
- S5.6 cerrada — `de2b4558b1f48a7a39e276ee92927e45819d11d8`. RED observado con
  `pnpm test:e2e e2e/recursoAjeno.spec.ts --grep "territorio responde 404 HTTP para nodo, calle y domicilio ajenos"`:
  los tres IDs ajenos devolvían `[200, 200, 200]` en vez de `[404, 404, 404]`.
  GREEN con `pnpm test:e2e e2e/recursoAjeno.spec.ts` (3/3): IDs ajenos
  `[404, 404, 404]` y controles propios `[200, 200, 200]`; la selección se
  resuelve antes de Suspense con `subarbol`, `listarCalles` y `domicilioPorId`,
  sin abrir una vía alternativa a RLS ni cambios de esquema. El test unitario
  focal pasó 2 archivos/10 tests con
  `pnpm vitest run --project unit 'src/app/(panel)/territorio/page.test.tsx' 'src/app/(panel)/recursoAjeno.test.tsx'`.
  `pnpm reglas`, `pnpm typecheck` y `pnpm check` terminaron en 0; reglas sin
  hallazgos y `check` con 56 advertencias Biome fuera del diff. Next emitió
  `The destination stream closed early` durante el E2E, sin impedir los 3
  tests. El build reescribió `next-env.d.ts`; se restauró solo ese cambio.
  Evaluación RDD del rango desde `53bef9d`: riesgo medio
  (`executable_change`), `review_due=false` (`under_budget`), 6 archivos y
  248 líneas; la frontera revisada permanece en `53bef9d`.
- S5.7a cerrada — `823a3bdf0e89022940d887b5d7f58ac39d4d8989` (`fix(ui): registra solo el nombre seguro del rechazo`). RED observado antes del cambio: `pnpm vitest run --project unit src/modules/marca/ui/subirEscudo.test.ts` dio 1 archivo, 2 fallas y 6 tests aprobados; ambas expectativas de registro recibieron cero llamadas. GREEN después: 1 archivo y 8 tests aprobados. La prueba del `ErrorDeTransporte` incluye canarios sintéticos de nombre de archivo y dato personal, y exige exactamente contexto fijo más nombre; la prueba de un rechazo no-Error exige solo el tipo runtime. `pnpm reglas` terminó en 0: 9 reglas y 2 métricas sobre 951 archivos, sin hallazgos. `pnpm typecheck` terminó en 0. `pnpm check` terminó en 0: Biome revisó 938 archivos con 56 advertencias en archivos ajenos al diff, TypeScript pasó, dependency-cruiser pasó (922 módulos, 4229 dependencias) y reglas no reportó hallazgos. S5.7b permanece pendiente.
  Evaluación RDD del rango desde `53bef9d`: riesgo medio
  (`executable_change`), `review_due=false` (`under_budget`), 8 archivos y
  302 líneas; la frontera revisada permanece en `53bef9d`.
- S5.7b cerrada — `9fb2015b2bfe63275cd46a3b687f5923921ac2f9`
  (`fix(constancias): reserva folios de prueba sin colisión`). RED observado
  con `pnpm test:e2e e2e/constanciaCancelada.spec.ts --grep "sembrar constancias reserva consecutivos distintos en paralelo"`:
  las dos siembras con aleatoriedad idéntica chocaron contra
  `constancias_tenant_folio_idx`. GREEN con el mismo comando: 1/1 passed
  (24.6 s). La reserva incrementa atómicamente de dos en dos el contador de
  Motul dentro de la transacción que inserta las constancias; Ticul reutiliza
  la base de cada llamada bajo su propia clave de tenant. `pnpm reglas`
  terminó en 0 (9 reglas y 2 métricas, sin hallazgos); `pnpm typecheck`
  terminó en 0; `pnpm check` terminó en 0, con 56 advertencias Biome en
  archivos ajenos al diff. El build E2E reescribió `next-env.d.ts`; se
  restauró únicamente ese cambio generado. La garantía cubre llamadas
  concurrentes a la fixture después de un reset; comandos E2E completos en
  paralelo siguen sin soporte porque global setup comparte `xula_test` y
  hace `TRUNCATE`.
  Evaluación RDD del rango desde `53bef9d`: riesgo medio
  (`executable_change`), `review_due=false` (`under_budget`), 9 archivos y
  345 líneas; la frontera revisada permanece en `53bef9d`.
- S2.2 implementada e integrada mediante PR #78 desde `feat/hub-inicio-modulos`,
  fusionada en `main` el 2026-09-29 (`76e130eae365b6f84251e6bdca1a2becbb4cc4fb`).
  El commit `03708de` reproduce el hub sobre `main` después de PR #75; el
  commit `55b0cb2` elimina dos comentarios redundantes y conserva únicamente
  el hecho histórico que justificaba compartir el registro de módulos. El
  candidato acumulado es de 250 líneas, medium/under_budget; RDD indicó
  `review_due=false`. `pnpm check` pasó en el escritor y en el spot-check del
  orquestador, con 56 advertencias Biome ajenas al diff. El test local completo
  tras la limpieza agotó 600 s sin resultado; el hook de push pasó 233 archivos
  unitarios/1330 tests. CI en el head `55b0cb2` terminó con los cinco checks en
  verde (`36521355679`); el primer run falló en `Revision de IA` con un error de
  carga del entorno y el siguiente run pasó. Se preservó el cambio local
  preexistente de `opencode.json`; no forma parte de los commits.
- S2.3 reproducida sobre `origin/main` en `feat/s2-3-titulos-y-helper-e2e`:
  commit `84965e84` (295 líneas) y corrección de la carrera del helper en
  `116ac729`, ya publicado en PR #80. El RED/GREEN de títulos fue 22 fallas/1
  aprobado antes y 23/23 después; el E2E focal pasó 3/3 y el pre-push pasó
  TypeScript, capas, reglas y 1,353 tests en 234 archivos. La prueba local no
  verificó aislamiento por falta de `DATABASE_URL`; CI sí lo pasó. La evaluación
  RDD correcta, desde `76e130e` con `--committed-only`, dio riesgo medio,
  335 líneas y `review_due=false` (`under_budget`). El run CI
  `36601930431` pasó 4/5; GGA alegó que faltaba comprobar la URL tras el backoff.
  CodeGraph confirmó que ya había un guard tras el siguiente `page.goto` y que
  el servidor redirige una sesión a `/`; la E2E focal se repitió y pasó 3/3,
  aunque registró tres mensajes `The destination stream closed early`. Para
  satisfacer explícitamente el hallazgo, la persona autorizó S2.3.1: una prueba
  que falla si se vuelve a navegar a `/acceso` tras completar el login, seguida
  del guard inmediatamente después del backoff. RED observado: dos navegaciones
  a `/acceso` antes del guard; GREEN después. El spot-check inicial detectó que
  `page.goto` agotaba el timeout de acción de 1 s durante un arranque frío; el
  spec fija 15 s solo para navegación. Focal E2E pasó 1/1 (writer y spot-check),
  suite `e2e/titulos.spec.ts` 3/3 y `pnpm check` pasó con 56 advertencias fuera
  del diff. Commit `58ef8a0` publicado en PR #80. RDD: medium, 352 líneas,
  `review_due=false` (`under_budget`). El CI nuevo `36610539651` pasó 5/5,
  incluida `Revision de IA`. La persona reportó que hizo merge; verificado el
  2026-09-30 con `gh pr view 80`: `MERGED` en
  `a7734a260c302e782e2c4aa8ab8bbae3018ef43e` (2026-09-29T18:28:17Z).
  Preservar `M opencode.json`.
- Verificación completa final: el primer `pnpm test` sin `DATABASE_URL` ni
  `MIGRATION_DATABASE_URL` no pudo importar 118 suites de integración; los
  263 archivos unitarios sí pasaron (1499 tests). Tras recrear la base local
  descartable `xula_test` con `source scripts/db-local.sh`, `pnpm test` pasó
  381 archivos y 1929 tests. La suite E2E focal de S5.7b pasó además en el
  spot-check del orquestador. `pnpm check` había terminado en 0 tras S5.7b.
- Espejo Engram: conservar el documento completo en el topic
  `odd/correcciones-revision-navegador/tasks` y leerlo de vuelta después de cada
  sincronización.

## Estado de integración
- PR #72 integró S1.1–S1.3 en `main` y está merged en
  `5d4709067fba618b9f805ba4930e3846803feb23`; issue #71 cerrado.
- PR #73 integró S1.4 en `main` y está merged en
  `f361c730c0d316b03593f121662528825784b4bc`; issue #70 cerrado.
- PR #75 integró S2.1 y S2.6 en `main` y está `MERGED` en
  `2a2ad9ac94450e405d685b8c13fd0016ce711a26`; issue #74 está `CLOSED` (había
  sido aprobado con `status:approved`, Área `Territorio`). El PR se dirigió a
  `main` desde `feat/cerrar-sesion-panel`:
  https://github.com/trueno950/xula-sigma/pull/75. Incluyó S2.1 y S2.6; los
  commits de la rebanada son `a600b78d3055ec6e5b17bc51b114167ce1ca3ac0` y
  `8f598d29282096bb69fc7c5d2d1f49ec72d00130`. El head de origen fue
  `5ca12067e146667c041ae9ad8f161ecabee1a2b0`. El diff final tuvo
  10 archivos, +476/−10, 486 líneas modificadas: 86 sobre el presupuesto
  ordinario de 400. La excepción de tamaño `size:exception` fue autorizada
  por la persona; el PR también llevaba `type:feature`. La justificación de
  conservar esta rebanada y su diff completo está documentada en la descripción
  del PR.
- Se corrigieron en el head actual los cinco comentarios de revisión de Codex:
  se quitó un comentario redundante sobre comportamiento; el encabezado del
  panel refluye por debajo de 320 px aun con municipio largo y escudo, sin
  recortar el texto ni reducir el objetivo táctil; los fallos inesperados se
  propagan al límite de eventos y el registro usa diagnóstico seguro; el botón
  de cierre de sesión permanece deshabilitado durante SSR y hasta la
  hidratación; y el fetch tiene timeout de 15 segundos con `AbortController` y
  recuperación para reintentar.
- Evidencia histórica previa al head actual: con el candidato anterior, el diff
  era de 8 archivos, +347/−1 (348 líneas); el spot-check unitario fue de 3
  archivos/14 tests, `source scripts/db-local.sh && pnpm test` pasó 344
  archivos/1,721 tests, `pnpm check` pasó con 56 advertencias Biome y
  `E2E_PUERTO=3100 pnpm test:e2e e2e/sesion.spec.ts` pasó 1/1. El hook de push
  también pasó; su corrida Vitest no tenía variables de base de datos, por lo
  que la evidencia de integración era la suite completa con
  `scripts/db-local.sh`. En esa lectura previa (2026-09-27), los cinco checks
  estaban en verde. El RDD de aquel candidato era `medium/under_budget`, con
  `review_due=false`, y todavía no se había iniciado una revisión nativa; esos
  datos describen el estado anterior, no el head actual.
- Verificación local después de los cinco fixes: Vitest focal, 3 archivos/16
  tests; `source scripts/db-local.sh && pnpm test`, 344 archivos/1,723 tests;
  `pnpm check` pasó con 56 advertencias Biome; y
  `E2E_PUERTO=3100 pnpm test:e2e e2e/sesion.spec.ts` pasó 1/1. El hook de push
  pasó `pnpm check` y 231 archivos unitarios/1,324 tests; esa corrida no tenía
  variables de base de datos, así que la evidencia de integración es la suite
  completa anterior. El build generó un cambio en `next-env.d.ts`, que se
  restauró.
- Los cinco checks de CI del candidato de PR #75 terminaron en `SUCCESS`:
  `Lint, tipos y capas`, `Tests unitarios`,
  `Integracion y aislamiento entre municipios`, `Links de documentacion` y
  `Revision de IA`. Antes del merge se publicaron respuestas en los cinco
  hilos en línea de Codex y la lectura de vuelta en el host confirmó cada una:
  - `4116159128` → `4126426457` (comentario redundante sobre comportamiento).
  - `4116159133` → `4126426855` (encabezado móvil).
  - `4116159138` → `4126427178` (errores inesperados).
  - `4116159142` → `4126427426` (hidratación).
  - `4116159144` → `4126427748` (timeout).
  No se marcaron los hilos como resueltos; las respuestas no implican una
  aprobación de revisión de GitHub.
- RDD nativo del candidato actual: modo de revisión activado globalmente;
  riesgo `medium`, `review_due=true`, motivo `slice_budget_reached` (486
  líneas). La lente `review-reliability` no encontró hallazgos. La aprobación
  R3 quedó registrada con el acknowledgement exacto
  `review-e032d5bf812624db`, que tuvo éxito y consumió la autoridad. Esta
  revisión nativa de RDD no equivale a una aprobación de code review de
  GitHub.

- Issue #76 (`[Feature]: Completar el inicio con todos los módulos y un rol
  legible`) fue aprobado con `status:approved`, etiqueta `enhancement` y Área
  `Territorio`, elegida por la persona; PR #78 lo vinculó. La búsqueda inicial
  cubrió issues abiertos y cerrados; el único candidato textual fue el issue
  cerrado #58, inspeccionado y considerado no relacionado con S2.2. No se
  volvió a consultar el estado final del issue en este seguimiento.
- PR #78 (`feat(ui): completa el inicio con módulos y rol legible`) está
  `MERGED` en `main` desde `feat/hub-inicio-modulos` en
  `55b0cb2c833c54a21206971aa0079ccc07b9f747`, vincula #76 y tiene únicamente
  `type:feature`. Se fusionó el 2026-09-29 en
  `76e130eae365b6f84251e6bdca1a2becbb4cc4fb`; los cinco checks de CI pasaron
  en el run `36521355679`. Los tres comentarios de Codex del primer
  head se corrigieron en `55b0cb2`; no hubo comentarios nuevos sobre ese head.
  Las respuestas en hilo se publicaron y leyeron de vuelta:
  - `4129430397` → `4129716994` (visibilidad futura).
  - `4129430401` → `4129717004` (JSDoc del fallback).
  - `4129430405` → `4129716993` (explicación del registro).
  No hubo cambios de código después del merge.
- PR #80 (`feat(ui): agrega títulos por ruta y helper E2E de acceso`) está
  `MERGED` en `main` desde `feat/s2-3-titulos-y-helper-e2e` en
  `58ef8a006c4645c3a14fc724d06a250e3a2f6a9f`, verificado el 2026-09-30 con
  `gh pr view 80`: commit de merge
  `a7734a260c302e782e2c4aa8ab8bbae3018ef43e`, 2026-09-29T18:28:17Z.
  Vinculó el issue #79 aprobado, tenía `type:feature`. El comentario
  de Codex `4135208949` fue respondido en `4136172554`; el CI `36610539651` pasó
  5/5, incluida `Revision de IA`. No hubo cambios de código después del merge.
- Issue #79 (`[Feature]: Títulos por ruta y helper E2E compartido para acceso`)
  está `OPEN` con `enhancement`, `status:approved` y Área `Territorio`. La
  búsqueda de duplicados en issues abiertos y cerrados no encontró equivalentes.

### Rebanadas S2 secuenciales previstas
1. PR #75 — S2.1 + S2.6; integrada en `main` en `2a2ad9a`; 486 líneas reales
   en el diff base–head (excepción de tamaño autorizada).
2. S2.2 — hub de inicio enlaza los siete módulos existentes y muestra
   etiquetas de rol legibles; PR #78 fusionada en `main` en `76e130e`, issue
   #76 vinculado, commits `03708de` y `55b0cb2`; 250 líneas modificadas en el
   candidato acumulado.
3. S2.3 — títulos por ruta y helper E2E compartido para login/limitador;
   commits `84965e84`, `116ac729` y `58ef8a0`; issue #79 aprobado; PR #80
   fusionada en `main` en `a7734a2` (verificado con `gh`). S2.3.1 agrega guard tras el backoff
   y prueba que no se reingresa a `/acceso`; E2E local y los cinco checks de CI
   pasan.
4. S2.4 — anillo de foco de acceso; S2.5 — E2E de acceso sin JS falsable;
   reproducidas sobre `origin/main` en `fix/anillo-de-foco-y-e2e-de-acceso`:
   cherry-picks byte-idénticos `dd8c792` (de `6f83ea3`) y `8b2e27c` (de
   `afd5be2`), sin conflictos ni ediciones a mano; 116 líneas reales (estimado:
   116). S2.6 y el helper del limitador no se reproducen: ya viven en `main`
   por las reproducciones frescas de PR #75 (`cerrarYVolver`) y PR #80
   (`e2e/acceder.ts` con el guard S2.3.1). Issue #81 aprobado; PR #82 fusionada
   en `main` en `9a2ea9c32888d19e0254d1c3491a79af915fa84d` (2026-09-30T23:54:41Z,
   verificado con `gh`), `type:bug`, verificación completa en verde (unit 25,
   reglas, typecheck, check, E2E 10/10) y CI 5/5 incluida `Revision de IA`.
5. S3 — reproducida sobre `origin/main` (`9a2ea9c`) en `fix/flujos-de-captura`:
   cherry-picks con patch-id identico `07b68c4` (de `34d3833`, padron), `8319d70`
   (de `bc409f3`, territorio) y `4ea7fc9` (de `c3d99a1`, reportes); 46 archivos,
   +1127/-127 (1254 lineas, `size:exception` como S2.1/S4). Precondicion
   verificada: los modulos y AGENTS.md eran byte-identicos entre la base de
   la pila y `origin/main`. Issue #83 aprobado; PR #84 abierta (`type:bug` +
   `size:exception`). Verificacion: unit 659, integracion 229 (incluye
   aislamiento Motul/Ticul en busqueda y folio ajeno → `NoEncontradoError`
   sin escritura), reglas, typecheck, check. Assess RDD `unassessable` →
   verificador independiente: 4/4 confirmados, sin bloqueantes.
   Seguimientos no bloqueantes registrados: (a) ADR 0002 dice "se descartan
   prefijos" y este cambio lo revierte parcialmente sin enmendar el ADR;
   (b) sargabilidad del OR documentada en `coincidenciasDeBusquedaSql.ts`;
   (c) spec de reportes-ciudadanos todavia describe `duplicadoDeReporteId`;
   (d) falta test del caso de colision de folio entre tenants;
   (e) comentario viejo en `duplicados.ciclo.integration.test.ts:115`.
   El primer CI `36799894001` pasó 4/5 y falló en Revisión de IA, con
   hallazgos reales; no fue un fallo de entorno. Se corrigieron en
   `e8b3508`, `8b7a4d7` y `c634bc8`: prioridad CURP antes del límite,
   máximo ocho palabras, consultas separadas con UNION y deduplicación SQL,
   existencia de cabecera incluyendo bajas, ejemplo de folio neutral y
   limpieza de comentarios. El índice existe en `drizzle/0007_territorio.sql:73`.
   Tamaño corregido: 72 archivos, +1567/-186 (1753 líneas). El GIN sirve la
   rama de trigramas; palabras y CURP siguen sin índice propio.
   Verificador independiente: 131 archivos/691 unitarias, 65 archivos/234
   integración y pnpm check en verde. Pre-push: 241 archivos/1399 unitarias,
   sin DB en el hook; la evidencia de RLS es la integración anterior.
   REDs retrospectivos: se revirtió temporalmente implementación para
   comprobar regresiones después de escribirla. No cumple el orden estricto
   TDD solicitado; se registra como desviación, no como RED-first.
   Revisión nativa correcta: inspect con baseRef y committedOnly, seguido de
   START sobre `9a2ea9c..c634bc8`. Lente review-reliability, riesgo medium;
   aprobada y acknowledgement completado para `review-03eb3bd59f9a6b65`,
   autoridad quemada. ASSESS sigue schema-incompatible pero el resultado
   cerrado se informó explícitamente para este candidato.
   Tres advisories nativos no bloqueantes: restauración FORCE RLS en test,
   cobertura de orden de UNION y planes de ramas sin índices. El verificador
   señaló longitud >30 en consultaDeBusqueda y cargarTerritorio y algunas
   explicaciones duplicadas; se conservan como seguimiento no bloqueante.
   Build/E2E/cobertura no se ejecutaron en la corrección. El nuevo CI del
   head `c634bc8` terminó 4/5 (run 36806161227): solo falló Revisión de IA por
   dos comentarios duplicados, en coincidenciasDeBusquedaSql y VistaDeRaices.
   Los nueve comentarios inline fueron
   respondidos con commit y evidencia, sin marcar hilos como resueltos.
   El CI del head `e2ee6f6` pasó 5/5 (run 36807604953), con Revisión de IA
   aprobada. A pedido explícito de la persona, `89b553a` cambia el modelo de
   GGA a `deepseek/deepseek-flash` en la configuración compartida `.gga` y
   quita la sobrescritura de `GGA_PROVIDER` de `revision:local*`, de modo que
   CI y local usan el mismo modelo y la única diferencia por superficie es la
   variante (`low` en CI, `high` en `pnpm revision`, `max` en local); los
   scripts locales pasan a requerir `DEEPSEEK_API_KEY`. El identificador se
   verificó con `opencode models deepseek` antes de fijarlo.
   El CI del head `89b553a` volvió a fallar Revisión de IA (run 36813991858,
   4/5) con dos hallazgos de métrica reales —`consultaDeBusqueda` con ~46
   líneas de código y `cargarTerritorio` por encima de 30, esta última tocada
   por el propio PR—, no por el modelo nuevo. Se corrigieron en `a8db3be` y
   `afbb4d8`, que además bajan `page.tsx` de 215 a 94 líneas moviendo la carga
   a `cargaDeTerritorio.ts`. Evidencia local: unit 135, integración 55
   (incluido el test de sargabilidad sobre la consulta partida), reglas,
   typecheck y check en verde.
   El candidato nativo de esos commits no es revisable: `inspect` con baseRef
   y START devolvieron `lens_context_budget_exceeded` en los tres cortes
   probados (todo el delta, solo `89b553a`, solo los comentarios), porque el
   rango siempre llega a HEAD y el ADR 0001 —1180 líneas— no cabe en el
   presupuesto de la lente. Sin mutación y sin autoridad creada.
   Partir el ADR a su propio commit —con el ADR antes del cambio efectivo— no
   habilitó la revisión: `ad3190c..HEAD` (6 archivos, ya sin el ADR) y
   `cca5459..HEAD` (2 archivos) fallaron igual con
   `lens_context_budget_exceeded`. El presupuesto se agota por el contexto
   global del repositorio y no por el tamaño del candidato, así que dividir no
   lo resuelve. El force-push está bloqueado por la política del harness: el
   historial partido quedó en la rama local `chore/gga-flash-split` (`a776101`,
   mismo árbol verificado con `git diff`) y `fix/flujos-de-captura` volvió al
   head publicado.
   El run 36815478437 sobre `afbb4d8` volvió a fallar sólo Revisión de IA, por
   una causa distinta: el informe verificó aislamiento, migraciones, capas y
   reglas, y declaró "sin más hallazgos" —los dos hallazgos de métrica quedaron
   dentro del tope—, pero `deepseek-flash` no escribía la línea `STATUS:` que
   `STRICT_MODE` exige, y GGA abortó una revisión correcta. El prompt del
   agente nunca la pedía: con `deepseek-v4-pro` la emitía por su cuenta.
   `74c7dd0` la exige de forma explícita, con la forma y la posición que GGA
   lee.

Las cifras futuras son estimaciones basadas en estadísticas de commits, no
mediciones de los PRs rearmados; deben medirse otra vez después del replay.
Cada PR posterior espera al merge del anterior y requiere un issue nuevo
aprobado.

## Aceptación
Cada tarea: test que falla antes y pasa después (RED→GREEN observado),
`pnpm reglas`, `pnpm typecheck` y `pnpm check` en verde, y la conducta
reobservada en el navegador cuando aplica.

## Siguiente paso
S5b quedó completa en `fix/presentacion-y-404-interno`; no quedan tareas
pendientes de esa rebanada. Su rango RDD desde `53bef9d` sigue medio y
`under_budget` (345 líneas), así que la frontera revisada no avanzó. Queda
como seguimiento no bloqueante que el desplazamiento de `FilaDeModulos` no se
repite cuando la navegación cliente cambia el módulo.

PR #75 se integró en `main` en `2a2ad9ac94450e405d685b8c13fd0016ce711a26`,
PR #78 en `76e130eae365b6f84251e6bdca1a2becbb4cc4fb`, PR #80 en
`a7734a260c302e782e2c4aa8ab8bbae3018ef43e` y PR #82 en
`9a2ea9c32888d19e0254d1c3491a79af915fa84d` (verificados con `gh` el
2026-09-30). PR #84 se integró en `main` en `fa3de55f826a0c8ff32d6a03a096dd4ff06abad6`
(squash de `74c7dd0`, 2026-10-01T05:08:40Z, verificado). La rebanada activa
pasa a S4. La
revisión nativa de lo posterior a `c634bc8` quedó bloqueada por presupuesto de
lente incluso con 2 archivos —el presupuesto se agota por el contexto global
del repositorio, no por el candidato, así que partir el historial no lo
resuelve—, sin autoridad creada; siguen S4, S5a
y S5b,
cada una con issue nuevo aprobado. El worktree principal debe volver a la
rama fresca de la rebanada activa y conserva `M opencode.json`; no incluirlo
ni modificarlo.
