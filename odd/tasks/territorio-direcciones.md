# Territorio: direcciones legibles

Rediseño de la navegación de Territorio en tres pasos encadenados: sacar el
ruido de las vistas que no aplican, decir con claridad dónde se guarda un
domicilio, y convertir la dirección en la unidad que reportes y constancias
seleccionan. Rama: `feat/territorio-direcciones`, un PR por paso.

## Specs

- **S1.** «si selecciono una colonia me muestra este mensaje "Una colonia es
  el último nivel: no lleva lugares adentro, solo domicilios." para mi lo
  mejor seria ocultar eso sino aplica no crees? asi metemos menos ruido».
  La pestaña **Lugares** no se renderiza cuando el tipo de lugar no admite
  hijos: una colonia nunca va a tener lugares adentro, así que no hay nada
  que la operadora pueda decidir ahí.

- **S2.** «esta vista es otro ejemplo mostramos datos de otros lugares sin
  mucha claridad», sobre la captura de Colonia Centro con la pestaña
  **Calles 6** listando las seis calles de Buenavista. Estar parado en la
  colonia y ver el catálogo del asentamiento rompe la jerarquía que la
  migaja acaba de declarar. Las calles del asentamiento se ofrecen **dentro
  del formulario** de alta de dirección, rotuladas con su origen, no como
  listado de la colonia.

- **S3.** «al crear un domicilio puedo hacerlo desde cabecera, tambien por
  colonias no se en donde se guarda este domicilio hay que revisar en donde
  se usa el domiclio para ver si realmente se seleecionan bien». El
  formulario declara el destino antes de los campos: el lugar donde se
  guarda y el asentamiento dueño del catálogo de calles. Si el asentamiento
  tiene colonias, la colonia deja de ser una omisión silenciosa.

- **S4.** «hay que tener una mejor jerarquia». Las vistas de un lugar no
  ofrecen pestañas que no aplican a su tipo, y los datos de otro nivel se
  nombran con el nivel al que pertenecen.

- **S5.** «este modulo es para que cuando se haga el alta de un reporte se
  puede seleccionar los datos del lugar usando este modulo, lo mismo para
  las constancias». Un único selector de dirección —buscable por texto,
  con la dirección ya escrita— es el que usan reportes y constancias, en
  lugar de que cada uno arme su propia selección de lugar y calle.

- **S6.** «Los tres pasos completos», decisión de alcance del 2026-10-24: se
  implementan los tres pasos, en PRs encadenados y no en uno solo.

- **S7.** «El domicilio elegido (recomendado)», respuesta a «Cuando se elige
  un domicilio en el alta de reporte, ¿qué debe conservar el reporte?».
  Opción aceptada: «Conserva el vínculo a la dirección, incluido su número.
  Mantiene lugar/calle como alternativa para incidentes en vía pública;
  requiere ampliar el modelo.» El tenant se sigue resolviendo en servidor;
  un domicilio ajeno no puede referenciarse ni consumir un folio.

- **S8.** «si», respuesta a «¿Autorizás ese arreglo y su publicación en el mismo PR #108, sin merge ni T7?». Se acepta la recomendación: «una corrección acotada al **arnés de acceso E2E y su prueba**: reproducir el fallo, corregir la coordinación entre respuesta y navegación, y conservar la exigencia de un único POST. Sin relajar aserciones ni aumentar timeouts a ciegas.»

## Tasks

- [x] **T1** · S1,S4 · directo — La pestaña Lugares no se renderiza cuando el
  tipo no admite hijos, y su mensaje de "último nivel" desaparece. Commit:
  `62c8b2a`. Verificado en vivo: Colonia Centro muestra solo Domicilios 6 y
  Editar.
- [x] **T2** · S2,S4 · directo — En un lugar sin catálogo propio, las calles
  del asentamiento dejan de listarse como pestaña de la colonia; se ofrecen
  dentro del formulario con su origen rotulado. Commit: `62c8b2a`.
  Verificado: enlace «Ver el catálogo de calles de Buenavista» en su lugar.
