# Bloque B: mapa operativo visual y acotado al territorio

Hoy el mapa pinta todos los hechos como círculos iguales y lo limita la caja de todo Yucatán. No se puede elegir entre la cabecera y una comisaría. Rama `feat/mapa-territorial`, desde `main` en `bbbd05a`. El pedido completo y su Log viven en `odd/tasks/intervenciones-trazabilidad.md` (L1-L3), que es el bloque A.

## Specs

- **S1** — Selector de territorio en `/mapa-operativo`. Las opciones son «Todo el municipio», la cabecera y cada comisaría (`listarRaices`). Viaja como parámetro GET `?lugar=` y filtra reportes e intervenciones por el subárbol del lugar elegido. El criterio de pertenencia (lugar del hecho o lugar de la calle) se fija con un test. Un `?lugar=` de otro municipio o inexistente no muestra hechos ajenos.
- **S2** — «BLIEARAS POR EJEMPLO LA LOCALIDAD»: la vista queda bloqueada al territorio elegido. `maxBounds` es la caja de las calles ubicadas de ese territorio, con margen, y `minZoom` no deja alejarse a otras localidades. Con «Todo el municipio», la caja es la de todas las calles del municipio. Si el territorio no tiene calles ubicadas, el mapa vuelve a la vista de Yucatán y lo avisa; nunca inventa un centro.
- **S3** — «MARCAR CON ICONOS LOS REPORTES»: un ícono por tipo de reporte (bache, alumbrado, fuga, basura, parque, otro) y por tipo de intervención, un color por estado y una leyenda con conteos. Los colores salen del servidor (antipatrón 13). Los íconos son SVG en el código, nunca archivos escritos al disco (regla 10).
- **S4** — Varios hechos sobre la misma calle comparten punto: se agrupan en un marcador con contador. Su ventana lista folio —o el tipo, cuando el hecho es una intervención—, tipo y estado de cada hecho, sin datos personales. **La fecha queda fuera de este bloque**: ni `listarReportesParaMapa` ni `listarIntervencionesParaMapa` la exponen, y agregarla obliga a tocar `reportes` e `intervenciones`, que el bloque A está cambiando en paralelo. Pasa al bloque C (`odd/tasks/gestion-municipal.md`) cuando A esté fusionado.
- **S5** — Sin JavaScript sigue estando la lista de hechos que ya existe, ahora también filtrada por territorio. La leyenda es HTML del servidor.
- **S6** — Reglas de `AGENTS.md`:
  - todo pasa por `withTenant`;
  - el `ayuntamiento_id` sale del contexto;
  - no se agrega ninguna dependencia nueva sin justificarla;
  - no se crea tabla ni migración (`openspec/specs/mapa-operativo/spec.md`: «Sin GIS nuevo»).

## Tasks

- [x] **T1** (S1, S2, S5) selector de territorio, filtro por subárbol y vista bloqueada a la caja de sus calles; tests de dominio, de integración y E2E — worker — commit: fa73040
- [x] **T2** (S3, S4, S5) íconos por tipo, color por estado, leyenda y agrupación por calle — worker — commit: b79f29b
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
- **L4** — 2026-11-16. T2 (S3, S4, S5), hecho por el worker y sin commit (las escrituras de git son del padre).
  - Iconos: `domain/iconos.ts` tiene un icono por tipo y `ui/iconosDelMapa.ts` guarda sus trazos en el código, como datos y no como componentes, porque los necesitan los dos caminos: el pin de Leaflet los pide como texto para `divIcon` y la leyenda los pinta con `IconoDeMapa`. Un tipo desconocido cae a `OTRO`, y hay un test que lo fija.
  - `PAVIMENTACION` se adelanta al bloque A en el icono, en la etiqueta y en la copia del vocabulario. La excepción está declarada una sola vez, en `infrastructure/vocabulariosSincronizados.test.ts`, junto con el test que falla el día que el catálogo dueño la tenga: la excepción se borra sola. Esto resuelve el riesgo que anotó L3.
  - Colores: `domain/coloresDeEstado.ts` decide un color por estado en el servidor y viaja como dato; dos estados del mismo recurso nunca comparten color y uno desconocido cae a un gris que no usa ningún otro.
  - Agrupación (S4): `domain/agrupacion.ts` agrupa por calle y `application/marcadores.ts` arma el pin. Varios hechos sobre la misma calle son un pin con contador (`data-hechos`), el pin lleva el icono y el color del hecho predominante y cada hecho conserva los suyos adentro.
  - La ventana del pin lista folio —o el tipo, si es una intervención—, tipo y estado de cada hecho. **Va sin fecha**: `ReporteParaMapa` e `IntervencionParaMapa` no la exponen y el mapa no la pide por otra puerta. Tampoco lleva dato personal alguno; la lista y la ventana se arman como texto y se escapan (`ui/escaparHtml.ts`).
  - Leyenda (S5): `ui/LeyendaDelMapa.tsx` es HTML del servidor con icono, etiqueta, conteo por tipo y por estado, y la muestra de color es la que decidió el servidor. La lista sin JavaScript muestra lo mismo (`ui/ListaDeMarcadores.tsx`).
  - RED: 15 archivos y 44 tests fallando por las razones esperadas —`agruparEnCalles`, `construirLeyenda`, `colorDeEstado` e `iconoDe` no existían, el marcador no tenía `hechos` y `PAVIMENTACION` no estaba en la copia del vocabulario—.
  - GREEN: `vitest related --run --project unit` 21 archivos / 131 tests; integración 6/6 contra `xula_test_b`; `pnpm typecheck`, `pnpm layers` y `pnpm reglas` en 0; `pnpm check` en 0 con sus 52 avisos previos fuera de esta superficie; `pnpm build` en 0; E2E `mapa-operativo.spec.ts` 5/5 en el puerto 3108 (incluye el pin agrupado con contador y los conteos de la leyenda).
  - Queda en manos del padre el commit de T2; el árbol queda listo para `git add`.
