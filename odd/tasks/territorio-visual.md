# Territorio: ajustes visuales

Llevar las pantallas de Territorio al sistema de `DESIGN.md` según la
auditoría visual del 2026-11-05 (30 capturas, escritorio 1440 px y móvil
390 px). Rama `feat/territorio-visual`, un PR. Runner: Vitest, Playwright y
`pnpm check`; verificación final con capturas antes y después.

## Specs

Cada S cita el hallazgo de la auditoría visual; el arreglo sale de su texto.

- **S1.** A1: «los formularios y paneles se abren **debajo de la lista
  completa**: en una pantalla de 1366×768 o en el celular, la operadora toca
  "Registrar domicilio" o una calle y no ve que pasó nada». Arreglo de la
  auditoría: «en escritorio, poner el alta en la columna derecha como ya hace
  el panel de domicilio, o arriba de la lista. En móvil, renderizar el
  `Panel` antes de la lista y darle `id`/ancla con `scroll-margin` para que la
  URL `?accion=` lleve hasta él.»

- **S2.** A2 y B1: monoespaciada para estados y nombres. «"Sin ubicar",
  "Motul" y el enlace "Dar de baja" salen en mono». Arreglo: «`ListaDeCalles.tsx:51`
  debe pintar `InsigniaDeEstado` (aviso para Sin ubicar, éxito para
  Ubicada). En `ListaDeZonas.tsx:84-87`, el asentamiento va en
  `CeldaDeApoyo` y la acción no va dentro de `CeldaDeDato`.» Contadores de
  pestaña en Inter con `tabular-nums`, no en mono.

- **S3.** A3, M1 y el A6 de la auditoría de experiencia: Zonas fuera del
  sistema. «Dar de baja» y «Quitar» son texto subrayado de unos 24 px dentro
  de una fila que navega; el `<select>` es nativo; el alta va en línea; «Dar
  de baja la zona» queda al nivel de «Renombrar». Arreglo: acciones de 44 px,
  nunca dentro del enlace de la fila; select con el envoltorio del sistema;
  la baja en `<details>` o en una pestaña «Editar» como en Lugar; «Volver al
  mapa de territorio» dice «Volver a Territorio».

- **S4.** M2: la entrada de Territorio tiene cuatro botones de cabecera; en
  móvil se apilan en cuatro anchos distintos. Arreglo: un solo primario; «Ver
  registro» y «Zonas» como enlaces de contexto; en móvil, botones a ancho
  completo.

- **S5.** M4 y M5: jerarquía tipográfica invertida en los formularios (el
  título del `Panel` más chico que las secciones internas) y cabeceras
  inconsistentes (íconos, verbos «Registrar»/«Agregar domicilio»). Arreglo:
  título del `Panel` en Headline, legend menor y omitido con un solo grupo;
  un verbo, «Registrar domicilio», con ícono siempre.

- **S6.** M6, M7, B2 y B4: la navegación no marca Territorio en
  `/calles/[id]/historial`; los filtros del registro en móvil tienen anchos
  desiguales; en el historial de residencias «Vigente» va como texto y las
  fechas en ISO; el mapa del panel de calle abre con todo Yucatán. Arreglo:
  `/calles` cuenta como Territorio; campos a ancho completo bajo 640 px;
  «Vigente» como insignia y fechas civiles con `shared/lib/fecha`; el mapa
  centrado en el asentamiento.

## Tasks

- [ ] **T1** · S2,S5,S6 · delegado (respaldo de contexto) — Ajustes rápidos.
  Commit:
- [ ] **T2** · S3 · delegado — Zonas al sistema. Commit:
- [ ] **T3** · S1,S4 · delegado — Lo que se abre, a la vista; cabecera de la
  entrada. Commit:
- [ ] **T4** · S1-S6 · capturas antes/después, suite completa, E2E, PR con
  issue aprobado.

## Log

- **L1** — 2026-11-06. Pedido textual: «Su», respuesta a «¿Hago el merge del
  #116 y sigo con el bloque visual?», leído como «Si». Bloque visual del plan
  de la auditoría: «**Visual:** altas y paneles a la vista, insignias en vez
  de letra de código, Zonas alineado al sistema, cabecera de la entrada y
  navegación activa.» Fuera de alcance: M3 (tabla de domicilios en columnas)
  y que `/territorio` funcione sin JavaScript (decisión pendiente, L6 de
  `territorio-mostrador.md`). Las tareas van en serie: comparten componentes
  de `territorio/ui`.
