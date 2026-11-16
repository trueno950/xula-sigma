# Bloque A: trazabilidad de reportes, intervenciones e historial de calle

La bandeja de intervenciones existe, pero está vacía y no tiene alta. Un reporte se cierra sin dejar rastro de obra, y el historial de calle no dice qué trabajo se hizo. Rama `feat/intervenciones-trazabilidad`, desde `main` en `bbbd05a`. Los bloques B (`odd/tasks/mapa-territorial.md`) y C (`odd/tasks/gestion-municipal.md`) son del mismo pedido.

## Specs

- **S1** — Bandeja real de intervenciones en `/intervenciones`. Reemplaza el texto «La bandeja de intervenciones todavía no está disponible.» por un listado con filtros por estado, tipo y lugar, y por un alta de intervención. El alta pide:
  - tipo, de la categoría cerrada;
  - lugar y calle opcional, del propio municipio;
  - fecha de ocurrencia;
  - descripción.

  Usa el permiso que ya gobierna escribir intervenciones (`puedeAdministrarIntervenciones`).
- **S2** — «Programar y luego terminar», desde el detalle del reporte. «Programar obra» crea una intervención `PLANIFICADA` ligada al reporte (`reporte_id`), con el lugar y la calle copiados del reporte y el tipo elegido por la operadora. En la misma transacción, el reporte pasa a `EN_ATENCION` si estaba `RECIBIDO`.
- **S3** — Cuando una intervención ligada a un reporte pasa a `FINALIZADA`, ese reporte se cierra solo como `RESUELTO`, con su movimiento, en la misma transacción. Si la intervención se `CANCELA`, el reporte no se toca y la operadora decide.
- **S4** — Se agrega el tipo de obra `PAVIMENTACION` a la categoría cerrada de intervenciones: unión de TypeScript y `CHECK`, por migración. El usuario nombró «BACHEO, PAVIMENTO, REPAVIMENTO»; hoy solo existen `BACHE` y `REPAVIMENTACION`.
- **S5** — El historial de calle dice qué obra se hizo. Una intervención se lee como «Bacheo · finalizada · 12 nov 2026», no como «Se registró una intervención en esta calle». Enlaza a la intervención y, si la tiene, al reporte de origen. Sigue siendo una proyección de solo lectura (`openspec/specs/historial-de-calle/spec.md`).
- **S6** — Reglas de `AGENTS.md`:
  - el `ayuntamiento_id` sale del contexto del servidor;
  - un recurso de otro municipio responde 404;
  - las entradas se validan con Zod;
  - las acciones usan `<form action>` nativo con su fila en la tabla de excepciones;
  - los mensajes van para la operadora, en español;
  - entre módulos se pasa por un puerto propio, sin importar el dominio ajeno;
  - una tabla nueva lleva RLS y su test de aislamiento.

## Tasks

- [x] **T1** (S4, S2, S3) dominio y casos de uso: tipo `PAVIMENTACION` y migración; `programarObraDeReporte`; cierre automático del reporte al finalizar la intervención; tests unitarios, de integración y de aislamiento — worker — commit: `c5f17e2`
- [x] **T2** (S1, S2) UI: bandeja y alta de intervenciones, botón «Programar obra» en el detalle del reporte, acciones, filas de `AGENTS.md` y E2E — worker — commit:
- [x] **T3** (S5) historial de calle con tipo, estado y fecha de la obra — worker — commit:
- [ ] **T4** (S1-S6) verificador independiente, revisión, PR y merge — verify — commit:

## Log

- **L1** — 2026-11-16. Pedido del usuario: «INTERVENCIONES AUN NO TIENE NADA Y MAPA OPERATIVO LE FALTA FUNCIONALIDADES, AUN DEBEMOS CONECTAR MAS CON REPORTES HISTORIAL DE CALLE CON EL FIN DE GUARDAR UN HISTORICO DE LOS REPORTES, CUANDO POR EJEMPLO SE BACHEO, PAVIMENTO, REPAVIMENTO ESTO PARA TENER TRAZABILIDAD, OTRA COSA EN EL MAPA ME GUSTARIA QUE FUERA MAS VISUAL POR EJEMPLO MARCAR CON ICONOS LOS REPORTES PARA QUE SEA MAS VISUAL Y MEJORAS QUE PROPINGAS, TAMBIEN ME GUSTARIA QUE BLIEARAS POR EJEMPLO LA LOCALIDAD PORQUE AHORA EN EL MAPA SI LE HAGO ZOOM PARA ATRAS SE PIERDE Y PUEDO VER OTRAS LOCALODES EN CASO DE TENER COMISARIAS TAMBIEN DEBE PODER VERSE YA SEA QUE SE ELIJA PARA VER CUAL TERRITORIO VER, ESTOS DETALLES NOS FALTA PULIR ME GUSTARIA QUE DES UN RECORRIDO PARA VER QUE MEJORAS PODEMOS SEGUIR IMPLEMENTADO PARA FORTALCER ESTA PAGINAS Y QUE SEA DE APOYO PARA LA ADMINISTRACION DE UN MUNICIPIO SOBRE TODO QUE SEA UTIL»
- **L2** — 2026-11-16. Recorrido (dos exploradores, solo lectura):
  - Intervenciones tiene tablas, RLS, dominio y detalle, pero la bandeja es un texto fijo (`src/app/(panel)/intervenciones/page.tsx:6-12`) y `registrarIntervencion` no tiene ningún llamador fuera de los tests.
  - Cerrar un reporte no crea intervención.
  - `historial-de-calle` ya compone las intervenciones de la calle, pero las nombra con una frase genérica (`ui/HistorialDeCalle.tsx:41-52`).
