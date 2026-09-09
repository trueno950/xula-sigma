# Design: Coordenadas y reasignacion de calles

## Technical Approach

Dos columnas en `calles`, un puerto que **se ensancha en vez de crecer**,
tres casos de uso con el esqueleto exacto de `reparentearLugar`, y una sola
hoja `"use client"` que escribe en dos campos nativos. Toda escritura pasa
antes por `buscarPorId`, que ya filtra `bajaEn IS NULL`.

## Architecture Decisions

### D1 — Dos `doublePrecision` nullable, no `numeric(9,6)`

| Opcion | Costo | Veredicto |
|---|---|---|
| `doublePrecision()` x2 | ninguno a esta escala | **elegida** |
| `numeric(9,6)` x2 (propuesta) | drizzle lo mapea a `string`: el repositorio parsea en las dos direcciones para una comparacion que el dominio hace en `number` | rechazada |
| `point` de Postgres | exporta `(x,y)` y ensucia `porcionesDeTerritorio`; orden x/y es trampa | rechazada |
| PostGIS | no hay consulta espacial en el alcance | rechazada |

Un doble tiene ~15 digitos significativos para una latitud de 8: el error es
de 1e-10 m sobre un pin nacido de un clic en un tile de 256px. El redondeo a
6 decimales lo hace `redondearPunto`, funcion pura con test, y no la escala
de la columna, que redondea callada.

**CHECK `calles_punto_completo`** (`(latitud IS NULL) = (longitud IS NULL)`).
No contradice la decision 3: lo que no entra al esquema es la **caja**. Media
coordenada no es un rango que envejece, es un estado que no debe existir.

### D2 — `actualizar` lleva las cuatro columnas mutables

`DatosDeActualizacionDeCalle` pasa de `{ id, nombre }` a
`{ id, nombre, lugarId, punto, bajaEn }`, precedente literal de
`DatosDeActualizacionDeLugar`. Cada caso de uso relee con `buscarPorId` y
reenvia lo que no toca. Rechazado: tres metodos nuevos (`ubicar`,
`reparentear`, `darDeBaja`) — siete metodos para cuatro `UPDATE` de una fila
por el mismo camino.

**Esto cierra un agujero que este change activa.** Hoy
`repositorioDeCallesSql.actualizar` hace `WHERE eq(calles.id, id)` **sin**
`bajaEn IS NULL`, mientras `buscarPorId` si lo filtra. Con `bajaEn` muerta no
importaba; con `darDeBajaCalle` viva, una calle de baja se podria renombrar y
mover. Enrutar las cuatro escrituras por `buscarPorId` lo vuelve imposible
por construccion, no por cuatro guardas repetidas.

### D3 — La baja cuenta las tres columnas que apuntan a una calle

`contarDomiciliosQueLaUsan(tx, calleId)`: un `count` con
`calleId OR entreCalleAId OR entreCalleBId`. Una transversal es un domicilio
usando la calle, y borrarla rompe su texto compuesto igual que la principal.
Los reportes no bloquean (decision 4) **por ausencia**: `territorio` no tiene
puerto hacia `reportes` y no lo gana aca.

### D4 — `leaflet` solo, sin `react-leaflet`

| Opcion | Peso | Veredicto |
|---|---|---|
| `leaflet` 1.9 + `@types/leaflet` (dev) | ~42 KB gz + ~15 KB CSS | **elegida** |
| `+ react-leaflet` 5 | ~10 KB gz mas | rechazada |

`react-leaflet` 5 si soporta React 19 — no es un problema de compatibilidad.
Traduce la API imperativa de Leaflet a JSX, y este picker necesita tres
llamadas: `L.map`, `map.on("click")`, `L.circleMarker`. Un wrapper declarativo
se gana el lugar con muchas capas dinamicas; aca hay un marcador.

