# Refinamiento de UX del módulo Padrón

Segunda parada del recorrido de pulido pantalla por pantalla (L1). Se trabaja con el mismo método que en `odd/tasks/reportes-ux.md`: auditoría con capturas, el usuario elige qué arreglar, y la pantalla que cambia de estructura pasa antes por gentle design. Los tokens salen de `design/system.md`. Los patrones a reusar son:
- pliegues `<details>` en acordeón (`AccionesDeReporte`);
- panel de acciones de la ficha (`design/reportes-detalle/01-ficha-y-acciones.html`);
- «Filtros (N)» y chips (bandeja de reportes).

## Specs

Los textos entre comillas son los de la auditoría que el usuario aprobó en L3: «1», prioridad alta y media sin A4 ni las constancias de F4.

### Listado `/padron`

- **S1 (P1)** — Cada persona muestra su **domicilio vigente** (calle y número, colonia o localidad), para distinguir homónimos sin entrar a la ficha. Sin domicilio vigente dice «Sin domicilio».
- **S2 (P2)** — La CURP lleva su etiqueta y una lectura clara. «Sin CURP» se ve como un pendiente con texto, no solo en gris.
- **S3 (P3)** — El listado dice cuántas personas muestra, qué se buscó y cómo seguir (paginación o «Ver más»). El vacío y la búsqueda sin resultados usan `EstadoVacio`.
- **S4 (P4)** — En el teléfono, el buscador va antes que «Nueva persona», que sigue siendo la acción primaria visible. Cada fila es claramente tocable: tiene flecha, un área de toque de al menos 44 px y un nombre accesible completo.

### Alta `/padron/alta`

- **S5 (A1)** — Los obligatorios se marcan, igual que en el alta de reportes: una línea que nombra los opcionales.
- **S6 (A2)** — En el teléfono, «Guardar» y las ayudas no quedan tapados por la barra inferior.
- **S7 (A3)** — En escritorio, Nombres, Primer apellido y Segundo apellido van en una fila. El título «Identificación» se quita o se funde con los datos.

### Ficha `/padron/[id]`

- **S8 (F1)** — En el teléfono no queda nada debajo de la barra inferior. «Registrar mudanza» se alcanza completo.
- **S9 (F2)** — La CURP lleva su etiqueta. La ficha conecta las funciones que ya existen en `padron/application`:
  - **corregir datos**, con `editarPersona`;
  - **dar de baja**, con `darDeBajaPersona`, separada como acción de peligro.

  Mismos permisos, reglas y redacción de errores de esos casos de uso. Formularios nativos, sin JavaScript requerido.
- **S10 (F3)** — «Registrar mudanza», «Corregir datos» y «Dar de baja» van plegados en acordeón: abrir uno cierra el otro y la página no salta.
- **S11 (F4, parcial)** — Jerarquía clara: el nombre como título; los datos (CURP y domicilio vigente) en una ficha compacta; el historial de residencias como línea de tiempo. Sin constancias (fuera de alcance, L3).
- **S12 (F5)** — La fusión de duplicados se alcanza desde donde corresponda (la ficha o el listado), con `fusionarPersonasAction`, que está en la tabla de excepciones de `AGENTS.md`. Mismos permisos.

### Transversal

- **S13** — Se conserva lo que ya funciona:
  - los formularios nativos sin JavaScript;
  - la sugerencia de duplicados del alta (`sugerirDuplicadosAction`);
  - las mismas reglas y permisos;
  - el aislamiento por municipio.

  Los tests existentes siguen pasando, o cambian solo donde S1-S12 cambian el comportamiento a propósito.

## Tasks

