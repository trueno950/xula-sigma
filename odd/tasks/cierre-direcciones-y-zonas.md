# Cierre de direcciones y zonas operativas

Objetivo: terminar el desarrollo aislado del SDD territorial y cerrar documentalmente el mapa.
Rama: `feat/cierre-direcciones-y-zonas`; entrega: un PR, un merge, sin publicar automáticamente; runner: Vitest y Playwright con bases aisladas.

## Specs

- **S1** — Pedido original: «dale con eso bbyb», aceptando retomar `direcciones-y-zonas-operativas` y cerrar formalmente `mapa-operativo-territorial`. Contratos vigentes: propuesta, diseño, deltas y tareas de ambos cambios en `openspec/changes/`.
- **S2** — Decisión explícita: «Seguir en una base aislada — recomendado». Alcance aceptado: «Autorizás ajustar el plan para desarrollar y verificar B2/B3u sin tocar datos reales. B3d queda pendiente para una ventana operativa posterior; el SDD no se declara completamente cerrado mientras falte esa operación.»
- **S3** — Restricciones conservadas del trabajo anterior: documentación y commits en español; un PR, un merge, sin ramas apiladas; no push, PR ni ejecución sobre datos reales sin autorización. Los tests de aislamiento/integración comparten base: un único ejecutor a la vez.

## Tasks

- [ ] **T1** · S1-S3 · inline · en curso — Reconciliar numeración, entrega y dependencia operativa en el SDD/runbook; commit pendiente.
- [ ] **T2** · S1,S3 · delegado si independiente de T3 — Cerrar evidencia y archivar mapa con fusión correcta de deltas, incluyendo historial 0019; commit pendiente.
- [ ] **T3** · S1-S3 · por resolver tras T1 — B2: corte de tipos/CHECK y contratos, sin migrar datos reales; TDD y verificación independiente por riesgo de migración; commit pendiente.
- [ ] **T4** · S1-S3 · secuencial tras T3 — B3u: administración de zonas, formularios nativos, aislamiento y e2e; commit pendiente.
- [ ] **T5** · S1-S3 · inline — Verificación final, revisión aplicable y actualización del SDD sin fingir cierre operativo; commit pendiente.
- [ ] **T6** · S2 · bloqueada — B3d-REFACTOR-06: espera autorización de ventana operativa por municipio, entorno, responsables y respaldo. Diferida expresamente; no ejecutar ni marcar completa.

## Log

- **L1** — Pedido original, textual: «dale con eso bbyb».
- **L2** — Ante la dependencia B3d → B2, el usuario eligió «Seguir en una base aislada — recomendado» con el alcance literal de S2. Se permite desarrollar B2/B3u y verificarlos sobre estado aislado; no se permite operar sobre datos reales.
- **L3** — Base `90164bb`; 0019 pertenece al payload de historial, por lo que el corte usará la siguiente migración libre, hoy 0020. Mapa tiene 35 casillas hechas y evidencia histórica, pero falta reconciliar deltas y cierre formal. Direcciones conserva 13 casillas pendientes. CI remoto bloqueado antes de ejecutar por facturación de GitHub; no confundir con fallo funcional.
- **L4** — Pronóstico: B2 ya estimaba 850–1050 líneas autorales inseparables; B3u requiere aplicación, persistencia y UI con pruebas, a dividir en unidades coherentes. La selección de un PR no constituye aprobación de una excepción de tamaño. Se resolverá el requisito escrito de B2 antes de aplicar ese corte. T2 documental puede avanzar independientemente.
