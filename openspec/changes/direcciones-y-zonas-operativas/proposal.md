# Propuesta: Direcciones y zonas operativas

> Separa dos conceptos que hoy comparten la tabla `lugares`: la direccion que
> dicta un ciudadano en el mostrador y la zona con la que el ayuntamiento
> delimita una campania. Cuatro hechos de producto confirmados.

## Intencion

El arbol territorial hace dos trabajos incompatibles: modela el territorio y,
a la vez, es el indice por el que se encuentra una direccion. El segundo
falla por construccion. `openspec/specs/domicilios/spec.md` define
`domicilios.lugarId` como "el nivel conocido mas profundo", asi que la
posicion de una casa en el arbol refleja **cuanto sabia quien capturo**, no
donde esta la casa: dos casas de la misma cuadra caen en nodos distintos y
nadie puede volver a encontrarlas.

Las dos audiencias no quieren lo mismo:

| Audiencia | Necesita | Concepto |
|---|---|---|
| Ciudadano en mostrador | cierre de calle, constancia, traslado | `domicilio`: lo que dicta y lo que se imprime |
| Ayuntamiento en campo | descacharrizacion, fumigacion, vacunacion, recoleccion | `zona`: el recorte con el que se reparte el trabajo |

Un `sector` no es un ancestro de una casa: es un recorte tendido sobre el
territorio. Modelarlo como nivel de contencion obliga al mostrador a declarar
algo que no sabe, y a cambio no devuelve la direccion.

Evidencia verificada en el codigo de hoy:

- `src/modules/territorio/ui/contenido.ts` (`cuentasDeLugar`,
  `domiciliosDirectosDe`) cuenta y lista unicamente `lugarId === nodo.id`.
  Una colonia con 200 domicilios colgados de sus manzanas muestra
  "Domicilios 0", contra el requisito "Consulta de subarbol incluye lo
  colgado directo de cada nivel" de `jerarquia-territorial`. El caso de uso
  `subarbol` ya devuelve el descendiente completo; la UI no lo usa asi.
- La misma funcion hace `calles: calles.length`: cada nodo muestra el
  catalogo entero del asentamiento, asi que una manzana anuncia las calles
  de su cabecera.
- No existe listado plano ni busqueda de domicilios. Llegar a "Calle 20 #5"
  exige adivinar bajo que nodo se archivo.
- Conviven dos altas contradictorias: la plana de la portada
  (`src/app/(panel)/territorio/page.tsx`, `RegistroDeDomicilio`, calles de
  todo el municipio y zona opcional) y la anclada al nodo de
  `TabDeDomicilios.tsx`.
- `FormularioDeDomicilio.tsx` ya rotula "Zona (opcional)" dentro de un
  `<details>` y explica "Sin elegir zona, se guarda en el asentamiento de la
  calle". El dominio ya trata la zona como atributo opcional; solo la
  navegacion la trata como contenedor obligatorio.
- `listarDomicilios(contexto)` carga todos los domicilios del municipio en
  cada render de la pagina, incluida la portada.

## Alcance

### Dentro

**Rebanada A — sin cambio de esquema.**

- Listado plano de domicilios a nivel municipio, con busqueda por calle,
  numero y asentamiento, paginado; deja de cargarse todo en cada render.
- El alta de domicilio deja de depender del nodo donde esta parado el
  operador: una sola forma, calle + numero + transversales, zona opcional.
- Los conteos del arbol pasan a incluir el subarbol, que es lo que
  `jerarquia-territorial` ya exige.
- La pestana de calles cuenta las calles del nodo, no el catalogo del
  asentamiento.

**Rebanada B — el corte.**

- `sector` y `manzana` salen de `TIPOS_DE_LUGAR`
  (`src/modules/territorio/domain/tipoDeLugar.ts`).
- Nace `zonas`: conjunto de calles de un asentamiento, con su tabla de
  pertenencia.
- Migracion de datos: los domicilios colgados de un `sector` o una `manzana`
  suben a su colonia o asentamiento; cada `sector` existente se convierte en
  una `zona` que carga las calles que usaban sus domicilios.
- Deltas de spec y las filas de `AGENTS.md` que el corte invalida.

### Fuera

- **`manzana`.** Decision 5, con su razon escrita.
- Geometria: PostGIS, poligonos, geocercas, derivar pertenencia por punto.
  La calle ya lleva un punto opcional (`georreferenciacion-de-calles`) y eso
  no alcanza para un area.
- La gestion de la campania misma: padron de campanias, rutas, avance,
  cuadrillas. Aca se modela el recorte, no el operativo.