- [x] **T3** · S2 · directo — La tabla de calles deja de mostrar coordenadas
  crudas: dice si está ubicada o no, y enlaza al mapa. Commit: `2fa598e`.
  Verificado: «Ubicada»/«Sin ubicar», 0 coordenadas crudas en la vista.
- [x] **T4** · S3 · delegado — El formulario de alta declara, antes de los
  campos, dónde se guarda la dirección y de qué asentamiento es el catálogo
  de calles. Commit: `f6da9ec`. Verificado en navegador:
  la cabecera abre con «Se guarda en el asentamiento solo si indica «Sin
  colonia»; de lo contrario, elija una colonia. Las calles son de su
  catálogo.»
- [x] **T5** · S3 · delegado — Con colonias en el asentamiento, el alta no
  guarda un domicilio en la cabecera por omisión: se pregunta o se explica
  el rechazo. Más un script de auditoría que lista los domicilios ya
  guardados en un asentamiento que tiene colonias, sin moverlos. Commit:
  `f6da9ec`. Verificado en navegador (L7): sin colonia elegida
  rechaza y no escribe; con «Sin colonia» escribe y confirma.
- [x] **T6** · S5,S7 · delegado — Implementado y verificado en
  `feat/reportes-selector-de-direccion`: buscador de direcciones registradas
  para el alta de reporte. T6a: `0d34bec`; T6b: `12d6377`, `d32456a` y
  el commit de integración identificado en L21. Sin publicar.
- [x] **T6a** · S7 · delegado — Vínculo opcional de reporte a domicilio,
  migración aditiva 0021 y validación autoritativa bajo tenant antes del
  folio; alternativa lugar/calle preservada. RED observado; GREEN: 18
  unitarios y 8 integración/aislamiento. Verificación independiente S7 met,
  sin bloqueantes; spot check del padre 18/18. Risk: item 1 (formato
  persistido) y item 2 (validación de tenant). Commit: `0d34bec`.
- [x] **T6b** · S5,S7 · delegado — Selector reutilizable y búsqueda
  integrados en el alta de reportes. Verificación independiente, suite
  completa (2375 tests) y ambos E2E finales aprobados (L16/L18), incluyendo
  vínculo/número, similares, respuestas obsoletas y alternativa sin JS.
  Commits: `12d6377` (búsqueda), `d32456a` (selector) y el commit
  `feat(reportes): integra direcciones en el alta nativa` que contiene
  este cierre (L21). No publicado; T7 queda fuera de este cierre.
- [x] **T6c** · S8 · delegado — Acceso E2E corregido: bucket de prueba aislado y un POST coordinado con respuesta/navegación; regresión permanente del waiter conserva error original y cero POST ante fill fallido. RED/GREEN observados; independiente 18 aprobados previos más reverificación limitada 1/1 y spot check final del padre exit 0 (L27-L30). Risk: item 4. Commit: pendiente de registro, asunto `fix(auth): coordina un solo acceso sin esperas huerfanas`.
- [ ] **T7** · S5 · delegado — Constancias y Territorio usan el mismo
  selector; el árbol queda como administración. Commit:

## Log

- **L1** — Pedido original, textual: «Vale lo siguiente es refinar mas
  territorio, aun falta tener una interfaz mejor, facil e intuitiva para el
  usuario, lo primero que veo es que si selecciono una colonia me muestra
  este mensaje Una colonia es el último nivel: no lleva lugares adentro,
  solo domicilios. para mi lomejor seria ocultar eso sino aplica no crees?
  asi metemos menos ruido, este ejemplo puede ser que este en mas vistas de
  territorio, /Users/joelmay/Desktop/Screenshot 2026-10-24 at 7.47.31 p.m..png
  esta vista es otro ejemplo mostramos datos de otros lugares sin mucha
  claridad, otra detalle al crear un domicilio puedo hacerlo desde cabecera,
  tambien por colonias no se en donde se guarda este domicilio hay que
  revisar en donde se usa el domiclio para ver si realmente se seleecionan
  bien, hay que tener una mejor jerarquia, este modulo es para que cuando se
  haga el alta de un reporte se puede seleccionar los datos del lugar usando
  este modulo, lo mismo para las constancias, pero si tienen una mejor idea
  exponla, te paso estos comentarios par un analisis y hacer una mejor
  interfaz».