- [x] **T0** (S1-S4, S8-S12) diseño en gentle design: dos direcciones para el listado y dos para la ficha; el usuario elige — design — commit: (artboards en la rama)
- [x] **T1** (S1, S9, S12) datos: domicilio vigente por persona en el listado, en una lectura por página; mapa de lo que exponen `editarPersona`, `darDeBajaPersona` y `fusionarPersonas` para la UI — worker — commit: 256fe19, 36976f4
- [x] **T2** (S1-S4) listado según `design/padron-listado/01-tabla-con-domicilio.html` (L6) — worker — commit: 5fc00f3
- [x] **T3** (S5-S7) formulario de alta — worker — commit: f82c80e
- [x] **T4** (S8-S12) ficha según `design/padron-ficha/02-encabezado-con-pestanas.html` (L7) — worker — commit: 5fd31ed, 011f1a5
- [ ] **T5** (S1-S13) verificación, revisión nativa, PR y merge — verify — commit:

## Log

- **L1** — Pedido del usuario: «siguiente modulo», tras cerrar Reportes. Va dentro del recorrido de L1 de `odd/tasks/reportes-ux.md` («podemos ir pantalla por pantalla para refinar esos modulos a su vez detectar mejoras»). El orquestador recomendó Padrón.
- **L2** — Auditoría con capturas a 1440 y 390 de `/padron`, `/padron/alta` y `/padron/[id]` (P1-P4, A1-A4, F1-F5).
- **L3** — El usuario eligió «1»: prioridad alta y media sin A4 (domicilio en el alta) ni las constancias de F4. El listado y la ficha pasan por gentle design; el alta se ajusta directo.
- **L4** — T1, decisión técnica del orquestador.
  - **Problema:** `territorio` solo expone lecturas por persona de la
    residencia vigente. Leerla fila por fila sería N+1, y leer las tablas
    de `territorio` desde `padron` lo prohíben las capas.
  - **Decisión:** se agrega a `territorio` una lectura en lote,
    `direccionesVigentesDePersonas`, pública, aditiva, bajo `withTenant` y
    con su prueba de aislamiento. `padron` la consume por un puerto propio.
    Son una transacción y dos consultas por página.
  - **Mapa para T4:**
    - `editarPersona` y `darDeBajaPersona` existen y tienen pruebas, pero
      no tienen Server Action ni UI. T4 crea sus acciones de formulario
      nativo y las agrega a la tabla de excepciones de `AGENTS.md`.
    - `fusionarPersonasAction` existe y está en la tabla, pero ninguna
      página renderiza `FusionarPersonas`. Además, su
      `redirect('/padron?error=…')` se descarta, porque el listado no lee
      `error`. T4 la conecta en la ficha y muestra su error.
- **L5** — T0, diseño en gentle design. Los tableros se escribieron en
  `design/` del árbol principal:
  - Listado, en `design/padron-listado/`:
    - `01-tabla-con-domicilio.html`;
    - `02-tarjetas-de-identidad.html`.
  - Ficha, en `design/padron-ficha/`:
    - `01-ficha-y-acciones.html`;
    - `02-encabezado-con-pestanas.html`.

  Se esperan las elecciones del usuario. El tablero 01 de la ficha pinta
  dos flechas en «Dar de baja…»: es un defecto del dibujo y no pasa a la
  implementación.
- **L6** — El usuario eligió el listado desde el lienzo: «Implement the
  design artboard design/padron-listado/01-tabla-con-domicilio.html».
  - `01-tabla-con-domicilio.html` es la dirección elegida;
    `02-tarjetas-de-identidad.html` queda como alternativa.
  - El botón «Fusionar duplicados» del encabezado no se implementa, por
    recomendación del orquestador, que el usuario no objetó: fusionar
    necesita elegir a dos personas y se hace desde la ficha, con
    «Fusionar con otra persona…» (S12).
  - T2 arranca cuando T1 entregue el domicilio vigente en lote.
- **L7** — El usuario eligió la ficha desde el lienzo: «Implement the design
  artboard design/padron-ficha/02-encabezado-con-pestanas.html».
  - `02-encabezado-con-pestanas.html` es la dirección elegida;
    `01-ficha-y-acciones.html` queda como alternativa.
  - Las pestañas se implementan como enlaces con estado en la URL
    (`?pestana=residencias|administrar`, validado con Zod), igual que el
    `?panel=` del mapa, y no con radios y CSS: el servidor pinta la
    pestaña activa, funciona sin JavaScript y se puede compartir.
  - T4 corre en una copia de trabajo aparte, `.pi/wt-p4`, para no chocar
    con el build y el E2E de T3. Sus commits se integran a
    `feat/padron-ux`.