- **L3** — 2026-11-16. Decisiones del usuario:
  - el usuario eligió «Los tres bloques»;
  - flujo «Programar y luego terminar (Recomendado)»;
  - umbral de atraso: «CONFIGURABLE» (va en el bloque C).

  Supuesto del orquestador: si la intervención se cancela, el reporte queda como está (S3).
- **L4** — 2026-11-16. Autorización del usuario: «TIENES PERMISO DE HACER MERGE Y TODO, AUTORIZO REVISIONES ETC, TODO TU DALE CUANDO TEMRINES TODO LO REVISO VISAULMENTE»
- **L5** — 2026-11-16. T1 (S4, S2, S3). `PAVIMENTACION` entra al catalogo
  cerrado (`domain/tipoDeIntervencion.ts`, etiquetas y la copia local del mapa
  operativo) y a la base por `drizzle/0025_tipo_pavimentacion.sql`, generada
  con `drizzle-kit generate` y aplicada a `xula_test` con `migrate`.
  `programarObraDeReporte` crea la obra `PLANIFICADA` con `reporteId`,
  `lugarId`/`calleId` del reporte, tipo elegido y fecha de hoy en Merida, y
  mueve el reporte a `EN_ATENCION` en la misma transaccion; `cambiarEstadoDeIntervencion`
  cierra el reporte ligado como `RESUELTO` al finalizar y no lo toca al
  cancelar. Entre modulos se pasa por `application/puertosDeReportes.ts` y el
  adaptador `infrastructure/reportesParaObraPorReportes.ts`, que llama a
  `reporteParaIntervencion` de `reportes` dentro del `tx` recibido: sin salida
  nueva a la base. El rastro de la transicion se unifico en
  `reportes/application/transicionDeReporte.ts`, que ahora usan tanto la
  operadora como el cierre automatico. Tests: 9 unitarios de
  `programarObraDeReporte`, 9 de `reporteParaIntervencion`, 4 del cierre en
  `cambiarEstadoDeIntervencion.reporte.test.ts` y 9 de integracion en
  `programarObra.integration.test.ts` (ambos flujos, reporte ya en atencion,
  reporte cerrado, obra cancelada, obra sin reporte y aislamiento en los dos
  sentidos). `pnpm check` en verde; `vitest` unit e integration de
  `intervenciones`, `reportes` e `historial-de-calle` en verde (368 y 120
  pruebas). Enforcement de `puedeAdministrarIntervenciones` para la bandeja y
  para programar obra, que `AGENTS.md` documenta en T2.
- **L6** — 2026-11-16. T2 (S1, S2). `/intervenciones` deja de ser el texto de
  «todavía no está disponible» y pasa a ser la bandeja real: listado con
  tipo, estado, lugar y fecha civil, filtros por `estado`/`tipo`/`lugarId` en
  un solo `<form method="get">` con un chip por filtro puesto, y enlace de
  alta que solo ve quien administra. El alta vive en
  `/intervenciones/alta` (`altaDeIntervencionAction`, `<form action>` nativo,
  Zod primero, `ayuntamientoId` del contexto) y `ProgramarObra` en el detalle
  del reporte (`programarObraAction`, misma forma, sin pedir ubicación porque
  se copia del reporte). Las dos acciones y sus filas quedaron en la tabla de
  excepciones de `AGENTS.md`. El alta exige `puedeAdministrarIntervenciones`
  como pide S1 -lo que quedó escrito también en el spec de `openspec/`-, aunque
  `registrarIntervencion` siga admitiendo `puedeEscribir` para el mostrador.
  Tests: unitarios de `listarIntervenciones`, de las dos acciones (validación,
  permiso, lista blanca de mensajes, `ayuntamientoId` del cliente ignorado), de
  la bandeja, del alta y de los tres componentes; E2E
  `e2e/intervenciones.spec.ts` con cinco casos: bandeja, filtros, alta desde la
  bandeja, «programar → en atención → finalizar → resuelto» y el alta sin
  JavaScript. `pnpm check` en verde, `pnpm build` en verde y los cinco E2E en
  verde contra `pnpm start` en el puerto 3107.
- **L7** — 2026-11-16. T3 (S5). El historial de calle deja de nombrar la obra
  con la frase genérica: la entrada de una intervención lleva un payload
  `obra` con `tipo`, `estado` y `reporteId`, que el adaptador
  (`historial-de-calle/infrastructure/lectores.ts`) traduce desde los
  catálogos de `intervenciones` -esta proyección no copia el catálogo ni crea
  una tercera copia de las etiquetas-. La línea de tiempo muestra «Bache ·
  finalizada» con la fecha civil en su `<time>` -formateada por
  `shared/lib/fecha`, nunca con `getFullYear`/`getMonth`- y enlaza a la
  intervención y al reporte de origen cuando lo tiene. Sigue siendo de solo
  lectura. Tests: tres unitarios de `componerHistorialDeCalle`, dos de la
  presentación con enlaces, tres de integración en
  `historialDeObra.integration.test.ts` (payload completo, naturalezas sin
  payload y calle de otro municipio) y una comprobación del historial dentro
  del E2E de `e2e/intervenciones.spec.ts`. `pnpm check` en verde, `pnpm build`
  en verde y los cinco E2E en verde contra `pnpm start` en el puerto 3107.
  `openspec/specs/historial-de-calle/spec.md` gana el requisito de la obra.