- **L2** — Evidencia del diagnóstico (2026-10-24, `xula_dev`): un domicilio
  guarda `calleId` —la calle siempre pertenece al asentamiento— y `lugarId`
  —el asentamiento o una colonia—. 0 direcciones duplicadas entre lugares;
  3 domicilios guardados en la cabecera Buenavista teniendo 3 colonias, uno
  llamado «Calle 20 de la Colonia 104-B». El problema de S3 es real.

- **L3** — Decisión de alcance: los tres pasos completos (S6), en PRs
  encadenados. Los domicilios existentes en el lugar equivocado no se
  migran automáticamente: se listan con un script de auditoría y los corrige
  una persona, mismo criterio que `scripts/auditar-raices.sql`.

- **L4** — Frontera del primer slice (2026-10-24): `62c8b2a` + `2fa598e`,
  403 líneas sobre `main`. Cierra T1–T3 y va como PR propio; T4 en adelante
  abre el siguiente. Verificación del padre: `pnpm check` en 0 errores,
  unitarios 86 archivos / 587 tests del worker, y comprobación en navegador
  contra `xula_dev` de las tres tareas.

- **L5** — Verificación del paso 2 en navegador contra `xula_dev`, con servidor
  nuevo (el intento anterior dio falso negativo: un proceso `next start` viejo
  seguía sirviendo el build anterior en el mismo puerto). Resultado medido:
  T4 **cumple** — la vista de la cabecera muestra «Se guarda en el asentamiento
  solo si indica «Sin colonia»; de lo contrario, elija una colonia. Las calles
  son de su catálogo.» T5 **cumple a medias**: con la colonia sin elegir
  rechaza con «Elija una colonia o seleccione «Sin colonia» si la dirección no
  pertenece a una colonia.» y no escribe (9 domicilios antes y después), pero
  **con `sin-colonia` seleccionado vuelve a rechazar**: la salida visible no
  funciona y el operador queda bloqueado. Sospecha: el formulario envía más de
  un campo `lugarId` y `formData.get` toma el oculto vacío. No hay fila que
  limpiar. PR B sigue sin commitear.

- **L6** — Revisión nativa del WIP (2026-10-24), tras el usuario pedir cerrar acá.
  Corrieron los 3 lentes (`risk`, `readability`, `reliability`) y el refuter.
  El refuter cerró en `correction_required`: «candidate-caused severe findings
  require one bounded correction», presupuesto 200 líneas. Los hallazgos no se
  pudieron leer: el proveedor emitió el `status_continuation` con
  `--base-ref=3b7fa075… --committed-only=true`, que `gentle_review status` no
  acepta (solo `lineageId` y `workspaceRoot`), y sin ellos resuelve el
  workspace limpio y responde `empty_candidate_base_ref_required`. Correr
  STATUS por shell está prohibido por el contrato, así que no se rodeó.
  Estado: autoridad `review-48265f19bd4853fc` **abierta y sin quemar** en
  `correction_required`, apuntando al árbol `46fc96a` (este commit la deja
  huérfana de target). Para leer el plan, fuera de la sesión:
  `gentle-ai review status --cwd=<repo> --contract=gentle-ai.review-integration/v2
  --next-transition=true --lineage=review-48265f19bd4853fc --agent=pi
  --base-ref=3b7fa07591601eb2dda9aae757ff3693c7027148 --committed-only=true`.
  Sospecha fundada de que los hallazgos son T5: verificado en pantalla que la
  opción `sin-colonia` existe pero la acción la vuelve a rechazar.