**`L.circleMarker`, nunca `L.marker`.** El icono por defecto de Leaflet
resuelve sus PNG relativo al CSS y se rompe bajo bundler; el folclore es
parchear `_getIconUrl`. Un circulo es SVG: sin asset, sin parche, y sin
tocar la regla 10. Color `caliza-tinta` con anillo `caliza-lienzo`: la marca
del municipio se reserva a accion primaria, foco y escudo (`DESIGN.md`, la
voz prestada), y un pin no es ninguno de los tres.

`maxBounds` sale de `CAJA_DE_YUCATAN`, la misma constante que valida el
servidor: no se puede arrastrar el mapa fuera del estado. Una regla, dos
expresiones, cero copias del numero.

### D5 — La isla escribe en campos visibles, no ocultos

`SelectorDePunto.tsx` (`"use client"`) + `useMapaDePunto.ts`, precedente
`SugerenciaDeDuplicados` / `useSugerenciasDeDuplicados`. La hoja **reemplaza**
los dos campos de coordenada en vez de vivir al lado: `latitud` y `longitud`
conservan su `name` nativo, asi que `ubicarCalleAction` los lee igual. Un par
de campos, un solo `name` — el bug de los dos `nuevoPadreId` que documenta
`FormularioDeReparenteo` no se repite.

Tres degradaciones, en orden:

| Falla | Que ve la operadora |
|---|---|
| Sin JS | Los dos campos, SSR-eados por la propia isla. El `<div>` del mapa nace `hidden`. Escribe la coordenada del GPS del celular y envia por POST nativo. |
| `import("leaflet")` rechaza | Igual, mas una linea que lo dice. |
| `tileerror` de OSM | El mapa queda; `Aviso tono="aviso"` avisa que los tiles no llegaron. Los campos siguen mandando. |

El mapa es el camino rapido; los campos son el contrato. La coordenada es
opcional: guardar sin punto siempre funciona.

### D6 — La calle gana un panel, no la barra otro boton

El comentario de `TabDeCalles` dice que las filas no llevan enlace porque
"una calle no tiene pantalla propia". Esa premisa vence aca: ahora hay cuatro
cosas que hacerle a una calle. Se agrega `?calle=<id>` (mismo `.catch()`
por campo de `parametros.ts`) y la fila enlaza a su panel.

- Barra: solo **Agregar calle**. El select de "Renombrar calle" desaparece —
  la operadora ya esta mirando la fila; volver a elegirla en una lista es
  trabajo que la pantalla se inventa.
- Panel: **Ubicar en el mapa** (primaria), **Renombrar**, **Mover a otro
  lugar**, y **Dar de baja** dentro de `<details>` nativo por divulgacion
  progresiva (`DESIGN.md`).
- Tabla: columna **Ubicacion** en tipografia Dato — `20.937000, -89.623700`
  o `Sin punto`. Una coordenada se coteja digito a digito contra un papel,
  igual que una CURP; es identificador, no decoracion.
- El select de destino excluye el `lugarId` actual. No excluye los lugares que
  ya tienen ese nombre: eso exigiria leer las calles del municipio entero, y
  `altaDeCalle` tampoco lo pre-chequea. Que falle y se redacte.

## Data Flow

    <form action={ubicarCalleAction}>          POST nativo
      └─ SelectorDePunto ("use client")
           ├─ leaflet (dynamic import) ──► OSM tiles
           └─ inputs latitud/longitud (name nativo)
                        │
    ubicarCalleAction ──┴─► Zod (forma) ──► ubicarCalle
                                              ├─ puedeAdministrarTerritorio
                                              └─ withTenant
                                                   ├─ buscarPorId  (bajaEn IS NULL)
                                                   ├─ estaEnYucatan ──► throw
                                                   ├─ actualizar
                                                   └─ registrar

## File Changes

