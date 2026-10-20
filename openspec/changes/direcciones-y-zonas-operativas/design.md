# Diseno: Direcciones y zonas operativas

## Enfoque tecnico

Rebanada A no toca esquema: mueve el registro de direcciones de "arbol con
todo cargado en memoria" a "listado plano paginado con filtros por GET", y
corrige dos conteos que ya tienen el dato en memoria. Rebanada B agrega
`zonas` + pertenencia como tablas nuevas, migra los datos con un script bajo
`scripts/` y recien despues corta `sector`/`manzana` del catalogo de tipos.

Secuencia obligatoria: **A1 -> A2 -> A3 -> B1 -> B3d -> B2 -> B3u**. El
porque del `B3d` antes de `B2` esta en la decision D8: no es preferencia de
orden, es que la migracion del CHECK revienta si corre antes.

En la reanudación, el usuario autorizó desarrollar y verificar B2/B3u sobre
una base aislada dejando pendiente la operación B3d. Esto no cambia el orden
de despliegue: antes de aplicar el CHECK sobre datos reales se exige la
ventana aprobada y la limpieza B3d en ese mismo entorno. El SDD no se declara
cerrado ni se archiva con esa operación pendiente.

## Decisiones de arquitectura

| # | Decision | Opciones | Eleccion |
|---|---|---|---|
| D1 | Filtro de asentamiento | columna `asentamiento_id` desnormalizada vs subarbol | Subarbol: reusa el `WITH RECURSIVE` ya probado de `porLugarYSubarbol`, y post-B degenera a dos niveles sin tocar codigo |
| D2 | Busqueda por calle | `pg_trgm` sobre `calles.nombre` vs `ILIKE` | `ILIKE` sobre `calles`: es el lado chico del join (cientos de filas por municipio) y `domicilios_calle_idx` sirve el lado grande |
| D3 | Paginacion | helper en `shared/lib` vs copia propia | Copia en `territorio/domain/paginacion.ts`: `domain` no importa `shared` ni otro modulo (tabla de capas de `AGENTS.md`), asi que la cuarta copia es estructural, no pereza |
| D4 | Conteos del arbol | consulta nueva vs ayudantes de UI | Ayudantes de UI: `subarbol(raiz)` ya trae el descendiente completo; contar es proyectar memoria, no un viaje mas a Postgres |
| D5 | Alta desacoplada | caso de uso nuevo vs solo UI | Solo UI: `verificacionDeDomicilio.ts:107` ya deriva el lugar de la calle (`datos.lugarId ?? callePrincipal?.lugarId`). El alta nunca necesito el nodo |
| D6 | "Zona" en el formulario | convivir con dos sentidos vs renombrar | Renombrar a `lugarId`/"Colonia" en A3: un `<select>` rotulado "Zona" que elige una colonia, al lado de una pestana "Zonas" que recorta campanias, es la palabra rota antes de nacer |
| D7 | Zona no cruza asentamientos | CHECK, trigger, o FK compuesto ancho | FK compuesto ancho: la pertenencia lleva `lugar_id` y dos FK la atan al asentamiento de la zona **y** al de la calle. Lo garantiza Postgres, no el caso de uso |
| D8 | Migracion de datos | SQL en la migracion Drizzle vs script en `scripts/` | Script: la migracion no fija `app.tenant`, y `FORCE RLS` alcanza al owner -- movería cero filas sin error. Si en cambio corriera como superusuario, escribiria sin reja ninguna. Las dos ramas condenan la primera opcion |
| D9 | Superficies de `/territorio` | `?vista=` en una pagina vs tres rutas | Tres rutas hermanas unidas por `Pestanas`: cada una carga solo lo suyo, que es lo que estructuralmente mata el cargado ansioso |
| D10 | Entradas del alta de domicilio | una sola entrada (solo el registro plano) vs dos entradas sobre el mismo formulario | Dos entradas y un componente. El usuario autorizo reabrir el alta contextual (PR #92, `fix/domicilio-en-contexto`), asi que esta decision reemplaza la restriccion de entrada/UI de A3 (seccion 3): el alta vuelve tambien a la pestana Domicilios del lugar y los ocultos `raiz`/`nodo` vuelven como navegacion de retorno. El porque y el limite exacto estan en la seccion 3 |

## 1. Registro plano de domicilios (A1)

Modelo de lectura y puerto. `registro` deja el detalle de dominio afuera:
la pantalla pinta una direccion, no la edita.

```ts
export type FiltrosDeRegistro = {
  readonly raizId?: LugarId;   // asentamiento; filtra por subarbol
  readonly calle?: string;     // ILIKE sobre calles.nombre
  readonly numero?: string;    // igualdad exacta, ya recortado
};
export type OpcionesDeRegistro = {
  readonly limite: number;     // ya trae el +1 de resolverPagina
  readonly filtros: FiltrosDeRegistro;
};
export type DomicilioDelRegistro = {
  id: DomicilioId; calle: string; calleId: CalleId;
  numero: string | null; lugar: string; lugarId: LugarId;
};
// en RepositorioDeDomicilios:
registro(tx, opciones: OpcionesDeRegistro): Promise<readonly DomicilioDelRegistro[]>;
```

`registroDeDomicilios(filtros, contexto)` devuelve `{ domicilios, hayMas }`,
mismo contrato que `ResultadoDeListado` de `padron`: pide `limite + 1`,
recorta con `resolverPagina` y evita un `COUNT(*)` aparte. "Ver mas" crece
`?limite=`, no pagina por `OFFSET` -- precedente `hrefDeVerMas`.

**Indices: ninguno nuevo.** `domicilios_lugar_idx (ayuntamiento_id,
lugar_id)` sirve el filtro de subarbol y `domicilios_calle_idx
(ayuntamiento_id, calle_id)` el join con la calle filtrada. El `ORDER BY
lugar, calle, numero` es un sort sobre el conjunto ya filtrado y ningun
indice lo puede servir mientras el orden cruce tres tablas. Un indice sobre
`numero` seria abstraccion especulativa (`AGENTS.md`, "Que NO es hallazgo").
El umbral que cambiaria esta respuesta, escrito para que no haya que
adivinarlo: `domicilios` de **un solo** municipio pasando ~10^5 filas, o el
`EXPLAIN (ANALYZE)` del registro sin filtro pasando 50 ms.

**El cargado ansioso muere aca.** `page.tsx:72` llama
`listarDomicilios(contexto)` en cada render, portada incluida. El registro lo
reemplaza con la consulta paginada; el arbol deja de necesitarlo porque la
variante `domicilio` de `NodoDeSubarbol` pasa a llevar su etiqueta:

```ts
| { clase: "domicilio"; id: DomicilioId; lugarId: LugarId;
    calle: string; numero: string | null }
```

`listar(tx)` sobrevive solo como catalogo del `<select>` de
`FormularioDeMudanza`, que es superficie de `padron`. Acotar **ese** select
queda fuera, y se escribe para que no se lea como olvido.

## 2. Conteos inclusivos y calles del nodo (A2)

Tres numeros, tres veredictos distintos:

| Cuenta | Hoy | Debe | Donde |
|---|---|---|---|
| `domicilios` | `lugarId === nodo.id` | subarbol de `nodo`, inclusivo | `ui/contenido.ts` |
| `calles` | `calles.length` (catalogo del asentamiento) | las de `lugarId === nodo.id` | `ui/contenido.ts` |
| `lugares` | hijos directos | **sin cambio**: la pestana lista hijos directos, y `masAdentroDe` ya dice cuantos quedan mas abajo | -- |

`cuentasDeLugar` recibe el subarbol de la **raiz**, no el del nodo: necesita
el conjunto de descendientes de `nodo.id` dentro de `nodos`. Eso es
exactamente el recorrido por niveles con conjunto de visitados que
`ui/conteo.ts` ya hace para lugares; se generaliza ahi (`descendientesDe`) y
`masAdentroDe` pasa a usarlo. Cero SQL nuevo, cero viaje nuevo.

En un nodo sin catalogo propio la cuenta de calles queda en 0 y la pestana
sigue listando el catalogo heredado en solo lectura, con la linea que
`TabDeDomicilios` ya escribe ("Las calles pertenecen al asentamiento"). Un
0 al lado de una lista visible es la respuesta correcta: esas calles no son
de este nodo.

## 3. Alta desacoplada del nodo, con dos entradas (A3)

El alta no depende del nodo donde esta parado el operador: la ubicacion
de negocio de un domicilio es el `lugarId` validado o, si se omite, la
calle principal; **nunca** el `raiz`/`nodo` de navegacion. **Un solo
componente** -la forma unica de A3- sirve **dos entradas**, y esa es la
sustitucion que fija D10:

| Entrada | Calles que ofrece | `raiz`/`nodo` |
|---|---|---|
| Registro municipal (`/territorio?accion=domicilio`) | catalogo del municipio (`listarCallesDelMunicipio`) | ausentes |
| Pestana Domicilios del lugar (`?raiz=&nodo=&vista=domicilios`) | las del asentamiento (`listarCalles(raiz.id)`) | ocultos, solo retorno |

Los ocultos `raiz`/`nodo` **no son ubicacion del domicilio** ni identidad de
tenant: no viajan al caso de uso ni eligen el `lugarId`. Su unico efecto es
a donde regresa `volverAlArbol` cuando el alta falla; la explicacion
canonica de esa navegacion vive en `ui/actions/volverAlArbol.ts`. Que
existan dos entradas **si** cambia que calles ve el operador -la contextual
solo lista las de su asentamiento, la municipal lista las del municipio-, y
es una consecuencia de UX declarada, no de la validacion de la ubicacion.

La historia de A3 no se reescribe: la restriccion original -registro plano
como unica entrada, sin `raiz`/`nodo`- queda anotada como superseded en
`tasks.md`, fase 4.

**Sin cambio en `application`**: `verificarZonaYCalles` ya acepta `lugarId`
ausente y lo deriva de la calle principal.

**Sin cambio en la tabla de Server Actions de `AGENTS.md`.**
`altaDeDomicilioAction` sigue siendo el `action` de un `<form>` nativo en un
Server Component, sin `"use client"` mediando, y sigue redactando por
`redirect` + `searchParams` con la misma lista blanca. Cambia el destino del
`redirect`, no el transporte ni la condicion que habilita la excepcion. Las
filas de `corregirDomicilioAction` y `darDeBajaDomicilioAction` tampoco se
mueven.

Lo que si cambia es el vocabulario (D6): `name="zonaId"` -> `name="lugarId"`,
"Zona (opcional)" -> "Colonia (opcional)", `ZonaDelFormulario` ->
`NivelDelFormulario`, `opcionesDeZona` -> `opcionesDeNivel`. El error de
dominio `ZonaIncoherenteError` -> `UbicacionIncoherenteError` **no** viaja
aca: esta nombrado en una nota de `AGENTS.md`, y B2 ya abre ese archivo para
el corte de tipos. Un solo PR toca `AGENTS.md`, no dos.

## 4. Esquema de `zonas` y pertenencia (B1)

```
zonas                              calles_de_zonas
  id                                 zona_id
  ayuntamiento_id                    calle_id
  lugar_id      -> asentamiento      ayuntamiento_id
  nombre                             lugar_id      <- la columna que cierra D7
  baja_en                            creado_en
  creado_en / actualizado_en
```

| Tabla | Indices y constraints |
|---|---|
| `zonas` | `zonas_tenant_idx`, `unique (id, ayuntamiento_id)`, `unique (id, lugar_id, ayuntamiento_id)`, `uniqueIndex (ayuntamiento_id, lugar_id, nombre) WHERE baja_en IS NULL`, FK `(lugar_id, ayuntamiento_id) -> lugares`, `politicaTenant`, `FORCE RLS`, `GRANT SELECT, INSERT, UPDATE` |
| `calles_de_zonas` | PK `(zona_id, calle_id)`, `zonas_calles_zona_idx (ayuntamiento_id, zona_id)`, `zonas_calles_calle_idx (ayuntamiento_id, calle_id)`, FK `(zona_id, lugar_id, ayuntamiento_id) -> zonas`, FK `(calle_id, lugar_id, ayuntamiento_id) -> calles`, `politicaTenant`, `FORCE RLS`, `GRANT SELECT, INSERT, DELETE` |
| `calles` | agrega `unique (id, lugar_id, ayuntamiento_id)`, destino del segundo FK |

`FORCE RLS` y los `GRANT` se escriben a mano en la migracion: drizzle-kit no
los genera, observable en `drizzle/0015_eventos_de_calles.sql:16-17` contra
`esquemaDeCalles.ts`. La migracion es la siguiente del journal (0017 con el
`_journal.json` de hoy, que cierra en `0016_massive_karen_page`).

### Que garantiza Postgres y que le queda al caso de uso

Los dos FK compuestos obligan a que el `lugar_id` de la fila de pertenencia
sea a la vez el de la zona y el de la calle. De ahi sale, sin trigger y sin
CHECK, que **toda calle de una zona comparte asentamiento con la zona**
(decision 6 de la propuesta). Es el mismo mecanismo con el que
`domicilios_calle_tenant_fk` ya impide una calle de otro municipio, una
columna mas ancho.

Lo que el FK **no** puede mirar, y por eso lo verifica el caso de uso -- el
mismo reparto que `verificacionDeDomicilio.ts` hace hoy entre el FK y
`exigirCallesActivas`:

| Verifica | Quien |
|---|---|
| mismo tenant, mismo asentamiento | Postgres (FK compuesto) |
| `calles.bajaEn IS NULL` | caso de uso: el FK no mira columnas nullable |
| `zonas.bajaEn IS NULL` | caso de uso |
| `puedeAdministrarTerritorio` | caso de uso |

**Consecuencia declarada:** con `ON UPDATE NO ACTION` -- el que emite Drizzle
y el que ya lleva `0015` -- un `UPDATE calles SET lugar_id = ...` sobre una
calle que pertenece a una zona levanta `23503`. O sea: `reparentearCalle`
deja de poder mover una calle enzonada. Se resuelve con un error de dominio
nuevo, `CalleEnZonaError`, y no vaciando la pertenencia en silencio: la
curaduria de que calles lleva cada zona la hace una persona (decision 4), y
borrarla por debajo seria perder trabajo manual sin avisar. `ON UPDATE
CASCADE` no era alternativa: propagaria el `lugar_id` nuevo a la pertenencia
y ahi chocaria contra el FK hacia `zonas`.

**Pertenencia derivada de un domicilio**: `domicilios.calle_id ->
calles_de_zonas -> zonas`. Solo la calle principal; `entreCalleA/B` son
localizadores, no la calle de la direccion, y contarlas metaria un domicilio
en zonas de la cuadra de al lado.

## 5. Corte de `sector` y `manzana` (B2)

| Simbolo | Efecto |
|---|---|
| `TIPOS_DE_LUGAR` | queda `["cabecera", "comisaria", "colonia"]` |
| `RANGO` | pierde dos entradas; sigue `{0,0,1}` |
| `puedeContener`, `puedeSerRaiz`, `tiposContenidosPor`, `puedeTenerCatalogoDeCalles` | **sin tocar**: los cuatro se derivan de `RANGO` y `TIPOS_DE_LUGAR` |
| `cadenaHastaAsentamiento` | su tope pasa de 5 a 3 saltos por `TIPOS_DE_LUGAR.length`; sigue siendo >= la profundidad real (2) |
| `lugares_tipo_valido` | se regenera a `tipo IN ('cabecera','comisaria','colonia')` |
| ~40 archivos de `src/modules/territorio` | 272 menciones, verificadas con `rg`; casi todas fixtures de test. `reportes` e `intervenciones` leen `lugares` de forma generica y no nombran los tipos |
| `domain/direccion.ts` | la direccion imprimible pierde dos niveles: queda calle + numero + transversales + colonia + asentamiento |

**Hecho que fija la secuencia:** `ALTER TABLE ... ADD CONSTRAINT ... CHECK`
valida las filas existentes y falla si alguna no cumple (salvo `NOT VALID`,
que dejaria la reja apagada y contradice "la base es la reja que queda",
`shared/tenancy/esquema.ts`). Con un solo `sector` vivo, la migracion de B2
aborta. Por eso **B3d corre antes que B2**, y por eso el corte de TypeScript
tambien: `$type<TipoDeLugar>()` sobre una fila que dice `'sector'` es una
mentira de tipo, no un error de compilacion.

## 6. Migracion de datos (B3d)

`scripts/migrar-sectores-a-zonas.sql`, con la forma exacta de
`baja-calles-fuera-de-asentamiento.sql`. **No va en la migracion Drizzle**
(D8): `FORCE ROW LEVEL SECURITY` aplica las politicas incluso al owner de la
tabla -- solo `SUPERUSER` y `BYPASSRLS` las saltan -- y la migracion no fija
`app.tenant`, asi que toda politica evalua NULL y el `UPDATE` afecta cero
filas **sin error**. Es el modo de falla exacto que la seccion de scripts de
`AGENTS.md` describe. Observable con el rol `owner` que
`municipiosDePrueba.ts` expone a los `*.isolation.test.ts`.

Por municipio, dentro de una transaccion, con `set_config('app.tenant', id,
true)`:

1. Junta en temp table los domicilios cuyo `lugar_id` es `sector` o
   `manzana`, con su `lugar_id` actual y su ancestro `colonia`/asentamiento.
2. **Bitacora primero, movimiento despues.** Una fila por domicilio:
   `accion: 'MIGRACION_DOMICILIO'`, `entidad: 'domicilios'`, `entidad_id:
   <domicilio>`, `origen: 'script:migrar-sectores-a-zonas:<lugar_anterior>'`.
   El `lugar_id` viejo viaja en `origen` porque `bitacora` no tiene columna
   de carga y no se le agrega una: un uuid de `lugares` no es dato personal
   (ADR 0001 §5 acota que no se registra), y meterle `jsonb` a la tabla de
   auditoria transversal para servir una migracion de una sola vez es la
   direccion contraria a la que `mapa-operativo-territorial` ya eligio en su
   D2. Revertir es `split_part(origen, ':', 3)::uuid`.
3. `UPDATE domicilios SET lugar_id = <ancestro>`; `GET DIAGNOSTICS` contra lo
   contado y `RAISE EXCEPTION` si no coinciden -- revierte la transaccion
   entera.
4. Cada `sector` -> una `zona` con `lugar_id` = su asentamiento y el mismo
   nombre. Pertenencia = las `calle_id` distintas de los domicilios que
   colgaban de el y de sus manzanas. Las calles cuyo `lugar_id` no es ese
   asentamiento las rechaza el FK: se cuentan y se listan al final, no se
   fuerzan.
5. `DELETE` de las filas `sector` y `manzana`, mas su bitacora
   (`accion: 'BAJA_LUGAR'`, `origen: '...:<padre_id>'`). **DELETE y no baja
   logica**, y es la unica parte contraintuitiva del script: un `baja_en` deja
   la fila viva para el CHECK de B2, que valida todas las filas y no solo las
   activas. Una calle que todavia apunte a un `sector` frena el `DELETE` con
   `23503`: esa es la reja, y esas filas se listan para que las decida el
   municipio, no el script.
6. Salida: los domicilios movidos con su `lugar_id` anterior, los lugares
   borrados con tipo/nombre/padre, las zonas creadas y las calles rechazadas.
   La bitacora reconstruye las **aristas**; esta salida reconstruye las
   **filas**. El runbook exige guardarla, igual que
   `baja-calles-fuera-de-asentamiento.sql`.

Idempotente: una segunda corrida no encuentra candidatos.

## 7. UI (A1, A3, B3u)

Tres rutas hermanas, unidas por una tira de `Pestanas` -- que ya renderiza
enlaces (`pestanasDePanel`), no estado de cliente:

| Ruta | Superficie | Carga |
|---|---|---|
| `/territorio` | Estructura: el arbol, tal cual hoy | `listarRaices`, `subarbol`, `listarCalles` |
| `/territorio/domicilios` | Registro plano `?q=&raiz=&numero=&limite=` | solo `registroDeDomicilios` + `listarRaices` para el filtro |
| `/territorio/zonas` | Zonas del municipio; `?zona=` abre sus calles y sus domicilios | `listarZonas`, `callesDeZona`, `domiciliosDeZona` |

`?vista=` sobre una sola pagina perdio: `cargarTerritorio` ya esta en el
techo de la metrica con cinco parametros de URL, y un sexto nivel de
ramificacion volveria a cargar todo para pintar una tercera parte -- que es
el defecto que este cambio existe para borrar. Cada ruta anidada lleva
`migaja` hacia `/territorio` (antipatron 26). Server Components; cero
`"use client"` nuevo: filtros por `<form method="get">` (precedente
`FiltrosDeReportes`), acciones por `<form action>` nativo.

**Cinco filas nuevas en la tabla de Server Actions de `AGENTS.md`**, todas
`<form>` nativo en Server Component: `altaDeZonaAction`,
`renombrarZonaAction`, `darDeBajaZonaAction`, `agregarCalleAZonaAction`,
`quitarCalleDeZonaAction`. Redactan `NoAutorizadoError`, `NoEncontradoError`,
`NombreDeZonaDuplicadoError` y `CalleFueraDelAsentamientoError`. Las filas
entran con **B3u** y no con B1: una fila de esa tabla describe un formulario
que existe, y B1 no trae ninguno.

## Limites de unidades

| Unidad | Posee | No posee |
|---|---|---|
| A1 | puerto `registro`, `registroDeDomicilios`, `domain/paginacion.ts`, SQL, `NodoDeSubarbol` con etiqueta, ruta `/territorio/domicilios`, desmontaje de `listarDomicilios` en `page.tsx` | conteos, alta, renombres de vocabulario |
| A2 | `descendientesDe` en `conteo.ts`, `cuentasDeLugar` | consultas nuevas |
| A3 | forma unica de alta (dos entradas, D10), `zonaId` -> `lugarId` y su vocabulario de UI | `ZonaIncoherenteError`, `AGENTS.md` |
| B1 | esquema `zonas` + `calles_de_zonas`, migracion 0017, RLS/politica/GRANT, `unique` nuevo en `calles`, puertos y casos de uso, `CalleEnZonaError`, aislamiento | UI, acciones, `AGENTS.md`, datos |
| B3d | `scripts/migrar-sectores-a-zonas.sql` y su runbook | codigo TypeScript |
| B2 | corte de `TIPOS_DE_LUGAR`, CHECK, ~40 archivos, deltas de spec, `AGENTS.md` (error renombrado) | zonas, UI de zonas |
| B3u | rutas y pantallas de zonas, cinco acciones, cinco filas de `AGENTS.md` | esquema |

**A1 y B2 son los dos que pueden no entrar en 400.** La costura de A1, si
hace falta: A1a = puerto + caso de uso + repositorio + paginacion + tests
(sin UI); A1b = ruta, pantalla y desmontaje del cargado ansioso. B2 no tiene
costura limpia -- el CHECK, el tipo y los tests tienen que moverse juntos o
el repo no compila -- asi que ahi va `size:exception` con la cuenta a la
vista. `sdd-tasks` decide; aca queda el corte posible, no la tarea.

## Estrategia de pruebas

| Capa | Que |
|---|---|
| Dominio (A1) | `resolverPagina` de `territorio`: borde exacto en `limite`, `limite+1`, cero |
| Aplicacion (A1) | `registroDeDomicilios` recorta a `limite` y reporta `hayMas`; cada filtro por separado y los tres juntos |
| UI (A2) | `cuentasDeLugar`: colonia con domicilios solo bajo sus hijos cuenta > 0; nodo sin catalogo propio cuenta 0 calles; ciclo de `padreId` no cuelga |
| Aplicacion (A3) | alta sin `lugarId` deriva el asentamiento de la calle; alta con `lugarId` de otra cadena sigue dando `UbicacionIncoherenteError` |
| Aislamiento (B1) | `zonas.isolation.test.ts` y `callesDeZonas.isolation.test.ts`: cruce de tenants en 0 filas; INSERT de pertenencia con calle de otro asentamiento rechazado por el FK; UPDATE de `calles.lugar_id` con pertenencia viva rechazado |
| Integracion (B1) | `domiciliosDeZona` devuelve por calle principal y **no** por transversal |
| B3d | Base scratch con sectores, manzanas y domicilios; correr, verificar cero perdidas, revertir desde bitacora + salida, y correr de nuevo para la idempotencia |
| B2 | La suite entera: los ~40 archivos son el test |

## Matriz de amenazas

Shell, subprocesos y automatizacion de VCS: **N/A**. Rutas nuevas
(**aplicable**, A1/B3u): seguro = `searchParams` validados con Zod en el
borde (antipatron 19) y `?zona=`/`?raiz=` de otro municipio en 404 y nunca
403 (regla 8); fallo = la pantalla no existe, no una lista vacia. RED: el
escenario de 404 por recurso ajeno en los deltas de `zonas-operativas` y
`domicilios`. Script de operacion (**aplicable**, B3d): corre con el rol de
menor privilegio que alcance, cuenta filas y aborta si no coinciden, y no
lleva ningun secreto adentro.

## Rollback

| Unidad | Vuelta |
|---|---|
| A1, A2, A3 | revertir el commit; no hay migracion |
| B1 | migracion inversa: `DROP TABLE calles_de_zonas, zonas` y el `unique` nuevo de `calles`; aditiva, nada mas la referencia |
| B3d | `UPDATE domicilios` desde el `origen` de bitacora; `INSERT` de los lugares borrados desde la salida guardada del script |
| B2 | migracion inversa que devuelve los dos tipos al CHECK; revertir el commit de codigo |

## Preguntas abiertas

- [ ] Nombre de la zona: unico por asentamiento (lo asume el `uniqueIndex`)
      o unico por municipio. Se propone por asentamiento, mismo criterio que
      `calles_tenant_lugar_nombre_idx`.
- [ ] Un `sector` cuyos domicilios no usaban ninguna calle se convierte en
      una zona vacia. Se propone crearla igual (decision 7 la permite) y
      listarla en la salida del script para que el municipio la cure.
- [ ] `B3d` necesita una ventana operativa por municipio. Es coordinacion,
      no tecnica: la decide el usuario cuando A cierre.