- **L7** — La sospecha de L5 y L6 no se sostiene: era el servidor viejo, otra
  vez. Medido el 2026-10-25 con `next dev` propio en el puerto 3100 (el 3000
  seguía ocupado por el mismo `next-server` de L5, que es el que sirvió el
  build anterior) y la base del E2E: cabecera con una colonia y una calle
  propia, sembradas por SQL, sesión de `ADMIN_MUNICIPAL`, tres entradas del
  alta. Resultado en las tres: el `<select>` de colonia ofrece
  `value="sin-colonia"`, el `POST` viaja con `lugarId=sin-colonia`,
  redirige a `&ok=domicilio-creado` y la fila queda escrita
  (`count(*) = 1` para esa calle). Sin elegir colonia, el rechazo con «Elija
  una colonia o seleccione «Sin colonia» si la dirección no pertenece a una
  colonia.» y cero filas. T4 y T5 **cumplen**; no hay nada que corregir en
  el código. Lo que queda abierto es la autoridad de revisión de L6, que la
  facade ya no puede leer (STATUS responde `action: start`,
  `empty_candidate_base_ref_required`); el siguiente candidato se revisa
  sobre el rango commiteado con `--base-ref=main`, no sobre el árbol de
  trabajo limpio, que es lo que la dejó sin target.

- **L8** — Cierre del paso 2 (2026-10-25): los dos commits WIP se
  reescribieron en una unidad revisable —`feat` con el código y el script,
  `docs` con este documento—. `pnpm check` en 0 hallazgos y la suite
  completa en verde: 454 archivos, 2341 tests, con las integraciones y los
  tests de aislamiento contra el Postgres de prueba. Frontera del segundo
  slice: `f6da9ec`, 555 líneas sobre `main` (523 altas, 32 bajas) más el
  arreglo de este documento; va como PR propio, separado del de
  `62c8b2a`+`2fa598e`. T6 abre el tercero.

- **L9** — Revisión nativa del paso 2 (2026-10-25), sobre el rango commiteado
  (`--base-ref=main --committed-only`), no sobre el árbol de trabajo: eso es
  lo que la dejó con target después de la de L6. Linaje nuevo
  `review-a990c4c61ddb23fd`, riesgo medio, 23 rutas, 623 líneas, presupuesto
  de corrección 200. Corrieron los tres lentes elegidos —`risk`,
  `readability`, `reliability`— y cerró **`approved`** sin corrección
  requerida; la autoridad quedó quemada al reconocerla. La revisión es una
  vista externa: no autoriza entrega, que sigue siendo decisión del paso
  siguiente.

- **L10** — Pedido textual: «si dale con la 1 has el merge tu y continua con
  el 2». Issue #105 creada con aprobación explícita posterior del usuario;
  PR #106 mergeado en `3f57911058c12827aacbc3b853f6a312d3110911`, tras los
  cinco jobs de CI en SUCCESS. El push previo agotó 30 s en hooks; el nuevo
  intento autorizado en background completó 1890 tests y publicó la rama.
- **L11** — Decisión de T6: ante «Cuando se elige un domicilio en el alta de
  reporte, ¿qué debe conservar el reporte?», el usuario eligió «El domicilio
  elegido (recomendado)». Se aceptó la descripción completa citada en S7.
  Se preservan los reportes por lugar/calle sin domicilio; no se migra ni
  asigna automáticamente un domicilio a reportes existentes. La búsqueda
  reutilizará el registro de direcciones tenant-scoped; el dato seleccionado
  se vuelve a validar en servidor, nunca se confía en IDs del navegador.
  T6a precede a T6b para separar la migración de la UI. T7 sigue fuera de
  este slice.
- **L12** — T6a: commit `0d34bec`. RED observado por el escritor: 6 fallos
  de domicilio ignorado/no validado. GREEN: 18 unitarios y 8 tests de
  integración/aislamiento contra `xula_test`; typecheck y reglas aprobados.
  Verificador independiente: S7 met, sin bloqueantes; spot check del padre
  18/18. Migración 0021 aplicada solo al entorno de prueba. El hook halló
  formato e imports sin uso, corregidos sin cambiar comportamiento; el
  commit-msg exigió partir el cuerpo a 100 caracteres. Ambos hooks pasaron
  finalmente. ASSESS: nativeRisk medium, reviewDue false; escalado por item 2
  para exigir la verificación independiente ya completada. Snapshot Drizzle
  generado (~3880 líneas); el cambio manual ocupa aproximadamente 700 líneas
  entre producción, pruebas y documentación. Esta es la frontera de la unidad
  persistida; T6b va en su propio commit sin modificar la migración.