| Archivo | Accion | Que |
|---|---|---|
| `drizzle/0011_calles_coordenadas.sql` | Crear | `ADD COLUMN` x2 + CHECK. Sin RLS nuevo: `calles` ya tiene `FORCE`. Sin `GRANT`: la tabla ya lo tiene. |
| `territorio/infrastructure/esquema.ts` | Modificar | Dos columnas + `check("calles_punto_completo")` |
| `territorio/domain/punto.ts` | Crear | `PuntoGeografico`, `CAJA_DE_YUCATAN`, `estaEnYucatan`, `redondearPunto` |
| `territorio/domain/errores.ts` | Modificar | `PuntoFueraDeYucatanError`, `CalleConDomiciliosError` |
| `territorio/application/puertos.ts` | Modificar | `DatosDeActualizacionDeCalle` ancho, `CalleGuardada.punto`, `contarDomiciliosQueLaUsan` |
| `territorio/application/{ubicarCalle,reparentearCalle,darDeBajaCalle}.ts` | Crear | Tres casos de uso |
| `territorio/application/renombrarCalle.ts` | Modificar | Relee con `buscarPorId` antes de escribir (D2) |
| `territorio/infrastructure/repositorioDeCallesSql.ts` | Modificar | `actualizar` de cuatro columnas, `columnasDeLectura` + punto, `contarDomiciliosQueLaUsan` |
| `territorio/composicion.ts` | Modificar | Tres casos de uso + `calles.latitud/longitud` en la porcion exportable |
| `territorio/ui/SelectorDePunto.tsx`, `useMapaDePunto.ts` | Crear | La isla y su hook |
| `territorio/ui/PanelDeCalle.tsx` | Crear | El panel de `?calle=` |
| `territorio/ui/{FormularioDeUbicacion,FormularioDeMovimientoDeCalle,FormularioDeBajaDeCalle}.tsx` | Crear | Tres `<form>` nativos |
| `territorio/ui/FormularioDeRenombreDeCalle.tsx` | Modificar | Pierde el select, gana `calleId` oculto |
| `territorio/ui/TabDeCalles.tsx` | Modificar | Columna Ubicacion, fila enlazada, barra de una accion |
| `territorio/ui/actions/{ubicarCalle,reparentearCalle,darDeBajaCalle}Action.ts` | Crear | Molde `reparentearLugarAction` |
| `territorio/ui/permisos.ts` | Modificar | Tres entradas de `AccionDeNodo`, las tres `puedeAdministrarTerritorio` |
| `app/(panel)/territorio/parametros.ts` | Modificar | `?calle=`, tres acciones nuevas → pestana `calles` |
| `AGENTS.md` | Modificar | Tres filas en la tabla de excepciones + nota de `ubicarCalleAction` |
| `package.json` | Modificar | `leaflet`, `@types/leaflet` (dev) |

## Interfaces / Contracts

```ts
// domain/punto.ts — la caja vive aca y en ningun otro lado.
export type PuntoGeografico = { readonly latitud: number; readonly longitud: number };

export const CAJA_DE_YUCATAN = {
  latitudMinima: 19.4333, latitudMaxima: 21.6667,
  longitudMinima: -90.4667, longitudMaxima: -87.4833,
} as const;

// application/puertos.ts
export type DatosDeActualizacionDeCalle = {
  id: CalleId;
  nombre: string;
  lugarId: LugarId;
  punto: PuntoGeografico | null;
  bajaEn: Date | null;
};

// Firmas: tres parametros, metrica de AGENTS.md.
ubicarCalle(id: CalleId, punto: PuntoGeografico | null, contexto: ContextoActual)
reparentearCalle(id: CalleId, nuevoLugarId: LugarId, contexto: ContextoActual)
darDeBajaCalle(id: CalleId, contexto: ContextoActual)
```

Errores redactados por accion:

| Accion | Redacta |
|---|---|
| `ubicarCalleAction` | `NoAutorizado`, `NoEncontrado`, `PuntoFueraDeYucatan` |
| `reparentearCalleAction` | `NoAutorizado`, `NoEncontrado`, `NombreDeCalleDuplicado` |
| `darDeBajaCalleAction` | `NoAutorizado`, `NoEncontrado`, `CalleConDomicilios` |