- Identidad unica de direccion y fusion de duplicados. `HermanosDeDireccion`
  sigue siendo el parche informativo que es hoy.
- Mapa, SSE e historial de calle: son de `mapa-operativo-territorial`.
- Cobros, CFDI, contabilidad gubernamental (frontera del roadmap).

## Capacidades

### Nuevas

- `zonas-operativas`: zona como conjunto de calles de un asentamiento,
  pertenencia derivada, aislamiento por ayuntamiento y consulta de los
  domicilios de una zona.

### Modificadas

- `jerarquia-territorial`: el orden de tipos baja a
  `{cabecera, comisaria} < colonia`; desaparecen los escenarios que nombran
  `sector` y `manzana`.
- `domicilios`: `lugarId` deja de ser "el nivel conocido mas profundo";
  entra el listado plano con busqueda.

`autorizacion-roles` no cambia: administrar zonas reutiliza
`puedeAdministrarTerritorio`, que ya cubre la estructura del municipio.

## Decisiones de producto

| # | Decision | Porque |
|---|---|---|
| 1 | El arbol de direcciones queda en dos niveles: asentamiento (`cabecera`/`comisaria`) y `colonia` | Es como se dice y se imprime una direccion en Yucatan. Mas abajo, el arbol deja de describir el territorio y describe al capturista |
| 2 | `domicilios.lugarId` apunta al asentamiento o a la colonia, nunca a otra cosa | Sin "nivel conocido mas profundo" no hay dos casas vecinas en nodos distintos, y el listado plano vuelve estable |
| 3 | La zona es un **conjunto de calles**, no un ancestro | Un recorte operativo se tiende sobre el territorio; obligarlo a ser contenedor es lo que rompio el indice de direcciones |
| 4 | La pertenencia de un domicilio a una zona se **deriva** de su calle | El mostrador no declara zona porque no la sabe. Lo unico que se cura a mano es que calles lleva cada zona, y eso lo sabe quien organiza la campania |
| 5 | `manzana` no se modela en este cambio | Una manzana es mas chica que una calle: sin geometria no se puede derivar, y capturada a mano quedaria vacia porque nadie en el mostrador la conoce. Cuando las calles tengan geometria, la zona puede volverse geocerca real y la manzana se deriva. Se escribe la ausencia para que no se lea como olvido |
| 6 | Una zona **no** cruza asentamientos | `calles` es catalogo por asentamiento: una zona a caballo tendria dos filas "Calle 21" que son calles distintas, y nadie podria leer su listado. Ademas la campania se organiza por asentamiento. Se aplica con la misma regla que ya tienen las calles: toda calle de una zona comparte `lugarId` con la zona |
| 7 | Una calle puede estar en mas de una zona, y una zona puede quedar vacia | Fumigacion y recoleccion no recortan igual el mismo territorio; exigir particion obligaria a inventar zonas de relleno, el mismo defecto que `jerarquia-territorial` ya prohibe para los niveles ausentes |
| 8 | Migracion: cada `sector` se vuelve una `zona` con las calles que usaban sus domicilios; las filas `manzana` desaparecen como lugares; los domicilios suben a su colonia o asentamiento | No se pierde nada: la direccion real siempre fue calle + numero + transversales. El nodo solo guardaba cuanto sabia el capturista |

## Reglas que este cambio obliga a cambiar

Quitar dos tipos de `TIPOS_DE_LUGAR` invalida requisitos ya publicados. No
alcanza con tocar codigo:

| Documento | Que se invalida |
|---|---|
| `specs/jerarquia-territorial` | "Orden estricto y total de tipos" nombra `< sector < manzana`; el escenario "manzana no puede tener hijos" y el de "sector con manzanas y un domicilio directo" dejan de existir |
| `specs/domicilios` | "Direccion compuesta cuelga del nivel conocido mas profundo" y su escenario; el escenario de "todos los niveles presentes" de la direccion imprimible cita manzana y sector |
| `AGENTS.md` | Filas nuevas en la tabla de Server Actions para las acciones de zonas, si son `<form>` nativo como el resto de `territorio`. La tabla dice que una segunda excepcion no entra sin agregarse |

**`zonas` y su tabla de pertenencia son tablas nuevas.** Por regla 5 y por la
seccion de revision de migraciones de `AGENTS.md`, cada una entra con:
`ayuntamiento_id`, `ENABLE` + `FORCE ROW LEVEL SECURITY`, politica de tenant,
`GRANT` al rol de aplicacion, FK compuestos contra `(id, ayuntamiento_id)` y
su `*.isolation.test.ts` **en el mismo commit**. No son catalogo de
plataforma: una zona es dato de un municipio.