- **L13** — T6b parcial, sin commit. Primer retorno del escritor pidió
  restituir la lista de superficies pese a estar incluida en la delegación
  original; se restableció ese contexto sin ampliar permisos. Continuación
  acotada: `pnpm check` exit 0; unitarios enfocados 6 archivos/23 tests;
  integración e aislamiento de búsqueda 2 archivos/13 tests en verde contra
  `xula_test`. RED histórico de T6b no recuperable tras compactación, no se
  considera evidencia observada. Playwright con build nuevo y puerto 3106
  ejecutó 2 tests y ambos fallaron: (1) la fixture inserta un reporte similar
  sin avanzar el contador, por lo que el alta colisiona con
  `reportes_serie_idx` (SQLSTATE `23505`); (2) `getByLabel("Calle")` coincide
  con radio «Lugar y calle» y select «Calle». Faltan guardar/leer el vínculo
  y número desde navegador y completar el camino sin JavaScript. No se
  declara error productivo demostrado ni éxito del recorrido. Se solicita
  decisión sobre otra corrección limitada a la fixture y al locator más la
  repetición del E2E. No se ejecuta otra verificación como sustituto de esa
  prueba fallida. `next-env.d.ts` regenerado por Next se devolvió a sus dos
  imports originales; no cambia como parte de T6. T6a sigue en `0d34bec`,
  sin publicar; T6b y estas notas quedan en el árbol de trabajo. T7 no se
  inició. El diagnóstico de servidor viejo de L7 es una hipótesis histórica,
  no causalidad probada por el nuevo resultado exitoso de aquel test.
- **L14** — El usuario respondió «si» a la corrección adicional limitada a
  fixture de folio y locator. Se cambió la fixture para registrar el reporte
  similar mediante `registrarReporte` y obtener su folio, y el locator a
  `getByLabel("Calle", { exact: true })`. Biome sobre ambos archivos pasó.
  La única ejecución de Playwright autorizada salió con exit 1: build y
  servidor arrancaron, pero importar el caso de uso desde la fixture arrastra
  UI y Node no resuelve `next/link`, vía `src/shared/ui/Boton.tsx`.
  Después informó «No tests found»: cero pruebas de navegador ejecutadas.
  Es un defecto nuevo introducido por la corrección del andamiaje, no un
  fallo productivo demostrado. Sin reintentos ni ampliación de superficies.
  Pendiente decisión para reemplazar esa importación por una preparación
  compatible con el runner (manteniendo contador y folio sincronizados) y
  repetir los dos tests. `next-env.d.ts` restaurado por el padre; T6b sigue
  sin commit. T6a y T7 sin cambios.
- **L15** — El usuario autorizó «si» a reemplazar la importación incompatible
  de la fixture y repetir E2E. El padre usó SQL transaccional de andamiaje
  con rol de aplicación y tenant fijado, sincronizando contador/reporte;
  sin imports de composición ni cambios productivos de persistencia. Biome
  pasó. Job-6: exit 1, un test aprobado (vínculo/número real guardado,
  sugerencias y búsquedas obsoletas) y otro con timeout de 30 s, no aprobado.
  Snapshot del segundo muestra colonia seleccionada y select de calle con
  solo «Ninguna». La versión base `3f57911` también filtraba las calles por
  estado JS inicial vacío: fallo previo, no regresión atribuida al selector
  nuevo. El usuario pidió «Review the delivered subagent output and
  continue.». Se fijó la regla no-JS mediante un test de HTML inicial: RED
  observado (no existía `value="calle-1"`), luego GREEN 3/3. El selector
  inicial ofrece calles rotuladas con su lugar; con JS y lugar elegido
  mantiene el filtro existente. No agrega estado ni dependencias, y la
  validación autoritativa del servidor no cambia. Job-7 ejecuta E2E sobre
  este nuevo candidato y terminó exit 0: ambos tests aprobaron. Se corrigió
  también el formato del test reportado por Biome. El servidor emitió
  `The destination stream closed early` durante el primer test; se conserva
  como diagnóstico no fatal, sin afirmar resuelto su origen. Verificación
  independiente y suite completa todavía pendientes.