- **L5** — 2026-11-16. Veredicto del verificador independiente y corrección acotada, sin commit (las escrituras de git son del padre).
  - Veredicto: S1, S2, S3, S5 y S6 cumplidos; S4 bloqueado por la fecha. Avisos: el cuerpo de `agregarMapa` pasaba de 30 líneas, y un `?lugar=` con un lugar que no es raíz —una colonia del propio municipio— filtraba el mapa pero dejaba el selector en «Todo el municipio».
  - Decisión del padre sobre el bloqueo: la fecha de la ventana de S4 sale del bloque B. S4 quedó reescrita arriba y la fecha pasa al bloque C cuando A esté fusionado. Se borró la aserción que fijaba su ausencia en `ui/htmlDeMarcador.test.ts`: era el único sitio que la nombraba, y ahora la decisión vive acá.
  - Sonda de XSS durable en `ui/htmlDeMarcador.test.ts`: lista blanca `ul/li/a/span/svg/path` y un marcador con `etiqueta`, `href`, `etiquetaDeTipo`, `etiquetaDeEstado` y color hostiles. Nada que no esté en la lista sobrevive en `htmlDeMarcador` ni en `htmlDeLaVentana`.
  - El color era el único valor que entraba a una hoja de estilo; ahora `domain/coloresDeEstado.ts` exporta `colorVerificado`, que exige la forma `#rrggbb` y cae al gris neutro si no la tiene. El test lo fija con `red\"><script>alert(1)</script>`.
  - `application/territorioElegido.test.ts`: un hecho cuya calle tiene `punto: null` sigue resolviendo por el `lugarId` de la calle, no por el suyo; entra al subárbol de esa calle y va a cobertura faltante.
  - `?lugar=` que no es raíz: `raizElegida` en `application/territorioElegido.ts` decide, y un lugar que no es raíz no es una selección —no filtra, vale «todo el municipio» y el selector queda en su marcador—. Fijado en `agregarMapa.territorio.test.ts` (colonia, lugar ajeno, id inexistente) y en la integración contra Postgres, que además comprueba que no se cuela un hecho de Ticul: eso lo sigue garantizando RLS.
  - `agregarMapa.ts` partido en `leerMapa` (las cuatro lecturas juntas y el subárbol, que espera a las raíces) y `componerMapa` (filtro, marcadores, caja, leyenda). El cuerpo de `agregarMapa` quedó en dos líneas, sin cambio de comportamiento.
  - RED: 5 tests fallando por las razones esperadas —el color hostil se escribía, los tres casos de lugar no raíz seguían filtrando y la comisaría sin calles devolvía la caja del municipio—.
  - GREEN: unit 21 archivos / 137 tests; integración 7/7 contra `xula_test_b`; `pnpm reglas`, `pnpm biome check`, `pnpm typecheck` y `pnpm layers` en 0; `pnpm build` en 0; E2E `mapa-operativo.spec.ts` 5/5 en el puerto 3108.
- **L6** — 2026-11-16. El bloque A entró a `main` (PR #139, `29063df`).
  - La rama se rebasó sobre `main` sin conflictos.
  - Se retiró la excepción de `PAVIMENTACION`, que ahora sí tiene dueño en `intervenciones`. `vocabulariosSincronizados.test.ts` vuelve a comparar la copia completa con el catálogo dueño, y se borraron los comentarios de «adelantada» en `vocabularios.ts`, `iconos.ts` y `parametros.test.ts`.
  - Unit del mapa 134/134; `pnpm check` en 0.
- **L7** — 2026-11-16. Revisión nativa en tres partes, sobre la rama rehecha encima de `main`.
  - Parte 1 (`f0c6ede`, territorio): aprobada.
  - Parte 2: tras el rebase, el commit de íconos (`7334750`) quedó con un test roto. `main` ya traía `PAVIMENTACION` y la excepción «adelantada» fallaba. RED confirmado en ese commit (2 tests).
  - La corrección retira la excepción, igual que `71bf662`. El validador la rechazó porque solo leyó el diff: no vio que el valor ya venía de la base.
  - Resolución: la historia se rehízo en `feat/mapa-territorial-v2`, con el retiro de la excepción fundido en el commit de íconos. Así ese commit nunca introduce la excepción. El árbol final es idéntico a `71bf662`, salvo este registro.

