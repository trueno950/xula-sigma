# Bloque B: mapa operativo visual y acotado al territorio

Hoy el mapa pinta todos los hechos como círculos iguales y lo limita la caja de todo Yucatán. No se puede elegir entre la cabecera y una comisaría. Rama `feat/mapa-territorial`, desde `main` en `bbbd05a`. El pedido completo y su Log viven en `odd/tasks/intervenciones-trazabilidad.md` (L1-L3), que es el bloque A.

## Specs

- **S1** — Selector de territorio en `/mapa-operativo`. Las opciones son «Todo el municipio», la cabecera y cada comisaría (`listarRaices`). Viaja como parámetro GET `?lugar=` y filtra reportes e intervenciones por el subárbol del lugar elegido. El criterio de pertenencia (lugar del hecho o lugar de la calle) se fija con un test. Un `?lugar=` de otro municipio o inexistente no muestra hechos ajenos.
- **S2** — «BLIEARAS POR EJEMPLO LA LOCALIDAD»: la vista queda bloqueada al territorio elegido. `maxBounds` es la caja de las calles ubicadas de ese territorio, con margen, y `minZoom` no deja alejarse a otras localidades. Con «Todo el municipio», la caja es la de todas las calles del municipio. Si el territorio no tiene calles ubicadas, el mapa vuelve a la vista de Yucatán y lo avisa; nunca inventa un centro.
- **S3** — «MARCAR CON ICONOS LOS REPORTES»: un ícono por tipo de reporte (bache, alumbrado, fuga, basura, parque, otro) y por tipo de intervención, un color por estado y una leyenda con conteos. Los colores salen del servidor (antipatrón 13). Los íconos son SVG en el código, nunca archivos escritos al disco (regla 10).
- **S4** — Varios hechos sobre la misma calle comparten punto: se agrupan en un marcador con contador. Su ventana lista folio, tipo, estado y fecha de cada hecho, sin datos personales.
- **S5** — Sin JavaScript sigue estando la lista de hechos que ya existe, ahora también filtrada por territorio. La leyenda es HTML del servidor.
- **S6** — Reglas de `AGENTS.md`:
  - todo pasa por `withTenant`;
  - el `ayuntamiento_id` sale del contexto;
  - no se agrega ninguna dependencia nueva sin justificarla;
  - no se crea tabla ni migración (`openspec/specs/mapa-operativo/spec.md`: «Sin GIS nuevo»).

## Tasks

- [x] **T1** (S1, S2, S5) selector de territorio, filtro por subárbol y vista bloqueada a la caja de sus calles; tests de dominio, de integración y E2E — worker — commit:
- [ ] **T2** (S3, S4, S5) íconos por tipo, color por estado, leyenda y agrupación por calle — worker — commit:
- [ ] **T3** (S1-S6) verificador independiente, revisión, PR y merge — verify — commit:

## Log

- **L1** — 2026-11-16. El pedido y las decisiones están en `odd/tasks/intervenciones-trazabilidad.md` L1-L3.
- **L2** — 2026-11-16. Recorrido:
  - Los marcadores son `circleMarker` de un color por recurso (`mapa-operativo/ui/mapaLeaflet.ts:22-24,67-79`).
  - `maxBounds` es la caja de Yucatán (`:8-15,49-52`).
  - Los lugares no tienen coordenadas; solo las calles tienen punto (`territorio/infrastructure/esquemaDeCalles.ts:26-38,63-65`).
  - Reportes e intervenciones ya traen `lugarId`, pero el adaptador del mapa lo descarta (`mapa-operativo/infrastructure/fuentesDeMapa.ts:8-31`).
- **L3** — 2026-11-16. T1 (S1, S2, S5), hecho por el worker y con commit del padre.
  - Criterio de pertenencia (`application/territorioElegido.ts`): la calle del hecho decide el territorio. Si el hecho no tiene una calle legible, decide su propio `lugarId`.
  - La caja del mapa sale de `domain/cajaDelMapa.ts`: margen mínimo de 0.005° y el 10% de la extensión por encima de eso; sin calles ubicadas devuelve `null`. El cliente bloquea la vista con `maxBounds`, `maxBoundsViscosity` 1 y `minZoom` de `getBoundsZoom`. Sin caja, vuelve a Yucatán y muestra un aviso.
  - RED: 9 archivos y 17 tests fallaban por las razones esperadas.
  - GREEN: unit 13 archivos / 70 tests; integración 5/5; typecheck, layers y reglas en 0; build en 0; E2E `mapa-operativo.spec.ts` 4/4 en el puerto 3108 sobre `xula_test_b`.
  - Falta un dato: `ReporteParaMapa` e `IntervencionParaMapa` no exponen fecha, así que la ventana de S4 va sin fecha.
  - Riesgo de integración con el bloque A: `TIPOS_DE_INTERVENCION_PARA_FILTRO` no tiene `PAVIMENTACION`.