- **L16** — Verificación independiente T6b: 24 unitarios y 13 de integración/
  aislamiento aprobados; S7 cumplido. Pidió probar explícitamente límites
  120/121 y ausencia de nombres del otro tenant en etiquetas (sin bug
  productivo reproducido). Se agregaron esas aserciones. Reverificación
  acotada: 5/5 del action aprobados; S5 queda condicionado a la suite final
  del padre. El `pnpm check` del verificador llegó a tipos/dependencias, pero
  `reglas` no corrió por faltar `.git` en su copia aislada; no fue aprobación
  del check completo. Su reporte inicial de limpieza `TRUNCATE` se corrigió:
  era teardown existente de fixtures desechables de `xula_test`, no datos
  vivos ni bloqueo del producto; no se intentó restauración.
- **L17** — Job-8: `pnpm check` falló por dos métricas reales; no llegó a
  ejecutar la suite completa. Archivo de aislamiento de 206 líneas tras
  agregar aserciones y helper de búsqueda con 4 argumentos. Se extrajo la
  fixture de colonia a `direccionConColoniaDePrueba.ts` y se agruparon los
  argumentos del helper en un objeto. Separar programación de búsqueda y
  construcción de errores mantiene también funciones acotadas sin cambiar
  debounce, cancelación o respuestas obsoletas. Job-9 ejecuta check y suite
  completa con cobertura sobre `xula_test`; pendiente. Debe comprobarse
  nuevamente el E2E tras este refactor mecánico. El diff T6b tiene mucho
  andamiaje de prueba: se registrará en unidades separadas de búsqueda,
  selector reutilizable y conexión al formulario, no un solo commit grande.
  No se publica T6 ni se inicia T7.
- **L18** — Job-9 exit 0: `pnpm check` completo aprobado (Biome conserva 54
  warnings y 2 infos), 463 archivos/2375 tests aprobados con cobertura:
  statements 95.95%, branches 91.3%, functions 97.43%, lines 97.13%.
  Cierra la condición pendiente de S5 del verificador; S7 ya cumplía.
  Job-10 exit 0: ambos E2E finales aprobaron tras el refactor del hook,
  incluyendo descarte de respuestas obsoletas y alta sin JS. Persiste el
  diagnóstico no fatal `The destination stream closed early`; no se afirma
  resuelto. No hubo pruebas ni migraciones en producción o `xula_dev`.
  Se restauró exclusivamente el cambio generado de `next-env.d.ts`.
  Tras una partición honesta, T6b requiere tres unidades cohesionadas:
  búsqueda tenant-scoped (594 líneas de diff), selector reutilizable (358)
  e integración con formulario/E2E/documentación (775 antes de esta nota).
  No se recortan pruebas ni comentarios para ajustar el presupuesto de ~400.
  Se pide decisión explícita para aceptar el exceso antes de registrar los
  commits; no se publica ni se inicia T7. El último pedido fue «Review the
  delivered subagent output and continue.».

- **L19** — El usuario autorizó «dale con la recomendacion»: cerrar T6b
  en tres unidades cohesionadas de búsqueda tenant-scoped, selector compartido
  e integración/formulario/E2E/documentación, aceptando el tamaño indicado en
  L18. Se conservan los hooks activos y la evidencia funcional de L18; no se
  repite la suite completa sin cambios de comportamiento. No se publica ni
  se inicia T7 en este cierre. Commits y evaluación de cada unidad: en curso.
