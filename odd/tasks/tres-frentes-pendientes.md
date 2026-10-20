# Los tres frentes pendientes

Cerrar lo que quedó abierto después de la auditoría de documentación: la suite
e2e sin reja en CI, los dos avisos de accesibilidad preexistentes y la deuda
funcional de territorio.

## Specs

- **S1.** «el job de e2e en CI» — que los specs que hoy están verdes dejen de
  depender de que alguien se acuerde de correrlos. Hoy `.github/workflows/ci.yml`
  no tiene una sola referencia a Playwright.
- **S2.** «los dos avisos moderados de axe» — `region` en la barra superior
  móvil del shell del panel y `heading-order` por el `h3` de
  `src/shared/ui/Panel.tsx`. Ninguno es WCAG A/AA (con esos tags el barrido da
  0), pero son deuda de accesibilidad real.
- **S3.** «la deuda funcional del territorio» — del documento
  `odd/tasks/territorio-ux.md`, rebanada U5 y U6:
  (a) las filas del registro de domicilios sin `raizId` no enlazan si no hay
  filtro de asentamiento;
  (b) el domicilio de la entrada muestra un select de Colonia vacío porque esa
  pantalla no tiene zonas;
  (c) selector de calle con búsqueda, como hoja `use client` mínima;
  (d) el historial no puede mostrar nombre anterior/nuevo, coordenadas, folio
  ni lugar anterior: `EntradaDeHistorial` solo trae
  `{ id, naturaleza, ocurridoEn, precision }` y ampliarlo exige cambio de capa
  de datos, con decisión del humano.

## Tasks

- [x] **T1** · S1 · delegado — Job de e2e en CI como reja que bloquea, con
  Postgres como el job `aislamiento`, `playwright install chromium` y la
  documentación actualizada. Commit `f15f26e`: reporter `[github, html]` y
  artefacto si falla, `playwright-report/` ignorado. **Sin verificar en
  ejecución real**: el workflow no corre en local, lo prueba el primer PR.
- [x] **T2** · S2 · delegado — Cerrar los dos avisos de axe sin debilitar
  ninguna aserción existente. Commit `8637331`: barra móvil a `header`,
  `Panel` a `h2` y el mismo salto `h1→h3` en `PanelDeCalle` y
  `DatosDeDomicilio`. Medido con axe-core 4.12.1: 0 violaciones a 390×844 y a
  1280×900, barra comprobada como `header` único y secuencia `h1→h2`.
- [x] **T3** · S3(a,b,c) · delegado — Los tres arreglos de territorio que no
  necesitan decisión de producto. `raizId` derivado por tres saltos en la
  consulta (la fila siempre enlaza), Colonia vacía ofrecida deshabilitada con
  salida nombrada, y selector de calle con búsqueda que degrada a la lista
  completa sin JavaScript. Verificación del padre: check 0, unit 315/1830,
  integration 121/434 —el test 434 es la cadena manzana→sector→colonia→cabecera.
- [ ] **T4** · S3(d) · decidir — Si el historial amplía su capa de datos para
  mostrar nombre anterior/nuevo, coordenadas y folio.
- [ ] **T5** · S1-S3 · directo — `pnpm check` y suites en verde; commits por
  unidad y revisión nativa.

## Log

- **L1** — Pedido original, textual: «vanos por esos 3 puntos para continuar
  limpio», sobre la lista que el agente dejó abierta al cerrar la auditoría:
  el job de e2e en CI, los dos avisos de axe y la deuda funcional del
  territorio.
- **L2** — Revisión nativa del rango `1e027a8..HEAD` (11 archivos, 237
  líneas): **aprobada** con un aviso informativo (R2-task-status) por las
  casillas de este documento sin marcar mientras el trabajo ya estaba hecho.
  Corregido acá. Autoridad quemada.