`punto: null` borra el pin: mismo camino, y un pin equivocado deja de ser
permanente. `reparentearCalle` **no** toca `punto` ni `domicilios.lugarId`
(decisiones 2 y de negocio de la propuesta).

## Testing Strategy

| Capa | Que | Como |
|---|---|---|
| Unit — domain | `estaEnYucatan` en los cuatro bordes, dentro y fuera; `redondearPunto` a 6 decimales | Puro, sin dobles |
| Unit — application | Rol, no encontrado, fuera de caja, `null` limpia, bitacora, y que reparentear no mueve el punto | Repositorio falso |
| Unit — application | Baja: rechaza por principal **y** por transversal; acepta sin domicilios | Repositorio falso |
| Integration | Round-trip de `actualizar` ancho; el CHECK rechaza media coordenada; una calle de baja desaparece de `buscarPorId` y `listarPorLugar`; **y ya no se puede renombrar ni mover** (D2) | Postgres |
| Integration | Reparenteo a un lugar con ese nombre → `NombreDeCalleDuplicadoError` | Postgres |
| Isolation | `calles.isolation.test.ts` extendido: el punto de A invisible desde B; `UPDATE` cruzado afecta 0 filas | Postgres, sin `rtk` |
| E2E | Reparenteo y baja por `<form>` nativo. **El mapa no entra**: pedir tiles de OSM en CI es una prueba de la red, no del codigo | Playwright |

Pisos de `vitest.config.ts` (80% en `domain`/`application`): el codigo nuevo
de esas dos capas nace con test. `ui/` queda fuera del piso.

## Threat Matrix

| Superficie | Aplica | Comportamiento esperado / RED test |
|---|---|---|
| Routing — `?calle=` nuevo | **Si** | `.catch(undefined)` por campo: un `calle` basura no tira `raiz` (mismo bug que documenta `parametros.ts`). Test: `?raiz=<ajena>&calle=xx` → 404, no listado propio |
| Routing — destino del redirect | **Si** | `volverAlArbol`/`irAlArbol` arman el destino de ids del servidor, nunca de lo que mande el form. Sin cambios; se hereda |
| Egress de terceros — tiles OSM | **Si** | Primer fetch a tercero del producto. Filtra el area aproximada del municipio, dato publico. Sin CSP hoy en el repo; cuando entre, `img-src` necesita el host de tiles |
| Superficie publica — tres Server Actions | **Si** | Zod `safeParse` en la primera linea; `ayuntamientoId` del contexto, nunca del form; recurso ajeno → `NoEncontradoError`, que RLS ya vuelve indistinguible de inexistente (regla 8) |
| Shell / subprocess / VCS / clasificacion de ejecutables | N/A | El change no ejecuta procesos ni toca automatizacion |

## Migration / Rollout

`ALTER TABLE` nullable, sin backfill: toda calle existente queda `Sin punto`
y la pantalla ya tiene ese estado. Sin ventana ni bandera. Rollback:
`DROP COLUMN` mas el CHECK; la bitacora queda, es solo-agregado.

Los duplicados de hoy son datos de prueba y se borran con
`scripts/*.sql` bajo las reglas de `AGENTS.md` (rol de minimo privilegio,
cuenta de filas afectadas). No entra a este change.

## Open Questions

Ninguna que bloquee. Una anotada para el PR:

- La politica de uso de tiles de OSM tolera uso liviano. Un puñado de
  operadores fijando pines lo es; si deja de serlo, la salida es una llave de
  proveedor o tiles propios, y no toca nada arriba de `useMapaDePunto`.

Los cuatro numeros de `CAJA_DE_YUCATAN` son del requirement "Rango valido"
de `specs/georreferenciacion-de-calles/`: extremos publicados de Yucatan
(INEGI, entidad 31) mas ±0.05 grados de tolerancia de captura. El rango es
requirement y no decision de arquitectura; el porque del margen vive alla y
no se repite aca.
