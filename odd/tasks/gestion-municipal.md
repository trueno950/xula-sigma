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
- [x] **T2** (S2) filtros y conteos por lugar y por área en la bandeja de reportes — worker — commit: `2ca4973`
- [x] **T3** (S3, S4) calles sin ubicar por localidad y fecha en la ventana del mapa — worker — commit: `ed909ff`
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
- **L4** — 2026-11-16. T2 (S2). La bandeja de `reportes` se filtra por lugar
  y por area responsable. `?lugar=` y `?area=` se validan con Zod en
  `parametros.ts` (el area contra el catalogo, el lugar contra la forma de
  uuid); el lugar se resuelve en la pagina -`cargaDeLaBandeja.ts`, el unico
  lugar donde `reportes` y `territorio` se tocan- contra la API publica de
  `territorio`, y viaja al repositorio como el conjunto de ids de su
  subarbol (`lugarIds`): un arreglo vacio es «ninguno» y no «sin filtro», y
  un `?lugar=` de otro municipio no entra como filtro -la bandeja se lee sin
  el y no se pinta un chip que no esta puesto-. Los filtros de la URL y los
  de la consulta quedaron en dos tipos (`FiltrosDeLaBandeja` y
  `FiltrosDeListado`): la pantalla nunca manda al SQL un id de lugar suelto.
  Los conteos por estado y por area los hace `contarReportes` con dos
  `GROUP BY` bajo `withTenant`, compartiendo con el listado las condiciones
  y la busqueda (`condicionesDeFiltrosSql.ts`), y `domain/conteosDeReportes.ts`
  completa los cuatro estados con sus ceros, ordena las areas por catalogo y
  deja «Sin asignar» al final. La pantalla suma dos `<select>`, un chip por
  filtro y la tarjeta de conteos. Tests: 8 unitarios nuevos y 14 ampliados
  (`componerConteos`, `contarReportes`, `filtrosDeLaConsulta`, links,
  descripcion del vacio, conteos, bandeja y parametros), el de integracion
  `filtrosYConteos` con siete casos -subarbol, area, busqueda, lugar ajeno,
  conteos contra las filas y por municipio- y el E2E
  `e2e/reportesFiltros.spec.ts`, que siembra por SQL las areas y los estados
  y afirma los conteos acotados a los lugares del escenario. `pnpm reglas` y
  `pnpm check` en verde, integracion de `reportes` 86 pruebas, y la suite E2E
  completa en verde.
- **L5** — 2026-11-16. T3 (S3, S4). S3: `territorio` gana la lectura publica
  `callesSinPunto`, un solo recorrido recursivo de la jerarquia
  (`callesSinPuntoSql.ts` sobre `jerarquiaDeLugaresSql.ts`) que da cada calle
  activa sin punto con el asentamiento que la contiene y la raiz de su
  territorio; sin una consulta por raiz, sin RLS nueva y sin calles de
  baja. El mapa la pide por su puerto (`callesSinUbicar`) y
  `domain/sinUbicar.ts` agrupa por raiz, ordena territorios y calles y arma
  el enlace al registro territorial con `accion=ubicarCalle` abierta;
  `agregarMapa` le pasa el mismo conjunto de ids que ya usa el `?lugar=`,
  asi que la seccion respeta la vista acotada. S4: `HechoEnMarcador` gana
  `fechaCivil` -el registro del reporte, que ya viajaba desde S1, y la
  ocurrencia de la obra, que `listarIntervencionesParaMapa` expone ahora por
  la API publica de `intervenciones`- y la ventana la pinta en su propio
  `<time>` con `fechaCivilCorta` de `shared/lib/fecha`. Tests: unitarios de
  `agruparCallesSinUbicar` y `hrefDeUbicacion`, del agregado con y sin
  territorio elegido, de la ventana con las dos fechas y de la seccion; la
  integracion `callesSinPunto` con cuatro casos y una calle sin punto en el
  escenario del mapa; E2E del territorio, el `?lugar=`, el enlace y la fecha
  en la ventana del pin. `pnpm reglas` y `pnpm check` en verde, integracion de
  los cuatro modulos tocados, `pnpm build` en verde y la suite E2E completa
  103/103 contra `pnpm start` en el puerto 3108. T4 queda para el verificador.
- **L6** — 2026-11-16. Verificador independiente (T4 en curso) sobre
  `31f54d9..d14d7fb`: **pasa** S1-S4 -unit 2818, integracion 634 y E2E 103, los
  tres en verde; migracion `0026` confirmada viva con FORCE, politica, GRANT y
  CHECK; la frontera de las 23:30 de Merida coincide entre SQL y JavaScript-
  con **un bloqueante** y avisos, corregidos en el commit
  `fix(reportes): correcciones del verificador en gestion municipal`:
  - **B1 (bloqueante)**: `ui/htmlDeMarcador.ts` escribe `<strong>` para la
    senal de atraso de S1 y la lista de etiquetas permitidas de la sonda de XSS
    solo habia ganado `time`; la sonda pasaba porque su unico fixture llevaba
    `diasDeAtraso: null`, que no imprime la senal. Ahora `strong` entra a la
    lista y la sonda gana un caso con fecha, atraso y valores hostiles que
    afirma que la ventana escribe exactamente `a`, `li`, `strong`, `time` y
    `ul`. La sonda se movio a `ui/htmlDeMarcador.xss.test.ts` por la metrica de
    lineas por archivo.
  - **Aviso cerrado**: `lugarIds: []` -que `condicionesDeFiltrosSql.ts`
    traduce a `FALSE`- no tenia prueba. Se agrego a `filtrosYConteos`: cero
    filas y cero conteos, no «sin filtro».
  - **Aviso cerrado**: el bloque «La ventana del pin…» estaba encima de
    `fechaDeLaVentana`; se movio a `htmlDeLaVentana`, que es lo que documenta.
  - **Sondas durables** del verificador, con los nombres reales:
    `domain/umbralDeAtraso.frontera.test.ts` (N y N-1, equivalencia de
    `fechaDeCorte` con la regla pura para 1/7/90, las 23:30 de Merida de
    `2026-11-17T05:30Z` como dia civil 2026-11-16, y 0/91/1.5/NaN fuera de
    rango; el instante se resuelve en el test porque el dominio no importa
    `shared`, y `application/fechaCivil.test.ts` fija que el convertidor
    canonico diga lo mismo de ese mismo instante), `configuracionDeReportes`
    (la fila escrita pertenece al ayuntamiento del contexto, leida cruda bajo
    `withTenant`) y `conteosIgualesAlListado.integration.test.ts` (total,
    estado por estado y area por area igualan las filas; area + lugar acotan
    las dos lecturas; un lugar de otro municipio da cero filas y cero
    conteos). El permiso de `callesSinUbicar` ya estaba cubierto por
    `domain/sinUbicar.test.ts` y `agregarMapa.test.ts`, asi que no se
    duplico. `pnpm reglas` y `pnpm check` en verde, unit 29 pruebas sobre los
    archivos tocados e integracion de `reportes` y `mapa-operativo` 99. Sin
    E2E: el cambio es de tests, un comentario y la lista de etiquetas.