## Riesgos

| Riesgo | Prob. | Mitigacion |
|---|---|---|
| La migracion mueve domicilios y se lee como perdida de dato | Media | El `lugarId` viejo se conserva en bitacora; la direccion imprimible no cambia porque siempre fue calle + numero |
| Constancias ya emitidas cambian de texto | Baja | `emision-de-constancias` congela la direccion al emitir y no tiene FK vivo hacia `domicilios`: lo emitido no se toca |
| Rebanada B choca con `mapa-operativo-territorial` en `territorio` | Alta | Secuenciacion explicita abajo |
| El corte toca 41 archivos que nombran `sector`/`manzana` | Alta | Los 41 estan dentro de `src/modules/territorio`; `reportes` e `intervenciones` leen `lugares` de forma generica (`lectorDeUbicacionesPorTerritorio.ts`) y no nombran esos tipos |
| Un municipio ya capturo sectores con significado propio | Media | La decision 8 los conserva como zonas; no se borra ninguno |
| La zona derivada de la calle es mas gruesa que la real | Media | Es la precision que hay sin geometria, y se declara. Decision 5 fija cuando deja de serlo |

## Presupuesto de revision

Presupuesto fijo: **400 lineas cambiadas por PR**.

| Unidad | Alcance | Pronostico |
|---|---|---|
| A1 | Listado plano con busqueda y paginado: puerto, caso de uso, repositorio, UI y tests | 350-450 |
| A2 | Conteos inclusivos del subarbol y calles del nodo | 150-250 |
| A3 | Alta de domicilio desacoplada del nodo | 200-300 |
| B1 | `zonas` + pertenencia: esquema, migracion, RLS, politica, GRANT, aislamiento | 350-450 |
| B2 | Corte de `TIPOS_DE_LUGAR`, deltas de spec y los tests que lo nombran | > 400 |
| B3 | Migracion de datos de `sector`/`manzana` y UI de zonas | 300-400 |

**Encadenado obligatorio: si.** Seis unidades, ninguna cabe junto a otra y B2
probablemente no entre entera en 400 por si sola: `sdd-tasks` debe partirla o
proponer `size:exception` con la cuenta a la vista. Cada unidad necesita
inicio, fin, verificacion y rollback propios. No se crean tareas en esta fase.

## Coordinacion con `mapa-operativo-territorial`

Ese cambio esta en vuelo en este mismo repositorio: 11 tareas completas, 7
pendientes, detenido esperando una decision de mantenimiento en el ledger
nativo de intentos. Su tarea `2.1` (U3) agrega `eventos_de_calles` a
`territorio` y su delta vive en
`openspec/changes/mapa-operativo-territorial/specs/territorio/spec.md`.

Secuencia propuesta:

1. **Rebanada A entra en cualquier momento.** No toca esquema, no toca
   `calles` y no cruza el delta del mapa.
2. **Rebanada B espera a que `mapa-operativo-territorial` cierre U3**, o al
   menos a que su migracion de `eventos_de_calles` este asentada. Cada
   `pnpm db:generate` encadena su snapshot al `prevId` del anterior y
   agrega su entrada al mismo `drizzle/meta/_journal.json`: dos cambios
   generando migraciones de `territorio` en paralelo producen linajes
   hermanos, y el que aterrice segundo quedo generado contra una base que
   ya se movio.
3. Si el mapa sigue bloqueado cuando A termine, la decision de arrancar B
   sube al usuario: es un bloqueo de coordinacion, no tecnico.

## Rollback

- Rebanada A: revertir el commit. No hay migracion.
- Rebanada B: migracion inversa que devuelve los tipos al catalogo y
  `DROP` de `zonas`. **El `lugarId` anterior de cada domicilio se guarda en
  bitacora antes de moverlo**, asi que la vuelta es reconstruible; sin esa
  traza el rollback seria una perdida, y por eso es parte de la unidad, no
  un extra.

## Criterios de exito

- [ ] Un operador encuentra "Calle 20 #5" sin saber bajo que nodo se archivo.
- [ ] Una colonia muestra los domicilios de todo su subarbol, no cero.
- [ ] El alta de domicilio es una sola forma, sin depender del nodo actual.
- [ ] Una zona lista sus domicilios sin que nadie haya declarado zona en el
      mostrador.
- [ ] Ningun ayuntamiento ve las zonas de otro (test de aislamiento).
- [ ] La migracion no pierde ninguna direccion y deja traza reversible.
- [ ] `pnpm test` y `pnpm check` en verde, cobertura >= 80.