- **L8** — T1 hecho, según la opción A de L4.
  - `territorio` expone `direccionesVigentesDePersonas(ids, contexto)`: una
    transacción con una consulta de residencias y una de direcciones en
    lote. Tiene su prueba de integración y de aislamiento.
  - `padron` la consume por `LecturaDeDomiciliosVigentes` y expande las
    identidades fusionadas. Son dos viajes por página, después de cerrar
    la transacción de `padron`.
  - `listarPersonas` y `buscarPersonas` devuelven `domicilioVigente` por
    persona. La UI no cambia: T2 la pinta.
  - Se tocó una línea de `territorio/application/index.ts` fuera de la
    lista aprobada, para exportar el caso de uso. Es aditiva.
  - Verificado:
    - unit de `padron`: 135;
    - integración de `padron`: 52;
    - lectura en lote: 3;
    - tipos, biome y `pnpm reglas`.
- **L9** — T3 terminado y T1 reabierto.
  - **T3:**
    - Hechos S5 y S7, con S13 preservado: la línea de obligatorios, los
      tres nombres en una fila desde `lg` y la CURP dentro de «Datos de la
      persona».
    - S6 no se reprodujo en 390×844. Queda un E2E que lo vigila.
    - Faltan el E2E completo y las capturas: el build no arranca por el
      ciclo descrito abajo.
  - **T1 reabierto:**
    - `pnpm layers`, la regla `sin-ciclos`, y `next build` fallan:
      `padron/infrastructure` importa `@/modules/territorio`, y
      `territorio/infrastructure/lectorDePersonasPorPadron` ya importa
      `@/modules/padron`.
    - Corrección: la dependencia queda en un solo sentido,
      `territorio → padron`.
      - `padron` expone `identidadesDePersonas(ids)` en lote.
      - `territorio.direccionesVigentesDePersonas` expande las fusiones
        con ella.
      - La página del listado, en `src/app`, une las dos lecturas.
      - `padron` deja de tener puerto y adaptador hacia `territorio`.
- **L10** — T1, T3 y T4 cerrados.
  - **T1:** reconstruido en dos commits.
    - `256fe19`: la lectura en lote de `territorio`.
    - `36976f4`: `identidadesDePersonas` en `padron`, y `domiciliosVigentesDe`
      en `src/app`, que todavía no se cablea; lo hace T2.
    - Pasan `pnpm layers` y `next build`.
  - **T3**, en `f82c80e`: el E2E de alta (7 pruebas con títulos y
    respaldo) y las capturas, en verde.
  - **T4**, en `5fd31ed` y `011f1a5`:
    - las acciones `editarPersonaAction` y `darDeBajaPersonaAction`;
    - `fusionarPersonasAction` vuelve a la ficha;
    - la ficha con pestañas.
    - E2E: 7 pruebas de la ficha y 12 de mudanza, títulos, recurso ajeno y
      respaldo.
    - Para no editar `e2e/mudanza.spec.ts`, el pliegue de mudanza abre por
      defecto cuando la persona no tiene residencia o cuando vuelve de
      crear un domicilio.
- **L11** — T2 cerrado en `5fc00f3`.
  - E2E en verde:
    - `padronListado` y `padron`: 9;
    - las cuatro de padrón juntas: 19;
    - mudanza, sesión, títulos, recurso ajeno, respaldo, marca, mapa y
      subdominio: 44.
  - Lo que no se hizo:
    - **«de N» en el pie:** solo aparece cuando no hay otra página, porque
      el puerto no cuenta el total del municipio. Queda fuera de alcance.
    - **`(lista)/loading.tsx`:** ya abría un Suspense, y sin JavaScript
      el HTML transmitido nunca se inserta. Es deuda anterior y queda como
      seguimiento.
