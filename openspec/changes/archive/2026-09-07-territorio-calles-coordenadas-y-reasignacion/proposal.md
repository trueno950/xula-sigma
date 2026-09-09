# Proposal: Coordenadas y reasignacion de calles

## Intent

`calles` es un catalogo de escritura unica: el puerto solo expone `crear`,
`buscarPorId`, `actualizar({ id, nombre })` y `listarPorLugar`. De ahi salen
dos problemas con la misma raiz:

1. **Sin coordenadas.** Ni `lugares`, ni `calles`, ni `domicilios` guardan un
   punto: el mapa de reportes no tiene sobre que dibujarse.
2. **Sin reasignacion.** Se da de alta "Calle 21" en la cabecera, despues se
   crea el sector, y la calle no se puede mover: el operador crea una
   segunda con el mismo nombre. `bajaEn` existe pero ningun caso de uso la
   escribe, asi que la duplicada tampoco se retira.

## Scope

### In Scope

- `latitud`/`longitud` nullable en `calles`, con bitacora.
- Selector click-to-pin (Leaflet + OSM) como isla `"use client"` dentro del
  `<form>` nativo existente.
- `ubicarCalle`: fijar o corregir el punto.
- `reparentearCalle`: mover una calle activa a otro lugar del municipio,
  analogo exacto de `reparentearLugar`.
- `darDeBajaCalle`: activar `bajaEn`, hoy columna muerta.

### Out of Scope

- **Fusionar calles duplicadas.** No se construye `fusionarCalleAction` ni
  el puerto hacia `reportes`. Los duplicados de hoy son datos de prueba y
  se borran con un script de operacion bajo las reglas de `scripts/*.sql`
  de `AGENTS.md` (rol de minimo privilegio, cuenta de filas afectadas). Con
  datos de produccion reales, la fusion seria un change propio.
- Toda maquinaria de deduplicacion: sin normalizacion, trigramas ni
  abreviaturas, como ya prohibe `jerarquia-territorial` (Rebanada 4).
- Mapa de reportes, `intervencion`/historial y tablero de prioridades:
  cambios posteriores que dependen de este.
- PostGIS, consultas espaciales, polilineas, geocodificacion (Nominatim,
  INEGI), coordenadas en `lugar` o `domicilio`.

## Capabilities

### New Capabilities

- `georreferenciacion-de-calles`: coordenada opcional por calle, captura,
  rango valido, estado vacio y permiso.

### Modified Capabilities

- `jerarquia-territorial`: agrega reparenteo y baja de calle al catalogo de
  la Rebanada 4.

## Approach

`ALTER TABLE calles` con dos columnas `numeric(9,6)` nullable: sin tabla
nueva, sin RLS nuevo. `DatosDeActualizacionDeCalle` pasa a llevar las cuatro
columnas mutables, mismo precedente que `DatosDeActualizacionDeLugar`: cada
caso de uso relee la fila y reenvia lo que no toca. Las tres acciones siguen
la fila `reparentearLugarAction` de la tabla de excepciones de `AGENTS.md`.
El indice `calles_tenant_lugar_nombre_idx` ya rechaza el reparenteo hacia un
lugar que tenga ese nombre: `NombreDeCalleDuplicadoError` se reutiliza sin
tocar el repositorio.

## Reglas de negocio (decididas)

| Regla | Porque |
|---|---|
| Coordenada siempre opcional | Toda calle existente nace sin punto |
| Rango valido: bounding box de Yucatan | Un pin fuera del estado es error de captura, no dato |
| Reparentear **no** mueve el punto | La geometria no depende de la jerarquia administrativa |
| Reparentear **no** cascadea `domicilios.lugarId` | Es el nivel propio del domicilio (decision 3 del design de `territorio`), no derivado de su calle |
| Baja bloqueada solo por domicilios | Mismo criterio que `darDeBajaLugar`, que cuenta lo suyo |
| Reportes apuntando **no** bloquean la baja | Igual que un lugar dado de baja con reportes colgando |
| `puedeAdministrarTerritorio` en las tres | El catalogo es estructura, no mostrador — tampoco ubicar el pin |

## Affected Areas

| Area | Impacto |
|---|---|
| `territorio/infrastructure/esquema.ts` + `drizzle/` | Dos columnas y migracion |
| `territorio/domain/` | Validacion del bounding box, funcion pura |
| `territorio/application/{puertos,composicion}` | Puerto completo, tres casos de uso |
| `territorio/infrastructure/repositorioDeCallesSql.ts` | `actualizar` de cuatro columnas |
| `territorio/ui/` | `SelectorDePunto`, `TabDeCalles`, formularios |
| `AGENTS.md` | Tres filas de excepcion |
| `specs/jerarquia-territorial/` | Delta |

## Invariantes criticos tocados

Ninguno de tenancy: no hay tabla nueva y `calles` ya tiene `FORCE RLS` y FK
compuesto. Toca superficie publica (tres Server Actions) y bitacora, que
sigue solo-agregado. Una coordenada de calle es dato publico — es la razon
de georreferenciar `calle` y no `domicilio`.

## Risks

| Riesgo | Prob. | Mitigacion |
|---|---|---|
| Leaflet, dependencia nueva (antipatron 22) | Alta | Justificar en PR: OSM sin Google Maps es requisito del usuario |
| Los tiles piden red; conectividad rural mala | Media | Coordenada opcional: el form guarda sin punto |
| El bounding box envejece si se vende fuera de Yucatan | Media | Constante de dominio con Zod en el borde, **no** un CHECK de Postgres: se mueve sin migracion |
| `domicilios.lugarId` diverge del de su calle | Media | Decidido: no cascadea. El texto compuesto ya refleja la jerarquia vigente, no una copia congelada |
| Un punto por calle es aproximacion | Baja | Alcanza para pines; la polilinea entra si el tablero la pide |

## Rollback Plan

Migracion inversa con `DROP COLUMN` (nullable, sin backfill ni FK: no
arrastra nada). Revertir el commit saca los tres casos de uso; una calle ya
reparenteada queda colgada de otro lugar y una dada de baja queda con
`bajaEn` escrito e invisible para los `SELECT` — los dos son estados
validos, no corruptos, y `UPDATE calles SET baja_en = NULL` los devuelve.
Las filas de bitacora quedan: es solo-agregado.

## Dependencies

- `leaflet` / `react-leaflet`; tiles OSM con atribucion obligatoria.

## Success Criteria

- [ ] Una calle se crea sin punto y se ubica despues.
- [ ] Un punto fuera del bounding box de Yucatan se rechaza.
- [ ] Una calle se mueve de lugar sin tocar sus domicilios ni su punto.
- [ ] Reparentear hacia un nombre ya usado en el destino da un error
      redactado para la operadora.
- [ ] Una calle con domicilios no se da de baja; una con reportes si.
- [ ] Las tres acciones dejan traza y `calles.isolation.test.ts` cubre las
      columnas nuevas.
