# Bloque C: herramientas de gestión para el municipio

Va después de los bloques A (`odd/tasks/intervenciones-trazabilidad.md`) y B (`odd/tasks/mapa-territorial.md`), porque toca reportes y el mapa. El pedido completo y su Log viven en el bloque A, L1-L3. La rama se crea desde `main` cuando A y B ya estén fusionados.

## Specs

- **S1** — El umbral de atraso es «CONFIGURABLE»: cada ayuntamiento fija cuántos días sin atender marcan un reporte como atrasado.
  - El valor por defecto es 7, el que se recomendó.
  - Lo cambia `ADMIN_MUNICIPAL` (`puedeAdministrarReportes`) desde el panel, en un formulario nativo, con un entero de 1 a 90.
  - Se guarda por municipio, con aislamiento: RLS y test de aislamiento si es una tabla nueva, o una columna validada de `ayuntamientos`.
  - Un reporte `RECIBIDO` cuya fecha civil de registro (`shared/lib/fecha`, `America/Merida`) tiene al menos N días está «atrasado».
  - El atraso se ve en la bandeja de reportes, como insignia «Atrasado · N días» con un filtro, y en el mapa, como señal en el marcador y en la leyenda.
- **S2** — La bandeja de reportes se filtra por lugar (colonia o localidad) y por área responsable, además de estado y tipo, y muestra conteos por estado y por área para los filtros elegidos. Los filtros van por parámetros GET validados con Zod.
- **S3** — Calles sin ubicar por localidad: en el mapa, por cada territorio, cuántas calles no tienen punto, con enlace a la calle para ubicarla.
- **S4** — Viene de S4 del bloque B. La ventana de cada marcador muestra la fecha del hecho: el registro de un reporte o la fecha de ocurrencia de una intervención, en fecha civil.

## Tasks

- [x] **T1** (S1) umbral de atraso configurable y su señal en la bandeja y el mapa — worker — commit: `8f57228` + `87ebe9c` (snapshot)
- [ ] **T2** (S2) filtros y conteos por lugar y por área en la bandeja de reportes — worker — commit:
- [ ] **T3** (S3, S4) calles sin ubicar por localidad y fecha en la ventana del mapa — worker — commit:
- [ ] **T4** (S1-S4) verificador, revisión, PR y merge — verify — commit:

## Log

- **L1** — 2026-11-16. El pedido y las decisiones están en `odd/tasks/intervenciones-trazabilidad.md` L1-L3.
- **L2** — 2026-11-16. A (PR #139, `29063df`) y B (PR #140, `31f54d9`) están en `main`. Rama `feat/gestion-municipal` desde `31f54d9`. S4 entra aquí desde el bloque B (su L5).
- **L3** — 2026-11-16. T1 (S1). El umbral vive en una tabla nueva,
  `configuracion_de_reportes` (`ayuntamiento_id` PK/FK, `dias_de_atraso` con
  CHECK 1..90, ENABLE + FORCE RLS, politica de tenant y `GRANT SELECT,
  INSERT, UPDATE` a `xula_app`), no en una columna de `ayuntamientos`: esa
  tabla tiene lectura publica -el escudo del login se pinta antes de que
  exista sesion- y la configuracion de la bandeja no hereda esa puerta. Un
  municipio sin fila lee 7, asi que dar de alta un municipio no exige
  sembrar nada. La migracion es `drizzle/0026_wet_warlock.sql`, generada con
  `drizzle-kit generate`, con FORCE y GRANT agregados a mano, aplicada a
  `xula_test_b`; el snapshot generado va en su propio commit (`87ebe9c`).
  `domain/umbralDeAtraso.ts` decide el atraso con dos fechas civiles: solo
  `RECIBIDO` cuenta, la frontera es inclusiva -exactamente N dias ya es
  atraso- y quien convierte `registrado_en` a dia de Merida es
  `shared/lib/fecha` (`application/fechaCivil.ts`). `cambiarUmbralDeAtraso`
  exige `puedeAdministrarReportes` y toma el tenant del contexto;
  `leerUmbralDeAtraso` no exige rol. `/reportes/configuracion` es un
  `<form action>` nativo con su fila y su nota en la tabla de excepciones de
  `AGENTS.md`; la bandeja muestra «Atrasado · N dias» y gana el filtro
  `?atrasados=1`, que se resuelve a una fecha de corte comparada en SQL
  (`AT TIME ZONE 'America/Merida'`) para recortar antes de paginar; el mapa
  marca el pin, su ventana y la lista, y publica el conteo en la leyenda,
  con el umbral y la fecha de registro llegando por sus propios puertos
  -`ReporteParaMapa` gana `registradoEn`- y una copia local de la regla
  comparada con su duena en `atrasoSincronizado.test.ts`. Tests: 22 unitarios
  de dominio, fechas, casos de uso, accion y UI; `configuracionDeReportes` y
  `atrasoEnBandeja` de integracion contra Postgres; diez de aislamiento de la
  tabla nueva en los dos sentidos; E2E `e2e/reportes.spec.ts` con cuatro
  casos -umbral, insignia, filtro y leyenda del mapa; valor fuera de rango;
  guardado sin JavaScript; rol que no administra-. `pnpm reglas` y
  `pnpm check` en verde, unit 521, integracion de `reportes` 79 y de
  `mapa-operativo` 7, `pnpm build` en verde y la suite E2E completa 100/100
  contra `pnpm start` en el puerto 3108.
