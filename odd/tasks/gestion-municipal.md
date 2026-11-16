# Bloque C: herramientas de gestión para el municipio

Va después de los bloques A (`odd/tasks/intervenciones-trazabilidad.md`) y B (`odd/tasks/mapa-territorial.md`), porque toca reportes y el mapa. El pedido completo y su Log viven en el bloque A, L1-L3. La rama se crea desde `main` cuando A y B ya estén fusionados.

## Specs

- **S1** — Umbral de atraso «CONFIGURABLE»: cada ayuntamiento fija cuántos días sin atender marcan un reporte como atrasado. El valor por defecto es 7, el mismo que se recomendó. Lo cambia un rol administrador desde el panel. El atraso se calcula en fecha civil por `shared/lib/fecha` y se ve en la bandeja de reportes y en el mapa.
- **S2** — Filtros y conteos por colonia o lugar, y por área responsable, en la bandeja de reportes y en el mapa.
- **S3** — Calles sin ubicar por localidad: cuántas calles de cada territorio no tienen punto, con enlace para ubicarlas.

## Tasks

- [ ] **T1** (S1) umbral de atraso configurable y su señal en la bandeja y el mapa — pendiente: espera a A y B
- [ ] **T2** (S2) filtros y conteos por lugar y por área — pendiente: espera a A y B
- [ ] **T3** (S3) calles sin ubicar por localidad — pendiente: espera a B
- [ ] **T4** (S1-S3) verificador, revisión, PR y merge — verify

## Log

- **L1** — 2026-11-16. El pedido y las decisiones están en `odd/tasks/intervenciones-trazabilidad.md` L1-L3.