- **L20** — Primera unidad registrada en `12d6377`: búsqueda autenticada
  tenant-scoped, 594 líneas de diff. Hooks de Biome, tipos, reglas y mensaje
  aprobados; `vitest related` no seleccionó tests. El primer intento falló
  únicamente por un salto de línea literal en el mensaje; se corrigió sin
  tocar código ni omitir hooks. ASSESS de esta unidad contra `0d34bec`
  no disponible (`nativeRisk: unassessable`): exige declarar los archivos
  nuevos de las otras unidades, que quedaron sin staging al partirlas.
  No es un veredicto ni aprobación nativa; se conserva la verificación
  independiente y funcional de L16/L18. Selector e integración pendientes
  en ese momento; el cierre posterior se registra en L21.
- **L21** — Selector compartido registrado en `d32456a`, 358 líneas:
  hooks aprobados (sin tests seleccionados por `vitest related`), ASSESS
  contra `12d6377`: riesgo medio, `reviewDue: false` (`under_budget`).
  La tercera unidad se identifica por su asunto Git exacto
  `feat(reportes): integra direcciones en el alta nativa`; contiene formulario,
  Server Action de alta, pruebas de unidad/E2E, documentación y este cierre.
  La evidencia funcional es L18; esta continuación solo registra los mismos
  bytes productivos, sin repetir ni inventar RED/GREEN o pruebas de navegador.
  Risk: item 2 (búsqueda autenticada y aislamiento de tenant); verificación
  independiente completada en L16 y suite/E2E finales en L18. T7 no se inicia,
  no se publica y no se aplican migraciones en este cierre.

- **L22** — Publicación posterior autorizada y confirmada: issue #107 con `status:approved`, PR #108 abierto contra `main`, head `2db9ef038e97f65a1ab2441f173d62881ffe63d6`. Cuatro unidades aprobadas y reconocidas individualmente, no aprobación agregada. CI `40611703371`: lint/tipos/capas, unitarios, integración/aislamiento y links aprobados; E2E 48 aprobados y dos fallidos. `direccionDeReporte.spec.ts:177` agotó 30 s en `accederAMotul`, antes del formulario sin JS; `titulos.spec.ts:89` observó dos POST donde exige uno. Ambos archivos del helper/títulos no cambian frente a main; no prueba causalidad preexistente. Sin reejecución ni cambio de código al diagnosticar.
- **L23** — Pedido textual: «si», respuesta a «¿Autorizás ese arreglo y su publicación en el mismo PR #108, sin merge ni T7?». Alcance aceptado en S8; no incluye autenticación productiva ni relajación de las aserciones. T6c abre una unidad adicional con pruebas antes del arreglo; T6a/T6b conservan sus commits y evidencia histórica. Durante preparación local Docker está instalado pero su daemon no responde; los E2E solo pueden sembrar `xula_test`, nunca `xula_dev` ni producción.

- **L24** — Escritor T6c: baseline local de títulos/reportes 5/5 aprobado, sin reproducir el fallo CI original. Regresión añadida contra el endpoint real: RED esperado 200/recibido 429 tras agotar la ventana en memoria. Arreglo de helper aisló el bucket por IP TEST-NET, reutilizó limpieza DB existente y coordinó una respuesta HTTP con navegación commit. GREEN final: 16/16 E2E enfocados, 1912 unitarios y pnpm check aprobados; hubo correcciones intermedias de precondición/orden/imports, no una primera corrida enteramente verde. Sin autenticación productiva modificada. El padre leyó el diff completo y restauró solo next-env.d.ts generado. Sin commit ni push.
- **L25** — ASSESS del candidato T6c: nativeRisk medium, reviewDue false/under_budget; escalado item 4 por coordinación asíncrona, independiente requerida. Verificador aislado ejecutó una sola tanda, exit 1: 19 casos listados, ninguno inició cuerpo por faltar Chromium en su HOME aislado; no son 19 fallos productivos. No instaló ni reintentó. Hallazgos estáticos: callback nuevo en acceso.spec.ts supera 30 líneas y comentario de zonas.spec.ts sigue afirmando que el helper reintenta. Posible waiter pendiente ante error al completar campos/clic quedó sin reproducir, no es un bug demostrado. Falta prueba independiente requerida; T6c no se marca terminado ni se publica. Requiere decisión para corrección acotada y nueva verificación usando el Chromium ya instalado, sin instalaciones, merge ni T7.

