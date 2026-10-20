# Cierre de direcciones y zonas operativas

Objetivo: terminar el desarrollo aislado del SDD territorial y cerrar documentalmente el mapa.
Rama: `feat/cierre-direcciones-y-zonas`; entrega: un PR, un merge, sin publicar automáticamente; runner: Vitest y Playwright con bases aisladas.

## Specs

- **S1** — Pedido original: «dale con eso bbyb», aceptando retomar `direcciones-y-zonas-operativas` y cerrar formalmente `mapa-operativo-territorial`. Contratos vigentes: propuesta, diseño, deltas y tareas de ambos cambios en `openspec/changes/`.
- **S2** — Decisión explícita: «Seguir en una base aislada — recomendado». Alcance aceptado: «Autorizás ajustar el plan para desarrollar y verificar B2/B3u sin tocar datos reales. B3d queda pendiente para una ventana operativa posterior; el SDD no se declara completamente cerrado mientras falte esa operación.»
- **S3** — Restricciones conservadas del trabajo anterior: documentación y commits en español; un PR, un merge, sin ramas apiladas; no push, PR ni ejecución sobre datos reales sin autorización. Los tests de aislamiento/integración comparten base: un único ejecutor a la vez.

- **S4** — Aprobación explícita: «Sí, completar B2 con esa sobrecarga». Alcance: «Autorizás el tamaño previsto del corte inseparable, con sus pruebas, documentación y verificación independiente. Seguimos luego con B3u; no autoriza publicar ni ejecutar la operación real.»

## Tasks

- [x] **T1** · S1-S3 · inline · terminada — Numeración, entrega y dependencia reconciliadas; commit `6cc8324`; `git diff --check` y aserciones estructurales en verde; hook: tipos y reglas sin hallazgos.
- [x] **T2** · S1,S3 · inline tras handoff — Siete deltas fusionados; 0019 documentado; archivo `openspec/changes/archive/2026-10-20-mapa-operativo-territorial/`; canonicos anteriores conservados, sin duplicar territorio. Comprobacion estructural de las siete capacidades y `git diff --check` exit 0. Commit documental en preparacion.
- [ ] **T3** · S1-S4 · inline, en curso — Recuperación directa del diff autorizada por el usuario («si»). No se relanza el worker que falló por timeout. Código, fixtures y 0020 siguen sin commit ni verificación final. Risk: item 1 (migración CHECK); auto-verificación e independiente pendientes.
- [ ] **T4** · S1-S3 · secuencial tras T3 — B3u: administración de zonas, formularios nativos, aislamiento y e2e; commit pendiente.
- [ ] **T5** · S1-S3 · inline — Verificación final, revisión aplicable y actualización del SDD sin fingir cierre operativo; commit pendiente.
- [ ] **T6** · S2 · bloqueada — B3d-REFACTOR-06: espera autorización de ventana operativa por municipio, entorno, responsables y respaldo. Diferida expresamente; no ejecutar ni marcar completa.

## Log

- **L1** — Pedido original, textual: «dale con eso bbyb».
- **L2** — Ante la dependencia B3d → B2, el usuario eligió «Seguir en una base aislada — recomendado» con el alcance literal de S2. Se permite desarrollar B2/B3u y verificarlos sobre estado aislado; no se permite operar sobre datos reales.
- **L3** — Base `90164bb`; 0019 pertenece al payload de historial, por lo que el corte usará la siguiente migración libre, hoy 0020. Mapa tiene 35 casillas hechas y evidencia histórica, pero falta reconciliar deltas y cierre formal. Direcciones conserva 13 casillas pendientes. CI remoto bloqueado antes de ejecutar por facturación de GitHub; no confundir con fallo funcional.
- **L4** — Pronóstico: B2 ya estimaba 850–1050 líneas autorales inseparables; B3u requiere aplicación, persistencia y UI con pruebas, a dividir en unidades coherentes. La selección de un PR no constituye aprobación de una excepción de tamaño. Se resolverá el requisito escrito de B2 antes de aplicar ese corte. T2 documental puede avanzar independientemente.
- **L6** — El usuario eligió «Sí, completar B2 con esa sobrecarga», aprobando la unidad de 850–1050 líneas previstas. Se implementarán T2 y T3 en paralelo porque son independientes y sustanciales: documentación canónica del mapa frente al corte territorial. Ningún worker toca el documento ODD, el runbook operativo ni ejecuta migraciones sobre bases existentes.
- **L5** — T1 verificada y guardada en `6cc8324`: sólo documentación, sin RED funcional aplicable. Se observaron `git diff --check`, aserciones de numeración/entrega/precondición, typecheck y reglas del hook; no se ejecutaron suites funcionales ni datos reales.

- **L7** — Fallo de ejecución: `mvgtx90k-f-2kz4` terminó por timeout de inactividad (4 min tras bash), sin resultado final. El árbol conserva 0020/snapshot/journal y múltiples cambios B2 sin verificar. También modificó `src/app/(panel)/territorio/page.domicilio.test.tsx`, fuera de la superficie delegada; no se acepta silenciosamente ese desvío. No se relanza el ejecutor ni se presenta ningún test como pasado. El padre sólo inspeccionó estado/diff y llamó ASSESS: nativeRisk unassessable por untracked sin declaración; escalamiento explícito item 1 produce plan high con auto-verificación y verificador independiente. Ninguno se sustituye por revisión nativa. Falta recuperar y terminar el escritor antes de verificar.
- **L9** — Usuario: «si», en respuesta a autorizar conservar y recuperar el diff B2 mediante ejecución directa, sin relanzar automáticamente el subagente fallido. La recuperación incluye comprobación del estado y terminación de la unidad antes de B3u; no autoriza publicación ni datos reales.
- **L8** — T2 devolvió `interaction_required` por superficie: el delta mapa/specs/territorio pertenece al canónico jerarquia-territorial, no a un nuevo spec territorio. Se preservan las seis fusiones y el verify-report parcial sin fingir cierre; falta la séptima fusión y archivo. No se modifica ni archiva el SDD de direcciones. Decisión requerida para seguir tras el timeout: conservar y completar el diff B2 existente mediante ejecución controlada, o dejarlo pausado. Sin push/PR ni operación sobre datos reales autorizados.

- **L10** — Recuperación B2: job-50 unitario 317/1826 verde; job-56 check exit 0 (54 warnings, 2 infos). RED de integración observado en jobs 52/53/54: casing snake_case, tenant ausente al probar CHECK, transacción anidada con pool max1, Date crudo en SQL y dos aserciones de fixtures antiguas. Corregidos sin aumentar timeouts; job-57: 3 archivos/10 pruebas verdes. Caracterización retrospectiva del catálogo: base 6cc8324 exit 1, implementación exit 0; raíces, catálogo de calles y matriz entre tipos conservados con stdout/stderr y exit idénticos. No se afirma TDD cronológico del worker interrumpido. E2E completo job-58 en base aislada/puerto 5100 pendiente. T2 se termina en paralelo a esa prueba; no se toca B3u todavía.

- **L11** — T2 documental verificada: siete deltas literales y todos los bloques canonicos anteriores preservados; jerarquia-territorial queda en 20 requisitos/44 escenarios. Mapa archivado con informes de verificacion/archivo y evidencia historica distinguida de B2. Referencia activa al diseno corregida; B3d-REFACTOR-06 sigue pendiente y el SDD de direcciones sigue activo. No existe recibo nativo SDD: herramienta no disponible, no se fabrica.
