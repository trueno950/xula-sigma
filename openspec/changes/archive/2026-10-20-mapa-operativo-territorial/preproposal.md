# Estado pre-propuesta: mapa operativo territorial

> `gentle-ai.sdd-preproposal/v1`

## Revision

`3`

## Exploración

- outcome: `done`
- referencia: `openspec/changes/mapa-operativo-territorial/exploration.md`

## Investigación

- solicitada: sí (carril documentation-only; obligatorio antes de
  `sdd-propose`)
- clases solicitadas: Next.js 16 revalidation, Leaflet/React-Leaflet lifecycle,
  OSM tile/atribución, polling vs push
- revisión `1`: outcome `blocked` — grants observados `documentation: []`,
  `open-web: []`
- revisión `2` (retry): outcome `blocked` — grants de evidencia vacíos y sin
  mecanismo de recuperación; admisión denegada
- decisión de usuario: **carril deseleccionado** tras dos intentos
  fail-closed; `research.md` (revisión `2`, `blocked`) se conserva como
  historial de recuperación y NO es fuente de esta propuesta
- outcome: `unselected`

## Referencias de evidencia

- OpenSpec: `openspec/changes/mapa-operativo-territorial/research.md`
  (revisión `2`, outcome `blocked`, historial)
- Engram: no aplica (store nativo declarado: `openspec`)

## Decisiones de producto

- estado: `confirmed`
- 1. Primer release: mapa operativo **y** registro de intervenciones/obras
  (obra, repavimentación, mejora, fuga, alumbrado, bache, trabajo municipal
  afín); alcance mayor que la vertical mínima de exploración.
- 2. Ubicación aproximada por punto de calle existente; sin punto exacto por
  reporte/intervención en este cambio.
- 3. Actualización push en tiempo real; SSE o WebSockets evaluados y
  seleccionados en la propuesta; sin degradar a polling.
- 4. Visibilidad inicial: panel municipal autenticado.
- 5. Línea de tiempo de calle en este release, diferenciando reportes,
  intervenciones, obra, repavimentación, mantenimiento, mejoras y eventos de
  calle relevantes.

## Propuesta admisible

`proposal_ready: true`