- **L26** — Pedido textual: «si», respuesta a «¿Autorizás corregir esos dos puntos y hacer **una nueva verificación usando la caché de Chromium ya instalada** en `/Users/joelmay/Library/Caches/ms-playwright`, sin instalar nada?». Se autoriza una corrección acotada de métricas/comentario y una nueva verificación con PLAYWRIGHT_BROWSERS_PATH explícito. Se confirmó que Chromium 1234 existe en esa caché. Siguen vigentes publicación en PR #108, sin merge ni T7; no se instala navegador.

- **L27** — Corrección acotada autorizada en L26 completada: funciones/callback nuevos extraídos sin quitar aserciones y comentario de reintentos de zonas eliminado. El primer check del escritor falló solo formato; aplicó el wrap indicado. Spot check del padre job-11 exit 0: pnpm check completo aprobado, 54 warnings y 2 infos existentes. La nueva verificación independiente, con Chromium existente explícito y copia fresca, ejecutó 19 casos: 18 aprobados y 1 fallido (exit 1). Los 16 E2E enfocados y probes de respuesta demorada/carga incompleta/correo alternativo y HTTP 401 aprobaron. El probe de fallo al completar campos reprodujo un defecto nuevo: enviarCredenciales inicia waitForResponse, fill rechaza, y al cerrar el contexto el waiter huérfano genera rechazo no manejado. No existía ese waiter en baseline. Ambos bloqueantes estáticos resueltos; S8/T6c sigue sin completar por el nuevo bloqueante runtime. Sin corrección automática adicional, commit ni push; requiere decisión sobre una corrección limitada del waiter con prueba de regresión y reverificación acotada. T7 y merge siguen fuera de alcance.

- **L28** — Pedido textual: «si», respuesta a «¿Autorizás corregir únicamente esa espera pendiente, guardar el caso como prueba de regresión y reverificar ese fallo antes de publicar?». Se autoriza corrección limitada del manejo del waiter ante fallo de fill/click, prueba permanente del caso reproducido y reverificación de ese bloqueo; se conservan las pruebas exitosas y las restricciones de no merge/no T7.

- **L29** — Corrección del waiter autorizada en L28: regresión permanente `e2e/acceder.spec.ts` (78 líneas), RED observado con rechazo huérfano y GREEN 1/1 tras llenar campos antes de crear waiter y observar click/respuesta con Promise.all. Check final del escritor aprobado tras formato. Reverificación independiente limitada al bloqueo: 1/1 aprobado, exit 0, conservando TimeoutError original, cero POST y cero rechazos no manejados. Los otros 18 aprobados de L27 son evidencia previa, no una suite repetida. Parent leyó el diff/prueba, restauró solo next-env.d.ts generado y ejecuta spot check final job-12; T6c sigue en curso hasta observarlo. Sin commit ni push todavía. Risk: item 4 (coordinación asíncrona); sin autenticación productiva, merge ni T7.

- **L30** — Spot check final del padre job-12 exit 0: pnpm check completo, 54 warnings y 2 infos existentes, typecheck/capas/reglas aprobados. T6c/S8 verificado y marcado completo como implementación; el registro/publicación pasa a la tarea de entrega del PR #108. La nueva unidad incluye arnés, regresiones y estas notas; asunto de commit `fix(auth): coordina un solo acceso sin esperas huerfanas`, sin reescribir los cuatro commits revisados. SHA se registra después del commit. ASSESS de la unidad: nativeRisk medium, reviewDue false/under_budget, item 4 con independiente completada; no se inició otra revisión nativa. Publicación/CI pendientes, sin merge ni T7.

- **L31** — Primer intento de registro job-13 rechazado únicamente por commitlint: `e2e` no es un scope permitido. Los hooks previos llegaron a reglas sin hallazgos; no hubo commit ni push. Se corrige el scope del mensaje a `auth`, permitido por la política del repositorio, sin modificar los bytes del arnés/pruebas ni omitir hooks. No es un fallo funcional ni invalida la verificación de T6c.
